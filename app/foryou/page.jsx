"use client";

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function ForYouBlank() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
<Navbar/>
      <Card className="max-w-xl w-full bg-black border-white/10 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-purple-400" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">
          Your taste is unique
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed mb-6">
          We’re still learning what you love.  
          As you rate, review, and interact — this space will turn into
          a personalized feed just for you.
        </p>

        <div className="flex justify-center gap-3">
          <Button variant="secondary" disabled>
            For You (Coming Soon)
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Explore Movies
          </Button>
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          Powered by your reviews, not algorithms.
        </p>
      </Card>
    </div>
  );
}
