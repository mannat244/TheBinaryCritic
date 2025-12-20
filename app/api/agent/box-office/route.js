import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/social/Post";
import Community from "@/models/social/Community";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Ensure this is in .env
const CRON_SECRET = process.env.CRON_SECRET;
const AGENT_USER_ID = process.env.AGENT_USER_ID;

const COMMUNITY_ID = "69416fcdb3339a4345469553";
const TARGET_URL = "https://www.sacnilk.com/entertainmenttopbar/Box_Office_Collection?hl=en";

const groq = new Groq({ apiKey: GROQ_API_KEY });

// -------------------------------------------------------------
// SCRAPER LOGIC
// -------------------------------------------------------------
function formatFuzzy(value) {
    if (!value || isNaN(value)) return "N/A";

    // 30% chance of being a range
    const isRange = Math.random() < 0.3;
    const offset = (Math.random() * 4) - 2; // Random between -2 and +2

    if (isRange) {
        const min = (value - Math.abs(offset)).toFixed(2);
        const max = (value + Math.abs(offset)).toFixed(2);
        return `${min}-${max} Cr`;
    } else {
        return `${(value + offset).toFixed(2)} Cr`;
    }
}

// -------------------------------------------------------------
// BANNER GENERATION HELPERS
// -------------------------------------------------------------
import { ImageResponse } from '@vercel/og';

async function fetchPoster(title) {
    try {
        const tmdbToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
        if (!tmdbToken) return null;

        const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1`;
        const res = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${tmdbToken}`, Accept: "application/json" },
            next: { revalidate: 3600 }
        });

        if (!res.ok) return null;
        const data = await res.json();
        const movie = data.results?.[0]; // Best match

        if (movie?.poster_path) {
            return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        }
        return null;
    } catch (e) {
        console.error(`Poster fetch failed for ${title}:`, e);
        return null;
    }
}

async function uploadBanner(imageBuffer) {
    try {
        const apiKey = process.env.IMGCDN_API_KEY;
        if (!apiKey) return null;

        const formData = new FormData();
        formData.append("key", apiKey);
        formData.append("source", new Blob([imageBuffer], { type: 'image/png' }), "banner.png");
        formData.append("format", "json");

        const res = await fetch("https://imgcdn.dev/api/1/upload", {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            console.error("Upload failed:", await res.text());
            return null;
        }

        const data = await res.json();
        console.log("ImgCDN Response:", JSON.stringify(data));

        return data.url || data.image?.url; // Try both common formats
    } catch (e) {
        console.error("Banner upload error:", e);
        return null;
    }
}

async function loadGoogleFont(font, text) {
    const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype|woff)'\)/);

    if (resource) {
        const response = await fetch(resource[1]);
        if (response.status == 200) {
            return await response.arrayBuffer();
        }
    }

    throw new Error('failed to load font data');
}

async function generateBoxOfficeBanner(allMovies) {
    try {
        // 1. Load Font (Roboto Bold) - Include ALL possible chars (Currency, punctuation, nums)
        const fontData = await loadGoogleFont(
            'Roboto:wght@700',
            'DAILYBOXOFFICETheBinaryCritcTopHitsMwabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789₹.,- '
        );

        // 2. Find Promising Candidates (Try to get 3 with posters)
        // Prioritize: High Grossing -> Recent
        const candidates = [...allMovies];
        const validMovies = [];

        for (const m of candidates) {
            if (validMovies.length >= 3) break;
            const posterUrl = await fetchPoster(m.title);
            if (posterUrl) {
                validMovies.push({ ...m, posterUrl });
            }
        }

        if (validMovies.length === 0) {
            console.log("❌ No posters found for banner.");
            return null;
        }

        // 3. Generate Image using Satori (@vercel/og)
        const dateStr = new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });

        const imageResponse = new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0a0a0a', // Matched to Share Card
                        fontFamily: '"Roboto"',
                        position: 'relative',
                        overflow: 'hidden', // Ensure blobs don't overflow
                    }}
                >
                    {/* Background Glow 1: Top Right Purple */}
                    <div style={{
                        position: 'absolute',
                        top: -100, // Partial offset
                        right: -100,
                        width: '600px',
                        height: '600px',
                        backgroundColor: 'rgba(168, 85, 247, 0.2)', // purple-500/20
                        borderRadius: '100%',
                        filter: 'blur(100px)',
                        display: 'flex',
                    }} />

                    {/* Background Glow 2: Bottom Left Blue */}
                    <div style={{
                        position: 'absolute',
                        bottom: -100,
                        left: -100,
                        width: '600px',
                        height: '600px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)', // blue-500/15 (slightly bumped for visibility)
                        borderRadius: '100%',
                        filter: 'blur(100px)',
                        display: 'flex',
                    }} />

                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginBottom: 40
                    }}>
                        <div style={{ fontSize: 60, fontWeight: 700, color: 'white', letterSpacing: '-2px', display: 'flex' }}>
                            DAILY BOX OFFICE
                        </div>
                        <div style={{ fontSize: 30, color: '#a1a1aa', marginTop: 10, fontWeight: 700, display: 'flex' }}>
                            {dateStr}
                        </div>
                    </div>

                    {/* Posters Row */}
                    <div style={{
                        display: 'flex',
                        gap: '40px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                    }}>
                        {validMovies.map((m, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                {/* Poster Image */}
                                <img
                                    src={m.posterUrl}
                                    style={{
                                        width: 200,
                                        height: 300,
                                        borderRadius: 16,
                                        boxShadow: '0 20px 50px -10px rgba(0,0,0,0.8)',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        objectFit: 'cover'
                                    }}
                                />
                                {/* Rank Badge */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: 20,
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    padding: '8px 24px',
                                    borderRadius: 99,
                                    fontSize: 20,
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.5)'
                                }}>
                                    #{i + 1}
                                </div>
                                {/* Net Collection Label */}
                                <div style={{
                                    display: 'flex',
                                    marginTop: 12,
                                    color: '#e4e4e7',
                                    fontSize: 24,
                                    fontWeight: 700
                                }}>
                                    ₹ {formatFuzzy(m.indiaNet)} Cr
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer branding */}
                    <div style={{
                        display: 'flex',
                        position: 'absolute',
                        bottom: 30,
                        right: 40,
                        color: '#52525b',
                        fontSize: 20
                    }}>
                        The Binary Critic
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
                fonts: [
                    {
                        name: 'Montserrat',
                        data: fontData,
                        style: 'normal',
                        weight: 700,
                    },
                ],
            }
        );

        return await imageResponse.arrayBuffer();

    } catch (e) {
        console.error("Banner generation failed:", e);
        return null;
    }
}

