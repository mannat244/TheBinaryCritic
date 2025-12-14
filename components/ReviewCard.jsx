"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, Send, Check, Flame, Eye, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const VERDICTS = [
  {
    id: "masterpiece",
    label: "Must Watch",
    icon: Flame,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500",
    activeText: "!text-purple-500",
    activeBg: "!bg-purple-500/10",
    activeBorder: "!border-purple-500",
    sliderColor: "bg-purple-500",
    glow: "from-purple-500",
    score: 100
  },
  {
    id: "worth_it",
    label: "Worth Your Time",
    icon: Check,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500",
    activeText: "!text-emerald-500",
    activeBg: "!bg-emerald-500/10",
    activeBorder: "!border-emerald-500",
    sliderColor: "bg-emerald-500",
    glow: "from-emerald-500",
    score: 75
  },
  {
    id: "it_depends",
    label: "One-Time Watch",
    icon: Eye,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500",
    activeText: "!text-sky-500",
    activeBg: "!bg-sky-500/10",
    activeBorder: "!border-sky-500",
    sliderColor: "bg-sky-500",
    glow: "from-sky-500",
    score: 50
  },
  {
    id: "skip_it",
    label: "Skip",
    icon: XCircle,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500",
    activeText: "!text-rose-500",
    activeBg: "!bg-rose-500/10",
    activeBorder: "!border-rose-500",
    sliderColor: "bg-rose-500",
    glow: "from-rose-500",
    score: 0
  }
];

const ADVANCED_QUESTIONS = {
  pacing: {
    label: "PACING",
    question: "How did the movie flow?",
    options: [
      { id: "on_point", label: "On Point" },
      { id: "inconsistent", label: "Inconsistent" },
      { id: "slow", label: "Slow" }
    ]
  },
  story: {
    label: "STORY",
    question: "How was the narrative?",
    options: [
      { id: "gripping", label: "Gripping" },
      { id: "solid", label: "Solid" },
      { id: "predictable", label: "Predictable" },
      { id: "weak", label: "Weak" }
    ]
  },
  performances: {
    label: "PERFORMANCES",
    question: "How was the acting?",
    options: [
      { id: "standout", label: "Standout" },
      { id: "convincing", label: "Convincing" },
      { id: "mixed", label: "Mixed" },
      { id: "unconvincing", label: "Unconvincing" }
    ]
  }
};

