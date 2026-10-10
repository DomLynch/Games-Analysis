// Licence: LGPL-3.0 (donor, per README). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type DamageKind = "melee" | "ranged" | "magic";
type Hit = "hit" | "crit" | "miss" | "dodge" | "block" | "parry";

interface Attacker {
  accuracy: number;        // percent, for this damage kind (default 100 in the donor)
  critical: number;        // percent
  criticalBonus: number;   // percent points added to the crit multiplier
  penetration: number;     // armour or magic resist penetration
  dps: number;             // dps part of the damage, already summed
  bullsEye: number;        // integer stat
}

interface Defender {
  dodge: number;           // percent
  block: number;           // percent
  meleeParry: number;      // percent
  rangedParry: number;     // percent
  armour: number;          // armour, or magic resist for magic
  flexibility: number;     // integer stat
}

const ARMOUR_K = 5300;

// Dice cascade, first success wins. Defence rolls only when the attacker is in front of the target.
function rollDice(kind: DamageKind, a: Attacker, d: Defender, inFront: boolean, rnd: () => number): Hit {
  const bull = (a.bullsEye / 1000) * 3 / 100;
  if (inFront) {
    if (rnd() * 100 < d.dodge - bull && kind !== "magic") return "dodge";
    if (rnd() * 100 < d.block - bull && kind !== "magic") return "block";
    if (rnd() * 100 < d.meleeParry - bull && kind === "melee") return "parry";
    if (rnd() * 100 < d.rangedParry - bull && kind === "ranged") return "parry";
  }
  return rnd() * 100 < a.accuracy ? "hit" : "miss";
}

// One hit: dice, then crit roll, then the damage draw, crit multiplier, armour soak and the value/absorbed split.
function resolveHit(kind: DamageKind, a: Attacker, d: Defender, inFront: boolean, castMs: number,
                    multiplier: number, fixed: [number, number] | null, rnd: () => number):
                    { hit: Hit; value: number; absorbed: number } {
  let hit = rollDice(kind, a, d, inFront, rnd);
  if (hit !== "hit") return { hit, value: 0, absorbed: 0 };

  const flexMod = Math.trunc(d.flexibility / 1000) * 3;   // integer division, as in the donor
  if (rnd() * 100 < a.critical - flexMod) hit = "crit";      // critical is the stat for this damage kind

  // Damage range: cast factor is 1000 for casts of 1000 ms or less, else the cast time in ms.
  const factor = castMs <= 1000 ? 1000 : castMs;
  let min = a.dps * factor * 0.001;
  let max = min;
  min = Math.floor(min * multiplier);
  max = Math.ceil(max * multiplier);
  if (fixed !== null) [min, max] = fixed;
  let dmg = min + rnd() * (max - min);                     // Next(min, max): [min, max)

  if (hit === "crit") dmg *= 1 + (a.criticalBonus - Math.trunc(d.flexibility / 100)) / 100;

  const soak = Math.max(0, d.armour - a.penetration);
  const reduction = 1 - soak / (soak + ARMOUR_K);
  return { hit, value: Math.trunc(dmg * reduction), absorbed: Math.trunc(dmg * (1 - reduction)) };
}

export {};
