import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await req.json();
    if (!reviewId) {
      return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });
    }

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const isLiked = review.likes.includes(userId);

    const update = isLiked
      ? { $pull: { likes: userId } }
      : { $addToSet: { likes: userId } };

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      update,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      likes: updatedReview.likes.length,
      isLiked: !isLiked
    });
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
