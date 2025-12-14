"use client";

import HotTrending from "@/components/HotTrending";
import Navbar from "@/components/Navbar";
import TBCWeeklyPicks from "@/components/TBCWeeklyPicks";
import { GradientBackground } from "@/components/ui/gradient-background";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* 🌈 Soft animated corner glow */}
      <GradientBackground
        className="
          absolute top-0 left-0
          w-[full] h-[20vh]
          opacity-15
          blur-3xl
          rounded-bl-[50%]
          pointer-events-none
          z-0
        "
      />

      {/* Content above the glow */}
      <div className="relative z-10">
        <Navbar />
        <HotTrending />
        <TBCWeeklyPicks/>
      </div>
    </div>
  );
}
