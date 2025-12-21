import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import Post from "@/models/social/Post";
import Review from "@/models/Review";

export default async function sitemap() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thebinarycritic.in";

    await connectDB();

    // Static routes
    const routes = ["", "/community", "/foryou", "/login", "/signup"].map(
        (route) => ({
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: route === "" ? 1 : 0.8,
        })
    );

    // Dynamic Communities
    let communityRoutes = [];
    try {
        const communities = await Community.find({}, "slug updatedAt").lean();
        communityRoutes = communities.map((community) => ({
            url: `${baseUrl}/community/${community.slug}`,
            lastModified: community.updatedAt || new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
        }));
    } catch (error) {
        console.error("Sitemap: Failed to fetch communities", error);
    }

    // Dynamic Posts
    let postRoutes = [];
    try {
        const posts = await Post.find({}, "_id updatedAt").lean();
        postRoutes = posts.map((post) => ({
            url: `${baseUrl}/post/${post._id}`,
            lastModified: post.updatedAt || new Date(),
            changeFrequency: "weekly",
            priority: 0.6,
        }));
    } catch (error) {
        console.error("Sitemap: Failed to fetch posts", error);
    }

    // Dynamic Media (Movies/TV) from Reviews
    // We only include media that has been reviewed to keep the sitemap relevant and manageable
    let mediaRoutes = [];
    try {
        const reviewedMedia = await Review.aggregate([
            {
                $group: {
                    _id: { mediaId: "$mediaId", mediaType: "$mediaType" },
                    lastReviewDate: { $max: "$updatedAt" },
                },
            },
        ]);

        mediaRoutes = reviewedMedia.map((item) => ({
            url: `${baseUrl}/${item._id.mediaType}/${item._id.mediaId}`,
            lastModified: item.lastReviewDate || new Date(),
            changeFrequency: "weekly",
            priority: 0.6,
        }));
    } catch (error) {
        console.error("Sitemap: Failed to fetch reviewed media", error);
    }

    return [...routes, ...communityRoutes, ...postRoutes, ...mediaRoutes];
}
