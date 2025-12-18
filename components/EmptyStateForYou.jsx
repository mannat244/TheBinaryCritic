"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export default function EmptyStateForYou() {
    const router = useRouter();

    useEffect(() => {
        // Show a toast immediately when this component mounts (i.e., user has no prefs)
        toast.info("Your feed is empty!", {
            description: "We need to know your taste to recommend movies.",
            action: {
                label: "Start Onboarding",
                onClick: () => router.push("/onboarding"),
            },
            duration: 8000,
        });
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4">
            <Card className="max-w-md w-full bg-neutral-900/50 border-neutral-800 p-8 text-center backdrop-blur-sm">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center animate-pulse">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-3">
                    Your taste is unique
                </h2>

                <p className="text-neutral-400 mb-8 leading-relaxed">
                    We don't know what you like yet. Take 2 minutes to tell us your favorite genres and movies, and we'll build a personalized feed just for you.
                </p>

                <Button
                    onClick={() => router.push("/onboarding")}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Start Onboarding
                </Button>
            </Card>
        </div>
    );
}
