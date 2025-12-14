import { pc, pineconeIndex } from "@/lib/pinecone";

/**
 * Generates a rich semantic description of a movie or TV show.
 * This text is what Pinecone will convert into a vector.
 * 
 * @param {Object} item - The full movie/tv object from TMDB or Cache
 * @param {String} type - "movie" or "tv"
 */
export function generateContentSummary(item, type = "movie") {
    const parts = [];

    // Basics
    const title = item.title || item.name || "Unknown Title";
    const releaseDate = item.release_date || item.first_air_date || "";
    const year = releaseDate ? releaseDate.split("-")[0] : "Unknown Year";

    parts.push(`${title} is a ${type === "movie" ? "movie" : "TV show"} released in ${year}.`);

    // Genres
    if (item.genres && item.genres.length > 0) {
        const genreNames = item.genres.map(g => g.name).join(", ");
        parts.push(`Genres: ${genreNames}.`);
    }

    // Overview / Plot
    if (item.overview) {
        parts.push(`Plot: ${item.overview}`);
    }

    // Keywords ( Critical for matching themes )
    // TMDB usually provides these in a separate endpoint, but if we have them attached:
    if (item.keywords && item.keywords.keywords) {
        const keywords = item.keywords.keywords.map(k => k.name).join(", ");
        if (keywords) parts.push(`Themes and keywords: ${keywords}.`);
    }

    // Cast & Crew (Director/Creator often defines style)
    if (item.credits) {
        const cast = item.credits.cast ? item.credits.cast.slice(0, 5).map(c => c.name).join(", ") : "";
        if (cast) parts.push(`Starring: ${cast}.`);

        const directors = item.credits.crew ? item.credits.crew.filter(c => c.job === "Director").map(c => c.name).join(", ") : "";
        if (directors) parts.push(`Directed by: ${directors}.`);
    }

    // Production Country (Matches User's Region preference)
    if (item.production_countries && item.production_countries.length > 0) {
        const countries = item.production_countries.map(c => c.name).join(", ");
        parts.push(`Produced in: ${countries}.`);
    }

    // Spoken Languages (Matches User's Language preference)
    if (item.spoken_languages && item.spoken_languages.length > 0) {
        const langs = item.spoken_languages.map(l => l.english_name || l.name).join(", ");
        parts.push(`Available in languages: ${langs}.`);
    }

    return parts.join(" ");
}

/**
 * Upserts a batch of content items to Pinecone.
 * Handles text generation and batching automatically.
 * 
 * @param {Array} items - Array of movie/tv objects
 * @param {String} type - "movie" or "tv"
 */
export async function embedAndUpsertContent(items, type = "movie") {
    if (!items || items.length === 0) return;

    console.log(`[Pinecone] Preparing to embed ${items.length} ${type} items...`);

    // 1. Prepare Records
    const records = items.map((item) => {
        const text = generateContentSummary(item, type);
        const tmdbId = item.id;

        // Safety check for ID
        if (!tmdbId) {
            console.warn("⚠️ Item missing ID, skipping:", item.title || item.name);
            return null;
        }

        return {
            _id: `${type}:${tmdbId}`, // e.g. "movie:12345"
            text: text,               // Source text for embedding
            type: `${type}_content`,  // "movie_content" or "tv_content"
            tmdbId: tmdbId.toString(),
            title: item.title || item.name || "",
            genres: (item.genres || []).map(g => g.name || ""), // Store as strings list
            year: (item.release_date || item.first_air_date || "").split("-")[0]
        };
    }).filter(Boolean); // Remove nulls

    if (records.length === 0) return;

    // 2. Upsert in Batches (max 96 for integrated text embedding per docs)
    // We'll use a safe batch size of 50
    const BATCH_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        chunks.push(records.slice(i, i + BATCH_SIZE));
    }

    const availableIndex = pineconeIndex;

    for (const chunk of chunks) {
        try {
            console.log(`[Pinecone] Upserting batch of ${chunk.length} records...`);
            await availableIndex.upsertRecords(chunk);
        } catch (error) {
            console.error(`❌ Retry logic needed? Error upserting batch:`, error);

            // Simple Retry Logic
            try {
                await new Promise(res => setTimeout(res, 2000));
                await availableIndex.upsertRecords(chunk);
                console.log("✅ Retry successful");
            } catch (retryErr) {
                console.error("❌ Retry failed, skipping batch:", retryErr);
            }
        }
    }

    console.log(`[Pinecone] Finished processing ${items.length} items.`);
}
