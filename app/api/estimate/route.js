import { NextResponse } from "next/server";
import { estimateHome } from "../../../lib/valuation";

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body || !body.address || !body.sqft) {
      return NextResponse.json(
        { error: "address and sqft are required" },
        { status: 400 }
      );
    }

    const result = estimateHome(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
