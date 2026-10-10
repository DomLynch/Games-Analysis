// clean-room: written from the described mechanism (CC-BY-SA 3.0 donor), not a translation of the donor lines.
// Two tracks per skill: practical XP (exercise) and theory XP (knowledge). Practice catches up toward theory.
const MAX_SKILL = 10;
const DAY = 24 * 60 * 60;   // rust grace and rust cadence (game time units assumed in seconds here)

interface Skill {
  level: number;          // practical level
  exercise: number;       // practical XP into the current level
  knowledgeLevel: number; // theory level
  knowledgeXp: number;    // theory XP into the current theory level
  rustAcc: number;        // XP taken away by rust, kept for slowdown
  lastPracticed: number;  // game time of last practice
}

const levelXp = (l: number): number => 10000 * (l + 1) ** 2;   // XP to go from level l to l+1

function onExerciseChange(s: Skill, allowMulti: boolean): void {
  if (s.exercise < 0) {                       // de-level: park just below the current level's start
    s.exercise = 10000 * s.level ** 2 - 1;
    s.level -= 1;
    return;
  }
  while (s.exercise >= levelXp(s.level)) {
    s.exercise = allowMulti ? s.exercise - levelXp(s.level) : 0;
    s.level += 1;
    if (s.level > s.knowledgeLevel) { s.knowledgeLevel = s.level; s.knowledgeXp = 0; }
  }
  if (s.rustAcc < 0) s.rustAcc = 0;
  if (s.level === s.knowledgeLevel && s.exercise > s.knowledgeXp) s.knowledgeXp = s.exercise;
  if (s.knowledgeXp >= 10000 * (s.knowledgeLevel + 1) ** 2) { s.knowledgeXp = 0; s.knowledgeLevel += 1; }
}

// One practice event. catchupMod ~ 1 + (2*INT + PER)/24, knowMod ~ 1 + INT/40 (donor formulas, set by caller).
function train(s: Skill, amount: number, catchupMod: number, knowMod: number,
               allowMulti: boolean, scaling: number, now: number): void {
  if (amount < 0) return;
  const levelGap = Math.max(s.knowledgeLevel, 1) / Math.max(s.level, 1);
  let catchup = amount * catchupMod;
  let know = amount * knowMod;
  if (s.knowledgeLevel > s.level) {
    catchup *= levelGap;                      // theory ahead: practice catches up faster
  } else if (s.knowledgeLevel === s.level && s.knowledgeXp > s.exercise) {
    // same level: catch-up slows as practice closes on theory
    catchup = amount * Math.max(catchupMod - s.exercise / s.knowledgeXp, 1);
    know = amount * Math.max(knowMod - 0.1 * s.exercise / s.knowledgeXp, 1);
  } else {
    catchup = amount;
    know = amount;
  }
  if (know > catchup * 0.9) know = catchup * 0.9;   // theory cannot outrun practice by much
  if (s.knowledgeLevel >= MAX_SKILL) know = 0;
  if (scaling > 0) { catchup *= scaling; know *= scaling; }
  s.exercise += catchup;
  s.rustAcc -= catchup;
  s.knowledgeXp += know;
  s.lastPracticed = now;
  onExerciseChange(s, allowMulti);
}

// Book or teacher: theory only. Gain is halved-ish by the level gap: 2 / (gap + 1).
function knowledgeTrain(s: Skill, amount: number, npcKnowledge: number, scaling: number): void {
  const gap = npcKnowledge > 0
    ? Math.max(npcKnowledge - s.knowledgeLevel, 1)
    : Math.max(s.knowledgeLevel - s.level, 1);
  amount *= 2 / (gap + 1);
  if (scaling > 0) amount = Math.ceil(amount * scaling);
  s.knowledgeXp += amount;
  if (s.knowledgeXp >= 10000 * (s.knowledgeLevel + 1) ** 2) { s.knowledgeXp = 0; s.knowledgeLevel += 1; }
}

// Once per day: practical XP leaks into the rust accumulator. No rust in the grace period after practice.
function rust(s: Skill, now: number, rustResistPct: number, rustMult: number): void {
  if (now - s.lastPracticed < DAY) return;
  if (s.level >= MAX_SKILL) return;
  const lm = (s.level + 1) ** 2;
  const levelExp = lm * 10000;
  if (s.rustAcc > levelExp * 3) return;               // capped: too small to matter
  const slowdown = Math.max(Math.sqrt(s.rustAcc / levelExp), 0.04);
  let amount = Math.trunc((lm * rustMult * 16) / slowdown);
  if (rustResistPct > 0) amount = Math.round(amount * Math.max(100 - rustResistPct, 0) / 100);
  if (s.level === 0) amount = Math.min(amount, s.exercise);
  if (amount <= 0) return;
  s.rustAcc += amount;
  s.exercise -= amount;
  onExerciseChange(s, false);
}

export {};
