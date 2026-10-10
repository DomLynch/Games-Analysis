// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch of the shape only; no donor line is reproduced.
export interface Dice {
  // uniform integer in [0, n)
  below(n: number): number;
}

export interface Attacker {
  accuracy: number;        // skill and modifiers, before the cap
  critChance: number;      // added to the margin above the roll
  minDamage: number;
  maxDamage: number;
  meleeStat: number;       // added to the top of the damage roll
  critMultiplier: number;  // from a crit table in the real game; placeholder here
}

export interface Defender {
  damageThreshold: number; // flat, subtracted first
  damageResistance: number; // percent, taken from what remains
}

export interface Swing {
  outcome: 'miss' | 'hit' | 'crit' | 'fumble';
  damage: number;
}

const ACCURACY_CAP = 95;

export function resolveHit(a: Attacker, d: Defender, dice: Dice, critsEnabled: boolean, difficultyPercent: number): Swing {
  const accuracy = Math.min(a.accuracy, ACCURACY_CAP);
  const roll = dice.below(100) + 1;              // d100
  const delta = accuracy - roll;                 // margin above the roll

  if (delta < 0) {
    const fumble = critsEnabled && dice.below(100) + 1 <= Math.trunc(-delta / 10);
    return { outcome: fumble ? 'fumble' : 'miss', damage: 0 };
  }

  const crit = critsEnabled && dice.below(100) + 1 <= Math.trunc(delta / 10) + a.critChance;
  const multiplier = crit ? a.critMultiplier : 2;   // 2 means x1 after the halving below

  const raw = a.minDamage + dice.below(a.maxDamage + a.meleeStat - a.minDamage + 1);
  let dmg = Math.trunc((raw * multiplier) / 2);
  dmg = Math.trunc((dmg * difficultyPercent) / 100);
  dmg -= d.damageThreshold;
  if (dmg > 0) {
    dmg -= Math.trunc((dmg * d.damageResistance) / 100);
    if (dmg > 0) {
      return { outcome: crit ? 'crit' : 'hit', damage: dmg };
    }
  }
  return { outcome: crit ? 'crit' : 'hit', damage: 0 };
}

export {};
