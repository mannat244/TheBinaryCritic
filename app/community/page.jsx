import Navbar from "@/components/Navbar";
import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import CommunityMember from "@/models/social/CommunityMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CommunityGrid from "@/components/social/CommunityGrid";
import { GradientBackground } from "@/components/ui/gradient-background";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

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

async function AsyncCommunityList() {
  const session = await getServerSession(authOptions);
  const communities = await getCommunities();
  const joinedIds = await getUserJoinedIds(session?.user?.id);

  return (
    <CommunityGrid
      communities={JSON.parse(JSON.stringify(communities))}
      initialJoinedIds={joinedIds}
    />
  );
}

function CommunitySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-64 md:h-72 lg:h-80 w-full bg-zinc-900/50 rounded-lg overflow-hidden relative border border-zinc-800">
          <div className="absolute top-4 right-4">
            <Skeleton className="h-6 w-16 bg-zinc-700/50 rounded-full" />
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <Skeleton className="h-8 w-3/4 bg-zinc-800/50 mb-2" />
            <Skeleton className="h-4 w-1/2 bg-zinc-800/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityPage() {
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

        <main className="max-w-7xl mx-auto px-4 pt-24 sm:px-6 lg:px-8 pb-24 md:pb-16">
          <div className="mb-14 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Circle</span>
            </h1>
            <p className="text-neutral-400 max-w-3xl text-lg md:text-xl leading-relaxed">
              From Cinema to Series, K-Dramas to Anime — dive into the discussions that matter.
              Join the tribes that share your obsession.
            </p>
          </div>

          <Suspense fallback={<CommunitySkeleton />}>
            <AsyncCommunityList />
          </Suspense>

        </main>
      </div>
    </div>
  );
}
