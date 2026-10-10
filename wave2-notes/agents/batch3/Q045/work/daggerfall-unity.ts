// Licence: MIT (donor LICENSE). Written fresh from the described mechanism, not a line-by-line translation.
type Skill = { value: number; uses: number; multiplier: number };
type Hero = {
  level: number;
  skills: Skill[];
  primary: number[];   // skill indexes
  major: number[];
  minor: number[];
  startingSum: number;
  currentSum: number;
  reflexes: number;    // 2 = neutral; the donor's enum values are not read
  readyToLevelUp: boolean;
  lastCheckMin: number; // classic game minutes at the last check
};

const USE_CAP = 20000;
const CHECK_GAP_MIN = 360;      // minimum game minutes between skill checks
const MASTER = 100;
const MASTER_GATE = 95;         // a skill below this may always rise; above it only if no primary skill is mastered
const LEVEL_BASE = 28;
const LEVEL_STEP = 15;
const LEVEL_GROWTH = 1.04;
const BONUS_MIN = 4, BONUS_MAX = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Each use adds to a per-skill tally, capped.
function tally(h: Hero, skill: number, amount: number): void {
  h.skills[skill].uses = clamp(h.skills[skill].uses + amount, 0, USE_CAP);
}

// Uses needed to rise: grows with the skill value, its multiplier, the class multiplier and 1.04 per level.
function usesNeeded(value: number, multiplier: number, careerMult: number, level: number): number {
  return Math.floor(value * multiplier * careerMult * Math.pow(LEVEL_GROWTH, level) * 2 / 5 + 1);
}

// Reflexes as a 16.16 fixed multiplier: 1.0 at reflexes 2, each point 0.125 either way.
function reflexesMod(reflexes: number): number {
  return 0x10000 - ((reflexes - 2) << 13);
}

// Sum of primary skills, plus major skills minus the lowest major, plus the highest minor.
function currentLevelSum(h: Hero): number {
  const primary = h.primary.reduce((a, i) => a + h.skills[i].value, 0);
  const majorVals = h.major.map(i => h.skills[i].value);
  const major = majorVals.reduce((a, v) => a + v, 0) - (majorVals.length ? Math.min(...majorVals) : 0);
  const minorVals = h.minor.map(i => h.skills[i].value);
  const minor = minorVals.length ? Math.max(...minorVals) : 0;
  return primary + major + minor;
}

// Starting sum: keep the lower of the stored value and the current sum when the stored one is ahead; else estimate.
function estimateStartingSum(h: Hero): number {
  const estimatedLevel = h.level + 0.5;
  const estimated = -Math.trunc(estimatedLevel * LEVEL_STEP - (LEVEL_BASE + h.currentSum));
  if (h.currentSum > 0 && h.startingSum > h.currentSum) return h.currentSum;
  return estimated;
}

// Level implied by the sums; a level-up only flags the hero, the level itself is raised later in the UI.
function checkForLevelUp(h: Hero): boolean {
  const calculated = Math.floor((h.currentSum - h.startingSum + LEVEL_BASE) / LEVEL_STEP);
  const up = h.level < calculated;
  if (up) h.readyToLevelUp = true;
  return up;
}

// Donor AlreadyMasteredASkill: true when any primary skill is at 100 right now (evaluated per skill, not once per pass).
function alreadyMastered(h: Hero): boolean {
  return h.primary.some(i => h.skills[i].value === MASTER);
}

// Settle skill advancement once per gated check (called at rest or travel, not per frame).
function raiseSkills(h: Hero, nowMin: number, careerMult: number): boolean {
  if (nowMin - h.lastCheckMin <= CHECK_GAP_MIN) return false;
  h.lastCheckMin = nowMin;
  for (let i = 0; i < h.skills.length; i++) {
    const s = h.skills[i];
    const need = usesNeeded(s.value, s.multiplier, careerMult, h.level);
    const scaled = Math.floor((s.uses * reflexesMod(h.reflexes)) / 65536);
    if (scaled >= need) {
      s.uses = 0;                       // reset happens before the cap check, as in the donor
      if (s.value < MASTER && (s.value < MASTER_GATE || !alreadyMastered(h))) {
        s.value += 1;
        h.currentSum = currentLevelSum(h);
      }
    }
  }
  return checkForLevelUp(h); // donor: the sum was refreshed at each rise
}

// On the level-up screen: one level, a bonus pool roll, and a hit point gain. The roll is passed in.
function applyLevelUp(h: Hero, bonusRoll: number, hpGain: number): { bonusPool: number; maxHpGain: number } {
  h.level += 1;
  h.readyToLevelUp = false;
  return { bonusPool: clamp(bonusRoll, BONUS_MIN, BONUS_MAX), maxHpGain: hpGain };
}

export {};
