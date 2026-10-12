// clean-room sketch of two Daggerfall Unity mechanisms (MIT donor): a weighted rumour pick and a quest timer
interface Rng { range(lo: number, hi: number): number; } // integer in [lo, hi)

// questId 0 = ambient rumour. timeLimit null = no expiry (the fix for quest rumours; see section 6).
interface Rumour { questId: number; text: string; timeLimit: number | null; }

// One-pass weighted pick: quest rumours weigh questWeight, ambient rumours weigh 1.
// Each element replaces the selection with probability weight / (total + weight).
function pickRumour(valid: Rumour[], questWeight: number, rng: Rng): Rumour | undefined {
  if (valid.length === 0) return undefined;
  let total = 0;
  let selected = valid[0];
  for (const r of valid) {
    const w = r.questId !== 0 ? questWeight : 1;
    const roll = rng.range(0, total + w);
    if (roll >= total) selected = r;
    total += w;
  }
  return selected;
}

// Expiry: drop only rumours that have a time limit and whose limit is past (classic minutes).
function refreshRumours(list: Rumour[], nowClassic: number): Rumour[] {
  return list.filter(r => r.timeLimit === null || r.timeLimit >= nowClassic);
}

// Quest timer: counts down in world seconds, fires once. Travel time as in the donor: each place is floored to one day,
// the per-place seconds are summed, then the total is multiplied by 2.5 once (no floor after the multiplier).
const RETURN_TRIP = 2.5;
const ONE_DAY_MINUTES = 1440;

function travelSeconds(placeMinutes: number[]): number {
  let total = 0;
  for (const m of placeMinutes) total += Math.max(m, ONE_DAY_MINUTES) * 60;
  return Math.trunc(total * RETURN_TRIP);
}

interface Timer {
  remaining: number;
  enabled: boolean;
  finished: boolean;
  lastSample: number;
  fire: () => void;
}

function startTimer(t: Timer, nowSeconds: number): void {
  if (t.enabled || t.finished) return;
  t.enabled = true;
  t.lastSample = nowSeconds;
}

function tickTimer(t: Timer, nowSeconds: number): void {
  if (!t.enabled || t.finished) return;
  const elapsed = Math.floor(nowSeconds - t.lastSample); // donor: whole seconds
  t.remaining -= elapsed;
  if (t.remaining <= 0) {
    t.fire();
    t.enabled = false;
    t.finished = true;
    t.remaining = 0;
  }
  t.lastSample = nowSeconds;
}

export {};