// -------------------------------------------------------------
// DEEP SCRAPER HELPER
// -------------------------------------------------------------
async function scrapeMovieDetails(relativeUrl) {
    if (!relativeUrl) return null;
    try {
        const fullUrl = `https://www.sacnilk.com${relativeUrl}`;
        console.log(`🕵️ [DeepScrape] Checking ${fullUrl}...`);

        const res = await fetch(fullUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 3600 } // Cache for 1 hour
        });
        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);
        const details = [];

        // Loop through each language box
        $("div.boxofficecollection").each((i, el) => {
            const heading = $(el).find("h2").text(); // e.g., "Avatar... Hindi Day Wise..."

            // Extract Language name
            let lang = "Unknown";
            if (heading.includes("Hindi")) lang = "Hindi";
            else if (heading.includes("English")) lang = "English";
            else if (heading.includes("Telugu")) lang = "Telugu";
            else if (heading.includes("Tamil")) lang = "Tamil";
            else if (heading.includes("Kannada")) lang = "Kannada";
            else if (heading.includes("Malayalam")) lang = "Malayalam";
            else return; // Skip if no language detected

            // Find Table
            const $table = $(el).find("table");
            if ($table.length === 0) return;

            // Find Indices
            let day1Index = -1;
            let verdictIndex = -1;

            $table.find("th").each((j, th) => {
                const text = $(th).text().trim().toLowerCase();
                if (text.includes("day 1")) day1Index = j;
                if (text.includes("verdict")) verdictIndex = j;
            });

            if (day1Index !== -1) {
                // Get values from first data row
                const $firstRow = $table.find("tr").eq(1); // Row 0 is header, Row 1 is data
                const day1Val = $firstRow.find("td").eq(day1Index).text().trim();
                const verdictVal = verdictIndex !== -1 ? $firstRow.find("td").eq(verdictIndex).text().trim() : "N/A";

                details.push(`${lang}: Day 1 [${day1Val}] | Verdict [${verdictVal}]`);
            }
        });

        return details.length > 0 ? details.join(", ") : null;
    } catch (e) {
        console.error(`Diff scraper error for ${relativeUrl}: ${e.message}`);
        return null;
    }
}

