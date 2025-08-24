import { WA_ZIP_PPSF } from "./waPpsfBaseline.js";
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
const currency=n=>n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
const pct=n=>(n*100).toFixed(1)+"%";
export function estimateValue(input){
  const br=[],zip=input.zipcode||extractZip(input.address)||"",base=WA_ZIP_PPSF[zip]??250;
  let ppsf=base;br.push("Base price per sqft from zip "+(zip||"(unknown)")+": "+currency(base)+"/sqft");
  const compPps=(input.comps||[]).filter(c=>c.price&&c.sqft).map(c=>c.price/c.sqft);
  if(compPps.length){const med=median(compPps);ppsf=(base*0.5)+(med*0.5);br.push("Adjusted with comps median ("+currency(med)+"/sqft) → blended PPSF: "+currency(ppsf)+"/sqft")}
  const sqft=input.sqft||0;let value=ppsf*sqft;br.push("Base value: "+currency(value)+" ("+currency(ppsf)+"/sqft × "+sqft.toLocaleString()+" sqft)");
  const bedAdj=clamp((Math.max(0,(input.beds||0)-2))*0.01,0,0.03),bathAdj=clamp((Math.max(0,(input.baths||0)-1))*0.015,0,0.045);
  const bbAdj=1+bedAdj+bathAdj;value*=bbAdj;if(bedAdj||bathAdj)br.push("Bedrooms/Bathrooms adjustment: "+pct(bbAdj-1)+" ("+currency(value)+")");
  const condMap={1:0.85,2:0.93,3:1,4:1.06,5:1.12},c=input.condition||3;value*=condMap[c];br.push("Condition ("+c+"/5): ×"+condMap[c].toFixed(2)+" ("+currency(value)+")");
  if(input.yearBuilt){const age=Math.max(0,Math.min(120,new Date().getFullYear()-input.yearBuilt));let f=1-Math.min(age,80)*0.001;if(input.renovations?.kitchen||input.renovations?.bath)f+=0.03;value*=f;br.push("Age/modernization: ×"+f.toFixed(3)+" ("+currency(value)+")")}
  const reno=(input.renovations?.kitchen?0.05:0)+(input.renovations?.bath?0.04:0)+(input.renovations?.roof?0.02:0)+(input.renovations?.hvac?0.015:0)+(input.renovations?.windows?0.01:0);
  if(reno){value*=(1+reno);br.push("Renovations premium: +"+pct(reno)+" ("+currency(value)+")")}
  const vMap={none:0,city:0.03,mountain:0.04,water:0.08},v=vMap[input.view||"none"]||0;if(v){value*=(1+v);br.push("View ("+(input.view)+"): +"+pct(v)+" ("+currency(value)+")")}
  if(input.lotSqft&&sqft){const r=input.lotSqft/sqft,p=clamp(r/5-0.1,-0.05,0.10);if(p){value*=(1+p);br.push("Lot/land premium: "+(p>=0?"+":"")+pct(p)+" ("+currency(value)+")")}}
  if(input.garageSpots){const g=clamp(input.garageSpots*0.01,0,0.03);if(g){value*=(1+g);br.push("Parking (garage "+input.garageSpots+"): +"+pct(g)+" ("+currency(value)+")")}}
  if(input.schoolRating){const s=clamp((input.schoolRating-5)*0.01,-0.04,0.05);if(s){value*=(1+s);br.push("School quality: "+(s>0?"+":"")+pct(s)+" ("+currency(value)+")")}}
  const tMap={declining:-0.02,flat:0,rising:0.02},t=tMap[input.marketTrend||"flat"];if(t){value*=(1+t);br.push("Local trend: "+(t>0?"+":"")+pct(t)+" ("+currency(value)+")")}
  const fields=[input.address,sqft,input.beds,input.baths,input.condition,input.yearBuilt,input.lotSqft].filter(Boolean).length;
  const band=Math.max(0.03,Math.min(0.10,0.08 - (fields/7)*0.03 - (compPps.length?0.02:0)));
  const low=value*(1-band),high=value*(1+band);br.push("Uncertainty band: ±"+pct(band)+" based on inputs");
  return { estimate:value, low, high, ppsfUsed:ppsf, breakdown:br, subject:{ normalizedAddress: undefined, zipcode: zip } };
}
export function extractZip(address){ const m=address?.match(/\b(\d{5})(?:-\d{4})?\b/); return m?m[1]:null; }
