import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/*
We store ONLY the last mood + timestamp.
It is temporary intent, not a preference.
*/

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mood } = await req.json();

    if (!mood) {
      return NextResponse.json({ error: "Mood is required" }, { status: 400 });
    }

    await connectDB();

    await User.findByIdAndUpdate(
      session.user.id,
      {
        currentMood: {
          value: mood,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mood save failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ mood: null });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("currentMood");

    // Expire mood after 6 hours
    if (
      user?.currentMood?.updatedAt &&
      Date.now() - new Date(user.currentMood.updatedAt).getTime() >
      2 * 60 * 60 * 1000
    ) {
      return NextResponse.json({ mood: null });
    }

    return NextResponse.json({ mood: user?.currentMood?.value || null });
  } catch (err) {
    console.error("Mood fetch failed:", err);
    return NextResponse.json({ mood: null });
  }
}
