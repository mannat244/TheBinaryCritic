import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mediaId: { type: String, required: true }, // TMDB ID
  mediaType: { type: String, enum: ["movie", "tv"], required: true },
  
  verdict: { 
    type: String, 
    enum: ["masterpiece", "worth_it", "it_depends", "skip_it"], 
    required: true 
  },
  
  content: { type: String, maxlength: 1000 },
  
  // Advanced Analysis (Optional)
  advanced: {
    pacing: { type: String },
    story: { type: String },
    performances: { type: String }
  },
  
  // Calculated Score (0-100)
  score: { type: Number, min: 0, max: 100 },

  isFamilyFriendly: { type: Boolean, default: false },
  
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  
}, { timestamps: true });

// Compound index to prevent duplicate reviews for same media by same user
ReviewSchema.index({ userId: 1, mediaId: 1, mediaType: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
