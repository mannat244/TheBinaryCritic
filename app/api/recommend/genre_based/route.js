import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import MovieCache from "@/models/MovieCache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* --------------------------------------------------
   SCORING ENGINE (INDIA-FIRST, NO VOTES)
-------------------------------------------------- */
function scoreByGenre(item, user, genreId) {
  let score = 0;

  const {
    q1,
    q2,
    q3_preferred_genres,
    q5_avoid_genres,
    q5_avoid_keywords,
    q5_avoid_styles
  } = user.preferences.user_vector;

  /* ---------- BASE QUALITY (NO VOTE DEPENDENCY) ---------- */
  score += Math.min(item.popularity || 0, 300) * 0.15;

  /* ---------- STRONG GENRE IDENTITY ---------- */
  if (!item.genre_ids?.includes(genreId)) score -= 120;
  else score += 40;

  /* ---------- USER GENRE LOVE ---------- */
  if (q3_preferred_genres.includes(genreId)) score += 20;

  /* ---------- INDIA FIRST (SOFT, REALISTIC) ---------- */
  if (q1.india_priority) {
    if (item.original_language === "hi") score += 40;
    if (["ta", "te", "ml", "kn"].includes(item.original_language)) score += 30;
    if (item._tbc_origin?.origin_country?.includes("IN")) score += 25;
  }

  /* ---------- LANGUAGE COMFORT ---------- */
  if (q2.restrict_languages && !q2.user_languages.includes(item.original_language)) {
    score -= 15;
  }

  /* ---------- BLOCKBUSTER MODE ---------- */
  if (q1.blockbuster_mode && item.popularity > 80) {
    score += 15;
  }

  /* ---------- USER DISLIKES ---------- */
  if (q5_avoid_genres?.some(g => item.genre_ids?.includes(g))) {
    score -= 120;
  }

  if (q5_avoid_keywords?.length && item.overview) {
    const text = item.overview.toLowerCase();
    if (q5_avoid_keywords.some(k => text.includes(k))) score -= 40;
  }

  if (q5_avoid_styles?.includes("slow-paced") && (item.popularity || 0) < 40) {
    score -= 20;
  }

  /* ---------- FRESHNESS BONUS ---------- */
  if (!item.__cached) score += 25;

  return Math.round(score);
}

/* --------------------------------------------------
   API ROUTE
-------------------------------------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const genreId = Number(searchParams.get("genre"));
    const limit = Number(searchParams.get("limit") || 20);

    if (!genreId) {
      return NextResponse.json({ error: "Genre required" }, { status: 400 });
    }

    /* ---------- AUTH ---------- */
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user?.preferences?.user_vector) {
      return NextResponse.json({ error: "Onboarding incomplete" }, { status: 400 });
    }

    /* --------------------------------------------------
       TMDB DISCOVERY (NO VOTES, MAX 2 PAGES)
    -------------------------------------------------- */
    const languages = user.preferences.user_vector.q1.preferred_languages?.length
      ? user.preferences.user_vector.q1.preferred_languages
      : ["hi", "en"];

    const pages = [1, 2];
    const fresh = [];

    for (const lang of languages) {
      for (const page of pages) {
        if (fresh.length >= 60) break;

        const url =
          `https://api.themoviedb.org/3/discover/movie` +
          `?with_genres=${genreId}` +
          `&with_original_language=${lang}` +
          `&with_runtime.gte=70` +
          `&without_genres=27` + // horror / jump scare
          `&include_adult=false` +
          `&sort_by=popularity.desc` +
          `&page=${page}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`
          }
        });

        const json = await res.json();
        if (!json?.results) continue;

        for (const item of json.results) {
          fresh.push({
            ...item,
            __cached: false,
            _tbc_origin: {
              origin_country: item.origin_country || [],
              original_language: item.original_language
            }
          });
        }
      }
    }

    /* ---------- CACHE FRESH CONTENT (CONTENT ONLY) ---------- */
    for (const item of fresh) {
      await MovieCache.updateOne(
        { movieId: item.id },
        { movieId: item.id, data: item, cachedAt: new Date() },
        { upsert: true }
      );
    }

    /* ---------- LOAD CACHED CONTENT ---------- */
    const cachedDocs = await MovieCache.find({}).limit(500).lean();
    const cached = cachedDocs.map(d => ({
      ...d.data,
      __cached: true
    }));

    const pool = [...fresh, ...cached];

    /* ---------- SCORING + DIVERSITY ---------- */
    const scored = pool
      .map(item => ({
        ...item,
        media_type: item.first_air_date ? "tv" : "movie",
        tbc_score: scoreByGenre(item, user, genreId)
      }))
      .filter(i => i.tbc_score > 0)
      .sort((a, b) => b.tbc_score - a.tbc_score);

    const used = new Set();
    const final = [];

    for (const item of scored) {
      if (used.has(item.id)) continue;
      used.add(item.id);
      final.push(item);
      if (final.length >= limit) break;
    }

    return NextResponse.json(final);
  } catch (err) {
    console.error("❌ GENRE ROUTE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load genre recommendations" },
      { status: 500 }
    );
  }
}
