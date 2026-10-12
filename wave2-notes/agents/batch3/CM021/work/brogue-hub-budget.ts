// Licence: AGPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface BudgetCfg { multiplier: number; offset: number; increase: number; deepestLevel: number; bonusMaxLevel: number; }
interface BudgetState { built: number; }  // hubs actually placed so far; a failed attempt does not count

// How many hub attempts this zone level gets. A deficit from earlier levels carries forward,
// because `built` only counts hubs that were placed.
function hubsToAttempt(depth: number, s: BudgetState, cfg: BudgetCfg, rnd: () => number): number {
  let pending = 0;
  if (depth <= cfg.deepestLevel) {
    while ((s.built + pending) * cfg.multiplier + cfg.offset < depth * cfg.increase) pending++;
  }
  // Extra hubs: a 40% first roll on the shallowest levels while none exist yet, else 15%, then 15% per extra roll.
  let pct = depth <= cfg.bonusMaxLevel && s.built + pending === 0 ? 0.4 : 0.15;
  while (rnd() < Math.max(pct, 0.15 * cfg.increase) && pending < 100) {
    pending++;
    pct = 0.15;
  }
  return pending;
}

interface Cell { x: number; y: number; }
interface Feature { minCount: number; maxCount: number; personalSpace: number; }

const cellKey = (x: number, y: number): string => `${x},${y}`;

// Place features one at a time. Each instance takes one random candidate, never retries it,
// then removes the square of side (2 * personalSpace - 1) around it from the candidates.
function placeOneAtATime(candidates: Map<string, Cell>, occupied: Set<string>, feats: Feature[], rnd: () => number): Cell[] {
  const placed: Cell[] = [];
  for (const f of feats) {
    const count = f.minCount + Math.floor(rnd() * (f.maxCount - f.minCount + 1));
    let done = 0;
    while (done < count && candidates.size > 0) {
      const keys = [...candidates.keys()];
      const pick = candidates.get(keys[Math.floor(rnd() * keys.length)]) as Cell;
      candidates.delete(cellKey(pick.x, pick.y));
      placed.push(pick);
      done++;
      const r = f.personalSpace - 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const k = cellKey(pick.x + dx, pick.y + dy);
          candidates.delete(k);
          occupied.add(k);
        }
      }
    }
  }
  return placed;
}

// Demo: Park-Miller generator, so the run is repeatable.
let seed = 7;
const rnd = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const cfg: BudgetCfg = { multiplier: 4, offset: 2, increase: 1, deepestLevel: 26, bonusMaxLevel: 2 };
const state: BudgetState = { built: 0 };
const schedule: number[] = [];
for (let depth = 1; depth <= 12; depth++) {
  const n = hubsToAttempt(depth, state, cfg, rnd);
  schedule.push(n);
  state.built += n; // assumes every attempt succeeds
}
console.log("attempts per depth:", schedule.join(" "));

const cands = new Map<string, Cell>();
for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) cands.set(cellKey(x, y), { x, y });
const placed = placeOneAtATime(cands, new Set<string>(), [
  { minCount: 1, maxCount: 1, personalSpace: 2 },
  { minCount: 2, maxCount: 3, personalSpace: 2 },
], rnd);
console.log("placed:", placed.length);
