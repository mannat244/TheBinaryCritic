import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TvCache from "@/models/TvCache";

export async function POST(req) {
  console.log("🟦 [API] /api/tv called");

  try {
    await connectDB();
    console.log("🟢 MongoDB connected");

    const { id } = await req.json();
    console.log("📥 Incoming TV ID:", id);

    if (!id) {
      console.log("❌ Missing ID");
      return NextResponse.json({ error: "TV ID required" }, { status: 400 });
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

    const cached = await TvCache.findOne({ tvId: id });

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
      "watch_providers",
      "content_ratings"
    ].join(",");

    const TMDB_URL =
      `https://api.themoviedb.org/3/tv/${id}` +
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
      await TvCache.findOneAndUpdate(
        { tvId: id },
        { data, cachedAt: new Date() },
        { upsert: true }
      );
      console.log("💾 TMDB data saved to MongoDB cache");
    } catch (cacheErr) {
      console.log("❌ Cache DB save error:", cacheErr);
    }

    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.log("💥 TV DETAILS ERROR (outer catch):", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
