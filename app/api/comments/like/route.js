import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommentLike from "@/models/social/CommentLike";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { commentId } = await req.json();
        if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

        try {
            await CommentLike.create({
                commentId,
                userId: session.user.id
            });
        } catch {
            // ignore duplicate
        }

        return NextResponse.json({ liked: true });
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
        await CommentLike.deleteOne({
            commentId,
            userId: session.user.id
        });

        return NextResponse.json({ liked: false });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
