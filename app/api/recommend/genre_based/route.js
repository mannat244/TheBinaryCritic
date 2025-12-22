import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import MovieCache from "@/models/MovieCache";
import User_Watched from "@/models/User_Watched";
import Review from "@/models/Review";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";



/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */
function extractYear(data) {
  const d = data?.release_date || data?.first_air_date;
  return d ? Number(d.slice(0, 4)) : null;
}

/* --------------------------------------------------
   SCORING ENGINE (TASTE > ERA > GENRE)
-------------------------------------------------- */
function scoreByTaste(item, ctx) {
  let score = 0;

  const {
    genreId,
    user,
    lovedGenreBoost,
    lovedLanguageBoost,
    avgYear
  } = ctx;

  const vector = user.preferences?.user_vector || {};
  const q1 = vector.q1 || {};
  const q2 = vector.q2 || {};
  const q3 = vector.q3_preferred_genres || [];
  const q5_genres = vector.q5_avoid_genres || [];
  const q5_keywords = vector.q5_avoid_keywords || [];
  const q5_styles = vector.q5_avoid_styles || [];

  /* ---------- BASE ---------- */
  score += Math.min(item.popularity || 0, 300) * 0.1;

  /* ---------- PRIMARY GENRE (SOFT) ---------- */
  if (item.genre_ids?.includes(genreId)) score += 25;
  else score -= 40;

  /* ---------- MOOD INFLUENCE (DYNAMIC) ---------- */
  const mood = ctx.mood || null;
  const MOOD_MAP = {
    "happy_light": [35, 16, 10751],      // Comedy, Animation, Family
    "sad_melancholic": [18, 10749],      // Drama, Romance
    "adventurous_thrilled": [28, 12, 53],// Action, Adventure, Thriller
    "dark_intense": [27, 80, 9648],      // Horror, Crime, Mystery
    "chill_relaxed": [99, 10402, 36]     // Doc, Music, History
  };

  if (mood && MOOD_MAP[mood]) {
    const targetGenres = MOOD_MAP[mood];
    const hasMatch = item.genre_ids?.some(g => targetGenres.includes(g));

    // 🚀 BIG BOOST if mood matches
    if (hasMatch) score += 50;

    // 📉 PENALTY if mood is opposite (e.g. Happy user vs Horror movie)
    if (mood === "happy_light" && item.genre_ids?.includes(27)) score -= 100; // Horror
    if (mood === "sad_melancholic" && item.genre_ids?.includes(35)) score -= 30; // Comedy (sometimes annoying when sad)
  }

  /* ---------- USER DECLARED GENRE ---------- */
  if (q3.includes(genreId)) score += 15;

  /* ---------- LOVED GENRE AFFINITY (STRONG) ---------- */
  if (item.genre_ids?.some(g => lovedGenreBoost.has(g))) {
    score += 45;
  }

  /* ---------- LOVED LANGUAGE ---------- */
  if (lovedLanguageBoost.has(item.original_language)) {
    score += 30;
  }

  /* ---------- INDIA FIRST ---------- */
  if (q1.india_priority) {
    if (item.original_language === "hi") score += 35;
    if (["ta", "te", "ml", "kn"].includes(item.original_language)) score += 30;
  }

  /* ---------- LANGUAGE COMFORT ---------- */
  if (q2.restrict_languages && q2.user_languages?.length) {
    if (!q2.user_languages.includes(item.original_language)) score -= 25;
  }

  /* ---------- USER DISLIKES ---------- */
  if (q5_genres.some(g => item.genre_ids?.includes(g))) score -= 120;

  if (q5_keywords.length && item.overview) {
    const text = item.overview.toLowerCase();
    if (q5_keywords.some(k => text.includes(k))) score -= 40;
  }

  if (q5_styles.includes("slow-paced") && (item.popularity || 0) < 40) {
    score -= 20;
  }

  /* ---------- ERA ALIGNMENT (CRITICAL) ---------- */
  const itemYear =
    item.release_date?.slice(0, 4) ||
    item.first_air_date?.slice(0, 4);

  if (itemYear) {
    const diff = Math.abs(Number(itemYear) - avgYear);

    if (diff <= 2) score += 25;      // perfect match
    else if (diff <= 5) score += 5;
    else if (diff <= 8) score -= 25;
    else score -= 60;                // too old / irrelevant
  }

  /* ---------- FRESHNESS ---------- */
  if (!item.__cached) score += 20;

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

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;

    const user = await User.findById(userId).lean();
    if (!user?.preferences?.user_vector) {
      return NextResponse.json({ error: "Onboarding incomplete" }, { status: 400 });
    }

    /* --------------------------------------------------
       1. BUILD LOVED + ERA MEMORY 🔥
    -------------------------------------------------- */
    const watchedDoc = await User_Watched.findOne({ userId }).lean();
    const watchedItems = watchedDoc?.items || [];

    const lovedReviews = await Review.find({
      userId,
      verdict: { $in: ["masterpiece", "worth_it"] }
    }).lean();

    const lovedGenreBoost = new Set();
    const lovedLanguageBoost = new Set();
    const years = [];

    for (const r of lovedReviews) {
      const cache = await MovieCache.findOne({ movieId: r.mediaId }).lean();
      if (!cache?.data) continue;

      cache.data.genres?.forEach(g => lovedGenreBoost.add(g.id));
      if (cache.data.original_language) {
        lovedLanguageBoost.add(cache.data.original_language);
      }

      const y = extractYear(cache.data);
      if (y) {
        years.push(y);
        years.push(y); // loved = double weight
      }
    }

    for (const w of watchedItems) {
      const cache = await MovieCache.findOne({ movieId: w.tmdbId }).lean();
      const y = extractYear(cache?.data);
      if (y) years.push(y);
    }



    const avgYear =
      years.length > 0
        ? Math.round(years.reduce((a, b) => a + b, 0) / years.length)
        : 2019;

    /* --------------------------------------------------
       2. GET MOOD (OPTIONAL)
    -------------------------------------------------- */
    const moodRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/mood`,
      { headers: { cookie: session.cookie || "" } }
    ).then(r => r.json()).catch(() => null);

    /* --------------------------------------------------
       3. DISCOVER (FRESH, RANDOMIZED)
    -------------------------------------------------- */
    const languages =
      user.preferences.user_vector.q1?.preferred_languages?.length
        ? user.preferences.user_vector.q1.preferred_languages
        : ["hi", "en"];

    const pages = [1, 2, 3, 4, 5].sort(() => 0.5 - Math.random()).slice(0, 2);
    const fresh = [];

    for (const lang of languages) {
      for (const page of pages) {
        if (fresh.length >= 60) break;

        let url =
          `https://api.themoviedb.org/3/discover/movie` +
          `?with_genres=${genreId}` +
          `&with_original_language=${lang}` +
          `&include_adult=false` +
          `&sort_by=popularity.desc` +
          `&page=${page}`;

        // 🟢 FIX: Avoid short films in Romance (<30m)
        if (genreId === 10749) {
          url += `&with_runtime.gte=30`;
        }

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`
          },
          next: { revalidate: 300 } // 5 mins
        });

        const json = await res.json();
        if (!json?.results) continue;

        for (const item of json.results) {
          fresh.push({ ...item, __cached: false });
        }
      }
    }

    /* --------------------------------------------------
       3. LOAD CACHE (CONTROLLED)
    -------------------------------------------------- */
    const cachedDocs = await MovieCache.find({}).limit(350).lean();
    const cached = cachedDocs.map(d => ({ ...d.data, __cached: true }));

    /* --------------------------------------------------
       4. FILTER WATCHED + REVIEWED
    -------------------------------------------------- */
    const watchedIds = new Set(watchedItems.map(i => String(i.tmdbId)));
    const reviewedIds = new Set(lovedReviews.map(r => String(r.mediaId)));

    const pool = [...fresh, ...cached].filter(
      item =>
        !watchedIds.has(String(item.id)) &&
        !reviewedIds.has(String(item.id))
    );

    // ---------- HARD DEDUPE (CRITICAL) ----------
    const uniqueMap = new Map();

    for (const item of pool) {
      const id = String(item.id);
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, item);
      }
    }

    const uniquePool = Array.from(uniqueMap.values());

    /* --------------------------------------------------
       5. SCORE + RANK (TASTE × ERA)
    -------------------------------------------------- */
    const ctx = {
      genreId,
      user,
      lovedGenreBoost,
      lovedLanguageBoost,
      avgYear,
      mood: moodRes?.mood || null
    };

    const final = uniquePool
      .map(item => ({
        ...item,
        media_type: "movie",
        tbc_score: scoreByTaste(item, ctx)
      }))
      .filter(i => i.tbc_score > 0)
      .sort((a, b) => b.tbc_score - a.tbc_score)
      .filter(i => {
        const y = i.release_date?.slice(0, 4);
        return !y || Number(y) >= avgYear - 10;
      })
      .slice(0, limit);

    return NextResponse.json(final);
  } catch (err) {
    console.error("❌ TASTE+ERA ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 }
    );
  }
}
