import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";

import User_Watched from "@/models/User_Watched";
import Review from "@/models/Review";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

const TMDB_BASE = "https://api.themoviedb.org/3";

const MAX_FRANCHISE = 5;
const MAX_PERSONA = 7;
const FINAL_LIMIT = 20;

async function tmdbFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error("TMDB fetch failed");
  return res.json();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ items: [] });

    await connectDB();
    const userId = session.user.id;

    /* ------------------------------------
       1. WATCH HISTORY (LAST 6)
    ------------------------------------ */
    const watchedDoc = await User_Watched.findOne({ userId }).lean();
    const watchedItems = watchedDoc?.items || [];
    if (watchedItems.length === 0) {
      return NextResponse.json({ items: [] });
    }

    watchedItems.sort(
      (a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
    );

    const history = watchedItems.slice(0, 6);

    const watchedSet = new Set(
      watchedItems.map(i => `${i.mediaType}-${i.tmdbId}`)
    );

    /* ------------------------------------
       2. REMOVE POSITIVELY REVIEWED
    ------------------------------------ */
    const lovedReviews = await Review.find({
      userId,
      verdict: { $in: ["masterpiece", "worth_it"] }
    }).lean();

    const blockedAnchors = new Set(
      lovedReviews.map(r => `${r.mediaType}-${r.mediaId}`)
    );

    const eligible = history.filter(
      h => !blockedAnchors.has(`${h.mediaType}-${h.tmdbId}`)
    );

    if (eligible.length === 0) {
      return NextResponse.json({ items: [] });
    }

    /* ------------------------------------
       3. PICK 1 RANDOM ANCHOR
    ------------------------------------ */
    // eligible is already top 6 recent, pick random one for variety
    const randomAnchor = eligible[Math.floor(Math.random() * eligible.length)];
    const anchors = [randomAnchor];


    let results = [];
    let contextText = null;

    /* ------------------------------------
       4. PROCESS EACH ANCHOR
    ------------------------------------ */
    for (const a of anchors) {
      const cache =
        a.mediaType === "movie"
          ? await MovieCache.findOne({ movieId: a.tmdbId }).lean()
          : await TvCache.findOne({ tvId: a.tmdbId }).lean();

      if (!cache?.data) continue;

      const data = cache.data;

      if (!contextText) {
        contextText = `Because you watched ${a.mediaType === "movie" ? data.title : data.name
          }`;
      }

      const language = data.original_language;
      const genres = (data.genres || []).map((g) => g.id);

      /* ================================
         4.1 FRANCHISE (MAX 5)
      ================================ */
      let franchiseCount = 0;

      if (a.mediaType === "movie" && data.belongs_to_collection) {
        try {
          const collection = await tmdbFetch(
            `${TMDB_BASE}/collection/${data.belongs_to_collection.id}`
          );

          for (const part of collection?.parts || []) {
            if (franchiseCount >= MAX_FRANCHISE) break;
            if (part.id === a.tmdbId) continue;
            if (watchedSet.has(`movie-${part.id}`)) continue;

            results.push({
              ...part,
              media_type: "movie",
              _reason: "from the same franchise"
            });

            franchiseCount++;
          }
        } catch { }
      }

      /* ================================
         4.2 PERSONA (ACTOR)
      ================================ */
      let personaCount = 0;
      const leadActor = data.credits?.cast?.[0]?.id;

      if (leadActor) {
        const personaUrl =
          `${TMDB_BASE}/discover/${a.mediaType}` +
          `?with_people=${leadActor}` +
          `&with_original_language=${language}` +
          `&sort_by=popularity.desc`;

        const personaData = await tmdbFetch(personaUrl);

        for (const item of personaData?.results || []) {
          if (personaCount >= MAX_PERSONA) break;
          const key = `${a.mediaType}-${item.id}`;
          if (watchedSet.has(key)) continue;

          results.push({
            ...item,
            media_type: a.mediaType,
            _reason: "because you like this star"
          });

          personaCount++;
        }
      }

      /* ================================
         4.3 TASTE DISCOVER (ALWAYS)
      ================================ */
      if (!language || genres.length === 0) continue;

      const pages = [1, 2, 3, 4, 5]
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

      for (const page of pages) {
        const url =
          `${TMDB_BASE}/discover/${a.mediaType}` +
          `?with_original_language=${language}` +
          `&with_genres=${genres.join(",")}` +
          `&include_adult=false` +
          `&sort_by=release_date.desc` +
          `&page=${page}`;

        const d = await tmdbFetch(url);

        for (const item of d?.results || []) {
          const key = `${a.mediaType}-${item.id}`;
          if (watchedSet.has(key)) continue;

          const year =
            item.release_date?.slice(0, 4) ||
            item.first_air_date?.slice(0, 4);

          if (year && Number(year) < 2005) continue;

          results.push({
            ...item,
            media_type: a.mediaType,
            _reason: "because you watched"
          });
        }
      }
    }

    /* ------------------------------------
       5. DEDUPE + FINAL TRIM
    ------------------------------------ */
    const seen = new Set();
    const final = [];

    for (const r of results) {
      const key = `${r.media_type}-${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      final.push(r);
      if (final.length >= FINAL_LIMIT) break;
    }

    return NextResponse.json({
      context: contextText,
      items: final
    });

  } catch (err) {
    console.error("❌ because_watched failed:", err);
    return NextResponse.json({ items: [] });
  }
}
