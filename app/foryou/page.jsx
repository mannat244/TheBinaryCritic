import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Navbar from "@/components/Navbar";
import { GradientBackground } from "@/components/ui/gradient-background";
import GenreRow from "@/components/GenreRow";
import SidebarCard from "@/components/SidebarPanel";
import EmptyStateForYou from "@/components/EmptyStateForYou";
import { Calendar } from "lucide-react";

// Use the local JSON file for genre names
import genreData from "@/public/movie_genre.json.json";

import LoggedOutView from "@/components/LoggedOutView";

export default async function ForYouPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <LoggedOutView
        title="Discover. Watch."
        highlight="Love."
        description="Get personalized movie recommendations tailored to your unique taste."
      />
    );
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();

  // Default to empty array if no preferences
  const preferredGenreIds = user?.preferences?.user_vector?.q3_preferred_genres || [];

  // Create a map for quick genre name lookup
  const genreIdToName = {};
  genreData.genres.forEach(g => {
    genreIdToName[g.id] = g.name;
  });

  // Priority order for "Popular Categories"
  const PRIORITY_GENRES = [
    28,   // Action
    10749, // Romance
    35,   // Comedy
    53,   // Thriller
    12,   // Adventure
    18,   // Drama
    878   // Sci-Fi
  ];

  // Sort: Priority ones first (in order), then others
  const sortedGenreIds = [...(preferredGenreIds || [])].sort((a, b) => {
    const idxA = PRIORITY_GENRES.indexOf(a);
    const idxB = PRIORITY_GENRES.indexOf(b);

    // If both are priority, sort by priority index
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;

    // If only A is priority, A comes first
    if (idxA !== -1) return -1;

    // If only B is priority, B comes first
    if (idxB !== -1) return 1;

    // Otherwise keep original order (or could sort by name, but stable is fine)
    return 0;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* 🌈 Soft animated corner glow (Matches Home) */}
      <GradientBackground
        className="
          absolute top-0 left-0
          w-full h-[20vh]
          opacity-15
          blur-3xl
          rounded-bl-[50%]
          pointer-events-none
          z-0
        "
      />

      <div className="relative z-10 font-[family-name:var(--font-geist-sans)]">
        <Navbar />

        {/* Match HotTrending structure: mx-5 wrapper, flex layout */}
        <div className="flex flex-col mt-20">
          <h1 className="text-xl flex ml-5 font-bold bg-linear-to-l from-neutral-50 via-neutral-100 to-neutral-300 text-transparent bg-clip-text">
            For You
          </h1>

          <div className="mx-5 mt-4 flex justify-center xl:justify-start gap-6 relative">
            {/* Main Content */}
            <div className="flex-1 w-full min-w-0 max-w-[1250px]">
              {sortedGenreIds.length > 0 ? (
                sortedGenreIds.map(genreId => (
                  <GenreRow
                    key={genreId}
                    title={genreIdToName[genreId] || "Genre"}
                    endpoint={`/api/recommend/genre_based?genre=${genreId}`}
                  />
                ))
              ) : (
                <EmptyStateForYou />
              )}
              <div className="h-20" />
            </div>

            {/* Sidebar (Matches Home) */}
            <div className="hidden xl:block w-[10vw] relative -top-10 max-w-[360px]">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
