"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { browserCacheFetch } from "@/lib/browserCache";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const normalizeList = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
};

const GenreRow = ({ title, endpoint, initialItems = null, disableCache = false, cacheContext = "", isPriority = false }) => {
    const [items, setItems] = useState(initialItems || []);
    const [subtitle, setSubtitle] = useState(null);
    const [loading, setLoading] = useState(!initialItems);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (initialItems) {
            setItems(initialItems);
            setLoading(false);
            return;
        }

        let alive = true;

        const fetchData = async () => {
            setLoading(true);
            setError(false);

            try {
                // Unique key for IndexedDB (Mood-Aware)
                const cacheKey = `genre-row-${endpoint}-${cacheContext}-v2`;

                // Fetcher wrapper
                const fetcher = async () => {
                    const controller = new AbortController();
                    const id = setTimeout(() => controller.abort(), 15000); // 15s timeout
                    try {
                        const res = await fetch(endpoint, {
                            cache: "no-store",
                            signal: controller.signal
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return await res.json();
                    } finally {
                        clearTimeout(id);
                    }
                };

                let data;

                if (disableCache) {
                    console.log(`[GenreRow:${title}] 🚫 Cache DISABLED. Fetching fresh.`);
                    data = await fetcher();
                } else {
                    // Use robust browser cache with retries
                    data = await browserCacheFetch(cacheKey, fetcher, 300, {
                        retries: 2,
                        retryDelay: 1000,
                        staleWhileRevalidate: true
                    });
                }

                if (!data) throw new Error("No data received");

                console.log(`[GenreRow:${title}] LOADED →`, data?.length || 0, "items");
                const list = normalizeList(data);

                if (alive) {
                    if (list.length > 0) setItems(list);
                    if (data.context) setSubtitle(data.context);
                }
            } catch (err) {
                console.error(`❌ GenreRow fetch failed (${title})`, err);
                if (alive) {
                    if (items.length === 0) setError(true);
                }
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchData();

        return () => {
            alive = false;
        };
    }, [endpoint, title, initialItems, disableCache, cacheContext]);

    const router = useRouter();

    const getPoster = (item) => {
        if (item?.poster_path)
            return `https://image.tmdb.org/t/p/w300${item.poster_path}`;
        if (item?.backdrop_path)
            return `https://image.tmdb.org/t/p/w300${item.backdrop_path}`;
        if (item?.profile_path)
            return `https://image.tmdb.org/t/p/w500${item.profile_path}`;
        return "/default-placeholder.webp";
    };

    const getLabel = (item, index) => {
        const isIndian = item?.origin_country?.includes("IN");
        const type = item?.media_type;
        const release = new Date(
            item?.date || item?.first_air_date || item?.release_date
        );

        if (isNaN(release)) return "Recommended";

        const diff =
            (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);

        if (diff <= 7) return type === "movie" ? "New Release" : "New Episode";
        if (diff <= 30) {
            if (index < 3) return "Trending Now";
            if (isIndian) return "Buzzing in India";
            return "Rising";
        }
        if (diff <= 180) return isIndian ? "Popular" : "Top Rated";
        return "Classic";
    };

    const skeletonItems = Array.from({ length: 6 });

    // ❌ hide row only if finished loading AND nothing valid
    if (!loading && !error && items.length === 0) return null;

    return (
        <div className="flex flex-col mb-8 relative z-10 w-full">
            <div className="flex items-end gap-3 mb-3">
                <h2 className="text-lg flex font-bold bg-linear-to-l from-neutral-50 via-neutral-100 to-neutral-300 text-transparent bg-clip-text">
                    {subtitle || title}
                    <ChevronRight className="text-neutral-500 my-auto ml-1 w-5 h-5" />
                </h2>
            </div>

            <div className="relative group/row w-full">
                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-black via-black/80 to-transparent pointer-events-none z-20" />

                <div
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    <AnimatePresence mode="popLayout">
                        {loading
                            ? skeletonItems.map((_, idx) => (
                                <div
                                    key={idx}
                                    className="flex-none snap-center w-[112px] xl:w-[144px]"
                                >
                                    <div className="h-[160px] xl:h-[224px] rounded-lg bg-neutral-800/50 animate-pulse" />
                                    <div className="mt-2 h-3 w-20 bg-neutral-800/50 rounded animate-pulse" />
                                </div>
                            ))
                            : items.slice(0, 10).map((item, idx) => {
                                const type = item?.media_type || (item?.title ? "movie" : "tv");
                                return (
                                    <motion.div
                                        key={item.id ?? idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-none cursor-pointer snap-start"
                                        onClick={() => {
                                            if (item?.id && type) {
                                                router.push(`/${type}/${item.id}`);
                                            }
                                        }}
                                    >
                                        <div className="relative w-28 h-40 xl:w-36 xl:h-56 rounded-lg overflow-hidden group">
                                            <Image
                                                src={getPoster(item)}
                                                alt={item?.title || item?.name || "Poster"}
                                                fill
                                                className="object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300"
                                                sizes="(max-width:768px) 112px, 144px"
                                                quality={70}
                                                priority={isPriority && idx < 4}
                                            />
                                        </div>

                                        <p className="mt-2 text-sm font-medium line-clamp-1 w-28 xl:w-36 bg-linear-to-l from-neutral-300 via-neutral-200 to-neutral-400 text-transparent bg-clip-text">
                                            {item?.title || item?.name}
                                        </p>

                                        <p className="
                      mt-0.5 font-medium text-xs
                      bg-linear-to-r from-purple-300  via-neutral-800 to-purple-300
                      bg-size-[200%_100%] animate-[shimmer_2s_infinite]
                      text-transparent bg-clip-text
                    ">
                                            {getLabel(item, idx)}
                                        </p>
                                    </motion.div>
                                )
                            })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default GenreRow;
