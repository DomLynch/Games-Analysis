// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack {
  count: number;          // creatures in the stack
  minPerUnit: number;     // base damage range of one creature
  maxPerUnit: number;
  attack: number;
  defense: number;
  firstHpLeft: number;    // health left on the front creature
  maxHp: number;          // health of one creature
}

interface Strike {
  attacker: Stack;
  defender: Stack;
  shooting: boolean;
  luckyStrike: boolean;
  unluckyStrike: boolean;
  deathBlow: boolean;
  rangePenalty: boolean;  // caller decides: distance penalty for a shot, or a shooter in melee
  attackPerPoint: number; // 0.05 in the donor config
  attackCap: number;      // 3.0
  defensePerPoint: number;// 0.025
  defenseCap: number;     // 0.7
}

// Surplus attack raises damage up to a cap, a shortfall of attack lowers it up to a cap.
function attackDefenseFactor(s: Strike): number {
  const advantage = s.attacker.attack - s.defender.defense;
  if (advantage > 0) return Math.min(s.attackPerPoint * advantage, s.attackCap);
  if (advantage < 0) return -Math.min(s.defensePerPoint * -advantage, s.defenseCap);
  return 0;
}

// Positive factors add into one number, negative factors multiply into another.
// Each negative factor may take at most everything (its multiplier is never below 0).
function estimate(s: Strike): { damage: [number, number]; kills: [number, number] } {
  const baseMin = s.attacker.minPerUnit * s.attacker.count;
  const baseMax = s.attacker.maxPerUnit * s.attacker.count;

  const factors: number[] = [
    attackDefenseFactor(s),
    s.luckyStrike ? 1.0 : 0,
    s.unluckyStrike ? -0.5 : 0,
    s.deathBlow ? 1.0 : 0,
    s.rangePenalty ? -0.5 : 0,
  ];

  let raising = 1.0;
  let lowering = 1.0;
  for (const f of factors) {
    if (f > 0) raising += f;
    else if (f < 0) lowering *= 1 + Math.max(-1.0, f);
  }

  const mult = raising * lowering;
  const apply = (base: number): number => Math.max(1, Math.floor(base * mult));
  const dmgMin = apply(baseMin);
  const dmgMax = apply(baseMax);

  const killedBy = (dmg: number): number => {
    if (dmg < s.defender.firstHpLeft) return 0;
    return Math.min(1 + Math.floor((dmg - s.defender.firstHpLeft) / s.defender.maxHp), s.defender.count);
  };

  return { damage: [dmgMin, dmgMax], kills: [killedBy(dmgMin), killedBy(dmgMax)] };
}

// Server side: one hit is an average of min(10, attacker count) draws over the whole damage range.
// A fixed range (min == max) draws nothing and returns the minimum.
function rollDamage(range: [number, number], attackerCount: number, draw: (lo: number, hi: number) => number): number {
  const [lo, hi] = range;
  if (lo === hi) return lo;
  const n = Math.min(10, attackerCount);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += draw(lo, hi);
  return Math.trunc(sum / n);
}

export {};
