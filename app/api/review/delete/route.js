import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import User from "@/models/User";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { reviewId } = await req.json();

        if (!reviewId) {
            return NextResponse.json({ error: "Review ID required" }, { status: 400 });
        }

        await connectDB();

        // Find the review
        const review = await Review.findById(reviewId);

        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        // Check ownership
        // session.user.id is usually the ID string. review.userId is an ObjectId.
        if (review.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete review
        await Review.findByIdAndDelete(reviewId);

        // Optional: Decrement user stats
        await User.findByIdAndUpdate(session.user.id, {
            $inc: { "stats.reviewsCount": -1 }
        });

        return NextResponse.json({ success: true, message: "Review deleted" });

    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
