import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import CommunityMember from "@/models/social/CommunityMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { communityId } = await req.json();

  const res = await CommunityMember.deleteOne({
    communityId,
    userId: session.user.id
  });

  if (res.deletedCount) {
    await Community.updateOne(
      { _id: communityId },
      { $inc: { membersCount: -1 } }
    );
  }

  return NextResponse.json({ joined: false });
}
