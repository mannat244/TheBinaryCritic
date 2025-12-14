"use client";

import { Heart, Share2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const VERDICTS = {
  masterpiece: {
    label: "Must Watch",
    color: "text-purple-400",
    glow: "from-purple-500/40",
    bg: "bg-purple-500/10",
  },
  worth_it: {
    label: "Worth Your Time",
    color: "text-emerald-400",
    glow: "from-emerald-500/40",
    bg: "bg-emerald-500/10",
  },
  it_depends: {
    label: "One-Time Watch",
    color: "text-sky-400",
    glow: "from-sky-500/40",
    bg: "bg-sky-500/10",
  },
  skip_it: {
    label: "Skip",
    color: "text-rose-400",
    glow: "from-rose-500/40",
    bg: "bg-rose-500/10",
  },
};

export default function ReviewCardProfile({
  review,
  isLiked = false,
  onLike,
  onEdit,
  onShare,
}) {
  const movie = review.movie;
  const verdict = VERDICTS[review.verdict];

  return (
    <div className="relative max-w-3xl rounded-3xl border border-white/5 bg-neutral-950/60 backdrop-blur-md p-5 overflow-hidden">
      
      {/* ✨ Soft Glow */}
      <div
        className={cn(
          "absolute -top-24 -right-24 w-96 h-40 bg-gradient-to-bl to-transparent blur-3xl opacity-30 pointer-events-none",
          verdict?.glow
        )}
      />

      <div className="flex gap-5 relative z-10">
        
        {/* 🎬 Poster */}
        <div className="w-24 h-36 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
          <img
            src={`https://image.tmdb.org/t/p/w300${movie.poster}`}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* 📄 Content */}
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {movie.title}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {movie.year}
              </p>
            </div>

            {/* 🎯 Verdict Badge */}
            {verdict && (
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs text-center font-black uppercase tracking-wide border",
                  verdict.color,
                  verdict.bg,
                  "border-white/10"
                )}
              >
                {verdict.label}
              </div>
            )}
          </div>

          {/* Review */}
          <p className="text-sm text-neutral-300 mt-3 leading-relaxed line-clamp-3">
            {review.content || review.review}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <span className="text-[10px] text-neutral-500">
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
              })}
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onLike?.(review._id)}
                className={cn(
                  "h-8 w-8 rounded-full",
                  isLiked
                    ? "text-rose-500 bg-rose-500/10"
                    : "text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10"
                )}
              >
                <Heart className={cn(isLiked && "fill-current")} />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit?.(review)}
                className="h-8 w-8 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <Edit2 />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={onShare}
                className="h-8 w-8 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <Share2 />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
