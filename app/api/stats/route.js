import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

const EMPTY_STATS = {
  totalReviews: 0,
  verdictCounts: {
    masterpiece: 0,
    worth_it: 0,
    it_depends: 0,
    skip_it: 0,
  },
  advancedStats: {
    pacing: { on_point: 0, inconsistent: 0, slow: 0 },
    story: { gripping: 0, solid: 0, predictable: 0, weak: 0 },
    performances: { standout: 0, convincing: 0, mixed: 0, unconvincing: 0 },
  },
  familyFriendlyCount: 0,
};

import Review from "@/models/Review";

async function recalculateStats(mediaId, mediaType) {
  const reviews = await Review.find({ mediaId, mediaType }).lean();

  const newStats = {
    totalReviews: reviews.length,
    verdictCounts: { masterpiece: 0, worth_it: 0, it_depends: 0, skip_it: 0 },
    advancedStats: {
      pacing: { on_point: 0, inconsistent: 0, slow: 0 },
      story: { gripping: 0, solid: 0, predictable: 0, weak: 0 },
      performances: { standout: 0, convincing: 0, mixed: 0, unconvincing: 0 },
    },
    familyFriendlyCount: 0,
  };

  reviews.forEach(r => {
    // Verdict
    if (newStats.verdictCounts[r.verdict] !== undefined) {
      newStats.verdictCounts[r.verdict]++;
    }

    // Family Friendly
    if (r.isFamilyFriendly) newStats.familyFriendlyCount++;

    // Advanced
    if (r.advanced) {
      if (r.advanced.pacing && newStats.advancedStats.pacing[r.advanced.pacing] !== undefined) {
        newStats.advancedStats.pacing[r.advanced.pacing]++;
      }
      if (r.advanced.story && newStats.advancedStats.story[r.advanced.story] !== undefined) {
        newStats.advancedStats.story[r.advanced.story]++;
      }
      if (r.advanced.performances && newStats.advancedStats.performances[r.advanced.performances] !== undefined) {
        newStats.advancedStats.performances[r.advanced.performances]++;
      }
    }
  });

  return newStats;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("mediaId");
  const mediaType = searchParams.get("mediaType");

  if (!mediaId || !mediaType) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  await connectDB();

  const Model = mediaType === "movie" ? MovieCache : TvCache;
  const idField = mediaType === "movie" ? "movieId" : "tvId";

  let doc = await Model.findOne({ [idField]: mediaId }).select("stats");

  // Get Actual Count for verification
  const actualCount = await Review.countDocuments({ mediaId, mediaType });
  const cachedCount = doc?.stats?.totalReviews || 0;

  // 🔥 Self-Healing: If cache is out of sync, recalculate
  if (!doc?.stats || actualCount !== cachedCount) {
    console.log(`[Stats] Cache mismatch for ${mediaType}:${mediaId} (Cached: ${cachedCount}, Actual: ${actualCount}). Recalculating...`);

    const freshStats = await recalculateStats(mediaId, mediaType);

    await Model.findOneAndUpdate(
      { [idField]: mediaId },
      { $set: { stats: freshStats } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ stats: freshStats });
  }

  return NextResponse.json({ stats: doc.stats });
}
