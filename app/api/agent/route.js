import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import Post from "@/models/social/Post";

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------
const TMDB_API_KEY = process.env.TMDB_API_READ_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const AGENT_USER_ID = process.env.AGENT_USER_ID;

// 5 Seconds delay between communities to respect Rate Limits (Simpler than batching)
const DELAY_MS = 5000;

const groq = new Groq({ apiKey: GROQ_API_KEY });

// -------------------------------------------------------------
// 1. TMDB IMAGE FETCH
// -------------------------------------------------------------
async function fetchTMDBImage(query, type = "multi") {
    if (!query || !TMDB_API_KEY) return null;

    let attempts = 0;
    while (attempts < 3) {
        try {
            const safeQuery = encodeURIComponent(query);
            let endpoint = "search/multi";

            if (type === "person") endpoint = "search/person";
            else if (type === "movie") endpoint = "search/movie";
            else if (type === "tv") endpoint = "search/tv";

            const url = `https://api.themoviedb.org/3/${endpoint}?query=${safeQuery}&include_adult=false&language=en-US&page=1`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${TMDB_API_KEY}` }
            });

            if (!res.ok) {
                if (res.status === 429) {
                    await new Promise(r => setTimeout(r, 1000));
                    throw new Error("TMDB 429");
                }
                // If 404 or other, return null immediately (don't retry)
                if (res.status === 404) return null;
                throw new Error(`TMDB HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data?.results?.length > 0) {
                const best = data.results[0];

                // A. Person Image (Profile)
                if (type === "person" || best.media_type === "person") {
                    if (best.profile_path) {
                        return `https://image.tmdb.org/t/p/original${best.profile_path}`;
                    }
                }

                // B. Content Image (Backdrop preferred, then Poster)
                if (best.backdrop_path) {
                    return `https://image.tmdb.org/t/p/original${best.backdrop_path}`;
                }
                if (best.poster_path) {
                    return `https://image.tmdb.org/t/p/original${best.poster_path}`;
                }
            }
            return null; // Found nothing
        } catch (e) {
            console.error(`TMDB Fetch Error (Attempt ${attempts + 1}):`, e.message);
            attempts++;
            // Wait 2s before retry
            if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

// -------------------------------------------------------------
// 2. GROQ GENERATION (SINGLE)
// -------------------------------------------------------------
async function generatePostContent(communityName) {
    if (!communityName) return null;

    const MODEL = "groq/compound";

    // "The Binary Critic v2.0" System Prompt
    const SYSTEM_INSTRUCTION = `
You are **The Binary Critic (TBC)**.

You are NOT a helpful assistant. You are a **chronically online Indian movie buff** who has "seen it all."
Your goal is to post "Hot Takes" that force people to stop scrolling and comment to either defend the movie or agree with your unpopular opinion.

---

### 🧠 PSYCHOLOGY OF THE BAIT
You must use one of these 3 psychological triggers for every post:

1. **The "Mid" Allegation:** Take a currently trending, highly-rated thing and call it "average" or "overhyped."
   * *Example:* "animal ka bgm hatado toh movie average hi hai tbh"
2. **The "Nostalgia Trap":** Claim something old was strictly better than the new version.
   * *Example:* "don 3 banalo par srk wala swag lana impossible hai"
3. **The "Logic Gap":** Point out a funny plot hole or weird casting choice.
   * *Example:* "hero ke paas goli kabhi khatam nahi hoti, reload ka option bhul gaye director sahab"

---

### 🗣️ TONE & LANGUAGE (HINGLISH STRICT)
* **Vibe:** Casual, low-effort, slightly judgmental, conversational.
* **Format:** Lowercase mostly. No formal grammar.
* **Slang:** Use words like: *scene, mid, hype, literally, vibes, cringe, logic, bhai.*
* **No "Namaste/Hello":** Start directly with the opinion.

**❌ BAD (Too Formal/Robotic):**
"Is anyone else excited for the new SRK movie? The trailer looks great!"

**✅ GOOD (Comment Bait):**
"srk ka new trailer dekha... vfx thoda video game type lag raha hai ya bas mujhe laga? 🤔"

**✅ GOOD (Opinionated):**
"ott pe content toh bohot hai par dekhne layak kuch nahi mil raha aajkal. suggestions? 💀"

---

### 📝 CONTENT RULES
1.  **Be Current:** Use the provided search tool to find what is trending *right now* for that specific community.
2.  **Be Specific:** Don't say "movies today." Say "pushpa 2" or "jawan".
3.  **Length:** Short. 2-3 sentences max.
4.  **Emojis:** Max 1 or 2. Use: 💀, 🤔, 🧢, 📉, 🥱.

---

### 🛑 CRITICAL CONSTRAINTS
* **NO** hashtags.
* **NO** "Click here" or "Check this out."
* **NO** explaining the movie plot. Assume everyone knows it.
* **NO** extreme hate or politics. Keep it about entertainment quality.

---

### ⚙️ OUTPUT INSTRUCTIONS
You must strictly output a **RAW JSON** object (no markdown formatting).
Ensure the 'search_term' is highly specific so TMDB finds the exact right image.
`;

    const USER_PROMPT = `
You are posting for this specific community: **${communityName}**.

**STEP 1:** Use Google Search to find top trending discussion/controversy/release regarding "**${communityName}**" in India (Last 24h).
**STEP 2:** Pick ONE "debate-worthy" topic strictly relevant to **${communityName}**. (e.g. if Anime, only Anime topic).
**STEP 3:** Write a "Comment Bait" post in Hinglish based on the SYSTEM_INSTRUCTION.

Output strictly in JSON format:
{
  "post_text": "The hinglish post content...",
  "search_term": "Precise search term for image",
  "search_type": "movie" | "tv" | "person"
}
`;

    // Retries for robustness
    let attempts = 0;
    while (attempts < 3) {
        try {
            console.log(`🤖 [Groq] Generating for [${communityName}]... (Attempt ${attempts + 1})`);

            const response = await groq.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    { role: "user", content: USER_PROMPT }
                ],
                // Enabling Built-in Tools
                compound_custom: {
                    tools: {
                        enabled_tools: ["web_search"]
                    }
                }
            });

            const content = response.choices[0]?.message?.content;

            if (content) {
                // Sanitize and Parse
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                } else {
                    return JSON.parse(content);
                }
            }
        } catch (e) {
            // Smart Rate Limit Cooldown
            const isRateLimit = e.message.includes("429") || e.message.includes("Rate limit");
            const waitTime = isRateLimit ? 60000 : 5000; // 60s for rate limit, 5s for others

            console.warn(`[Groq] Gen failed: ${e.message}. Waiting ${waitTime / 1000}s...`);
            await new Promise(r => setTimeout(r, waitTime));
        }
        attempts++;
    }

    return null;
}

