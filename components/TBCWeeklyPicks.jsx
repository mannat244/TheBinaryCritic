"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { browserCacheFetch } from "@/lib/browserCache";

export default function WeeklyPicks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        const data = await browserCacheFetch(
          "weekly-picks-data",
          async () => {
            const res = await fetch("/api/weekly");
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            return json.data || [];
          },
          3600 // 1 hour cache
        );
        setItems(data || []);
      } catch (err) {
        console.error("Weekly Picks Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekly();
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <div className="flex flex-col mt-10">
      {/* Title */}
      <h1 className="text-xl flex ml-5 font-bold bg-gradient-to-l from-neutral-50 via-neutral-200 to-neutral-300 text-transparent bg-clip-text">
        <Sparkles className="text-neutral-50 my-auto mt-1 mr-2" />
        TBC Weekly Picks
      </h1>

      {/* ROW WRAPPER */}
      <div className="mx-5 mt-4 flex justify-center xl:justify-start">
        <div
          className="
            grid
            grid-cols-3
            xs:grid-cols-3
            sm:grid-cols-4
            md:grid-cols-5
            lg:grid-cols-6
            gap-4
            pb-3
          "
        >
          {loading
            ? Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-2 rounded-xl flex flex-col w-fit">
                <div className="relative w-28 h-40 xl:w-36 xl:h-56 rounded-lg overflow-hidden bg-neutral-800/50 animate-pulse" />
                <div className="mt-2 h-3 w-20 bg-neutral-800/50 rounded animate-pulse" />
                <div className="mt-1 h-2 w-12 bg-neutral-800/40 rounded animate-pulse" />
              </div>
            ))
            : items.map((item, idx) => (
              <div
                key={item.id}
                className="hover:bg-neutral-800/60 p-2 cursor-pointer rounded-xl transition-all flex flex-col w-fit group"
                onClick={() => {
                  if (item.media_type === "movie") {
                    window.location.href = `/movie/${item.id}`;
                  } else if (item.media_type === "tv") {
                    window.location.href = `/tv/${item.id}`;
                  }
                }}
              >
                {/* Poster */}
                <div className="relative w-auto h-40 xl:h-56 rounded-lg overflow-hidden group">
                  <Image
                    src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                    alt={item.title}
                    height={100}
                    width={100}
                    className="h-full w-fit rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300"
                    quality={70}
                    sizes="(max-width: 500px) 48vw,
                         (max-width: 768px) 30vw,
                         (max-width: 1150px) 18vw,
                         12vw"
                  />
                </div>

                {/* Title */}
                <p className="mt-2 font-medium text-sm bg-linear-to-l from-neutral-300 via-neutral-200 to-neutral-400 text-transparent bg-clip-text line-clamp-1 w-28 xl:w-36">
                  {item.title}
                </p>

                {/* Label */}
                <p
                  className="
                mt-0.5 font-medium text-xs
                bg-gradient-to-r from-purple-300 via-neutral-800 to-purple-300
                bg-[length:200%_100%] animate-[shimmer_2s_infinite]
                text-transparent bg-clip-text
              "
                >
                  {idx + 1}. Weekly Pick
                </p>
              </div>
            ))}
        </div>
      </div>
      <div className="h-16 w-1"></div>
    </div>
  );
}
