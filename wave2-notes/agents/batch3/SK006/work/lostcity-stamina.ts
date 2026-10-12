// Licence: MIT (donor, LostCity LICENSE). Adapted from the mechanism; written as a fresh function, not a line-by-line translation.
// Stamina is stored x100: 10000 = 100.00%.

export const RUN_MAX = 10000;      // donor: runenergy cap
export const RUN_START_MIN = 100;  // donor: temporary run is refused below 100
export const WEIGHT_CAP_KG = 64;   // donor: drain stops getting heavier above 64 kg

export interface CarriedItem {
  weightGrams: number;
  count: number;
  stackable: boolean;
}

// Donor calculateRunWeight: stackable objects are skipped; the rest add weight x count (grams).
export function carriedGrams(items: CarriedItem[]): number {
  let total = 0;
  for (const it of items) {
    if (it.stackable) continue;
    total += it.weightGrams * it.count;
  }
  return total;
}

export interface Stamina {
  energy: number;   // 0..RUN_MAX
  running: boolean; // persistent run switch
  tempRun: boolean; // ctrl-run for this move
}

// One tick, after movement. stepsThisTick: 0 idle, 1 walk, 2 run pace (donor stepsTaken).
// Order: delayed guard, then refill (walk or idle) or drain (run pace), then the zero and below-100 guards.
// delayed: the donor returns at once while the player is delayed (Player.ts 702-704): no refill, no drain, no guards.
export function tickStamina(s: Stamina, stepsThisTick: number, agility: number, grams: number, delayed = false): Stamina {
  if (delayed) return s;
  let energy = s.energy;
  if (stepsThisTick < 2) {
    const recovered = Math.floor(agility / 6) + 8;
    energy = Math.min(energy + recovered, RUN_MAX);
  } else {
    const kg = Math.min(Math.max(grams / 1000, 0), WEIGHT_CAP_KG);
    const loss = Math.trunc(67 + (67 * kg) / 64);
    energy = Math.max(energy - loss, 0);
  }
  let running = s.running;
  let tempRun = s.tempRun;
  if (energy === 0) running = false;            // exhausted: the run switch turns off
  if (energy < RUN_START_MIN) tempRun = false;  // below 1.00%: temporary run is cleared
  return { energy, running, tempRun };
}

export function canStartTempRun(s: Stamina): boolean {
  return s.energy >= RUN_START_MIN;
}

export {};
