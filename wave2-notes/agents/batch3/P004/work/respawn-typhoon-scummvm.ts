// Licence of donor: GPL-3.0-or-later. clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Rng { int(lo: number, hi: number): number; } // inclusive bounds
type Schedule = (atMs: number, run: () => void) => void;

interface Head { alive: boolean; }
interface Fight {
  id: number;
  level: number;
  leaves: number;     // hit budget; the fight ends when it reaches 0
  active: boolean;
  heads: Head[];
}

// Respawn window in ms for a downed head, by fight level (the donor's bands).
function respawnWindow(level: number): { min: number; max: number } {
  const min = level <= 21 ? 15000 - 500 * (level - 1)
    : level === 22 ? 4600
    : level <= 25 ? 4200 - 200 * (level - 23)
    : level === 26 ? 3700
    : 3600 - 200 * (level - 27);
  const max = level <= 21 ? 20000 - 500 * (level - 1) : 9600 - 200 * (level - 22);
  return { min: Math.max(0, min), max: Math.max(0, max) }; // the floor at 0 is added here
}

// A head is hit: it goes down at once. Its respawn is scheduled after the die animation,
// in a random time from the window of the level read at the hit.
// Returns true if this hit took the last head down, which ends the fight.
function hitHead(f: Fight, i: number, now: number, dieAnimMs: number, rng: Rng, schedule: Schedule): boolean {
  if (!f.active || !f.heads[i].alive) return false;
  f.heads[i].alive = false;
  const w = respawnWindow(f.level);
  schedule(now + dieAnimMs + rng.int(w.min, w.max), () => respawn(f, i, f.id));
  if (f.heads.every((h) => !h.alive)) {
    f.active = false;
    return true;
  }
  return false;
}

// A stale timer from an earlier fight does nothing (the sketch checks the fight id; the donor
// checks only the head and the fight-over flag).
function respawn(f: Fight, i: number, fightId: number): void {
  if (f.id !== fightId || !f.active || f.heads[i].alive) return;
  f.heads[i].alive = true;
}

// Each projectile that hits the hero costs one leaf; at zero the fight ends.
function projectileHit(f: Fight): void {
  f.leaves -= 1;
  if (f.leaves <= 0) f.active = false;
}

// Volley size grows by one every ten levels.
function volleySize(level: number): number {
  return Math.floor((level - 1) / 10) + 1;
}

// Attack cycle: 3 in 4 a plain animation; otherwise one of two volley animations, chosen by a coin flip.
// The volleys launch from x 456 or x 220 (typhoon.cpp 112-122).
function pickAttack(rng: Rng): "plain" | "volley-220" | "volley-456" {
  if (rng.int(0, 3) !== 0) return "plain";
  return rng.int(0, 1) === 1 ? "volley-456" : "volley-220";
}

function hitChanceFor(level: number): number {
  if (level >= 26) return 6;
  if (level >= 17) return 5;
  if (level >= 12) return 4;
  if (level >= 7) return 3;
  return 2;
}

// A value in [0, hc] is drawn and 0 means miss, so P(miss) = 1 / (hc + 1).
function rollMiss(level: number, rng: Rng): boolean {
  return rng.int(0, hitChanceFor(level)) === 0;
}

// Flight time in ms: (41 - level) * 100, floored at 0 (the donor has no floor).
function flightMs(level: number): number {
  return Math.max(0, (41 - level) * 100);
}
