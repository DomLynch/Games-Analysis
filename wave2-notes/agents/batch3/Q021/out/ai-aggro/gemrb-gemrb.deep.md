# gemrb-gemrb (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/PathFinder.cpp` | Licence: as read: `PathFinder.cpp` line 3 `SPDX-License-Identifier: GPL-2.0-or-later`; repo `COPYING` is GNU GPL v2 (June 1991). Copyleft, clean-room only | C++ | symbol `PathFinder::CalculateRunAwayPoint` (with `Map::RunAway`, `GameScript` `RunAwayFromCore`, `Actor::Panic`, `pcf_morale`)

Checked: Read in full: `core/PathFinder.cpp` 137-164 (run-away point), 611-638 (`ScaleDeltas`, `NormalizeDeltas`), 580-600 (backaway orientation), `core/Map.cpp` 2683-2692 (`Map::RunAway`), `core/Scriptable/Movable.cpp` 645-649 (`RunAwayFrom`), `core/GameScript/GSUtils.cpp` 2613-2675 (`RunAwayFromCore`), `core/GameScript/Actions.cpp` 1598-1616 (wrappers), `core/Scriptable/Actor.cpp` 815-860 (`pcf_morale`), 3963-3989 (confusion override), 4034-4085 (`Actor::Panic`). Read in part: `core/PathFinder.cpp` 1-50 and 120-230 (headers and random walk). Grep only: `core/Region.h` 88-90, `core/RNG.h` 90-93. Grep only, not read: `GetNearestEnemyOf` (`core/GameScript/GSUtils.cpp` 1927) and `XthNearestEnemyOf` (`core/GameScript/Matching.cpp` 721), the enemy-selection side of targeting, which the scripts call. Not read: `GameData::GetStepTime` value, `CurrentActionTicks` (the second release path in `RunAwayFromCore`), `ScheduleFindPath`/Theta* follower, how often the script evaluates an action, and `IE_MORALE`/`IE_MORALEBREAK` data sources. Confidence high on the run-away point and the morale panic order; medium on how often the flee window counts down (the evaluation rate was not read). Camera: not applicable.

Best transferable idea: When a creature must flee, pick the destination by stepping a fixed short vector away from the threat until a path-length budget (derived from time and speed) runs out or a wall blocks, with the budget scaled by speed so a slow creature gets a shorter run.

Decision (proposed): adapt — the away-vector and speed-scaled budget fit a fleeing creature in a zone, but the donor's random sign flip on a block can turn the run back toward the threat, which a server-verified flee should not do, so Frankendom keeps the shape and adds a guard that the flee point is farther from the threat than the start.

Acceptance: A creature that drops below its morale breakpoint in a zone runs for its flee window, the server test asserts its flee point is farther from the attacker than its start, the run stops at a wall instead of passing through it, and the creature returns to the fight when morale recovers.

## 1. Mechanism

