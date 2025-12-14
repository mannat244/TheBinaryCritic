import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

    items: [
      {
        tmdbId: { type: Number, required: true },
        mediaType: { type: String, enum: ["movie", "tv"], default: "movie" },
        addedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.User_Watchlist ||
  mongoose.model("User_Watchlist", WatchlistSchema);
