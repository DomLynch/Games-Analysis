# flareteam-flare-engine (input-touch-controls, cell 3)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuTouchControls.cpp` (virtual pad), with `src/Avatar.cpp` (tap-to-move), `src/SDLInputState.cpp` (touch, gamepad, slow repeat), `src/InputState.cpp`, `src/EngineSettings.cpp`, `src/Settings.cpp`, `src/Settings.h`, `src/MenuConfig.h`, `src/MenuConfig.cpp`, `src/UtilsMath.h`, `src/Avatar.h` | Licence: GPL-3.0 (`COPYING` is "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; the header of `MenuTouchControls.cpp` says "either version 3 of the License, or (at your option) any later version") | C++ (SDL2) | symbols `MenuTouchControls::logic`, `Avatar::set_direction`, `Avatar::pressing_move`, `Avatar::isNearMMtarget`, `SDLInputState` event loop

Checked: Read in full: `MenuTouchControls.cpp` (all 138 lines) and `MenuTouchControls.h` (declarations). `Avatar.cpp` 286-330 (pressing_move, set_direction start), 330-402 (path recalculation and waypoint), 560-640 (tap target and hysteresis), 676-770 (state transitions), 1212-1220 (arrival). `SDLInputState.cpp` 396-470 (touch events) and 530-575 (gamepad axis), 596-650 (slow repeat). `InputState.cpp` 318-330 (un-press delay). `WidgetInput.cpp` 150-166 (where slow repeat is switched on). Grep-level reads of constants: `EngineSettings.cpp` 92-94, `Settings.cpp` 45, 88, 114, 184-185, `Settings.h` 59-60, `MenuConfig.h` 75-76, `MenuConfig.cpp` 1508, `UtilsMath.h` 59-60, `Avatar.h` 62. Not read: the rest of `Avatar.cpp` (1-285, 402-560, 640-676, 770-1212 except the grep hits), the `Timer` class (so the slow-repeat timing is an assumption), `Utils::isWithinRadius` (I assume `<=`), the pathfinder in `MapCollision`, the keyboard branch of the event loop, and the iPhone and Android platform files. Confidence: high on the virtual pad and the tap-to-move thresholds (read end to end); medium on the slow-repeat timing; high that the donor has no separate release threshold on gamepad axes. Units for tap-to-move thresholds: the donor does not state them; map units (tiles) are assumed from `screenToMap` and `calcDist` use. camera_scope: not applicable (no camera mechanism here). Landscape and portrait: sizes come from `view_h` only (MenuTouchControls.cpp 51-68); no portrait case was read.

Best transferable idea: Gate a phone tap-to-move with two distances (start 0.75 tiles while stopped, stop 0.25 tiles while walking) and an arrival radius of 2 times hero speed, so a near tap never starts a walk and a walk never stutters at the arrival edge.

