import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User_Watchlist from "@/models/User_Watchlist";
import User from "@/models/User";
import { enrichItems } from "@/lib/enrichItems";

// GET: Fetch user's watchlist
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const watchlist = await User_Watchlist.findOne({ userId: session.user.id });
    
    if (!watchlist || !watchlist.items) return NextResponse.json({ items: [] });

    const plainItems = watchlist.items.map(i => i.toObject());
    const enrichedItems = await enrichItems(plainItems);

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add item to watchlist
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tmdbId, mediaType } = await req.json();
    if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

    await connectDB();
    
    let watchlist = await User_Watchlist.findOne({ userId: session.user.id });

    if (!watchlist) {
      // Create new watchlist if not exists
      watchlist = await User_Watchlist.create({
        userId: session.user.id,
        items: [{ tmdbId, mediaType: mediaType || "movie" }]
      });

      // Link to User
      await User.findByIdAndUpdate(session.user.id, { watchlistId: watchlist._id });
    } else {
      // Check if already exists
      const exists = watchlist.items.some(i => i.tmdbId === tmdbId && i.mediaType === (mediaType || "movie"));
      if (exists) return NextResponse.json({ message: "Already in watchlist", items: watchlist.items });

      watchlist.items.push({ tmdbId, mediaType: mediaType || "movie" });
      await watchlist.save();
    }

    return NextResponse.json({ success: true, items: watchlist.items });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove item from watchlist
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tmdbId, mediaType } = await req.json();

    await connectDB();
    const watchlist = await User_Watchlist.findOne({ userId: session.user.id });

    if (watchlist) {
      watchlist.items = watchlist.items.filter(i => !(i.tmdbId === tmdbId && i.mediaType === (mediaType || "movie")));
      await watchlist.save();
    }

    return NextResponse.json({ success: true, items: watchlist ? watchlist.items : [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
