import { NextResponse } from "next/server";
import { getMovieData } from "@/lib/getMovieData";

export async function POST(req) {
  console.log("🟦 [API] /api/movie called");

  try {
    const body = await req.json();
    const id = body?.id;

    console.log("📥 Incoming movie ID:", id);

    const data = await getMovieData(id);
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.error("💥 MOVIE API ERROR:", err);
    const status = err.message.includes("TMDB failed") ? 502 : 500;
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: status }
    );
  }
}
