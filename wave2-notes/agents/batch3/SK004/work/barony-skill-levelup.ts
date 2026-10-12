// Licence: BSD-2-Clause (donor LICENSE.txt, Turning Wheel LLC 2013-2020). Code may be adapted; this sketch is written from the described mechanism.
// Fixes applied: (1) the donor compares the trained-proficiency id with PRO_LOCKPICKING (= 0), which is a disguised "trained" flag; the sketch takes an explicit boolean.
// (2) the donor checks XP for one level per award (if, not while); the sketch loops so one large award can grant several levels.

type Rng = () => number; // returns a value in [0, 1)

const SKILL_BASIC = 20;   // donor stat.hpp:196
const SKILL_CAP = 100;    // donor entity.cpp:2504
const XP_PER_LEVEL = 100; // donor entity.cpp:4062
const LEVEL_CAP = 255;    // donor entity.cpp:4070 (LVL < 255 check)

// Kill-gated proficiency gain: only on a killing blow, only while below Basic, 1 in 20 chance, cap 100.
// Outside this gate (other events), the donor calls increaseSkill directly; that path is not modelled here.
function killSkillGain(prof: number, killed: boolean, rng: Rng): number {
  if (!killed || prof >= SKILL_BASIC || prof >= SKILL_CAP) return prof;
  if (Math.floor(rng() * 20) !== 0) return prof;
  return prof + 1;
}

// Three distinct stats for a level-up. First pick uniform over 6 stats; second and third are weighted draws
// without replacement from the class weight row (weights of 0 are never drawn).
function pickThreeStats(weights: number[], rng: Rng): number[] {
  const w = weights.slice();
  const picks: number[] = [];
  const first = Math.floor(rng() * 6);
  picks.push(first);
  w[first] = 0;
  for (let k = 0; k < 2; k++) {
    const total = w.reduce((a, b) => a + b, 0);
    let idx = -1;
    if (total > 0) {
      let t = rng() * total;
      for (let i = 0; i < w.length; i++) {
        t -= w[i];
        if (t < 0) { idx = i; break; }
      }
    }
    if (idx < 0) idx = w.findIndex((v, i) => !picks.includes(i)); // no weight left: take the first unused stat
    picks.push(idx);
    w[idx] = 0;
  }
  return picks;
}

// Apply the three picks: +1 each. Each pick whose stat has a trained linked proficiency rolls 1 in 5 for +2; the first success ends the rolls.
// With all three picks trained this fires on about 1 - 0.8^3 = 49 percent of level-ups (donor entity.cpp:4311-4313, same pattern at 4340-4342).
function applyLevelUp(stats: number[], picks: number[], trained: boolean[], rng: Rng): number[] {
  const out = stats.slice();
  let rolled = false;
  for (const s of picks) {
    out[s] += 1;
    if (trained[s] && !rolled && Math.floor(rng() * 5) === 0) {
      out[s] += 1;
      rolled = true;
    }
  }
  return out;
}

// XP award: loop so one large award can grant several levels (donor checks once with if).
function awardXp(exp: number, lvl: number, gained: number): { exp: number; lvl: number; levelsGained: number } {
  let e = exp + gained;
  let l = lvl;
  let levelsGained = 0;
  while (e >= XP_PER_LEVEL && l < LEVEL_CAP) {
    e -= XP_PER_LEVEL;
    l += 1;
    levelsGained += 1;
  }
  return { exp: e, lvl: l, levelsGained };
}

export {};
