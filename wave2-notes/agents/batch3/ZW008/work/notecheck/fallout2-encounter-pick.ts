// Licence: Sustainable Use License 1.0 (donor fallout2-ce). Clean-room: shape only; no donor code or tables copied.
type Roll = (lo: number, hi: number) => number; // inclusive random integer
type Difficulty = "easy" | "normal" | "hard";

interface TravelState { lastCheckMs: number; lastFiredX: number; lastFiredY: number; }

// Gate 1: throttle in real time, then distance. Both axes must have moved minTiles since the last roll that passed.
function mayCheck(s: TravelState, nowMs: number, x: number, y: number, minMs: number, minTiles: number): boolean {
  if (nowMs - s.lastCheckMs < minMs) {
    return false;
  }
  s.lastCheckMs = nowMs;
  if (Math.abs(x - s.lastFiredX) < minTiles) {
    return false;
  }
  if (Math.abs(y - s.lastFiredY) < minTiles) {
    return false;
  }
  return true;
}

// Frequency in percent for this tile and day part. Easy lowers, hard raises it by a fifteenth; 0 and 100 are left alone.
function effectiveFrequency(levelPct: number, difficulty: Difficulty): number {
  let f = levelPct;
  if (f > 0 && f < 100) {
    const m = Math.floor(f / 15);
    if (difficulty === "easy") f -= m;
    if (difficulty === "hard") f += m;
  }
  return f;
}

// Skill check that lets the player notice the encounter first. XP is awarded only when positive.
function noticed(outdoorsman: number, hasSensor: boolean, tileDifficulty: number, roll: Roll): { noticed: boolean; xp: number } {
  let skill = outdoorsman + (hasSensor ? 20 : 0);
  if (skill > 95) {
    skill = 95;
  }
  skill += tileDifficulty;
  const ok = roll(1, 100) < skill;
  return { noticed: ok, xp: ok ? Math.max(0, 100 - skill) : 0 };
}

interface TableEntry { chance: number; counter: number; conditionOk: boolean; }

// Weighted pick over entries whose condition holds and whose counter is not zero. Luck minus 5, perks and difficulty shift the roll.
function pickEntry(entries: TableEntry[], roll: Roll, luck: number, perkBonus: number, difficultyShift: number): number {
  const eligible: number[] = [];
  entries.forEach((e, i) => {
    if (e.conditionOk && e.counter !== 0) eligible.push(i);
  });
  if (eligible.length === 0) {
    throw new Error("no eligible encounter entry");
  }
  const total = eligible.reduce((sum, i) => sum + entries[i].chance, 0);
  let x = roll(0, total) + (luck - 5) + perkBonus + difficultyShift;
  let picked = eligible[eligible.length - 1];
  for (const i of eligible) {
    if (x < entries[i].chance) {
      picked = i;
      break;
    }
    x -= entries[i].chance;
  }
  if (entries[picked].counter > 0) {
    entries[picked].counter -= 1;
  }
  return picked;
}

// Critters in one sub-entry: roll between min and max; easy takes 2 off (floored at min), hard adds 2, a party above two adds 2.
function critterCount(min: number, max: number, roll: Roll, difficulty: Difficulty, partySize: number): number {
  let n = roll(min, max);
  if (difficulty === "easy") n = Math.max(min, n - 2);
  if (difficulty === "hard") n += 2;
  if (partySize > 2) n += 2;
  return n;
}

const travel: TravelState = { lastCheckMs: 0, lastFiredX: 0, lastFiredY: 0 };
const fixed: Roll = (lo) => lo;
console.log(mayCheck(travel, 2000, 5, 5, 1500, 3), effectiveFrequency(45, "hard"), noticed(50, true, 0, fixed).xp);
console.log(pickEntry([{ chance: 3, counter: 2, conditionOk: true }, { chance: 1, counter: -1, conditionOk: true }], fixed, 5, 0, 0));
console.log(critterCount(1, 3, fixed, "easy", 3));

export {};
