import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// --- Schemas (Minimal) ---
const ReviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaId: { type: String, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    verdict: { type: String },
    score: { type: Number },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    image: String,
    preferences: Object
});

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function run() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("❌ No MONGODB_URI found.");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ DB Connected");

        // 1. Find User
        const user = await User.findOne({ email: { $regex: 'mannat', $options: 'i' } });
        if (!user) {
            console.log("❌ User not found");
            process.exit(0);
        }
        console.log(`👤 Audit for: ${user.name} (${user.email})`);
        console.log(`   Lang Prefs: ${JSON.stringify(user.preferences?.favoriteLanguages || [])}`);

        // 2. Simulate API Logic (Get Anchors)
        console.log(`\n🔍 Step 1: Fetching Anchors (Masterpiece/Worth It)...`);
        const reviews = await Review.find({
            userId: user._id,
            verdict: { $in: ["masterpiece", "worth_it"] }
        })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        if (reviews.length === 0) {
            console.log("   ⚠️ No qualifying reviews found.");
            process.exit(0);
        }

        const anchors = reviews.slice(0, 2);
        console.log(`   ✅ Found ${anchors.length} anchors from ${reviews.length} candidates.`);

        // 3. Process Each Anchor
        for (const r of anchors) {
            console.log(`\n--------------------------------------------------`);
            console.log(`🎬 ANCHOR: [${r.mediaType.toUpperCase()}] ID: ${r.mediaId}`);
            console.log(`   Verdict: ${r.verdict}`);
            console.log(`   Date Reviewed: ${r.createdAt}`);

            if (!process.env.TMDB_API_READ_ACCESS_TOKEN) {
                console.log("   ⚠️ Missing TMDB Token, cannot verify details.");
                continue;
            }

            // Fetch Anchor Details
            const anchorUrl = `https://api.themoviedb.org/3/${r.mediaType}/${r.mediaId}`;
            const anchorRes = await fetch(anchorUrl, {
                headers: { Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}` }
            });
            const anchorData = await anchorRes.json();

            if (!anchorRes.ok) {
                console.log(`   ❌ TMDB Error fetching anchor: ${anchorData.status_message}`);
                continue;
            }

            console.log(`   Title: "${anchorData.title || anchorData.name}"`);
            console.log(`   Original Lang: ${anchorData.original_language}`);
            console.log(`   Genres: ${anchorData.genres?.map(g => g.name).join(", ")}`);

            // Fetch Recommendations
            console.log(`\n   📡 Calling TMDB Recommendations...`);
            const recUrl = `https://api.themoviedb.org/3/${r.mediaType}/${r.mediaId}/recommendations`;
            const recRes = await fetch(recUrl, {
                headers: { Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}` }
            });
            const recData = await recRes.json();

            console.log(`   📥 Received ${recData.results?.length || 0} raw items`);

            if (recData.results?.length > 0) {
                console.log(`   🧐 Inspecting Top 5 Matches:`);
                recData.results.slice(0, 5).forEach((rec, i) => {
                    console.log(`   [${i + 1}] "${rec.title || rec.name}"`);
                    console.log(`       Lang: ${rec.original_language} | Pop: ${rec.popularity.toFixed(1)} | Vote: ${rec.vote_average}`);
                });
            }
        }

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

run();
