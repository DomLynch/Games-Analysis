# lincity-ng-lincity-ng (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` (with `fire.hpp`, `src/lincity/lin-city.hpp`, `src/lincity/simulate.cpp`, `src/lincity-ng/Game.cpp`) | Licence: GPL-2.0-or-later (fire.cpp header lines 12-13: "either version 2 of the License, or (at your option) any later version"; COPYING.txt lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 2, June 1991") | C++ | symbol `Fire::animate` (fire.cpp 138-152)

Checked: `Fire::animate` (138-152) read in full; `ANIM_THRESHOLD` and `ANIMATE_DELAY` (lin-city.hpp 80-85, with comment 82-83) read; `FIRE_ANIMATION_SPEED`, `FIRE_LENGTH`, `AFTER_FIRE_LENGTH` (fire.hpp 47-50) read; `Fire::update` (75-103) read in full for the state switch; its callers were not read (only the animate path was traced). `World::do_animate` (simulate.cpp 73-83) is the only caller of `cst->animate` in the grep (`grep -rn "animate("`), and `Game.cpp` 615-694 is the loop that calls it. The hint file `fire.cpp` is the right file, but the hint's point is fire spread, which is simulation; the animation is `animate` (138-152). Confidence: high on the code as read (order and numbers); medium on fit (2D sprite clips, not skeletal). I did not run the game: the 100 ms cadence and the frame periods below are arithmetic from the code. camera_scope: not applicable.

## 1. Mechanism

- Two clocks. The simulation advances one game day per step (`++total_time`, simulate.cpp 56) on a step delay of `simDelay` ms (Game.cpp 679). The visuals use the SDL tick: `Uint32 tick = SDL_GetTicks();` (Game.cpp 615). `World::do_animate` runs when `tick >= next_animate` (682-684), then sets `next_animate = tick + ANIMATE_DELAY` (693), so animate runs about every 100 ms (lin-city.hpp 80), not every rendered frame.
- Fire state (sim side, `update`, 75-103): burning counts `burning_days` up each day (94); when it passes `FIRE_LENGTH` the fire starts smoking (81). The smoking clock starts from a random value (85) and adds a day per step (86), with 4 extra days under fire cover (87-88). When `smoking_days` passes `AFTER_FIRE_LENGTH` the fire is detached (89-90).
- Visual side, `Fire::animate(real_time)` (138-152), one call per 100 ms:
  1. If `smoking_days` is set (141), the aftermath branch uses its own resource group, "FireWasteLand" (142). The pose index is `smoking_days * 4 / AFTER_FIRE_LENGTH` (144), clamped to 4 (145). This branch has no loop and no timer; the pose follows progress.
  2. Else, if `real_time >= anim` (147), the loop advances: `anim = real_time + ANIM_THRESHOLD(FIRE_ANIMATION_SPEED)` (148), then `++frame`, wrapping to 0 at the end of the resource group's pose list (149-150). Only one step per call, so a late call does not skip poses.
- The period is random each cycle: `FIRE_ANIMATION_SPEED` is `(200 + rand()%350 -175)` (fire.hpp 47), which is 25 to 374 ms. The macro is expanded at each use, so each step draws a new period.
- `ANIM_THRESHOLD(millis)` (lin-city.hpp 84-85) computes `((millis + 50) / 100) * 100 - 50` with integer division. Its comment (82-83) says it is used "to find a threshold time that is not close to an animate target time", so animation "keeps a consistent speed with varying fps".
- The randomised burning start (77-79): the first update sets `burning_days` to a random value below `FIRE_LENGTH / 5`, so neighbouring fires do not change together.

## 2. Key functions

