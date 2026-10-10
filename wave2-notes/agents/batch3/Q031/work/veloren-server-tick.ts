// Licence: GPL-3.0-or-later (donor). Clean-room sketch of the mechanism; not a translation of the donor lines.
const SMOOTH_WEIGHT = 0.05; // weight of each new sample in the running averages
const NUDGE_RATE = 0.05; // share of (real - game) time applied to the game step each loop
const MAX_GAME_DT = 1 / 5; // seconds; cap on the game step handed to the sim

export interface ClockState {
  targetDt: number; // seconds per loop the clock aims for
  averageDt: number;
  averageBusy: number;
  realTime: number;
  gameTime: number;
  lastRealDt: number;
  lastGameDt: number;
  lastTick: number; // seconds, monotonic
  lastWork: number; // seconds, monotonic
}

export function newClock(targetDt: number, now: number): ClockState {
  return {
    targetDt,
    averageDt: targetDt,
    averageBusy: targetDt,
    realTime: 0,
    gameTime: 0,
    lastRealDt: targetDt,
    lastGameDt: targetDt,
    lastTick: now,
    lastWork: now,
  };
}

// Called once per loop after the work is done. Returns the seconds to sleep before the next loop.
// Simplified: assumes the sleep lasts exactly the returned time (the donor reads the clock after it).
export function clockTick(c: ClockState, now: number): number {
  const busy = now - c.lastWork;
  c.averageBusy += (busy - c.averageBusy) * SMOOTH_WEIGHT;

  const tickTime = now - c.lastTick;
  c.averageDt += (tickTime - c.averageDt) * SMOOTH_WEIGHT;

  const sleep = Math.max(0, c.targetDt - busy); // no sleep when the work overran the target

  c.lastTick = now;
  c.lastWork = now + sleep;

  c.realTime += c.lastRealDt;
  c.gameTime += c.lastGameDt;
  c.gameTime = Math.min(c.gameTime, c.realTime); // game time never passes real time

  c.lastRealDt = tickTime;
  c.lastGameDt = Math.min(c.averageDt + (c.realTime - c.gameTime) * NUDGE_RATE, MAX_GAME_DT);
  return sleep;
}

// The dedicated server loop: exactly one sim step per loop, using the game dt
// the clock computed on the previous loop. There is no catch-up loop.
export function runOneLoop(c: ClockState, simStep: (dtS: number) => void): void {
  simStep(c.lastGameDt);
}

export {};
