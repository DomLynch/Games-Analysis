// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Fighter {
  hp: number;
  maxHp: number;
  baseDamage: number;     // weapon damage before modifiers
  hitChance: number;      // 0..100, from hitChance() below
  blowsMin: number;       // strikes at the low-hp end of a swarm weapon
  blowsMax: number;       // strikes at full hp
  firststrike: boolean;
  rounds: number;         // berserk rounds, 1 = normal
  todPct: number;         // time-of-day bonus, percentage points
  leadPct: number;        // leadership bonus, percentage points
  slowed: boolean;
}

export interface Hit { by: "a" | "d"; damage: number; }
export interface Outcome { aHp: number; dHp: number; hits: Hit[]; winner: "a" | "d" | "none"; }

// Chance to hit: base chance, plus accuracy, minus parry, clamped to 0..100.
export function hitChance(baseCth: number, accuracy: number, parry: number): number {
  return Math.min(100, Math.max(0, baseCth + accuracy - parry));
}

// Strikes for a swarm weapon: full max at full hp, interpolated down to min at 0 hp.
export function blowsAt(min: number, max: number, hp: number, maxHp: number): number {
  if (hp >= maxHp) return max;
  if (max < min) return min - Math.floor(((min - max) * hp) / maxHp);
  return min + Math.floor(((max - min) * hp) / maxHp);
}

// Integer rounding of base * mult / divisor. Ties go toward the base damage; result is at least 1 when base > 0.
export function roundDamage(base: number, mult: number, divisor: number): number {
  if (base === 0) return 0;
  const tieBias = Math.floor(divisor / 2) - (mult <= divisor ? 0 : 1);
  return Math.max(1, Math.floor((base * mult + tieBias) / divisor));
}

// Percent stack: (100 + time-of-day + leadership) x target resistance%, scaled by 1/10000; slowed uses 1/20000.
export function damageFor(f: Fighter, targetResistPct: number): number {
  const mult = (100 + f.todPct + f.leadPct) * targetResistPct;
  return roundDamage(f.baseDamage, mult, f.slowed ? 20000 : 10000);
}

// One fight. roll() returns an integer 0..99 per strike; a strike hits when roll < hitChance.
// Strikes alternate; a firststrike side (when only the other has none) opens; berserk rounds reset strike counts; a death ends the loop.
export function exchange(a: Fighter, d: Fighter, aResistPct: number, dResistPct: number, roll: () => number): Outcome {
  let aHp = a.hp;
  let dHp = d.hp;
  const aBlows = blowsAt(a.blowsMin, a.blowsMax, a.hp, a.maxHp);
  const dBlows = blowsAt(d.blowsMin, d.blowsMax, d.hp, d.maxHp);
  let aLeft = aBlows;
  let dLeft = dBlows;
  const aDmg = damageFor(a, dResistPct);
  const dDmg = damageFor(d, aResistPct);
  let roundsLeft = Math.max(a.rounds, d.rounds) - 1;
  let defenderFirst = d.firststrike && !a.firststrike;
  const hits: Hit[] = [];

  // Returns false when the struck side dies.
  const strike = (by: "a" | "d"): boolean => {
    const attacker = by === "a" ? a : d;
    const dmg = by === "a" ? aDmg : dDmg;
    if (roll() < attacker.hitChance) {
      hits.push({ by, damage: dmg });
      if (by === "a") { dHp = Math.max(0, dHp - dmg); return dHp > 0; }
      aHp = Math.max(0, aHp - dmg);
      return aHp > 0;
    }
    return true;
  };

  for (;;) {
    if (aLeft > 0 && !defenderFirst) {
      aLeft--;
      if (!strike("a")) break;
    }
    defenderFirst = false;
    if (dLeft > 0) {
      dLeft--;
      if (!strike("d")) break;
    }
    if (roundsLeft > 0 && aLeft === 0 && dLeft === 0) {
      aLeft = aBlows;
      dLeft = dBlows;
      roundsLeft--;
      defenderFirst = d.firststrike && !a.firststrike;
    }
    if (aLeft <= 0 && dLeft <= 0) break;
  }

  const winner = aHp <= 0 ? "d" : dHp <= 0 ? "a" : "none";
  return { aHp, dHp, hits, winner };
}
export {}
