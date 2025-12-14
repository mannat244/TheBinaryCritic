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

  // 🔥 auto-fix if missing
  if (!doc?.stats) {
    await Model.updateOne(
      { [idField]: mediaId },
      { $set: { stats: EMPTY_STATS } }
    );
    doc = { stats: EMPTY_STATS };
  }

  return NextResponse.json({ stats: doc.stats });
}
