"use client";

import React, { useEffect, useState } from "react";
import { Zap, X } from "lucide-react";
import Image from "next/image";
import { browserCacheFetch } from "@/lib/browserCache";

const TopIndiaBuzz = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showStories, setShowStories] = useState(false);

    // Lock body scroll when stories are open
    useEffect(() => {
        if (showStories) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [showStories]);

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
                    3600 // 1 hour client cache (API has its own 6h cache)
                );

                console.log("🇮🇳 INDIA BUZZ JSON:", data);
                setItems(data);
            } catch (err) {
                console.error("FETCH ERROR:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBuzz();
    }, []);

    const getBackdrop = (item) => {
        if (item.backdrop_path)
            return `https://image.tmdb.org/t/p/w780${item.backdrop_path}`;
        if (item.poster_path)
            return `https://image.tmdb.org/t/p/w780${item.poster_path}`;
        return "/default-placeholder.webp";
    };

    /* ------------------------------------------
     STORY TRANSFORM LOGIC
  ------------------------------------------ */
    const getStories = () => {
        return items.map((item) => ({
            content: ({ action, isPaused }) => {
                return (
                    <div className="w-full h-full bg-black relative flex flex-col items-center justify-center">
                        {/* 1. Creative Background Blend */}
                        <div className="absolute inset-0">
                            <Image
                                src={getBackdrop(item)}
                                alt="bg"
                                fill
                                className="object-cover opacity-60 blur-xl scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40" />
                            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/60" />
                        </div>

                        {/* 2. Main Visual Composition */}
                        <div className="relative z-10 flex flex-col items-center justify-center -mt-32">
                            {/* Floating Poster with Shadow */}
                            <div className="relative w-[280px] h-[420px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden border border-white/10 transform hover:scale-105 transition-transform duration-1000">
                                <Image
                                    src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : getBackdrop(item)}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>

                        {/* 3. Centered Text Overlay */}
                        <div className="absolute bottom-[15%] left-0 right-0 px-8 z-20 text-center flex flex-col items-center gap-3">
                            <div className="flex gap-2">
                                {item.buzz_type?.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold bg-white/10 border border-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl font-black text-white leading-tight drop-shadow-xl max-w-[80%]">
                                {item.title}
                            </h1>

                            <p className="text-base text-neutral-200 leading-normal max-w-[90%] font-medium drop-shadow-md">
                                {item.subtext}
                            </p>
                        </div>
                    </div>
                );
            },
            duration: 6000,
        }));
    };

    // Import Stories dynamically to avoid SSR issues if needed, but standard import works for now if client-side.
    const Stories = require("react-insta-stories").default;

    const skeletonItems = Array.from({ length: 9 });

    return (
        <div className="flex flex-col w-full">

            {/* FULL SCREEN STORY OVERLAY */}
            {showStories && (
                <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-in fade-in duration-300">

                    {/* Close Button (X) */}
                    <button
                        onClick={() => setShowStories(false)}
                        className="absolute top-6 right-6 z-[10000] p-2 bg-black/20 hover:bg-white/20 backdrop-blur-lg rounded-full text-white transition-all transform hover:rotate-90"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="w-full h-full md:w-auto md:h-auto md:shadow-2xl md:rounded-xl overflow-hidden relative">
                        {/* Mobile Fullscreen / Desktop Modal */}
                        <Stories
                            stories={getStories()}
                            defaultInterval={5000}
                            width={window.innerWidth > 768 ? 432 : '100vw'}
                            height={window.innerWidth > 768 ? 768 : '100vh'}
                            onAllStoriesEnd={() => setShowStories(false)}
                            keyboardNavigation={true}
                            loop={false}
                        />
                    </div>
                </div>
            )}

            {/* Main content wrapper - SINGLE CARD MODE */}
            <div className="mx-5 mt-4 lg:hidden flex justify-center">
                {!loading && items.length > 0 ? (
                    <div className="
                        w-full max-w-[400px] 
                        bg-neutral-900/80 backdrop-blur-md 
                        border border-white/10 
                        rounded-xl p-4 
                        flex items-center justify-between 
                        shadow-sm
                    ">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-purple-400 fill-purple-400" />
                                India Buzz
                            </h2>
                            <p className="text-neutral-400 text-xs font-medium">
                                {items.length} Trending Stories
                            </p>
                        </div>

                        <button
                            onClick={() => setShowStories(true)}
                            className="
                                bg-purple-600 hover:bg-purple-700 
                                text-white text-xs font-bold 
                                px-4 py-2 rounded-lg 
                                transition-colors shadow-md
                                flex items-center gap-2
                            "
                        >
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            Watch
                        </button>
                    </div>
                ) : (
                    // Simple Skeleton for the single card
                    loading && (
                        <div className="w-full max-w-[400px] h-20 bg-neutral-900/50 rounded-xl animate-pulse border border-white/5" />
                    )
                )}
            </div>
        </div>
    );
};

export default TopIndiaBuzz;
