// Licence: GPL-2.0 (donor COPYING, version 2). Clean-room: written from the mechanism, not translated from the donor lines.
export interface CarriedWeapon {
  baseXp: number;
  reach: "melee" | "poorThrown" | "goodThrown" | "ranged" | "none";
  range: number;
}

export interface Victim {
  str: number;
  dex: number;
  int: number;
  combat: number;          // capped by the game elsewhere; used raw here
  asleep: boolean;
  monsterBaseXp: number;   // monster record: armour + weapon + safety flags
  immuneBits: number;      // immunity flags, as a bit mask
  vulnBits: number;        // vulnerability flags, as a bit mask
  carriedArmour: number[]; // armour value of each item the victim owned
  carriedImmunity: number; // armour immunity bits from those items (OR-ed into immuneBits)
  carriedWeapons: CarriedWeapon[];
}

const XP_CAP = 999999;      // total XP a character can hold
const TRAINING_PER_LEVEL = 3;
const TRAINING_CAP = 255;

export function popcount(n: number): number {
  let x = n >>> 0;
  let c = 0;
  while (x) { x &= x - 1; c++; }
  return c;
}

// XP the victim is worth to whoever lands the killing hit. Zero if the victim was asleep.
export function killXp(v: Victim): number {
  if (v.asleep) return 0;
  let xp = v.str + v.combat + Math.trunc((v.dex + 1) / 3) + Math.trunc(v.int / 5) + v.monsterBaseXp;
  let immune = v.immuneBits | v.carriedImmunity;
  for (const a of v.carriedArmour) xp += a;
  for (const w of v.carriedWeapons) {
    xp += w.baseXp;
    switch (w.reach) {
      case "melee": xp += w.range > 5 ? 2 : w.range > 3 ? 1 : 0; break;
      case "poorThrown": xp += Math.trunc(v.combat / 5); break;
      case "goodThrown": xp += Math.trunc(v.combat / 3); break;
      case "ranged": xp += Math.trunc(w.range / 2); break;
      case "none": break;
    }
  }
  // Vulnerabilities that the victim is also immune to do not count against the award.
  let vuln = v.vulnBits & ~immune;
  xp += popcount(immune);
  xp -= popcount(vuln);
  return Math.trunc(xp / 2);
}

// Add XP to the killer, capped. Returns the new level and the training points earned by the level-ups.
export function award(currentXp: number, gain: number, levelOf: (xp: number) => number): { xp: number; level: number; training: number } {
  const before = levelOf(currentXp);
  const xp = Math.min(XP_CAP, currentXp + gain);
  const after = levelOf(xp);
  const delta = Math.max(0, after - before);
  const training = Math.min(TRAINING_CAP, TRAINING_PER_LEVEL * delta);
  return { xp, level: after, training };
}

// Level from XP. The sketch returns 1 below 50 XP; the donor's Log2 for 0 was not read.
export function levelOf(xp: number): number {
  const q = Math.trunc(xp / 50);
  if (q < 1) return 1;
  return 1 + Math.floor(Math.log2(q));
}
