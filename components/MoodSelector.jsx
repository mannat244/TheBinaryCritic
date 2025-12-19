"use client";

import { useState, useEffect } from "react";

const MOODS = [
    { id: "happy_light", label: "Happy", icon: "😄", color: "from-yellow-400 to-orange-400" },
    { id: "sad_melancholic", label: "Melancholic", icon: "🌧️", color: "from-blue-400 to-indigo-500" },
    { id: "adventurous_thrilled", label: "Thrilled", icon: "⚡", color: "from-red-500 to-orange-500" },
    { id: "dark_intense", label: "Dark", icon: "🌑", color: "from-gray-700 to-black" },
    { id: "chill_relaxed", label: "Chill", icon: "🍃", color: "from-green-400 to-teal-500" },
];

export default function MoodSelector({ currentMood, onMoodChange }) {
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(currentMood);

    // Sync with prop if it changes externally
    useEffect(() => {
        setActive(currentMood);
    }, [currentMood]);

    const handleSelect = async (moodId) => {
        if (loading) return;
        setLoading(true);
        setActive(moodId); // optimistic update

        try {
            await fetch("/api/mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: moodId }),
            });
            // Notify parent to refresh rows
            if (onMoodChange) onMoodChange(moodId);
        } catch (err) {
            console.error("Failed to set mood", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full py-6 px-4">
            <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
                Set your Vibe
            </h3>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {MOODS.map((m) => {
                    const isActive = active === m.id;

                    return (
                        <button
                            key={m.id}
                            onClick={() => handleSelect(m.id)}
                            className={`
                relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 transform active:scale-95
                ${isActive
                                    ? "border-transparent text-white shadow-lg glow"
                                    : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                                }
              `}
                            style={{
                                background: isActive ? `linear-gradient(135deg, var(--tw-gradient-stops))` : "transparent",
                            }}
                        >
                            {/* Inject gradient colors if active */}
                            {isActive && (
                                <div className={`absolute inset-0 rounded-full opacity-100 bg-gradient-to-r ${m.color} -z-10`} />
                            )}

                            <span className="text-lg">{m.icon}</span>
                            <span className="text-sm font-medium whitespace-nowrap">{m.label}</span>

                            {isActive && loading && (
                                <div className="ml-2 w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
