import { NextResponse } from "next/server";

// Bias results toward Washington State without hiding others
const WA_CENTER = { lat: 47.5, lng: -120.5 };   // approx center of WA
const WA_RADIUS_METERS = 350000;                // ~350 km

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 400 });
    }
    if (q.length < 3) {
      return NextResponse.json({ predictions: [] }, { status: 200 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", q);
    url.searchParams.set("key", key);
    url.searchParams.set("types", "address");
    url.searchParams.set("components", "country:us");
    url.searchParams.set("location", `${WA_CENTER.lat},${WA_CENTER.lng}`);
    url.searchParams.set("radius", String(WA_RADIUS_METERS));
    url.searchParams.set("strictbounds", "false");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Places request failed");
    const data = await res.json();

    const preds = data?.predictions || [];
    const wa = preds.filter(p => /,\s*WA\b/i.test(p.description || ""));
    const nonWa = preds.filter(p => !/,\s*WA\b/i.test(p.description || ""));
    return NextResponse.json({ predictions: [...wa, ...nonWa].slice(0, 8) }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Autocomplete failed" }, { status: 400 });
  }
}
