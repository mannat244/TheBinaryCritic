import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import Community from "@/models/social/Community";
import Post from "@/models/social/Post";
import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Feed from "@/components/social/Feed";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getCommunity(slugOrId) {
    try {
        await connectDB();

        let community = await Community.findOne({ slug: slugOrId }).lean();

        // Fallback: If not found by slug, and it looks like an ID, try finding by ID
        if (!community && mongoose.isValidObjectId(slugOrId)) {
            community = await Community.findById(slugOrId).lean();
        }

        return community;
    } catch (e) {
        console.error("getCommunity error:", e);
        return null;
    }
}

import PostLike from "@/models/social/PostLike";

async function getPosts(communityId, userId = null) {
    await connectDB();
    const posts = await Post.find({ communityId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("authorId", "name avatar")
        .lean();

    const plainPosts = JSON.parse(JSON.stringify(posts));

    if (!userId) {
        return plainPosts.map(p => ({ ...p, isLiked: false }));
    }

    const postIds = plainPosts.map(p => p._id);
    const likes = await PostLike.find({
        userId,
        postId: { $in: postIds }
    }).lean();

    const likedSet = new Set(likes.map(l => l.postId.toString()));

    return plainPosts.map(post => ({
        ...post,
        isLiked: likedSet.has(post._id)
    }));
}

export default async function CommunityFeedPage({ params }) {
    const { slug } = await params;
    console.log("CommunityFeedPage params:", { slug }); // DEBUG

    const session = await getServerSession(authOptions);
    const community = await getCommunity(slug);

    console.log("Community Lookup Result:", community ? community.name : "Not Found"); // DEBUG

    if (!community) {
        return notFound();
    }

    const posts = await getPosts(community._id, session?.user?.id);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Banner Section */}
            {/* Banner Section - Ambience Only */}
            <div className="relative h-40 md:h-52 w-full overflow-hidden">
                {community.image ? (
                    <Image
                        src={community.image}
                        alt={community.name}
                        fill
                        className="object-cover opacity-30 blur-3xl scale-110 saturate-150"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-900 to-purple-800 opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-end p-4 max-w-7xl mx-auto">
                    <Link href="/community" className="inline-flex items-center text-zinc-400 hover:text-white mb-auto pt-2 transition-colors text-xs">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Communities
                    </Link>

                    <div className="flex flex-col relative md:-top-10 md:flex-row md:items-end justify-between gap-3">
                        <div>
                            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none">{community.name}</h1>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                            <Users className="w-4 h-4" />
                            <span className="text-zinc-300">{community.membersCount.toLocaleString()}</span>
                            <span>members</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">

                <div className="grid grid-cols-1 gap-8">
                    {/* Feed Column */}
                    <div>
                        <Feed initialPosts={posts} communityId={community._id.toString()} />
                    </div>
                </div>
            </main>
        </div>
    );
}
