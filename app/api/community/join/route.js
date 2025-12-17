import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityMember from "@/models/social/CommunityMember";
import Community from "@/models/social/Community";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { communityId } = await req.json();
    if (!communityId) return NextResponse.json({ error: "Community ID required" }, { status: 400 });

    const userId = session.user.id;

    // Check existing membership
    const existing = await CommunityMember.findOne({ communityId, userId });

    let action = "";
    if (existing) {
      // LEAVE logic
      await CommunityMember.findByIdAndDelete(existing._id);
      await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: -1 } });
      action = "left";
    } else {
      // JOIN logic
      await CommunityMember.create({ communityId, userId, role: "member" });
      await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: 1 } });
      action = "joined";
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
