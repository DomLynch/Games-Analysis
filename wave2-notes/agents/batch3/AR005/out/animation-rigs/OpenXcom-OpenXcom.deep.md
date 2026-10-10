# OpenXcom-OpenXcom (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp` (step counter, lines 608-736) with `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/UnitWalkBState.cpp` (drives it) | Licence: GPL-3.0-or-later (LICENSE.txt is the GPL v3 text; UnitWalkBState.cpp header: "version 3 of the License, or (at your option) any later version") | C++ | symbol `BattleUnit::keepWalking`

Checked: Read in full the step code: `startWalking` (608-645), `keepWalking` (652-727), `getWalkingPhase` (733-736), `UnitWalkBState::think` walk branch (80-120, 262-269, 407), `playMovementSound` (559-605), `Map::calculateWalkingOffset` (1373-1415), the sprite frame line (UnitSprite.cpp 902), and the timer loop (Timer.cpp 43-137, BattlescapeState.cpp 470 and 1500-1511, BattlescapeGame.cpp 918-931). Callers of `keepWalking`: `UnitWalkBState.cpp` 118 (read) and `UnitFallBState.cpp` 101 (call line only, not read). Callers of `startWalking`: UnitWalkBState 407 (read), TileEngine.cpp 2744 and UnitFallBState 176/290 (call lines only, not read). Not read: the terrain-level tail of the draw offset (Map.cpp 1420 onward), `Options::maxFrameSkip` default, the sprite art. Confidence high on the step counter and the order of steps; the step durations below are derived from the code, not measured. camera_scope: not a camera note (no camera topic here).

## 1. Mechanism

- One integer counter per unit, `_walkPhase`, is the whole clock for a step. `startWalking` resets it to 0 (BattleUnit.cpp 635) and stores the destination. Each call of the walk state's think advances it by one (`keepWalking`, called from UnitWalkBState.cpp 118).
- A step's length depends on direction. Orthogonal steps end at phase 8 and diagonal steps at phase 16 (BattleUnit.cpp 664, `end = 8 + 8 * (_direction % 2)`). The middle phase is 4 for orthogonal and 8 for diagonal (663). Vertical (flying) moves use middle 4 and end 8 (657-658).
- The logical tile is committed at the middle phase: on screen, `_pos = _destination` runs when `_walkPhase == middle` (686-690). The donor's own comment at line 689 says this is "a drawing hack, so soldiers are not overlapped by floortiles". So the engine position changes half-way through the animation, not at the end.
- Off screen, the step is not animated. `keepWalking` receives `cache = false`; then the tile is committed at once (677-679) and the step ends after two phases (line 680 sets `end = 2`; no receipt, the line is under the 15-character floor).
- The step finishes when the phase reaches `end` (693): status becomes standing, phase resets to 0 (701).
- The gait frame is the phase modulo 8 (`getWalkingPhase`, 735). The sprite frame index is `walk + 8 * facing + phase` (UnitSprite.cpp 902). A diagonal step therefore plays two gait cycles over its 16 phases.
- The drawn offset (Map.cpp 1377-1415): `phase` is the walking phase plus the diagonal base (8 or 0, from `getDiagonalWalkingPhase`). Before the middle phase the offset is `phase * 2` along the step direction (1409); after it, the offset is `(phase - endphase) * 2` (1414), i.e. relative to the new tile. So the offset starts at zero, pushes toward the destination, and returns to zero at the end.
- Sound cues use the same counter: move sound at phase 0 when the ruleset sets one (WS 567); footstep cues at phases 3 and 7 for walking (579, 587); flying sound at phase 1 (598). Footsteps play only when the unit is on screen (WS 562).
- Timing order for one on-screen orthogonal step by a player unit: the standing branch picks the step interval (WS 262 and 264: `setNormalWalkSpeed` when on screen; 268 `setStateInterval(0)` when off screen), `startWalking` sets phase 0, then one `keepWalking` per think: phase 1..8, commit at 4, end at 8, footsteps at 3 and 7.
- Clock: the battle game's `Timer` (created with `DEFAULT_ANIM_SPEED`, BattlescapeState.cpp 470, value 100 in the header line 103) fires the state's `think` at the state interval (`setStateInterval` at BattlescapeState.cpp 1511, forwarded from BattlescapeGame.cpp via `setStateInterval`). The interval for player and alien steps is `Options::battleXcomSpeed` / `battleAlienSpeed` (WS 550, 552), default 30 each (Options.cpp 108-109). Each think runs the front state (BattlescapeGame.cpp 931) once per timer callback.
- Timer loop (fixed step with accumulator): `Timer::think` adds `_interval` to `_frameSkipStart` per callback while the elapsed time is at least the interval, up to `maxFrameSkip + 1` callbacks per poll (Timer.cpp 117-125; `maxFrameSkip = 8` at line 43). After the loop, if the accumulator is still behind the clock it is reset to now (135), so a long stall is not replayed. With interval 0 (the off-screen case) the test always passes, so up to nine callbacks run per poll. That is derived from the code, not measured.

## 2. Key functions

