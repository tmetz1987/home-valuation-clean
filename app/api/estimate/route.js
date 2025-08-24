import { NextResponse } from "next/server";
import { z } from "zod";
import { estimateValue } from "../../../lib/valuation.js";
import { geocodeAddress, fetchSubjectFromEstated, fetchSchoolRating, fetchCompsATTOM } from "../../../lib/providers.js";

const InputSchema = z.object({
  address: z.string().min(8),
  sqft: z.number().int().positive().optional(),
  beds: z.number().int().min(0).max(10).optional(),
  baths: z.number().int().min(0).max(10).optional(),
  lotSqft: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  condition: z.number().int().min(1).max(5).optional(),
  renovations: z.object({ kitchen: z.boolean().optional(), bath: z.boolean().optional(), roof: z.boolean().optional(), hvac: z.boolean().optional(), windows: z.boolean().optional() }).optional(),
  view: z.enum(["none","city","mountain","water"]).optional(),
  garageSpots: z.number().int().min(0).max(6).optional(),
  schoolRating: z.number().int().min(1).max(10).optional(),
  marketTrend: z.enum(["declining","flat","rising"]).optional(),
  comps: z.array(z.object({ price: z.number().positive(), sqft: z.number().positive() })).optional()
});

export async function POST(req){
  try{
    const parsed = InputSchema.parse(await req.json());
    const geo = await geocodeAddress(parsed.address);
    let { sqft, lotSqft, yearBuilt } = parsed;
    const subject = await fetchSubjectFromEstated(geo.formatted).catch(()=>null);
    sqft = sqft || subject?.sqft; lotSqft = lotSqft || subject?.lotSqft; yearBuilt = yearBuilt || subject?.yearBuilt;
    let schoolRating = parsed.schoolRating; if (!schoolRating){ schoolRating = await fetchSchoolRating(geo.lat, geo.lng); }
    let comps = parsed.comps || []; if (comps.length === 0){ comps = await fetchCompsATTOM(geo.lat, geo.lng, sqft); }
    const result = estimateValue({ ...parsed, address: geo.formatted, sqft: sqft || 0, lotSqft, yearBuilt, schoolRating, comps, zipcode: geo.zipcode });
    result.subject = { normalizedAddress: geo.formatted, zipcode: geo.zipcode, county: geo.county, lat: geo.lat, lng: geo.lng, filledSqft: sqft };
    return NextResponse.json(result, { status: 200 });
  }catch(err){
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 400 });
  }
}
