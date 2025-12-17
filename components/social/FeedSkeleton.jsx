import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function FeedSkeleton() {
    return (
        <div className="space-y-4">
            {/* Create Post Skeleton */}
            <Card className="bg-zinc-950 border-zinc-800/50 p-4 mb-6">
                <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-zinc-800/50" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-12 w-full rounded-2xl bg-zinc-800/30" />
                        <div className="flex justify-between items-center pt-2">
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-8 rounded bg-zinc-800/30" />
                            </div>
                            <Skeleton className="h-9 w-20 rounded-full bg-zinc-900/50" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Posts List Skeleton */}
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-zinc-950/50 border-none p-0 mb-4 overflow-hidden">
                    <div className="p-4 sm:p-5 flex gap-4">
                        {/* Avatar */}
                        <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-zinc-900/50" />

                        <div className="flex-1 space-y-3">
                            {/* Author & Time */}
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-32 bg-zinc-800/50" />
                                <Skeleton className="h-3 w-20 bg-zinc-800/30" />
                            </div>

                            {/* Content Lines */}
                            <div className="space-y-2 pt-1">
                                <Skeleton className="h-4 w-full bg-zinc-800/50" />
                                <Skeleton className="h-4 w-11/12 bg-zinc-800/50" />
                                <Skeleton className="h-4 w-4/5 bg-zinc-800/50" />
                            </div>

                            {/* Action Bar */}
                            <div className="flex gap-6 pt-2">
                                <Skeleton className="h-8 w-16 rounded-full bg-zinc-800/30" />
                                <Skeleton className="h-8 w-16 rounded-full bg-zinc-800/30" />
                                <Skeleton className="h-8 w-8 rounded-full bg-zinc-800/30 ml-auto" />
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
