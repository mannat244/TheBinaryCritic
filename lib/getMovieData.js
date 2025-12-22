import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";

const safeJSON = (obj) => JSON.parse(JSON.stringify(obj));

export async function getMovieData(id) {
    if (!id) throw new Error("Movie ID required");

    await connectDB();

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) throw new Error("TMDB token missing");

    // 1. CHECK CACHE (Dynamic TTL)
    // < 2 months: 3 hours | < 1 year: 3 days | > 1 year: 7 days
    const ONE_HOUR = 3600 * 1000;
    const ONE_DAY = 24 * 3600 * 1000;

    const getDynamicTTL = (releaseDate) => {
        if (!releaseDate) return 7 * ONE_DAY;
        const age = Date.now() - new Date(releaseDate).getTime();
        if (age < 60 * ONE_DAY) return 3 * ONE_HOUR;
        if (age < 365 * ONE_DAY) return 3 * ONE_DAY;
        return 7 * ONE_DAY;
    };

    let cached = null;
    try {
        cached = await MovieCache.findOne({ movieId: id }).lean();
        if (cached?.data && cached?.cachedAt) {
            const releaseDate = cached.data.release_date;
            const TTL = getDynamicTTL(releaseDate);
            const age = Date.now() - new Date(cached.cachedAt).getTime();

            if (age < TTL) {
                // Determine if we should extend the cache (Sliding Expiration for hits)
                // For very old movies, if hit recently, we can just keep using it.
                return cached.data;
            }
            console.log(`[MovieCache] Expired: ${id} (Age: ${(age / 3600000).toFixed(1)}h, TTL: ${(TTL / 3600000).toFixed(1)}h)`);
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
