// Licence: Apache-2.0 (donor LICENSE, root of the repo). Adapted shape, written from the mechanism.
const L2_CYCLE_NUMERATOR = 500000; // donor: attack cycle ms = 500000 / pAtkSpd, floored at 100 ms
const MIN_CYCLE_MS = 100;

// Full attack cycle in ms for an attack-speed stat.
function attackCycleMs(attackSpeed: number): number {
  return Math.max(MIN_CYCLE_MS, L2_CYCLE_NUMERATOR / Math.max(1, attackSpeed));
}

// Animator speed multiplier that plays the whole swing clip over exactly one cycle.
// Donor: ComputeLinearPAtkSpeed(clipLengthSec, cycleMs) = clipLengthSec * 1000 / max(1, cycleMs).
function clipRate(clipLengthS: number, cycleMs: number): number {
  return (clipLengthS * 1000) / Math.max(1, cycleMs);
}

// Real time (ms after the attack starts) at which a clip event at clipEventS fires.
function eventRealMs(clipEventS: number, clipLengthS: number, cycleMs: number): number {
  return (clipEventS / clipRate(clipLengthS, cycleMs)) * 1000;
}

// Where the clip is at elapsed attack time, in clip seconds, capped at the clip end.
function clipTimeAt(elapsedMs: number, clipLengthS: number, cycleMs: number): number {
  return Math.min(clipLengthS, (elapsedMs / 1000) * clipRate(clipLengthS, cycleMs));
}

// Hit moment in ms: the cycle times the weapon fraction (donor: melee 0.5, bow 0.82).
function hitMomentMs(cycleMs: number, hitFraction: number): number {
  return cycleMs * hitFraction;
}

// A clip whose hit event sits at hitFraction of its own length fires at hitMomentMs.
// This is the rule the sketch checks: the hit lands at the engine's time, not the clip's.
function hitEventRealMs(clipLengthS: number, cycleMs: number, hitFraction: number): number {
  return eventRealMs(clipLengthS * hitFraction, clipLengthS, cycleMs);
}

export {};
