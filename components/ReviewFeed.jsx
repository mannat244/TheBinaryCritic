"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Flame, Check, Eye, XCircle, Users, Sliders, Edit2, ChevronDown, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { toPng } from 'html-to-image';
import { Montserrat } from "next/font/google";
import ReviewCard from "./ReviewCard";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ReviewCardProfile from "./ReviewCardProfile";

const VERDICTS = [
  {
    id: "masterpiece",
    label: "Must Watch",
    icon: Flame,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500",
    glow: "from-purple-500",
    shareGlow: "bg-purple-500/40",
  },
  {
    id: "worth_it",
    label: "Worth Your Time",
    icon: Check,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500",
    glow: "from-emerald-500",
    shareGlow: "bg-emerald-500/40",
  },
  {
    id: "it_depends",
    label: "One-Time Watch",
    icon: Eye,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500",
    glow: "from-sky-500",
    shareGlow: "bg-sky-500/40",
  },
  {
    id: "skip_it",
    label: "Skip",
    icon: XCircle,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500",
    glow: "from-rose-500",
    shareGlow: "bg-rose-500/40",
  }
];

const ADVANCED_QUESTIONS = {
  pacing: {
    label: "PACING",
    options: {
      on_point: "On Point",
      inconsistent: "Inconsistent",
      slow: "Slow"
    }
  },
  story: {
    label: "STORY",
    options: {
      gripping: "Gripping",
      solid: "Solid",
      predictable: "Predictable",
      weak: "Weak"
    }
  },
  performances: {
    label: "PERFORMANCES",
    options: {
      standout: "Standout",
      convincing: "Convincing",
      mixed: "Mixed",
      unconvincing: "Unconvincing"
    }
  }
};

