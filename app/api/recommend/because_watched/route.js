import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";

import User_Watched from "@/models/User_Watched";
import Review from "@/models/Review";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
      accept: "application/json"
    },
    next: { revalidate: 300 } // 5 mins
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

    /* --------------------------------------------------
       1. WATCHED ITEMS
    -------------------------------------------------- */
    const watchedDoc = await User_Watched.findOne({ userId }).lean();
    const watchedItems = watchedDoc?.items || [];
    if (watchedItems.length === 0) {
      return NextResponse.json({ items: [] });
    }

    /* --------------------------------------------------
       2. BLOCK REVIEWED ANCHORS (STRONGER SIGNAL)
    -------------------------------------------------- */
    const lovedReviews = await Review.find({
      userId,
      verdict: { $in: ["masterpiece", "worth_it"] }
    }).lean();

    const blockedAnchors = new Set(
      lovedReviews.map(r => `${r.mediaType}-${r.mediaId}`)
    );

    const eligibleWatched = watchedItems.filter(
      w => !blockedAnchors.has(`${w.mediaType}-${w.tmdbId}`)
    );

    if (eligibleWatched.length === 0) {
      return NextResponse.json({ items: [] });
    }

    /* --------------------------------------------------
       3. PICK DIVERSE WATCHED ANCHORS
    -------------------------------------------------- */
    eligibleWatched.sort(
      (a, b) => new Date(b.watchedAt) - new Date(a.watchedAt)
    );

    const candidatePool = eligibleWatched.slice(0, 8);
    const anchors = candidatePool
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    const watchedSet = new Set(
      watchedItems.map(i => `${i.mediaType}-${i.tmdbId}`)
    );

    let results = [];
    let contextText = null;

    /* --------------------------------------------------
       4. PROCESS EACH ANCHOR
    -------------------------------------------------- */
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];

      const cache =
        a.mediaType === "movie"
          ? await MovieCache.findOne({ movieId: a.tmdbId }).lean()
          : await TvCache.findOne({ tvId: a.tmdbId }).lean();

      if (!cache?.data) continue;

      /* ---------- CONTEXT (ONLY ONCE) ---------- */
      if (!contextText) {
        const title =
          a.mediaType === "movie"
            ? cache.data.title
            : cache.data.name;

        contextText = `Because you watched ${title}`;
      }

      /* ==================================================
         🔥 FRANCHISE GUARD (MOVIES ONLY)
      ================================================== */
      let franchiseAdded = 0;
      let collection = null;

      if (a.mediaType === "movie" && cache.data.belongs_to_collection) {
        try {
          collection = await tmdbFetch(`${TMDB_BASE}/collection/${cache.data.belongs_to_collection.id}`);
        } catch (e) {
          // ignore collection fetch err
        }
      }

      for (const part of collection?.parts || []) {
        if (Number(part.id) === Number(a.tmdbId)) continue;

        // ❌ BLOCK FUTURE SEQUELS COMPLETELY
        if (
          part.release_date &&
          cache.data.release_date &&
          new Date(part.release_date) > new Date(cache.data.release_date)
        ) {
          continue;
        }

        const key = `movie-${part.id}`;
        if (watchedSet.has(key)) continue;

        results.push({
          ...part,
          media_type: "movie",
          _reason: "from the same universe"
        });

        franchiseAdded++;
      }

      // ✅ only skip discover if franchise actually helped
      if (franchiseAdded >= 2) {
        continue; // enough franchise content, no fallback needed
      }
      // else → FALL THROUGH to discover


      /* ==================================================
         5. DISCOVER FALLBACK (NON-FRANCHISE)
      ================================================== */
      const lang = cache.data.original_language;
      const genreIds = (cache.data.genres || []).map(g => g.id);

      console.log(`[BecauseWatched] Fallback for ${a.tmdbId}: lang=${lang}, genres=${genreIds}`);

      if (!lang || genreIds.length === 0) {
        console.warn(`[BecauseWatched] ⚠️ Missing metadata for ${a.tmdbId}`);
        continue;
      }

      const pages = [1, 2, 3, 4, 5]
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

      for (const page of pages) {
        const url =
          `${TMDB_BASE}/discover/${a.mediaType}` +
          `?with_original_language=${lang}` +
          `&with_genres=${genreIds.join(",")}` +
          `&include_adult=false` +
          `&sort_by=release_date.desc` +
          `&page=${page}`;

        const data = await tmdbFetch(url);
        console.log(`[BecauseWatched] Filtered TMDB fetch: found ${data?.results?.length || 0} items`);

        for (const item of data?.results || []) {
          const key = `${a.mediaType}-${item.id}`;
          if (watchedSet.has(key)) continue;

          const year =
            item.release_date?.slice(0, 4) ||
            item.first_air_date?.slice(0, 4);
          if (year && Number(year) < 2000) continue;

          results.push({
            ...item,
            media_type: a.mediaType,
            _reason: "because you watched"
          });
        }
      }
    }

    /* --------------------------------------------------
       6. DEDUPE + RANK (NO FAN OFFENSE)
    -------------------------------------------------- */
    const seen = new Set();
    const deduped = [];

    for (const r of results) {
      const key = `${r.media_type}-${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }

    deduped.sort((a, b) => {
      const yearA =
        Number(a.release_date?.slice(0, 4) || a.first_air_date?.slice(0, 4) || 0);
      const yearB =
        Number(b.release_date?.slice(0, 4) || b.first_air_date?.slice(0, 4) || 0);

      const recencyA = yearA ? (yearA - 2000) * 0.4 : 0;
      const recencyB = yearB ? (yearB - 2000) * 0.4 : 0;

      const qualityA = (a.vote_average || 5) * 1.2;
      const qualityB = (b.vote_average || 5) * 1.2;

      return (recencyB + qualityB) - (recencyA + qualityA);
    });

    return NextResponse.json({
      context: contextText,
      items: deduped.slice(0, 20)
    });

  } catch (err) {
    console.error("❌ because_watched failed:", err);
    return NextResponse.json({ items: [] });
  }
}
