import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";
const { getJson } = require("serpapi");

export async function POST(req) {
  try {
    const { id, title, year, type = "movie" } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await connectDB();

    const CacheModel = type === "tv" ? TvCache : MovieCache;
    const idField = type === "tv" ? "tvId" : "movieId";

    // 1. Check if we already have a generated trailer in the cache
    if (id) {
        const cached = await CacheModel.findOne({ [idField]: id });
        if (cached && cached.data?.generated_trailer) {
            console.log(`📦 Found generated trailer in cache for ${title} (${type})`);
            return NextResponse.json({ videoId: cached.data.generated_trailer });
        }
    }

    const query = `${title} ${year || ""} Official Trailer`;
    console.log(`🔍 Searching YouTube for: ${query}`);

    // Helper function to search with Promise
    const searchYouTube = (q) => {
        return new Promise((resolve, reject) => {
            try {
                getJson({
                    api_key: process.env.SERP_KEY,
                    engine: "youtube",
                    search_query: q,
                    gl: "in"
                }, (json) => {
                    if (json.error) {
                        reject(new Error(json.error));
                    } else {
                        resolve(json);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    };

    let json;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            json = await searchYouTube(query);
            break;
        } catch (error) {
            attempts++;
            console.error(`⚠️ SerpApi attempt ${attempts} failed:`, error.message);
            if (attempts >= maxAttempts) {
                return NextResponse.json({ error: "Failed to fetch trailer after retries" }, { status: 502 });
            }
            // Exponential backoff: 1s, 2s, 3s...
            await new Promise(res => setTimeout(res, 1000 * attempts));
        }
    }

    if (json && json.video_results && json.video_results.length > 0) {
        // Get the first video result
        const video = json.video_results[0];
        // Extract ID from link (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ)
        const videoId = video.link.split("v=")[1]?.split("&")[0];
        
        console.log(`✅ Found Trailer: ${videoId}`);

        // 2. Update the cache with this new trailer so we don't search again
        if (id && videoId) {
        try {
            await CacheModel.updateOne(
                { [idField]: id },
                { 
                    $set: { "data.generated_trailer": videoId } 
                }
            );
            console.log(`💾 Saved trailer to ${type} cache`);
        } catch (err) {
            console.error("Failed to update cache:", err);
        }
        }

        return NextResponse.json({ videoId });
    } else {
        console.log("❌ No results found");
        return NextResponse.json({ error: "No trailer found" }, { status: 404 });
    }

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
