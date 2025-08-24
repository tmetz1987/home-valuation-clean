"use client";
import { useEffect, useRef, useState, useMemo } from "react";

/* ---------- small helpers ---------- */
const currency = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const toInt = (s) => {
  const n = parseInt(String(s ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Page() {
  /* refs for inputs */
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

  /* UI state */
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState(null);

  /* suggestions container (pure DOM so keyboard stays open) */
  const sugBoxRef = useRef(null);

  /* ---------- AUTOCOMPLETE (address) ---------- */
  useEffect(() => {
    const input = addressRef.current;
    const sug = sugBoxRef.current;
    if (!input || !sug) return;

    let debounce;

    function setCompleteState(el) {
      // complete when >= 5 chars
      const ok = (el.value || "").trim().length >= 5;
      el.classList.toggle("is-complete", ok);
      el.classList.toggle("is-error", !ok);
    }

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
          btn.onmousedown = (e) => e.preventDefault(); // keep keyboard open
          btn.onclick = () => {
            input.value = /,\s*WA\b/i.test(p.description) ? p.description : `${p.description}, WA`;
            sug.style.display = "none";
            input.focus();
            setCompleteState(input);
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
      const q = input.value.trim();
      // live complete/error styling
      setCompleteState(input);

      if (debounce) clearTimeout(debounce);
      if (q.length < 3) {
        sug.innerHTML = "";
        sug.style.display = "none";
        return;
      }
      debounce = setTimeout(() => fetchSug(q), 250);
    }

    function onBlur() {
      setTimeout(() => (sug.style.display = "none"), 120);
    }
    function onFocus() {
      if (sug.innerHTML.trim()) sug.style.display = "block";
    }

    input.addEventListener("input", onInput);
    input.addEventListener("blur", onBlur);
    input.addEventListener("focus", onFocus);
    // initial state
    setTimeout(() => setCompleteState(input), 0);

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("blur", onBlur);
      input.removeEventListener("focus", onFocus);
    };
  }, []);

  /* ---------- VALIDATION HELPERS ---------- */
  const markComplete = (ref, ok) => {
    const el = ref.current;
    if (!el) return;
    el.classList.toggle("is-complete", !!ok);
    el.classList.toggle("is-error", !ok);
  };
  const numericOk = (ref) => {
    const val = ref.current?.value ?? "";
    const ok = /^\d{1,9}$/.test(String(val).trim());
    markComplete(ref, ok);
    return ok;
  };
  const selectOk = (ref) => {
    const ok = String(ref.current?.value ?? "") !== "";
    markComplete(ref, ok);
    return ok;
  };

  /* attach simple validators (on blur) for fields */
  useEffect(() => {
    const pairs = [
      [sqftRef, numericOk],
      [lotRef, (r) => (r.current?.value ? numericOk(r) : (r.current?.classList.remove("is-error","is-complete"), true))],
      [bedsRef, selectOk],
      [bathsRef, selectOk],
      [yearRef, selectOk],
      [garageRef, selectOk],
      [conditionRef, selectOk],
      [viewRef, selectOk],
      [trendRef, selectOk],
      [renoRef, selectOk],
    ];
    pairs.forEach(([ref, fn]) => {
      const el = ref.current;
      if (!el) return;
      const handler = () => fn(ref);
      el.addEventListener("blur", handler);
      // initial neutral
      el.classList.remove("is-complete", "is-error");
      return () => el.removeEventListener("blur", handler);
    });
  }, []);

  /* ---------- YEAR OPTIONS (2025 → 1900) ---------- */
  const YEARS = useMemo(() => Array.from({ length: 2025 - 1900 + 1 }, (_, i) => 2025 - i), []);

  /* ---------- SUBMIT ---------- */
  async function onEstimate() {
    setErrorMsg("");
    setResult(null);

    // quick validation
    const addrOK = (addressRef.current?.value || "").trim().length >= 5;
    markComplete(addressRef, addrOK);
    const ok =
      addrOK &&
      numericOk(sqftRef) &&
      selectOk(bedsRef) &&
      selectOk(bathsRef) &&
      selectOk(yearRef);

    if (!ok) {
      setErrorMsg("Please complete the highlighted fields.");
      return;
    }

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
      });

      const r = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Estimate failed");

      // show the 3-bar loader for 6s
      await delay(6000);
      setResult(data);
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- helpers ---------- */
  const Field = ({ label, children }) => (
    <div className="space-y-1">
      <div className="label">{label}</div>
      {children}
    </div>
  );

  const resetAll = () => {
    [
      addressRef,
      sqftRef,
      lotRef,
      bedsRef,
      bathsRef,
      yearRef,
      garageRef,
      conditionRef,
      viewRef,
      trendRef,
      renoRef,
    ].forEach((r) => {
      if (!r.current) return;
      r.current.value = "";
      r.current.classList.remove("is-complete", "is-error");
    });
    setSummary(null);
    setResult(null);
    setErrorMsg("");
  };

  return (
    <>
      {/* Loading overlay with 3 bars */}
      {loading && (
        <div className="loading-overlay">
          <div className="loader-card">
            <div className="mb-3 font-semibold">Loading Home Value</div>
            <div className="bars">
              <div className="bar bar1" style={{ "--dur": "2.2s" }} />
              <div className="bar bar2" style={{ "--dur": "3.1s" }} />
              <div className="bar bar3" style={{ "--dur": "1.7s" }} />
            </div>
            <div className="mt-3" style={{ color: "var(--muted)", fontSize: 14 }}>
              Analyzing nearby sales and features…
            </div>
          </div>
        </div>
      )}

      {/* Sticky contact bar (fixed alignment) */}
      <div className="topbar">
        <div className="mx-auto max-w-6xl" style={{ padding: "10px 16px" }}>
          <div
            className="card"
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>Realtor: Tyler Metzger</div>
            <div style={{ fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ opacity: 0.9 }}>C: 206.914.5044</span>
              <a className="clean-link" href="mailto:tyler.metzger@exprealty.com">
                tyler.metzger@exprealty.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto max-w-6xl" style={{ padding: "16px 16px 32px" }}>
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <h1 className="section-title">Property details</h1>
            <span className="badge">WA-only Beta</span>
          </div>

          {/* Address (autocomplete) */}
          <Field label="Address (Washington)">
            <div className="relative">
              <input
                ref={addressRef}
                className="input"
                placeholder="Start typing your address…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <div ref={sugBoxRef} className="suggestion-panel" style={{ display: "none" }} />
            </div>
          </Field>

          {/* Groups */}
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Living area (sqft)">
                <input
                  ref={sqftRef}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1800"
                />
              </Field>
              <Field label="Lot size (sqft)">
                <input
                  ref={lotRef}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 6000 (optional)"
                />
              </Field>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Bedrooms">
                <select ref={bedsRef} className="input" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {Array.from({ length: 10 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bathrooms">
                <select ref={bathsRef} className="input" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {Array.from({ length: 10 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Year built">
                <select ref={yearRef} className="input" defaultValue="">
                  <option value="" disabled>
                    Select year…
                  </option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Garage spots">
                <select ref={garageRef} className="input" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {Array.from({ length: 7 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Condition (1–5)">
                <select ref={conditionRef} className="input" defaultValue="3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
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
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={onEstimate} disabled={loading} className="btn">
              Estimate value
            </button>
            <button type="button" onClick={resetAll} className="btn-secondary">
              Reset
            </button>
          </div>
          {errorMsg && (
            <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{errorMsg}</div>
          )}
        </div>

        {/* Results */}
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            Estimated value
          </div>
          {!result && (
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
              Enter your address and details, then tap Estimate.
            </p>
          )}
          {result && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: "1.8rem" }}>{currency(result.estimate)}</div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                Range: {currency(result.low)} – {currency(result.high)}
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Used $/sqft</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  {currency(result.ppsfUsed)}/sqft
                </div>
              </div>

              {summary && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Your inputs</div>
                  <table className="summary-table">
                    <tbody>
                      {Object.entries(summary).map(([k, v]) => (
                        <tr key={k}>
                          <th>{k}</th>
                          <td>{String(v ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
                  }
