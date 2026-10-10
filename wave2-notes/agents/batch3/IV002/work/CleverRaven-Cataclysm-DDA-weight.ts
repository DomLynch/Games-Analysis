// Licence: CC-BY-SA 3.0 (donor, LICENSE.txt). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
type Size = "tiny" | "small" | "medium" | "large" | "huge";

const SIZE_FACTOR: Record<Size, number> = { tiny: 0.25, small: 0.5, medium: 1, large: 2, huge: 4 };
const BASE_KG = 13;          // base carry before size and strength
const KG_PER_STRENGTH = 4;   // each point of strength adds 4 kg

interface Body {
  size: Size;
  strength: number;          // base strength plus bonuses
  enchantCarryKg: number;    // additive stand-in for the donor's enchantment modifier
  mountedStrength: number;   // 0 when not mounted
}

// Carry capacity: size-scaled base, plus strength, plus enchantment, clamped at zero; a mount replaces it.
function weightCapacityKg(b: Body): number {
  let cap = Math.max(0, BASE_KG * SIZE_FACTOR[b.size] + KG_PER_STRENGTH * b.strength + b.enchantCarryKg);
  if (b.mountedStrength !== 0) cap = (b.mountedStrength + 10) * KG_PER_STRENGTH;
  return cap;
}

interface Load { wornKg: number; weaponKg: number; liftAssistKg: number; }

// Carried weight: worn items plus the wielded weapon. The weapon is left out when it would push the total
// past capacity and a nearby lifting assist can carry it.
function carriedKg(l: Load, cap: number): number {
  const total = l.wornKg + l.weaponKg;
  const assisted = total > cap && l.liftAssistKg >= l.weaponKg;
  return assisted ? l.wornKg : total;
}

type Burden = "ok" | "overburdened" | "downed";

// Over capacity: overburdened. Over four times capacity: downed. Both are re-applied on every awake turn.
function burden(carried: number, cap: number): Burden {
  if (carried > cap * 4) return "downed";
  if (carried > cap) return "overburdened";
  return "ok";
}

// Speed points lost: 25 times the excess over capacity, divided by capacity, truncated. Capacity below 1 mg counts as 1 mg.
function speedPenalty(carried: number, cap: number): number {
  const c = Math.max(cap, 1e-6);
  if (carried <= c) return 0;
  return Math.trunc((25 * (carried - c)) / c);
}

// One awake turn, in donor order: burden effects first, then the speed penalty.
function awakeTurn(b: Body, l: Load): { burden: Burden; speedPenalty: number } {
  const cap = weightCapacityKg(b);
  const carried = carriedKg(l, cap);
  return { burden: burden(carried, cap), speedPenalty: speedPenalty(carried, cap) };
}

export {};
