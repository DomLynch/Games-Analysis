// Licence: MIT (donor, 2004Scape-Server LICENSE). Adapted from the mechanism; written as a fresh function, not a line-by-line translation.
// Integer rules as in the donor: scale and divide truncate toward zero; randominc(n) is an integer 0..n inclusive.

export type MeleeStyle = 'accurate' | 'aggressive' | 'defensive' | 'controlled';

export interface Levels { attack: number; strength: number; defence: number; }
export interface PrayerPct { attack: number; strength: number; defence: number; } // 100..115, donor check_*_prayer
export interface GearBonus { attack: number; strength: number; defence: number; } // equipment data, may be negative

// Donor combat_effective_stat: scale(max(100, prayer), 100, level) = trunc(level * pct / 100).
export function effectiveLevel(level: number, prayerPct: number): number {
  return Math.trunc((level * Math.max(100, prayerPct)) / 100);
}

// Donor style bonuses: +8 for every melee style, plus 3 (accurate, aggressive, defensive) or 1 each (controlled).
function styleAdd(style: MeleeStyle): { attack: number; strength: number; defence: number } {
  switch (style) {
    case 'accurate': return { attack: 8 + 3, strength: 8, defence: 8 };
    case 'aggressive': return { attack: 8, strength: 8 + 3, defence: 8 };
    case 'defensive': return { attack: 8, strength: 8, defence: 8 + 3 };
    case 'controlled': return { attack: 8 + 1, strength: 8 + 1, defence: 8 + 1 };
  }
}

// Donor combat_stat: roll = effective x (bonus + 64). Rolls are clamped at 0 here; the donor does not clamp.
export function rolls(levels: Levels, prayer: PrayerPct, style: MeleeStyle, gear: GearBonus) {
  const add = styleAdd(style);
  const effAttack = effectiveLevel(levels.attack, prayer.attack) + add.attack;
  const effStrength = effectiveLevel(levels.strength, prayer.strength) + add.strength;
  const effDefence = effectiveLevel(levels.defence, prayer.defence) + add.defence;
  return {
    attackRoll: Math.max(0, effAttack * (gear.attack + 64)),
    defenceRoll: Math.max(0, effDefence * (gear.defence + 64)),
    strengthRoll: Math.max(0, effStrength * (gear.strength + 64)),
  };
}

// Donor combat_maxhit: trunc((strengthRoll + 320) / 640), i.e. about 0.5 + roll / 640 rounded down.
export function maxHit(strengthRoll: number): number {
  return Math.trunc((strengthRoll + 320) / 640);
}

// Donor randominc(n): integer 0..n inclusive. The hit lands when the attack draw beats the defence draw.
export function randomInc(n: number, rand: () => number): number {
  return Math.trunc(rand() * (n + 1));
}

export function landsHit(attackRoll: number, defenceRoll: number, rand: () => number): boolean {
  return randomInc(attackRoll, rand) > randomInc(defenceRoll, rand);
}

// Damage is uniform 0..maxHit, then capped at the target's remaining hit points (donor player_melee).
export function damageRoll(maxhit: number, targetHp: number, rand: () => number): number {
  return Math.min(randomInc(maxhit, rand), targetHp);
}

// XP per damage in tenths (donor: base = damage x 10; accurate scale(400,100) = x4; controlled and HP scale(133,100) = x1.33).
export function xpTenths(damage: number, style: MeleeStyle, skill: 'attack' | 'strength' | 'defence' | 'hitpoints'): number {
  const base = damage * 10;
  const hpPart = Math.trunc((133 * base) / 100);
  if (skill === 'hitpoints') return hpPart;
  if (style === 'controlled') return Math.trunc((133 * base) / 100);
  const main: Record<Exclude<MeleeStyle, 'controlled'>, 'attack' | 'strength' | 'defence'> = {
    accurate: 'attack', aggressive: 'strength', defensive: 'defence',
  };
  return main[style] === skill ? Math.trunc((400 * base) / 100) : 0;
}

// Prayer drain values per active prayer (donor prayers.enum, drain effect per 5-tick timer).
export const PRAYER_DRAIN: Record<string, number> = {
  rapidrestore: 1, rapidheal: 2, protectitems: 2,
  thickskin: 3, strengthburst: 3, clarity: 3,
  rockskin: 6, superhumanstrength: 6, improvedreflexes: 6,
  steelskin: 12, ultimatestrength: 12, incrediblereflexes: 12,
  protectfrommagic: 12, protectfrommissiles: 12, protectfrommelee: 12,
};

export interface DrainState { counter: number; points: number; }

// One 5-tick timer step (donor [timer,prayer_drain]). resistance = 60 + 2 x equipment drain bonus (donor comment).
// Fix: the donor divides by the raw resistance but tests against max(resistance, 60); both use the clamped value here.
export function prayerDrainStep(state: DrainState, activePrayers: string[], resistance: number): DrainState {
  const r = Math.max(resistance, 60);
  const sum = activePrayers.reduce((acc, p) => acc + (PRAYER_DRAIN[p] ?? 0), 0);
  let counter = sum * 5 + Math.max(state.counter, 0);
  let points = state.points;
  if (counter >= r) {
    const reduce = Math.trunc(counter / r);
    counter -= r * reduce;
    points = Math.max(points - reduce, 0);
  }
  return { counter, points };
}

export {};
