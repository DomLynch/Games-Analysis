// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Vec { x: number; y: number; }
interface Body { pos: Vec; vel: Vec; }

interface Foe extends Body {
  id: string;
  strength: number;          // cost-based strength of the foe
  armed: boolean;
  shieldFraction: number;    // 0..1
  hullFraction: number;      // 0..1
  heat: number;              // 0..1
  overheated: boolean;
  targeterCount: number;     // how many of our side already target this foe
  targeterStrength: number;  // summed strength of those attackers
}

interface Attacker extends Body {
  minRange: number;          // shortest non-special weapon range, px
  maxRange: number;          // longest non-special weapon range, px
  hunting: boolean;
  plunders: boolean;
  alliedStrength: number;    // strength of our side in the system
  previousTargetId?: string;
}

// Numbers as read in the donor (AI.cpp 1617-1703, 348-361, 771-773, 898).
const PREDICT_FRAMES = 60;            // "a second from now" at 60 FPS
const PREFERRED_BONUS = -500;         // previous target scores 500 closer
const OVER_TARGET_PENALTY = 500;      // applied at most twice
const UNARMED_WEIGHT = 1000;          // times (1 + !plunders)
const NEARLY_DEAD_WEIGHT = 500;       // times (shield + hull fraction)
const OVERHEAT_WEIGHT = 3000;         // times (heat - 0.9), only when overheated
const DEFAULT_REACH = 4000;           // reach for short-range, non-hunting ships
const LONG_RANGE_CUTOFF = 1000;

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function ahead(b: Body, frames: number): Vec {
  return { x: b.pos.x + frames * b.vel.x, y: b.pos.y + frames * b.vel.y };
}

// Lowest score wins. The score is a distance in px plus penalties and bonuses.
export function pickTarget(self: Attacker, foes: Foe[]): string | undefined {
  const reach = self.minRange > LONG_RANGE_CUTOFF ? self.maxRange * 1.5 : DEFAULT_REACH;
  let best: string | undefined;
  let bestScore = reach; // a foe must score below the reach to be chosen
  for (const foe of foes) {
    const preferred = foe.id === self.previousTargetId;
    let score = dist(ahead(foe, PREDICT_FRAMES), ahead(self, PREDICT_FRAMES));
    if (preferred) score += PREFERRED_BONUS;
    if (!preferred && foe.targeterCount > 2) {
      if (foe.targeterStrength >= 0.25 * self.alliedStrength) score += OVER_TARGET_PENALTY;
      if (foe.targeterStrength >= 2 * foe.strength) score += OVER_TARGET_PENALTY;
    }
    if (!foe.armed) score += UNARMED_WEIGHT * (self.plunders ? 1 : 2);
    score += NEARLY_DEAD_WEIGHT * (foe.shieldFraction + foe.hullFraction);
    if (foe.overheated) score += OVERHEAT_WEIGHT * (foe.heat - 0.9);
    if (score < bestScore) { bestScore = score; best = foe.id; }
  }
  return best;
}

// Retarget gate. step is the AI step counter (0..63); ordinal is this ship's index among
// eligible ships in list order. Donor: a ship retargets when (ordinal+1)&31 equals step&31,
// or when it has no target or the target is gone.
export function retargetDue(step: number, ordinal: number, targetGone: boolean): boolean {
  return ((ordinal + 1) & 31) === (step & 31) || targetGone;
}

// Flee rule from ShouldFlee: low health (coward raises the bar) or no ammo, unless daring.
export function shouldFlee(healthFraction: number, coward: boolean, daring: boolean, needsAmmo: boolean): boolean {
  const lowHealth = healthFraction < 0.25 + 0.25 * (coward ? 1 : 0);
  if (!daring && lowHealth) return true;
  return needsAmmo;
}

export {};
