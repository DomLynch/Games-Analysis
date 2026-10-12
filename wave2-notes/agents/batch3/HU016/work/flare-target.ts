// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const LOGIC_STEPS_PER_SECOND = 60;             // donor default max_fps; timers count logic steps
const WINDOW_STEPS = 10 * LOGIC_STEPS_PER_SECOND;  // donor default: 10 s target window

interface Foe {
  id: number;
  hp: number;
  hpMax: number;
  alive: boolean;
}

interface Focus {
  target: Foe | null;     // the foe the HUD frame shows
  lastHit: Foe | null;    // last foe hit by a power (donor: hazards->last_enemy)
  windowLeft: number;     // logic steps left on the target window (donor: menu timeout)
}

// Called on each hit. FIX: the donor only refreshes the window when a target is newly chosen,
// so re-hitting the locked target did not extend it. Here a hit on the locked foe refreshes it.
function onHit(f: Focus, foe: Foe): void {
  f.lastHit = foe;
  if (f.target === foe) f.windowLeft = WINDOW_STEPS;
}

// Keyboard or gamepad path, once per logic step. Donor order: tick the window, then
// keep the locked last-hit target while its window runs and it lives; else take the
// last hit; else the nearest foe in range. The nearest-foe value is computed on every
// path here (the donor clears it first and skips it on the sticky return).
function stepKeyboard(f: Focus, nearestInRange: Foe | null): void {
  if (f.windowLeft > 0) f.windowLeft -= 1;

  if (f.lastHit) {
    if (f.target === f.lastHit) {
      if (f.windowLeft > 0 && f.lastHit.hp > 0) return;   // sticky: keep the lock
      f.lastHit = null;                                  // window over or foe dead: drop it
    }
    f.target = f.lastHit;
  } else {
    f.target = nearestInRange;
  }
  if (f.target) f.windowLeft = WINDOW_STEPS;
}

// Mouse path, once per logic step. The last hit is used once, then the cursor decides.
function stepMouse(f: Focus, underCursor: Foe | null): void {
  if (f.windowLeft > 0) f.windowLeft -= 1;
  if (f.lastHit) {
    f.target = f.lastHit;
    f.lastHit = null;
  } else {
    f.target = underCursor;
  }
  if (f.target) f.windowLeft = WINDOW_STEPS;
}

// Frame HUD bar: length = hp * fill width / max, truncated; at least 1 px while hp > 0.
function hpBarLengthPx(hp: number, hpMax: number, fillWidthPx: number): number {
  if (hpMax === 0) return 0;
  let len = Math.trunc((hp * fillWidthPx) / hpMax);
  if (len === 0 && hp > 0) len = 1;
  return Math.max(0, len);
}

export {};
