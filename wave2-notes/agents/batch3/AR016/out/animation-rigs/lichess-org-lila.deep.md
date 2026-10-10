# lichess-org-lila (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/lichess-org-lila/ui/round/src/plugins/round.yeet.ts` | Licence: AGPL-3.0-or-later (LICENSE line 1 "GNU AFFERO GENERAL PUBLIC LICENSE" Version 3; COPYING.md lines 9-12: "either version 3 of the License, or (at your option) any later version"; the file has no licence header of its own) | TypeScript | symbol `yeet`

Checked: `yeet` (round.yeet.ts 12-143), `movePieces` (65-127) and `whenAllIsDone` (145-152) read in full; entry `initModule` (5-10) and trigger `yeet`/`doYeet` (round/src/ctrl.ts 941-947) and key binding (round/src/keyboard.ts:32) read. Hint file `ui/lib/src/puz/view/chessground.ts` is NOT the animation: it is a config wrapper (lines 51-53 pass `pref.animation` as a duration). The real tween is the npm package `@lichess-org/chessground` (root package.json:10 declares it), which is not in the donor: no `ui/node_modules`, and no chessground directory under `/mnt/frankendom-donors` to depth 4. Not read: that package. Also read: `ui/puzzle/src/ctrl.ts` 271 and 453 (timing only). Confidence: high on the mechanism as read; medium on its fit (a deliberately joke 2D effect, not a rig; no skeleton, skinning, blending or IK in this donor). camera_scope: not applicable.

## 1. Mechanism

- Trigger: round/src/ctrl.ts 942 skips spectators; `doYeet` (945-947) is memoized: it stops chessground and lazy-loads the module. The key `F` is bound at round/src/keyboard.ts:32. The module waits 150 ms (9), then runs `yeet()`.
- Setup (`yeet`, 12-63): constants at 13-18. A CSS block (23-52) adds a 1 s rotate to the board clone (27, keyframe end 43: rotateX 445deg, rotateZ 15deg) and a 2 s bounce to its parent (30). Squares are hidden, shapes and coords removed, and a clone `cg-board` is appended (56-58). The moving bodies are the board's `piece:not(.ghost)` elements (60).
- Launch (129-140): for each piece, the start angle is uniform in [-0.436, 3.576] rad (134); the speed is uniform in [250, 500] (135); vx = cos(angle) x speed and vy = sin(angle) x speed (136-137); spin is uniform in about [-0.75, 0.75] rad per step (138). The gap between 3.576 rad and 2pi-0.436 rad (about 130 degrees) is never chosen; CSS y grows downward, so that gap is the upward cone. The first step is requested at 142.
- Step (`movePieces`, 65-127), one call per `requestAnimationFrame` (123). For each piece, in this order:
  1. Integrate: newX = x + vx, newY = y + vy (76-77), then write the translate (79-81). Speeds are in px per step.
  2. Test the moved bounding rectangle against the viewport: left (x <= 0), top (y <= 0), right, bottom (84-87).
  3. If any edge is hit, restore both coordinates to the previous values (89-94).
  4. Flip the speed on one axis: x if left or right, otherwise y if top or bottom (96-100). Only one flip per step.
  5. Gravity: vy += 1.5 (102). Friction: vx and vy multiplied by 0.97 (103-104).
  6. Spin: rot += rotSpeed (106), rotSpeed *= 0.97 (107); transform updated (110).
  7. Store the speeds (112-113). Settle test (115-120): the piece keeps the loop going if (|vx| > 0.5 AND |vy| > 0.5) OR it is more than 12 px above the bottom of the window (116-117).
- After all pieces: if any kept going, schedule the next step (122-123); otherwise `setTimeout(whenAllIsDone, 500)` (124-125).
- `whenAllIsDone` (145-152) only inserts a "Yeet! Reload the page" button (147-151). Nothing in the game waits on it.
- There is no cap on the number of steps and no time limit in the loop. Stopping depends only on the speeds decaying (not measured by running it).

## 2. Key functions

