// Licence: CC0 1.0 Universal (donor, Duelyst). Public-domain dedication; shape only, written from the mechanism, not a translation.
export {};

interface Pacing {
  maxGapMs: number;      // donor CONFIG.REPLAY_MAX_STEP_DELAY * 1000 (5000)
  openingGapMs: number;  // donor CONFIG.REPLAY_MAX_STEP_DELAY_STARTING_HAND * 1000 (10000), mulligan
  cull: boolean;         // donor CONFIG.replaysCullDeadtime (true)
  speed: number;         // donor CONFIG.replayActionSpeedModifier (1.0; UI cycles 1.0 -> 1.5 -> 2.0)
}

interface StepTiming { delayMs: number; scale: number; }

// Gap from one recorded step to the next, capped when culling, then divided by speed exactly once.
// scale = culled gap / recorded gap, applied to UI events that sit inside the gap.
export function stepTiming(curTs: number, nextTs: number, p: Pacing, opening: boolean): StepTiming {
  const base = Math.max(0, nextTs - curTs);
  const cap = opening ? p.openingGapMs : p.maxGapMs;
  const clamped = p.cull ? Math.min(base, cap) : base;
  // guarded: the donor's _startReplayingSteps divides without this check (replayEngine.coffee line 290)
  const scale = base > 0 && clamped < base ? clamped / base : 1;
  return { delayMs: clamped / p.speed, scale };
}

// Wait until a UI event (hover, select, emote) should fire, measured from the moment its anchor step started.
// One mapping for before and after the step; speed applied once.
export function uiWaitMs(
  evTs: number, anchorTs: number, scale: number, speed: number,
  anchorStartedMs: number, nowMs: number,
): number {
  const fireAtMs = ((evTs - anchorTs) * scale) / speed;
  return Math.max(0, fireAtMs - (nowMs - anchorStartedMs));
}

// Pause and resume: the time left is the delay minus the time already played.
export function resumeWaitMs(remainingAtPauseMs: number, pausedAtMs: number, startedAtMs: number): number {
  return Math.max(0, remainingAtPauseMs - (pausedAtMs - startedAtMs));
}
