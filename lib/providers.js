export async function geocodeAddress(address){
  if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error("Missing GOOGLE_MAPS_API_KEY");
  const url=new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address",address); url.searchParams.set("key",process.env.GOOGLE_MAPS_API_KEY);
  const res=await fetch(url,{cache:"no-store"}); if(!res.ok) throw new Error("Geocoding request failed");
  const data=await res.json(); const r=data.results?.[0]; if(!r) throw new Error("Address not found");
  const loc=r.geometry.location; const comps=r.address_components||[];
  const zipcode=comps.find(c=>c.types?.includes("postal_code"))?.long_name;
  const county=comps.find(c=>c.types?.includes("administrative_area_level_2"))?.long_name;
  return { lat:loc.lat, lng:loc.lng, formatted:r.formatted_address, zipcode, county };
}
export async function fetchSubjectFromEstated(address){
  const key=process.env.ESTATED_API_KEY; if(!key) return null;
  const url=new URL("https://api.estated.com/property/v5");
  url.searchParams.set("token",key); url.searchParams.set("address",address);
  const res=await fetch(url,{cache:"no-store"}); if(!res.ok) return null;
  const data=await res.json(); const p=data?.data; if(!p) return null;
  return { sqft:p?.structure?.total_area||p?.building_size?.living_area, lotSqft:p?.lot?.lot_size||p?.lot_size?.lot_size_sq_ft, yearBuilt:p?.structure?.year_built||p?.year_built };
}
export async function fetchSchoolRating(lat,lng){
  const id=process.env.SCHOOLDIGGER_APP_ID, key=process.env.SCHOOLDIGGER_APP_KEY; if(!id||!key) return undefined;
  const url=new URL("https://api.schooldigger.com/v2.0/schools");
  url.searchParams.set("st","WA"); url.searchParams.set("nearLatitude",String(lat));
  url.searchParams.set("nearLongitude",String(lng)); url.searchParams.set("radiusMiles","3");
  url.searchParams.set("appID",id); url.searchParams.set("appKey",key);
  const res=await fetch(url,{cache:"no-store"}); if(!res.ok) return undefined;
  const data=await res.json(); const first=data?.schoolList?.[0]; const rating=first?.rankHistory?.[0]?.rankScore;
  if(!rating) return undefined; let n=rating; if(rating<=5) n=(rating/5)*10; else if(rating<=100) n=(rating/100)*10; return Math.round(n);
}
export async function fetchCompsATTOM(lat,lng,sqft){
  const key=process.env.ATTOM_API_KEY; if(!key) return [];
  const url=new URL("https://api.gateway.attomdata.com/propertyapi/v1.0.0/sales/snapshot");
  url.searchParams.set("latitude",String(lat)); url.searchParams.set("longitude",String(lng)); url.searchParams.set("radius","1");
  if(sqft){ url.searchParams.set("minbuildingareasqft",String(Math.floor(sqft*0.85))); url.searchParams.set("maxbuildingareasqft",String(Math.ceil(sqft*1.15))); }
  const res=await fetch(url,{headers:{apikey:key},cache:"no-store"}); if(!res.ok) return []; const data=await res.json();
  const sales=data?.sale||data?.sales||[]; return sales.slice(0,12).map(s=>({price:+s.saleamt||0,sqft:+s.buildingareasqft||0,closingDate:s.salerecdate,distanceMiles:+s.distance||undefined})).filter(c=>c.price&&c.sqft);
}