async function scrapeAndGeneratePost() {
    let rawData = "";
    try {
        console.log(`🤖 [BoxOfficeAgent] Fetching ${TARGET_URL}...`);

        // 1. Fetch HTML
        const res = await fetch(TARGET_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            next: { revalidate: 0 } // No cache
        });

        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const html = await res.text();

        // 2. Parse HTML
        const $ = cheerio.load(html);
        const movies = [];

        $("table.table tbody tr").each((i, el) => {
            if ($(el).hasClass("qubit-ad-row") || $(el).find("th").length > 0) return;

            const titleEl = $(el).find("td").eq(0).find("b");
            const linkEl = $(el).find("td").eq(0).find("a"); // Extract Link
            const title = titleEl.text().trim();
            const href = linkEl.attr("href");

            const worldwideRaw = $(el).find("td").eq(1).text().trim();
            const indiaNetRaw = $(el).find("td").eq(2).text().trim();
            const indiaGrossRaw = $(el).find("td").eq(3).text().trim();
            const overseasRaw = $(el).find("td").eq(4).text().trim();
            const type = $(el).find("td").eq(5).text().trim();
            const dateRaw = $(el).find("td").eq(6).text().trim(); // "19 Dec 2025"

            const indiaNet = parseFloat(indiaNetRaw.replace(/,/g, "")) || 0;
            const indiaGross = parseFloat(indiaGrossRaw.replace(/,/g, "")) || 0;
            const worldwide = parseFloat(worldwideRaw.replace(/,/g, "")) || 0;
            const overseas = parseFloat(overseasRaw.replace(/,/g, "")) || 0;
            const releaseDate = new Date(dateRaw);

            if (title) {
                movies.push({
                    title,
                    href, // Store relative link
                    indiaNet,
                    indiaGross,
                    worldwide,
                    overseas,
                    type,
                    releaseDate
                });
            }
        });

        // 2.5 DEDUPLICATE (Keep first occurrence found, usually best)
        const uniqueMovies = Array.from(new Map(movies.map(m => [m.title, m])).values());

        // 3. Selection Logic

        // A. Latest 5 (New Releases)
        const sortedByDate = [...uniqueMovies].sort((a, b) => b.releaseDate - a.releaseDate);
        const latestMovies = sortedByDate.slice(0, 5);
        const latestTitles = new Set(latestMovies.map(m => m.title));

        // B. Indian Hits (Excluding Latest)
        const indianMovies = uniqueMovies
            .filter(m => !latestTitles.has(m.title))
            .filter(m => m.type !== "Hollywood" && !m.type.includes("Hollywood"))
            .sort((a, b) => b.worldwide - a.worldwide)
            .slice(0, 3); // Reduced to 3

        // C. Hollywood Giants (Excluding Latest)
        const hollywoodMovies = uniqueMovies
            .filter(m => !latestTitles.has(m.title))
            .filter(m => m.type === "Hollywood" || m.type.includes("Hollywood"))
            .sort((a, b) => b.worldwide - a.worldwide)
            .slice(0, 3); // Reduced to 3

        if (latestMovies.length === 0 && indianMovies.length === 0 && hollywoodMovies.length === 0) {
            throw new Error("No movies found during scrape");
        }

        // 4. DEEP SCRAPE (Top 4 most relevant: Top 2 Fresh + Top 2 Hits)
        const focusMovies = [...latestMovies.slice(0, 2), ...indianMovies.slice(0, 2)];
        console.log(`🕵️ Deep scraping ${focusMovies.length} movies...`);

        await Promise.all(focusMovies.map(async (m) => {
            if (m.href) {
                const details = await scrapeMovieDetails(m.href);
                if (details) m.deepDetails = details;
            }
        }));

        // 5. BANNER GENERATION (Parallel with String Gen)
        console.log(`🖼️ [BoxOfficeAgent] Generating Banner...`);
        let bannerUrl = null;
        const bannerBuffer = await generateBoxOfficeBanner(focusMovies);
        if (bannerBuffer) {
            bannerUrl = await uploadBanner(bannerBuffer);
            console.log(`✅ Banner uploaded: ${bannerUrl}`);
        }

        // 6. Generate Raw Data String
        const dateStr = new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'short' });

        rawData = `Date: ${dateStr}\n\n`;

        // Helper to format line
        const formatLine = (m) => {
            let line = `- ${m.title} [🇮🇳 Net: ${formatFuzzy(m.indiaNet)} | 🏛️ Gross: ${formatFuzzy(m.indiaGross)} | 🌍 WW: ${formatFuzzy(m.worldwide)}]`;
            if (m.deepDetails) line += `\n  - INSIDER INTEL: ${m.deepDetails}`;
            return line + "\n";
        };

        // New Releases
        if (latestMovies.length > 0) {
            rawData += `FRESH IN THEATERS (Recent Releases):\n`;
            latestMovies.forEach(m => rawData += formatLine(m));
        }

        // Indian Section
        if (indianMovies.length > 0) {
            rawData += `\nTOP INDIAN HITS (By Worldwide Gross):\n`;
            indianMovies.forEach(m => rawData += formatLine(m));
        }

        // Hollywood Section
        if (hollywoodMovies.length > 0) {
            rawData += `\nHOLLYWOOD GIANTS:\n`;
            hollywoodMovies.forEach(m => rawData += formatLine(m));
        }

        // 6. AI Refinement (Groq) with Fallback
        console.log(`🤖 [BoxOfficeAgent] Sending data to Groq for style processing...`);
        let aiContent = null;

        // Strategy: Try User Model -> Fallback to Llama 3 -> Fallback to Raw Data
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Role: Viral Box Office Analyst.
Style: Punchy, insightful, human. Sounds like a film trade insider, not a journalist or AI.

