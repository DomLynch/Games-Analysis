// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Skill values are tenths of a point (fixed point), as the donor's BaseFixedPoint and CapFixedPoint are.
interface Skill { base: number; cap: number; lock: "up" | "down" | "hold"; }
interface Learner { skills: Skill[]; totalCap: number; isPlayer: boolean; }

function totalOf(l: Learner): number {
  return l.skills.reduce((sum, s) => sum + s.base, 0);
}

// Chance that one use of a skill raises it. success = (chance >= roll) is decided by the caller.
export function gainChance(
  l: Learner, s: Skill, chance: number, success: boolean,
  gainFactor: number, aos: boolean, isPet = false,
): number {
  let gc = (l.totalCap - totalOf(l)) / l.totalCap;     // room left in the total budget
  gc += (s.cap - s.base) / s.cap;                       // room left in this skill
  gc /= 2;
  gc += (1 - chance) * (success ? 0.5 : aos ? 0 : 0.2); // hard checks are worth more
  gc /= 2;
  gc *= gainFactor;
  if (isPet) gc *= 2;
  return Math.max(gc, 0.01);
}

// Make room in a full budget: a player near the total cap lowers one "down" skill by the gain amount.
function makeRoom(l: Learner, target: Skill, toGain: number, rnd: () => number): void {
  if (!l.isPlayer || totalOf(l) / l.totalCap < rnd()) return;
  for (const other of l.skills) {
    if (other !== target && other.lock === "down" && other.base >= toGain) {
      other.base = Math.max(other.base - toGain, 0);
      return;
    }
  }
}

// One successful gain roll. Low skills gain 1 to 4 tenths; higher skills gain 1 tenth.
export function gain(l: Learner, target: Skill, rnd: () => number, accelerate = 1): void {
  if (target.base >= target.cap || target.lock !== "up") return;
  let toGain = target.base <= 100 ? 1 + Math.floor(rnd() * 4) : 1;
  makeRoom(l, target, toGain, rnd);
  toGain *= accelerate;
  if (!l.isPlayer || totalOf(l) < l.totalCap) {
    target.base = Math.min(target.base + toGain, target.cap);
  }
}

// Stat roll used by the legacy path: chance = statGain / 33.3 * multiplier.
export function statRollChance(statGain: number, multiplier = 1): number {
  return (statGain / 33.3) * multiplier;
}

// Atrophy: a stat gain swaps one point away from another stat when the raw stat total is near its cap.
export function atrophyRoll(rawStatTotal: number, statCap: number, rnd: () => number): boolean {
  return rawStatTotal / statCap >= rnd();
}

export {};
