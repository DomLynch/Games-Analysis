// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const WINDOW_STEP_S = 300;   // one rolling window step (engine rule)
const MAX_WINDOW_STEPS = 3;  // window never extends past 3 steps (engine rule)

interface DeathWindow {
  expireAtS: number;         // server clock, seconds; 0 = no open window
}

// Call once per death, BEFORE the reclaim delay is read for that death.
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

// Reclaim delay in seconds. `table` is zone data, e.g. [30, 60, 120].
function reclaimDelayS(w: DeathWindow, nowS: number, table: readonly number[]): number {
  const idx = nowS < w.expireAtS - 1
    ? Math.min(Math.floor((w.expireAtS - 1 - nowS) / WINDOW_STEP_S), table.length - 1)
    : 0;
  return table[idx];
}

// Reclaim is refused while (ghostAtS + delay > nowS). Delay is read at reclaim time, as the donor does.
function mayReclaim(w: DeathWindow, ghostAtS: number, nowS: number, table: readonly number[]): boolean {
  return ghostAtS + reclaimDelayS(w, nowS, table) <= nowS;
}

// Durability lost per death: percent of max, at least 1 point, floored like the donor's integer cast.
function durabilityLossOnDeath(maxDurability: number, pct: number): number {
  if (maxDurability <= 0) return 0;
  return Math.max(1, Math.floor(maxDurability * pct));
}

// Smoke values from the donor's own sequence (deaths at 0, 120, 240, 360 s): 30, 60, 120, 120.
const w: DeathWindow = { expireAtS: 0 };
const table = [30, 60, 120];
const seen: number[] = [];
for (const t of [0, 120, 240, 360]) {
  onDeath(w, t);
  seen.push(reclaimDelayS(w, t, table));
}
void seen;
void mayReclaim;
void durabilityLossOnDeath;
export {};
