// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Worn {
  hp: number;      // whole hit points (never below 1 from wear)
  maxHp: number;   // maximum durability of the piece
  remains: number; // fractional hit points carried to the next wear call
}

export type WornTier = "Unspoiled" | "WornState1" | "WornState2" | "WornState3" | "WornState4" | "Worned";

// Donor CVariables WornState1..4: share of max hp at which the tier drops.
export const WORN_FRACTIONS = { t1: 0.25, t2: 0.10, t3: 0.05, t4: 0.01 };

// Tier from current hp. Thresholds are the fraction times max, truncated (as the donor does).
export function tierOf(p: Worn): WornTier {
  if (p.hp <= 1) return "Worned";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t1 * p.maxHp)) return "Unspoiled";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t2 * p.maxHp)) return "WornState1";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t3 * p.maxHp)) return "WornState2";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t4 * p.maxHp)) return "WornState3";
  return "WornState4";
}

// Fractional carry: whole points leave now, the fraction is kept for the next call.
// Wear floors hit points at 1; it never destroys a piece on its own.
export function removeHp(p: Worn, lost: number): number {
  let whole = Math.floor(Math.abs(lost));
  p.remains += Math.abs(lost) - whole;
  if (p.remains >= 1) {
    p.remains -= 1;
    whole += 1;
  }
  if (whole === 0) return 0;
  const before = p.hp;
  p.hp = Math.max(1, p.hp - whole);
  return before - p.hp; // points actually removed (the donor returns a different number here)
}

// One piece on one swing. Pieces already Worned are skipped (the caller then unequips them).
// perAction is the family rate (donor default 0.01 for armour); weaponLatency / refLatency scales it.
export function wearOnSwing(p: Worn, perAction: number, weaponLatency: number, refLatency: number): number {
  if (tierOf(p) === "Worned") return 0;
  return removeHp(p, perAction * (weaponLatency / refLatency));
}
