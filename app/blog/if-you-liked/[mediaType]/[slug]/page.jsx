import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Groq from "groq-sdk";

import { connectDB } from "@/lib/db";
import IfYouLiked from "@/models/IfYouLiked";
import { getMovieData } from "@/lib/getMovieData";
import { getTvData } from "@/lib/getTvData";
import { getRecommendationsForMedia } from "@/lib/recommendations";
import Navbar from "@/components/Navbar";

// ---- CONFIG ----
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;

// ---- HELPERS ----

async function tmdbFetch(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${TMDB_TOKEN} `,
                    accept: "application/json",
                },
                next: { revalidate: 3600 },
            });
            if (!res.ok) {
                if (res.status >= 500 && i < retries - 1) continue;
                return null;
            }
            return await res.json();
        } catch (err) {
            if (i === retries - 1) {
                console.error(`TMDB Fetch failed after ${retries} attempts: ${url} `, err);
                return null; // Return null instead of crashing page for one fail
            }
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, i))); // Backoff
        }
    }
}

async function searchMedia(title, year, type) {
    const safeTitle = encodeURIComponent(title);
    const yearParam = type === "movie" ? `&primary_release_year=${year}` : `&first_air_date_year=${year}`;
    const url = `${TMDB_BASE}/search/${type}?query=${safeTitle}${yearParam}&page=1`;
    const data = await tmdbFetch(url);
    return data?.results?.[0] || null;
}

// ---- GROQ GENERATION (JSON MODE) ----

async function generateArticleJson(targetMedia, recommendations) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Fallback models in order of preference
    const models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-20b",
        "qwen/qwen3-32b"
    ];

    const recsInfo = recommendations.map(r => ({
        id: r.id,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || "").slice(0, 4)
    }));

    const targetName = targetMedia.title || targetMedia.name;

    const prompt = `
    You are a friendly, knowledgeable film critic writing a blog post.

    Task: Write a blog post titled "If you liked ${targetName}, watch these next".
        Target: ${targetName} (${(targetMedia.release_date || targetMedia.first_air_date || "").slice(0, 4)}).
    
    CRITICAL STEP - HEADLINE GENERATION:
    Analyze the movie's core vibe (e.g., "mass action", "charming lover boy", "mind-bending twists") and its emotional payoff (e.g., "leave you shocked", "make you cheer", "have you on the edge of your seat").
    Create a headline following this EXACT pattern:
"If you loved the [VIBE/CHARACTER] in [Movie Name], these picks will [EMOTIONAL PAYOFF]."

Examples:
- "If you loved the raw mass action in Jailer, these picks will set your screen on fire."
    - "If you loved the charming lover boy in DDLJ, these picks will make you believe in love again."
    - "If you loved the mind-bending twists in Inception, these picks will leave you questioning reality."

    Output Format: JSON ONLY.
    {
    "headline": "Your generated headline here.",
        "intro": "A 2-paragraph introduction. Start with why '${targetName}' is great (themes, vibes). Then introduce the list.",
            "items": [
                {
                    "id": 123,
                    "content": "A detailed paragraph (3-4 sentences). Analyze the movie's style/themes and why it fits. Be casual but sharp."
                }
            ],
                "conclusion": "A short, warm conclusion."
}

Tone: Pop - culture savvy, enthusiastic, like a fan talking to a fan.
    Recommendations: ${JSON.stringify(recsInfo)}.
`;

    for (const model of models) {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: model,
                temperature: 0.7,
                response_format: { type: "json_object" }
            });

            // Log Token Usage
            if (completion.usage) {
                console.log(`[Groq] Model: ${model}`);
                console.log(`[Groq] Usage: ${completion.usage.total_tokens} tokens (Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens})`);
            }

            const content = completion.choices[0]?.message?.content;
            if (content) return JSON.parse(content);
        } catch (err) {
            console.warn(`Groq generation failed with model ${model}:`, err.message);
            // If it's the last model, return null, otherwise continue to next
            if (model === models[models.length - 1]) return null;
        }
    }
    return null;
}

// ---- PAGE COMPONENT ----

export async function generateMetadata({ params }) {
    const { mediaType, slug } = await params;
    const parts = slug.split("-");
    const year = parts.pop();
    const title = parts.join(" ");

    // We need to fetch the image to use it as OG. 
    // Since metadata runs before page, we might re-fetch or use a lightweight search.
    // For speed, let's just use a default or try search.
    // Actually, we can just use the searchMedia helper safely.
    let imageUrl = null;
    try {
        const item = await searchMedia(title, year, mediaType);
        if (item?.backdrop_path) {
            imageUrl = `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
        }
    } catch (e) { }

    return {
        title: `If You Liked ${title.replace(/\b\w/g, l => l.toUpperCase())}...`,
        openGraph: {
            images: imageUrl ? [imageUrl] : [],
        }
    };
}

