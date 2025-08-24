// Rough but realistic baseline $/sqft for Washington by ZIP prefix.
// These are conservative mid-2025-ish ballparks. Tune as you get feedback.
const WA_PPSF_BASELINE = {
  // Seattle core & close-in (Ballard/Capitol Hill/SLU/etc.)
  "981": 520,

  // Eastside/King suburbs (Bellevue, Kirkland, Redmond, Issaquah, Renton)
  "980": 430,

  // North of Seattle (Snohomish/Whatcom/Skagit mixes)
  "982": 310,

  // Kitsap/Olympic Pen
  "983": 280,

  // Tacoma area
  "984": 265,

  // SW Washington (Thurston, Grays Harbor, Pacific)
  "985": 225,

  // Vancouver area (Clark County)
  "986": 260,

  // Central WA (Chelan/Leavenworth/Wenatchee)
  "988": 245,

  // Yakima/Ellensburg
  "989": 220,

  // Spokane area (and nearby)
  "990": 235,
  "992": 230,

  // NE WA / rural
  "991": 210,

  // Tri-Cities
  "993": 235,

  // Fallback if we can’t parse a zip
  "*": 260
};

export default WA_PPSF_BASELINE;
