import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Navbar from "@/components/Navbar";
import { GradientBackground } from "@/components/ui/gradient-background";
import GenreRow from "@/components/GenreRow";
import ForYouFeed from "@/components/ForYouFeed";
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

  // Fetch current mood (server-side)
  const currentMood = user?.currentMood?.value || null;

  // Sort by popularity priority
  const PRIORITY_GENRES = [28, 10749, 35, 53, 12, 18, 878];

  // Deduped and sorted
  const sortedIds = [...(preferredGenreIds || [])].sort((a, b) => {
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
          <div className="mx-5 mt-4 flex justify-center xl:justify-start gap-6 relative">
            {/* Main Content (Wrapped in Client Component) */}
            <ForYouFeed
              initialMood={currentMood}
              preferredGenreIds={sortedIds}
              genreIdToName={genreIdToName}
            />

            {/* Sidebar */}
            <div className="hidden xl:block w-[10vw] relative -top-10 max-w-[360px]">

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
