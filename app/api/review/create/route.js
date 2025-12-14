import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import User from "@/models/User";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mediaId, mediaType, verdict, review, advanced, score, isFamilyFriendly } = await req.json();

    if (!mediaId || !mediaType || !verdict) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    // 1. Find existing review to calculate stats delta
    const existingReview = await Review.findOne({ userId: session.user.id, mediaId, mediaType });

    // 2. Upsert review
    const updatedReview = await Review.findOneAndUpdate(
      { userId: session.user.id, mediaId, mediaType },
      {
        verdict,
        content: review,
        advanced,
        score,
        isFamilyFriendly
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Update User Stats
    if (!existingReview) {
        await User.findByIdAndUpdate(session.user.id, { $inc: { "stats.reviewsCount": 1 } });
    }

    // 4. Update Movie/TV Cache Stats
    const CacheModel = mediaType === "movie" ? MovieCache : TvCache;
    const cacheQuery = mediaType === "movie" ? { movieId: mediaId } : { tvId: mediaId };
    
    const incUpdate = {};

    // Helper to safely add to incUpdate
    const addInc = (field, value) => {
        if (value === 0) return;
        incUpdate[field] = (incUpdate[field] || 0) + value;
    };

    if (!existingReview) {
        // NEW REVIEW
        addInc("stats.totalReviews", 1);
        addInc(`stats.verdictCounts.${verdict}`, 1);
        if (isFamilyFriendly) addInc("stats.familyFriendlyCount", 1);
        
        if (advanced?.pacing) addInc(`stats.advancedStats.pacing.${advanced.pacing}`, 1);
        if (advanced?.story) addInc(`stats.advancedStats.story.${advanced.story}`, 1);
        if (advanced?.performances) addInc(`stats.advancedStats.performances.${advanced.performances}`, 1);

    } else {
        // UPDATED REVIEW - Calculate Deltas
        
        // Verdict
        if (existingReview.verdict !== verdict) {
            addInc(`stats.verdictCounts.${existingReview.verdict}`, -1);
            addInc(`stats.verdictCounts.${verdict}`, 1);
        }

        // Family Friendly
        if (existingReview.isFamilyFriendly !== isFamilyFriendly) {
            addInc("stats.familyFriendlyCount", isFamilyFriendly ? 1 : -1);
        }

        // Advanced Stats
        const cats = ["pacing", "story", "performances"];
        cats.forEach(cat => {
            const oldVal = existingReview.advanced?.[cat];
            const newVal = advanced?.[cat];

            if (oldVal !== newVal) {
                if (oldVal) addInc(`stats.advancedStats.${cat}.${oldVal}`, -1);
                if (newVal) addInc(`stats.advancedStats.${cat}.${newVal}`, 1);
            }
        });
    }

    if (Object.keys(incUpdate).length > 0) {
        await CacheModel.findOneAndUpdate(cacheQuery, { $inc: incUpdate });
    }

    return NextResponse.json({ success: true, review: updatedReview });

  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
