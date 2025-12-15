import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "auto"; // auto, movie, tv

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    let endpoint = "/search/multi";
    if (type === "movie") endpoint = "/search/movie";
    if (type === "tv") endpoint = "/search/tv";

    // We use en-US for metadata consistency, but region=IN to boost Indian content ranking
    const url = `${TMDB_BASE_URL}${endpoint}?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&region=IN&page=1`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }

    const data = await res.json();
    let results = data.results || [];

    // Filter for 'auto' mode to only show movies and tv shows (remove people, etc.)
    if (type === "auto") {
      results = results.filter(item => item.media_type === "movie" || item.media_type === "tv");
    } else {
      // For specific modes, TMDB returns correct types, but we can ensure media_type is set for client consistency
      results = results.map(item => ({ ...item, media_type: type }));
    }

    // Basic server-side filtering to reduce payload size
    results = results.map(item => ({
      id: item.id,
      media_type: item.media_type,
      title: item.title || item.name,
      poster_path: item.poster_path,
      release_date: item.release_date || item.first_air_date,
      vote_average: item.vote_average,
      vote_count: item.vote_count,
      original_language: item.original_language,
      origin_country: item.origin_country,
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 });
  }
}