- Trigger: `pcf_morale` is the morale change handler (Actor.cpp:827; how it is registered was not read). It stops at the first test that holds. If the actor is not already panicked, morale is at or below the breakpoint (`lowMorale`, Actor.cpp:843), the breakpoint is not 0, and nothing is overriding, it rolls `RAND(1, 3)` (Actor.cpp:844-846) and calls `Actor::Panic`. If the actor is panicked and morale rose by `diff > 0`, it recovers when morale minus `diff` is still above the breakpoint and morale is not low, or when the breakpoint is 0; recovery clears the panic bit and the action queue (Actor.cpp:848-856). Otherwise morale above 20 is clamped to 20 (Actor.cpp:857-858).
- `Actor::Panic` (Actor.cpp:4034-4085): a dead actor returns (Actor.cpp:4039-4041). An actor already panicked returns when it has no current action or its current action is one of four panic action ids (Actor.cpp:4042-4045). The mode is RunAway, RandomWalk or Berserk. RunAway with a non-actor attacker becomes RandomWalk (Actor.cpp:4054-4055). RunAway queues `RunAwayFrom([-1],300)` on IWD map dimensions, otherwise `RunAwayFromNoInterrupt([-1],300)`, against the last attacker (Actor.cpp:4059-4065) and sets the panic bit. RandomWalk queues `RandomWalk()` and sets the bit (Actor.cpp:4068-4071). Berserk queues `Berserk()` and does not set the panic bit (Actor.cpp:4072-4074).
- Flee, once per window: `RunAwayFromCore` (GSUtils.cpp:2613). A flee that is already running counts `CurrentActionState` down by one per evaluation and returns (GSUtils.cpp:2633-2635). When the countdown reaches 0 it releases (if the second timer is set, not read) or starts again. Starting: the window length is set to the script's `int0Parameter` (300 for panic) (GSUtils.cpp:2645). Unless a point is passed, the threat's position is captured as `tar->Pos` (GSUtils.cpp:2647-2655). The path length is `int0 * stepTime / speed` (GSUtils.cpp:2658-2662). `Movable::RunAwayFrom` clears the path and calls `Map::RunAway` (Movable.cpp:645-648; GSUtils.cpp:2669).
- Run-away point, `CalculateRunAwayPoint` (PathFinder.cpp:137-164). Returns false when speed is 0 (139) or the delta is tiny (146). The step vector starts as `s - d` (threat direction, 141), is scaled so its length is 2 navmap pixels in tile space times `stepTime / speed` (and never longer than the raw vector) (ScaleDeltas, 611-631), and each component is rounded up in magnitude (NormalizeDeltas, 636-637). Then the loop (147-161): while the squared distance from `s` is under `(maxPathLength * 20)^2` (147), it tests `p + 3 * sign * step` (148-149). If passable it moves there. If blocked it counts a try, stops once tries exceed 16 (154), and otherwise flips the sign of x and of y at random (156-157) and keeps the current point. It returns true with the last reached point, even if that point is `s` (162-163).
- `Map::RunAway` (Map.cpp:2684-2692): if the caller has no speed it returns; otherwise it asks for the run-away point and schedules a path to it with the caller's circle size as the minimum distance and the backaway flag if requested (2686-2691). Backaway only changes the orientation of steps that are nearly collinear (PathFinder.cpp:594-598); it is presentation.
- Confusion (Actor.cpp:3963-3989) picks one of three actions at random: `Attack([ANYONE])`, `RandomWalk()` (or a run-away action on EE builds), or `NoAction()`.

## 2. Key functions

- `PathFinder::CalculateRunAwayPoint`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/PathFinder.cpp` 137-164. The run-away point: away vector, look-ahead, sign flips, path-length budget.
- `PathFinder::ScaleDeltas` and `NormalizeDeltas`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/PathFinder.cpp` 611-638. Step length in tile space, scaled by step time over speed, rounded up.
- `Map::RunAway`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Map.cpp` 2683-2692. Speed gate, run-away point, scheduled path.
- `RunAwayFromCore`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/GameScript/GSUtils.cpp` 2613-2675. The flee window and the path-length budget.
- `pcf_morale`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 827-860. Panic trigger, recovery, morale clamp.
- `Actor::Panic`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 4034-4085. Mode choice and the action queued for each mode.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Flee destination: step a short vector away from the threat, look ahead, stop at a wall, budget by path length | Step 2 navmap px in tile space (theirs, PathFinder.cpp:613, 625, 628); look-ahead 3 steps (theirs, PathFinder.cpp:148); reroll limit 16 (theirs, PathFinder.cpp:45, 154) |
| Tile metric for anisotropic maps | Tile 16 x 12 navmap px, diagonal 20 (theirs, Region.h:88-90) |
| Run length scales with speed: slow creatures run shorter for the same window | `int0 * stepTime / speed` tiles (theirs, GSUtils.cpp:2661); window 300 for panic (theirs, Actor.cpp:4062) |
| Morale panic: a low threshold picks one of three responses | `RAND(1, 3)` (theirs, Actor.cpp:846); breakpoint compared with `<=` (theirs, Actor.cpp:843) |
| Hysteresis: recover only once morale has risen past the breakpoint | Recovery test `morale - diff <= breakpoint` (theirs, Actor.cpp:852) |
| Cap on morale outside panic | 20 (theirs, Actor.cpp:857-858; GSUtils.cpp:2673 resets to 20 on leaving the area) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: away vector, speed gate, look-ahead loop with sign re-rolls and a 16-try limit, return of the last reached point; then the flee window and the morale event. It keeps the donor's random sign flip, so it can still reverse toward the threat (the donor does this too); Frankendom must add the guard in section 6. It omits the Theta* path follower, the backaway orientation, the second release timer (`CurrentActionTicks`), the EE-only confusion branch, the "only actors can be run from" fallback to RandomWalk (Actor.cpp:4054-4055), the morale clamp to 0 for negative values, and the first-run `oldValue == 0` override (it takes `overriding` as an input). The step time and the speed are inputs; the donor reads them from game data.