export default function ReviewCard({ onSubmit, isSubmitting, user, initialData = null }) {
  const [verdict, setVerdict] = useState(initialData?.verdict ? VERDICTS.find(v => v.id === initialData.verdict) : null);
  const [review, setReview] = useState(initialData?.content || "");
  const [isAdvanced, setIsAdvanced] = useState(!!initialData?.advanced);
  const [advancedMetrics, setAdvancedMetrics] = useState(initialData?.advanced || {
    pacing: null,
    story: null,
    performances: null
  });
  const [isFamilyFriendly, setIsFamilyFriendly] = useState(initialData?.isFamilyFriendly || false);

  const handleSubmit = () => {
    if (!verdict) return;
    
    const data = {
      verdict: verdict.id,
      review,
      advanced: isAdvanced ? advancedMetrics : null,
      isFamilyFriendly,
      score: verdict.score
    };
    
    onSubmit?.(data);
  };

  return (
    <div className="bg-neutral-950/50 border border-white/5 w-full md:w-3xl rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden">
      {/* Gradient Shine */}
      {verdict && (
        <div className={cn(
            "absolute -top-24 -left-34 w-96 h-40 bg-gradient-to-bl to-transparent opacity-25 blur-3xl pointer-events-none",
            verdict.glow
        )} />
      )}

      {/* Header: Avatar Left & Verdict Right */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 shadow-inner">
                <AvatarImage src={user?.image || user?.avatar} className="object-cover" />
                <AvatarFallback className="bg-neutral-900 text-neutral-400 font-bold text-lg">
                    {user?.name?.[0] || "U"}
                </AvatarFallback>
            </Avatar>
            <div>
                <p className="text-base font-bold text-white">@{user?.name?.replace(/\s+/g, '').toLowerCase() || "tbc_user"}</p>
                <p className="text-xs text-neutral-500 font-medium">What did you think?</p>
            </div>
        </div>

        {/* Selected Verdict Display */}
        <AnimatePresence mode="wait">
            {verdict && (
                <motion.div 
                    key={verdict.id}
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className={cn("text-right")}
                >
                    <div className={cn("text-xl md:text-2xl font-black uppercase tracking-tighter italic", verdict.color)}>
                        {verdict.label}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                        Current Verdict
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Review Input Area */}
      <div className="relative group mb-8 space-y-2">
        <div className="relative w-full">
            <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Write your review here..."
                maxLength={1000}
                className="flex min-h-[120px] w-full rounded-xl border-none bg-transparent px-0 py-3 text-md ring-offset-background placeholder:text-neutral-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-white resize-none leading-relaxed"
            />
            <div className="absolute -bottom-6 right-0 text-[12px] text-neutral-600 font-mono font-medium">
                {review.length}/1000
            </div>
        </div>
      </div>

      {/* Verdict Selector - Toggle Group */}
      <div className="mb-8">
        <ToggleGroup 
            type="single" 
            value={verdict?.id} 
            onValueChange={(val) => {
                if (val) setVerdict(VERDICTS.find(v => v.id === val));
            }}
            className="grid grid-cols-2 md:flex md:flex-wrap gap-2 justify-start w-full"
        >
            {VERDICTS.map((v) => {
                const isSelected = verdict?.id === v.id;
                const Icon = v.icon;
                return (
                    <ToggleGroupItem
                        key={v.id}
                        value={v.id}
                        className={cn(
                            "flex items-center justify-center gap-2 px-2 md:px-4 py-2 !rounded-full text-xs md:text-sm font-medium transition-all duration-200 border h-auto w-full md:w-auto",
                            isSelected 
                                ? `${v.activeBg} ${v.activeBorder} ${v.activeText} shadow-[0_0_15px_rgba(0,0,0,0.3)]` 
                                : "bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                        )}
                    >
                        <Icon className={cn("w-3 h-3 md:w-4 md:h-4")} />
                        {v.label}
                    </ToggleGroupItem>
                )
            })}
        </ToggleGroup>

      </div>



      {/* Footer Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-white/5 mt-4 gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
            {/* Critic Mode Toggle */}
            <button 
                type="button"
                onClick={() => setIsAdvanced(!isAdvanced)}
                className={cn(
                    "flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors",
                    isAdvanced ? "text-white" : "text-neutral-600 hover:text-neutral-400"
                )}
            >
                <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                    isAdvanced ? "bg-white text-black" : "bg-white/5 text-neutral-500"
                )}>
                    <Sliders className="w-4 h-4" />
                </div>
                <span>Critic Mode</span>
            </button>

            {/* Family Friendly Toggle */}
            <button
                type="button"
                onClick={() => setIsFamilyFriendly(!isFamilyFriendly)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border",
                    isFamilyFriendly 
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-neutral-300"
                )}
            >
                <Users className="w-3 h-3" />
                <span>Family Friendly</span>
            </button>
        </div>

        {/* Post Button */}
        <Button 
            onClick={handleSubmit}
            disabled={!verdict || !review.trim() || isSubmitting}
            className="w-full md:w-auto rounded-xl px-8 h-12 md:h-10 text-sm font-bold bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition-all hover:scale-105 active:scale-95"
        >
            {isSubmitting ? (
                "Posting..."
            ) : (
                <>
                    Post Review
                    <Send className="w-4 h-4 ml-2" />
                </>
            )}
        </Button>
      </div>

      {/* Advanced Analysis Panel */}
      <AnimatePresence>
        {isAdvanced && (
            <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden border-t border-white/5 pt-6"
            >
                <div className="space-y-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Sliders className="w-4 h-4 text-neutral-400" />
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Critic Mode Analysis</h3>
                    </div>

                    {Object.entries(ADVANCED_QUESTIONS).map(([key, category]) => (
                        <div key={key} className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <Label className="text-white font-bold text-xs uppercase tracking-wider">{category.label}</Label>
                                <span className="text-[10px] text-neutral-500 font-medium">{category.question}</span>
                            </div>
                            
                            <div className="flex gap-2">
                                {category.options.map((option) => {
                                    const isSelected = advancedMetrics[key] === option.id;
                                    return (
                                        <button
                                            type="button"
                                            key={option.id}
                                            onClick={() => setAdvancedMetrics(prev => ({ ...prev, [key]: option.id }))}
                                            className={cn(
                                                "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all border",
                                                isSelected 
                                                    ? "bg-neutral-900 text-neutral-200 border-neutral-700 shadow-sm" 
                                                    : "bg-transparent border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
