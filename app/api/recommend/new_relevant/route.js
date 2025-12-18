import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";

import User_Watched from "@/models/User_Watched";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

const TMDB_BASE = "https://api.themoviedb.org/3";
const DAY = 1000 * 60 * 60 * 24;

function lastNDays(n) {
  const d = new Date(Date.now() - n * DAY);
  return d.toISOString().split("T")[0];
}

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
    if (!session)
      return NextResponse.json({ items: [] });

    await connectDB();
    const userId = session.user.id;

    // ---- watched ids ----
    const watchedDoc = await User_Watched.findOne({ userId }).lean();
    const watchedSet = new Set(
      (watchedDoc?.items || []).map(
        i => `${i.mediaType}-${i.tmdbId}`
      )
    );

    // ---- taste profile ----
    const tasteRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/taste-profile`,
      { headers: { cookie: session.cookie || "" } }
    ).then(r => r.json()).catch(() => null);

    const taste = tasteRes?.taste || {};

    // top language fallback: hi → en
    const preferredLanguages =
      taste.languages
        ? Object.entries(taste.languages)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => k)
        : ["hi", "en"];

    const lang = preferredLanguages[0] || "hi";

    // ---- mood (optional) ----
    const moodRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/mood`,
      { headers: { cookie: session.cookie || "" } }
    ).then(r => r.json()).catch(() => null);

    const mood = moodRes?.mood;

    // ---- date window ----
    const from = lastNDays(45);
    const to = new Date().toISOString().split("T")[0];

    // ---- fetch TMDB ----
    const [movies, tv] = await Promise.all([
      tmdbFetch(
        `${TMDB_BASE}/discover/movie?include_adult=false&include_video=false&sort_by=popularity.desc&with_release_type=2|3&release_date.gte=${from}&release_date.lte=${to}&with_original_language=${lang}`
      ),
      tmdbFetch(
        `${TMDB_BASE}/discover/tv?first_air_date.gte=${from}&first_air_date.lte=${to}&with_original_language=${lang}`
      )
    ]);

    let items = [];

    // ---- hydrate + filter watched ----
    for (const m of movies?.results || []) {
      if (watchedSet.has(`movie-${m.id}`)) continue;
      items.push({ ...m, media_type: "movie" });
    }

    for (const t of tv?.results || []) {
      if (watchedSet.has(`tv-${t.id}`)) continue;
      items.push({ ...t, media_type: "tv" });
    }

    // ---- light mood boost (no ML) ----
    if (mood === "dark_intense") {
      items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    }

    // ---- cap & return ----
    return NextResponse.json({
      items: items.slice(0, 20)
    });

  } catch (err) {
    console.error("new_relevant failed:", err);
    return NextResponse.json({ items: [] });
  }
}
