import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TvCache from "@/models/TvCache";

// Use ONLY for fresh TMDB data
const safeJSON = (obj) => JSON.parse(JSON.stringify(obj));

export async function POST(req) {
  console.log("🟦 [API] /api/tv called");

  try {
    await connectDB();
    console.log("🟢 MongoDB connected");

    const body = await req.json();
    const id = body?.id;

    console.log("📥 Incoming TV ID:", id);

    if (!id) {
      return NextResponse.json(
        { error: "TV ID required" },
        { status: 400 }
      );
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "TMDB token missing" },
        { status: 500 }
      );
    }

    // ---------------------------
    // 1️⃣ CHECK CACHE (SAFE)
    // ---------------------------
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    const cached = await TvCache.findOne({ tvId: id }).lean();

    if (cached?.data && cached?.cachedAt) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      console.log("📦 Cache found. Age (ms):", age);

      if (age < CACHE_TTL) {
        console.log("🔥 Serving from MongoDB cache");
        return NextResponse.json(cached.data, { status: 200 });
      }
    }

    console.log("⏳ Cache expired / invalid → Fetching from TMDB");

    // ---------------------------
    // 2️⃣ TMDB FETCH
    // ---------------------------
    const append = [
      "videos",
      "credits",
      "keywords",
      "watch_providers",
      "content_ratings",
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
      return NextResponse.json(
        { error: "TMDB failed", details: errText },
        { status: res.status }
      );
    }

    let data;
    try {
      data = await res.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid TMDB JSON" },
        { status: 502 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "TMDB returned invalid data" },
        { status: 502 }
      );
    }

    const cleanData = safeJSON(data);

    // ---------------------------
    // 3️⃣ SAVE CACHE (CLEAN)
    // ---------------------------
    try {
      await TvCache.findOneAndUpdate(
        { tvId: id },
        {
          tvId: id,
          data: cleanData,
          cachedAt: new Date(),
        },
        { upsert: true }
      );
      console.log("💾 Cached TMDB TV data");
    } catch (cacheErr) {
      console.log("❌ Cache save failed:", cacheErr);
    }

    return NextResponse.json(cleanData, { status: 200 });

  } catch (err) {
    console.log("💥 TV API ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
