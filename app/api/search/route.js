import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "auto";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ results: [] });
    }

    let endpoint = "/search/multi";
    if (type === "movie") endpoint = "/search/movie";
    if (type === "tv") endpoint = "/search/tv";

    const url =
      `${TMDB_BASE_URL}${endpoint}` +
      `?query=${encodeURIComponent(query)}` +
      `&include_adult=false&language=en-US&region=IN&page=1`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    // 🔥 SOFT FAIL — never throw in search
    if (!res.ok) {
      console.warn("TMDB search failed:", res.status);
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    let results = data?.results || [];

    if (type === "auto") {
      results = results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      );
    } else {
      results = results.map((item) => ({ ...item, media_type: type }));
    }

    // Reduce payload
    results = results.map((item) => ({
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

  } catch (err) {
    console.error("Search API crash:", err);
    return NextResponse.json({ results: [] });
  }
}
