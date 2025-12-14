import mongoose from "mongoose";

const WatchedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

    items: [
      {
        tmdbId: { type: Number, required: true },
        mediaType: { type: String, enum: ["movie", "tv"], default: "movie" },
        watchedAt: { type: Date, default: Date.now },
        rating: { type: Number, min: 1, max: 10, default: null }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.User_Watched ||
  mongoose.model("User_Watched", WatchedSchema);
