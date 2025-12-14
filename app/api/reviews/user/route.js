import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await connectDB();

    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // 🔥 HYDRATE MOVIE DATA
    const hydrated = await Promise.all(
      reviews.map(async (review) => {
        if (review.mediaType === "movie") {
          const cached = await MovieCache.findOne({ movieId: review.mediaId });
          if (cached?.data) {
            return {
              ...review,
              movie: {
                title: cached.data.title,
                poster: cached.data.poster_path,
                year: new Date(cached.data.release_date).getFullYear()
              }
            };
          }
        }

        if (review.mediaType === "tv") {
          const cached = await TvCache.findOne({ tvId: review.mediaId });
          if (cached?.data) {
            return {
              ...review,
              movie: {
                title: cached.data.name,
                poster: cached.data.poster_path,
                year: new Date(cached.data.first_air_date).getFullYear()
              }
            };
          }
        }

        return review; // fallback (should not happen often)
      })
    );

    return NextResponse.json({ reviews: hydrated });

  } catch (err) {
    console.error("User reviews fetch failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
