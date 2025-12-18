import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";

import Review from "@/models/Review";
import User_Watched from "@/models/User_Watched";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(url) {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
            accept: "application/json"
        },
        next: { revalidate: 300 } // 5 mins cache
    });

    if (!res.ok) throw new Error("TMDB fetch failed");
    return res.json();
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ items: [] });
        }

        await connectDB();
        const userId = session.user.id;

        // 🔥 strong signal: positive reviews
        const reviews = await Review.find({
            userId,
            verdict: { $in: ["masterpiece", "worth_it"] }
        })
            .sort({ createdAt: -1 })
            .sort({ createdAt: -1 })
            .limit(10) // fetch pool of 10
            .lean();

        if (reviews.length === 0) {
            return NextResponse.json({ items: [] });
        }

        // Shuffle and pick 2
        const shuffled = reviews.sort(() => 0.5 - Math.random());
        const anchors = shuffled.slice(0, 2);
        const watchedDoc = await User_Watched.findOne({ userId }).lean();
        const watchedSet = new Set(
            (watchedDoc?.items || []).map(
                i => `${i.mediaType}-${i.tmdbId}`
            )
        );

        let results = [];
        let contextText = null;

        for (const r of anchors) {
            // ---- load reviewed item from cache ----
            const cache =
                r.mediaType === "movie"
                    ? await MovieCache.findOne({ movieId: r.mediaId }).lean()
                    : await TvCache.findOne({ tvId: r.mediaId }).lean();

            if (!cache?.data) continue;

            // 🔥 build human context ONCE (most recent review)
            if (!contextText) {
                const title =
                    r.mediaType === "movie"
                        ? cache.data.title
                        : cache.data.name;

                const verb =
                    r.verdict === "masterpiece" ? "loved" : "liked";

                contextText = `We read you ${verb} ${title}`;
            }

            const lang = cache.data.original_language;
            const genreIds = (cache.data.genres || []).map(g => g.id);
            if (!lang || genreIds.length === 0) continue;

            const type = r.mediaType;

            // ---- DISCOVER query (NO similarity APIs) ----
            const discoverUrl =
                `${TMDB_BASE}/discover/${type}` +
                `?with_original_language=${lang}` +
                `&with_genres=${genreIds.join(",")}` +
                `&sort_by=release_date.desc` +
                `&include_adult=false` +
                `&page=1`;

            const data = await tmdbFetch(discoverUrl);

            for (const item of data?.results || []) {
                const key = `${type}-${item.id}`;
                if (watchedSet.has(key)) continue;

                // remove very old noise only
                const year =
                    item.release_date?.slice(0, 4) ||
                    item.first_air_date?.slice(0, 4);
                if (year && Number(year) < 2000) continue;

                results.push({
                    ...item,
                    media_type: type,
                    _reason: "because you reviewed positively"
                });
            }
        }

        // ---- dedupe ----
        const seen = new Set();
        const deduped = [];

        for (const r of results) {
            const key = `${r.media_type}-${r.id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(r);
        }

        // ---- rank: RECENCY > QUALITY (INDIA SAFE) ----
        deduped.sort((a, b) => {
            const yearA =
                Number(a.release_date?.slice(0, 4) || a.first_air_date?.slice(0, 4) || 0);
            const yearB =
                Number(b.release_date?.slice(0, 4) || b.first_air_date?.slice(0, 4) || 0);

            const recencyA = yearA ? (yearA - 2000) * 0.4 : 0;
            const recencyB = yearB ? (yearB - 2000) * 0.4 : 0;

            const qualityA = (a.vote_average || 5) * 1.2;
            const qualityB = (b.vote_average || 5) * 1.2;

            return (recencyB + qualityB) - (recencyA + qualityA);
        });

        return NextResponse.json({
            context: contextText,
            items: deduped.slice(0, 20)
        });

    } catch (err) {
        console.error("because_reviewed (discover) failed:", err);
        return NextResponse.json({ items: [] });
    }
}
