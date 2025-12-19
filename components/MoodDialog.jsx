"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, X } from "lucide-react";

// Use same moods
const MOODS = [
    { id: "happy_light", label: "Happy", icon: "😄", color: "from-yellow-400 to-orange-400" },
    { id: "sad_melancholic", label: "Melancholic", icon: "🌧️", color: "from-blue-400 to-indigo-500" },
    { id: "adventurous_thrilled", label: "Thrilled", icon: "⚡", color: "from-red-500 to-orange-500" },
    { id: "dark_intense", label: "Dark", icon: "🌑", color: "from-gray-700 to-black" },
    { id: "chill_relaxed", label: "Chill", icon: "🍃", color: "from-green-400 to-teal-500" },
];

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

export default function MoodDialog({ onMoodChange, initialOpen = false, externalOpen = false, setExternalOpen }) {
    const [open, setOpen] = useState(initialOpen);
    const [loading, setLoading] = useState(false);

    // Sync with external trigger (Manual Open)
    useEffect(() => {
        if (externalOpen) {
            setOpen(true);
        }
    }, [externalOpen]);

    // Handle open state changes
    const handleOpenChange = (isOpen) => {
        setOpen(isOpen);
        if (!isOpen && setExternalOpen) {
            setExternalOpen(false);
        }
    };

    // Auto-open logic
    useEffect(() => {
        if (externalOpen) return;

        const lastPrompt = localStorage.getItem("tbc_last_mood_prompt");
        const now = Date.now();

        if (!lastPrompt || now - parseInt(lastPrompt) > COOLDOWN_MS) {
            setOpen(true);
            localStorage.setItem("tbc_last_mood_prompt", now.toString());
        }
    }, []);

    const handleSelect = async (moodId) => {
        if (loading) return;
        setLoading(true);

        try {
            await fetch("/api/mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: moodId }),
            });

            if (onMoodChange) onMoodChange(moodId);

            handleOpenChange(false);
            localStorage.setItem("tbc_last_mood_prompt", Date.now().toString());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md bg-black/90 border-white/10 backdrop-blur-xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        How are you feeling?
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Pick a vibe to instantly tailor your recommendations.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                    {MOODS.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => handleSelect(m.id)}
                            className={`
                              relative overflow-hidden group p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col gap-2 hover:scale-[1.02] active:scale-[0.98] outline-none focus:ring-2 ring-white/20
                            `}
                        >
                            {/* Gradient Background Effect */}
                            <div className={`absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-bl ${m.color} h-20 w-20 rounded-bl-full blur-xl pointer-events-none`} />

                            <span className="text-2xl">{m.icon}</span>
                            <span className="font-medium text-neutral-200">{m.label}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
