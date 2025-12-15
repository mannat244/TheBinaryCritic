import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrendingCache from "@/models/TrendingCache";

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------
const TMDB_API_KEY = process.env.TMDB_API_READ_ACCESS_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 Hours

const genAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

// -------------------------------------------------------------
// 1. TMDB VERIFICATION HELPER
// -------------------------------------------------------------
async function fetchTMDBDetails(title, year, type) {
    try {
        const searchType = type === 'tv' ? 'tv' : 'movie';
        const query = encodeURIComponent(title);
        let url = `https://api.themoviedb.org/3/search/${searchType}?query=${query}&include_adult=false&language=en-US&page=1`;

        // Flexible year check (Current year OR previous year for late releases)
        if (type === 'movie' && year) url += `&primary_release_year=${year}`;

        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_API_KEY}`
            }
        };

        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`TMDB Status: ${res.status}`);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const bestMatch = data.results[0];
            // 🛑 STRICT: If no poster, drop it.
            if (!bestMatch.poster_path) return null;

            return {
                tmdb_id: bestMatch.id,
                title: bestMatch.title || bestMatch.name,
                poster_path: bestMatch.poster_path,
                backdrop_path: bestMatch.backdrop_path,
                release_date: bestMatch.release_date || bestMatch.first_air_date,
                overview: bestMatch.overview,
                verified: true
            };
        }
    } catch (err) {
        console.error(`❌ TMDB Failed [${title}]: ${err.message}`);
    }
    return null;
}

// -------------------------------------------------------------
// 2. GEMINI FETCH HELPER (Smart Buzz Logic)
// -------------------------------------------------------------
async function fetchGeminiTrends() {
    const modelId = "gemini-2.5-flash";
    const today = new Date().toLocaleDateString();

    const SYSTEM_PROMPT = `
You are an entertainment news tracker for India.
USE GOOGLE SEARCH to find what is *actually* trending TODAY (${today}).

CORE TASK:
Identify 7-10 Movies/Web Series buzzing in India right now.
For each item, determine the *reason* for the buzz and format the "subtext" accordingly.

🛑 RULES FOR "SUBTEXT":
- **If Box Office Hit:** You MUST include the latest number. (e.g., "Smashed ₹500 Cr Worldwide", "Highest Opener of 2024")
- **If Trailer Drop:** Just mention the event. (e.g., "Trailer released today", "Trending #1 on YouTube")
- **If OTT Release:** Mention the platform. (e.g., "Streaming now on Netflix", "Just Arrived")
- **NO FAKE NUMBERS:** If a movie is unreleased (2025/2026), DO NOT invent a box office number. Just say "Releasing Soon".

📦 OUTPUT FORMAT (JSON Array):
[
  {
    "title": "Pushpa 2",
    "year": 2024,
    "type": "movie",
    "buzz_type": ["Box Office"],
    "subtext": "Crossed ₹1000 Cr mark worldwide" 
  },
  {
    "title": "Supergirl: Woman of Tomorrow",
    "year": 2026,
    "type": "movie",
    "buzz_type": ["Trailer Drop"],
    "subtext": "First look trailer released"
  }
]
`;

    try {
        const response = await genAI.models.generateContent({
            model: modelId,
            contents: [
                {
                    role: "user",
                    parts: [{ text: "Search for trending entertainment news in India today. Identify Box Office hits (get numbers), new OTT releases, and viral Hollywood/Indian trailers. Return JSON only." }]
                }
            ],
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ googleSearch: {} }],
            },
        });

        if (response?.text) {
            // 🧹 Clean up markdown or conversational filler
            let cleanText = response.text.replace(/```json|```/g, "");
            const firstBracket = cleanText.indexOf('[');
            const lastBracket = cleanText.lastIndexOf(']');

            if (firstBracket !== -1 && lastBracket !== -1) {
                cleanText = cleanText.substring(firstBracket, lastBracket + 1);
                return JSON.parse(cleanText);
            }
        }
    } catch (error) {
        console.error("⚠️ Gemini Trend Fetch Error:", error.message);
        return [];
    }
    return [];
}

// -------------------------------------------------------------
// 3. MAIN API ROUTE
// -------------------------------------------------------------
export async function GET() {
    try {
        await connectDB();
        const cacheKey = "india_buzz_today";

        // A. CHECK CACHE
        const cached = await TrendingCache.findOne({ key: cacheKey });
        if (cached) {
            const isFresh = (new Date() - new Date(cached.updatedAt)) < CACHE_DURATION_MS;
            if (isFresh && cached.data.length > 0) {
                return NextResponse.json({
                    source: "cache",
                    data: cached.data,
                    lastUpdated: cached.updatedAt
                });
            }
        }

        // B. FETCH FRESH
        console.log("⚡ Fetching fresh trends from Gemini...");
        const rawTrends = await fetchGeminiTrends();

        if (!rawTrends || rawTrends.length === 0) {
            if (cached && cached.data.length > 0) {
                return NextResponse.json({ source: "stale_cache_fallback", data: cached.data });
            }
            return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
        }

        // C. VERIFY (Sequential to avoid ECONNRESET)
        const verifiedResults = [];
        console.log(`🔍 Verifying ${rawTrends.length} items with TMDB...`);

        for (const item of rawTrends) {
            const details = await fetchTMDBDetails(item.title, item.year, item.type);
            if (details) {
                verifiedResults.push({ ...item, ...details });
            }
        }

        // D. UPDATE CACHE
        if (verifiedResults.length > 0) {
            await TrendingCache.findOneAndUpdate(
                { key: cacheKey },
                { data: verifiedResults, key: cacheKey },
                { upsert: true, new: true }
            );
        }

        return NextResponse.json({
            source: "gemini_verified",
            data: verifiedResults
        });

    } catch (error) {
        console.error("❌ API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}