export default async function IfYouLikedPage({ params }) {
    const { mediaType, slug } = await params;

    // 1. Parse & Sanitize Slug
    const decodedSlug = decodeURIComponent(slug);

    // Create a "clean" slug: strictly lowercase, alphanumeric + dashes
    // e.g. "Pushpa: The Rise - 2021" -> "pushpa-the-rise-2021"
    const cleanSlug = decodedSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanum with dash
        .replace(/^-+|-+$/g, "");     // Trim dashes

    // If the current slug isn't clean, redirect to the clean version
    if (decodedSlug !== cleanSlug) {
        redirect(`/blog/if-you-liked/${mediaType}/${cleanSlug}`);
    }

    // Regex: Capture everything before the last dash + 4 digits (Year)
    // Matches: "pushpa-the-rise-2021" -> Title: "pushpa-the-rise", Year: "2021"
    const match = cleanSlug.match(/^(.*)-(\d{4})$/);

    if (!match) return notFound();

    const [_, rawTitlePart, year] = match;

    // Clean title: "pushpa-the-rise" -> "pushpa the rise"
    const rawTitle = rawTitlePart.replace(/-/g, " ").trim();

    if (!rawTitle || isNaN(year)) return notFound();

    await connectDB();

    // 2. CHECK CACHE
    let article = await IfYouLiked.findOne({ slug: cleanSlug });
    let contentJson = null;

    if (article) {
        // Hydrate from DB
        try {
            contentJson = JSON.parse(article.content);
            console.log("Serving from Cache:", cleanSlug);

            // Fallback for legacy cache that might miss headline
            if (!article.headline) {
                article.headline = contentJson.headline || `If You Liked ${article.title}`;
            }
        } catch (e) {
            // Corrupt json? regenerate
            console.error("Cache corrupted, regenerating...");
            article = null;
        }
    }

    if (!article) {
        // 3. Generate New
        const targetItem = await searchMedia(rawTitle, year, mediaType);
        if (!targetItem) return notFound();

        // Get Full Details for Target
        const fullData = mediaType === "movie"
            ? await getMovieData(targetItem.id)
            : await getTvData(targetItem.id);

        // Get Recommendations (Shared Logic)
        const allRecs = await getRecommendationsForMedia(fullData, mediaType);
        // Limit to 8 recs max for content generation to save tokens, but store enough for sidebar
        const recsForPrompt = allRecs.slice(0, 8);

        // Generate JSON Content
        contentJson = await generateArticleJson(fullData, recsForPrompt);

        if (!contentJson) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-2xl font-bold text-red-400 mb-2">Service Limit Reached</h1>
                    <p className="text-neutral-400">Our AI scribe is taking a short coffee break. Please try again in 30 seconds.</p>
                </div>
            );
        }

        const headline = contentJson.headline || `If You Liked ${fullData.title || fullData.name}`;

        // Save to DB
        article = await IfYouLiked.create({
            slug: cleanSlug,
            mediaType: mediaType,
            mediaId: targetItem.id,
            title: fullData.title || fullData.name,
            content: JSON.stringify(contentJson), // Store raw JSON string
            headline: headline, // Store headline separately for easier access if needed
            bannerUrl: fullData.backdrop_path || "", // Store backdrop path ref
            recommendations: allRecs.slice(0, 20), // Store more recs for sidebar
            createdAt: new Date()
        });
    }

    // Helper to find image for a rec
    // Need to handle if article was loaded from DB (mongoose doc) or created new (object)
    // If from DB, recommendations is a POJO already (lean) or Mongoose Array.
    // Ensure we have array.
    const recsList = article.recommendations || [];

    const getRecImage = (id) => {
        const item = recsList.find(r => r.id === id);
        if (item?.backdrop_path) return `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
        if (item?.poster_path) return `https://image.tmdb.org/t/p/original${item.poster_path}`;
        return null;
    };

    const getRecTitle = (id) => {
        const item = recsList.find(r => r.id === id);
        return item?.title || item?.name;
    };

    const heroImage = article.bannerUrl && article.bannerUrl.startsWith("http")
        ? article.bannerUrl
        : (article.bannerUrl
            ? `https://image.tmdb.org/t/p/original${article.bannerUrl}`
            : null);

    // Fallback hero if bannerUrl is empty
    const finalHero = heroImage ||
        (recsList[0]?.backdrop_path ? `https://image.tmdb.org/t/p/original${recsList[0].backdrop_path}` : null);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-purple-500/30">
            <div className="fixed top-0 w-full z-50">
                <Navbar />
            </div>

            {/* 1. SIMPLE HERO (Backdrop + CSS) */}
            <div className="relative w-full h-[60vh] flex items-end overflow-hidden">
                <div className="absolute inset-0 z-0 bg-neutral-900">
                    {heroImage && (
                        <Image
                            src={heroImage}
                            alt={article.title}
                            fill
                            className="object-cover object-top opacity-60"
                            priority
                            unoptimized
                        />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                </div>

                <div className="relative z-10 container mx-auto px-4 pb-16 max-w-7xl text-start">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 drop-shadow-lg leading-tight">
                        {article.headline}
                    </h1>
                </div>
            </div>

            {/* 2. MAIN BLOG CONTENT + SIDEBAR */}
            <div className="container mx-auto px-4 max-w-7xl relative z-20 pb-32 -mt-10">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* LEFT COLUMN: ARTICLE (Wider) */}
                    <div className="lg:col-span-9">
                        {/* INTRO TEXT */}
                        <div className="prose prose-invert prose-xl max-w-none text-neutral-300 leading-loose mb-16">
                            <ReactMarkdown>{contentJson.intro || ""}</ReactMarkdown>
                        </div>

                        {/* ITEMS LOOP */}
                        <div className="space-y-20">
                            {contentJson.items?.map((item, idx) => {
                                const backdrop = getRecImage(item.id);
                                const title = getRecTitle(item.id);

                                return (
                                    <section key={item.id} className="scroll-mt-32">

                                        {/* Title Header - Clickable Link */}
                                        <Link href={`/${article.mediaType}/${item.id}`} className="block group">
                                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 group-hover:text-purple-400 transition-colors inline-block decorations-purple-500/50">
                                                {title}
                                            </h2>
                                        </Link>

                                        {/* VISUAL - Clean Image */}
                                        <Link href={`/${article.mediaType}/${item.id}`} className="block relative w-full aspect-video rounded-xl overflow-hidden mb-8 bg-neutral-900">
                                            {backdrop ? (
                                                <Image
                                                    src={backdrop}
                                                    alt={title || "Movie Image"}
                                                    fill
                                                    className="object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                                    No Preview
                                                </div>
                                            )}
                                        </Link>

                                        {/* TEXT */}
                                        <div className="prose prose-invert prose-lg max-w-none text-neutral-300">
                                            <ReactMarkdown>{item.content}</ReactMarkdown>
                                        </div>
                                    </section>
                                )
                            })}
                        </div>

                        {/* CONCLUSION */}
                        <div className="mt-20 pt-8 border-t border-white/10 prose prose-invert prose-lg max-w-none text-neutral-400 italic">
                            <ReactMarkdown>{contentJson.conclusion || ""}</ReactMarkdown>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SIDEBAR (Narrower) */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24">
                            <h3 className="text-sm font-bold text-neutral-400 mb-6 uppercase tracking-widest">
                                Check on TBC
                            </h3>

                            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {article.recommendations.map((rec) => (
                                    <Link
                                        key={rec.id}
                                        href={`/${article.mediaType}/${rec.id}`}
                                        className="flex gap-3 p-2 rounded-lg bg-black/40 border border-white/5 hover:bg-neutral-800 transition-colors group"
                                    >
                                        {/* Poster */}
                                        <div className="relative w-12 h-16 shrink-0 rounded overflow-hidden bg-neutral-800">
                                            {rec.poster_path ? (
                                                <Image
                                                    src={`https://image.tmdb.org/t/p/w200${rec.poster_path}`}
                                                    alt={rec.title || rec.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-800" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <h4 className="font-bold text-neutral-300 text-sm group-hover:text-purple-400 truncate transition-colors">
                                                {rec.title || rec.name}
                                            </h4>
                                            <div className="text-xs text-neutral-500 mt-0.5">
                                                {(rec.release_date || rec.first_air_date || "").slice(0, 4)}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
