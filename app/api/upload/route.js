import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("source");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const apiKey = process.env.IMGCDN_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Server misconfiguration: Missing API Key" }, { status: 500 });
        }

        // Forward to IMGCDN
        const externalFormData = new FormData();
        externalFormData.append("key", apiKey);
        externalFormData.append("source", file);
        externalFormData.append("format", "json");

        const response = await fetch("https://imgcdn.dev/api/1/upload", {
            method: "POST",
            headers: {
                Accept: "application/json",
            },
            body: externalFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("IMGCDN Error:", response.status, errorText);
            return NextResponse.json({ error: "Upload failed upstream" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Upload proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
