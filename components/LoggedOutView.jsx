"use client";

import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export default function LoggedOutView({
    title = "Track. Rate.",
    highlight = "Share.",
    description = "Your personal space to log movies, build lists, and connect with other film lovers."
}) {
    const router = useRouter();

    return (
        <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
            {/* Subtle Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />

            <Navbar />

            <div className="relative z-10 max-w-lg w-full px-6 text-center">
                <div className="mb-8 flex justify-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md rotate-3">
                        <Film className="w-8 h-8 text-purple-400" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
                    {title} <span className="text-purple-400">{highlight}</span>
                </h1>

                <p className="text-neutral-400 text-lg mb-10 leading-relaxed max-w-sm mx-auto">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full">
                    <Button
                        className="w-48 sm:w-auto min-w-[140px] bg-white text-black hover:bg-neutral-200 h-10 md:h-12 rounded-full font-bold tracking-wide transition-all text-sm md:text-base"
                        onClick={() => router.push('/login')}
                    >
                        Log In
                    </Button>
                    <Button
                        className="w-48 sm:w-auto min-w-[140px] bg-transparent hover:bg-white/5 text-white border border-white/20 h-10 md:h-12 rounded-full font-bold tracking-wide transition-all text-sm md:text-base"
                        onClick={() => router.push('/signup')}
                    >
                        Sign Up
                    </Button>
                </div>
            </div>
        </div>
    );
}
