// Licence: LGPL-3.0 (donor, OpenEnroth). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export interface Vec3 { x: number; y: number; z: number }
export type Tier = 'A' | 'B' | 'C' | 'none';

// Odds set s: [A threshold, B width]. C is the remainder; the donor's third number per set is unused.
const TIER_ODDS: ReadonlyArray<readonly [number, number]> = [[0, 0], [90, 8], [70, 20], [50, 30], [30, 40], [10, 50]];

export function rollTier(oddsSet: number, roll: number): Tier {   // roll in [0, 100)
  if (oddsSet === 0) return 'none';                               // base name, no tier suffix
  const [aMax, bWidth] = TIER_ODDS[Math.min(oddsSet, 5)];
  if (roll < aMax) return 'A';
  if (roll < aMax + bWidth) return 'B';
  return 'C';
}

export interface Encounter {
  min: number; max: number;   // count range, inclusive (ignored when pinned)
  oddsSet: number;            // per-map difficulty, 0-5
  pinned?: Tier;              // fixed-tier entry: one monster, no tier roll
}

// Count for one spawn point: range, then override, then floor of 1 after the multiplier.
export function encounterCount(e: Encounter, rand: (n: number) => number, override: number, multiplier: number): number {
  let n = e.pinned ? 1 : e.min + rand(e.max - e.min + 1);
  if (override) n = override;
  if (n <= 0) return 0;
  return Math.max(1, Math.ceil(n * multiplier));
}

export interface Spawned { tier: Tier; pos: Vec3; aggro: boolean }

// One spawn point. Alert gate first; then count; then one entry per monster, all at the spawn point.
export function spawnEncounter(
  point: { pos: Vec3; alertBit: boolean },
  e: Encounter | null,             // null = empty slot
  alertOn: boolean,
  opts: { catMod: number; override: number; multiplier: number; aggro: boolean },
  rand: (n: number) => number,
): Spawned[] {
  const skip = alertOn ? !point.alertBit : point.alertBit;
  if (skip || e === null) return [];
  const set = Math.min(5, e.oddsSet + opts.catMod);
  const n = encounterCount(e, rand, opts.override, opts.multiplier);
  const out: Spawned[] = [];
  for (let i = 0; i < n; i++) {
    const tier: Tier = e.pinned ?? rollTier(set, rand(100));
    out.push({ tier, pos: point.pos, aggro: opts.aggro });
  }
  return out;
}

// Party-side encounter: up to 100 tries at a random point in a ring around the party; null if none passes.
export function placeEncounter(
  party: Vec3,
  ring: { min: number; span: number },   // outdoor 512 + rand(1024); indoor 256 + rand(512)
  valid: (p: Vec3) => boolean,            // caller's test (outdoor model test, indoor sector and floor)
  rand: (n: number) => number,
): Vec3 | null {
  const STEPS = 2048;                     // angle steps: donor uses TrigLUT.uIntegerDoublePi here (value not read); 2048 is the ring-angle constant at Actor.cpp 4337
  for (let i = 0; i < 100; i++) {
    const d = ring.min + rand(ring.span);
    const a = (rand(STEPS) / STEPS) * 2 * Math.PI;
    const p: Vec3 = { x: party.x + Math.cos(a) * d, y: party.y + Math.sin(a) * d, z: party.z };
    if (valid(p)) return p;
  }
  return null;
}

// Map entry: first visit is 'initial'; a later visit is 'timed' once the interval has passed.
export function respawnDue(lastRespawnDay: number, daysPlayed: number, intervalDays: number, savegameLoad: boolean): 'initial' | 'timed' | 'none' {
  if (lastRespawnDay === 0) return 'initial';
  const interval = savegameLoad ? 0x1baf800 : intervalDays;   // savegame load: effectively never
  return daysPlayed - lastRespawnDay >= interval ? 'timed' : 'none';
}

// Rest roll: chance to meet an encounter, then which one (cumulative chances; the rest goes to 3).
export function restEncounter(encounterChance: number, enc1: number, enc2: number, rand100: () => number): 1 | 2 | 3 | null {
  if (rand100() + 1 > encounterChance) return null;
  const r = rand100() + 1;
  if (r <= enc1) return 1;
  if (r <= enc1 + enc2) return 2;
  return 3;
}
export {};