Decision (proposed): adapt - take the two-threshold tap-to-move rule and the arrival radius as the phone move-to-point mode in `src/fight/input.ts`; keep the start and stop distances as data fields; keep the pad geometry rule (every size is a fraction of one screen scale) but make the pad output analog with a radial deadzone (the donor's pad is four digital directions, which is too coarse for dodging). Why: a 375-wide phone gets a reliable tap-to-move with no code outside the input intake, and the same scale feeds the pad, the action buttons and the deadzone.
Acceptance: On a 375-wide phone, a tap 0.5 tiles from a standing hero does not start a walk; a walk that has started continues until the hero is within 0.25 tiles of the tap point or within 2 times its speed of the target with no path left. A unit test asserts both thresholds and the arrival rule with those numbers.

## 1. Mechanism

Two control modes share one touch layer, and each mode reads the one shared pointer (`inpt->mouse`).

Virtual pad (touch on, mouse-move off), per logic frame (`MenuTouchControls::logic`, 71-105):

- The four direction flags and MAIN2 are cleared (81-82).
- The move pad is a circle at the bottom-left with radius `view_h / 4 * touch_scale` (51). Its deadzone is a square of half-size `view_h / 20 * touch_scale` (54). The action pads are circles of radius `view_h / 6 * touch_scale` (56, 60) at the bottom-right (57, 62-66).
- If MAIN1 is held and the pointer is inside the move circle (89), a direction is set only when the pointer is outside the square deadzone on that axis: left below `centre.x - deadzone` (90), right above `centre.x + deadzone` (92), up above `centre.y - deadzone` (94-95), down below `centre.y + deadzone` (96-97). Screen y grows downward, so the comparisons flip for up and down.
- MAIN2 is set when the pointer is inside the second action circle (102-103).
- The output is four digital flags. `pressing_move` (keyboard or pad branch, 300-303) is true while any direction is held and not locked. There is no magnitude.
- The pad is off when touch is off, or when mouse-move is on (72, 108, 122).

Tap-to-move (mouse-move on), in `Avatar::logic`, 573-609 and `set_direction`, 314-322:

- While the tap key is held (`mm_key`, 63 and 547), the tap point is `screenToMap(pointer)` (576). Distance gate: `mm_is_distant` is true when the distance to the tap point is at least 0.25 while the hero is in ENTITY_MOVE (578) and at least 0.75 otherwise (581). Defaults: 0.25 and 0.75 (EngineSettings.cpp 93-94).
- A tap sets the desired target once, when `mm_is_distant` is true, the tap key is held, the press is not yet locked (or the hero is drag-walking), and the tap point is a valid position (316-321). Then `inpt->lock[mm_key] = true` (319) so that the same press does not re-target. Holding and dragging re-targets (drag_walking, 708, 753-755).
- `pressing_move` in mouse mode is `mm_is_distant && !isNearMMtarget()` (297). `isNearMMtarget` is true when the path is empty and the distance to the desired target is at most `stats.speed * 2` (1215).
- Path: the hero goes straight when the line is clear (327). Otherwise a recalculation is due when a collision occurred, when there is no path, when the target moved more than one tile (349), or on a random roll (334-336). The roll chance rises by 5 on every distant frame (334). It resets to -100 on each recalculation (371), so the next roll is 20 frames away. The pathfinder runs at 373; on failure, a cooldown timer starts after `PATH_FOUND_FAIL_THRESHOLD` = 1 failure (362-365, 375-380). The next waypoint is `path.back()` (389); it is popped when within one tile (392-393). Facing is toward the current target (400).
- Shift stops a mouse-move walk so the hero can attack (745-751). A tap on an enemy with `mouse_move_attack` locks the enemy and follows it (585-607).
- After the finger lifts, `mm_is_distant` is no longer updated (it is only set while the tap key is held, 574-582), so the hero keeps walking to the last desired target until `isNearMMtarget` is true.

Touch input (SDLInputState.cpp):

- Finger down sets MODE_TOUCHSCREEN, hides the cursor and sets MAIN1 (423-430). Finger motion updates the shared `mouse` from the moved finger and sets MAIN1 (400-406). Finger up removes that finger; when the list is empty, MAIN1 is un-pressed (452-454). When fingers remain, `mouse` falls back to the last finger in the list (463-465).
- `InputState` un-press (322-328): a released key clears its pressing and lock flags on the next frame, so the press is seen once per press.

Slow repeat (SDLInputState.cpp 627-648), used only for text editing keys DEL, LEFT and RIGHT (WidgetInput.cpp 159-162): on the frame a key is held and not locked, the lock is set and the delay is `max(max_fps/10, prev - max_fps/2)` (635-637); the lock clears when the delay runs out (641-644). On release the delay resets to `max_fps` (631). With max_fps 60, the successive delays are 30, then 6 frames. The timer semantics are not read.

Gamepad (SDLInputState.cpp 530-572): a stick or trigger axis is digital. A key is pressed when the axis is at or above `joy_deadzone` (542, 545) or at or below its negative (548), and released when the axis is back inside it (559-562). There is one threshold for both press and release. Default `joystick_deadzone` 8000 on a range of 32767 (Settings.cpp 88; Settings.h 59-60), clamped to that range (184-185).

Tick: the logic rate constant is 60 (`Settings::LOGIC_FPS`, Settings.cpp 45). Whether the main loop is fixed-step, and how the `Timer` class counts, were not read.

## 2. Key functions

- Virtual pad logic: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuTouchControls.cpp` 71-105; geometry 39-69; membership test 107-115.
- Tap-to-move: `/mnt/frankendom-donors/flareteam-flare-engine/src/Avatar.cpp` 289-305 (`pressing_move`), 307-330 (`set_direction`, targeting), 330-402 (path and waypoint, inside `set_direction`), 573-609 (tap distance and lock, inside `Avatar::logic` from line 463), 676-770 (state machine, inside `Avatar::logic`), 1214-1220 (`isNearMMtarget`).
- Touch events: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLInputState.cpp` 400-470.
- Gamepad axis: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLInputState.cpp` 530-572.
- Slow repeat: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLInputState.cpp` 627-648.
- Un-press: `/mnt/frankendom-donors/flareteam-flare-engine/src/InputState.cpp` 322-328.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Tap-to-move with two thresholds (start while stopped, stop while walking) | Start 0.75 and stop 0.25 (EngineSettings.cpp 94 and 93; use at Avatar.cpp 577-582). Units not stated; tiles assumed. |
| Arrival radius from hero speed | 2 times speed, with no path left (Avatar.cpp 1215). |
| Every control size from one screen scale | Pad radius `view_h / 4 * s`, pad deadzone `view_h / 20 * s`, action radius `view_h / 6 * s` (MenuTouchControls.cpp 51, 54, 56, 60). Scale `s` default 1.0 (Settings.cpp 114); slider 75 to 125 percent (MenuConfig.h 75-76). |
| Square deadzone per axis, circle membership | Deadzone square of `view_h / 20 * s` (54); membership by radius (89). |
| Repath gating spread over frames | Chance +5 per frame, reset to -100 on recalculation (Avatar.cpp 334, 371); one failure starts a cooldown (Avatar.h 62). |
| Gamepad digital threshold | `joy_deadzone` 8000 default, range 8000 to 32767 (Settings.cpp 88; Settings.h 59-60). |
| Slow repeat delay that shrinks | 60 to 30 to 6 frames (SDLInputState.cpp 631, 637, with max_fps 60). |

## 4. TypeScript sketch

simplified: keeps the tap-to-move start and stop thresholds with the arrival rule (Avatar.cpp 297, 577-582, 1215), the square per-axis pad test with circle membership (MenuTouchControls.cpp 89-98), and the slow repeat with an accelerating delay (SDLInputState.cpp 628-645). It omits: the path search and waypoint pop (Avatar.cpp 330-400); the re-targeting and drag-walk (316-321, 753-755), so `stepTapToMove` takes the desired target from the caller; the Shift stop; the mouse-move attack and enemy lock (585-607); the action pads; finger bookkeeping; and the un-press delay (InputState.cpp 322-328). Slow repeat timing is an assumption (the Timer class was not read): one count per frame, and delivery on the frame the lock is set (the consumer's check in WidgetInput was not read). The donor keeps the desired target after the finger lifts; the caller here must do the same. Typechecked on the VPS (`npx -p typescript tsc --noEmit --strict --target es2020`): exit 0.

```ts
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
```

## 5. Lands in

- TARGET `src/fight/input.ts` (the one controls intake: the move-to-point mode, the analog pad and the held-key layer). Parity-checklist row 5 (controls/input). The start and stop distances are data; the arrival rule and the threshold step are engine code, so the server can check that a move order is a real tap.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (the move-to-point rule is engine code; the pad and the touch layer are clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Server verification: the donor's path, targets and random roll are client-side (`rand()` in `percentChance`, UtilsMath.h 60). Frankendom's server must not reuse this path logic; it can check that a move order is at a valid tile and within a move budget.
- Defect 1 (keep the idea): the virtual pad reads one shared pointer (MenuTouchControls.cpp 87), and the pointer is set by whichever finger moved last (SDLInputState.cpp 404-405, 428-429). On lift it falls back to the last finger in the list (464-465). So a thumb on an action button can steer the move pad. Fix: bind the move pad to the finger that first went down inside its circle, read that finger's position from `touch_fingers`, and let other fingers feed only the action pads.
- Defect 2 (keep the idea): gamepad axes use one threshold for press and release (SDLInputState.cpp 545-549, 559-562). A stick resting at the threshold can toggle press and release on successive frames. Fix (not run): a press threshold above a release threshold, so the stick must cross the upper value to press and drop below the lower value to release.
- Defect 3 (keep the idea, check first): the path recalculation and the repath chance are tied to frames, not time (Avatar.cpp 334, 371). At a different logic rate the 20-frame ramp is a different time. Fix: express the ramp in seconds of logic time.
- Units: tap thresholds are read as tiles (map units), which is an assumption. Confirm against `Utils::calcDist` before copying the numbers.
- The donor's pad is four digital directions. For dodging, that is too coarse; the adapt decision keeps the geometry and makes the output analog.
- Sizes come from `view_h` only (MenuTouchControls.cpp 51-68). A 375-wide portrait phone needs a check that the pad size comes from the short side. Not run.
- Frankendom rulings: the tap target is client input; the engage (a tap on an enemy) is a state change sent to the server, and the server must verify range and line of sight (the donor's lock on enemy, Avatar.cpp 585-607, is client-only).
- No input buffer or lag handling was found in the read code; the slow repeat is the only timing rule, and it is for text editing.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one engine (the move-to-point rule is engine code; the pad and the touch layer are clients); rules 7-9 n/a
