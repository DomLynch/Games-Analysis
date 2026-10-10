// Licence: MIT (donor LICENSE.txt). Adaptable; this sketch re-expresses the mechanism in TypeScript with the donor's order of steps.
type Env = "city" | "wilderness" | "interior" | "dungeon";

interface Gate {
  env: Env;
  hourChanged: boolean;
  minuteChanged: boolean;
  citizensPresent: boolean;   // donor: !isNightForEncounters || anyCitizensNearby
  camping: boolean;
  onRaisedPlatform: boolean;
  enemyNearby: boolean;       // donor: anyEnemiesNearby(playerPosition)
  playerLevel: number;
}

interface Row { count: number; id: number; level: number; }

interface EncounterData {
  chance: Record<Env, { day: number; night: number }>; // zone data: percent 0..100 (donor: EXE table, read at load)
  rowsByLevel: number[][];                              // zone data: for each level, the row indexes that carry it (donor: two matches)
  rows: Row[];                                          // zone data: count, id, level per row
}

interface Rng { next(n: number): number; raw16(): number; }

// Donor: ArenaMathUtils::getDiceParameters and rollBoundedDice (ArenaMathUtils.cpp 52-96).
function diceParams(value: number): { faces: number; count: number } {
  let v = value;
  for (;;) {
    for (let divisor = 6; divisor > 4; divisor--) {
      if (v % divisor === 0) return { faces: divisor + 1, count: v / divisor };
    }
    v++;
  }
}
function rollBoundedDice(maxValue: number, rng: Rng): number {
  if (maxValue <= 8) return rng.next(maxValue);
  const p = diceParams(maxValue);
  let sum = 0;
  for (let i = 0; i < p.count; i++) sum += rng.next(p.faces);
  return sum > maxValue ? rollBoundedDice(maxValue, rng) : sum;
}

// Donor: rollWeightedEncounterLevel (ArenaEntityUtils.cpp 1166-1169). Triangular fold around the level.
function weightedLevel(level: number, rng: Rng): number {
  const r = rollBoundedDice(level * 2, rng);
  return r > level ? level * 2 - r : r;
}

// Donor: chooseEncounterEnemy level part (ArenaEntityUtils.cpp 1179-1201).
function chooseLevel(playerLevel: number, rng: Rng): number {
  let level = Math.min(playerLevel + 1, 20) + rng.next(4);
  for (;;) {
    const r = weightedLevel(level, rng);
    if (r >= Math.floor(level / 2)) { level = Math.max(r, 1); break; }
    level = (level >> 1) * 2; // round down to even, then roll again
  }
  if (playerLevel === 0 && level >= 2) level = rng.next(3);
  return level;
}

// Donor: findRandomSpawnLocationAroundPlayer (ArenaEntityUtils.cpp 1231-1276). Offset sampler that halves the shift to widen.
const snap = (c: number): number => (c & ~127) + 64;
export function offsetSample(px: number, pz: number, rng: Rng): { x: number; z: number } | null {
  let shift = 6;
  while (shift > 0) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const dx = ((rng.raw16() << 16) >> 16) >> shift;
      const dz = ((rng.raw16() << 16) >> 16) >> shift;
      const x = snap(px + dx);
      const z = snap(pz + dz);
      if ((x >> 7) === (px >> 7) && (z >> 7) === (pz >> 7)) continue; // same tile as the player
      return { x, z };
    }
    shift >>= 1;
  }
  return null; // donor asserts here; sketch gives up
}

// One encounter attempt, called on a game-clock change. Order follows GameState.cpp 1273-1322.
export function encounterAttempt(g: Gate, night: boolean, data: EncounterData, rng: Rng, place: () => { x: number; z: number } | null): { row: Row; points: ({ x: number; z: number } | null)[] } | null {
  const minuteOk = g.minuteChanged && !g.onRaisedPlatform && (g.env === "city" ? !g.citizensPresent
    : g.env !== "wilderness" ? (!g.camping || g.env === "interior") : false);
  const hourOk = g.hourChanged && !g.onRaisedPlatform && (g.env === "wilderness" || g.camping);
  if (!(minuteOk || hourOk) || g.enemyNearby) return null;

  const chance = data.chance[g.env][night ? "night" : "day"];
  if (chance <= rng.next(100)) return null;

  const level = chooseLevel(g.playerLevel, rng);
  const matches = (data.rowsByLevel[level] ?? []).slice(0, 2);
  if (matches.length === 0) return null; // donor asserts two matches (debug only)
  const row = data.rows[matches[rng.next(2)]];
  const points: ({ x: number; z: number } | null)[] = [];
  for (let i = 0; i < row.count; i++) points.push(place());
  return { row, points };
}
export {};
