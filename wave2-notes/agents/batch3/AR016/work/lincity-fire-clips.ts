// Licence: GPL-2.0-or-later (lincity-ng fire.cpp header and COPYING.txt, read). Clean-room sketch written from the described mechanism; not a translation of fire.cpp.
// clean-room
export {};

interface LoopState {
  frame: number; // current pose index in the loop clip
  deadline: number; // real-time ms when the next step is due
}

// Donor FIRE_ANIMATION_SPEED: 200 + rand() % 350 - 175, so 25..374 ms. Redrawn on every step.
export function donorLoopPeriodMs(rand: () => number): number {
  return 200 + Math.floor(rand() * 350) - 175;
}

// Donor ANIM_THRESHOLD: snap a period onto a grid of cadenceMs, offset by -cadenceMs/2 (integer maths, as in the C macro).
export function snapPeriod(periodMs: number, cadenceMs: number): number {
  return Math.floor((periodMs + cadenceMs / 2) / cadenceMs) * cadenceMs - cadenceMs / 2;
}

// Burning branch: advance one pose when the real clock reaches the deadline, then draw the next period. Never catches up in one call.
export function stepLoop(
  s: LoopState,
  poseCount: number,
  nowMs: number,
  rand: () => number,
  cadenceMs: number,
): void {
  if (nowMs < s.deadline) return;
  s.deadline = nowMs + snapPeriod(donorLoopPeriodMs(rand), cadenceMs);
  s.frame = (s.frame + 1) % poseCount;
}

// Aftermath branch: the pose follows progress through the aftermath, and is clamped to the top index. No loop.
// Donor: frame = smoking_days * 4 / AFTER_FIRE_LENGTH, with 4 as the top index.
export function aftermathPose(elapsedTicks: number, totalTicks: number, topIndex: number): number {
  const idx = Math.floor((elapsedTicks * topIndex) / totalTicks);
  return Math.min(idx, topIndex);
}
