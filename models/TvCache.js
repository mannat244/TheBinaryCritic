import mongoose from "mongoose";

const TvCacheSchema = new mongoose.Schema(
  {
    tvId: { type: String, required: true, unique: true },
    data: { type: Object, required: true },
    
    // Aggregated Stats
    stats: {
      totalReviews: { type: Number, default: 0 },
      verdictCounts: {
        masterpiece: { type: Number, default: 0 },
        worth_it: { type: Number, default: 0 },
        it_depends: { type: Number, default: 0 },
        skip_it: { type: Number, default: 0 }
      },
      advancedStats: {
        pacing: {
          on_point: { type: Number, default: 0 },
          inconsistent: { type: Number, default: 0 },
          slow: { type: Number, default: 0 }
        },
        story: {
          gripping: { type: Number, default: 0 },
          solid: { type: Number, default: 0 },
          predictable: { type: Number, default: 0 },
          weak: { type: Number, default: 0 }
        },
        performances: {
          standout: { type: Number, default: 0 },
          convincing: { type: Number, default: 0 },
          mixed: { type: Number, default: 0 },
          unconvincing: { type: Number, default: 0 }
        }
      },
      familyFriendlyCount: { type: Number, default: 0 }
    },

    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.TvCache ||
  mongoose.model("TvCache", TvCacheSchema);
