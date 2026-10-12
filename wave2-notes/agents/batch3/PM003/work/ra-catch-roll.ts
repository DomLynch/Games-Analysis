// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type CatchFlag = "normal" | "universal-no-boss" | "universal-all";

interface CatchTarget {
  captureRate: number;   // pet database CaptureRate, 0..10000 (10000 = 100%)
  hpPct: number;         // current HP as a percent, 0..100
  statusImmune: boolean; // boss-type immunity
  lureMatchesPet: boolean;
  hasPetEntry: boolean;
  onMap: boolean;
}

interface CatchContext {
  flag: CatchFlag;
  distance: number;
  distanceMax: number;   // 0 disables the check (config)
  hasFreeInventorySlot: boolean;
  hidden: boolean;
  noCaptureMap: boolean;
  scalePct: number;      // server scale, 100 = no change
}

type CatchResult = "refused" | "missed" | "caught";

const MAX_RATE = 10000;

// Chance in 1/10000 units: base rate plus a bonus that grows as HP falls, floor 1.
function catchRate(captureRate: number, hpPct: number, scalePct: number): number {
  const base = Math.min(captureRate, MAX_RATE);
  let rate = base + Math.floor(((100 - hpPct) * base) / 100);
  if (rate < 1) rate = 1;
  if (scalePct !== 100) rate = Math.floor((rate * scalePct) / 100);
  return rate;
}

// One attempt. roll() returns an integer 1..10000; the attempt succeeds when roll <= rate.
// Order follows the donor: map, target, lure flag, distance, inventory, hidden, then the roll.
function attemptCatch(t: CatchTarget, c: CatchContext, roll: () => number): CatchResult {
  if (c.noCaptureMap || !t.onMap || !t.hasPetEntry) return "refused";
  if (c.flag === "normal" && !t.lureMatchesPet) return "refused";
  if (c.flag === "universal-no-boss" && t.statusImmune) return "refused";
  if (c.distanceMax > 0 && c.distance > c.distanceMax) return "refused";
  if (!c.hasFreeInventorySlot) return "refused";
  if (c.hidden) return "refused";
  const rate = catchRate(t.captureRate, t.hpPct, c.scalePct);
  return roll() <= rate ? "caught" : "missed";
}
