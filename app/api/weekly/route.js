import { NextResponse } from "next/server";

export async function GET() {
    try {
        const tmdbToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
        if (!tmdbToken) {
            return NextResponse.json({ error: "Missing TMDB Token" }, { status: 500 });
        }

        // Fetch Trending (Week)
        const url = `https://api.themoviedb.org/3/trending/all/week?language=en-US`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${tmdbToken}`,
                Accept: 'application/json'
            },
            next: { revalidate: 3600 }
        });

        if (!res.ok) {
            throw new Error("Failed to fetch from TMDB");
        }

        const data = await res.json();

        // Filter and map
        const items = (data.results || [])
            .filter(item => item.media_type === "movie" || item.media_type === "tv") // Exclude people
            .filter(item => item.poster_path && item.backdrop_path) // High quality only
            .map(item => ({
                id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path, // Component handles full URL
                backdrop_path: item.backdrop_path,
                date: item.release_date || item.first_air_date,
                media_type: item.media_type,
                vote_average: item.vote_average
            }))
            .slice(0, 12); // Limit to 12 items

        return NextResponse.json({ data: items });
    } catch (error) {
        console.error("Weekly API Error:", error);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
