import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;

const MAX_FRANCHISE = 5;
const MAX_PERSONA = 7;

async function tmdbFetch(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${TMDB_TOKEN}`,
                    accept: "application/json",
                },
                next: { revalidate: 3600 },
            });
            if (!res.ok) {
                if (res.status >= 500 && i < retries - 1) continue; // Retry on 5xx
                return null;
            }
            return await res.json();
        } catch (err) {
            if (i === retries - 1) throw err; // Throw on last attempt
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, i))); // Backoff
        }
    }
}

/**
 * Generates recommendations based on a single target item (Movie/TV).
 * This mimics the "Because You Watched" logic but focused on one anchor.
 * 
 * @param {Object} targetItem - The full TMDB movie/tv object
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {Set} seenSet - Set of IDs to exclude (optional)
 * @returns {Array} - Array of recommendation objects with `_reason`
 */
export async function getRecommendationsForMedia(targetItem, mediaType, seenSet = new Set()) {
    const results = [];
    const lang = targetItem.original_language || "en";
    const genres = (targetItem.genres || []).map(g => g.id);

    // Ensure we don't recommend the target itself
    seenSet.add(`${mediaType}-${targetItem.id}`);

    // 1. FRANCHISE (Movies only)
    if (mediaType === "movie" && targetItem.belongs_to_collection) {
        const collection = await tmdbFetch(`${TMDB_BASE}/collection/${targetItem.belongs_to_collection.id}`);
        for (const part of collection?.parts || []) {
            if (seenSet.has(`movie-${part.id}`)) continue;
            results.push({ ...part, media_type: "movie", _reason: "Part of the same series" });
            seenSet.add(`movie-${part.id}`);
            if (results.length >= MAX_FRANCHISE) break;
        }
    }

    // 2. PERSONA (Lead Actor)
    // Use credits if available, otherwise we might need to fetch them.
    // Assuming targetItem has credits appended (standard getMovieData does this).
    const leadActor = targetItem.credits?.cast?.[0]?.id;
    if (leadActor) {
        const personaUrl = `${TMDB_BASE}/discover/${mediaType}?with_people=${leadActor}&with_original_language=${lang}&sort_by=popularity.desc`;
        const personaData = await tmdbFetch(personaUrl);
        let count = 0;
        for (const item of personaData?.results || []) {
            if (count >= MAX_PERSONA) break;
            if (seenSet.has(`${mediaType}-${item.id}`)) continue;

            results.push({ ...item, media_type: mediaType, _reason: `Starring the same lead actor` });
            seenSet.add(`${mediaType}-${item.id}`);
            count++;
        }
    }

    // 3. TASTE DISCOVER (Similar vibes)
    if (genres.length > 0) {
        // Fetch 2 pages to get enough candidates
        for (let page of [1, 2]) {
            const url = `${TMDB_BASE}/discover/${mediaType}?with_original_language=${lang}&with_genres=${genres.join(",")}&sort_by=vote_count.desc&page=${page}`;
            const data = await tmdbFetch(url);
            for (const item of data?.results || []) {
                if (seenSet.has(`${mediaType}-${item.id}`)) continue;

                // Filter old stuff if needed, or keep it? User said "Because Watched" logic filters < 2005.
                const year = parseInt((item.release_date || item.first_air_date || "0").substring(0, 4));
                if (year > 0 && year < 2000) continue; // Relaxed to 2000

                results.push({ ...item, media_type: mediaType, _reason: "Similar themes and genres" });
                seenSet.add(`${mediaType}-${item.id}`);
            }
        }
    }

    // 4. FALLBACK: TRENDING IN SAME LANGUAGE (If we have very few results)
    if (results.length < 5) {
        // Try to find popular items in that language to fill the gap
        const fallbackUrl = `${TMDB_BASE}/discover/${mediaType}?with_original_language=${lang}&sort_by=popularity.desc&page=1`;
        const fallbackData = await tmdbFetch(fallbackUrl);
        for (const item of fallbackData?.results || []) {
            if (results.length >= 20) break;
            if (seenSet.has(`${mediaType}-${item.id}`)) continue;

            // Filter out very old stuff again if we want young vibe
            const year = parseInt((item.release_date || item.first_air_date || "0").substring(0, 4));
            if (year > 0 && year < 2010) continue;

            results.push({ ...item, media_type: mediaType, _reason: "Popular in this language" });
            seenSet.add(`${mediaType}-${item.id}`);
        }
    }

    // Dedupe happens via seenSet, but results array is ordered by logic priority (Franchise > Actor > Genre > Trending)
    return results.slice(0, 20);
}
