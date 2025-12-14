import mongoose from "mongoose";

const InterestedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    items: [
      {
        tmdbId: { type: Number, required: true },
        mediaType: { type: String, enum: ["movie"], default: "movie" },
        addedAt: { type: Date, default: Date.now },
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.User_Interested ||
  mongoose.model("User_Interested", InterestedSchema);