- `Fire::animate`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` 138-152. Aftermath branch 141-145; loop branch 147-150.
- `ANIM_THRESHOLD` and `ANIMATE_DELAY`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/lin-city.hpp` 80-85.
- `FIRE_ANIMATION_SPEED`, `FIRE_LENGTH`, `AFTER_FIRE_LENGTH`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.hpp` 47-50.
- `Fire::update` (state switch): `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` 75-103.
- Loop driver: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/Game.cpp` 615, 682-694; `World::do_animate`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/simulate.cpp` 73-77.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Aftermath pose by progress, clamped to the top pose | `* 4 / AFTER_FIRE_LENGTH`, clamp 4 (fire.cpp 144-145); `AFTER_FIRE_LENGTH` = 12 000 days (fire.hpp 50, with NUMOF_DAYS_IN_YEAR = 1 200 from lintypes.hpp 59-60 and 100 days per month) |
| Loop advances on a real-time deadline, one pose per call | Deadline = now + period (148); call cadence 100 ms (lin-city.hpp 80; Game.cpp 693) |
| Random period per cycle | `200 + rand()%350 - 175`, so 25 to 374 ms (fire.hpp 47) |
| Snap to a grid offset by half a cadence | `((m + 50) / 100) * 100 - 50` (lin-city.hpp 84-85) |
| Resulting pose periods, arithmetic (not measured) | Raw 25-49 gives -50 and 50-149 gives 50: each advances on the next call (1 call, 125 of 350 draws). 150-249 gives 150: 2 calls (100 of 350). 250-349 gives 250: 3 calls (100 of 350). 350-374 gives 350: 4 calls (25 of 350). The odd multiples of 50 ms fall halfway between cadence calls. |
| Sim day length | `simDelay` ms per step (Game.cpp 679); the values are speed settings, SIM_DELAY_PAUSE -1, FAST 0, MED 20, SLOW 60 (lin-city.hpp 75-78, read; not receipted) |

Note the burning cycle is not a fixed clip length: a loop of N poses takes about N x (1 to 4) calls per pose, so the cycle length is random, which is the point.

## 4. TypeScript sketch

simplified: keeps the two branches (aftermath by progress, burning loop on a real-time deadline with a snapped random period) and the donor's numbers. It differs in these ways: (a) the caller chooses the branch; the donor reads `smoking_days`; (b) the caller passes elapsed ticks and the random source, where the donor reads its own `smoking_days` and calls `rand()` inside the macro; (c) the cadence is a parameter, where the donor hard-codes 100 ms; (d) it returns a pose index, not a resource-group frame, and omits the `FireWasteLand` group switch, save and load, fire-cover days and the sim `update`; (e) it uses `Math.floor` where the donor uses C integer division, which gives the same result for the positive values used here.

```ts
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
```

## 5. Lands in

- TARGET `src/fight/creature-clips.ts` (new, client-only pose selection). The engine sends the creature's state and the time since death; the client picks the pose. The engine never reads a pose.
- Parity-checklist row: 7 (creature actor/clips). The row fits: it is clip choice and timing for a creature. The donor is 2D sprite frames, so only the rules transfer, not the cadence.
- today: none known to this reader; the Frankendom repo was not read.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: 1 (one engine, the client draws the pose from engine state); licence rule 6 (GPL: clean-room, shape only)

Best transferable idea: Pick an aftermath pose from progress and clamp it to the top pose, and run looping clips on a real-time deadline with a jittered period that is separate from the simulation day clock.
Decision (proposed): adapt - keep the aftermath-by-progress rule and the deadline loop with a per-cycle random period, and drop the 100 ms sprite cadence and the grid snap, because a 3D clip runs on the render clock. Why: a dead creature's pose that follows elapsed time, and an idle loop whose timing varies per cycle, are simple checkable rules for row 7; the sprite-era tick is not.
Acceptance: A creature killed in the Pit shows its death pose by time since death (index rises with time and stops at the top pose), and its idle loop advances on the render clock; a test asserts the pose index never decreases with time since death and never passes the top pose.

## 6. Gaps and risks

- Frame-rate and cadence: the donor's loop advances on a 100 ms cadence (Game.cpp 682-693), not on the render frame. The 3D port should use the render clock with its own deadline; the cadence and the snap are donor details, not rules to copy.
- The snap is a sprite trick: it spreads periods over 50 ms steps, and the -50 ms draw advances on the very next call. The donor comment's claim (steady speed across fps) is not measured here.
- The aftermath pose is only as long as the donor's aftermath. `AFTER_FIRE_LENGTH` (12 000 days, fire.hpp 50) is a sim-day count: Frankendom must express a corpse lifetime as ticks or seconds in zone data, not days.
- The donor's top aftermath index is 4 (five poses), and the group size of "FireWasteLand" was not read. The donor's own comment (145) says the clamp "shouldn't happen", so a port must check its pose count against the top index.
- The loop has no pause or reverse; the 1-to-4 call period means a cycle length varies by up to 4x. A Frankendom idle loop should set its own variance as data, not inherit a random period.
- Units: the period is in ms, the aftermath is in sim days. Keep them as separate fields in the creature data.
- Not read: `Fire::spread` callers and the sim scheduling of `update` (only its own body was read, 75-103); the resource-group loader for "FireWasteLand"; `Construction` base `animate`.
- Licence: GPL-2.0-or-later, clean-room only.
