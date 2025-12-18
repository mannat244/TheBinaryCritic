import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

import {
  mapQ1ToRegionLanguage,
  mapQ2,
  Q3_GENRE_MAP,
  mapQ4,
  mapQ5
} from "@/lib/MapperFuncs";

import { userVectorToText } from "@/lib/embedText";

// 🔥 Pinecone (Integrated Embedding)
import { pc } from "@/lib/pinecone";

const pineconeIndex = pc.index("tbc");

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  try {
    await connectDB();

    const body = await request.json();
    console.log("📥 Received Onboarding Data:", body);

    const {
      q1,
      q2,
      q2UserLanguages,
      q3,
      q4,
      q5
    } = body;

    // ---------------------------------------------------------
    // Q1 → Regions + Languages
    // ---------------------------------------------------------
    const q1Result = mapQ1ToRegionLanguage(q1);

    // ---------------------------------------------------------
    // Q2 → Dub / Sub logic
    // ---------------------------------------------------------
    const q2Result = mapQ2(q2, q2UserLanguages || []);

    // ---------------------------------------------------------
    // Q3 → Genre IDs
    // ---------------------------------------------------------
    const q3Genres = [...new Set(q3.flatMap(opt => Q3_GENRE_MAP[opt] || []))];

    // ---------------------------------------------------------
    // Q4 → Loved Movies
    // ---------------------------------------------------------
    const q4Result = mapQ4(q4);

    // ---------------------------------------------------------
    // Q5 → Dislikes
    // ---------------------------------------------------------
    const q5Result = mapQ5(q5);

    // ---------------------------------------------------------
    // FINAL USER VECTOR (UNCHANGED)
    // ---------------------------------------------------------
    const user_vector = {
      q1: q1Result,
      q2: q2Result,
      q3_preferred_genres: q3Genres,
      q4_chosen_movies: q4Result.chosen_tmdb_movies,
      q5_avoid_genres: q5Result.avoid_genres,
      q5_avoid_keywords: q5Result.avoid_keywords,
      q5_avoid_styles: q5Result.avoid_styles
    };

    const dislike_text = q5Result.avoid_text;

    // ---------------------------------------------------------
    // Convert vector → TEXT (UNCHANGED)
    // ---------------------------------------------------------
    const preference_text = userVectorToText(user_vector, dislike_text);

    console.log("🧠 FINAL Preference Text:\n", preference_text);
    console.log("📦 Final User Vector JSON:", user_vector);

    // ---------------------------------------------------------
    // 🔥 PINECONE UPSERTS (INTEGRATED EMBEDDING)
    // ---------------------------------------------------------
    try {
      // LIKE VECTOR
      // Using upsertRecords for integrated embedding (Pinecone converts text to vector)
      // Note: "text" field must match the source field configured in your Pinecone index.
      const availableIndex = pineconeIndex;

      // Ensure we are using the correct method. index.upsertRecords might need namespace() if not on default.
      // Based on docs: await index.namespace("ns").upsertRecords([...]) or index.upsertRecords([...])

      const recordsToUpsert = [
        {
          _id: `user:${userId}:like`,
          text: preference_text, // Source text for embedding
          type: "user_like",
          userId: userId.toString(),
          preferred_genres: q3Genres.map(String), // Pinecone requires List<String>, not numbers
          regions: (q1Result?.regions || []).map(String),
          languages: (q2Result?.languages || []).map(String)
        }
      ];

      // DISLIKE VECTOR (ONLY IF PRESENT)
      if (dislike_text && dislike_text.trim().length > 0) {
        recordsToUpsert.push({
          _id: `user:${userId}:dislike`,
          text: dislike_text,
          type: "user_dislike",
          userId: userId.toString()
        });
      }

      await availableIndex.upsertRecords(recordsToUpsert);

    } catch (pineconeError) {
      console.warn("⚠️ Initial Pinecone upsert failed, retrying...", pineconeError.message);

      // Retry Logic: 3 attempts with exponential backoff
      try {
        await new Promise(res => setTimeout(res, 1000)); // Wait 1s
        await availableIndex.upsertRecords(recordsToUpsert);
      } catch (retryError1) {
        console.warn("⚠️ Retry 1 failed, retrying...", retryError1.message);
        try {
          await new Promise(res => setTimeout(res, 2000)); // Wait 2s
          await availableIndex.upsertRecords(recordsToUpsert);
        } catch (retryError2) {
          console.error("❌ All Pinecone upsert attempts failed:", retryError2);
          // ❗ Never fail onboarding because of Pinecone
        }
      }
    }

    // ---------------------------------------------------------
    // SAVE TO MONGO (100% UNCHANGED)
    // ---------------------------------------------------------
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    user.preferences = {
      user_vector,
      dislike_text,
      preference_text,
      preference_embedding: [],
      dislike_embedding: []
    };

    user.onboardingCompleted = true;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Onboarding saved",
      user_vector,
      preference_text
    });

  } catch (error) {
    console.error("❌ Onboarding Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save onboarding" },
      { status: 500 }
    );
  }
}
