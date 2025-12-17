import Navbar from "@/components/Navbar";
import FeedSkeleton from "@/components/social/FeedSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Banner Skeleton */}
            <div className="relative h-40 md:h-52 w-full overflow-hidden bg-zinc-900/30 border-b border-zinc-800/50">
                <div className="relative z-10 h-full flex flex-col justify-end p-4 max-w-7xl mx-auto">
                    {/* Back Link Placeholder */}
                    <div className="mb-auto pt-2 flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 text-zinc-800" />
                        <Skeleton className="h-3 w-32 bg-zinc-800/50" />
                    </div>

                    <div className="flex flex-col relative md:-top-10 md:flex-row md:items-end justify-between gap-3">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64 bg-zinc-800/80 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full bg-zinc-800/50" />
                            <Skeleton className="h-4 w-24 bg-zinc-800/50 rounded" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                <FeedSkeleton />
            </main>
        </div>
    );
}
