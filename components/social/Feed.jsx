"use client";

import { useState } from "react";
import CreatePost from "@/components/social/CreatePost";
import PostCard from "@/components/social/PostCard";

export default function Feed({ initialPosts, communityId }) {
    const [posts, setPosts] = useState(initialPosts);

    const handlePostSuccess = (newPost) => {
        // Optimistically add the new post to the top of the feed
        setPosts((prev) => [newPost, ...prev]);
    };

    const handleDeletePost = (postId) => {
        setPosts((prev) => prev.filter(p => p._id !== postId));
    };

    return (
        <div>
            <CreatePost communityId={communityId} onSuccess={handlePostSuccess} />

            <div className="space-y-4">
                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                        <p className="text-zinc-500 text-lg">No posts yet. Be the first to start the conversation!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostCard key={post._id} post={post} onDelete={() => handleDeletePost(post._id)} />
                    ))
                )}
            </div>
        </div>
    );
}
