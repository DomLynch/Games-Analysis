// Licence: MIT (OpenTESArena LICENSE.txt). Shape re-typed from the donor's enemy swing logic; numbers as in the donor.
export interface SwingState {
  phase: "windup" | "swing";
  windupLeft: number; // seconds until the next swing starts
  elapsed: number;    // seconds into the current swing (the clip's own timeline)
  hitDone: boolean;   // at most one hit per swing
}

export const HIT_AT = 0.5;        // hit gate: swing progress >= 50%
export const WINDUP_MAX_S = 0.75; // wind-up is a random fraction of 0.75 s
export const MELEE_START = 1.0;   // horizontal distance to start a swing
export const MELEE_STOP = 1.15;   // horizontal distance that cancels a swing (hysteresis band)
export const CLIP_FPS = 14;       // attack clip: keyframe count / 14 seconds

// unitRandom is a value in [0, 1) supplied by the caller's RNG.
export function startWindup(unitRandom: number): SwingState {
  return { phase: "windup", windupLeft: unitRandom * WINDUP_MAX_S, elapsed: 0, hitDone: false };
}

export function swingSecondsFromFrames(frameCount: number): number {
  return frameCount / CLIP_FPS;
}

// One frame of the enemy swing. Returns what happened this frame.
export function stepSwing(
  s: SwingState,
  distXZ: number,
  dt: number,
  swingSeconds: number,
  onHit: () => void,
): "windup" | "swinging" | "finished" | "cancelled" {
  if (s.phase === "windup") {
    if (distXZ > MELEE_STOP) return "cancelled";
    s.windupLeft -= dt;
    if (s.windupLeft > 0) return "windup";
    // The swing starts at progress 0; it advances from the next frame on.
    s.phase = "swing";
    s.elapsed = 0;
    s.hitDone = false;
    return "swinging";
  }

  // Advance the swing clock first; the donor advances animations before the enemy step.
  s.elapsed = Math.min(s.elapsed + dt, swingSeconds);
  const progress = s.elapsed / swingSeconds;

  // Hit gate: once per swing, at 50% progress, and only if still in range at that moment.
  if (!s.hitDone && progress >= HIT_AT) {
    s.hitDone = true;
    if (distXZ <= MELEE_STOP) onHit();
  }

  if (progress < 1) return "swinging";
  // Finished: the caller decides between walking away and the next wind-up.
  return "finished";
}

export {};
