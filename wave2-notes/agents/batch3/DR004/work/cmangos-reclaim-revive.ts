// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const WINDOW_STEP_S = 300;   // one rolling window step (engine rule)
const MAX_WINDOW_STEPS = 3;  // window never extends past 3 steps (engine rule)

interface DeathWindow { expireAtS: number; } // server clock, seconds; 0 = no open window

// Call once per death, before the delay is read for that death.
function onDeath(w: DeathWindow, nowS: number): void {
  if (nowS < w.expireAtS) {
    const stepsLeft = Math.floor((w.expireAtS - nowS) / WINDOW_STEP_S) + 1;
    w.expireAtS = stepsLeft < MAX_WINDOW_STEPS
      ? nowS + (stepsLeft + 1) * WINDOW_STEP_S
      : nowS + MAX_WINDOW_STEPS * WINDOW_STEP_S;
  } else {
    w.expireAtS = nowS + WINDOW_STEP_S;
  }
}

// Delay tier. The donor clamps `now` to the window end first, so an expired window reads tier 0.
// Fix: the donor has no -1 on the remaining time, so a lone death read in the same whole second
// as its window start (remaining = 300) picks tier 1 (60 s). Subtract one second, as the azerothcore donor does.
function reclaimDelayS(w: DeathWindow, nowS: number, table: readonly number[]): number {
  const now = Math.min(nowS, w.expireAtS);
  const idx = Math.min(Math.floor((w.expireAtS - 1 - now) / WINDOW_STEP_S), table.length - 1);
  return table[Math.max(0, idx)];
}

// Who may revive a ghost, and when. The donor gates only the ghost's own reclaim.
// A healer's resurrect request (EffectResurrect -> AddResurrectRequest -> CMSG_RESURRECT_RESPONSE)
// is not gated in the donor. `gateRequests` = true is the proposed Frankendom fix; false matches the donor.
type ReviveSource = "self-reclaim" | "healer-request";
function mayRevive(src: ReviveSource, w: DeathWindow, ghostAtS: number, nowS: number, table: readonly number[], gateRequests: boolean): boolean {
  if (src === "self-reclaim" || gateRequests) {
    return ghostAtS + reclaimDelayS(w, nowS, table) <= nowS;
  }
  return true;
}

// Durability per death: percent of max, floored, at least 1 point. Items with a per-spell
// opt-out (the donor's SPELL_ATTR_EX3_NO_DURABILITY_LOSS) skip the hit. The percent is zone data (donor hardcodes 0.10).
function durabilityLossOnDeath(maxDurability: number, pct: number, spellOptOut: boolean): number {
  if (spellOptOut || maxDurability <= 0) return 0;
  return Math.max(1, Math.floor(maxDurability * pct));
}

// Smoke values from the donor's sequence (deaths at 0, 120, 240, 360 s, read at the death second).
const w: DeathWindow = { expireAtS: 0 };
const table = [30, 60, 120];
const seen: number[] = [];
for (const t of [0, 120, 240, 360]) {
  onDeath(w, t);
  seen.push(reclaimDelayS(w, t, table));
}
void seen;
void mayRevive;
void durabilityLossOnDeath;
export {};