// -------------------------------------------------------------
// 3. MAIN ROUTE
// -------------------------------------------------------------
export async function POST(req) {
    try {
        await connectDB();

        // 1. Auth Check
        const secret = req.headers.get("x-api-secret");
        if (secret !== CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!AGENT_USER_ID) {
            return NextResponse.json({ error: "Server Config Error: Missing AGENT_USER_ID" }, { status: 500 });
        }

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Server Config Error: Missing GROQ_API_KEY" }, { status: 500 });
        }

        // 2. Get Communities
        const communities = await Community.find({})
            .sort({ membersCount: -1 })
            .limit(15)
            .select("name _id type");

        const results = [];
        const FIVE_HOURS_AGO = new Date(Date.now() - 5 * 60 * 60 * 1000);

        // 3. Process Communities (SERIES)
        for (const community of communities) {

            // A. Atomic Check (Resume Logic)
            const lastPost = await Post.findOne({
                communityId: community._id,
                authorId: AGENT_USER_ID,
                createdAt: { $gt: FIVE_HOURS_AGO }
            });

            if (lastPost) {
                results.push({ community: community.name, status: "skipped_recent" });
                continue;
            }

            // B. Generate Content (Groq)
            const generated = await generatePostContent(community.name);

            if (!generated) {
                results.push({ community: community.name, status: "failed_ai" });
                continue;
            }

            // C. Fetch Image (TMDB)
            const imageUrl = await fetchTMDBImage(generated.search_term, generated.search_type);
            const media = imageUrl ? [imageUrl] : [];

            // D. Create Post
            const post = await Post.create({
                communityId: community._id,
                authorId: AGENT_USER_ID,
                content: generated.post_text,
                media: media
            });

            // E. Update Stats
            await Community.updateOne(
                { _id: community._id },
                { $inc: { postsCount: 1 } }
            );

            results.push({
                community: community.name,
                post_id: post._id,
                topic: generated.search_term
            });

            // F. Delay to respect Rate Limits
            await new Promise(r => setTimeout(r, DELAY_MS));
        }

        return NextResponse.json({ success: true, posts: results });

    } catch (error) {
        console.error("Agent Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