- `yeet`: `/mnt/frankendom-donors/lichess-org-lila/ui/round/src/plugins/round.yeet.ts` 12-143. Constants, CSS, clone, launch, and the first `requestAnimationFrame`.
- `movePieces` (inside `yeet`): the same file, 65-127. The per-step integrator and settle test described above.
- `whenAllIsDone`: the same file, 145-152.
- Trigger: `/mnt/frankendom-donors/lichess-org-lila/ui/round/src/ctrl.ts` 941-947 (`yeet`, `doYeet`). Key binding: `/mnt/frankendom-donors/lichess-org-lila/ui/round/src/keyboard.ts` 32.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Integrate position with velocity each step, then reflect off a box and restore the previous position | Box is the window (84-87); restore both axes (89-94) |
| Gravity added to vertical speed each step | 1.5 per step (13, 102) |
| Multiplicative friction on linear and spin speed | 0.97 per step (14, 103-104, 107). Half-life about 23 steps (arithmetic), about 0.38 s at 60 Hz |
| Launch cone and speed, sampled uniformly | Angle [-0.436, 3.576] rad (15-16, 134); speed [250, 500] (17-18, 135) |
| Spin, sampled uniformly | (random - 0.5) x 1.5 per step (138) |
| Settle test: fast on both axes, or still above the floor | 0.5 on both axes (116); 12 px above the bottom (117) |
| Done signal after everything settles | 500 ms (125) |
| Start delay after the module loads | 150 ms (9) |
| Visual durations (CSS, separate from the physics) | 1 s rotate (27), 2 s bounce (30) |

Units matter: every physics number is per step (per `requestAnimationFrame` call), not per second. At 60 Hz, 250-500 px per step is 15,000-30,000 px/s (arithmetic, not measured). On a 120 Hz display the same code runs twice as fast. A launch of 250-500 px per step can carry a piece past a 375 px wide phone viewport in one step, depending on the horizontal part of the speed (arithmetic from the constants, not run), so the flip rule can decide the first frames.

## 4. TypeScript sketch

simplified: keeps the donor's order inside one step (integrate, bounce with restore and one-axis flip, gravity, friction, spin, settle test) and its numbers. It differs in these ways: (a) it runs on a fixed 1/60 s step with an accumulator, where the donor runs one step per `requestAnimationFrame`; (b) it tests a point, not a rectangle; (c) it runs the settle test after all props have moved, where the donor tests each piece inside its loop; (d) it returns a done flag where the donor starts a 500 ms timer; (e) it adds `maxSteps`, which the donor does not have; (f) it omits the DOM, the CSS board rotate and bounce, the sound, the reload button and the spin's CSS transform.

```ts
// Licence: AGPL-3.0-or-later (lila LICENSE and COPYING.md, read). Clean-room sketch written from the described mechanism; not a translation of round.yeet.ts.
// clean-room
export {};

const STEP = 1 / 60; // fixed step in seconds; the donor runs one step per requestAnimationFrame call

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Prop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
}

interface ScatterTuning {
  gravity: number; // donor 1.5 (added to vy every step)
  friction: number; // donor 0.97 (multiplies vx, vy and vrot every step)
  minAngle: number; // donor -0.436 rad
  maxAngle: number; // donor 3.576 rad
  minSpeed: number; // donor 250 (per step)
  maxSpeed: number; // donor 500 (per step)
  settleSpeed: number; // donor 0.5 (per step, both axes must be below it)
  floorGap: number; // donor 12 (px above the bottom edge)
  maxSteps: number; // not in the donor: hard cap added here
}

function launch(p: Prop, t: ScatterTuning, rand: () => number): void {
  const angle = rand() * (t.maxAngle - t.minAngle) + t.minAngle;
  const speed = rand() * (t.maxSpeed - t.minSpeed) + t.minSpeed;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.vrot = (rand() - 0.5) * 1.5; // donor: spin per step in -0.75..0.75 rad
}

// One step in the donor's order: move, bounce, gravity, friction, spin.
function step(p: Prop, t: ScatterTuning, box: Box): void {
  const oldX = p.x;
  const oldY = p.y;
  p.x += p.vx;
  p.y += p.vy;
  const hitX = p.x < box.minX || p.x > box.maxX;
  const hitY = p.y < box.minY || p.y > box.maxY;
  if (hitX || hitY) {
    p.x = oldX; // the donor resets both axes to the previous position
    p.y = oldY;
    if (hitX) p.vx = -p.vx;
    else p.vy = -p.vy; // else-if: at most one axis flips per step
  }
  p.vy += t.gravity;
  p.vx *= t.friction;
  p.vy *= t.friction;
  p.rot += p.vrot;
  p.vrot *= t.friction;
}

// A prop is still moving if it is fast on both axes, or more than floorGap above the bottom edge.
function moving(p: Prop, t: ScatterTuning, box: Box): boolean {
  const fast = Math.abs(p.vx) > t.settleSpeed && Math.abs(p.vy) > t.settleSpeed;
  return fast || box.maxY - p.y > t.floorGap;
}

export class Scatter {
  private acc = 0;
  private steps = 0;

  constructor(
    private readonly props: Prop[],
    private readonly t: ScatterTuning,
    private readonly box: Box,
    rand: () => number,
  ) {
    for (const p of props) launch(p, t, rand);
  }

  // Call once per frame with the frame time in seconds. Returns true when every prop has settled or the cap is hit.
  update(dt: number): boolean {
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.steps++;
      for (const p of this.props) step(p, this.t, this.box);
      const stillMoving = this.props.some(p => moving(p, this.t, this.box));
      if (!stillMoving || this.steps >= this.t.maxSteps) return true;
    }
    return false;
  }
}
```

