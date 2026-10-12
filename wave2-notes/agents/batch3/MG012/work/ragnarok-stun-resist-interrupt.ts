// Licence: custom non-commercial grant (donor license.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

// --- 1. Resist curve: each stat point multiplies by 0.99 (donor: 1000-entry table, beyond it Math.pow) ---
const RESIST_TABLE: number[] = Array.from({ length: 1000 }, (_, i) => Math.pow(0.99, i));
export function resistMul(stat: number): number {
  return stat >= 0 && stat < RESIST_TABLE.length ? RESIST_TABLE[stat] : Math.pow(0.99, stat);
}

// --- 2. Stun roll and length. Chance and length both scale with the same curve. ---
export interface StunTarget {
  kind: "player" | "mob" | "boss";
  vit: number;
  luk: number;
  resistStunPct: number;      // stat: percent of chance resisted
  decreaseStunDurPct: number; // stat: percent of length removed
}

// luckRoll(chanceOutOf1000) stands in for the donor's CheckLuckModifiedRandomChanceVsTarget (rest not read).
// Returns the stun length in seconds, or 0 when the stun does not land.
export function stunLengthS(
  t: StunTarget,
  chanceIn1000: number,
  rnd01: () => number,
  luckRoll: (chanceOutOf1000: number) => boolean,
): number {
  let vit = t.vit;
  if (t.kind === "player") vit = Math.floor((vit * 3) / 2); // donor: x1.5 for players (integer math)
  if (t.kind === "boss") vit = Math.floor((vit * 5) / 2);   // donor: x2.5 for bosses

  let resist = resistMul(vit);
  const resistChance = 100 - t.resistStunPct;
  if (resistChance !== 100) resist = (resist * resistChance) / 100;

  if (!luckRoll(Math.trunc(chanceIn1000 * resist))) return 0;

  const luckBonus = t.luk > 0 ? Math.floor(rnd01() * t.luk) : 0; // donor: GameRandom.Next(0, luk)
  const timeResist = resistMul(vit + luckBonus);
  let len = 5 * timeResist;                                         // donor: base 5 s
  const durationResist = 100 - t.decreaseStunDurPct;
  if (durationResist !== 100) len = (len * durationResist) / 100;
  return len > 0 ? len : 0;
}

// --- 3. Cast interruption. Mode table as read in CombatEntity.DamageHandling.cs 781-790. ---
export type InterruptMode = "never" | "onKnockback" | "onDamage" | "onSkill";
// Default for players is onSkill (ServerOperationConfig.cs 19).

export interface HitEvent { damage: number; knockback: number; fromSkill: boolean; }
export interface CastState { isPlayer: boolean; uninterruptible: boolean; remainingS: number; }

export function castInterrupted(mode: InterruptMode, hit: HitEvent, cast: CastState): boolean {
  if (mode === "never") return false;
  const hits =
    (mode === "onDamage" && hit.damage > 0) ||
    hit.knockback > 0 ||
    (mode === "onSkill" && hit.fromSkill);
  if (!hits) return false;
  if (cast.isPlayer && (cast.uninterruptible || cast.remainingS < 0.2)) return false; // donor: player casts close to firing
  return true;
}

export {};