```ts
// Licence: copyleft (as read: SPDX-License-Identifier GPL-2.0-or-later in core/PathFinder.cpp line 3; repo COPYING is GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Pt { x: number; y: number }   // navmap units (donor uses pixels)
export interface Rng { next(): number }        // [0,1), injected so a server can replay it

const STEP_PX = 2;        // donor STEP_RADIUS: navmap pixels per step
const TILE_W = 16;        // donor SEARCHMAP_TILE_WIDTH
const TILE_H = 12;        // donor SEARCHMAP_TILE_HEIGHT
const TILE_DIAG = 20;     // donor SEARCHMAP_TILE_DIAGONAL
const LOOKAHEAD = 3;      // donor tests p + 3 * step before moving
const MAX_REROLLS = 16;   // donor RAND_DEGREES_OF_FREEDOM

const dist2 = (a: Pt, b: Pt): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Per-step vector away from the threat: scaled to STEP_PX in tile space, times stepTime / speed,
// never longer than the raw vector, then each component rounded up in magnitude.
export function awayVector(src: Pt, threat: Pt, stepTime: number, speed: number): Pt | undefined {
  if (speed <= 0) return undefined;
  const rx = src.x - threat.x;
  const ry = src.y - threat.y;
  const lenTiles = Math.hypot(rx / TILE_W, ry / TILE_H);
  if (lenTiles === 0) return undefined;
  const scale = Math.min(((STEP_PX / TILE_W) / lenTiles) * (stepTime / speed), 1);
  const dx = Math.sign(rx) * Math.ceil(Math.abs(rx * scale));
  const dy = Math.sign(ry) * Math.ceil(Math.abs(ry * scale));
  if (Math.abs(dx) <= 0.333 && Math.abs(dy) <= 0.333) return undefined;
  return { x: dx, y: dy };
}

// Walk from src along the away vector until the path length limit (in tiles) is reached.
// A blocked look-ahead re-rolls the sign of each axis (donor RandomFlip) and keeps the current point.
// Returns the last reached point; equal to src when nothing was passable (the donor also returns true then).
export function runAwayPoint(
  src: Pt, threat: Pt, maxPathTiles: number, stepTime: number, speed: number,
  blocked: (p: Pt) => boolean, rng: Rng
): Pt | undefined {
  const v = awayVector(src, threat, stepTime, speed);
  if (!v) return undefined;
  const limit = maxPathTiles * TILE_DIAG;
  let sx = 1;
  let sy = 1;
  let p: Pt = { x: src.x, y: src.y };
  let rerolls = 0;
  while (dist2(p, src) < limit * limit) {
    const ahead: Pt = { x: Math.round(p.x + LOOKAHEAD * sx * v.x), y: Math.round(p.y + LOOKAHEAD * sy * v.y) };
    if (blocked(ahead)) {
      rerolls++;
      if (rerolls > MAX_REROLLS) break;
      sx = rng.next() < 0.5 ? -1 : 1;
      sy = rng.next() < 0.5 ? -1 : 1;
      continue;
    }
    p = ahead;
  }
  return p;
}

// Flee window: the flee is planned once, then the actor waits windowTicks evaluations before planning again.
export interface FleeWindow { windowTicks: number; remaining: number }
export function fleeTick(w: FleeWindow, plan: () => void): void {
  if (w.remaining > 0) { w.remaining--; return; }
  w.remaining = w.windowTicks;
  plan();
}

// Path length for a flee of n ticks at a given speed, as in the donor (int0 * stepTime / speed).
export function fleeDistanceTiles(ticks: number, stepTime: number, speed: number): number {
  return speed > 0 ? Math.trunc((ticks * stepTime) / speed) : ticks;
}

// Morale check on each change. Breakpoint 0 disables panic. Panic picks run, random walk or berserk
// with equal weight; only run and random walk set the panic flag (donor does not set it for berserk).
export interface Morale { value: number; breakAt: number; panicked: boolean }
export type MoraleEvent = 'panic-run' | 'panic-random-walk' | 'panic-berserk' | 'recover' | 'clamp-20' | 'none';

export function moraleEvent(m: Morale, oldValue: number, rng: Rng, overriding: boolean): MoraleEvent {
  const diff = m.value - oldValue;
  const lowMorale = m.value <= m.breakAt;
  if (!m.panicked && lowMorale && m.breakAt !== 0 && !overriding) {
    const roll = 1 + Math.floor(rng.next() * 3);
    if (roll === 1) { m.panicked = true; return 'panic-run'; }
    if (roll === 2) { m.panicked = true; return 'panic-random-walk'; }
    return 'panic-berserk';
  }
  if (m.panicked && diff > 0) {
    const recovered = m.value - diff <= m.breakAt && !lowMorale;
    if (recovered || m.breakAt === 0) { m.panicked = false; return 'recover'; }
    return 'none';
  }
  if (m.value > 20) { m.value = 20; return 'clamp-20'; }
  return 'none';
}

export {};
```

