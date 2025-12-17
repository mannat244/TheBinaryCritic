import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Comment from "@/models/social/Comment";
import Post from "@/models/social/Post";
import CommentLike from "@/models/social/CommentLike";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req) {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const authorId = searchParams.get("authorId"); // Optional: list by author?

    // The user mainly asked for post-comments.
    if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const comments = await Comment.find({ postId })
        .sort({ createdAt: 1 })
        .populate("authorId", "name avatar")
        .lean();

    if (!userId) return NextResponse.json(comments);

    const commentIds = comments.map(c => c._id);
    const likes = await CommentLike.find({
        userId,
        commentId: { $in: commentIds }
    }).lean();

    const likedSet = new Set(likes.map(l => l.commentId.toString()));

    return NextResponse.json(
        comments.map(c => ({
            ...c,
            liked: likedSet.has(c._id.toString())
        }))
    );
}

export async function POST(req) {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { postId, content, parentCommentId } = await req.json();

        if (!postId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const comment = await Comment.create({
            postId,
            authorId: session.user.id,
            content,
            parentCommentId: parentCommentId || null
        });

        await Post.updateOne(
            { _id: postId },
            { $inc: { commentsCount: 1 } }
        );

        return NextResponse.json(comment);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.authorId.toString() !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await Comment.deleteOne({ _id: commentId });

        await Post.updateOne(
            { _id: comment.postId },
            { $inc: { commentsCount: -1 } }
        );

        return NextResponse.json({ deleted: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
