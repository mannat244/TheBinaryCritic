"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Link, TrendingUp } from "lucide-react";
import Image from "next/image";
import SidebarCard from "./SidebarPanel";
import { browserCacheFetch } from "@/lib/browserCache";



const HotTrending = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await browserCacheFetch(
          "trending-data",
          async () => {
            const res = await fetch("/api/trending");
            if (!res.ok) throw new Error("Failed to fetch");
            return await res.json();
          },
          3600 // 1 hour cache
        );
        
        console.log("🔥 TRENDING JSON:", JSON.stringify(data, null, 2));
        setItems(data);
      } catch (err) {
        console.error("FETCH ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const getPoster = (item) => {
    if (item.poster_path)
      return `https://image.tmdb.org/t/p/w300${item.poster_path}`;
    if (item.backdrop_path)
      return `https://image.tmdb.org/t/p/w300${item.backdrop_path}`;
    if (item.profile_path)
      return `https://image.tmdb.org/t/p/w500${item.profile_path}`;
    return "/default-placeholder.webp";
  };

  const getLabel = (item, index) => {
    const isIndian = item.origin_country?.includes("IN");
    const type = item.media_type;
    const release = new Date(item.date);
    const now = new Date();
    const diff = (now - release) / (1000 * 60 * 60 * 24);

    if (diff <= 7) return type === "movie" ? "New Release" : "New Episode";
    if (diff <= 30) {
      if (index < 3) return "Trending Now";
      if (isIndian) return "Buzzing in India";
      return "Rising";
    }
    if (diff <= 180) return isIndian ? "Popular" : "Top Rated";
    return "Classic";
  };

  const skeletonItems = Array.from({ length: 12 });

  return (
    <div className="flex flex-col">
      <h1 className="text-xl flex ml-5 mt-20 font-bold bg-linear-to-l from-neutral-50 via-neutral-100 to-neutral-300 text-transparent bg-clip-text">
        <TrendingUp className="text-neutral-50 my-auto mt-1 mr-2" />
        Hot & Trending
      </h1>
    
      <div className="hidden xl:block"></div>
      
      {/* Main content wrapper */}
      <div className="mx-5 mt-4 flex justify-center xl:justify-start gap-6">

        {/* ⭐ GRID (Centered automatically when sidebar hidden) */}
        <div
          className="
            grid
            grid-cols-2
            xs:grid-cols-3
            sm:grid-cols-4
            md:grid-cols-5
            lg:grid-cols-6
            gap-4
            max-w-[1150px]
            pb-3
          "
        >
          {loading
            ? skeletonItems.map((_, idx) => (
                <div key={idx} className="p-2 rounded-xl flex flex-col w-fit">
                  <div className="relative w-36 h-56 rounded-lg overflow-hidden bg-neutral-800/50 animate-pulse" />
                  <div className="mt-2 h-3 w-24 rounded-full bg-neutral-800/50 animate-pulse" />
                  <div className="mt-1 h-2 w-12 rounded-full bg-neutral-800/40 animate-pulse" />
                </div>
              ))
            : items.map((item, idx) => (
                <div
                  key={idx}
                  className="hover:bg-neutral-800/60 p-2 cursor-pointer rounded-xl transition-all flex flex-col w-fit"
                >
                  <div className="relative w-auto h-56 rounded-lg overflow-hidden">
                    <Image
                      src={getPoster(item)}
                      alt={item.title || item.name}
                      height={100}
                      width={100}
                      onClick={() => window.location.href = `/${item.media_type}/${item.id}`}
                      className="h-full w-fit rounded-lg"
                      sizes="(max-width: 200px) 50vw,
                             (max-width: 768px) 40vw,
                             (max-width: 1200px) 20vw,
                             15vw"
                      quality={70}
                      priority={idx < 2}
                    />
                  </div>

                  <p className="mt-2 font-medium text-sm bg-linear-to-l from-neutral-300 via-neutral-200 to-neutral-400 text-transparent bg-clip-text line-clamp-1">
                    {item.title || item.name}
                  </p>

                  <p
                    className="
                      mt-0.5 font-medium text-xs
                      bg-linear-to-r from-purple-300  via-neutral-800 to-purple-300
                      bg-size-[200%_100%] animate-[shimmer_2s_infinite]
                      text-transparent bg-clip-text
                    "
                  >
                    {getLabel(item, idx)}
                  </p>
                </div>
              ))}
        </div>

        {/* ⭐ SIDEBAR (Only visible ≥1150px) */}
        <div className="hidden xl:block w-[20vw] relative -top-5 max-w-[360px]">
            <h1 className="text-xl flex ml-5 relative top-[-25px] font-bold bg-linear-to-l from-neutral-100 via-neutral-300 to-neutral-300 text-transparent bg-clip-text">
        <Calendar className="text-neutral-50 my-auto mr-2" />Upcoming</h1>
         <SidebarCard/>
        </div>

      </div>
    </div>
  );
};

export default HotTrending;
