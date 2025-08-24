"use client";
import { useEffect, useRef, useState, useMemo } from "react";

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

  // Address suggestions (pure DOM to keep Android keyboard open)
  const sugBoxRef = useRef(null);
  useEffect(()=>{
    if (!addressRef.current || !sugBoxRef.current) return;
    const input = addressRef.current, sugBox = sugBoxRef.current;
    let debounce;

    async function fetchSuggestions(q){
      try{
        const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await r.json();
        const list = data?.predictions || [];
        sugBox.innerHTML = "";
        list.forEach(p=>{
          const btn = document.createElement("button");
          btn.textContent = p.description;
          btn.className = "suggestion-item";
          btn.type = "button";
          btn.onmousedown = e=>e.preventDefault(); // keep keyboard
          btn.onclick = ()=>{
            input.value = /,\s*WA\b/i.test(p.description) ? p.description : `${p.description}, WA`;
            sugBox.style.display="none"; input.focus();
          };
          sugBox.appendChild(btn);
        });
        sugBox.style.display = list.length ? "block" : "none";
      }catch{ sugBox.innerHTML=""; sugBox.style.display="none"; }
    }
    function onInput(){
      const q = input.value.trim();
      if (debounce) clearTimeout(debounce);
      if (q.length < 3){ sugBox.innerHTML=""; sugBox.style.display="none"; return; }
      debounce = setTimeout(()=>fetchSuggestions(q), 300);
    }
    function onBlur(){ setTimeout(()=>{ sugBox.style.display="none"; }, 120); }
    function onFocus(){ if (sugBox.innerHTML.trim()) sugBox.style.display="block"; }

    input.addEventListener("input", onInput);
    input.addEventListener("blur", onBlur);
    input.addEventListener("focus", onFocus);
    return ()=>{ input.removeEventListener("input", onInput); input.removeEventListener("blur", onBlur); input.removeEventListener("focus", onFocus); };
  },[]);

  // Year options 2025 → 1900
  const YEARS = useMemo(() => Array.from({length:2025-1900+1},(_,i)=>2025-i), []);

  function clearForm(){
    for (const r of [sqftRef, lotRef, bedsRef, bathsRef, yearRef, garageRef, conditionRef]) r.current && (r.current.value = "");
    viewRef.current && (viewRef.current.value = "none");
    trendRef.current && (trendRef.current.value = "flat");
    renoRef.current && (renoRef.current.value = "none");
    setRes(null); setSummary(null); setErr(null);
  }
  const startNew = clearForm;

  function downloadSummary(){
    const data = JSON.stringify({ summary, result: res }, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "valuation-summary.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
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
      if(payload.renovations.level === "some") payload.renovations = { kitchen:true, bath:true };
      else if(payload.renovations.level === "major") payload.renovations = { kitchen:true, bath:true, roof:true, hvac:true, windows:true };
      else payload.renovations = {};

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

      const r = await fetch("/api/estimate",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(payload) });
      const data = await r.json();
      if(!r.ok) throw new Error(data?.error||"Failed");
      await delay(6000); // matches 3-bar loader rhythm
      setRes(data);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  const Field = ({label,children}) => (
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
            <div className="bars">
              <div className="bar bar1" style={{"--dur":"2.2s"}} />
              <div className="bar bar2" style={{"--dur":"3.1s"}} />
              <div className="bar bar3" style={{"--dur":"1.7s"}} />
            </div>
            <div className="mt-3" style={{color:"var(--muted)", fontSize:14}}>
              Analyzing nearby sales and features…
            </div>
          </div>
        </div>
      )}

      {/* Sticky contact bar */}
      <div className="topbar">
        <div className="mx-auto max-w-6xl" style={{padding:"12px 16px"}}>
          <div className="card" style={{padding:"10px 14px", display:"flex", gap:"12px", alignItems:"center", justifyContent:"space-between"}}>
            <div style={{fontWeight:600}}>Realtor: Tyler Metzger</div>
            <div style={{fontSize:14, opacity:.9}}>
              <span style={{marginRight:12}}>C: 206.914.5044</span>
              <a href="mailto:tyler.metzger@exprealty.com">tyler.metzger@exprealty.com</a>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl" style={{padding:"16px 16px 32px"}}>
        <div className="card" style={{padding:16}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", marginBottom:6}}>
            <h1 className="section-title">Property details</h1>
            <span className="badge">WA-only Beta</span>
          </div>

          {/* Address */}
          <Field label="Address (Washington)">
            <div className="relative">
              <input
                ref={addressRef}
                className="input"
                placeholder="Start typing your address…"
                autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              />
              <div ref={sugBoxRef} className="suggestion-panel" style={{display:"none"}} />
            </div>
          </Field>

          {/* Grid 2 cols on >=sm */}
          <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12, marginTop:12}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12}}>
              <Field label="Living area (sqft)">
                <input ref={sqftRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 1800" />
              </Field>
              <Field label="Lot size (sqft)">
                <input ref={lotRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 6000" />
              </Field>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12}}>
              <Field label="Bedrooms">
                <select ref={bedsRef} className="input" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:10},(_,i)=>i).map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
              <Field label="Bathrooms">
                <select ref={bathsRef} className="input" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:10},(_,i)=>i).map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12}}>
              <Field label="Year built">
                <select ref={yearRef} className="input" defaultValue="">
                  <option value="" disabled>Select year…</option>
                  {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </Field>
              <Field label="Garage spots">
                <select ref={garageRef} className="input" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {Array.from({length:7},(_,i)=>i).map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12}}>
              <Field label="Condition (1–5)">
                <select ref={conditionRef} className="input" defaultValue="3">
                  {[1,2,3,4,5].map(n=>(<option key={n} value={n}>{n}</option>))}
                </select>
              </Field>
              <Field label="View">
                <select ref={viewRef} className="input" defaultValue="none">
                  <option value="none">None</option>
                  <option value="city">City</option>
                  <option value="mountain">Mountain</option>
                  <option value="water">Water</option>
                </select>
              </Field>
            </div>

            <Field label="Trend">
              <select ref={trendRef} className="input" defaultValue="flat">
                <option value="declining">Declining</option>
                <option value="flat">Flat</option>
                <option value="rising">Rising</option>
              </select>
            </Field>

            <Field label="Renovation level">
              <select ref={renoRef} className="input" defaultValue="none">
                <option value="none">None / original</option>
                <option value="some">Some updates (kitchen/bath)</option>
                <option value="major">Major remodel</option>
              </select>
            </Field>
          </div>

          <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:14}}>
            <button type="button" onClick={onEstimate} disabled={loading} className="btn">Estimate value</button>
            <button type="button" onClick={startNew} className="btn-secondary">Start New</button>
            <button type="button" onClick={clearForm} className="btn-secondary">Reset</button>
          </div>
          {err && <div style={{color:"#f87171",fontSize:12, marginTop:8}}>{err}</div>}
        </div>

        {/* Results */}
        <div className="card" style={{padding:16, marginTop:16}}>
          <div className="section-title" style={{marginBottom:8}}>Estimated value</div>
          {!res && <p style={{fontSize:14, color:"var(--muted)", margin:0}}>Enter your address and details, then tap Estimate.</p>}
          {res && (
            <div style={{display:"grid", gap:12}}>
              <div style={{fontWeight:800, fontSize:"1.8rem"}}>{currency(res.estimate)}</div>
              <div style={{fontSize:14, color:"var(--muted)"}}>Range: {currency(res.low)} – {currency(res.high)}</div>
              <div className="card" style={{padding:12}}>
                <div style={{fontSize:12, color:"var(--muted)"}}>Used $/sqft</div>
                <div style={{fontWeight:700, fontSize:"1.1rem"}}>{currency(res.ppsfUsed)}/sqft</div>
              </div>

              {summary && (
                <div>
                  <div style={{fontSize:14, fontWeight:600, marginBottom:8}}>Your inputs</div>
                  <table className="summary-table">
                    <tbody>
                    {Object.entries(summary).map(([k,v])=>(
                      <tr key={k}><th>{k}</th><td>{String(v ?? "")}</td></tr>
                    ))}
                    </tbody>
                  </table>
                  <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:10}}>
                    <button type="button" className="btn-secondary" onClick={downloadSummary}>Download</button>
                    <button type="button" className="btn-secondary" onClick={startNew}>Start New</button>
                    <button type="button" className="btn-secondary" onClick={clearForm}>Reset</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
            }
