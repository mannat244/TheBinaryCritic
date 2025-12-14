import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User_Collection from "@/models/User_Collection";
import User from "@/models/User";
import { enrichItems } from "@/lib/enrichItems";

// GET: List all collections OR get specific collection
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Check for 'id' query parameter
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("id");

    if (collectionId) {
      // Fetch specific collection
      const collection = await User_Collection.findOne({ _id: collectionId, userId: session.user.id });
      if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      
      const colObj = collection.toObject();
      if (colObj.items && colObj.items.length > 0) {
        colObj.items = await enrichItems(colObj.items);
      }
      
      return NextResponse.json(colObj);
    } else {
      // List all collections
      const collections = await User_Collection.find({ userId: session.user.id }).sort({ createdAt: -1 });
      
      // Enrich items and cover image
      const collectionsWithCovers = await Promise.all(collections.map(async (col) => {
        const colObj = col.toObject();
        if (colObj.items && colObj.items.length > 0) {
           // Enrich ALL items so dialogs show titles/posters
           colObj.items = await enrichItems(colObj.items);

           // Get the last item added for cover image
           const lastItem = colObj.items[colObj.items.length - 1];
           if (lastItem) {
             colObj.coverImage = lastItem.backdrop_path || lastItem.poster_path;
           }
        }
        return colObj;
      }));

      return NextResponse.json({ collections: collectionsWithCovers });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Handle Create, Update (Add/Remove items), Delete
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body; 
    // action: 'create' | 'add_item' | 'remove_item' | 'delete' | 'rename'

    await connectDB();

    // ---------------------------------------------------------
    // 1. CREATE
    // ---------------------------------------------------------
    if (action === "create") {
      const { name, description } = body;
      if (!name) return NextResponse.json({ error: "Collection name required" }, { status: 400 });

      try {
        const newCollection = await User_Collection.create({
          userId: session.user.id,
          name,
          description: description || "",
          items: []
        });

        // Add reference to User model
        await User.findByIdAndUpdate(session.user.id, { 
          $push: { collectionsIds: newCollection._id } 
        });

        return NextResponse.json({ success: true, collection: newCollection });
      } catch (err) {
        if (err.code === 11000) {
          return NextResponse.json({ error: "A collection with this name already exists" }, { status: 400 });
        }
        throw err;
      }
    }

    // ---------------------------------------------------------
    // 2. DELETE
    // ---------------------------------------------------------
    if (action === "delete") {
      const { collectionId } = body;
      if (!collectionId) return NextResponse.json({ error: "Collection ID required" }, { status: 400 });

      const collection = await User_Collection.findOneAndDelete({ _id: collectionId, userId: session.user.id });
      if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

      // Remove reference from User model
      await User.findByIdAndUpdate(session.user.id, { 
        $pull: { collectionsIds: collectionId } 
      });

      return NextResponse.json({ success: true, message: "Collection deleted" });
    }

    // ---------------------------------------------------------
    // 3. ADD ITEM
    // ---------------------------------------------------------
    if (action === "add_item") {
      const { collectionId, tmdbId, mediaType } = body;
      if (!collectionId || !tmdbId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      const collection = await User_Collection.findOne({ _id: collectionId, userId: session.user.id });
      if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

      const exists = collection.items.some(i => i.tmdbId === tmdbId && i.mediaType === (mediaType || "movie"));
      if (!exists) {
        collection.items.push({ tmdbId, mediaType: mediaType || "movie" });
        await collection.save();
      }

      return NextResponse.json({ success: true, collection });
    }

    // ---------------------------------------------------------
    // 4. REMOVE ITEM
    // ---------------------------------------------------------
    if (action === "remove_item") {
      const { collectionId, tmdbId, mediaType } = body;
      if (!collectionId || !tmdbId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      const collection = await User_Collection.findOne({ _id: collectionId, userId: session.user.id });
      if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

      collection.items = collection.items.filter(i => !(i.tmdbId === tmdbId && i.mediaType === (mediaType || "movie")));
      await collection.save();

      return NextResponse.json({ success: true, collection });
    }

    // ---------------------------------------------------------
    // 5. RENAME / UPDATE DETAILS
    // ---------------------------------------------------------
    if (action === "update_details") {
      const { collectionId, name, description } = body;
      if (!collectionId) return NextResponse.json({ error: "Collection ID required" }, { status: 400 });

      const collection = await User_Collection.findOne({ _id: collectionId, userId: session.user.id });
      if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

      if (name) collection.name = name;
      if (description !== undefined) collection.description = description;
      
      await collection.save();
      return NextResponse.json({ success: true, collection });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
