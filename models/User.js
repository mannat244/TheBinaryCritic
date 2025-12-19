import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // Basic identity
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },   // null if Google login
    provider: { type: String, default: "credentials" }, // "google" | "credentials"

    // Profile
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },

    // Role
    isAdmin: { type: Boolean, default: false },

    // Preferences
    favoriteGenres: { type: [String], default: [] },
    favoriteLanguages: { type: [String], default: [] },

    // Statistics (for dashboard)
    stats: {
      reviewsCount: { type: Number, default: 0 },
      watchedCount: { type: Number, default: 0 },
      likedCount: { type: Number, default: 0 },
      listsCount: { type: Number, default: 0 },
    },

    onboardingCompleted: { type: Boolean, default: false },

    preferences: {
      user_vector: { type: Object, default: {} },
      dislike_text: { type: String, default: "" },
      preference_text: { type: String, default: "" },  // ⭐ ADDED THIS
      preference_embedding: { type: [Number], default: [] },
      dislike_embedding: { type: [Number], default: [] },
    },

    // Reference to Pinecone Vector (embedding)
    embeddingId: { type: String }, // can be user._id for simplicity

    watchlistId: { type: mongoose.Schema.Types.ObjectId, ref: "User_Watchlist", default: null },

    collectionsIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User_Collection", default: [] }],

    watchedId: { type: mongoose.Schema.Types.ObjectId, ref: "User_Watched", default: null },

    // Mood (Transient)
    currentMood: {
      value: { type: String, default: null },
      updatedAt: { type: Date, default: null },
    },

    // Timestamps
  },
  { timestamps: true }
);

// Prevent model recompilation
export default mongoose.models.User || mongoose.model("User", UserSchema);
