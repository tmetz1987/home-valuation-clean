import WA_PPSF_BASELINE from "./waPpsfBaseline";

// Small helpers
const clamp = (n, min, max) => Math.max(min, Math.min(max, n || 0));
const safe = (n) => (Number.isFinite(n) ? n : 0);

// Condition (1–5) → multiplier
const CONDITION_FACTOR = {
  1: 0.85,
  2: 0.95,
  3: 1.00,
  4: 1.08,
  5: 1.18,
};

// View premium
const VIEW_FACTOR = {
  none: 1.00,
  city: 1.04,
  mountain: 1.06,
  water: 1.15,
};

// Market trend (short-term feel)
const TREND_FACTOR = {
  declining: 0.97,
  flat: 1.00,
  rising: 1.03,
};

// Year-built adjustment (newer usually higher; old but charming not penalized too hard)
function yearFactor(yearBuilt) {
  const y = safe(yearBuilt);
  if (!y) return 1.0;
  // Center around 1990; cap effect to about ±10%
  const delta = clamp((y - 1990) / 40, -0.6, 0.6); // from -0.6 to +0.6
  return 1 + delta * 0.16; // max ~±10%
}

// Lot size has diminishing returns vs living sqft
function lotFactor(lotSqft, livingSqft) {
  const lot = safe(lotSqft);
  const liv = safe(livingSqft) || 1000;
  if (!lot) return 1.0;
  const baseLot = 5000; // typical city lot
  const ratio = clamp(Math.log10((lot + 1) / baseLot + 1), -0.5, 0.8);
  // bigger lot helps, but gently
  return 1 + ratio * 0.12;
}

// Bedrooms/bathrooms tweak PPSF slightly
function bedBathFactor(beds, baths) {
  let f = 1.0;
  if (beds >= 4) f *= 1.02;
  if (baths >= 3) f *= 1.02;
  if (beds <= 2) f *= 0.98;
  return f;
}

// Pull a ZIP prefix ("981") out of "…, WA 98101" style strings
function zipPrefixFromAddress(address) {
  const m = String(address || "").match(/\b(\d{5})\b/);
  if (!m) return null;
  return m[1].slice(0, 3);
}

export function estimateHome(payload) {
  const {
    address,
    sqft,
    lotSqft,
    beds,
    baths,
    yearBuilt,
    condition = 3,
    view = "none",
    marketTrend = "flat",
  } = payload || {};

  const zip3 = zipPrefixFromAddress(address);
  const basePpsf =
    (zip3 && WA_PPSF_BASELINE[zip3]) ||
    WA_PPSF_BASELINE["*"];

  // Compose multipliers
  const fCondition = CONDITION_FACTOR[clamp(condition, 1, 5)] || 1.0;
  const fView = VIEW_FACTOR[view] ?? 1.0;
  const fTrend = TREND_FACTOR[marketTrend] ?? 1.0;
  const fYear = yearFactor(yearBuilt);
  const fLot = lotFactor(lotSqft, sqft);
  const fBedBath = bedBathFactor(beds, baths);

  // Final PPSF
  const ppsf =
    basePpsf *
    fCondition *
    fView *
    fTrend *
    fYear *
    fLot *
    fBedBath;

  const liv = safe(sqft);
  const estimate = Math.max(0, Math.round(ppsf * liv));

  // Confidence/range: ±7.5% around the point estimate (tune later)
  const band = Math.round(estimate * 0.075);
  const low = estimate - band;
  const high = estimate + band;

  return {
    estimate,
    low,
    high,
    ppsfUsed: Math.round(ppsf),
    factors: { basePpsf, fCondition, fView, fTrend, fYear, fLot, fBedBath },
  };
}

export default estimateHome;
