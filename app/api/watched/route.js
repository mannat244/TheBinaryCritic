import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User_Watched from "@/models/User_Watched";
import User from "@/models/User";
import { enrichItems } from "@/lib/enrichItems";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const watched = await User_Watched.findOne({ userId: session.user.id });
    
    if (!watched || !watched.items) return NextResponse.json({ items: [] });

    // Enrich items with details from Cache
    // We convert Mongoose object to plain JS object first
    const plainItems = watched.items.map(i => i.toObject());
    const enrichedItems = await enrichItems(plainItems);

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tmdbId, mediaType, rating } = await req.json();
    if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

    await connectDB();
    
    const userId = session.user.id;
    const type = mediaType || "movie";
    const now = new Date();

    // 1. Try to update existing item (Atomic)
    const updateResult = await User_Watched.updateOne(
      { 
        userId, 
        items: { $elemMatch: { tmdbId, mediaType: type } } 
      },
      { 
        $set: { 
          "items.$.watchedAt": now,
          "items.$.rating": rating 
        } 
      }
    );

    // 2. If no item was updated, it means it's not in the list OR the document doesn't exist
    if (updateResult.matchedCount === 0) {
      // Try to push to existing document
      const pushResult = await User_Watched.findOneAndUpdate(
        { userId },
        { 
          $push: { 
            items: { 
              tmdbId, 
              mediaType: type, 
              rating, 
              watchedAt: now 
            } 
          } 
        },
        { new: true }
      );

      // 3. If push failed (document doesn't exist), create it
      if (!pushResult) {
        const newWatched = await User_Watched.create({
          userId,
          items: [{ tmdbId, mediaType: type, rating, watchedAt: now }]
        });
        
        // Link to User
        await User.findByIdAndUpdate(userId, { watchedId: newWatched._id });
        
        return NextResponse.json({ success: true, items: newWatched.items });
      }
      
      return NextResponse.json({ success: true, items: pushResult.items });
    }

    // Fetch updated items to return
    const updatedDoc = await User_Watched.findOne({ userId }).select("items");
    return NextResponse.json({ success: true, items: updatedDoc.items });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tmdbId, mediaType } = await req.json();

    await connectDB();
    const watched = await User_Watched.findOne({ userId: session.user.id });

    if (watched) {
      watched.items = watched.items.filter(i => !(i.tmdbId === tmdbId && i.mediaType === (mediaType || "movie")));
      await watched.save();
    }

    return NextResponse.json({ success: true, items: watched ? watched.items : [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
