import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get("mediaId");
    const mediaType = searchParams.get("mediaType");
    const sort = searchParams.get("sort") || "recent";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: "Missing mediaId or mediaType" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    await connectDB();

    let authorReview = null;
    const matchQuery = { mediaId, mediaType };

    // 1. Handle Author Review Logic
    if (currentUserId) {
        // Always exclude author from the main pagination query to prevent duplicates
        matchQuery.userId = { $ne: new mongoose.Types.ObjectId(currentUserId) };

        // Only fetch author review explicitly on the first page
        if (page === 1) {
            authorReview = await Review.findOne({ 
                mediaId, 
                mediaType, 
                userId: currentUserId 
            })
            .populate("userId", "name avatar")
            .lean();
        }
    }

    // 2. Build Aggregation Pipeline for Main Reviews
    const pipeline = [
        { $match: matchQuery },
        { 
            $addFields: { 
                likesCount: { $size: { $ifNull: ["$likes", []] } } 
            } 
        }
    ];

    // 3. Sorting
    if (sort === "liked") {
        // Sort by likes count descending, then newness
        pipeline.push({ $sort: { likesCount: -1, createdAt: -1 } });
    } else {
        // Default: Recent first
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    // 4. Pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // 5. Lookup User Details (Populate equivalent)
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        { $unwind: "$userId" }, // Flatten the array
        {
            $project: {
                // Exclude sensitive user data
                "userId.password": 0,
                "userId.email": 0,
                "userId.createdAt": 0,
                "userId.updatedAt": 0,
                "userId.stats": 0,
                // Keep everything else (review fields + public user fields)
            }
        }
    );

    const reviews = await Review.aggregate(pipeline);

    // 6. Combine Author Review + Paginated Results
    let finalReviews = reviews;
    if (authorReview) {
        // Prepend author review to the start of the list
        finalReviews = [authorReview, ...reviews];
    }

    // 7. Get Total Count
    const totalCount = await Review.countDocuments({ mediaId, mediaType });

    return NextResponse.json({ reviews: finalReviews, totalCount });
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
