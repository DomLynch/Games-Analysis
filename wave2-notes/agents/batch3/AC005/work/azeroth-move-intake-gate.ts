// Licence: donor is GPL-2.0 (LICENSE file). clean-room sketch of the gate order, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number; }
interface Move { pos: Pos; moving: boolean; rootFlag: boolean; onTransport: boolean; jump: boolean; }
interface Mob { pos: Pos; rooted: boolean; disableMove: boolean; splineDone: boolean; }

// A rule returns true when the move passes. No rules registered means every move passes.
type Rule = (mob: Mob, m: Move) => boolean;

type Verify = { ok: true } | { ok: false; kick: boolean };

const MAP_LIMIT = 533.3333; // donor SIZE_OF_GRIDS: a transport-flagged packet farther than this from the mover is dropped as stale (donor comment: packets from before a teleport)

function dist2d(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Gate order follows the donor: position validity, spline finished, disable-move, jump rule, move rules (kick),
// transport distance, root. Any failure rejects the packet; only a failed rule kicks.
function verifyMove(mob: Mob, m: Move, rules: Rule[], isValid: (p: Pos) => boolean): Verify {
  if (!isValid(m.pos)) return { ok: false, kick: false };
  if (!mob.splineDone) return { ok: false, kick: false };
  if (mob.disableMove && m.moving) return { ok: false, kick: false };
  if (rules.some(r => !r(mob, m))) return { ok: false, kick: true };
  if (m.onTransport && dist2d(m.pos, mob.pos) > MAP_LIMIT) return { ok: false, kick: false };
  if (mob.rooted && (!m.rootFlag || m.moving)) return { ok: false, kick: false };
  return { ok: true };
}

// Accepted packets write the position. An immobile or disable-move mover keeps the server position.
function processMove(
  mob: Mob, m: Move, rules: Rule[], isValid: (p: Pos) => boolean
): { applied: Pos; accepted: boolean; kicked: boolean } {
  const v = verifyMove(mob, m, rules, isValid);
  if (!v.ok) return { applied: mob.pos, accepted: false, kicked: v.kick };
  const applied = mob.disableMove ? mob.pos : m.pos;
  return { applied, accepted: true, kicked: false };
}

export {};
