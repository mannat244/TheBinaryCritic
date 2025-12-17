import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrendingCache from "@/models/TrendingCache";

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------
const TMDB_API_KEY = process.env.TMDB_API_READ_ACCESS_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 Minutes

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
    // const modelId = "gemini-2.5-flash"; // REMOVED: Managed dynamically in loop
    const today = new Date().toLocaleDateString();

    const SYSTEM_PROMPT = `
You are TBC’s REAL-TIME ENTERTAINMENT TREND EDITOR for INDIA.

TODAY’S DATE: ${today}

You MUST use GOOGLE SEARCH as the ONLY discovery source.
Do NOT rely on memory, popularity, or famous franchises.

You MUST ONLY consider buzz from the LAST 5 DAYS (±5 days).
Anything older → DISCARD.

━━━━━━━━━━━━━━━━━━
CORE OBJECTIVE
━━━━━━━━━━━━━━━━━━
Discover UP TO 18 MOVIES or TV / WEB SERIES
that are ACTIVELY BUZZING IN INDIA RIGHT NOW
based STRICTLY on recent search and news signals.

Over-generate candidates.
Downstream systems will prune this list to 10–12.

━━━━━━━━━━━━━━━━━━
🚫 CONTROVERSY POLICY (STRICT)
━━━━━━━━━━━━━━━━━━
DISALLOWED:
• Scandals
• Bans
• Backlash
• Outrage
• Actor-related issues
• AI edits / deepfakes
• Plot leaks

ALLOWED (ONLY THIS):
✅ Trailer / teaser CLIP leaks
   (short video clips, teaser snippets, preview footage)

If the buzz reason is NOT one of the allowed cases
→ DISCARD.

━━━━━━━━━━━━━━━━━━
ALLOWED BUZZ TYPES (ONLY THESE)
━━━━━━━━━━━━━━━━━━
A title may be included ONLY if buzz is due to:

✅ Trailer / teaser / first look release  
✅ Trailer / teaser CLIP leak  
✅ Official announcement (release date, casting, certification)  
✅ OTT release (this week)  
✅ Box office performance (fresh ≤5 days)

━━━━━━━━━━━━━━━━━━
ANTI-BIAS DISCOVERY RULE
━━━━━━━━━━━━━━━━━━
• Do NOT search for specific franchises
• Do NOT assume popularity
• Include a title ONLY if current search results
  show active discussion

━━━━━━━━━━━━━━━━━━
HARD RENDERING CONSTRAINT
━━━━━━━━━━━━━━━━━━
Include ONLY items that map to a:
• Movie page
• TV / Web series page

If it cannot open a content page → DISCARD.

━━━━━━━━━━━━━━━━━━
TITLE RULE (DEDUP SAFE)
━━━━━━━━━━━━━━━━━━
• Use FULL OFFICIAL TITLE only
• No abbreviations
• No franchise-only names
• No actor names

If a buzz cannot be mapped to ONE specific title
→ DISCARD.

━━━━━━━━━━━━━━━━━━
OTT RULES (IMPORTANT)
━━━━━━━━━━━━━━━━━━
• MAX 3 OTT titles
• OTT INDIA:
  – Always allowed if widely discussed
• OTT GLOBAL:
  – Include ONLY if clearly trending in India
• Routine releases → DISCARD

━━━━━━━━━━━━━━━━━━
SUPERHERO / GLOBAL FRANCHISE RULE
━━━━━━━━━━━━━━━━━━
Superhero or global franchise titles may be included ONLY IF:
• Trailer / teaser dropped OR clip leaked
• OR official announcement occurred
• AND Indian search/news discussion is visible

Otherwise → DISCARD.

━━━━━━━━━━━━━━━━━━
BOX OFFICE RULES (STRICT)
━━━━━━━━━━━━━━━━━━
• ONLY fresh numbers (≤5 days)
• NO lifetime totals
• NO guessing
• Unreleased titles → NO numbers

━━━━━━━━━━━━━━━━━━
SUBTEXT RULES (MAX 3 WORDS)
━━━━━━━━━━━━━━━━━━
Choose ONE neutral reason.

Examples:
• "Trailer dropped"
• "Teaser clip leak"
• "First look"
• "Release announced"
• "Now streaming Netflix"
• "Weekend ₹120 Cr"

━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON ONLY)
━━━━━━━━━━━━━━━━━━
[
  {
    "title": "",
    "year": 2025,
    "type": "movie | tv",
    "buzz_type": [
      "Trailer Drop | Announcement | OTT Release | Box Office"
    ],
    "subtext": ""
  }
]

━━━━━━━━━━━━━━━━━━
🧠 VERIFICATION CHECKLIST (MANDATORY)
━━━━━━━━━━━━━━━━━━
Before including ANY item, ALL checks below MUST pass:

[ ] Is this a MOVIE or TV / WEB SERIES?
[ ] Is the buzz from the LAST 5 DAYS?
[ ] Is the buzz due to an ALLOWED BUZZ TYPE?
[ ] If a leak, is it a TRAILER / TEASER CLIP (not plot/controversy)?
[ ] Does this title have CURRENT discussion in INDIA?
[ ] If OTT:
      - India release OR
      - Global release trending in India?
[ ] If Superhero / Global franchise:
      - Trailer or clip present?
      - Indian discussion visible?
[ ] Does the title map to ONE specific content page?
[ ] Is the title written in FULL official form?
[ ] Was this included due to SEARCH DATA (not assumption)?

If ANY checkbox fails → DISCARD THE ITEM.

━━━━━━━━━━━━━━━━━━
FINAL EDITOR CHECK
━━━━━━━━━━━━━━━━━━
Ask:
“Would this appear today on an Indian entertainment homepage
for its CONTENT, not controversy?”

If NO → REMOVE IT.`;


    // 🚀 Fallback Models (Ordered by Speed/Cost -> Power)
    // We skip 'Lite' models & older models as per user request.
    const FALLBACK_MODELS = [
        "gemini-2.5-flash",       // Primary: Fast & Balanced
        "gemini-2.0-flash",       // Fallback 1: Very reliable
        "gemini-3-flash-preview", // Fallback 2: Newest fast model
        "gemini-2.5-pro"          // Fallback 3: Stronger reasoning (slower but good last resort)
    ];

    for (let i = 0; i < FALLBACK_MODELS.length; i++) {
        const currentModel = FALLBACK_MODELS[i];

        try {
            console.log(`🤖 Attempt ${i + 1}/${FALLBACK_MODELS.length}: Using ${currentModel}...`);

            const response = await genAI.models.generateContent({
                model: currentModel,
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
                    console.log(`✅ Success with ${currentModel}`);
                    return JSON.parse(cleanText);
                }
            }
            // If we get here, the response was weird. Usually we might retry, but let's try next model.

        } catch (error) {
            console.error(`⚠️ Error with ${currentModel}:`, error.message);

            // If it's the last model, return empty
            if (i === FALLBACK_MODELS.length - 1) {
                console.error("❌ All fallback models failed.");
                return [];
            }

            // Small delay before switching models to be polite to the API rate limiter
            await new Promise(res => setTimeout(res, 1000));
        }
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