import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 400 });
    }
    if (q.length < 3) {
      return NextResponse.json({ predictions: [] }, { status: 200 });
    }

    // Limit to Washington State results for quality
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", q);
    url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);
    url.searchParams.set("components", "country:us");
    // Bias to WA with a WA-specific string to improve relevance
    url.searchParams.set("strictbounds", "false");
    url.searchParams.set("types", "address");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Places request failed");
    const data = await res.json();

    // Filter to WA
    const preds = (data?.predictions || []).filter(p => /, WA\b/.test(p.description || ""));
    return NextResponse.json({ predictions: preds.slice(0, 6) }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Autocomplete failed" }, { status: 400 });
  }
}
