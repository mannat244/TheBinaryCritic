import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/social/Post";
import PostLike from "@/models/social/PostLike";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { postId } = await req.json();
        if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

        try {
            await PostLike.create({ postId, userId: session.user.id });
            await Post.updateOne({ _id: postId }, { $inc: { likesCount: 1 } });
        } catch {
            // likely duplicate
        }
        return NextResponse.json({ liked: true });
    } catch (error) {
        console.error("POST /api/post/like error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

    try {
        const res = await PostLike.deleteOne({ postId, userId: session.user.id });

        if (res.deletedCount) {
            await Post.updateOne({ _id: postId }, { $inc: { likesCount: -1 } });
        }

        return NextResponse.json({ liked: false });
    } catch (error) {
        console.error("DELETE /api/post/like error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
