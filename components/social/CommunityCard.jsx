"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link"; // Add import link

import { useRouter } from "next/navigation";

export default function CommunityCard({ community, isJoined: initialJoined }) {
    const router = useRouter();
    const [isJoined, setIsJoined] = useState(initialJoined);
    const [memberCount, setMemberCount] = useState(community.membersCount || 0);
    const [loading, setLoading] = useState(false);

    const handleCardClick = (e) => {
        // Allow text selection
        if (window.getSelection()?.toString()) return;
        router.push(`/community/${community.slug}`);
    };

    const handleToggle = async (e) => {
        e.stopPropagation();
        if (loading) return;

        // Optimistic Update
        const previousState = isJoined;
        setIsJoined(!isJoined);
        setMemberCount(prev => isJoined ? prev - 1 : prev + 1);
        setLoading(true);

        try {
            const res = await fetch("/api/community/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ communityId: community._id }),
            });

            if (!res.ok) throw new Error("Failed to update");

            const data = await res.json();
            if (data.action === "joined") {
                toast.success(`Joined ${community.name}`);
            } else {
                toast.info(`Left ${community.name}`);
            }

        } catch (error) {
            // Revert on error
            setIsJoined(previousState);
            setMemberCount(prev => previousState ? prev + 1 : prev - 1);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            onClick={handleCardClick}
            className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-violet-500/30 transition-all duration-300 h-64 md:h-72 lg:h-80 w-full flex flex-col justify-end cursor-pointer"
        >

            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                {community.image && (
                    <Image
                        src={community.image}
                        alt={community.name}
                        fill
                        className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            </div>

            <div className="relative z-10 p-5 h-full flex flex-col justify-end">

                {/* Badge & Join Status */}
                <div className="absolute -top-1 right-4 flex gap-2">
                    {isJoined && (
                        <Badge className="bg-violet-600/90 text-white border-none shadow-lg backdrop-blur-sm">
                            <Check className="w-3 h-3 mr-1" /> Member
                        </Badge>
                    )}
                </div>


                {/* Content */}
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover/title:text-violet-400 transition-colors drop-shadow-md">
                        {community.name}
                    </h3>
                    <p className="text-xs font-bold text-violet-300 mb-2 uppercase tracking-wide drop-shadow-sm">
                        {community.subtext}
                    </p>
                    <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed text-shadow-sm">
                        {community.description}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center text-zinc-300 text-xs font-medium backdrop-blur-sm bg-black/20 px-2 py-1 rounded-full">
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        {memberCount.toLocaleString()}
                    </div>

                    <Button
                        size="sm"
                        variant={isJoined ? "secondary" : "default"}
                        onClick={handleToggle}
                        disabled={loading}
                        className={`
                    h-8 px-4 text-xs font-medium transition-all backdrop-blur-md
                    ${isJoined
                                ? "bg-black/50 text-zinc-300 hover:bg-red-900/60 hover:text-white border border-white/10"
                                : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40"
                            }
                `}
                    >
                        {loading ? "..." : isJoined ? "Leave" : "Join"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
