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

import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import RulesDialog from "@/components/social/RulesDialog";
import { toast } from "sonner";

export default function CommunityClient({ initialCommunity }) {
    const params = useParams();
    const slug = params.slug;

    // Initialize with initialCommunity if available
    const [data, setData] = useState(initialCommunity ? { community: initialCommunity, posts: [] } : null);

    // Track membership locally
    const [isJoined, setIsJoined] = useState(false);

    // Loading is only for the Feed content if we have initialCommunity
    // If no initialCommunity, we are loading everything
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Rules Dialog
    const [showRules, setShowRules] = useState(false);

    useEffect(() => {
        if (!slug) return;

        // Fetch full feed (posts + user status)
        fetch(`/api/community/feed?slug=${slug}`)
            .then((res) => {
                if (!res.ok) throw new Error("Not Found");
                return res.json();
            })
            .then((feedData) => {
                setData(feedData);
                setIsJoined(feedData.isJoined);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [slug]);

    const handleJoin = async () => {
        try {
            const res = await fetch("/api/community/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ communityId: data.community._id }),
            });

            if (!res.ok) throw new Error("Failed to join");

            const resData = await res.json();
            if (resData.action === "joined") {
                setIsJoined(true);
                toast.success(`Welcome to ${data.community.name}!`);
                setShowRules(false);
            }
        } catch (error) {
            toast.error("Failed to join community");
        }
    };

    if (error) return notFound();

    // If purely client-side and loading, show skeleton wrapper or just nothing yet
    // But since we use initialCommunity, data is likely present for the banner part.
    if (!data && loading) return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <div className="h-52 w-full bg-zinc-900 animate-pulse" />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <FeedSkeleton />
            </main>
        </div>
    );

    if (!data) return notFound();

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Banner Section - Optimistic UI */}
            <div className="relative h-40 md:h-52 w-full overflow-hidden bg-zinc-900">
                {/* Background Image (Fade in when loaded) */}
                {data.community?.image ? (
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
                            {/* If we have data but no posts yet (loading), just show name */}
                            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none animate-in slide-in-from-bottom-2 duration-500">
                                {data.community.name}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                                <Users className="w-4 h-4" />
                                <span className="text-zinc-300">
                                    {data.community.membersCount ? data.community.membersCount.toLocaleString() : "..."}
                                </span>
                                <span>members</span>
                            </div>

                            {!isJoined && (
                                <Button
                                    size="sm"
                                    className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40"
                                    onClick={() => setShowRules(true)}
                                >
                                    Join Community
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {loading ? (
                    <FeedSkeleton />
                ) : isJoined ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <Feed
                            initialPosts={data.posts}
                            communityId={data.community._id}
                        />
                    </div>
                ) : (
                    /* Restricted State */
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-zinc-800 rounded-2xl bg-zinc-900/30">
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                            <Lock className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Members Only Content</h2>
                        <p className="text-zinc-400 max-w-md mb-8">
                            Join <span className="text-violet-400">{data.community.name}</span> to view posts, discussions, and exclusive content.
                        </p>
                        <Button
                            size="lg"
                            className="bg-violet-600 hover:bg-violet-500"
                            onClick={() => setShowRules(true)}
                        >
                            Read Rules & Join
                        </Button>
                    </div>
                )}
            </main>

            <RulesDialog
                open={showRules}
                onOpenChange={setShowRules}
                onConfirm={handleJoin}
                communityName={data.community.name}
            />
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
