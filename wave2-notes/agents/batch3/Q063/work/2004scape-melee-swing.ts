// Clean-room sketch: 2004Scape-style melee swing (roll against roll, then damage up to a max hit).
// Shape only, written from the described mechanism; donor licence MIT (Lost City). Not a line-by-line translation.

export type Rng = () => number; // uniform in [0, 1)

// Level scaled up by a prayer bonus (never below 100 percent), plus a flat style term.
export function effectiveLevel(level: number, prayerPct: number, styleTerm: number): number {
  return Math.floor((level * Math.max(100, prayerPct)) / 100) + styleTerm;
}

// Roll = effective level x (equipment or NPC bonus + 64).
export function roll(effective: number, bonus: number): number {
  return Math.floor(effective * (bonus + 64));
}

// Max hit from the strength roll: (strengthRoll + 320) / 640.
export function maxHit(strengthRoll: number): number {
  return Math.floor((strengthRoll + 320) / 640);
}

// Integer in 0..n inclusive.
export function randomInc(n: number, rng: Rng): number {
  return Math.floor(rng() * (n + 1));
}

export interface SwingInput {
  attackRoll: number;   // 0 when the defender's protection neutralises the swing
  defenceRoll: number;
  maxHitValue: number;
  damageCap: number;    // per-NPC cap; Infinity for none
}

export interface SwingResult {
  hit: boolean;
  damage: number;       // 0 on a miss (the target still shows a block)
}

export function meleeSwing(s: SwingInput, rng: Rng): SwingResult {
  const a = randomInc(s.attackRoll, rng); // attacker rolls first
  const d = randomInc(s.defenceRoll, rng);
  if (!(a > d)) return { hit: false, damage: 0 };
  return { hit: true, damage: randomInc(Math.min(s.maxHitValue, s.damageCap), rng) };
}
export {};
