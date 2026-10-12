// Licence of donor: GPL-3.0. Clean-room sketch written from the described mechanism (score race and its constants), not a translation of the donor lines.
// clean-room

export interface LeashInputs {
  distToTargetSq: number;          // squared distance to the current target, metres
  distToAnchorSq: number;          // squared distance to the leash anchor (spawn/patrol point), metres
  ownHealthFrac: number;           // 0..1
  targetHealthFrac: number;        // 0..1
  secondsSinceLastHitByTarget: number; // FIX: donor passes seconds since target was selected
  fleeHealth: number;              // row field, 0..1, 0 = never flees
  aggroDist: number | null;        // row field, metres, null = always aggressive once detected
  sightDist: number;               // row field, metres
  shouldStopPursuing: boolean;     // row field; false = never breaks off (bosses/roamers)
}

// Engine constants (donor values; fixed rule of the engine, not per row).
const ESCAPE_K = 0.005;     // weight of the let-go score
const PURSUE_K = 100;       // weight of the keep-chasing score
const FLEE_FLOOR = 0.25;    // donor: aggression uses 1 / max(flee, 0.25)
const HEALTH_FLOOR = 0.01;  // FIX: donor divides by the raw health fraction, so 0 gives Infinity
const DIST_FLOOR_SQ = 1e-6; // FIX: guard against division by zero distance

export function shouldBreakOff(i: LeashInputs): boolean {
  if (!i.shouldStopPursuing) return false;

  const own = Math.max(i.ownHealthFrac, HEALTH_FLOOR);
  const tgt = Math.max(i.targetHealthFrac, HEALTH_FLOOR);
  const dist = Math.max(i.distToTargetSq, DIST_FLOOR_SQ);

  // Keep-chasing score: rises for low-flee (brave) rows, sight/aggro range, and falls with distance and target health.
  const aggression = (1 / Math.max(i.fleeHealth, FLEE_FLOOR)) * (i.aggroDist ?? i.sightDist) * i.sightDist;
  const pursue = (PURSUE_K * aggression) / (dist * tgt);

  // Let-go score: rises with distance from the anchor, time since the last hit, and falls as own health rises.
  const escape = (i.distToAnchorSq / own) * i.secondsSinceLastHitByTarget * ESCAPE_K;

  return escape > pursue;
}

export {};
