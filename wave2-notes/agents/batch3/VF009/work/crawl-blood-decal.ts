// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Tile {
  bloody: boolean;
  surface: "floor" | "wall" | "liquid" | "fountain" | "goodAltar" | "sanctuary";
}
export interface Grid {
  w: number;
  h: number;
  tiles: Tile[];
}
export interface Rng {
  int(n: number): number; // uniform integer 0..n-1
}

const at = (g: Grid, x: number, y: number): Tile => g.tiles[y * g.w + x];
const inside = (g: Grid, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < g.w && y < g.h;

function eight(x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (dx !== 0 || dy !== 0) out.push([x + dx, y + dy]);
  return out;
}

// True with probability x / y; always true when x >= y; never when x <= 0.
function chanceIn(rng: Rng, x: number, y: number): boolean {
  if (x <= 0) return false;
  if (x >= y) return true;
  return rng.int(y) < x;
}

// May this tile take a blood mark? (surface exclusions and not already bloody)
function mayBleed(g: Grid, x: number, y: number): boolean {
  if (!inside(g, x, y)) return false;
  const t = at(g, x, y);
  if (t.bloody) return false;
  return t.surface === "floor" || t.surface === "wall";
}

// Donor: _maybe_bloodify_square. One roll with chance amount/20 decides the
// centre tile; the eight neighbours then get amount/15 with no further spread.
export function bloodifySquare(
  g: Grid, rng: Rng, x: number, y: number, amount: number, spatter: boolean,
): void {
  if (amount < 1) return;
  if (!chanceIn(rng, amount, 20)) return;
  if (mayBleed(g, x, y)) at(g, x, y).bloody = true;
  if (spatter) {
    for (const [nx, ny] of eight(x, y)) {
      if (inside(g, nx, ny)) bloodifySquare(g, rng, nx, ny, Math.floor(amount / 15), false);
    }
  }
}

// Donor: _spatter_neighbours. Each free neighbour is marked with chance 1/chance;
// a marked tile spreads again with chance + 1, so clusters shrink as they grow.
function spatterNeighbours(g: Grid, rng: Rng, x: number, y: number, chance: number): void {
  for (const [nx, ny] of eight(x, y)) {
    if (!mayBleed(g, nx, ny)) continue;
    if (chanceIn(rng, 1, chance)) {
      at(g, nx, ny).bloody = true;
      spatterNeighbours(g, rng, nx, ny, chance + 1);
    }
  }
}

// Donor: generate_random_blood_spatter_on_level. Cluster count 7..15 and the
// start chance range change with the cluster count (see the donor comments).
export function levelSplatter(g: Grid, rng: Rng): void {
  const clusters = 7 + rng.int(9);
  let minProb = 1;
  let maxProb = 4;
  if (clusters < 10) maxProb--;
  else if (clusters > 12) minProb++;
  for (let i = 0; i < clusters; i++) {
    const x = rng.int(g.w);
    const y = rng.int(g.h);
    const startProb = minProb + rng.int(maxProb);
    if (mayBleed(g, x, y)) at(g, x, y).bloody = true;
    spatterNeighbours(g, rng, x, y, startProb);
  }
}

// Donor: blood_spray. Each drop picks a radius 1..maxRanged and tries random
// offsets (5000 tries shared by the whole spray) until one is visible.
export function bloodSpray(
  g: Grid, rng: Rng, ox: number, oy: number, level: number,
  visible: (x: number, y: number) => boolean, maxRanged = 8,
): void {
  let tries = 0;
  for (let i = 0; i < level; i++) {
    const range = rng.int(maxRanged) + 1;
    while (tries < 5000) {
      tries++;
      const x = ox + rng.int(2 * range + 1) - range;
      const y = oy + rng.int(2 * range + 1) - range;
      if (inside(g, x, y) && visible(x, y)) {
        bloodifySquare(g, rng, x, y, 99, false);
        break;
      }
    }
  }
}

export interface BloodJob { x: number; y: number; kind: string; amount: number; }

// Donor: _schedule_final_effect plus fire_final_effects. Blood jobs are queued
// until the action ends; a job with the same tile and kind absorbs the new amount.
export class FinalEffects {
  private jobs: BloodJob[] = [];

  scheduleBlood(x: number, y: number, kind: string, amount: number): void {
    const same = this.jobs.find((j) => j.x === x && j.y === y && j.kind === kind);
    if (same) same.amount += amount;
    else this.jobs.push({ x, y, kind, amount });
  }

  // Pops from the back and removes the job before firing, so nothing can merge into it.
  fire(g: Grid, rng: Rng): void {
    while (this.jobs.length > 0) {
      const job = this.jobs.pop()!;
      bloodifySquare(g, rng, job.x, job.y, job.amount, true);
    }
  }
}

// Donor: attack::handle_phase_damaged. The blood amount is the damage, capped at
// the defender's HP before the hit lands, and it is queued before the damage is applied.
export function onHitLanded(
  q: FinalEffects, x: number, y: number, kind: string,
  damage: number, hpBeforeHit: number, defenderHasBlood: boolean,
): void {
  if (!defenderHasBlood) return;
  const blood = Math.min(damage, hpBeforeHit);
  if (blood > 0) q.scheduleBlood(x, y, kind, blood);
}
export {};
