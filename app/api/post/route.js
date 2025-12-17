import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/social/Post";
import Community from "@/models/social/Community";
import PostLike from "@/models/social/PostLike";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const communityId = searchParams.get("communityId");
  const id = searchParams.get("id"); // Single post ID
  const cursor = searchParams.get("cursor");

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Single Post Fetch
  if (id) {
    try {
      const post = await Post.findById(id).lean();
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

      let isLiked = false;
      if (userId) {
        const like = await PostLike.findOne({ postId: id, userId });
        isLiked = !!like;
      }

      return NextResponse.json({ ...post, liked: isLiked });
    } catch {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
  }

  const query = { communityId };
  if (cursor) query._id = { $lt: cursor };

  const posts = await Post.find(query)
    .sort({ _id: -1 })
    .limit(10)
    .populate("authorId", "name image")
    .lean();

  if (!userId) return NextResponse.json(posts);

  const likes = await PostLike.find({
    userId,
    postId: { $in: posts.map(p => p._id) }
  }).lean();

  const liked = new Set(likes.map(l => l.postId.toString()));

  return NextResponse.json(
    posts.map(p => ({
      ...p,
      liked: liked.has(p._id.toString())
    }))
  );
}

export async function DELETE(req) {
  await connectDB();

  // We can support DELETE via query param or body. Standard REST DELETE usually has no body or uses param 
  // but in Next.js App Router, `req.json()` works in DELETE too if client sends it.
  // However, query param `?id=` is safer for simple deletes.
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const post = await Post.findById(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (post.authorId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Post.deleteOne({ _id: id });

    await Community.updateOne(
      { _id: post.communityId },
      { $inc: { postsCount: -1 } }
    );

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { communityId, content, media } = await req.json();

    console.log("POST /api/post received:", { communityId, content, media }); // DEBUG

    if (!communityId || (!content && (!media || media.length === 0))) {
      console.log("Validation failed: missing communityId or content/media");
      return NextResponse.json({ error: "Post must have content or media" }, { status: 400 });
    }

    // Validate communityId format if it's not a valid objectId
    // Note: Mongoose create will fail if it's invalid, but let's see.

    const post = await Post.create({
      communityId,
      authorId: session.user.id,
      content,
      media: media || [] // array of strings
    });

    await post.populate("authorId", "name avatar");

    // Increment community post count
    await Community.updateOne(
      { _id: communityId },
      { $inc: { postsCount: 1 } }
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error("POST /api/post error:", error); // 🔥 DEBUG LOG
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