## 5. Lands in

- TARGET `src/fight/flee.ts` (new module, engine AI): the flee-point search, the flee window and the morale-to-panic rule, all server-side. Parity-checklist row 2 (AI brain). The movement that follows the point is the fight loop (row 4), not this module.
- today: Frankendom's current flee or morale code was not opened in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: rulings "one engine" and "server-verified kills" (the flee point and the morale state are computed by the engine, not the client); "zones as data" for the breakpoint and window; parity row 2 (AI brain)

## 6. Gaps and risks

- Copyleft: clean-room only. The sketch is written from the mechanism.
- Reversal: a blocked look-ahead re-rolls each axis sign at random (PathFinder.cpp:156-157). Flipping both signs points the step back at the threat, and the loop only checks distance from the start, not from the threat. A flee can therefore end nearer the attacker than it began. Frankendom needs the guard in its acceptance test.
- Stuck is reported as success: the function returns true with the start point when nothing is passable (PathFinder.cpp:162-163), and `Map::RunAway` still schedules a path to it (Map.cpp:2688-2691). The caller must treat "flee point equals start" as no flee.
- Random: the flee and the panic roll use the game RNG (`RandomFlip`, RNG.h:90-93; `RAND`). Replay and server verification need a seeded RNG in the engine.
- Morale is a single number with one breakpoint, so panic is all-or-nothing and recovery depends on the size of the last morale rise (Actor.cpp:852). Frankendom's morale, if it exists, should be tested against that hysteresis, not copied.
- The comment at Actor.cpp:845 says iwd2 is "heavily biased towards running (80%, 10%, 10%)"; the code as written rolls `RAND(1, 3)` with no game check (the iwd2 branch was not read).
- Berserk does not set the panic bit (Actor.cpp:4072-4074), so a berserk actor can panic again at once. Do not port that by accident.
- The window is counted in script evaluations, not in ms (GSUtils.cpp:2633-2645). The real tick rate was not read, so the window length in seconds is unknown here. Frankendom should state the window in ticks and check it in a test.
- The run length uses `stepTime` from game data (GSUtils.cpp:2661, GameData.h:225). The value was not read.
- Targeting: the enemy picked as the threat comes from the script's nearest-enemy matchers (GSUtils.cpp:1927, Matching.cpp:721), which were not read. This note covers flee only.
