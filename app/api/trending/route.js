import { NextResponse } from "next/server";

// TMDB Helper with Error Handling
const TMDB = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
      },
      next: { revalidate: 300 }, // cache 5 mins on server
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("TMDB Fetch Error:", err.message);
    return null;
  }
};

export async function GET() {
  const today = new Date();
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const f = (d) => d.toISOString().split("T")[0];
  const todayStr = f(today);
  const pastStr = f(twoMonthsAgo);

  console.log("🔥 TRENDING RANGE:", pastStr, "→", todayStr);

  // -----------------------------
  // FETCH BLOCK (PARALLEL)
  // -----------------------------
  const [
    newMovies,
    newTV,
    globalTV,
    globalMovies,
  ] = await Promise.all([
    // India-origin new movies
    TMDB(
      `https://api.themoviedb.org/3/discover/movie?include_adult=true&include_video=true&language=en-US&region=IN&with_origin_country=IN&sort_by=popularity.desc&primary_release_date.gte=${pastStr}&primary_release_date.lte=${todayStr}`
    ),

    // India-origin new TV
    TMDB(
      `https://api.themoviedb.org/3/discover/tv?include_adult=false&language=en-US&region=IN&with_origin_country=IN&sort_by=popularity.desc&first_air_date.gte=${pastStr}&first_air_date.lte=${todayStr}`
    ),

    // Global fallback (TV, English only)
    TMDB(
      `https://api.themoviedb.org/3/discover/tv?include_adult=false&language=en-US&with_original_language=en&sort_by=popularity.desc&page=1`
    ),

    // Global fallback (Movies, English only)
    TMDB(
      `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&with_original_language=en&sort_by=popularity.desc&page=1`
    ),
  ]);

  // -----------------------------
  // NORMALIZE + CLEAN
  // -----------------------------
  const normalizeMovie = (m) => ({
    id: m.id,
    title: m.title || m.original_title,
    media_type: "movie",
    poster_path: m.poster_path || m.backdrop_path || null,
    date: m.release_date,
    origin_country: m.origin_country || [],
  });

  const normalizeTV = (t) => ({
    id: t.id,
    title: t.name || t.original_name,
    media_type: "tv",
    poster_path: t.poster_path || t.backdrop_path || null,
    date: t.first_air_date,
    origin_country: t.origin_country || [],
  });

  const moviesIN = (newMovies?.results || [])
    .map(normalizeMovie)
    .filter((x) => x.poster_path && x.title);

  const tvIN = (newTV?.results || [])
    .map(normalizeTV)
    .filter((x) => x.poster_path && x.title);

  // global fallback lists
  const moviesGlobal = (globalMovies?.results || [])
    .map(normalizeMovie)
    .filter((x) => x.poster_path && x.title);

  const tvGlobal = (globalTV?.results || [])
    .map(normalizeTV)
    .filter((x) => x.poster_path && x.title);

  // -----------------------------
  // SORT BY NEWEST ALWAYS
  // -----------------------------
  moviesIN.sort((a, b) => new Date(b.date) - new Date(a.date));
  tvIN.sort((a, b) => new Date(b.date) - new Date(a.date));
  moviesGlobal.sort((a, b) => new Date(b.date) - new Date(a.date));
  tvGlobal.sort((a, b) => new Date(b.date) - new Date(a.date));

  // -----------------------------
  // FINAL 6 + 6 WITH FALLBACK
  // -----------------------------
  const finalMovies = [...moviesIN, ...moviesGlobal].slice(0, 6);
  const finalTV = [...tvIN, ...tvGlobal].slice(0, 6);

  const final = [...finalMovies, ...finalTV];

  console.log("🔥 FINAL LENGTH:", final.length);
  console.log("🔥 FINAL TITLES:", final.map((x) => x.title));

  return NextResponse.json(final);
}
