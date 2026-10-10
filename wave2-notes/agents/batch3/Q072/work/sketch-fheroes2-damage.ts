// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack { count: number; hp: number; perUnitHp: number; attack: number; defense: number; }
interface Attack { baseMin: number; baseMax: number; doubled: boolean; bless: boolean; curse: boolean; luck: number; }

// Attack bonus: +10% per point of (attack - defense), capped at 20 points; -5% per point, floored at -16 points.
function attackFactor(attack: number, defense: number): number {
  const r = attack - defense;
  return 1 + (r > 0 ? 0.1 * Math.min(r, 20) : 0.05 * Math.max(r, -16));
}

// One end of the roll: doubling first, then the attack factor, truncated, never below 1.
function damageEnd(base: number, a: Stack, d: Stack, doubled: boolean): number {
  let dmg = doubled ? base * 2 : base;
  dmg *= attackFactor(a.attack, d.defense);
  return Math.max(Math.trunc(dmg), 1);
}

// Uniform integer roll between the two ends (inclusive), then luck: good doubles, bad halves; never below 1.
function rollDamage(a: Stack, d: Stack, atk: Attack, rng: () => number): number {
  const min = damageEnd(atk.baseMin, a, d, atk.doubled);
  const max = damageEnd(atk.baseMax, a, d, atk.doubled);
  let res = atk.bless ? max : atk.curse ? min : min + Math.floor(rng() * (max - min + 1));
  if (atk.luck > 0) res *= 2;
  else if (atk.luck < 0) res = Math.floor(res / 2);
  return Math.max(res, 1);
}

// Stack damage: units killed = count minus the survivors that the remaining hit points can still cover (rounded up).
function applyStackDamage(s: Stack, dmg: number): number {
  const killed = dmg >= s.hp ? s.count : s.count - Math.ceil((s.hp - dmg) / s.perUnitHp);
  s.count -= killed;
  s.hp -= Math.min(s.hp, dmg);
  return killed;
}

export {};
