// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Dice {
  // uniform integer in [0, n)
  below(n: number): number;
}

export interface Striker {
  hitValue: number;       // skill and gear to-hit, combined into one number
  weaponMax: number;      // weapon roll is 1..weaponMax
  statBonus: number;      // flat damage from the stat table
}

export interface Target {
  ac: number;             // lower is better (negative is good armour)
  flatReduction: number;  // armour and effect reduction, subtracted from raw damage
}

export interface Swing {
  hit: boolean;
  damage: number;
  natural: number;
}

export function resolveSwing(s: Striker, t: Target, dice: Dice): Swing {
  const natural = dice.below(20) + 1;                 // the d20, 1..20
  const attackValue = natural + s.hitValue - 10;
  let hit: boolean;
  if (natural === 1) {
    hit = false;                                      // fixed miss band
  } else if (natural === 20) {
    hit = true;                                       // fixed hit band
  } else {
    const defenceValue = t.ac >= 0
      ? 10 - t.ac
      : 11 + dice.below(Math.trunc(-1.5 * t.ac));     // negative AC: random band
    hit = attackValue > defenceValue;
  }
  if (!hit) return { hit: false, damage: 0, natural };

  const raw = dice.below(s.weaponMax) + 1 + s.statBonus;
  const after = raw - t.flatReduction;
  if (after <= 0) return { hit: false, damage: 0, natural };   // zero after reduction is a miss
  return { hit: true, damage: Math.trunc(after), natural };
}

export {};
