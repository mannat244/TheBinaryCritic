"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import CommentsDrawer from "./CommentsDrawer"; // Import the new Drawer

import { useRouter } from "next/navigation";

export default function PostCard({ post, onDelete, defaultOpenComments = false, disableCommentDrawer = false }) {
    const { data: session } = useSession();
    const router = useRouter();
    // Default values to prevent errors if post data is partial
    const [liked, setLiked] = useState(post.isLiked || false);
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Comments State using Drawer
    const [isDrawerOpen, setIsDrawerOpen] = useState(defaultOpenComments);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);

    // Safe accessor for nested user
    const authorName = post.authorId?.name || "Unknown User";
    const authorAvatar = post.authorId?.image || post.authorId?.avatar;
    const isAuthor = session?.user?.id === post.authorId?._id;

    const handleCardClick = (e) => {
        // Only navigate if we're not selecting text
        if (window.getSelection()?.toString()) return;
        router.push(`/post/${post._id}`);
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!session) {
            toast.error("Please sign in to like posts");
            return;
        }
        if (isLiking) return;

        // Optimistic Update
        const previousLiked = liked;
        const previousCount = likesCount;

        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
        setIsLiking(true);

        try {
            const res = await fetch("/api/post/like", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: post._id }),
            });

            if (!res.ok) {
                throw new Error("Failed to like post");
            }
        } catch (error) {
            // Revert on error
            setLiked(previousLiked);
            setLikesCount(previousCount);
            toast.error("Failed to update like");
        } finally {
            setIsLiking(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/post?id=${post._id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Post deleted");
                setIsDeleteConfirmOpen(false);
                onDelete?.(post._id);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete post");
            }
        } catch (error) {
            toast.error("Error deleting post");
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmDelete = (e) => {
        e.stopPropagation();
        setIsDeleteConfirmOpen(true);
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/post/${post._id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    const handleDrawerOpen = (e) => {
        e.stopPropagation();
        setIsDrawerOpen(true);
    };

    return (
        <>
            <Card
                onClick={handleCardClick}
                className="bg-zinc-900 border-none p-0 mb-4 hover:bg-zinc-900/80 transition-all duration-200 overflow-hidden group cursor-pointer"
            >
                <div className="p-4 sm:p-5 flex gap-4">
                    <Avatar className="w-10 h-10  shrink-0">
                        <AvatarImage src={authorAvatar} alt={authorName} />
                        <AvatarFallback>{authorName[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                            <div className="flex flex-col">
                                <span className="font-semibold text-zinc-100 text-sm">{authorName}</span>
                                <span className="text-xs text-zinc-500">
                                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                </span>
                            </div>

                            {isAuthor && (
                                <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-32 p-0 bg-zinc-950 border-zinc-800" align="end">
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-500/10 h-9 rounded-none text-xs"
                                            onClick={confirmDelete}
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="w-3 h-3 mr-2" />
                                            Delete Post
                                        </Button>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        {post.content && (
                            <p className="text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap mb-3 break-words">
                                {post.content}
                            </p>
                        )}

                        {post.media && post.media.length > 0 && (
                            <div className="flex overflow-x-auto gap-2 pb-2 mb-2 snap-x">
                                {post.media.map((url, idx) => (
                                    <img
                                        key={idx}
                                        src={url}
                                        alt="Post media"
                                        className="rounded-lg max-h-[400px] w-auto object-cover snap-start border border-zinc-800/50"
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-6 mt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLike}
                                className={`h-9 px-3 rounded-full gap-2 group/action transition-all ${liked
                                    ? "text-red-500 bg-red-500/10"
                                    : "text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                    }`}
                            >
                                <div className={`p-1.5 rounded-full transition-colors ${liked ? "bg-pink-500/20" : "group-hover/action:bg-pink-500/20"
                                    }`}>
                                    <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                                </div>
                                <span className="text-xs font-medium">
                                    {likesCount}
                                </span>
                            </Button>

                            {!disableCommentDrawer && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDrawerOpen}
                                    className="h-9 px-3 text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-full gap-2 group/action transition-all"
                                >
                                    <div className="p-1.5 rounded-full group-hover/action:bg-violet-500/20 transition-colors">
                                        <MessageCircle className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-medium">
                                        {commentsCount || 0}
                                    </span>
                                </Button>
                            )}

                            {disableCommentDrawer && (
                                <div className="flex items-center gap-2 h-9 px-3 text-zinc-500">
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">
                                        {commentsCount || 0}
                                    </span>
                                </div>
                            )}

                            <div className="flex-1" />

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleShare}
                                className="h-9 px-3 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full gap-2 transition-all"
                            >
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>



            {!disableCommentDrawer && (
                <CommentsDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    postId={post._id}
                    initialCommentsCount={commentsCount}
                    onCommentAdded={() => setCommentsCount(prev => prev + 1)}
                />
            )
            }

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-100">Delete Post?</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            This action cannot be undone. This will permanently delete your post and remove the data from our servers.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-900"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white gap-2"
                        >
                            {isDeleting ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
