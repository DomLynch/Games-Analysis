// Licence: permissive zlib-style notice (donor license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Data fields: hold and fade times are zone or engine data; the donor fixes them at 2 s and 2 s.
const SPLIT = { holdS: 2, fadeS: 2, precision: 2 } as const;

interface SplitBanner {
  diffMs: number;           // signed: positive = behind the best, negative = ahead
  shownAtMs: number | null; // game clock stamp when the split arrived; null = nothing to show
}

// Server split message arrives. nowMs is the game clock (fix: the donor reads the wall clock here).
function onSplit(b: SplitBanner, diffMs: number, nowMs: number): void {
  b.diffMs = diffMs;
  b.shownAtMs = nowMs;
}

// Local player died: the banner is cleared at once (donor: race mode only).
function onDeath(b: SplitBanner): void {
  b.shownAtMs = null;
}

// Opacity for this frame: full for holdS, then linear to zero over fadeS, then hidden.
function alphaAt(b: SplitBanner, nowMs: number): number {
  if (b.shownAtMs === null) return 0;
  const ageS = (nowMs - b.shownAtMs) / 1000;
  const totalS = SPLIT.holdS + SPLIT.fadeS;
  if (ageS < 0 || ageS >= totalS) return 0;
  if (ageS <= SPLIT.holdS) return 1;
  return (totalS - ageS) / SPLIT.fadeS;
}

type Tone = "behind" | "ahead" | "even";
function toneOf(diffMs: number): Tone {
  return diffMs > 0 ? "behind" : diffMs < 0 ? "ahead" : "even";
}

// "+1.25" or "-0.40": sign always shown, seconds with fixed decimals.
function formatDiff(diffMs: number): string {
  const sign = diffMs < 0 ? "-" : "+";
  return sign + (Math.abs(diffMs) / 1000).toFixed(SPLIT.precision);
}

export {};
