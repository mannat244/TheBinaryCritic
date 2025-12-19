"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X, MessageCircle, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// Utility to build comment tree with depth and reply info optimization
const buildCommentTree = (comments) => {
    const commentMap = {};
    const roots = [];

    // First pass: create map & init arrays
    comments.forEach(comment => {
        commentMap[comment._id] = { ...comment, replies: [], depth: 0 };
    });

    // Second pass: link structure & calculate depth
    comments.forEach(comment => {
        const node = commentMap[comment._id];
        if (node.parentCommentId && commentMap[node.parentCommentId]) {
            const parent = commentMap[node.parentCommentId];
            parent.replies.push(node);
            node.replyToName = parent.authorId?.name;
        } else {
            roots.push(node);
        }
    });

    // Flattening Helper: DFS to produce flat list of descendants
    const flatten = (node, depth = 0) => {
        let list = [];
        node.depth = depth;
        if (node.replies && node.replies.length > 0) {
            node.replies.forEach(child => {
                list.push(child);
                list = list.concat(flatten(child, depth + 1));
            });
        }
        return list;
    };

    // Third pass: Flatten replies for Roots
    roots.forEach(root => {
        root.flattenedReplies = flatten(root, 0);
    });

    return roots;
};

export default function CommentsSection({ postId, onCommentAdded }) {
    const { data: session } = useSession();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // { id: string, name: string }

    // Fetch comments
    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/comments?postId=${postId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            } else {
                console.error("Failed to load comments");
            }
        } catch (e) {
            console.error("Error loading comments:", e);
            toast.error("Failed to load comments");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!session) {
            toast.error("Please sign in to comment");
            return;
        }
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const payload = {
                postId: postId,
                content: newComment.trim(),
            };
            if (replyingTo) {
                payload.parentCommentId = replyingTo.id;
            }

            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to post");

            const savedComment = await res.json();

            // Optimistically add author details
            const commentWithAuthor = {
                ...savedComment,
                authorId: {
                    _id: session.user.id,
                    name: session.user.name,
                    avatar: session.user.image || session.user.avatar,
                },
            };

            setComments((prev) => [...prev, commentWithAuthor]);
            setNewComment("");
            setReplyingTo(null);
            onCommentAdded?.();
            toast.success("Comment posted");
        } catch (e) {
            console.error("Post comment error:", e);
            toast.error("Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    const commentTree = buildCommentTree(comments);

    const CommentItem = ({ comment, isRoot = false }) => {
        const [isCollapsed, setIsCollapsed] = useState(false);
        const repliesToRender = isRoot ? comment.flattenedReplies : [];
        const hasReplies = repliesToRender && repliesToRender.length > 0;
        const showMention = comment.depth >= 2;

        return (
            <div className={`flex gap-3 text-sm ${!isRoot ? "mt-4" : "mt-4"}`}>
                {!isRoot && (
                    <CornerDownRight className="w-4 h-4 text-zinc-700 mt-2 mr-1 flex-shrink-0" />
                )}

                <Avatar className="w-8 h-8 mt-1 shrink-0">
                    <AvatarImage
                        src={comment.authorId?.avatar || comment.authorId?.image}
                    />
                    <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-400">
                        {comment.authorId?.name?.[0] || "?"}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-zinc-200 text-xs truncate">
                            {comment.authorId?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                            })}
                        </span>

                        {isRoot && hasReplies && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="ml-auto p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
                            >
                                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            </button>
                        )}
                    </div>

                    {!isCollapsed && (
                        <>
                            <p className="text-zinc-300 leading-relaxed text-[13px] break-words">
                                {showMention && comment.replyToName && (
                                    <span className="text-violet-400 font-medium mr-1">@{comment.replyToName}</span>
                                )}
                                {comment.content}
                            </p>

                            <button
                                onClick={() => setReplyingTo({ id: comment._id, name: comment.authorId?.name || "Unknown" })}
                                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
                            >
                                Reply
                            </button>

                            {isRoot && hasReplies && (
                                <div className="pl-0 border-l border-zinc-800 ml-1 mt-2">
                                    {repliesToRender.map(reply => (
                                        <CommentItem key={reply._id} comment={reply} isRoot={false} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {isRoot && isCollapsed && hasReplies && (
                        <div
                            className="bg-zinc-900/50 text-[10px] text-zinc-500 rounded px-2 py-1 mt-1 inline-block cursor-pointer hover:text-zinc-400"
                            onClick={() => setIsCollapsed(false)}
                        >
                            {repliesToRender.length} repl{repliesToRender.length > 1 ? 'ies' : 'y'} hidden
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* h-full needed when inside drawer, but fine otherwise */}
            <div className="flex-1 overflow-y-auto px-1 space-y-6">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-zinc-600"></div>
                    </div>
                ) : commentTree.length > 0 ? (
                    commentTree.map((comment) => (
                        <CommentItem key={comment._id} comment={comment} isRoot={true} />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-500 space-y-2 opacity-60">
                        <MessageCircle className="w-12 h-12 stroke-1" />
                        <p className="text-sm">No comments yet</p>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4">
                {replyingTo && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-2 text-xs">
                        <span className="text-zinc-400">Replying to <span className="text-violet-400 font-medium">@{replyingTo.name}</span></span>
                        <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>
                    </div>
                )}
                <div className="flex gap-3 items-end w-full px-4 mb-6 md:mb-4">
                    <Avatar className="w-8 h-8 ml-3 place-self-center sm:block">
                        <AvatarImage src={session?.user?.image || session?.user?.avatar} />
                        <AvatarFallback>{session?.user?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={session ? "Write a comment..." : "Sign in to comment..."}
                            disabled={!session}
                            className="min-h-[44px] max-h-32 py-3 pr-12 resize-none bg-transparent border border-zinc-800 focus:border-zinc-700 rounded-2xl text-sm"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            className="absolute right-1.5 bottom-1.5 h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-all disabled:opacity-0 disabled:scale-95"
                            onClick={handleSubmit}
                            disabled={!newComment.trim() || submitting}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
