"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import React from "react";

const weeklyPicks = [
  {
    id: 1233531,
    title: "Article 370",
    poster_path: "/9VTemjHMpyxzfC3JsG2aFy8Bf9Y.jpg",
    date: "2024-02-23",
    media_type: "movie",
    platform: "ZEE5",
    url: "https://www.themoviedb.org/movie/1233531-370",
  },
  {
    id: 292625,
    title: "Single Papa",
    poster_path: "/lZoeUMY9p0uza3aAhtnFxoiksO4.jpg",
    date: "2025-12-12",
    media_type: "tv",
    platform: "Netflix",
    url: "https://www.themoviedb.org/tv/292625-single-papa",
  },
  {
    id: 1196364,
    title: "Thamma",
    poster_path: "/udkbDwBbysCGEydt0FHnl9dVO2k.jpg",
    date: "2025-10-21",
    media_type: "movie",
    platform: "Prime Video",
    url: "https://www.themoviedb.org/movie/1196364",
  },

  {
    id: 1415974,
    title: "Raat Akeli Hai: The Bansal Murders",
    poster_path: "/dzv4sfVZmqSEiwVgO7W2wbQKVzN.jpg",
    date: "2025-12-19",
    media_type: "movie",
    platform: "Netflix",
    url: "https://www.themoviedb.org/movie/1415974",
  },
  {
    id: 307004,
    title: "Real Kashmir Football Club",
    poster_path: "/zsoQmFWqLuCzpNvyeIrggUsoc9I.jpg",
    date: "2025-12-08",
    media_type: "tv",
    platform: "Sony LIV",
    url: "https://www.themoviedb.org/tv/307004-real-kashmir-football-club",
  },
];


export default function WeeklyPicks() {
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
            grid-cols-2
            xs:grid-cols-3
            sm:grid-cols-4
            md:grid-cols-5
            lg:grid-cols-6
            gap-4
            pb-3
          "
        >
          {weeklyPicks.map((item, idx) => (
            <div
              key={item.id}
              className="hover:bg-neutral-800/60 p-2 cursor-pointer rounded-xl transition-all flex flex-col w-fit"
              onClick={() => {
                if (item.media_type === "movie") {
                  window.location.href = `/movie/${item.id}`;
                } else if (item.media_type === "tv") {
                  window.location.href = `/tv/${item.id}`;
                }
              }}
            >
              {/* Poster */}
              <div className="relative w-auto h-56 rounded-lg overflow-hidden">
                <Image
                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                  alt={item.title}
                  height={100}
                  width={100}
                  className="h-full w-fit rounded-lg"
                  quality={70}
                  sizes="(max-width: 500px) 48vw,
                         (max-width: 768px) 30vw,
                         (max-width: 1150px) 18vw,
                         12vw"
                />
              </div>

              {/* Title */}
              <p className="mt-2 font-medium text-sm bg-gradient-to-l from-neutral-300 via-neutral-200 to-neutral-400 text-transparent bg-clip-text line-clamp-1">
                {item.title.length > 17
                  ? `${item.title.slice(0, 17)}...`
                  : item.title}
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
