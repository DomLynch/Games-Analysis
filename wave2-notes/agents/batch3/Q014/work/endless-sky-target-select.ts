// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Foe {
  id: number;
  x: number; y: number;          // world units
  vx: number; vy: number;        // world units per tick
  cost: number;                  // ship price (donor Ship::Strength returns Cost)
  storedStrength: number;        // the foe's stored strength estimate (donor shipStrength)
  disabled: boolean;
  overheated: boolean;
  heatFraction: number;          // 0..1+
  armed: boolean;
  hullPlusShield: number;        // shield fraction + hull fraction, 0..2
  targeters: number;             // count of ships already targeting this foe
  targeterStrength: number;      // decayed crowd sum (see decayCrowd)
  boardedMe: boolean;            // this foe has boarded our side
}

export interface Hunter {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  allyStrength: number;          // summed strength of our allies
  ownCapStrength: number;        // 2 x own stored strength; 0 when daring (no cap)
  previousTargetId: number | null;
}

export const TUNE = {
  lookAheadTicks: 60,
  stickyBonus: 500,
  crowdMinTargeters: 2,          // crowd rules only when more than this many target the foe
  crowdAllyShare: 0.25,
  crowdAllyPenalty: 500,
  crowdOverCost: 2,
  crowdOverPenalty: 500,
  disabledPenalty: 5000,
  unarmedPenalty: 1000,
  unarmedNonPlunderMultiplier: 2,
  scornPenalty: 1000,
  focusPerFraction: 500,
  overheatFloor: 0.9,
  overheatPenalty: 3000,
  capFarRange: 1000,
  aggroRange: 4000,
} as const;

// Decayed crowd sum: first decay (zero below 1), then add each live targeter's strength.
// The donor calls this once per candidate evaluation, so the decay is per evaluation.
export function decayCrowd(current: number, targeterStrengths: number[]): number {
  let s = current < 1 ? 0 : current / 1.05;
  for (const t of targeterStrengths) s += t;
  return s;
}

function distanceAhead(h: Hunter, f: Foe, ticks: number): number {
  const dx = (f.x + ticks * f.vx) - (h.x + ticks * h.vx);
  const dy = (f.y + ticks * f.vy) - (h.y + ticks * h.vy);
  return Math.hypot(dx, dy);
}

// Score a foe: lower is better. Returns null when the foe is not eligible.
export function scoreFoe(h: Hunter, f: Foe): number | null {
  let range = distanceAhead(h, f, TUNE.lookAheadTicks);
  const sticky = f.id === h.previousTargetId;
  if (sticky) range -= TUNE.stickyBonus;

  // A hunter does not chase a much stronger foe beyond the far range, unless the foe is disabled.
  if (h.ownCapStrength > 0 && range > TUNE.capFarRange && !f.disabled
      && f.storedStrength > h.ownCapStrength) return null;

  if (!sticky && f.targeters > TUNE.crowdMinTargeters) {
    if (f.targeterStrength >= TUNE.crowdAllyShare * h.allyStrength) range += TUNE.crowdAllyPenalty;
    if (f.targeterStrength >= TUNE.crowdOverCost * f.cost) range += TUNE.crowdOverPenalty;
  }

  // Non-plunderer branch only (the plunder branch is not sketched).
  if (f.disabled) range += TUNE.disabledPenalty;
  if (!f.armed) range += TUNE.unarmedPenalty * TUNE.unarmedNonPlunderMultiplier;

  if (f.boardedMe) range -= TUNE.scornPenalty;
  range += TUNE.focusPerFraction * f.hullPlusShield;
  if (f.overheated) range += TUNE.overheatPenalty * (f.heatFraction - TUNE.overheatFloor);
  return range;
}

// Lowest score wins. The cutoff is compared with the scored range, not the raw distance.
export function pickTarget(h: Hunter, foes: Foe[], hunting: boolean, minRange: number, maxRange: number): Foe | null {
  let closest = hunting ? Infinity : (minRange > 1000 ? maxRange * 1.5 : TUNE.aggroRange);
  let best: Foe | null = null;
  for (const f of foes) {
    const r = scoreFoe(h, f);
    if (r === null) continue;
    if (r < closest) { closest = r; best = f; }
  }
  return best;
}

// Staggered retarget. slotCount is the 1-based count of present, non-swarming ships so far this step.
// A ship re-picks when its slot comes up (slot and step both masked to 0..31), or when its target is gone.
export function shouldRetarget(slotCount: number, step: number,
    target: { alive: boolean; eligible: boolean } | null): boolean {
  if ((slotCount & 31) === (step & 31)) return true;
  return target === null || !target.alive || !target.eligible;
}
export {};
