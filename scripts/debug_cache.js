require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Define specific schemas locally to avoid import issues
const MovieCacheSchema = new mongoose.Schema({
    movieId: String,
    data: Object
});
const TvCacheSchema = new mongoose.Schema({
    tvId: String,
    data: Object
});
const UserSchema = new mongoose.Schema({
    email: String
});
const ReviewSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    verdict: String,
    mediaId: String,
    mediaType: String
}); // No strict option to allow flexibility

// Models
const MovieCache = mongoose.models.MovieCache || mongoose.model("MovieCache", MovieCacheSchema);
const TvCache = mongoose.models.TvCache || mongoose.model("TvCache", TvCacheSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

async function run() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("No MONGODB_URI");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const user = await User.findOne({ email: { $regex: 'mannat', $options: 'i' } });
        if (!user) {
            console.log("User not found");
            process.exit(0);
        }

        const reviews = await Review.find({
            userId: user._id,
            verdict: { $in: ["masterpiece", "worth_it"] }
        }).sort({ createdAt: -1 }).limit(3).lean();

        console.log(`Found ${reviews.length} reviews.`);

        for (const r of reviews) {
            console.log(`\nReview: ${r.mediaType} ${r.mediaId} (${r.verdict})`);

            let cache;
            if (r.mediaType === 'movie') {
                cache = await MovieCache.findOne({ movieId: r.mediaId }).lean();
            } else {
                cache = await TvCache.findOne({ tvId: r.mediaId }).lean();
            }

            if (!cache) {
                console.log("  ❌ Cache NOT found in DB!");
            } else {
                console.log("  ✅ Cache found.");
                // Check title/name
                const data = cache.data || {};
                console.log(`  data.title: "${data.title}"`);
                console.log(`  data.name: "${data.name}"`);
                console.log(`  data.original_title: "${data.original_title}"`);

                if (!data.title && !data.name) {
                    console.log("  🚨 CRITICAL: No title/name in cache data!");
                    console.log("  Full keys:", Object.keys(data));
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
