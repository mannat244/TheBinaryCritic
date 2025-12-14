import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";

export async function POST(req) {
  console.log("🟦 [API] /api/movie called");

  try {
    await connectDB();
    console.log("🟢 MongoDB connected");

    const { id } = await req.json();
    console.log("📥 Incoming movie ID:", id);

    if (!id) {
      console.log("❌ Missing ID");
      return NextResponse.json({ error: "Movie ID required" }, { status: 400 });
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
      console.log("❌ Missing TMDB token");
      return NextResponse.json({ error: "TMDB token missing" }, { status: 500 });
    }

    // ---------------------------
    // 1️⃣ CHECK CACHE
    // ---------------------------
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    const cached = await MovieCache.findOne({ movieId: id });

    if (cached) {
      console.log("📦 Cache found in DB. Age (ms):", Date.now() - cached.cachedAt.getTime());
    }

    if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL) {
      console.log("🔥 Serving from MongoDB cache");
      return NextResponse.json(cached.data, { status: 200 });
    }

    console.log("⏳ Cache expired or missing → Fetching fresh TMDB data...");

    // ---------------------------
    // 2️⃣ TMDB FETCH
    // ---------------------------
    const append = [
      "videos",
      "credits",
      "keywords",
      "watch_providers" // FIXED NAME !!
    ].join(",");

    const TMDB_URL =
      `https://api.themoviedb.org/3/movie/${id}` +
      `?language=en-US&append_to_response=${append}`;

    console.log("🌐 TMDB URL:", TMDB_URL);

    const res = await fetch(TMDB_URL, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 300 },
    });

    console.log("🌍 TMDB Status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.log("❌ TMDB returned error:", errText);
      return NextResponse.json(
        { error: "TMDB failed", details: errText },
        { status: res.status }
      );
    }

    // SAFE JSON PARSE
    let data;
    try {
      data = await res.json();
      console.log("🟢 TMDB JSON parsed successfully");
    } catch (parseErr) {
      console.log("❌ JSON PARSE ERROR:", parseErr);
      return NextResponse.json(
        { error: "Invalid TMDB JSON response" },
        { status: 502 }
      );
    }

    // ---------------------------
    // 3️⃣ SAVE CACHE
    // ---------------------------
    try {
      await MovieCache.findOneAndUpdate(
        { movieId: id },
        { data, cachedAt: new Date() },
        { upsert: true }
      );
      console.log("💾 TMDB data saved to MongoDB cache");
    } catch (cacheErr) {
      console.log("❌ Cache DB save error:", cacheErr);
    }

    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.log("💥 MOVIE DETAILS ERROR (outer catch):", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