- `BattleUnit::startWalking`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp` 608-645. Sets direction or vertical direction, walking or flying status, the floor flag, phase 0, destination, last position.
- `BattleUnit::keepWalking`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp` 652-727. The whole step counter: middle and end by direction and size (657-674), off-screen collapse (677-680), commit at middle (686-690), finish at end (693-701), motion points (on finish).
- `UnitWalkBState::think` walk branch: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/UnitWalkBState.cpp` 80-120 (keepWalking and the position-tile bookkeeping), 262-269 (interval choice), 407 (startWalking).
- `UnitWalkBState::playMovementSound`: same file, 559-605 (cues at phases 0, 1, 3, 7).
- `Map::calculateWalkingOffset`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/Map.cpp` 1373-1415 (drawn offset from the phase).
- Sprite frame: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/UnitSprite.cpp` 902.
- Timer: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Timer.cpp` 109-137 (accumulator and catch-up), 43 (`maxFrameSkip`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One step counter drives the gait frame, the footstep cue and the drawn tween | Gait cycle of 8 frames (`getWalkingPhase`, BattleUnit.cpp 735; sprite line UnitSprite.cpp 902) |
| Longer step for diagonal moves: double the phases | Orthogonal: middle 4, end 8 (BattleUnit.cpp 663-664). Diagonal: middle 8, end 16 (663-664). Vertical moves: middle 4, end 8 (657-658) |
| Logical position commit at the middle, not the end | Middle phase (686-690); the donor calls this a drawing hack |
| Off-screen steps skip the animation: commit at once, finish in two phases | `end = 2` (line 680, not receipted); commit at 679 |
| Footstep cues at fixed phases of the step | Phases 3 and 7 (WS 579, 587); move sound at 0 (567) |
| Fixed step interval with a catch-up cap | Player and alien interval 30 by option default (Options.cpp 108-109); frame skip cap 8 (Timer.cpp 43) |
| Drawn offset grows by 2 units per phase | 2 units per phase (Map.cpp 1409, 1414); the unit of the offset was not checked against a pixel grid |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's counter, the middle and end by direction, the off-screen collapse, the cue phases and the offset. It omits the large-unit middle table (`_armor->getSize() > 1`), the flying status and vertical steps, the terrain-level tail of the offset, the motion points, the door and blocking checks, the reaction-fire and proximity checks, and the falling branch. It also does not model the timer's catch-up loop: each call is one tick.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One step = a fixed run of presentation ticks. The same phase drives the gait frame, the
// drawn offset, the footstep cues, and (for on-screen steps) the commit of the logical tile.

interface Step {
  phase: number;      // ticks elapsed in this step
  mid: number;        // on-screen only: tick where the logical tile is committed
  end: number;        // tick where the step finishes
  onScreen: boolean;  // off-screen steps skip the animation
  committed: boolean; // logical tile already at destination
}

const TICK_MS = 30;   // donor default for the step interval (player and alien), tunable data

function startStep(diagonal: boolean, onScreen: boolean): Step {
  const d = diagonal ? 2 : 1;                            // diagonal = double-length step
  if (!onScreen) return { phase: 0, mid: 0, end: 2, onScreen, committed: true }; // jump, 2 ticks
  return { phase: 0, mid: 4 * d, end: 8 * d, onScreen, committed: false };
}

// One presentation tick. Returns the gait frame (0..7) and whether a footstep cue fires.
function tickStep(s: Step): { done: boolean; frame: number; footstep: boolean } {
  s.phase += 1;
  if (!s.committed && s.phase === s.mid) s.committed = true;
  const frame = s.phase % 8;
  const footstep = s.onScreen && (frame === 3 || frame === 7);
  return { done: s.phase >= s.end, frame, footstep };
}

// Drawn offset in the donor's own units (2 per phase): zero at start, switches reference tile at mid.
function drawOffset(s: Step): number {
  return s.phase < s.mid ? s.phase * 2 : (s.phase - s.end) * 2;
}
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed (file `openxcom_step_clock.ts` in `/tmp`, copy in the work folder).

## 5. Lands in

- TARGET `src/fight/actor-step.ts` (new, proposed; not checked against the repo). The presentation clock for the hero actor: gait frame, footstep event, drawn tween. The logical tile stays with the engine duel step.
- Parity-checklist row 6 (hero actor/animation). Row 7 would be the creature clips. No row fits the skeleton topics (blending, IK, ragdoll), because this donor has none.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 6 (timing loop described: timer accumulator with frame-skip cap; the step is a fixed count of ticks); 7 (copyleft, clean-room only)

Best transferable idea: one per-step phase counter should drive the hero's gait frame, its footstep event and its tween together, so the feet, the sound and the slide cannot drift apart.
Decision (proposed): adapt - one step clock for presentation is worth taking, but the donor commits the logical tile at the mid-step for drawing; Frankendom must commit it on the engine's own tick and let the client only read it.
Acceptance: a player sees a one-tile hero step as eight gait frames with footstep cues on frames 3 and 7 and no foot sliding; a server test asserts that the logical tile changes exactly once per step and that the engine never reads the presentation phase.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- This is a sprite-frame gait, not a skeleton. There is no clip blending, no inverse kinematics, no foot placement, no retargeting and no attachment points in what was read. The hero's 3D rig needs its own blend; this donor only gives the phase clock.
- The donor commits the tile at the middle of the animation "as a drawing hack" (its comment, line 689). Frankendom's one-ledger and server-verified rules mean the logical tile cannot wait for the presentation's midpoint. Do not port the commit.
- The off-screen collapse (interval 0 and two phases) depends on visibility, which only the client knows. The engine must not read it. Duel timing stays on the fixed engine step (row 1).
- The donor's timer runs several callbacks per poll when behind (up to nine at interval 0). A fast duel should use a fixed server step with a per-tick budget, not a presentation timer that catches up.
- Numbers as data: the 8/16 phase counts and the 3/7 cue phases belong to the rig and can differ per actor (data on the actor, not in the engine). The 30 ms step interval is a server tick question, not a presentation one; it should be an engine constant.
- Not read: the caller `UnitFallBState.cpp` 101 and the walk-start callers in `TileEngine.cpp` 2744, the terrain-level tail of the draw offset (Map.cpp 1420 onward), and the value of `Options::maxFrameSkip`.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 6 (timing loop described); 7 (copyleft, clean-room only)
