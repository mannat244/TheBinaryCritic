import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const BASE =
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000"; // safe fallback for dev

async function safeFetch(url, cookie) {
  try {
    const res = await fetch(url, {
      headers: cookie ? { cookie } : {},
      cache: "no-store"
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const cookie = (await cookies()).toString();

    const rows = [];

    // ---- 1. New & Relevant (top priority) ----
    const newRelevant = await safeFetch(
      `${BASE}/api/recommend/new_relevant`,
      cookie
    );
    if (newRelevant?.items?.length) {
      rows.push({
        key: "new_relevant",
        title: "New & Relevant",
        items: newRelevant.items
      });
    }

    // ---- 2. Because You Reviewed (USP) ----
    const becauseReviewed = await safeFetch(
      `${BASE}/api/recommend/because_reviewed`,
      cookie
    );
    if (becauseReviewed?.items?.length) {
      rows.push({
        key: "because_reviewed",
        title: "Because You Reviewed",
        items: becauseReviewed.items
      });
    }

    // ---- 3. Because You Watched ----
    const becauseWatched = await safeFetch(
      `${BASE}/api/recommend/because_watched`,
      cookie
    );
    if (becauseWatched?.items?.length) {
      rows.push({
        key: "because_watched",
        title: "Because You Watched",
        items: becauseWatched.items
      });
    }

    // ---- 4. Deterministic Fallback (Genre Rows) ----
    await connectDB();
    const user = await User.findById(session.user.id).lean();
    const preferredGenreIds = user?.preferences?.user_vector?.q3_preferred_genres || [];

    // Priority Map (optional, but good for ordering)
    const PRIORITY_GENRES = [28, 10749, 35, 53, 12, 18, 878];

    // Sort genres (Priority first)
    const sortedIds = [...preferredGenreIds].sort((a, b) => {
      const idxA = PRIORITY_GENRES.indexOf(a);
      const idxB = PRIORITY_GENRES.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    }).slice(0, 10); // Limit to top 10 rows to prevent timeouts

    // Map for titles (Hardcoded for speed, or could fetch from local JSON)
    // Writing a small helper for titles since we don't have the JSON import here easily without file read
    // Actually, I'll just use the ID as title if name missing, or rely on client?
    // The client "initialItems" expects a title in the row object.
    // I will use a simple map here.
    const genreNames = {
      28: "Action",
      12: "Adventure",
      16: "Animation",
      35: "Comedy",
      80: "Crime",
      99: "Documentary",
      18: "Drama",
      10751: "Family",
      14: "Fantasy",
      36: "History",
      27: "Horror",
      10402: "Music",
      9648: "Mystery",
      10749: "Romance",
      878: "Science Fiction",
      10770: "TV Movie",
      53: "Thriller",
      10752: "War",
      37: "Western"
    };

    const genrePromises = sortedIds.map(async (genreId) => {
      const data = await safeFetch(
        `${BASE}/api/recommend/genre_based?genre=${genreId}`,
        cookie
      );
      if (data && data.length > 0) {
        return {
          key: `genre-${genreId}`,
          title: genreNames[genreId] || `Genre ${genreId}`,
          items: data
        };
      }
      return null;
    });

    const genreRows = (await Promise.all(genrePromises)).filter(Boolean);
    rows.push(...genreRows);

    // ---- 5. Absolute Fallback: Trending (Generic) ----
    if (rows.length === 0) {
      const trendingData = await safeFetch(`${BASE}/api/trending`);
      if (trendingData && trendingData.length > 0) {
        rows.push({
          key: "trending_generic",
          title: "Trending Now",
          items: trendingData
        });
      }
    }

    // Return what we have (even if empty, UI will handle it gracefully)
    return NextResponse.json({ rows });

  } catch (err) {
    console.error("for_you failed:", err);
    return NextResponse.json({ rows: [] });
  }
}
