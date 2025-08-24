"use client";
import { useEffect, useRef, useState } from "react";

function currency(n){
  return n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
}
const toInt = (s) => {
  const n = parseInt(String(s||"").replace(/[^\d]/g,""), 10);
  return Number.isFinite(n) ? n : undefined;
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export default function Page(){
  // Uncontrolled refs keep Android keyboard open
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
  const [res,setRes]=useState(null);
  const [err,setErr]=useState(null);
  const [summary,setSummary]=useState(null);

  // Address autocomplete
  const [addrQuery, setAddrQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const debRef = useRef(null);

  useEffect(()=>{
    if (debRef.current) clearTimeout(debRef.current);
    if (!addrQuery || addrQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    debRef.current = setTimeout(async ()=>{
      try{
        const r = await fetch(`/api/places?q=${encodeURIComponent(addrQuery)}`, { cache: "no-store" });
        const data = await r.json();
        if (r.ok) {
          setSuggestions(data?.predictions || []);
          setShowSug(true);
        }
      }catch(_e){ /* ignore */ }
    }, 250);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [addrQuery]);

  function pickSuggestion(desc){
    if (addressRef.current) addressRef.current.value = desc;
    setShowSug(false);
    setSuggestions([]);
  }

  function clearForm(){
    for (const r of [sqftRef, lotRef, bedsRef, bathsRef, yearRef, garageRef, conditionRef]) {
      if (r.current) r.current.value = "";
    }
    if (viewRef.current) viewRef.current.value = "none";
    if (trendRef.current) trendRef.current.value = "flat";
    if (renoRef.current) renoRef.current.value = "none";
    setRes(null); setSummary(null); setErr(null);
  }

  function startNew(){
    // keep address so they can tweak; clear rest
    for (const r of [sqftRef, lotRef, bedsRef, bathsRef, yearRef, garageRef, conditionRef]) {
      if (r.current) r.current.value = "";
    }
    if (viewRef.current) viewRef.current.value = "none";
    if (trendRef.current) trendRef.current.value = "flat";
    if (renoRef.current) renoRef.current.value = "none";
    setRes(null); setSummary(null); setErr(null);
  }

  function downloadSummary(){
    const data = JSON.stringify({ summary, result: res }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "valuation-summary.json";
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
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
        renovations: { level: renoRef.current?.value || "none" }
      };

      // Map simple renovation level → detailed flags
      if(payload.renovations.level === "some") {
        payload.renovations = { kitchen: true, bath: true };
      } else if(payload.renovations.level === "major") {
        payload.renovations = { kitchen: true, bath: true, roof: true, hvac: true, windows: true };
      } else {
        payload.renovations = {};
      }

      // Save a human summary
      setSummary({
        Address: payload.address,
        "Living area (sqft)": payload.sqft ?? "",
        "Lot size (sqft)": payload.lotSqft ?? "",
        Bedrooms: payload.beds ?? "",
        Bathrooms: payload.baths ?? "",
        "Year built": payload.yearBuilt ?? "",
        "Garage spots": payload.garageSpots ?? "",
        "Condition (1–5)": payload.condition ?? "",
        View: payload.view,
        Trend: payload.marketTrend,
        "Renovation level": renoRef.current?.value || "none"
      });

      // Do API + ensure loading screen shows ≥ 5s
      const api = (async ()=>{
        const r=await fetch("/api/estimate",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload)
        });
        const data=await r.json();
        if(!r.ok) throw new Error(data?.error||"Failed");
        return data;
      })();

      const data = await api;
      await delay(5000);
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
    <>
      {/* Loading overlay: 5s green bubbly bar */}
      {loading && (
        <div className="loading-overlay">
          <div className="loader-card">
            <div className="mb-3 font-semibold">Loading Home Value</div>
            <div className="progress-wrap">
              <div className="progress-fill"></div>
            </div>
            <div className="mt-3 text-sm" style={{color:"var(--muted)"}}>
              Please wait while we analyze your home and nearby sales…
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl p-4 md:p-8 grid md:grid-cols-5 gap-6">
        {/* LEFT: form */}
        <div className="md:col-span-3 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h1 className="section-title">Property details</h1>
              <span className="badge">WA-only Beta</span>
            </div>

            <Field label="Address (Washington)">
              <div className="relative">
                <input
                  ref={addressRef}
                  className="input flex-1 pastel-input"
                  placeholder="Start typing your address…"
                  onChange={(e)=>setAddrQuery(e.target.value)}
                  onFocus={()=>{ if(suggestions.length) setShowSug(true); }}
                  autoComplete="street-address"
                />
                {showSug && suggestions.length>0 && (
                  <div className="suggestion-panel">
                    {suggestions.map(p=>(
                      <button
                        type="button"
                        key={p.place_id}
                        className="suggestion-item"
                        onMouseDown={(e)=>e.preventDefault()}
                        onClick={()=>pickSuggestion(p.description)}
                      >
                        {p.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {/* 1 column on phones, 2 on bigger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Living area (sqft)">
                <input ref={sqftRef} className="input pastel-input" type="text" inputMode="numeric" placeholder="e.g. 1800" />
              </Field>
              <Field label="Lot size (sqft)">
                <input ref={lotRef} className="input pastel-input" type="text" inputMode="numeric" placeholder="e.g. 6000" />
              </Field>

              {/* Dropdowns you asked for */}
              <Field label="Bedrooms">
                <select ref={bedsRef} className="input pastel-select" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:10},(_,i)=>i).map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
              <Field label="Bathrooms">
                <select ref={bathsRef} className="input pastel-select" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:10},(_,i)=>i).map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>

              <Field label="Year built">
                <input ref={yearRef} className="input pastel-input" type="text" inputMode="numeric" placeholder="e.g. 1995" />
              </Field>
              <Field label="Garage spots">
                <select ref={garageRef} className="input pastel-select" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:7},(_,i)=>i).map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
            </div>

            {/* 1 col on phones, 3 on bigger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Condition (1–5)">
                <select ref={conditionRef} className="input pastel-select" defaultValue="3">
                  {[1,2,3,4,5].map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
              <Field label="View">
                <select ref={viewRef} className="input pastel-select" defaultValue="none">
                  <option value="none">None</option>
                  <option value="city">City</option>
                  <option value="mountain">Mountain</option>
                  <option value="water">Water</option>
                </select>
              </Field>
              <Field label="Trend">
                <select ref={trendRef} className="input pastel-select" defaultValue="flat">
                  <option value="declining">Declining</option>
                  <option value="flat">Flat</option>
                  <option value="rising">Rising</option>
                </select>
              </Field>
            </div>

            <Field label="Renovation level">
              <select ref={renoRef} className="input pastel-select" defaultValue="none">
                <option value="none">None / original</option>
                <option value="some">Some updates (kitchen/bath)</option>
                <option value="major">Major remodel</option>
              </select>
            </Field>

            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={onEstimate} disabled={loading} className="btn">Estimate value</button>
              <button type="button" onClick={startNew} className="btn-secondary">Start New</button>
              <button type="button" onClick={clearForm} className="btn-secondary">Reset</button>
            </div>
            {err && <div style={{color:"#f87171",fontSize:12}}>{err}</div>}
          </div>
        </div>

        {/* RIGHT: results & summary */}
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

                {summary && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-2">Your inputs</div>
                    <table className="summary-table">
                      <tbody>
                        {Object.entries(summary).map(([k,v])=>(
                          <tr key={k}>
                            <th>{k}</th>
                            <td>{String(v ?? "")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button type="button" className="btn-secondary" onClick={downloadSummary}>Download</button>
                      <button type="button" className="btn-secondary" onClick={startNew}>Start New</button>
                      <button type="button" className="btn-secondary" onClick={clearForm}>Reset</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
                                   }
