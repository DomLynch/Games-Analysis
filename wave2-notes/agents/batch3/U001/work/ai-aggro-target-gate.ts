// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type FocusMode = 'none' | 'aggressor' | 'strongest' | 'weakest' | 'closest';

export interface Foe {
  id: string;
  x: number;
  y: number;
  hits: number;
  hitsMax: number;
  alive: boolean;
  inLos: boolean;
  hostile: boolean;   // combatant, aggressor or aggressed toward this creature (used by the aggressor-mode filter)
  enemy: boolean;     // donor IsEnemy(m) && CanBeHarmful(m, false); gates the approach pull (a stranger can qualify)
  tactics: number;
  str: number;
}

export interface Brain {
  x: number;
  y: number;
  mode: FocusMode;
  perception: number;    // scan range in tiles (donor default 16)
  nextScanAt: number;    // ms; the scan gate
  combatant: Foe | null;
  focus: Foe | null;
}

export interface Tuning {
  reacquireMs: number;   // ambient scan period (donor 10 s)
  approachMs: number;    // delay after an enemy steps into approach range (donor 2 s; elite 0)
  approachRange: number; // tiles (donor 10)
  leashMult: number;     // chase leash = perception x this (donor 2)
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

// Higher is preferred. The donor's "strongest" weight is not used here (see decision).
export function rank(mode: FocusMode, b: Brain, f: Foe): number {
  if (mode === 'weakest') return -f.hits;
  return -dist(b.x, b.y, f.x, f.y); // closest, the default
}

// Ambient scan. Blocked while the gate is in the future by at most one period; otherwise the best ranked
// visible hostile in range wins (strict greater-than keeps the first seen on a tie). The gate re-arms
// to a full period after every scan, found or not.
export function scan(b: Brain, foes: Foe[], now: number, t: Tuning, hasAggressor: boolean): boolean {
  if (b.mode === 'none') { b.focus = null; return false; }
  if (b.mode === 'aggressor' && !hasAggressor) { b.focus = null; return false; }
  const remaining = b.nextScanAt - now;
  if (remaining > 0 && remaining <= t.reacquireMs) { b.focus = null; return false; }

  let best: Foe | null = null;
  let bestVal = -Infinity;
  for (const f of foes) {
    if (!f.alive || !f.inLos || dist(b.x, b.y, f.x, f.y) > b.perception) continue;
    if (b.mode === 'aggressor' && !f.hostile) continue;
    const v = rank(b.mode, b, f);
    if (v > bestVal) { bestVal = v; best = f; }
  }
  b.focus = best;
  b.nextScanAt = now + t.reacquireMs;
  return best !== null;
}

// An enemy stepping inside approach range pulls the next scan to at most approachMs away.
// The deadline only moves earlier. Zero means "think now" (returned as true).
export function onEnemyStep(b: Brain, foe: Foe, now: number, t: Tuning, approachMs: number): boolean {
  if (b.combatant !== null || b.mode === 'none' || b.mode === 'aggressor') return false;
  if (!foe.enemy || dist(b.x, b.y, foe.x, foe.y) > t.approachRange) return false;
  const deadline = now + approachMs;
  if (deadline < b.nextScanAt) b.nextScanAt = deadline;
  return approachMs <= 0;
}

// Someone hit this creature: a free creature takes the attacker; a closer visible one takes over.
export function onAggressed(b: Brain, attacker: Foe): void {
  if (b.combatant === null) { b.combatant = attacker; return; }
  if (b.combatant !== attacker && dist(b.x, b.y, attacker.x, attacker.y) < dist(b.x, b.y, b.combatant.x, b.combatant.y)) {
    b.combatant = attacker;
  }
}

// Out of perception range: rescan. If nothing is found and the combatant is beyond the leash, drop it.
export function keepCombatant(b: Brain, foes: Foe[], now: number, t: Tuning, hasAggressor: boolean): 'chase' | 'drop' {
  const c = b.combatant;
  if (c === null) return 'drop';
  if (dist(b.x, b.y, c.x, c.y) <= b.perception) return 'chase';
  if (scan(b, foes, now, t, hasAggressor) && b.focus !== null) { b.combatant = b.focus; return 'chase'; }
  if (dist(b.x, b.y, c.x, c.y) > b.perception * t.leashMult) { b.combatant = null; return 'drop'; }
  return 'chase';
}

// Flee check at each think: at or below the threshold, a roll against the chance. Duration 10 to 39 s in the donor (Utility.Random(10, 30) is 10 + Next(30)); not modelled here.
export function shouldFlee(hits: number, hitsMax: number, threshold: number, chance: number, rand: () => number): boolean {
  if (hits / hitsMax > threshold) return false;
  return rand() < chance;
}
