"use client";

import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function CommunityBlank() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Navbar/>
      <Card className="max-w-xl w-full bg-black border-white/10 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-7 h-7 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">
          Community is warming up
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed mb-6">
          Reviews, discussions, and shared taste live here.  
          Once people start posting, this becomes the heart of TBC.
        </p>

        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => window.location.href = "/movie"}>
            Explore Reviews
          </Button>
          <Button variant="outline" disabled>
            Community (Soon)
          </Button>
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          No noise. Only real opinions.
        </p>
      </Card>
    </div>
  );
}
