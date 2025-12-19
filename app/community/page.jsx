"use client";

import Navbar from "@/components/Navbar";
import CommunityGrid from "@/components/social/CommunityGrid";
import { GradientBackground } from "@/components/ui/gradient-background";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Search, Sparkles, Film, Gamepad2, Tv, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { id: "All", label: "All", icon: Sparkles },
  { id: "industry", label: "Cinema", icon: Film },
  { id: "fanbase", label: "Fandoms", icon: Users },
  { id: "genre", label: "Genres", icon: Gamepad2 }, // Reuse Gamepad for generic 'Topic' vibe or find better
];

export default function CommunityPage() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    fetch("/api/community")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCommunities(data);
        }
      })
      .catch((err) => console.error("Failed to fetch communities", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter Logic
  const filteredCommunities = communities.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "All" || c.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* 🌈 Soft animated corner glow - Renders Instantly */}
      <GradientBackground
        className="
          absolute top-0 left-0
          w-full h-[40vh]
          opacity-20
          blur-3xl
          rounded-bl-[50%]
          pointer-events-none
          z-0
        "
      />

      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />

        <main className="max-w-7xl mx-auto w-full px-2 sm:px-6 lg:px-8 pb-24 md:pb-16 pt-20 flex-1 flex flex-col">

          {/* Header & Title - Mobile Optimized (Hidden on Mobile) */}
          <div className="hidden md:block mb-6 md:mb-10 px-2 mt-4">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
              Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Circle</span>
            </h1>
            <p className="text-neutral-400 text-sm md:text-lg leading-relaxed line-clamp-2 md:line-clamp-none">
              From Cinema to Series, K-Dramas to Anime — join the tribes that share your obsession.
            </p>
          </div>

          {/* STICKY SEARCH BAR & FILTERS - Blended */}
          <div className="sticky top-14 z-30 bg-transparent pt-0 -mx-2 px-4 space-y-3 mb-6 transition-all">

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-200" />
              <Input
                placeholder="Search communities..."
                className="pl-9 bg-neutral-950/80 border-transparent focus:border-none text-white placeholder:text-neutral-500 h-10 rounded-xl transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-2 mt-1 overflow-x-auto scrollbar-hide justify-around md:justify-start pb-1">
              {FILTERS.map((f) => {
                const Icon = f.icon;
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`
                                flex items-center gap-1.5 px-3 py-1.5 w-24 text-center justify-center rounded-full text-xs font-medium whitespace-nowrap transition-all border
                                ${isActive
                        ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                        : "bg-neutral-800/20 border-white/5 text-neutral-400 hover:bg-white/5 hover:text-white"
                      }
                            `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* GRID CONTENT */}
          {loading ? (
            <CommunitySkeleton />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <CommunityGrid
                communities={filteredCommunities}
                initialJoinedIds={communities.filter(c => c.joined).map(c => c._id)}
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredCommunities.length === 0 && (
            <div className="text-center py-20">
              <p className="text-neutral-500 text-sm">No communities found matching "{searchTerm}"</p>
              <Button variant="link" onClick={() => { setSearchTerm(""); setActiveFilter("All"); }} className="text-violet-400 mt-2">
                Clear filters
              </Button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 px-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-48 md:h-72 lg:h-80 w-full bg-zinc-900/50 rounded-xl overflow-hidden relative border border-zinc-800 animate-pulse">
          {/* Mobile Skeleton: Just a block */}
        </div>
      ))}
    </div>
  );
}
