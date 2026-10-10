# id-Software-Quake (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/sv_move.c` | Licence: GPL-2.0-or-later (sv_move.c header lines 4-7: "either version 2 ... or (at your option) any later version"; gnu.txt is GPL v2) | C | symbols `SV_NewChaseDir`, `SV_StepDirection`, `SV_MoveToGoal` (same functions in QW/server/sv_move.c)

Checked: Opened WinQuake/sv_move.c 1-25, 222-355, 390-426 (whole chase path); qw-qc/combat.qc 240-268 and QW/progs/combat.qc 218-240 (aggro block, both commented out); gnu.txt head. Confidence: high on the chase steering order and its numbers. Depth is thin: this donor has the chase steering only. The target choice, aggro and flee halves of this topic are not in the tree: `ai.qc` (the QuakeC monster brain that calls `SV_MoveToGoal`) is not in the donor, and the one retaliation rule (`FoundTarget`) sits inside a comment in both combat files. Not read: `SV_movestep` (collision test, sv_move.c 110), `SV_CloseEnough`, the frame loop in sv_phys.c, and the QuakeC think timing. Camera: not applicable (ai-aggro cell). Scope: not camera.

## 1. Mechanism

- What it is. A chase step for a ground monster toward a goal entity. It picks one of eight headings (45-degree steps) and walks a fixed distance `dist` (set by the QuakeC caller, not read). Nothing here picks the target.
- `SV_MoveToGoal` (393-426) is the entry. If the monster is not on the ground, flying or swimming, it does nothing (405-409). If an enemy is set and `SV_CloseEnough` holds for the goal, it stops and does not step (416-418). Otherwise, with a 1-in-4 roll (`rand()&3 == 1`, 421) or when the step on its current yaw fails (422), it calls `SV_NewChaseDir`. Else it keeps walking its current yaw.
- `SV_NewChaseDir` (284-356). Order of tries, each a `SV_StepDirection` call:
  1. Build the two axis headings from the delta to the goal, with a dead zone of 10 units per axis (293-306). East 0 or west 180 on x; north 90 or south 270 on y.
  2. If both axes are live, try the diagonal between them (308-318), unless it is the turnaround.
  3. Swap the two axes at random (a 1-in-2 chance) or when y is the longer delta (321-326).
  4. Try the first axis, then the second (328-334), skipping the turnaround each time.
  5. Try the current facing (olddir, quantised to 45 degrees), with no turnaround check (338-339).
  6. Sweep all eight headings: upward from 0 or downward from 315, which one is a coin flip (341-352), skipping the turnaround.
  7. Try the turnaround last (354-355).
- `SV_StepDirection` (233-260). Sets the ideal yaw and calls `PF_changeyaw` (238-239), which turns the current yaw toward the ideal by at most `yaw_speed` per call (`WinQuake/pr_cmds.c` 1412-1446, read). Then tries the step with `SV_movestep` (247). If the step succeeded but the monster is still more than 45 degrees off the new yaw (delta > 45 and < 315, 250), the position is restored (252). The function then links the entity and returns true (254-255) in both cases, so a caller cannot tell an undone step from a taken one, and `SV_NewChaseDir` stops trying other headings. Returns false only when `SV_movestep` fails.
- Tick. The chase is called once per monster think. The think timing and `dist` are set in QuakeC, which this donor does not contain (not read). So the tick rate is not known from this file.

## 2. Key functions

- `SV_NewChaseDir`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/sv_move.c` 284-356. The try order above.
- `SV_StepDirection`: sv_move.c 233-260. Turn first, then step, undo if not turned far enough.
- `SV_MoveToGoal`: sv_move.c 393-426. Entry, melee stop, 1-in-4 re-chase.
- The aggro rule, in the same donor: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/combat.qc` 248-264. A monster hit by a non-same-class attacker sets `self.enemy = attacker` and calls `FoundTarget ()` (259-260). The whole block is inside `/*SERVER ... */` comments (248 opens, closes at 264). The same block is commented out in `/mnt/frankendom-donors/id-Software-Quake/QW/progs/combat.qc` 222-238. Not active in this donor.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two axis steps from the delta, with a dead zone so tiny offsets do not flip the heading | Dead zone 10 units per axis (theirs, 295, 301) |
| Try the diagonal first when both axes are live | Diagonal headings 45 / 135 / 215 / 315 (theirs, 312, 314). 215 is the donor value for south-west; the 225 used in the sketch is the true south-west on the yaw scale. Not tested in game. |
| Never reverse on the first try | Turnaround = facing plus 180 (theirs, 291) |
| Coin flip on which axis goes first, longer axis first otherwise | Probability one half (theirs, 321 `(rand()&3)&1`) |
| Sweep all headings in a random direction when stuck | Coin flip (theirs, 341) |
| Re-chase at random even when the current heading is open | 1 in 4 (theirs, 421) |
| Turn first (a partial turn per call), and undo a step taken before the turn is done | 45-degree gate (theirs, 250); turn limited by yaw speed per call (theirs, pr_cmds.c 1437-1438); the undone step still counts as success (theirs, 255) |
| Stop at melee range | None (mechanism; the range test is not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the order (diagonal, axes with the random swap, current facing, sweep, reverse) and the 1-in-4 re-chase. It corrects the donor's south-west diagonal from 215 to 225 (the donor line 314 gives 215). It omits `SV_movestep` (collision), `SV_CloseEnough` (passed in as a flag), the flying, swimming and off-ground early exit, the turn-first undo at 45 degrees and the per-call yaw limit (the caller's `trySt` must do the turn and the undo; in the donor an undone step still returns true), the monster's `dist`, and the think timing. The sweep and the reverse are the same in the donor and the sketch.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Deg = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315; // eight headings, 0 = east, 90 = north
interface Walker { x: number; y: number; facing: Deg; }
const DEAD_ZONE = 10; // units per axis, as in the donor

