"use client";

import Navbar from "@/components/Navbar";
import Feed from "@/components/social/Feed";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";

export default function CommunityFeedPage() {
    const params = useParams();
    const slug = params.slug;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!slug) return;

        fetch(`/api/community/feed?slug=${slug}`)
            .then((res) => {
                if (!res.ok) throw new Error("Not Found");
                return res.json();
            })
            .then((data) => {
                setData(data);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (error) return notFound();

    // 1. Instant Shell: Render Navbar + Banner Placeholder immediately
    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Banner Section - Optimistic UI */}
            <div className="relative h-40 md:h-52 w-full overflow-hidden bg-zinc-900">
                {/* Background Image (Fade in when loaded) */}
                {data?.community?.image ? (
                    <Image
                        src={data.community.image}
                        alt={data.community.name}
                        fill
                        className="object-cover opacity-30 blur-3xl scale-110 saturate-150 animate-in fade-in duration-700"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-900 to-purple-800 opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-end p-4 max-w-7xl mx-auto">
                    <Link href="/community" className="inline-flex items-center text-zinc-400 hover:text-white mb-auto pt-2 transition-colors text-xs">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Communities
                    </Link>

                    <div className="flex flex-col relative md:-top-10 md:flex-row md:items-end justify-between gap-3">
                        <div>
                            {loading ? (
                                <Skeleton className="h-8 w-64 bg-zinc-800 rounded-md mb-2" />
                            ) : (
                                <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none animate-in slide-in-from-bottom-2 duration-500">
                                    {data.community.name}
                                </h1>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                            <Users className="w-4 h-4" />
                            {loading ? (
                                <Skeleton className="h-4 w-20 bg-zinc-800 rounded-md" />
                            ) : (
                                <>
                                    <span className="text-zinc-300">{data.community.membersCount.toLocaleString()}</span>
                                    <span>members</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {loading ? (
                    <FeedSkeleton />
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <Feed
                            initialPosts={data.posts}
                            communityId={data.community._id}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

function FeedSkeleton() {
    return (
        <div className="space-y-6">
            {/* Create Post Skeleton */}
            <div className="h-32 w-full bg-zinc-900/50 rounded-xl border border-zinc-800 animate-pulse" />

            {/* Posts Skeleton */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 w-full bg-zinc-900/50 rounded-xl border border-zinc-800 animate-pulse relative">
                    <div className="absolute top-4 left-4 h-10 w-10 rounded-full bg-zinc-800" />
                    <div className="absolute top-4 left-16 h-4 w-32 bg-zinc-800 rounded" />
                    <div className="absolute top-20 left-4 right-4 h-4 w-3/4 bg-zinc-800 rounded" />
                    <div className="absolute top-28 left-4 right-4 h-4 w-1/2 bg-zinc-800 rounded" />
                </div>
            ))}
        </div>
    );
}