export default function ReviewFeed({
  reviews = [],
  media,
  onReviewUpdated,
  onSortChange,
  currentSort = "recent",
  currentPage = 1,
  totalPages = 1,
  variant = "feed",
  onPageChange
}) {
  const { data: session } = useSession();
  const [editingId, setEditingId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sharingReview, setSharingReview] = useState(null);
  const shareRef = useRef(null);
  const [localReviews, setLocalReviews] = useState(reviews);

  useEffect(() => {
    setLocalReviews(reviews);
  }, [reviews]);

  const currentReviews = localReviews;

  const isProfile = variant === "profile";



  const handleShare = async (review) => {
    setSharingReview(review);
    // Allow state to update and render the hidden card
    setTimeout(async () => {
      if (shareRef.current) {
        try {
          await document.fonts.ready;
          const dataUrl = await toPng(shareRef.current, { cacheBust: true });
          const link = document.createElement('a');
          link.download = `review-${review._id}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("Review image generated!");
        } catch (err) {
          console.error("Failed to generate image", err);
          toast.error("Failed to generate image");
        } finally {
          setSharingReview(null);
        }
      }
    }, 100);
  };

  const handleUpdate = async (originalReview, data) => {
    setIsUpdating(true);
    try {
      // We reuse the create endpoint because it handles upserts (updates) and stats recalculation
      const res = await fetch("/api/review/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: originalReview.mediaId,
          mediaType: originalReview.mediaType,
          ...data
        })
      });

      if (!res.ok) throw new Error("Failed to update review");

      setEditingId(null);
      if (onReviewUpdated) {    //onReviewUpdated 

      }
      else window.location.reload();

    } catch (error) {
      console.error("Failed to update review:", error);
      alert("Failed to update review");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLike = async (reviewId) => {
    if (!session) {
      toast.error("Please sign in to like reviews", {
        action: {
          label: "Sign In",
          onClick: () => (window.location.href = "/login"),
        },
      });
      return;
    }

    // 🔥 OPTIMISTIC UI UPDATE
    setLocalReviews((prev) =>
      prev.map((review) => {
        if (review._id !== reviewId) return review;

        const alreadyLiked = review.likes?.includes(session.user.id);

        return {
          ...review,
          likes: alreadyLiked
            ? review.likes.filter((id) => id !== session.user.id)
            : [...(review.likes || []), session.user.id],
        };
      })
    );

    // 🌐 BACKGROUND SYNC (no UI blocking)
    try {
      await fetch("/api/review/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
    } catch (error) {
      console.error("Like sync failed", error);
      toast.error("Something went wrong");
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <p>No reviews yet. Be the first to share your verdict!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex justify-end md:mr-52 mb-4">
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800 hover:text-white">
              {currentSort === "recent" ? "Most Recent" : "Most Liked"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-1 bg-neutral-900 border-white/10 text-neutral-300" align="end">
            <div className="flex flex-col gap-1">
              <button
                className={cn(
                  "flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-white/10 text-left transition-colors",
                  currentSort === "recent" && "text-white font-medium bg-white/10"
                )}
                onClick={() => {
                  if (onSortChange) onSortChange("recent");
                  if (onPageChange) onPageChange(1);
                }}
              >
                Most Recent
              </button>
              <button
                className={cn(
                  "flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-white/10 text-left transition-colors",
                  currentSort === "liked" && "text-white font-medium bg-white/10"
                )}
                onClick={() => {
                  if (onSortChange) onSortChange("liked");
                  if (onPageChange) onPageChange(1);
                }}
              >
                Most Liked
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {currentReviews.map((review) => {
        const verdict = VERDICTS.find(v => v.id === review.verdict);
        if (!verdict) return null;

        const isAuthor =
          session?.user?.id &&
          review.userId?._id &&
          session.user.id === review.userId._id;

        const isLiked = review.likes?.includes(session?.user?.id);

        /* =========================
           EDIT MODE
        ========================= */
        if (editingId === review._id) {
          return (
            <div key={review._id} className="relative">
              <ReviewCard
                user={session.user}
                initialData={review}
                isSubmitting={isUpdating}
                onSubmit={(data) => handleUpdate(review, data)}
              />

              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          );
        }

        /* =========================
           PROFILE VARIANT
        ========================= */
        if (isProfile) {
          return (
            <ReviewCardProfile
              key={review._id}
              review={review}
              isLiked={isLiked}
              onLike={handleLike}
              onEdit={isAuthor ? () => setEditingId(review._id) : null}
              onShare={() => handleShare(review)}
            />
          );
        }

        /* =========================
           FEED VARIANT (DEFAULT)
        ========================= */
        return (
          <div
            key={review._id}
            className="bg-neutral-950/50 border border-white/5 w-full md:w-3xl rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden"
          >
            {/* Gradient Shine */}
            <div
              className={cn(
                "absolute -top-24 -left-34 w-96 h-40 bg-gradient-to-bl to-transparent opacity-25 blur-3xl pointer-events-none",
                verdict.glow
              )}
            />

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-4">
                <Avatar className="w-10 h-10 shadow-inner">
                  <AvatarImage src={review.userId?.avatar} />
                  <AvatarFallback className="bg-neutral-900 text-neutral-400 font-bold">
                    {review.userId?.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-white">
                    @{review.userId?.name?.replace(/\s+/g, "").toLowerCase()}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {formatDistanceToNow(new Date(review.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "text-xl font-black uppercase italic",
                  verdict.color,
                  montserrat.className
                )}
              >
                {verdict.label}
              </div>
            </div>

            {/* Review Content */}
            <p className="text-neutral-300 text-sm mb-6">
              {review.content || review.review}
            </p>

            {/* Tags Row: Family Friendly & Critic Mode Stats */}
            {(review.isFamilyFriendly || review?.advanced) && (
              <div className="flex flex-wrap gap-2 mb-6">

                {/* Family Friendly Tag */}
                {review.isFamilyFriendly && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md 
                      bg-blue-500/10 border border-blue-500/20 
                      text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                    <Users className="w-3 h-3" />
                    <span>Family Friendly</span>
                  </div>
                )}

                {/* Advanced Stats Tags (SAFE) */}
                {review?.advanced &&
                  Object.entries(review.advanced)
                    .filter(([, value]) => Boolean(value))
                    .map(([key, value]) => {
                      const category = ADVANCED_QUESTIONS[key];
                      const label = category?.options?.[value];
                      if (!label) return null;

                      return (
                        <div
                          key={key}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md
                         bg-neutral-950/50 border border-neutral-800
                         text-neutral-400 text-[10px] font-bold uppercase tracking-wider"
                        >
                          <span className="text-neutral-500">{category.label}:</span>
                          <span className="text-neutral-300">{label}</span>
                        </div>
                      );
                    })}
              </div>
            )}


            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-white/5">
              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(review._id)}
                  className={cn(
                    "h-8 px-3 gap-2 rounded-full",
                    isLiked
                      ? "text-rose-500 bg-rose-500/10"
                      : "text-neutral-400 hover:text-rose-500"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  <span className="text-xs">{review.likes?.length || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShare(review)}
                  className="h-8 px-3 text-neutral-400"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs">Share</span>
                </Button>
              </div>

              {isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(review._id)}
                  className="h-8 px-3 text-neutral-500"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        );
      })}


      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1 && onPageChange) onPageChange(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        if (onPageChange) onPageChange(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages && onPageChange) onPageChange(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Hidden Share Card */}
      {sharingReview && media && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
          <div
            ref={shareRef}
            className={cn(
              "w-[600px] bg-[#0a0a0a] p-8 flex flex-col gap-6 border border-white/10 rounded-3xl overflow-hidden relative",
              montserrat.className
            )}
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Verdict Accent (Cherry on Top) */}
            {(() => {
              const verdict = VERDICTS.find(v => v.id === sharingReview.verdict);
              return verdict ? (
                <div className={cn(
                  "absolute top-1/2 right-0 w-80 h-80 -translate-y-1/2 translate-x-1/4 blur-[90px] rounded-full pointer-events-none opacity-40",
                  verdict.shareGlow
                )} />
              ) : null;
            })()}

            {/* Header: Movie Info */}
            <div className="flex gap-6 items-center relative z-10">
              <div className="w-24 h-36 shrink-0 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                  alt={media.title || media.name}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight mb-1">
                  {media.title || media.name}
                </h2>
                <p className="text-neutral-400 text-lg">
                  {new Date(media.release_date || media.first_air_date).getFullYear()}
                </p>
              </div>
            </div>

            {/* Review Card Content */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center">
                    {sharingReview.userId?.avatar ? (
                      <img
                        src={sharingReview.userId?.avatar}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span className="text-white font-bold text-xs">
                        {sharingReview.userId?.name?.[0] || "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-bold">@{sharingReview.userId?.name}</p>
                    <p className="text-neutral-500 text-xs">The Binary Critic Review</p>
                  </div>
                </div>
                {(() => {
                  const verdict = VERDICTS.find(v => v.id === sharingReview.verdict);
                  return verdict ? (
                    <div className={cn(
                      "text-lg font-black uppercase italic",
                      verdict.color,
                      montserrat.className
                    )}>
                      {verdict.label}
                    </div>
                  ) : null;
                })()}
              </div>
              <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                {sharingReview.content || sharingReview.review}
              </p>

              {/* Advanced Tags (Share Card) */}
              {(sharingReview.isFamilyFriendly || sharingReview?.advanced) && (
                <div className="mt-4 flex flex-wrap gap-2">

                  {/* Family Friendly */}
                  {sharingReview.isFamilyFriendly && (
                    <div className="flex items-center gap-1.5 px-2 py-1 
                      rounded-md bg-blue-500/10 border border-blue-500/20
                      text-blue-400 text-[9px] font-semibold uppercase tracking-wide">
                      <Users className="w-3 h-3" />
                      <span>Family Friendly</span>
                    </div>
                  )}

                  {/* Advanced Critic Tags */}
                  {sharingReview?.advanced &&
                    Object.entries(sharingReview.advanced)
                      .filter(([, value]) => Boolean(value))
                      .map(([key, value]) => {
                        const category = ADVANCED_QUESTIONS[key];
                        const label = category?.options?.[value];
                        if (!label) return null;

                        return (
                          <div
                            key={key}
                            className="px-2 py-1 rounded-md 
                         bg-white/5 border border-white/10
                         text-neutral-300 text-[9px] font-semibold uppercase tracking-wide"
                          >
                            <span className="text-neutral-500">{category.label}:</span>{" "}
                            <span>{label}</span>
                          </div>
                        );
                      })}
                </div>
              )}

            </div>



            {/* Branding Footer */}
            <div className="text-center mt-2 relative z-10">
              <p className={cn("text-xs text-neutral-500 uppercase tracking-[0.2em] mb-1", montserrat.className)}>Read more on</p>
              <h3 className={cn("text-xl font-black uppercase tracking-tighter italic text-white", montserrat.className)}>
                THE BINARY CRITIC
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
