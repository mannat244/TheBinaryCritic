"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function SidebarPanel() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/sidebar");
        const data = await res.json();
        setUpcoming(data.upcoming || []);
      } catch (e) {
        console.error("Sidebar fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full m-0">
      <div className="pr-2">
        {/* Skeletons */}
        {loading &&
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 mb-2 p-1.5">
              <div className="h-24 w-16 shrink-0 bg-neutral-800/50 rounded-md animate-pulse" />
              <div className="flex flex-col justify-center w-full">
                <div className="h-3 w-32 bg-neutral-800/50 rounded-full mb-2 animate-pulse" />
                <div className="h-3 w-20 bg-neutral-800/40 rounded-full animate-pulse" />
              </div>
            </div>
          ))}

        {/* Actual upcoming list */}
        {!loading &&
          upcoming.map((movie) => (
            <Link 
              key={movie.id}
              href={`/movie/${movie.id}`}
              className="flex gap-3 rounded-lg hover:bg-neutral-800/50 p-1.5 transition-all mb-1 cursor-pointer"
            >
              <div className="relative h-24 w-auto rounded-md overflow-hidden">
                <Image
                  src={
                    movie.poster
                      ? `https://image.tmdb.org/t/p/w185${movie.poster}`
                      : "/default-placeholder.webp"
                  }
                  alt={movie.title}
                  height={100}
                  width={100}
                  quality={50}
                  sizes="100px"
                  className="h-24 w-auto max-w-[100px]"
                />
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-neutral-200 text-base font-medium line-clamp-1">
                  {(movie.title.length>25) ? movie.title.slice(0,22) + "..." : movie.title}
                </p>

                <p className="flex items-center gap-1 text-neutral-400 text-xs mt-0.5">
                  <CalendarDays size={14} />
                  {movie.releaseDate}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
