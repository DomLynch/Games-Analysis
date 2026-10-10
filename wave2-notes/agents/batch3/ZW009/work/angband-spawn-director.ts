// Licence: Angband dual licence (GPL-2, or the non-commercial "Angband licence"). Clean-room: shape only, rewritten here.
// Zone population for one level: trickle spawn with a distance gate, depth-based race pick, and cap relief by compaction.

export interface Pos { x: number; y: number; }
export interface Race { name: string; level: number; weight: number; unique: boolean; }
export interface Mon { id: number; level: number; dist: number; unique: boolean; }

export const TUNING = {
  rollOneIn: 500,      // donor: mon-gen:chance (1 in 500 per process_world call)
  minAwayDist: 25,     // donor: player max-sight 20 + 5
  levelMinBase: 14,    // donor: mon-gen:level-min (initial population base)
  maxPerLevel: 1024,   // donor: level-max:monsters
  oodOneIn: 25,        // donor: mon-gen:ood-chance
  oodAmountCap: 10,    // donor: mon-gen:ood-amount
};

// Distance as the donor measures it: longer axis plus half the shorter one.
export function gridDist(a: Pos, b: Pos): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dy > dx ? dy + Math.floor(dx / 2) : dx + Math.floor(dy / 2);
}

// Weighted pick among races at or below maxLevel.
function draw(races: Race[], maxLevel: number, rand: () => number): Race | null {
  const pool = races.filter((r) => r.level <= maxLevel);
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  if (total <= 0) return null;
  let roll = rand() * total;
  for (const r of pool) {
    roll -= r.weight;
    if (roll < 0) return r;
  }
  return pool[pool.length - 1];
}

// Depth pick: rare out-of-depth boost, then up to two extra draws that keep the deeper race.
export function pickRaceForDepth(races: Race[], depth: number, rand: () => number): Race | null {
  let genLevel = depth;
  if (Math.floor(rand() * TUNING.oodOneIn) === 0) {
    genLevel += Math.min(Math.floor(genLevel / 4) + 2, TUNING.oodAmountCap);
  }
  let best = draw(races, genLevel, rand);
  const p = Math.floor(rand() * 100);
  if (p < 60) {
    const again = draw(races, genLevel, rand);
    if (best && again && again.level >= best.level) best = again;
  }
  if (p < 10) {
    const third = draw(races, genLevel, rand);
    if (best && third && third.level >= best.level) best = third;
  }
  return best;
}

// Random empty cell at least minAwayDist from the player, up to `attempts` tries.
export function pickFarEmptyCell(
  width: number, height: number, player: Pos,
  isEmpty: (p: Pos) => boolean, rand: () => number, attempts = 10000,
): Pos | null {
  for (let i = 0; i < attempts; i++) {
    const p = { x: Math.floor(rand() * width), y: Math.floor(rand() * height) };
    if (!isEmpty(p)) continue;
    if (gridDist(p, player) > TUNING.minAwayDist) return p;
  }
  return null;
}

// One trickle roll (donor: called once per process_world, every 10 game turns).
export function trickleRoll(
  races: Race[], depth: number, width: number, height: number, player: Pos,
  isEmpty: (p: Pos) => boolean, rand: () => number,
): { cell: Pos; race: Race } | null {
  if (Math.floor(rand() * TUNING.rollOneIn) !== 0) return null;
  const cell = pickFarEmptyCell(width, height, player, isEmpty, rand);
  if (!cell) return null;
  const race = pickRaceForDepth(races, depth, rand);
  return race ? { cell, race } : null;
}

// Cap relief: relaxing passes. Pass k spares monsters above level 5k and nearer than 5*(20-k).
// Each eligible monster gets a saving throw (90 percent, uniques 99 percent).
export function compactForCap(mons: Mon[], num: number, rand: () => number): number {
  if (mons.length === 0) return 0;
  const removed = new Set<number>();
  let deleted = 0;
  for (let iter = 1; deleted < num && iter < 1000; iter++) {
    const maxLevel = 5 * iter;
    const minDist = 5 * (20 - iter);
    for (const m of mons) {
      if (removed.has(m.id)) continue;
      if (m.level > maxLevel) continue;
      if (minDist > 0 && m.dist < minDist) continue;
      const save = m.unique ? 99 : 90;
      if (Math.floor(rand() * 100) < save) continue;
      removed.add(m.id);
      deleted++;
    }
  }
  return deleted;
}

// Initial population for a generated level: base plus 1d8 plus a depth term k (k = clamp(depth/3, 2, 10)).
export function initialPopulation(depth: number, rand: () => number): number {
  const k = Math.max(Math.min(Math.floor(depth / 3), 10), 2);
  return TUNING.levelMinBase + (1 + Math.floor(rand() * 8)) + k;
}

export {}
