"use client";

import React, { useEffect, useState } from "react";
import { Zap, TrendingUp } from "lucide-react";
import Image from "next/image";
import { browserCacheFetch } from "@/lib/browserCache";
import { motion, AnimatePresence } from "motion/react";

const TopIndiaBuzz = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(6);

    useEffect(() => {
        const fetchBuzz = async () => {
            try {
                const data = await browserCacheFetch(
                    "india-buzz-data",
                    async () => {
                        const res = await fetch("/api/latest");
                        if (!res.ok) throw new Error("Failed to fetch");
                        const json = await res.json();
                        return json.data || [];
                    },
                    900 // 15 mins client cache
                );
                // Remove hard slice to allow "See More" expansion
                setItems(data || []);
            } catch (err) {
                console.error("FETCH ERROR:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBuzz();

        // Auto-expand on large screens
        if (typeof window !== "undefined" && window.innerWidth >= 1280) {
            setVisibleCount(50);
        }
    }, []);

    const getPoster = (item) => {
        if (item.poster_path)
            return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        if (item.backdrop_path)
            return `https://image.tmdb.org/t/p/w780${item.backdrop_path}`;
        return "/default-placeholder.webp";
    };

    const skeletonItems = Array.from({ length: 7 });

    if (!loading && items.length === 0) return null;

    return (
        <div className="flex flex-col mt-5 mb-8 relative">
            <h1 className="text-xl flex ml-5 font-bold bg-linear-to-l from-neutral-50 via-neutral-100 to-neutral-300 text-transparent bg-clip-text mb-4">
                <Zap className="text-neutral-50 my-auto mt-1 mr-2" />
                India Buzz
            </h1>

            {/* Main content wrapper */}
            <div className="mx-5 relative">
                <motion.div
                    layout
                    className="
                        grid
                        grid-cols-3
                        xs:grid-cols-3
                        sm:grid-cols-4
                        md:grid-cols-5
                        lg:grid-cols-6
                        gap-4
                        max-w-[1150px]
                        pb-3
                    "
                >
                    <AnimatePresence mode="popLayout">
                        {loading
                            ? skeletonItems.map((_, idx) => (
                                <div key={idx} className="p-2 rounded-xl flex flex-col w-fit">
                                    <div className="relative w-28 h-40 xl:w-36 xl:h-56 rounded-lg overflow-hidden bg-neutral-800/50 animate-pulse" />
                                    <div className="mt-2 h-3 w-24 xl:w-28 rounded-full bg-neutral-800/50 animate-pulse" />
                                    <div className="mt-1 h-2 w-12 rounded-full bg-neutral-800/40 animate-pulse" />
                                </div>
                            ))
                            : items.slice(0, visibleCount).map((item, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                    key={item.id || idx}
                                    className="hover:bg-neutral-800/60 p-2 cursor-pointer rounded-xl transition-colors flex flex-col w-fit"
                                    onClick={() => window.location.href = `/${item.media_type || 'movie'}/${item.tmdb_id || item.id}`}
                                >
                                    <div className="relative w-auto h-40 xl:h-56 rounded-lg overflow-hidden group">
                                        <Image
                                            src={getPoster(item)}
                                            alt={item.title}
                                            height={100}
                                            width={100}
                                            className="h-full w-fit rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300"
                                            sizes="(max-width: 200px) 50vw, (max-width: 768px) 40vw, (max-width: 1200px) 20vw, 15vw"
                                        />
                                    </div>

                                    <p className="mt-2 font-medium text-sm bg-linear-to-l from-neutral-300 via-neutral-200 to-neutral-400 text-transparent bg-clip-text line-clamp-1">
                                        {item.title}
                                    </p>

                                    <p
                                        className="
                                          mt-0.5 font-medium text-xs
                                          bg-linear-to-r from-purple-300 via-neutral-800 to-purple-300
                                          bg-size-[200%_100%] animate-[shimmer_2s_infinite]
                                          text-transparent bg-clip-text
                                          line-clamp-1
                                        "
                                    >
                                        {item.buzz_type?.[0] || item.subtext}
                                    </p>
                                </motion.div>
                            ))}
                    </AnimatePresence>
                </motion.div>

                {/* See More Button (Mobile/Tablet) */}
                {!loading && visibleCount < items.length && (
                    <div className="absolute -bottom-2 left-0 w-full h-40 bg-linear-to-t from-background via-background/90 to-transparent flex items-end justify-center pb-6 z-10 xl:hidden pointer-events-none">
                        <button
                            onClick={() => setVisibleCount(50)}
                            className="pointer-events-auto text-sm bg-transparent text-purple-500 font-medium py-1.5 px-6 rounded-full transition-transform active:scale-95 flex items-center gap-2"
                        >
                            See More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopIndiaBuzz;
