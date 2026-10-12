// Licence: GPL-3.0 (donor, FLARE COPYING; file headers say "version 3 of the License, or any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type Pt = { x: number; y: number };

// Tap-to-move thresholds in map units (tiles assumed; the donor's units are not stated in the settings comment).
const START_TILES = 0.75; // threshold while stopped (donor EngineSettings.cpp 93)
const STOP_TILES = 0.25;  // threshold while walking (donor EngineSettings.cpp 94)
const ARRIVE_SPEED_MULT = 2; // arrival radius = 2 x hero speed, with no path left (donor Avatar.cpp 1215)

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface WalkState {
  moving: boolean;
}

// Tap-to-move hysteresis: a tap starts a walk only beyond START_TILES; a walk that has begun
// keeps going until the tap point is within STOP_TILES, or the hero has arrived.
export function stepTapToMove(s: WalkState, hero: Pt, tap: Pt, heroSpeed: number, pathLeft: number): WalkState {
  const threshold = s.moving ? STOP_TILES : START_TILES;
  const distant = dist(hero, tap) >= threshold;
  const arrived = pathLeft === 0 && dist(hero, tap) <= heroSpeed * ARRIVE_SPEED_MULT;
  return { moving: distant && !arrived };
}

// Virtual pad: four digital directions with a square per-axis deadzone, and only while the finger
// is inside the pad circle (donor MenuTouchControls.cpp 89-98). Screen y grows downward.
export interface PadDirs { left: boolean; right: boolean; up: boolean; down: boolean; }

export function padDirections(finger: Pt, center: Pt, radius: number, deadzone: number): PadDirs {
  const inside = dist(finger, center) <= radius; // donor uses Utils::isWithinRadius (not read; <= assumed)
  if (!inside) return { left: false, right: false, up: false, down: false };
  return {
    left: finger.x < center.x - deadzone,
    right: finger.x > center.x + deadzone,
    up: finger.y < center.y - deadzone,
    down: finger.y > center.y + deadzone,
  };
}

// Slow repeat with an accelerating delay (donor SDLInputState.cpp 627-648). Constants are frames at 60 FPS:
// full delay 60, step 30, floor 6 (donor: max_fps, max_fps/2, max_fps/10). Timer semantics are not read;
// this sketch assumes one countdown step per frame. Returns true on the frame a repeat is delivered.
export interface KeyRep { lock: boolean; timer: number; delay: number; }
const FULL_DELAY = 60;
const DELAY_STEP = 30;
const DELAY_FLOOR = 6;

export function slowRepeat(k: KeyRep, held: boolean): boolean {
  if (!held) {
    k.lock = false;
    k.delay = FULL_DELAY;
    k.timer = 0;
    return false;
  }
  if (!k.lock) {
    k.lock = true;
    k.delay = Math.max(DELAY_FLOOR, k.delay - DELAY_STEP);
    k.timer = k.delay;
    return true;
  }
  k.timer -= 1;
  if (k.timer <= 0) k.lock = false;
  return false;
}

export {};
