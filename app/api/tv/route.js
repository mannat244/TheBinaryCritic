import { NextResponse } from "next/server";
import { getTvData } from "@/lib/getTvData";

export async function POST(req) {
  console.log("🟦 [API] /api/tv called");

  try {
    const body = await req.json();
    const id = body?.id;

    console.log("📥 Incoming TV ID:", id);

    const data = await getTvData(id);
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.error("💥 TV API ERROR:", err);
    const status = err.message.includes("TMDB failed") ? 502 : 500;
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: status }
    );
  }
}
