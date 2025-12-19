import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(session.user.id).select("preferences currentMood").lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const preferredGenreIds = user.preferences?.user_vector?.q3_preferred_genres || [];
        const currentMood = user.currentMood?.value || null;

        // Sort by popularity priority (Logic moved from page.jsx)
        const PRIORITY_GENRES = [28, 10749, 35, 53, 12, 18, 878];

        // Deduped and sorted
        const sortedIds = [...new Set(preferredGenreIds)].sort((a, b) => {
            const idxA = PRIORITY_GENRES.indexOf(a);
            const idxB = PRIORITY_GENRES.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        }).slice(0, 4);

        return NextResponse.json({
            genres: sortedIds,
            mood: currentMood
        });

    } catch (error) {
        console.error("Preferences Fetch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
