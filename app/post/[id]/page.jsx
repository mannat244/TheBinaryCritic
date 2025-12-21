import { connectDB } from "@/lib/db";
import Post from "@/models/social/Post";
import PostLike from "@/models/social/PostLike";
import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PostCard from "@/components/social/PostCard";
import { notFound } from "next/navigation";
import SinglePostClient from "./SinglePostClient"; // Client wrapper for delete redirection

async function getPost(id, userId) {
    try {
        await connectDB();
        const post = await Post.findById(id).populate("authorId", "name avatar").lean();
        if (!post) return null;

        const plainPost = JSON.parse(JSON.stringify(post));

        if (userId) {
            const like = await PostLike.findOne({ postId: id, userId });
            plainPost.isLiked = !!like;
        } else {
            plainPost.isLiked = false;
        }

        return plainPost;
    } catch (e) {
        return null;
    }
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const post = await getPost(id);

    if (!post) {
        return { title: 'Post not found' };
    }

    const title = `${post.authorId?.name}`;
    const description = post.content?.substring(0, 160) || "Check out this post on The Binary Critic";
    const images = post.media && post.media.length > 0 ? [post.media[0]] : [];

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images,
            type: 'article',
        },
        twitter: {
            card: images.length > 0 ? 'summary_large_image' : 'summary',
            title,
            description,
            images,
        }
    };
}

export default async function PostPage({ params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const post = await getPost(id, session?.user?.id);

    if (!post) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 pt-24 pb-8">
                <SinglePostClient post={post} />
            </main>
        </div>
    );
}
