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

  // suggestions container (outside React)
  const sugBoxRef = useRef(null);

  useEffect(()=>{
    if (!addressRef.current) return;

    const input = addressRef.current;
    const sugBox = sugBoxRef.current;

    let debounce;
    input.addEventListener("input", ()=>{
      const q = input.value;
      if (debounce) clearTimeout(debounce);
      if (q.length < 3) { sugBox.innerHTML=""; return; }

      debounce = setTimeout(async ()=>{
        try{
          const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
          const data = await r.json();
          sugBox.innerHTML = "";
          (data?.predictions||[]).forEach(p=>{
            const btn = document.createElement("button");
            btn.textContent = p.description;
            btn.className = "suggestion-item";
            btn.type = "button";
            btn.onmousedown = e=>e.preventDefault(); // keep keyboard
            btn.onclick = ()=>{
              input.value = p.description;
              sugBox.innerHTML="";
              input.focus();
            };
            sugBox.appendChild(btn);
          });
          if((data?.predictions||[]).length){
            sugBox.style.display="block";
          } else {
            sugBox.style.display="none";
          }
        }catch(e){}
      }, 300);
    });

    input.addEventListener("blur", ()=>{
      setTimeout(()=>{ if(sugBox) sugBox.style.display="none"; },150);
    });
    input.addEventListener("focus", ()=>{
      if (sugBox.innerHTML.trim()) sugBox.style.display="block";
    });

  },[]);

  function clearForm(){
    for (const r of [sqftRef, lotRef, bedsRef, bathsRef, yearRef, garageRef, conditionRef]) {
      if (r.current) r.current.value = "";
    }
    if (viewRef.current) viewRef.current.value = "none";
    if (trendRef.current) trendRef.current.value = "flat";
    if (renoRef.current) renoRef.current.value = "none";
    setRes(null); setSummary(null); setErr(null);
  }

  function startNew(){ clearForm(); }

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

      if(payload.renovations.level === "some") {
        payload.renovations = { kitchen: true, bath: true };
      } else if(payload.renovations.level === "major") {
        payload.renovations = { kitchen: true, bath: true, roof: true, hvac: true, windows: true };
      } else {
        payload.renovations = {};
      }

      setSummary(payload);

      const r=await fetch("/api/estimate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error||"Failed");

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
      {loading && (
        <div className="loading-overlay">
          <div className="loader-card">
            <div className="mb-3 font-semibold">Loading Home Value</div>
            <div className="progress-wrap"><div className="progress-fill"></div></div>
            <div className="mt-3 text-sm" style={{color:"var(--muted)"}}>
              Please wait while we analyze your home and nearby sales…
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl p-4 md:p-8 grid md:grid-cols-5 gap-6">
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
                  className="input pastel-input w-full"
                  placeholder="Start typing your address…"
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                />
                <div ref={sugBoxRef} className="suggestion-panel" style={{display:"none"}}></div>
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Living area (sqft)">
                <input ref={sqftRef} className="input pastel-input" type="text" inputMode="numeric" />
              </Field>
              <Field label="Lot size (sqft)">
                <input ref={lotRef} className="input pastel-input" type="text" inputMode="numeric" />
              </Field>
              <Field label="Bedrooms">
                <select ref={bedsRef} className="input pastel-select" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:10},(_,i)=>i).map(n=><option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Bathrooms">
                <select ref={bathsRef} className="input pastel-select" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:10},(_,i)=>i).map(n=><option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Year built">
                <input ref={yearRef} className="input pastel-input" type="text" inputMode="numeric" />
              </Field>
              <Field label="Garage spots">
                <select ref={garageRef} className="input pastel-select" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:7},(_,i)=>i).map(n=><option key={n}>{n}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Condition (1–5)">
                <select ref={conditionRef} className="input pastel-select" defaultValue="3">
                  {[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}
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

        {/* RIGHT */}
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
                    <table className="summary-table">
                      <tbody>
                        {Object.entries(summary).map(([k,v])=>(
                          <tr key={k}><th>{k}</th><td>{String(v ?? "")}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button onClick={downloadSummary} className="btn-secondary">Download</button>
                      <button onClick={startNew} className="btn-secondary">Start New</button>
                      <button onClick={clearForm} className="btn-secondary">Reset</button>
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