## 5. Lands in

- TARGET `src/fight/death-props.ts` (new, client-only presentation; the engine never reads it). Frankendom's Pit is a client, so the scatter runs there after a server-verified kill; kills, loot and XP are already recorded by then.
- Parity-checklist row: 8 (blood/wounds/decals), the closest row. No row covers prop physics. Say plainly: this is a presentation add-on under row 8, not a rig, and it is not a fight-engine row.
- today: none known to this reader; the Frankendom repo was not read.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room, shape only)
- Brief rule served: 1 (one engine, the Pit is a client: the scatter is client-only and the engine never waits on it); licence rule 6 (AGPL: clean-room, shape only)

Best transferable idea: A client-only death or impact effect can settle on a fixed step with a per-prop "still moving" test and emit one done signal that nothing in the engine waits on.
Decision (proposed): adapt - take the shape (fixed-step integrate, edge bounce with restore and one-axis flip, settle test, one done signal) for dropped armour and weapons on the Pit sand after a server-verified kill. Change it to 3D, a fixed step and a hard cap, because the donor is frame-rate dependent and 2D. Why: it gives a death a physical beat without touching kills, loot or XP, and it is a Pit-only presentation add-on.
Acceptance: A player sees the dropped shield tumble, bounce and stop on the sand within a fixed time at 60 Hz and 120 Hz alike; a server test asserts the kill and the loot ledger entry exist before the client starts the scatter, and no code path waits on the settle signal.

## 6. Gaps and risks

- Frame-rate dependent: one step per `requestAnimationFrame`, no delta time (lines 123, 142). The donor's motion speed depends on the display rate. The sketch fixes it at 60 Hz with an accumulator; Frankendom must choose the step, not inherit it.
- No cap: the loop ends only when speeds decay (lines 116-123). The sketch adds `maxSteps`; the cap value is a designer choice (data field), and it is not measured here.
- Units are per step, not per second. Any port must convert every constant (gravity 1.5 per step squared is 5,400 px/s^2 at 60 Hz, arithmetic only).
- 2D. The donor moves DOM pieces on screen, and the spin is a CSS transform. A 3D Pit needs a rigid-body or a scripted tween; the friction and gravity numbers do not carry over as they are.
- Joke code: the file header says it "does not follow our quality standards" and "It's just a joke after all" (lines 3-4). Use it only as a shape.
- Server rule: `whenAllIsDone` (145-152) only adds a button, but a Frankendom port must not gate kills, loot or the next bout on the settle signal. Keep the done signal presentation-only.
- Not read: the gist linked in the file header (lines 1-2), the `site.sound` loader, and the npm package `@lichess-org/chessground` (not in the donor). The `chessground` config wrapper (lib/src/puz/view/chessground.ts 51-53) passes a duration only; it is not an animation rig.
- No skeleton, skinning, clip blending, state machine, retargeting or IK exists in this donor (searched: `grep -rln -i -E "tween|easing|lerp|keyframe|skeleton|ragdoll|blend"` over `ui/`; the hits were false positives such as "blend" in chess bots and "lerp" in unrelated words).
