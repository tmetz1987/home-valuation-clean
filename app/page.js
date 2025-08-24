"use client";
import { useRef, useState } from "react";

function currency(n){
  return n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
}
const toInt = (s) => {
  const n = parseInt(String(s||"").replace(/[^\d]/g,""), 10);
  return Number.isFinite(n) ? n : undefined;
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function Page(){
  // Uncontrolled inputs: keep refs so Android keyboard stays open
  const addressRef = useRef(null);
  const sqftRef = useRef(null);
  const lotRef = useRef(null);
  const bedsRef = useRef(null);
  const bathsRef = useRef(null);
  const yearRef = useRef(null);
  const garageRef = useRef(null);
  const conditionRef = useRef(null);
  const viewRef = useRef(null);
  const trendRef = useRef(null);
  const renoRef = useRef(null);

  const [loading,setLoading]=useState(false);
  const [prefilling,setPrefilling]=useState(false);
  const [res,setRes]=useState(null);
  const [err,setErr]=useState(null);

  async function onPrefill(){
    setPrefilling(true); setErr(null);
    try{
      const r = await fetch("/api/prefill", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ address: addressRef.current.value })
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data?.error || "Prefill failed");
      const s = data.subject || {};
      if(s.sqft && sqftRef.current) sqftRef.current.value = s.sqft;
      if(s.lotSqft && lotRef.current) lotRef.current.value = s.lotSqft;
      if(s.yearBuilt && yearRef.current) yearRef.current.value = s.yearBuilt;
      if(s.beds && bedsRef.current) bedsRef.current.value = s.beds;
      if(s.baths && bathsRef.current) bathsRef.current.value = s.baths;
    }catch(e){ setErr(e.message); }
    finally{ setPrefilling(false); }
  }

  async function onEstimate(){
    setLoading(true); setErr(null);
    try{
      const payload = {
        address: addressRef.current?.value?.trim(),
        sqft: toInt(sqftRef.current?.value),
        lotSqft: toInt(lotRef.current?.value),
        beds: toInt(bedsRef.current?.value),
        baths: toInt(bathsRef.current?.value),
        yearBuilt: toInt(yearRef.current?.value),
        garageSpots: toInt(garageRef.current?.value),
        condition: clamp(toInt(conditionRef.current?.value)||3,1,5),
        view: viewRef.current?.value || "none",
        marketTrend: trendRef.current?.value || "flat",
        renovations: { level: renoRef.current?.value || "none" } // simple single field
      };

      // Map renovation level to what the estimator expects
      if(payload.renovations.level === "some") {
        payload.renovations = { kitchen: true, bath: true };
      } else if(payload.renovations.level === "major") {
        payload.renovations = { kitchen: true, bath: true, roof: true, hvac: true, windows: true };
      } else {
        payload.renovations = {};
      }

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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="section-title">Property details</h1>
            <span className="badge">WA-only Beta</span>
          </div>

          <Field label="Address (Washington)">
            <div className="flex gap-2">
              <input ref={addressRef} className="input flex-1" placeholder="123 Main St, Seattle, WA 98101" />
              <button type="button" className="btn-secondary" onClick={onPrefill} disabled={prefilling}>
                {prefilling ? "Prefilling…" : "Prefill"}
              </button>
            </div>
          </Field>

          {/* 1 column on phones, 2 on bigger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Living area (sqft)">
              <input ref={sqftRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 1800" />
            </Field>
            <Field label="Lot size (sqft)">
              <input ref={lotRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 6000" />
            </Field>
            <Field label="Bedrooms">
              <input ref={bedsRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 3" />
            </Field>
            <Field label="Bathrooms">
              <input ref={bathsRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 2" />
            </Field>
            <Field label="Year built">
              <input ref={yearRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 1995" />
            </Field>
            <Field label="Garage spots">
              <input ref={garageRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 2" />
            </Field>
          </div>

          {/* 1 col on phones, 3 on bigger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Condition (1–5)">
              <input ref={conditionRef} className="input" type="text" inputMode="numeric" placeholder="1 to 5" defaultValue="3" />
            </Field>
            <Field label="View">
              <select ref={viewRef} className="input" defaultValue="none">
                <option value="none">None</option>
                <option value="city">City</option>
                <option value="mountain">Mountain</option>
                <option value="water">Water</option>
              </select>
            </Field>
            <Field label="Trend">
              <select ref={trendRef} className="input" defaultValue="flat">
                <option value="declining">Declining</option>
                <option value="flat">Flat</option>
                <option value="rising">Rising</option>
              </select>
            </Field>
          </div>

          {/* simpler than many checkboxes */}
          <Field label="Renovation level">
            <select ref={renoRef} className="input" defaultValue="none">
              <option value="none">None / original</option>
              <option value="some">Some updates (kitchen/bath)</option>
              <option value="major">Major remodel</option>
            </select>
          </Field>

          <button type="button" onClick={onEstimate} disabled={loading} className="btn">
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
