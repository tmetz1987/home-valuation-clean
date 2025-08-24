"use client";
import { useEffect, useRef, useState, useMemo } from "react";

/* ---------- helpers ---------- */
const currency = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const toInt = (s) => {
  const n = parseInt(String(s ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Page() {
  /* refs */
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
  const zillowRef = useRef(null);
  const redfinRef = useRef(null);

  /* UI state */
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);        // model result
  const [finalValue, setFinalValue] = useState(null); // shown value (avg ext if present)
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState(null);

  /* suggestions container (pure DOM so Android keyboard stays up) */
  const sugBoxRef = useRef(null);

  /* ---------- class helpers for styling ---------- */
  const setCompleteOnly = (ref, ok) => {
    const el = ref?.current; if (!el) return;
    if (ok) el.classList.add("is-complete"); else el.classList.remove("is-complete");
    // IMPORTANT: do NOT touch is-error here (no red before submit)
  };
  const setErrorFlag = (ref, err) => {
    const el = ref?.current; if (!el) return;
    el.classList.toggle("is-error", !!err);
  };

  /* ---------- ADDRESS AUTOCOMPLETE ---------- */
  useEffect(() => {
    const input = addressRef.current, sug = sugBoxRef.current;
    if (!input || !sug) return;
    let debounce;

    const markComplete = () => setCompleteOnly(addressRef, (input.value || "").trim().length >= 5);

    async function fetchSug(q) {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await r.json();
        const list = data?.predictions || [];
        sug.innerHTML = "";
        list.forEach((p) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "suggestion-item";
          btn.textContent = p.description;
          btn.onmousedown = (e) => e.preventDefault(); // keep keyboard
          btn.onclick = () => {
            input.value = /,\s*WA\b/i.test(p.description) ? p.description : `${p.description}, WA`;
            sug.style.display = "none";
            input.focus();
            markComplete();
          };
          sug.appendChild(btn);
        });
        sug.style.display = list.length ? "block" : "none";
      } catch {
        sug.innerHTML = "";
        sug.style.display = "none";
      }
    }

    function onInput() {
      setErrorMsg("");
      markComplete();                     // green if looks filled
      const q = input.value.trim();
      if (debounce) clearTimeout(debounce);
      if (q.length < 3) { sug.innerHTML = ""; sug.style.display = "none"; return; }
      debounce = setTimeout(() => fetchSug(q), 250);
    }
    function onBlur()  { setTimeout(() => (sug.style.display = "none"), 120); }
    function onFocus() { if (sug.innerHTML.trim()) sug.style.display = "block"; }

    input.addEventListener("input", onInput);
    input.addEventListener("blur", onBlur);
    input.addEventListener("focus", onFocus);
    setTimeout(markComplete, 0);

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("blur", onBlur);
      input.removeEventListener("focus", onFocus);
    };
  }, []);

  /* ---------- live “complete” feedback (no red) ---------- */
  useEffect(() => {
    const asCompleteNumeric = (ref, required = true) => {
      const v = ref.current?.value ?? "";
      if (!required && String(v).trim() === "") { setCompleteOnly(ref, false); return; }
      setCompleteOnly(ref, /^\d{1,9}$/.test(String(v).trim()));
    };
    const asCompleteSelect = (ref) => setCompleteOnly(ref, String(ref.current?.value ?? "") !== "");

    const pairs = [
      [sqftRef,   () => asCompleteNumeric(sqftRef, true)],
      [lotRef,    () => asCompleteNumeric(lotRef, false)],
      [bedsRef,   () => asCompleteSelect(bedsRef)],
      [bathsRef,  () => asCompleteSelect(bathsRef)],
      [yearRef,   () => asCompleteSelect(yearRef)],
      [garageRef, () => asCompleteSelect(garageRef)],
      [conditionRef, () => asCompleteSelect(conditionRef)],
      [viewRef,   () => asCompleteSelect(viewRef)],
      [trendRef,  () => asCompleteSelect(trendRef)],
      [renoRef,   () => asCompleteSelect(renoRef)],
      [zillowRef, () => asCompleteNumeric(zillowRef, false)],
      [redfinRef, () => asCompleteNumeric(redfinRef, false)],
    ];

    // Trigger on blur (and later on submit we can add red if needed)
    const unsubs = pairs.map(([ref, fn]) => {
      const el = ref.current; if (!el) return () => {};
      const h = () => fn();
      el.addEventListener("input", h);
      el.addEventListener("blur", h);
      return () => { el.removeEventListener("input", h); el.removeEventListener("blur", h); };
    });
    return () => unsubs.forEach((u) => u && u());
  }, []);

  /* ---------- YEAR OPTIONS ---------- */
  const YEARS = useMemo(() => Array.from({ length: 2025 - 1900 + 1 }, (_, i) => 2025 - i), []);

  /* ---------- SUBMIT ---------- */
  async function onEstimate() {
    setErrorMsg(""); setFinalValue(null); setResult(null);

    // compute validity (add red only here)
    const addrOK = (addressRef.current?.value || "").trim().length >= 5;
    const sqftOK = /^\d{1,9}$/.test(String(sqftRef.current?.value ?? "").trim());
    const bedsOK = String(bedsRef.current?.value ?? "") !== "";
    const bathsOK = String(bathsRef.current?.value ?? "") !== "";
    const yearOK = String(yearRef.current?.value ?? "") !== "";

    setErrorFlag(addressRef, !addrOK);
    setErrorFlag(sqftRef, !sqftOK);
    setErrorFlag(bedsRef, !bedsOK);
    setErrorFlag(bathsRef, !bathsOK);
    setErrorFlag(yearRef, !yearOK);

    const ok = addrOK && sqftOK && bedsOK && bathsOK && yearOK;
    if (!ok) { setErrorMsg("Please complete the highlighted fields."); return; }

    setLoading(true);
    try {
      const payload = {
        address: addressRef.current?.value?.trim(),
        sqft: toInt(sqftRef.current?.value),
        lotSqft: toInt(lotRef.current?.value),
        beds: toInt(bedsRef.current?.value),
        baths: toInt(bathsRef.current?.value),
        yearBuilt: toInt(yearRef.current?.value),
        garageSpots: toInt(garageRef.current?.value),
        condition: toInt(conditionRef.current?.value) ?? 3,
        view: viewRef.current?.value || "none",
        marketTrend: trendRef.current?.value || "flat",
        renovations: { level: renoRef.current?.value || "none" },
      };
      if (payload.renovations.level === "some") payload.renovations = { kitchen: true, bath: true };
      else if (payload.renovations.level === "major")
        payload.renovations = { kitchen: true, bath: true, roof: true, hvac: true, windows: true };
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
        "Renovation level": renoRef.current?.value || "none",
        "Zestimate (optional)": zillowRef.current?.value || "",
        "Redfin estimate (optional)": redfinRef.current?.value || "",
      });

      // call model
      const r = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Estimate failed");

      // 6s loader
      await delay(6000);

      // external average if provided
      const z = toInt(zillowRef.current?.value);
      const rf = toInt(redfinRef.current?.value);
      let externalAvg = null;
      if (z && rf) externalAvg = Math.round((z + rf) / 2);
      else if (z) externalAvg = z;
      else if (rf) externalAvg = rf;

      setResult(data);
      setFinalValue(externalAvg ?? data.estimate);
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const Field = ({ label, children }) => (
    <div className="space-y-1">
      <div className="label">{label}</div>
      {children}
    </div>
  );

  const resetAll = () => {
    [
      addressRef,sqftRef,lotRef,bedsRef,bathsRef,yearRef,garageRef,conditionRef,viewRef,trendRef,renoRef,
      zillowRef, redfinRef
    ].forEach((r) => {
      if (!r.current) return;
      r.current.value = "";
      r.current.classList.remove("is-complete","is-error");
    });
    setSummary(null); setResult(null); setFinalValue(null); setErrorMsg("");
  };

  return (
    <>
      {/* Single green loading bar */}
      {loading && (
        <div className="loading-overlay">
          <div className="loader-card">
            <div className="mb-3 font-semibold">Loading Home Value</div>
            <div className="onebar"><div className="onebar-fill" /></div>
            <div className="mt-3" style={{ color: "var(--muted)", fontSize: 14 }}>
              Analyzing nearby sales and features…
            </div>
          </div>
        </div>
      )}

      {/* Sticky contact bar */}
      <div className="topbar">
        <div className="mx-auto max-w-6xl" style={{ padding: "10px 16px" }}>
          <div className="card topcard">
            <div className="top-left">Realtor: <strong>Tyler Metzger</strong></div>
            <div className="top-right">
              <span className="nowrap">C:&nbsp;206.914.5044</span>
              <a className="clean-link email-clip" href="mailto:tyler.metzger@exprealty.com">
                tyler.metzger@exprealty.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto max-w-6xl" style={{ padding: "16px 16px 32px" }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="header-row">
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
              <div ref={sugBoxRef} className="suggestion-panel" style={{ display: "none" }} />
            </div>
          </Field>

          <div className="grid-col">
            <Field label="Living area (sqft)">
              <input ref={sqftRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 1800" />
            </Field>
            <Field label="Lot size (sqft)">
              <input ref={lotRef} className="input" type="text" inputMode="numeric" placeholder="e.g. 6000 (optional)" />
            </Field>
          </div>

          <div className="grid-col">
            <Field label="Bedrooms">
              <select ref={bedsRef} className="input" defaultValue="">
                <option value="" disabled>Choose…</option>
                {Array.from({ length: 10 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Bathrooms">
              <select ref={bathsRef} className="input" defaultValue="">
                <option value="" disabled>Choose…</option>
                {Array.from({ length: 10 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid-col">
            <Field label="Year built">
              <select ref={yearRef} className="input" defaultValue="">
                <option value="" disabled>Select year…</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Garage spots">
              <select ref={garageRef} className="input" defaultValue="">
                <option value="" disabled>Choose…</option>
                {Array.from({ length: 7 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid-col">
            <Field label="Condition (1–5)">
              <select ref={conditionRef} className="input" defaultValue="3">
                {[1,2,3,4,5].map((n)=><option key={n} value={n}>{n}</option>)}
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

          <div className="grid-col">
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

          {/* Optional external estimates */}
          <div className="grid-col">
            <Field label="Zestimate (optional)">
              <input ref={zillowRef} className="input" type="text" inputMode="numeric" placeholder="Paste Zillow number" />
            </Field>
            <Field label="Redfin estimate (optional)">
              <input ref={redfinRef} className="input" type="text" inputMode="numeric" placeholder="Paste Redfin number" />
            </Field>
          </div>

          <div className="btn-row">
            <button type="button" onClick={onEstimate} disabled={loading} className="btn">Estimate value</button>
            <button type="button" onClick={resetAll} className="btn-secondary">Reset</button>
          </div>
          {errorMsg && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{errorMsg}</div>}
        </div>

        {/* Results */}
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Estimated value</div>
          {!finalValue && <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Enter details and tap Estimate.</p>}
          {finalValue && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: "1.8rem" }}>{currency(finalValue)}</div>

              {/* Context box */}
              {result && (
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Model estimate (context)</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{currency(result.estimate)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                    Used $/sqft: {currency(result.ppsfUsed)}/sqft · Range: {currency(result.low)} – {currency(result.high)}
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
