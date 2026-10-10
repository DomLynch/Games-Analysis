// Licence of donor: MIT (Daggerfall Workshop, 2009-2023). Adaptable; this sketch is shape-only.
interface Cand {
  isPlayer: boolean;
  alive: boolean;
  seen: boolean;          // line of sight from the monster to the candidate
  inClassicArea: boolean; // monsters only: in the area around the player
  dist: number;
  hasTarget: boolean;     // monsters only: already targeting someone
  hostile: boolean;       // false when pacified or in no-target mode
}

// Donor priority: +5 free monster, +10 seen, distance term 30 - dist (clamped at 0).
function priority(c: Cand): number {
  let p = 0;
  if (!c.isPlayer && !c.hasTarget) p += 5;
  if (c.seen) p += 10;
  p += Math.max(0, 30 - c.dist);
  return p;
}

// Best and second-best candidates. Ties keep the earlier candidate (strict comparison).
function pickTargets(cands: Cand[]): { best: Cand | null; second: Cand | null } {
  let best: Cand | null = null;
  let second: Cand | null = null;
  let bp = -1;
  let sp = -1;
  for (const c of cands) {
    if (!c.alive) continue;
    if (c.isPlayer && !c.hostile) continue;
    if (!c.isPlayer && !c.inClassicArea && !c.seen) continue; // unseen monsters outside the area are rejected
    const p = priority(c);
    if (p > bp) { second = best; sp = bp; best = c; bp = p; }
    else if (p > sp) { second = c; sp = p; }
  }
  return { best, second };
}

const GIVE_UP_START = 200;  // give-up timer, classic flag ticks

// Refresh on detection; otherwise count down on classic flag ticks only.
function giveUpStep(timer: number, detected: boolean, classicUpdate: boolean): number {
  if (detected) return GIVE_UP_START;
  if (classicUpdate && timer > 0) return timer - 1;
  return timer;
}

// Stealth chance as in the donor: 2 * ((dist in game units) * skill >> 10). The roll itself is a parameter (Dice100.FailedRoll not read).
function stealthChance(distUnits: number, skill: number): number {
  return 2 * ((Math.trunc(distUnits) * skill) >> 10);
}

export {};