Task:

1. **The Narrative**: 
Start directly with a 2–3 sentence analysis of the *current Indian box office mood*.
Focus on what’s actually happening right now (last 7–10 days):
- Winners vs underperformers
- Regional vs Bollywood vs Hollywood
- Any surprising trend or collapse (Use the "INSIDER INTEL" data like Day 1 or Verdicts if available)
- Do NOT use labels like "Hook", "Intro", or "Summary". Just write the analysis.

2. **The Proof**: 
Immediately follow with a **Box Office Cheat Sheet** in standard Markdown table format.

Table rules (strict):
- Columns: | Rank | Movie | 🇮🇳 India Net | 🌍 WW Gross | Trend | Verdict |
- Rank by **India Net collections**.
- Trend (📈 / 📉 / ➖) must be based on recent India Net momentum.
- Include ONLY: Currently running theatrical films OR Films released in the last ~3 weeks.
- Exclude OTT-only titles.
- Consolidate duplicates.
- Limit to Top 10 entries.

Data honesty rules:
- If exact numbers are unclear, use conservative estimates or "≈"
- Never invent collections.
- If WW data is unavailable, write "N/A".

Verdict must be one of:
Disaster | Flop | Average | Hit | Super Hit | Blockbuster`
                    },
                    {
                        role: "user",
                        content: `Here is the latest data:\n\n${rawData}\n\nWrite a crisp post.`
                    }
                ],
                model: "openai/gpt-oss-20b",
                temperature: 1,
                max_completion_tokens: 3000,
                top_p: 1,
                stream: false
            });
            aiContent = completion.choices[0]?.message?.content;
        } catch (err) {
            console.error(`[BoxOfficeAgent] Model 'gpt-oss-20b' failed: ${err.message}. Retrying with Llama 3...`);
        }

        if (!aiContent) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Role: Viral Box Office Analyst.
Style: Punchy, insightful, human.
Task:
1. The Hook: Write a 3-sentence summary identifying the real story behind the numbers (unexpected hits, flops, or trends).
2. The Visual: Create a high-density "Box Office Cheat Sheet" Markdown table.
   - Columns: Rank, Movie, 🇮🇳 India Net, 🏛️ India Gross, 🌍 Worldwide, Trend (📈/📉 based on Net), Verdict.
   - Use the exact figures provided (including ranges).`
                        },
                        {
                            role: "user",
                            content: `Here is the latest data:\n\n${rawData}\n\nWrite a crisp post.`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 1,
                    max_completion_tokens: 3000,
                    top_p: 1,
                    stream: false
                });
                aiContent = completion.choices[0]?.message?.content;
            } catch (fallbackErr) {
                console.error(`[BoxOfficeAgent] Fallback model failed: ${fallbackErr.message}`);
            }
        }

        return { post_text: aiContent || rawData, media: bannerUrl ? [bannerUrl] : [] };

    } catch (e) {
        console.error(`[BoxOfficeAgent] Scrape/Gen failed: ${e.message}`);
        return { post_text: rawData || "Failed to fetch data.", media: [] };
    }
}

// -------------------------------------------------------------
// MAIN ROUTE
// -------------------------------------------------------------
export async function POST(req) {
    try {
        await connectDB();

        // 1. Auth Check (CRON Secret)
        const secret = req.headers.get("x-api-secret");
        if (CRON_SECRET && secret !== CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Check duplicate (Once every 20 hours)
        // 2. Check duplicate (Once every 12 hours)
        if (AGENT_USER_ID) {
            const TWELVE_HOURS_AGO = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const existingPost = await Post.findOne({
                communityId: COMMUNITY_ID,
                authorId: AGENT_USER_ID,
                createdAt: { $gt: TWELVE_HOURS_AGO }
            });

            if (existingPost) {
                return NextResponse.json({ skipped: true, message: "Already posted today" });
            }
        }
        // 3. Generate Content (Scrape)
        const generated = await scrapeAndGeneratePost();

        if (!generated || !generated.post_text) {
            return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
        }

        // 4. Create Post
        // Safety check for user ID
        if (!AGENT_USER_ID) {
            return NextResponse.json({ error: "Missing AGENT_USER_ID env var" }, { status: 500 });
        }

        const post = await Post.create({
            communityId: COMMUNITY_ID,
            authorId: AGENT_USER_ID,
            content: generated.post_text,
            media: generated.media || []
        });

        // 5. Update Stats
        await Community.updateOne(
            { _id: COMMUNITY_ID },
            { $inc: { postsCount: 1 } }
        );

        return NextResponse.json({ success: true, post });

    } catch (error) {
        console.error("[BoxOfficeAgent] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
