"use client";

import PostCard from "@/components/social/PostCard";
import CommentsSection from "@/components/social/CommentsSection";
import { useRouter } from "next/navigation";

export default function SinglePostClient({ post }) {
    const router = useRouter();

    const handleDelete = () => {
        router.push(`/community/${post.communityId}`);
    };

    return (
        <div>
            <PostCard post={post} onDelete={handleDelete} disableCommentDrawer={true} />

            <div className="mt-8 border-t border-zinc-900 pt-8">
                <h2 className="text-xl font-semibold mb-6 text-zinc-100">Comments</h2>
                <CommentsSection postId={post._id} />
            </div>
        </div>
    );
}
