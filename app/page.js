"use client";
import { useState } from "react";

function currency(n){
  return n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
}
const toInt = (s) => {
  const n = parseInt(String(s||"").replace(/[^\d]/g,""), 10);
  return Number.isFinite(n) ? n : undefined;
};
const clampInt = (s, min, max) => {
  const n = toInt(s);
  if (n === undefined) return undefined;
  return Math.max(min, Math.min(max, n));
};

export default function Page(){
  // Keep ALL inputs as strings to avoid Android keyboard closing on re-render
  const [form,setForm]=useState({
    address: "",
    beds: "3",
    baths: "2",
    sqft: "1800",
    lotSqft: "6000",
    yearBuilt: "1995",
    condition: "3",
    view: "none",
    garageSpots: "2",
    marketTrend: "flat",
    renovations: {}
  });
  const [loading,setLoading]=useState(false);
  const [res,setRes]=useState(null);
  const [err,setErr]=useState(null);

  async function onEstimate(){
    setLoading(true); setErr(null);
    try{
      // Convert strings -> numbers right before sending
      const payload = {
        address: form.address.trim(),
        beds: toInt(form.beds),
        baths: toInt(form.baths),
        sqft: toInt(form.sqft),
        lotSqft: toInt(form.lotSqft),
        yearBuilt: toInt(form.yearBuilt),
        condition: clampInt(form.condition,1,5),
        view: form.view,
        garageSpots: toInt(form.garageSpots),
        marketTrend: form.marketTrend,
        renovations: form.renovations
      };

      const r=await fetch("/api/estimate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error||"Failed");
      setRes(data);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  const Field=({label,children})=>(
    <div className="space-y-1">
      <div className="label">{label}</div>
      {children}
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8 grid md:grid-cols-5 gap-6">
      {/* LEFT: form */}
      <div className="md:col-span-3 space-y-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="section-title">Property details</h1>
            <span className="badge">WA-only Beta</span>
          </div>

          <Field label="Address (Washington)">
            <input className="input"
                   placeholder="123 Main St, Seattle, WA 98101"
                   autoComplete="street-address"
                   value={form.address}
                   onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
          </Field>

          {/* 1 column on phones, 2 on bigger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Living area (sqft)">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="e.g. 1800"
                     value={form.sqft}
                     onChange={e=>setForm(f=>({...f,sqft:e.target.value}))}/>
            </Field>
            <Field label="Lot size (sqft)">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="e.g. 6000"
                     value={form.lotSqft}
                     onChange={e=>setForm(f=>({...f,lotSqft:e.target.value}))}/>
            </Field>
            <Field label="Bedrooms">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="e.g. 3"
                     value={form.beds}
                     onChange={e=>setForm(f=>({...f,beds:e.target.value}))}/>
            </Field>
            <Field label="Bathrooms">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="e.g. 2"
                     value={form.baths}
                     onChange={e=>setForm(f=>({...f,baths:e.target.value}))}/>
            </Field>
            <Field label="Year built">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="e.g. 1995"
                     value={form.yearBuilt}
                     onChange={e=>setForm(f=>({...f,yearBuilt:e.target.value}))}/>
            </Field>
            <Field label="Garage spots">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="e.g. 2"
                     value={form.garageSpots}
                     onChange={e=>setForm(f=>({...f,garageSpots:e.target.value}))}/>
            </Field>
          </div>

          {/* 1 col on phones, 3 on bigger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Condition (1–5)">
              <input className="input"
                     type="text" inputMode="numeric" pattern="[0-9]*"
                     placeholder="1 to 5"
                     value={form.condition}
                     onChange={e=>setForm(f=>({...f,condition:e.target.value}))}/>
            </Field>
            <Field label="View">
              <select className="input"
                      value={form.view}
                      onChange={e=>setForm(f=>({...f,view:e.target.value}))}>
                <option value="none">None</option>
                <option value="city">City</option>
                <option value="mountain">Mountain</option>
                <option value="water">Water</option>
              </select>
            </Field>
            <Field label="Trend">
              <select className="input"
                      value={form.marketTrend}
                      onChange={e=>setForm(f=>({...f,marketTrend:e.target.value}))}>
                <option value="declining">Declining</option>
                <option value="flat">Flat</option>
                <option value="rising">Rising</option>
              </select>
            </Field>
          </div>

          {/* checkboxes wrap nicely on phones */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {["kitchen","bath","roof","hvac","windows"].map(k=>(
              <label key={k} className="text-xs sm:text-sm flex items-center gap-2 border rounded-xl px-3 py-2">
                <input type="checkbox"
                       checked={Boolean((form.renovations||{})[k])}
                       onChange={e=>setForm(f=>({...f,renovations:{...(f.renovations||{}),[k]:e.target.checked}}))} />
                <span style={{textTransform:"capitalize"}}>{k}</span>
              </label>
            ))}
          </div>

          <button onClick={onEstimate} disabled={loading} className="btn">
            {loading ? "Estimating…" : "Estimate value"}
          </button>
          {err && <div style={{color:"#f87171",fontSize:12}}>{err}</div>}
        </div>
      </div>

      {/* RIGHT: results */}
      <div className="md:col-span-2 space-y-4">
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-3">Estimated value</h2>
          {!res && <p className="text-sm">Enter your address and details, then tap Estimate.</p>}
          {res && (
            <div className="space-y-3">
              <div className="text-3xl font-bold">{currency(res.estimate)}</div>
              <div className="text-sm">Range: {currency(res.low)} – {currency(res.high)}</div>
              <div className="border rounded-xl p-3">
                <div className="text-xs">Used $/sqft</div>
                <div className="text-lg font-semibold">{currency(res.ppsfUsed)}/sqft</div>
              </div>
              <div className="border rounded-xl p-3 max-h-64 overflow-auto">
                <div className="text-sm font-medium mb-2">Breakdown</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {res.breakdown?.map((b,i)=>(<li key={i}>{b}</li>))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
          }
