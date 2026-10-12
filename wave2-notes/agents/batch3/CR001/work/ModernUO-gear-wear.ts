// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Piece {
  hp: number;      // current durability
  maxHp: number;   // ceiling; only overflow wear lowers it
  blunt: boolean;  // bashing weapon type
  rating: number;  // armour rating before durability scaling
}

export type Rng = () => number; // returns a value in [0, 1)

// Durability scale on the rating: 50% at zero hp, 100% at full hp.
export function scaledRating(p: Piece): number {
  const scale = p.maxHp > 0 && p.hp < p.maxHp ? 0.5 + 0.5 * (p.hp / p.maxHp) : 1;
  return p.rating * scale;
}

// Damage soaked by the piece for one hit: uniform in [halfar, 2*halfar), floored.
export function soak(p: Piece, rng: Rng): number {
  const halfar = p.rating / 2;
  return Math.floor(halfar + halfar * rng());
}

// One struck piece (only the slot the hit landed on is passed in).
export function wearOnHit(p: Piece, absorbed: number, rng: Rng): "ok" | "destroyed" {
  if (rng() >= 0.25) return "ok"; // 25% of hits wear the piece
  if (p.maxHp <= 0) return "ok";
  let wear = p.blunt ? Math.max(1, Math.floor(absorbed / 2)) : (rng() < 0.5 ? 1 : 0);
  if (wear === 0) return "ok";
  if (p.hp >= wear) {
    p.hp -= wear;
    wear = 0;
  } else {
    wear -= p.hp;
    p.hp = 0;
  }
  if (wear > 0) {
    if (p.maxHp > wear) {
      p.maxHp -= wear; // overflow lowers the ceiling for good
    } else {
      return "destroyed";
    }
  }
  return "ok";
}

// Points of ceiling lost per repair attempt (pre-AOS rule; AOS is always 1).
export function toWeakenFor(skill: number, aos: boolean, tailoring: boolean): number {
  if (aos) return 1;
  if (tailoring) return 0;
  return skill >= 90 ? 1 : skill >= 70 ? 2 : 3;
}

export type RepairResult = "full" | "refused" | "repaired" | "failed";

// One repair attempt. skillCheck(min, max) is the skill roll with a difficulty window.
export function repair(
  p: Piece,
  skill: number,
  rng: Rng,
  skillCheck: (min: number, max: number) => boolean,
): RepairResult {
  const toWeaken = toWeakenFor(skill, false, false);
  if (p.maxHp <= 0 || p.hp === p.maxHp) return "full";
  if (p.maxHp <= toWeaken) return "refused"; // the next repair would break it
  const deficit = p.maxHp - p.hp;
  const weakenPct = 40 + deficit - skill / 10; // chance in percent, before the roll
  if (weakenPct > rng() * 100) {
    p.maxHp -= toWeaken;
    p.hp = Math.max(0, p.hp - toWeaken);
  }
  const difficulty = ((p.maxHp - p.hp) * 1250 / Math.max(p.maxHp, 1) - 250) * 0.1;
  if (skillCheck(difficulty - 25, difficulty + 25)) {
    p.hp = p.maxHp;
    return "repaired";
  }
  return "failed";
}
