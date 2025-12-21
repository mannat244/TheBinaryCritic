export default function robots() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thebinarycritic.in";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/onboarding/"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
