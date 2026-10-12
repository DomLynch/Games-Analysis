// Licence: GPL-2.0 or the Angband licence (donor, copyleft class). Clean-room sketch written from the described mechanism, not a translation of the donor.

// Donor constants (lib/gamedata/constants.txt): chance range 5000, offset -60, power random 650.
const RANGE = 5000;
const OFFSET = -60;
const POWER_RANDOM = 650;
const DEBUFF_TOH = 10; // donor melee-critical:debuff-toh, added to to-hit when the target is debuffed (player-attack.c 404-406)

// Tiers in ascending cutoff. The last tier has no cutoff and catches everything else.
interface Tier {
  name: string; // event name, also the log line type
  cutoff: number;
  mult: number;
  add: number;
  cues: string[]; // sound variants, one picked at random
}

const TIERS: Tier[] = [
  { name: "HIT_GOOD", cutoff: 400, mult: 2, add: 5, cues: ["plc_hit_anvil"] },
  { name: "HIT_GREAT", cutoff: 700, mult: 2, add: 10, cues: ["plc_hit_groan"] },
  { name: "HIT_SUPERB", cutoff: 900, mult: 3, add: 15, cues: ["plc_hit_grunt"] },
  { name: "HIT_HI_GREAT", cutoff: 1300, mult: 3, add: 20, cues: ["plc_hit_grunt2"] },
  { name: "HIT_HI_SUPERB", cutoff: Infinity, mult: 4, add: 20, cues: ["plc_hit_anvil2"] },
];
const PLAIN_CUES = ["plc_hit_hay", "plc_hit_body"];

interface Rng {
  int1: (n: number) => number; // 1..n
  int0: (n: number) => number; // 0..n-1
}

interface HitResult {
  event: string; // one event drives the log line and the sound
  damage: number;
  cue: string;
}

// Donor order: chance roll first; a critical then gets a power roll and walks the tiers.
function meleeHit(dam: number, weight: number, toh: number, skill: number, rng: Rng, targetDebuffed = false): HitResult {
  const chance = 1 * weight + 5 * (toh + (targetDebuffed ? DEBUFF_TOH : 0)) + 1 * skill + OFFSET;
  if (rng.int1(RANGE) > chance) {
    return { event: "HIT", damage: dam, cue: PLAIN_CUES[rng.int0(PLAIN_CUES.length)] };
  }
  const power = 1 * weight + rng.int1(POWER_RANDOM);
  let i = 0;
  while (i < TIERS.length - 1 && power >= TIERS[i].cutoff) i++;
  const tier = TIERS[i];
  return {
    event: tier.name,
    damage: tier.add + tier.mult * dam,
    cue: tier.cues[rng.int0(tier.cues.length)],
  };
}

// Demo: a plain hit, then a critical with a range roll of 10 (under the chance of 40) and a power roll of 600 (power 700).
const plain = meleeHit(10, 100, 0, 0, { int1: () => 4000, int0: () => 0 });
const crit = meleeHit(10, 100, 0, 0, { int1: (n) => (n === RANGE ? 10 : 600), int0: () => 0 });

export { plain, crit, TIERS };
export {};
