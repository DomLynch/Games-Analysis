// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ClipTiming {
  frames: number;       // authored key count
  authoredFps: number;  // rate the key times are expressed in
  playFps: number;      // rate the clip is played at (table value)
  looping: boolean;     // false = play once and hold the last pose
}

function authoredDuration(c: ClipTiming): number {
  return c.authoredFps > 0 ? c.frames / c.authoredFps : 0;
}

// Authored seconds of clip per real second; 0 when a rate is missing.
function rateScale(c: ClipTiming): number {
  return c.authoredFps > 0 && c.playFps > 0 ? c.playFps / c.authoredFps : 0;
}

// Sample time in authored seconds. Moving: one cycle covers strideUnits of ground, so cycles per
// second = speed / stride (feet stay planted). Standing: the clip's own playback rate.
// phaseFrac is a fraction of one cycle, added after the rate.
function sampleTime(c: ClipTiming, elapsedS: number, speed: number, strideUnits: number, phaseFrac: number): number {
  const dur = Math.max(authoredDuration(c), 0.001);
  const cyclesPerS = speed > 0 && strideUnits > 0
    ? speed / strideUnits
    : (rateScale(c) > 0 ? rateScale(c) : 1) / dur;
  let cycles = elapsedS * cyclesPerS + phaseFrac;
  if (!c.looping) cycles = Math.min(cycles, 1 - 1e-6); // clamp: hold the last pose
  const frac = cycles - Math.floor(cycles);
  return frac * dur;
}

const BLEND_SECONDS = 0.2;

interface Blend { cur: string; prev: string | null; blendStart: number; }

// Weight of the current state in a cross-fade; null when nothing is blending.
function blendWeight(b: Blend, now: number): number | null {
  if (b.prev === null || b.prev === b.cur) return null;
  const elapsed = now - b.blendStart;
  if (elapsed >= BLEND_SECONDS - 1e-3) return null;
  return Math.min(Math.max(elapsed / BLEND_SECONDS, 0), 1);
}

export {};
