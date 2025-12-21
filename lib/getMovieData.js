import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";

const safeJSON = (obj) => JSON.parse(JSON.stringify(obj));

export async function getMovieData(id) {
    if (!id) throw new Error("Movie ID required");

    await connectDB();

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) throw new Error("TMDB token missing");

    // 1. CHECK CACHE
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
    try {
        const cached = await MovieCache.findOne({ movieId: id }).lean();
        if (cached?.data && cached?.cachedAt) {
            const age = Date.now() - new Date(cached.cachedAt).getTime();
            if (age < CACHE_TTL) {
                return cached.data;
            }
        }
    } catch (e) {
        console.warn("Cache check failed:", e);
    }

    // 2. TMDB FETCH
    const append = ["videos", "credits", "keywords", "watch_providers"].join(",");
    const TMDB_URL = `https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=${append}`;

    const res = await fetch(TMDB_URL, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 300 },
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`TMDB failed: ${res.status} ${errText}`);
    }

    let data = await res.json();
    const cleanData = safeJSON(data);

    // 3. SAVE CACHE
    try {
        await MovieCache.findOneAndUpdate(
            { movieId: id },
            {
                movieId: id,
                data: cleanData,
                cachedAt: new Date(),
            },
            { upsert: true }
        );
    } catch (cacheErr) {
        console.warn("Cache save failed:", cacheErr);
    }

    return cleanData;
}
