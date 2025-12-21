"use client";

import React, { useState, useEffect } from "react";
import { Eye, ListPlus, Plus, Check, Loader2, Star, Clock, Share2, Link, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  WhatsappShareButton, WhatsappIcon,
  TwitterShareButton, XIcon,
  RedditShareButton, RedditIcon,
  TelegramShareButton, TelegramIcon
} from "react-share";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useMediaStore } from "@/hooks/useMediaStore";

export default function MediaActions({ tmdbId, mediaType, title, posterPath, releaseDate, hasUserReview = false }) {
  const { data: session } = useSession();
  const {
    watched,
    watchlist,
    collections,
    interested,
    setWatched,
    setWatchlist,
    setCollections,
    setInterested,
    addWatched,
    removeWatched,
    addWatchlist,
    removeWatchlist,
    addCollectionItem,
    removeCollectionItem,
    addCollection,
    addInterested,
    removeInterested
  } = useMediaStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return "";
    return `${window.location.origin}/${mediaType}/${tmdbId}`;
  };

  const getShareTitle = () => {
    return `Check out ${title} on The Binary Critic!`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success("Link copied to clipboard!");
      setShareOpen(false);
    } catch (err) {
      console.error("Failed to copy link", err);
      toast.error("Failed to copy link");
    }
  };

  // Derived state from global store
  const isWatched = watched?.some(
    (i) => i.tmdbId === Number(tmdbId) && i.mediaType === mediaType
  );

  const isWatchlist = watchlist?.some(
    (i) => i.tmdbId === Number(tmdbId) && i.mediaType === mediaType
  );

  const isInterested = interested?.some(
    (i) => i.tmdbId === Number(tmdbId) && i.mediaType === mediaType
  );

  const isFuture = mediaType === 'movie' && releaseDate && new Date(releaseDate) > new Date();

  const selectedCollections = new Set();
  if (collections) {
    collections.forEach((col) => {
      const hasItem = col.items.some(
        (i) => i.tmdbId === Number(tmdbId) && i.mediaType === mediaType
      );
      if (hasItem) selectedCollections.add(col._id);
    });
  }

  // ---------------------------------------------------------
  // 1. INITIAL FETCH (Only if not cached)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!session) return;

    // Fetch Watched if missing
    if (!watched) {
      fetch("/api/watched")
        .then((res) => res.json())
        .then((data) => setWatched(data.items || []))
        .catch((err) => console.error("Failed to fetch watched", err));
    }

    // Fetch Watchlist if missing
    if (!watchlist) {
      fetch("/api/watchlist")
        .then((res) => res.json())
        .then((data) => setWatchlist(data.items || []))
        .catch((err) => console.error("Failed to fetch watchlist", err));
    }

    // Fetch Interested if missing
    if (!interested) {
      fetch("/api/interested")
        .then((res) => res.json())
        .then((data) => setInterested(data.items || []))
        .catch((err) => console.error("Failed to fetch interested", err));
    }
  }, [session, watched, setWatched, watchlist, setWatchlist, interested, setInterested]);

  // ---------------------------------------------------------
  // 2. FETCH COLLECTIONS (Only if missing & dialog opens)
  // ---------------------------------------------------------
  useEffect(() => {
    if (dialogOpen && session && !collections) {
      setCollectionsLoading(true);
      fetch("/api/collections")
        .then((res) => res.json())
        .then((data) => setCollections(data.collections || []))
        .catch((err) => console.error("Failed to fetch collections", err))
        .finally(() => setCollectionsLoading(false));
    }
  }, [dialogOpen, session, collections, setCollections]);

  // ---------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------

  const handleToggleWatchlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wasWatchlist = isWatchlist;

    // Optimistic Update
    if (wasWatchlist) {
      removeWatchlist(Number(tmdbId), mediaType);
      toast.info("Removed from watchlist");
    } else {
      addWatchlist({
        tmdbId: Number(tmdbId),
        mediaType,
        title,
        poster_path: posterPath,
        release_date: releaseDate
      });
      toast.success("Added to watchlist");
    }

    try {
      const method = !wasWatchlist ? "POST" : "DELETE";
      const res = await fetch("/api/watchlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: Number(tmdbId), mediaType }),
      });

      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      // Revert on error
      if (wasWatchlist) addWatchlist({ tmdbId: Number(tmdbId), mediaType });
      else removeWatchlist(Number(tmdbId), mediaType);

      console.error(err);
      toast.error("Failed to update watchlist status");
    }
  };



  const handleToggleWatched = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();

    if (hasUserReview && isWatched) {
      toast.error("You can’t unwatch a movie after reviewing it");
      return;
    }

    if (isFuture) {
      toast.error("Cannot mark unreleased movies as watched");
      return;
    }

    const wasWatched = isWatched;

    // Optimistic update
    if (wasWatched) {
      removeWatched(Number(tmdbId), mediaType);
      toast.info("Removed from watched");
    } else {
      addWatched({
        tmdbId: Number(tmdbId),
        mediaType,
        title,
        poster_path: posterPath,
        release_date: releaseDate,
      });
      toast.success("Marked as watched");
    }

    try {
      const method = !wasWatched ? "POST" : "DELETE";
      const res = await fetch("/api/watched", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: Number(tmdbId), mediaType }),
      });

      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      // revert
      if (wasWatched) addWatched({ tmdbId: Number(tmdbId), mediaType });
      else removeWatched(Number(tmdbId), mediaType);

      console.error(err);
      toast.error("Failed to update watched status");
    }
  };


  const handleToggleInterested = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const wasInterested = isInterested;

    // Optimistic Update
    if (wasInterested) {
      removeInterested(Number(tmdbId), mediaType);
      toast.info("Removed from interested");
    } else {
      addInterested({
        tmdbId: Number(tmdbId),
        mediaType,
        title,
        poster_path: posterPath,
        release_date: releaseDate
      });
      toast.success("Marked as interested");
    }

    try {
      const method = !wasInterested ? "POST" : "DELETE";
      const res = await fetch("/api/interested", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: Number(tmdbId), mediaType }),
      });

      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      // Revert on error
      if (wasInterested) addInterested({ tmdbId: Number(tmdbId), mediaType });
      else removeInterested(Number(tmdbId), mediaType);

      console.error(err);
      toast.error("Failed to update interested status");
    }
  };

  const handleToggleCollection = async (collectionId, isChecked) => {
    // Optimistic Update
    if (isChecked) {
      addCollectionItem(collectionId, {
        tmdbId: Number(tmdbId),
        mediaType,
        title,
        poster_path: posterPath,
        release_date: releaseDate
      });
      toast.success("Added to collection");
    } else {
      removeCollectionItem(collectionId, Number(tmdbId), mediaType);
      toast.info("Removed from collection");
    }

    try {
      const action = isChecked ? "add_item" : "remove_item";
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          collectionId,
          tmdbId: Number(tmdbId),
          mediaType,
        }),
      });

      if (!res.ok) throw new Error("Failed to update collection");
    } catch (err) {
      // Revert
      if (isChecked) {
        removeCollectionItem(collectionId, Number(tmdbId), mediaType);
      } else {
        addCollectionItem(collectionId, {
          tmdbId: Number(tmdbId),
          mediaType,
          title,
          poster_path: posterPath,
          release_date: releaseDate
        });
      }
      console.error(err);
      toast.error("Failed to update collection");
    }
  };

  const handleCreateCollection = async () => {
    if (!session) {
      toast.error("Please sign in to create collections", {
        action: {
          label: "Sign In",
          onClick: () => window.location.href = "/login"
        }
      });
      return;
    }
    if (!newCollectionName.trim()) return;
    setCreatingCollection(true);

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newCollectionName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCol = data.collection;

        // Add to global store
        addCollection(newCol);
        setNewCollectionName("");

        // Automatically add current item to the new collection
        await handleToggleCollection(newCol._id, true);
        toast.success(`Created collection "${newCollectionName}"`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create collection");
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleAuthCheck = (action) => {
    if (!session) {
      toast.error(`Please sign in to ${action}`, {
        action: {
          label: "Sign In",
          onClick: () => window.location.href = "/login"
        }
      });
      return false;
    }
    return true;
  };

  return (
    <div className="flex items-center gap-3">
      {/* INTERESTED TOGGLE (Only for Future Movies) */}
      {isFuture && (
        <Button
          variant={isInterested ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (handleAuthCheck("mark as interested")) handleToggleInterested();
          }}
          className={`
            gap-2 transition-all duration-300 z-50 relative
            ${isInterested
              ? "bg-yellow-500/50 hover:bg-yellow-600/60 text-white border-yellow-500"
              : "bg-black/40 border-white/20 text-neutral-300 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          {interested === null && session ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isInterested ? (
            <>
              <Star className="w-4 h-4 fill-current" />
              Interested
            </>
          ) : (
            <>
              <Star className="w-4 h-4" />
              Interested
            </>
          )}
        </Button>
      )}

      {/* WATCHED TOGGLE (Disabled/Hidden for Future Movies) */}
      {!isFuture && (
        <Button
          variant={isWatched ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (handleAuthCheck("mark as watched")) handleToggleWatched();
          }}
          className={`
            gap-2 transition-all duration-300 z-50 relative
            ${isWatched
              ? "bg-purple-600/50 hover:bg-purple-700/60 text-white border-purple-500"
              : "bg-black/40 border-white/20 text-neutral-300 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          {watched === null && session ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isWatched ? (
            <>
              <Check className="w-4 h-4" />
              Watched
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Watched
            </>
          )}
        </Button>
      )}

      {/* ADD TO COLLECTION DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (open && !handleAuthCheck("add to collection")) return;
        setDialogOpen(open);
      }}>
        <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-black/40 border-white/20 text-neutral-300 hover:bg-white/10 hover:text-white transition-all z-50 relative"
          >
            {selectedCollections.size > 0 ? (
              <Check className="w-4 h-4 text-neutral-500 animate-in zoom-in duration-300" />
            ) : (
              <ListPlus className="w-4 h-4" />
            )}
            {selectedCollections.size > 0 ? "Saved" : "Add"}
          </Button>
        </DialogTrigger>

        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save to Collection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Watchlist Toggle (Inside Dialog) */}
            <Button
              variant={isWatchlist ? "default" : "outline"}
              size="sm"
              onClick={handleToggleWatchlist}
              className={`
                w-fit justify-start gap-2 transition-all duration-300
                ${isWatchlist
                  ? "bg-purple-600/50 hover:bg-purple-700/60 text-white border-purple-500"
                  : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                }
              `}
            >
              {watchlist === null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isWatchlist ? (
                <>
                  <Check className="w-4 h-4" />
                  In Watchlist
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Add to Watchlist
                </>
              )}
            </Button>


            {/* Create New */}
            <div className="flex items-end gap-2">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="new-col" className="text-sm text-neutral-400">Create New Collection</Label>
                <Input
                  id="new-col"
                  placeholder="e.g., Weekend Binges"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white focus-visible:ring-purple-500 focus-visible:ring-1"
                />
              </div>
              <Button
                onClick={handleCreateCollection}
                disabled={creatingCollection || !newCollectionName.trim()}
                size="icon"
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
              >
                {creatingCollection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>

            <div className="h-px bg-neutral-800 my-2" />

            {/* List Collections */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {collectionsLoading || !collections ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
              ) : collections.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">No collections yet.</p>
              ) : (
                collections.map((col) => (
                  <div
                    key={col._id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-neutral-800/50 transition-colors"
                  >
                    <Checkbox
                      id={col._id}
                      checked={selectedCollections.has(col._id)}
                      onCheckedChange={(checked) => handleToggleCollection(col._id, checked)}
                      className="border-neutral-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <label
                      htmlFor={col._id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {col.name}
                      <span className="ml-2 text-xs text-neutral-500">({col.items.length} items)</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* SHARE BUTTON */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-black/40 border-white/20 text-neutral-300 hover:bg-white/10 hover:text-white transition-all z-50 relative"
          >
            <Share2 className="w-4 h-4" />

          </Button>
        </DialogTrigger>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {mediaType === 'movie' ? 'Movie' : 'TV Show'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            {/* Social Buttons */}
            <div className="flex items-center justify-center gap-4">
              <WhatsappShareButton url={getShareUrl()} title={getShareTitle()} separator=" - ">
                <WhatsappIcon size={48} round />
              </WhatsappShareButton>

              <TwitterShareButton url={getShareUrl()} title={getShareTitle()}>
                <XIcon size={48} round />
              </TwitterShareButton>

              <RedditShareButton url={getShareUrl()} title={getShareTitle()}>
                <RedditIcon size={48} round />
              </RedditShareButton>

              <TelegramShareButton url={getShareUrl()} title={getShareTitle()}>
                <TelegramIcon size={48} round />
              </TelegramShareButton>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-900 px-2 text-neutral-500">Or copy link</span>
              </div>
            </div>

            {/* Copy Link Button */}
            <Button
              onClick={copyLink}
              className="w-full bg-white text-black hover:bg-neutral-200 gap-2"
            >
              <Link className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
