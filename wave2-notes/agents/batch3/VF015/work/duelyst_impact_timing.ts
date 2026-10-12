// clean-room sketch: a hit's visual reaction waits for its effect's impact time; a high-damage hit adds a focus
// and a shake window clamped to the time the action stays on screen. Donor licence: CC0-1.0 (public domain
// dedication). Written from the described mechanism, not a line-by-line translation.

export interface FxSprite {
  baseDuration: number;  // seconds (donor FXSprite.getBaseDuration, not read in full)
  impactAtEnd: boolean;  // true: the effect lands at the end of its duration (donor FXSprite.js:366-367)
}

// Donor utils_engine.js:597-624 takes the max over the effect sprites; only impactAtEnd sprites delay.
export function impactDelayOf(fx: FxSprite[]): number {
  let d = 0;
  for (const f of fx) if (f.impactAtEnd) d = Math.max(d, f.baseDuration);
  return d;
}

// Donor GameLayer.js:3418: the target reacts at action start plus the impact delay of the game effect.
export function reactionTime(actionStart: number, gameFx: FxSprite[]): number {
  return actionStart + impactDelayOf(gameFx);
}

export interface FocusSpec {
  inDur: number;        // donor CONFIG.HIGH_DAMAGE_SCREEN_FOCUS_IN_DURATION = 0.1
  delay: number;        // donor CONFIG.HIGH_DAMAGE_SCREEN_FOCUS_DELAY = 0.0
  outDur: number;       // donor CONFIG.HIGH_DAMAGE_SCREEN_FOCUS_OUT_DURATION = 0.25
  shakeDur: number;     // donor CONFIG.HIGH_DAMAGE_SCREEN_SHAKE_DURATION = 0.35
  shakeStrength: number; // donor CONFIG.HIGH_DAMAGE_SCREEN_SHAKE_STRENGTH = 20.0
}

export interface FocusWindow {
  inDur: number;
  delay: number;
  outDur: number;
  shakeAt: number;
  shakeDur: number;
  shakeStrength: number;
}

// Donor GameLayer.js:4287-4308: the window is clamped to the time until the next action (nextActionDelay).
export function focusWindow(
  spec: FocusSpec,
  nextActionDelay: number,
  reactionAt: number,
): FocusWindow {
  const total = spec.inDur + spec.delay + spec.outDur;
  const safe = Math.max(nextActionDelay - reactionAt, total);
  return {
    inDur: Math.min(spec.inDur, (spec.inDur / total) * safe),
    delay: Math.min(spec.delay, (spec.delay / total) * safe),
    // FIX: donor line 4296 scales the out phase by total/total (=1), so the clamp never shrinks it
    outDur: Math.min(spec.outDur, (spec.outDur / total) * safe),
    shakeAt: reactionAt + Math.min(0.1, spec.inDur * 0.5), // donor GameLayer.js:4308
    shakeDur: spec.shakeDur,
    shakeStrength: spec.shakeStrength,
  };
}

export interface Shaker {
  origin: { x: number; y: number };
  strength: number;
  duration: number;
}

// Donor Shake.js:28-36: at t = 1 the node returns to its origin; before that the offset is random with an
// amplitude that falls linearly to zero (the (1 - time) factor).
export function shakeOffset(s: Shaker, t01: number, rnd: () => number): { x: number; y: number } {
  if (t01 >= 1) return { x: s.origin.x, y: s.origin.y };
  const amp = s.strength * (1 - t01);
  return {
    x: s.origin.x + (rnd() * 2 - 1) * amp,
    y: s.origin.y + (rnd() * 2 - 1) * amp,
  };
}

// FIX: donor Shake.reverse() (Shake.js:49) and clone() (Shake.js:52-56) drop the origin and, for clone, the strength.
export function copyShaker(s: Shaker): Shaker {
  return { origin: { ...s.origin }, strength: s.strength, duration: s.duration };
}

export {};
