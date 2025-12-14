import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User_Interested from "@/models/User_Interested";
import MovieCache from "@/models/MovieCache";
import { enrichItems } from "@/lib/enrichItems";

export async function GET(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userInterested = await User_Interested.findOne({ userId: session.user.id });
    
    if (!userInterested || !userInterested.items) return NextResponse.json({ items: [] });

    const plainItems = userInterested.items.map(i => i.toObject());
    const enrichedItems = await enrichItems(plainItems);

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    console.error("Error fetching interested list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tmdbId, mediaType } = await req.json();

    if (mediaType !== "movie") {
      return NextResponse.json({ error: "Only movies can be marked as interested" }, { status: 400 });
    }

    // 1. Add to User_Interested
    const userInterested = await User_Interested.findOneAndUpdate(
      { userId: session.user.id },
      { 
        $addToSet: { items: { tmdbId, mediaType } } 
      },
      { upsert: true, new: true }
    );

    // 2. Increment interestCount in MovieCache
    // We try to update if it exists. If it doesn't exist, we might not want to create a full cache entry 
    // just for the count, but if we want to sort by it, we need it.
    // For now, let's update only if it exists or create a minimal entry.
    // Actually, MovieCache requires 'data'. If we don't have data, we can't create it easily without fetching TMDB.
    // So we will only update if exists.
    
    await MovieCache.findOneAndUpdate(
      { movieId: tmdbId.toString() },
      { $inc: { interestCount: 1 } }
    );

    return NextResponse.json({ success: true, items: userInterested.items });
  } catch (error) {
    console.error("Error adding to interested list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tmdbId, mediaType } = await req.json();

    // 1. Remove from User_Interested
    const userInterested = await User_Interested.findOneAndUpdate(
      { userId: session.user.id },
      { $pull: { items: { tmdbId, mediaType } } },
      { new: true }
    );

    // 2. Decrement interestCount in MovieCache
    await MovieCache.findOneAndUpdate(
      { movieId: tmdbId.toString() },
      { $inc: { interestCount: -1 } }
    );

    return NextResponse.json({ success: true, items: userInterested ? userInterested.items : [] });
  } catch (error) {
    console.error("Error removing from interested list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
