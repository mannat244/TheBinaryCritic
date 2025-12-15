import mongoose from "mongoose";

const TrendingCacheSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true }, // e.g., "india_buzz_today"
        data: { type: Array, required: true }, // The verified JSON list of movies/shows
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.models.TrendingCache ||
    mongoose.model("TrendingCache", TrendingCacheSchema);
