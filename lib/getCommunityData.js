import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import mongoose from "mongoose";

export async function getCommunityData(slugOrId) {
    if (!slugOrId) return null;

    await connectDB();

    let community = await Community.findOne({ slug: slugOrId }).lean();

    if (!community && mongoose.isValidObjectId(slugOrId)) {
        community = await Community.findById(slugOrId).lean();
    }

    return community ? JSON.parse(JSON.stringify(community)) : null;
}
