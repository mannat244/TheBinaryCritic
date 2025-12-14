import { NextResponse } from "next/server";

export const revalidate = 21600; // 6 hours

const TMDB_URL =
  "https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1&region=IN";

export async function GET() {
  try {
    const res = await fetch(TMDB_URL, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
      },
      next: { revalidate: 21600 }, // page + fetch cache
    });

    if (!res.ok) {
      throw new Error("TMDB fetch failed");
    }

    const data = await res.json();
    console.log(data)

    const finalData = (data?.results || [])
      .slice(0, 5)
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path,
        releaseDate: movie.release_date,
      }));

    return NextResponse.json({ upcoming: finalData });
  } catch (error) {
    console.error("SIDEBAR TMDB ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load sidebar data" },
      { status: 500 }
    );
  }
}
