// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface Health { current: number; maximum: number; baseMax: number; }

// Donor nametag ranges (hud/mod.rs 228-235), donor units
const NAMETAG_GROUP_RANGE = 1000;
const NAMETAG_RANGE = 40;
const NAMETAG_DMG_RANGE = 120;
const NAMETAG_DMG_TIME = 60; // seconds

const HEALTH_EPS = 1e-3;

interface FrameInput {
  isSelf: boolean;
  isTargeted: boolean;
  isSelected: boolean;
  isGrouped: boolean;
  isMarked: boolean;
  health?: Health;            // undefined = no health component
  distance: number;
  secondsSinceHitByMe?: number;
}

// Donor should_show_healthbar (overhead.rs 82-84): current away from maximum, or below base max
function shouldShowHealthbar(h: Health): boolean {
  return Math.abs(h.current - h.maximum) > HEALTH_EPS || h.current < h.baseMax;
}

// Donor decayed_health_displayed (overhead.rs 87-89): the lost share of base max
function decayedFraction(h: Health): number {
  return 1 - h.maximum / h.baseMax;
}

// Donor frame gate (hud/mod.rs 2456-2478): own entity never; otherwise targeted, selected, hurt, grouped or marked,
// inside a range that is wider for groups and for a few seconds after you hit it.
function frameVisible(f: FrameInput): boolean {
  if (f.isSelf) return false;
  const hurtOrUnknown = f.health ? shouldShowHealthbar(f.health) : true;
  const gate = f.isTargeted || f.isSelected || hurtOrUnknown || f.isGrouped || f.isMarked;
  let range = NAMETAG_RANGE;
  if (f.isGrouped) range = NAMETAG_GROUP_RANGE;
  else if (f.secondsSinceHitByMe !== undefined && f.secondsSinceHitByMe < NAMETAG_DMG_TIME) range = NAMETAG_DMG_RANGE;
  return gate && f.distance < range;
}

// Donor bar maths (overhead.rs 174 and 312): fill = current over max(base max, maximum);
// ghost = lost share of base max, drawn only when positive (overhead.rs 350).
function barFractions(h: Health): { fill: number; ghost: number } {
  const ghost = decayedFraction(h);
  return { fill: h.current / Math.max(h.baseMax, h.maximum), ghost: ghost > 0 ? ghost : 0 };
}

// Lock-on pick (session/target.rs 176-195). Wielding: rank by distance to the aim ray and widen
// the hit radius by camera distance / 10. Not wielding: rank by distance to the camera surface, plain radius.
interface Cand { id: number; camDist: number; rayDist: number; radius: number; }
function pickTarget(cands: Cand[], wielding: boolean): number | undefined {
  const sorted = [...cands].sort((a, b) =>
    wielding ? a.rayDist - b.rayDist : (a.camDist - a.radius) - (b.camDist - b.radius)
  );
  for (const c of sorted) {
    const reach = wielding ? c.radius + c.camDist / 10 : c.radius;
    if (c.rayDist < reach) return c.id;
  }
  return undefined;
}

// simplified: the donor's curse decays on the buff age and is recomputed from base each pass (buff.rs 706-744),
// with the donor's curse damage-over-time left out. The fix is here: donor divides and compares,
// which never clamps when strength is 0 (target 1.0); this clamps directly.
// Donor Cursed (common/src/comp/buff.rs 429-433): rate -1.0 HP per s, target fraction 1 - strength.
function cursedMaximum(baseMax: number, ageS: number, strength: number, rateHpPerS = 1): number {
  const target = 1 - strength;                           // share of base max the curse stops at
  const potential = 1 - (ageS * rateHpPerS) / baseMax;   // share left after the buff's age
  return baseMax * Math.max(potential, target);
}

// Donor combat_rating (common/src/combat.rs 2168-2183): weighted average of six normalised parts, times a body multiplier.
interface RatingParts { health: number; energy: number; poise: number; precision: number; skills: number; weapon: number; }
const W = { health: 1.5, energy: 0.5, poise: 0.5, precision: 0.5, skills: 1.0, weapon: 1.0 };
function combatRating(p: RatingParts, bodyMultiplier: number): number {
  const sum = p.health * W.health + p.energy * W.energy + p.poise * W.poise
    + p.precision * W.precision + p.skills * W.skills + p.weapon * W.weapon;
  const wsum = W.health + W.energy + W.poise + W.precision + W.skills + W.weapon;
  return (sum / wsum) * bodyMultiplier;
}

// Donor cr_color bands (hud/mod.rs 5560-5580), returned as band names.
function ratingBand(r: number): string {
  if (r >= 200) return 'debug';
  if (r >= 122) return 'artifact';
  if (r >= 10.4) return 'legendary';
  if (r >= 8.5) return 'epic';
  if (r >= 6.5) return 'high';
  if (r >= 3.5) return 'moderate';
  if (r >= 2.0) return 'common';
  if (r >= 0) return 'low';
  return 'xp';
}

export {};
