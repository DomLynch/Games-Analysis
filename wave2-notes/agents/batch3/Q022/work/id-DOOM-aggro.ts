// Licence: GPL-2.0 per LICENSE.TXT and README.TXT, but the p_enemy.c header says DOOM Source Code License. Conflicting, so treated as unclear. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Actor {
  id: number;
  x: number;
  y: number;
  alive: boolean;
}

interface Mon extends Actor {
  facing: number;            // radians, the direction the monster faces
  target: Actor | null;      // donor actor->target
  threshold: number;         // commit timer: while it runs, damage does not re-aim the monster
  lastLook: number;          // round-robin index over player slots (donor lastlook)
}

const BASE_THRESHOLD = 100;  // donor p_local.h:61 (the source line uses tabs, so no receipt)
const LOOK_BUDGET = 2;       // donor p_enemy.c 520: at most two in-game slots per look
const MELEE_RANGE = 64;      // donor p_enemy.c 548 (MELEERANGE; the define line uses tabs, so no receipt)

interface Sensing {
  dist: (a: Actor, b: Actor) => number;
  sees: (a: Actor, b: Actor) => boolean;
}

// Donor the rear test of P_LookForPlayers (543-548): behind the facing arc counts as a rear target.
function behind(m: Mon, p: Actor): boolean {
  let a = Math.atan2(p.y - m.y, p.x - m.x) - m.facing;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return Math.abs(a) > Math.PI / 2;
}

// Donor P_LookForPlayers (494-553): round-robin over the slots, at most two in-game slots per look.
// allAround = false is the front-arc look used when idle; a rear target inside melee range still counts.
export function lookForPlayers(m: Mon, slots: (Actor | null)[], allAround: boolean, s: Sensing): boolean {
  const n = slots.length;
  if (n === 0) return false;
  const stop = (m.lastLook - 1 + n) % n;
  let seen = 0;
  for (;; m.lastLook = (m.lastLook + 1) % n) {
    const p = slots[m.lastLook];
    if (p === null) continue;                              // slot empty (donor: !playeringame)
    if (seen++ === LOOK_BUDGET || m.lastLook === stop) return false;
    if (!p.alive) continue;
    if (!s.sees(m, p)) continue;
    if (!allAround && behind(m, p) && s.dist(m, p) > MELEE_RANGE) continue;
    m.target = p;
    return true;
  }
}

// Donor P_DamageMobj (904-911): a hit re-aims the monster only when it is not committed to a target.
export function onHit(m: Mon, source: Actor | null): void {
  if (m.threshold === 0 && source !== null && source.id !== m.id) {
    m.target = source;
    m.threshold = BASE_THRESHOLD;
  }
}

// Donor A_Chase (680-690): the commit timer counts down per chase tick and clears at once if the target is dead.
export function chaseTickCommit(m: Mon): void {
  if (m.threshold > 0) {
    if (m.target === null || !m.target.alive) m.threshold = 0;
    else m.threshold--;
  }
}

// Donor A_Look (604-627): an idle monster clears its commit timer and looks only in front.
export function idleLook(m: Mon, slots: (Actor | null)[], s: Sensing): boolean {
  m.threshold = 0;
  return lookForPlayers(m, slots, false, s);
}

// Donor A_Chase (704-713): with no live target it looks all-around; if that finds nothing it goes idle.
export function chaseRetarget(m: Mon, slots: (Actor | null)[], s: Sensing): boolean {
  if (m.target !== null && m.target.alive) return true;
  return lookForPlayers(m, slots, true, s);
}

export {};
