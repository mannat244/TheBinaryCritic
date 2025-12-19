"use client";

import { useState } from "react";
import MoodDialog from "./MoodDialog";
import GenreRow from "./GenreRow";
import { Sparkles } from "lucide-react";

export default function ForYouFeed({
    initialMood,
    preferredGenreIds,
    genreIdToName,
}) {
    const [mood, setMood] = useState(initialMood);
    const [refreshKey, setRefreshKey] = useState(0);
    const [manualOpen, setManualOpen] = useState(false);

    const handleMoodChange = (newMood) => {
        setMood(newMood);
        setRefreshKey((prev) => prev + 1); // Force re-mount of rows
        console.log("Mood changed to:", newMood, "Rows refreshing...");
    };

    // Sort by popularity priority (Moved logic to client for simplicity, or keep passed sortedIds)
    // For now, we assume preferredGenreIds is already sorted or we sort it here.
    // Re-using server logic strictly if needed, but client side sort is fine for display.
    const PRIORITY_GENRES = [28, 10749, 35, 53, 12, 18, 878];

    // Deduped and sorted
    const sortedIds = [...new Set(preferredGenreIds)]
        .sort((a, b) => {
            const idxA = PRIORITY_GENRES.indexOf(a);
            const idxB = PRIORITY_GENRES.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        })
        .slice(0, 4);

    return (
        <div className="flex-1 w-full min-w-0 max-w-[1250px] relative">
            {/* Header & Button Inline */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl md:text-2xl font-bold bg-linear-to-l from-neutral-50 via-neutral-100 to-neutral-300 text-transparent bg-clip-text">
                    For You
                </h1>

                <button
                    onClick={() => setManualOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-neutral-300"
                >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Vibe Check</span>
                </button>
            </div>

            <MoodDialog
                onMoodChange={handleMoodChange}
                initialOpen={false}
                key={manualOpen ? 'manual' : 'auto'} // Reset logic if needed
                externalOpen={manualOpen}
                setExternalOpen={setManualOpen}
            />

            {/* Row 1: New & Relevant */}
            <GenreRow
                key={`new-${refreshKey}`}
                title="New & Relevant"
                endpoint="/api/recommend/new_relevant"
                cacheContext={mood}
                isPriority={true}
            />

            {/* Row 2: Because You Reviewed */}
            <GenreRow
                key={`reviewed-${refreshKey}`}
                title="Because You Reviewed"
                endpoint="/api/recommend/because_reviewed"
                cacheContext={mood}
            />

            {/* Row 3: Because You Watched */}
            <GenreRow
                key={`watched-${refreshKey}`}
                title="Because You Watched"
                endpoint="/api/recommend/because_watched"
                cacheContext={mood}
            />

            {/* Row 4: Trending Fallback */}
            <GenreRow
                key={`trending-${refreshKey}`}
                title="Trending Now"
                endpoint="/api/trending"
                cacheContext={mood}
            />

            {/* Dynamic Genre Rows */}
            {sortedIds.map((genreId) => (
                <GenreRow
                    key={`genre-${genreId}-${refreshKey}`}
                    title={genreIdToName[genreId] || `Genre ${genreId}`}
                    endpoint={`/api/recommend/genre_based?genre=${genreId}`}
                    cacheContext={mood}
                />
            ))}

            <div className="h-20" />
        </div>
    );
}
