// Licence: MIT (donor LostCityRS-Engine-TS, Copyright (c) 2023-2026 Lost City). Clean-room sketch written from the mechanism.
// Target (proposed): src/fight/ai-idle.ts. One call per NPC per fixed server tick.

export {};

type Rand = () => number; // seeded per-NPC stream, values in [0, 1)

interface Tile { x: number; z: number; }
interface PatrolPoint extends Tile { dwellTicks: number; }

interface RoutineDef {          // one NPC type row (zone data)
  mode: "wander" | "patrol";    // default idle mode
  moveRestrict: boolean;        // true = never leaves its tile
  wanderRange: number;          // tiles either side of home
  patrol: PatrolPoint[];        // ordered points, each with a dwell time
}

interface RoutineState {
  home: Tile;                   // spawn tile
  pos: Tile;                    // current tile; the caller updates it after a move
  nextPoint: number;            // patrol index
  dwellLeft: number;            // -1 = not dwelling
  idleTicks: number;            // wander leash counter; the caller resets it when pos changes
  walkTicks: number;            // patrol stuck counter; counts only while walking
}

type Cmd = { kind: "stand" } | { kind: "walk"; to: Tile } | { kind: "snap"; to: Tile };

const WANDER_CHANCE = 0.125;     // chance per tick to pick a new wander tile (engine constant)
const WANDER_LEASH_TICKS = 500;  // idle ticks before the snap home (engine constant)
const PATROL_STUCK_TICKS = 32;   // ticks walking without arriving before a snap (engine constant)

function randInt(rand: Rand, lo: number, hi: number): number { // inclusive, uniform
  return lo + Math.floor(rand() * (hi - lo + 1));
}

function wanderTick(def: RoutineDef, st: RoutineState, rand: Rand): Cmd {
  let cmd: Cmd = { kind: "stand" };
  if (!def.moveRestrict && rand() < WANDER_CHANCE) {
    const r = def.wanderRange;
    const to: Tile = { x: st.home.x + randInt(rand, -r, r), z: st.home.z + randInt(rand, -r, r) };
    if (to.x !== st.pos.x || to.z !== st.pos.z) cmd = { kind: "walk", to };
  }
  const old = st.idleTicks;
  st.idleTicks++;
  if (old > WANDER_LEASH_TICKS) {
    st.idleTicks = 0;
    const onHome = st.pos.x === st.home.x && st.pos.z === st.home.z;
    if (!onHome) return { kind: "snap", to: st.home };
  }
  return cmd;
}

function patrolTick(def: RoutineDef, st: RoutineState): Cmd {
  const n = def.patrol.length;
  if (n === 0) return { kind: "stand" };
  const p = def.patrol[st.nextPoint];
  const atPoint = st.pos.x === p.x && st.pos.z === p.z;
  if (!atPoint) {
    st.walkTicks++; // fix: counts walking only (the donor also counted dwell ticks)
    if (st.walkTicks >= PATROL_STUCK_TICKS) {
      st.walkTicks = 0;
      return { kind: "snap", to: p };
    }
    return { kind: "walk", to: p };
  }
  st.walkTicks = 0;
  if (st.dwellLeft < 0) st.dwellLeft = p.dwellTicks;
  if (st.dwellLeft === 0) {
    st.dwellLeft = -1;
    st.nextPoint = (st.nextPoint + 1) % n;
    return { kind: "walk", to: def.patrol[st.nextPoint] };
  }
  st.dwellLeft--;
  return { kind: "stand" };
}

export function routineTick(def: RoutineDef, st: RoutineState, rand: Rand): Cmd {
  return def.mode === "patrol" ? patrolTick(def, st) : wanderTick(def, st, rand);
}

// Seeded stream that replaces Math.random: one stream per NPC so a replay gets the same choices.
// A 32-bit LCG is enough for the sketch; a real build would use a stronger seeded generator.
export function seededRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}
