import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";

import Review from "@/models/Review";
import User_Watched from "@/models/User_Watched";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

// ---------- helpers ----------
const DAY = 1000 * 60 * 60 * 24;

function recencyMultiplier(date) {
  const diff = (Date.now() - new Date(date).getTime()) / DAY;
  if (diff <= 7) return 2.0;
  if (diff <= 30) return 1.5;
  return 1.0;
}

function normalize(map) {
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
  Object.keys(map).forEach(k => (map[k] = +(map[k] / total).toFixed(2)));
  return map;
}

function industryFromLanguage(lang) {
  if (lang === "hi") return "bollywood";
  if (["te", "ta", "ml", "kn"].includes(lang)) return "south";
  return "international";
}

// ---------- API ----------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;

    const reviews = await Review.find({ userId }).lean();
    const watchedDoc = await User_Watched.findOne({ userId }).lean();
    const watched = watchedDoc?.items || [];

    const taste = {
      languages: {},
      genres: {},
      mediaType: { movie: 0, tv: 0 },
      industries: {},
      actors: {},
      directors: {},
      recentAnchors: [],
      negativeSignals: { genres: [], languages: [] }
    };

    // ---------- REVIEWS (strong signal) ----------
    for (const r of reviews) {
      const weight = r.rating >= 4 ? 3 : r.rating >= 3 ? 1.5 : 0.5;
      const recency = recencyMultiplier(r.createdAt);
      const finalWeight = weight * recency;

      const cache =
        r.mediaType === "movie"
          ? await MovieCache.findOne({ movieId: r.mediaId }).lean()
          : await TvCache.findOne({ tvId: r.mediaId }).lean();

      if (!cache?.data) continue;

      const lang = cache.data.original_language;
      taste.languages[lang] = (taste.languages[lang] || 0) + finalWeight;
      taste.mediaType[r.mediaType] += finalWeight;

      const industry = industryFromLanguage(lang);
      taste.industries[industry] =
        (taste.industries[industry] || 0) + finalWeight;

      cache.data.genres?.forEach(g => {
        taste.genres[g.name.toLowerCase()] =
          (taste.genres[g.name.toLowerCase()] || 0) + finalWeight;
      });

      // ---- ACTORS & DIRECTORS ----
      // Top 5 cast members
      const cast = cache.data.credits?.cast?.slice(0, 5) || [];
      cast.forEach(actor => {
        taste.actors[actor.name] = (taste.actors[actor.name] || 0) + finalWeight;
      });

      // Directors (Crew -> Job: Director)
      const crew = cache.data.credits?.crew || [];
      const directors = crew.filter(c => c.job === "Director");
      directors.forEach(director => {
        taste.directors[director.name] = (taste.directors[director.name] || 0) + finalWeight;
      });


      if (r.rating >= 4) {
        taste.recentAnchors.push({
          tmdbId: r.mediaId,
          mediaType: r.mediaType,
          reason: "positively reviewed"
        });
      }

      if (r.rating <= 2) {
        cache.data.genres?.forEach(g => {
          taste.negativeSignals.genres.push(g.name.toLowerCase());
        });
      }
    }

    // ---------- WATCHED (weaker signal) ----------
    for (const w of watched) {
      const recency = recencyMultiplier(w.watchedAt);
      const weight = 1.0 * recency;

      const cache =
        w.mediaType === "movie"
          ? await MovieCache.findOne({ movieId: w.tmdbId }).lean()
          : await TvCache.findOne({ tvId: w.tmdbId }).lean();

      if (!cache?.data) continue;

      const lang = cache.data.original_language;
      taste.languages[lang] = (taste.languages[lang] || 0) + weight;
      taste.mediaType[w.mediaType] += weight;

      cache.data.genres?.forEach(g => {
        taste.genres[g.name.toLowerCase()] =
          (taste.genres[g.name.toLowerCase()] || 0) + weight;
      });

      // ---- ACTORS & DIRECTORS (Watched) ----
      const cast = cache.data.credits?.cast?.slice(0, 5) || [];
      cast.forEach(actor => {
        taste.actors[actor.name] = (taste.actors[actor.name] || 0) + weight;
      });

      const crew = cache.data.credits?.crew || [];
      const directors = crew.filter(c => c.job === "Director");
      directors.forEach(director => {
        taste.directors[director.name] = (taste.directors[director.name] || 0) + weight;
      });
    }

    // ---------- normalize ----------
    normalize(taste.languages);
    normalize(taste.genres);
    normalize(taste.mediaType);
    normalize(taste.industries);
    normalize(taste.actors);
    normalize(taste.directors);

    // Keep top 10 actors/directors to reduce noise
    const topActors = Object.entries(taste.actors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    taste.actors = topActors;

    const topDirectors = Object.entries(taste.directors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    taste.directors = topDirectors;

    taste.recentAnchors = taste.recentAnchors.slice(0, 3);
    taste.negativeSignals.genres = [...new Set(taste.negativeSignals.genres)];

    return NextResponse.json({
      userId,
      updatedAt: new Date(),
      taste
    });
  } catch (err) {
    console.error("Taste profile failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
