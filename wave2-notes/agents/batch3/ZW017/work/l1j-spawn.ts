// Licence: GPL-2.0-or-later (donor header: "either version 2, or (at your option) any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Pt { x: number; y: number; }

export interface SpawnSpec {
  minRespawnS: number;                                  // min_respawn_delay, seconds
  maxRespawnS: number;                                  // max_respawn_delay, seconds
  area?: { x1: number; y1: number; x2: number; y2: number }; // half-open box, as the donor's nextInt range
  offset?: { rx: number; ry: number };                  // random offset around the fixed point
  fixed: Pt;
  respawnScreen: boolean;                               // true = skip the presence gate
}

export type SpawnResult =
  | { kind: "placed"; at: Pt }
  | { kind: "retry"; afterMs: number };

const MAX_TRIES = 50;       // 51 attempts in total, as the donor loop does
const RETRY_MS = 3000;      // a spawn point in view of a player is retried after this
const NEAR_TILES = 13;      // Manhattan tile distance counted as "in view" (near band only)

// Uniform whole-second jitter in [0, max - min), added to the minimum, in milliseconds.
export function respawnDelayMs(spec: SpawnSpec, rand: () => number): number {
  const interval = spec.maxRespawnS - spec.minRespawnS;
  let ms = spec.minRespawnS * 1000;
  if (interval > 0) ms += Math.floor(rand() * interval) * 1000;
  return ms;
}

function pickArea(a: { x1: number; y1: number; x2: number; y2: number }, rand: () => number): Pt {
  return {
    x: Math.floor(rand() * (a.x2 - a.x1)) + a.x1,
    y: Math.floor(rand() * (a.y2 - a.y1)) + a.y1,
  };
}

function pickOffset(spec: SpawnSpec, rand: () => number): Pt {
  const o = spec.offset!;
  return {
    x: spec.fixed.x + (Math.trunc(rand() * o.rx) - Math.trunc(rand() * o.rx)),
    y: spec.fixed.y + (Math.trunc(rand() * o.ry) - Math.trunc(rand() * o.ry)),
  };
}

function inView(p: Pt, players: Pt[]): boolean {
  return players.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) <= NEAR_TILES);
}

// One spawn attempt for a monster. Presence gate: a point with a player in view is not used now.
export function trySpawn(
  spec: SpawnSpec,
  players: Pt[],
  rand: () => number,
  isPassable: (p: Pt) => boolean
): SpawnResult {
  let at: Pt = spec.fixed;
  for (let tries = 0; tries <= MAX_TRIES; tries++) {
    if (spec.area) {
      at = pickArea(spec.area, rand);
      if (tries === MAX_TRIES) at = spec.fixed;      // the last attempt falls back to the fixed point
    } else if (spec.offset) {
      at = pickOffset(spec, rand);
    } else {
      at = spec.fixed;
    }
    if (!isPassable(at)) continue;
    if (spec.respawnScreen || !inView(at, players)) return { kind: "placed", at };
    return { kind: "retry", afterMs: RETRY_MS };
  }
  // After the last failed attempt the donor places the monster at that point without checking
  // passability or view again. The sketch keeps that.
  return { kind: "placed", at };
}

export {};
