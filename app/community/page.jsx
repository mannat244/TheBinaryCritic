import Navbar from "@/components/Navbar";
import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import CommunityMember from "@/models/social/CommunityMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CommunityGrid from "@/components/social/CommunityGrid";

async function getCommunities() {
  await connectDB();
  return await Community.find({}).sort({ membersCount: -1 }).lean();
}

async function getUserJoinedIds(userId) {
  if (!userId) return [];
  await connectDB();
  const memberships = await CommunityMember.find({ userId }).select("communityId").lean();
  return memberships.map(m => m.communityId.toString());
}

import { GradientBackground } from "@/components/ui/gradient-background";

export default async function CommunityPage() {
  const session = await getServerSession(authOptions);
  const communities = await getCommunities();
  const joinedIds = await getUserJoinedIds(session?.user?.id);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* 🌈 Soft animated corner glow */}
      <GradientBackground
        className="
          absolute top-0 left-0
          w-full h-[40vh]
          opacity-20
          blur-3xl
          rounded-bl-[50%]
          pointer-events-none
          z-0
        "
      />

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 mt-14 sm:px-6 lg:px-8 py-16">
          <div className="mb-14 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Circle</span>
            </h1>
            <p className="text-neutral-400 max-w-3xl text-lg md:text-xl leading-relaxed">
              From Cinema to Series, K-Dramas to Anime — dive into the discussions that matter.
              Join the tribes that share your obsession.
            </p>
          </div>

          <CommunityGrid
            communities={JSON.parse(JSON.stringify(communities))}
            initialJoinedIds={joinedIds}
          />
        </main>
      </div>
    </div>
  );
}
