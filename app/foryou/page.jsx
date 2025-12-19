"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { GradientBackground } from "@/components/ui/gradient-background";
import ForYouFeed from "@/components/ForYouFeed";
import LoggedOutView from "@/components/LoggedOutView";
import genreData from "@/public/movie_genre.json.json";

// Map IDs to names (Static, safe for client)
const genreIdToName = genreData.genres.reduce((acc, g) => {
  acc[g.id] = g.name;
  return acc;
}, {});

export default function ForYouPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState({ genres: [], mood: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/preferences")
        .then((res) => res.json())
        .then((data) => {
          if (data.genres) {
            setData(data);
          }
        })
        .catch((err) => console.error("Pref fetch error", err))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  // UN-AUTHENTICATED STATE (Render immediately if known)
  if (status === "unauthenticated") {
    return (
      <LoggedOutView
        title="Discover. Watch."
        highlight="Love."
        description="Get personalized movie recommendations tailored to your unique taste."
      />
    );
  }

  // ALWAY RENDER SHELL (Navbar + Background) to prevent layout shifts
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

            {/* CONTENT AREA: Swap between Skeleton and Feed */}
            {loading || status === "loading" ? (
              <div className="w-full max-w-[1250px] animate-pulse space-y-8">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-6">
                  <div className="h-8 w-32 bg-neutral-800 rounded-lg"></div>
                  <div className="h-8 w-24 bg-neutral-800 rounded-full"></div>
                </div>

                {/* Row Skeletons */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4">
                    <div className="h-6 w-48 bg-neutral-800 rounded-md"></div>
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="w-[112px] xl:w-[144px] h-[160px] xl:h-[224px] bg-neutral-900 rounded-lg shrink-0"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ForYouFeed
                initialMood={data.mood}
                preferredGenreIds={data.genres}
                genreIdToName={genreIdToName}
              />
            )}

            {/* Sidebar Placeholder (Hidden for now as per original) */}
            <div className="hidden xl:block w-[10vw] relative -top-10 max-w-[360px]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
