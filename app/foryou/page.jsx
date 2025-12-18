import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Navbar from "@/components/Navbar";
import { GradientBackground } from "@/components/ui/gradient-background";
import GenreRow from "@/components/GenreRow";
import SidebarCard from "@/components/SidebarPanel";
import LoggedOutView from "@/components/LoggedOutView";
import { Calendar, Sparkles } from "lucide-react";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import genreData from "@/public/movie_genre.json.json";

// Map IDs to names
const genreIdToName = genreData.genres.reduce((acc, g) => {
  acc[g.id] = g.name;
  return acc;
}, {});

export default async function ForYouPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <LoggedOutView
        title="Discover. Watch."
        highlight="Love."
        description="Get personalized movie recommendations tailored to your unique taste."
      />
    );
  }

  // Fetch User Preferences (Server Side)
  await connectDB();
  const user = await User.findById(session.user.id).lean();
  const preferredGenreIds = user?.preferences?.user_vector?.q3_preferred_genres || [];

  // Sort by popularity priority
  const PRIORITY_GENRES = [28, 10749, 35, 53, 12, 18, 878];
  const sortedIds = [...preferredGenreIds].sort((a, b) => {
    const idxA = PRIORITY_GENRES.indexOf(a);
    const idxB = PRIORITY_GENRES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  }).slice(0, 4);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* 🌈 Soft animated corner glow */}
      <GradientBackground
        className="
          absolute top-0 left-0
          w-full h-[10vh]
          opacity-15
          blur-3xl
          rounded-bl-[50%]
          pointer-events-none
          z-0
        "
      />

      <div className="relative z-10 font-[family-name:var(--font-geist-sans)]">
        <Navbar />

        <div className="flex flex-col mt-20">
          <h1 className="text-xl md:text-2xl flex ml-5 font-bold bg-linear-to-l from-neutral-50 via-neutral-100 to-neutral-300 text-transparent bg-clip-text">
            For You 
          </h1>

          <div className="mx-5 mt-4 flex justify-center xl:justify-start gap-6 relative">
            {/* Main Content */}
            <div className="flex-1 w-full min-w-0 max-w-[1250px]">

              {/* Row 1: New & Relevant */}
              <GenreRow title="New & Relevant" endpoint="/api/recommend/new_relevant" />

              {/* Row 2: Because You Reviewed */}
              <GenreRow title="Because You Reviewed" endpoint="/api/recommend/because_reviewed" />

              {/* Row 3: Because You Watched */}
              <GenreRow title="Because You Watched" endpoint="/api/recommend/because_watched" />

              {/* Row 4: Trending Fallback */}
              <GenreRow title="Trending Now" endpoint="/api/trending" />

              {/* Dynamic Genre Rows */}
              {sortedIds.map((genreId) => (
                <GenreRow
                  key={genreId}
                  title={genreIdToName[genreId] || `Genre ${genreId}`}
                  endpoint={`/api/recommend/genre_based?genre=${genreId}`}
                />
              ))}

              <div className="h-20" />
            </div>

            {/* Sidebar */}
            <div className="hidden xl:block w-[10vw] relative -top-10 max-w-[360px]">

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