type TrySt = (d: Deg) => boolean; // turn to d, then step if the turn is close enough; true if moved

function opposite(d: Deg): Deg {
  return ((d + 180) % 360) as Deg;
}

// One chase choice: diagonal first, then the axes (longer axis tried first half the time), then the current facing,
// then a sweep of the eight headings, and the reverse last.
function chaseStep(w: Walker, tx: number, ty: number, rand: () => number, trySt: TrySt): boolean {
  const back = opposite(w.facing);
  const dx = tx - w.x;
  const dy = ty - w.y;
  let ax: Deg | null = dx > DEAD_ZONE ? 0 : dx < -DEAD_ZONE ? 180 : null;
  let ay: Deg | null = dy > DEAD_ZONE ? 90 : dy < -DEAD_ZONE ? 270 : null;

  if (ax !== null && ay !== null) {
    const diag: Deg = ax === 0 ? (ay === 90 ? 45 : 315) : (ay === 90 ? 135 : 225);
    if (diag !== back && trySt(diag)) return true;
  }

  if ((rand() & 1) === 1 || Math.abs(dy) > Math.abs(dx)) {
    const t = ax;
    ax = ay;
    ay = t;
  }
  if (ax !== null && ax !== back && trySt(ax)) return true;
  if (ay !== null && ay !== back && trySt(ay)) return true;

  if (trySt(w.facing)) return true;

  if (rand() & 1) {
    for (let d = 0; d <= 315; d += 45) if (d !== back && trySt(d as Deg)) return true;
  } else {
    for (let d = 315; d >= 0; d -= 45) if (d !== back && trySt(d as Deg)) return true;
  }
  return trySt(back);
}

// Per think: stop at melee range; otherwise keep the heading 3 times in 4, re-chase on the 4th or when the heading is blocked.
function moveToGoal(w: Walker, tx: number, ty: number, closeEnough: boolean, rand: () => number, trySt: TrySt): void {
  if (closeEnough) return;
  if ((rand() & 3) === 1 || !trySt(w.facing)) chaseStep(w, tx, ty, rand, trySt);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai-chase.ts` (new module, engine fight loop): the chase steer for a creature toward its target when the direct step is blocked. Parity-checklist row 4 (fight loop: aggro, chase, leash). Only the chase is claimed; target choice and aggro stay with the AI brain (row 2).
- today: no chase module in src/fight/ (not checked against the current tree).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the engine steers the creature, the client only shows it); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Thin donor. Only the steering half of ai-aggro is here. Target choice, aggro and flee are not in this tree (`ai.qc` absent; `FoundTarget` commented out). Do not cite this donor for aggro.
- Donor quirk. The south-west diagonal is 215 in `SV_NewChaseDir` (sv_move.c 314), where 225 is the true south-west on the yaw scale. The sketch uses 225. Frankendom should not copy the number.
- Eight headings are a 1996 grid choice. A fast 3D fight in a zone needs a steering vector and a navmesh or grid query; the try order transfers, the 45-degree grid does not.
- Randomness. Both the axis swap and the sweep use `rand()`, and the 1-in-4 re-chase does too. Frankendom's server must take these from the seeded fight RNG (row 19 replay) and the same tie rule must hold on every client.
- Blocked-step recovery is the useful part: a creature that cannot reach the hero tries the side steps before it reverses. Frankendom must test that a creature blocked by a pillar slides around it, and never turns straight back on the first failed step.
- Tick and step length are set in QuakeC (not in this donor). Frankendom's chase step must be in server ticks, with the step length as zone data.
- Melee stop uses `SV_CloseEnough`, not read. Frankendom's range test lives in the duel step (row 1), not in the chase.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine: chase steering lives in the engine); rules 7-9 n/a

Best transferable idea: When a creature's direct step is blocked, try the diagonal, then the axes, then its current heading, then a sweep, and reverse last, so it slides around an obstacle instead of turning straight back.
Decision (proposed): adapt — keep the try order and the no-reversal rule, but steer on Frankendom's own arena or navmesh query and draw the rolls from the seeded fight RNG, since the donor's eight 1996 grid headings and rand() do not fit.
Acceptance: A player sees a creature blocked by a pillar slide around it within a few steps rather than standing still or turning straight back; a server test on a fixed blocked map asserts the try order and that the same seed gives the same path.
