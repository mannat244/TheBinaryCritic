import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import Post from "@/models/social/Post";
import CommunityMember from "@/models/social/CommunityMember";
import PostLike from "@/models/social/PostLike";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const slugOrId = searchParams.get("slug");

        if (!slugOrId) {
            return NextResponse.json({ error: "Missing slug or id" }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        // 1. Fetch Community
        let community = await Community.findOne({ slug: slugOrId }).lean();

        // Fallback to ID search
        if (!community && mongoose.isValidObjectId(slugOrId)) {
            community = await Community.findById(slugOrId).lean();
        }

        if (!community) {
            return NextResponse.json({ error: "Community not found" }, { status: 404 });
        }

        // 2. Fetch User Status (Joined?)
        let isJoined = false;
        let userRole = null;
        if (userId) {
            const membership = await CommunityMember.findOne({
                communityId: community._id,
                userId
            }).lean();
            if (membership) {
                isJoined = true;
                userRole = membership.role;
            }
        }

        // 3. Fetch Posts (Top 20)
        const posts = await Post.find({ communityId: community._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate("authorId", "name avatar")
            .lean();

        // 4. Fetch User Likes (if logged in)
        const postsWithLikes = posts.map(p => ({
            ...p,
            _id: p._id.toString(),
            communityId: p.communityId.toString(),
            authorId: p.authorId ? {
                ...p.authorId,
                _id: p.authorId._id.toString()
            } : null,
            createdAt: p.createdAt.toISOString(),
            isLiked: false // Default
        }));

        if (userId && posts.length > 0) {
            const postIds = posts.map(p => p._id);
            const likes = await PostLike.find({
                userId,
                postId: { $in: postIds }
            }).lean();

            const likedSet = new Set(likes.map(l => l.postId.toString()));
            postsWithLikes.forEach(p => {
                if (likedSet.has(p._id)) p.isLiked = true;
            });
        }

        return NextResponse.json({
            community: {
                ...community,
                _id: community._id.toString(),
                createdAt: community.createdAt?.toISOString(),
                updatedAt: community.updatedAt?.toISOString()
            },
            isJoined,
            userRole,
            posts: postsWithLikes
        });

    } catch (error) {
        console.error("Community Feed API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
