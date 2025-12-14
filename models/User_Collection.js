import mongoose from "mongoose";

const CollectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    description: { type: String, default: "" },

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

// Ensure a user cannot have two collections with the same name
CollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.User_Collection ||
  mongoose.model("User_Collection", CollectionSchema);
