import { NextResponse } from "next/server";
import { geocodeAddress, fetchSubjectFromEstated } from "../../../lib/providers.js";

export async function POST(req){
  try{
    const { address } = await req.json();
    if(!address || address.length < 8) throw new Error("Enter a valid address");
    const geo = await geocodeAddress(address);
    const subject = await fetchSubjectFromEstated(geo.formatted).catch(()=>null);
    return NextResponse.json({ geo, subject }, { status: 200 });
  }catch(err){
    return NextResponse.json({ error: err?.message || "Prefill failed" }, { status: 400 });
  }
}
