# OpenGothic (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp` (clip events, combo/hit/parry windows) with `pose.cpp` (layers, combo chain, blend, skeleton), `animationsolver.cpp` (state to clip names, overlays) | Licence: MIT License, "Copyright (c) 2019 Try" (LICENSE line 1 and 3) | C++ | symbol `Pose::continueCombo` (combo chain), with `Animation::Sequence::canInterrupt`, `isFinished` and `setupEvents` as the timing data

Checked: Read in full: `animation.cpp` (all 638 lines), `animation.h` (141 lines), `animationsolver.cpp` (the overlay, solve and fallback functions, 1-527 with `implSolveAnim` 113-395 read in full), `pose.cpp` (startAnim 161-212, interrupt and stop 214-270, processLayers 272-315, update and updateFrame 317-427, mkSkeleton 429-472, addLayer and onAddLayer/onRemoveLayer 511-555, the window and query functions 613-690, continueCombo 728-791, setAnimRotate 836-868), `pose.h` ComboState (108-114), `animmath.cpp` mix/slerp (1-53), `attachbinder.cpp` (whole). Not read: `pose.cpp` 1-160 (save/load, calcAniComb), 556-612 (sound and particle dispatch bodies), 870-931, `skeleton.cpp`, the callers of `continueCombo` and of the window queries (in npc code, not read), and the zenkit file parser. The `GameSession::tick` input unit (dt) was not read. Confidence: high on the windows, the combo chain and the layer rules; medium on the crossfade, which I traced through `updateFrame` and `onRemoveLayer` but did not run. camera_scope: not applicable (not a camera cell).

Best transferable idea: each attack clip carries its own combo windows and hit-end times, read as frame numbers from its events and converted to milliseconds with the clip's frame rate; a follow-up swing counts only if it arrives inside the current step's window, and a successful chain rewinds the clip's clock to that step's hit end.
Decision (proposed): adapt - take the window-gated combo chain and the hit-end rewind, but store the windows as catalogue data that the server reads, not as events in a client clip. The client only plays the clip.
Acceptance: In a duel, a second swing is accepted only when its press falls inside the step's window from the catalogue; a press outside it starts a fresh swing (or breaks the combo for the same attack). A server test asserts the same accept or reject, using the server copy of the windows and the swing's start time.

## 1. Mechanism

- Timing data comes from the clip (animation.cpp 614-638, `setupEvents`). Event frames are converted to milliseconds with the clip's frame rate (setupTime, 15-20: `frame x 1000 / fps`). `COMBO_WINDOW` frames become `defWindow` (flat start/end pairs, one pair per combo step, 635-636). `HIT_END` frames become `defHitEnd` (one time per step, 631-632). `PARRY_FRAME` gives `defParFrame` (one pair, 633-634). A clip that has a combo window is a Transition with no next clip (184-187). A clip whose next is itself is a Loop (182-183).
- Layers: each layer has one slot per layer number. `startAnim` (161-212) looks at the active clip on the same layer. (a) If it is the same clip with the same combo index and not finished, only the body state is updated and nothing restarts (175-178). (b) Otherwise the new request is refused unless the active clip can be interrupted or has finished (174, 179-180). (c) If a transition clip exists, it plays instead of the new clip. The name is built from the two clip short names: `T_<cur>_2_<new>` (189-191), then `T_STAND_2_<new>` when the current body is standing (192-195), then `T_<cur>_2_STAND` when the new body is standing (196-200). Otherwise the new clip starts directly (202-207).
- Interruptibility (`canInterrupt`, animation.cpp 260-273): a Transition clip can be interrupted only if it has a combo window and a hit end (263), and then only once the window for the current step has opened (`!((now-sTime)<=defWindow[cId])`, 264). Otherwise it cannot be interrupted (266). A non-Transition (Loop) clip cannot be interrupted while it is inside its current combo window (269-270).
- Finish: `isFinished` (239-246) is true once the clip's time passes the hit end of the current combo step (242-243), or, when there is no hit end for that step, once it passes the clip's total time (245). `atkTotalTime` (252-258) returns the hit end of the current step when there is one, otherwise the total time.
- Hand-over (`processLayers`, 272-315): a finished Transition clip is replaced by its `next` clip (280-300). `Pose::solveNext` (pose.cpp 473-509) never hands over a rotation clip (505-506); item-use layers step by name (476-503); other clips go to `AnimationSolver::solveNext` (508), which searches overlays newest first and then the base skeleton (solver 499-513). A stumble or parade layer loses its body state at the hand-over (294-295).
- Combo chain (`continueCombo`, pose.cpp 728-787). With `t` = time since the previous clip on the same layer started and `id` = 2 x the number of steps already chained:
  1. No previous clip on the layer: state reset, nothing started (740-743).
  2. Previous clip has no windows or no hit ends: a normal start, combo reset (749-753).
  3. Next clip has no hit end (a block or other non-attack): forced start, combo reset (756-761).
  4. No window pair left for this step: break the combo (763-765).
  5. `t` is outside the step's window (`defWindow[id] < t <= defWindow[id+1]` fails): if it is the same clip, break the combo; either way return nothing (768-772).
  6. Combo already broken: return nothing (774-775).
  7. Different clip: forced start of the new clip, combo reset (777-781).
  8. Same clip: if this step has a hit end, move the clip's start time back so that the clock reads that hit end (783-784: `prev->sAnim = tickCount - defHitEnd[len]`); count the step (785); the same clip continues (786).
- Head: `isFinished`, `isPrehit` (pose 674-679; an OPTIMAL_FRAME event still ahead of the clip frame), `isDefence` (627-633; parade layer inside its defence window) and `isDefParWindow` (613-618) are the queries the combat code uses (their callers were not read).
- Solver (`animationsolver.cpp`): a state (Anim enum: Idle, Move, Attack, AttackL/R, AttackBlock, AttackFinish, Stumble, Dead, ...) plus weapon state plus walk bits maps to a clip name (`implSolveAnim` 113-395). Examples: a 1H or 2H attack while running uses `T_<w>ATTACKMOVE` (127-128), a standing attack `S_<w>ATTACK` (134), a finish `T_<w>SFINISH` (151-152). A parry uses `T_<w>PARADE_O` in G1 (148), and in G2 one of three parade clips chosen with `std::rand()` (139-143).
- Fallback: `solveFrm(format, weapon)` tries the weapon name, then no weapon, then the FIST variant (456-478; 470-477).
- Overlays: a second skeleton can be added over the base. Its clips are searched first, newest first (`solveFrm` 519-523; `solveNext` 503-509). An overlay is accepted only if its node count equals the base (61-62). It expires when its deadline is past (`update`, 94-95; time 0 = no deadline). Changing overlays clears the clip cache (`invalidateCache`, 495-497).
- Blend (`updateFrame`, pose.cpp 354-427): `now` becomes the age of the clip (363). The frame is `age x fps` in thousandths (366-367), with the fraction taken from the last three digits (370). Loop clips wrap by the frame count (372-374); other clips clamp to the last frame (376-377); reverse clips count backwards (380-383). Each bone's two frame samples are mixed by the fraction: position linearly, rotation by slerp (395; animmath.cpp 6, 47). The blend window is `max(blendOut, blendIn)` (388), where each value is the file's value x 1000 ms (animation.cpp 219-220). The elapsed blend is `age - sBlend` (389). While it is less than the window, the bone is a mix of the previous pose and the new sample, weight `blend / window` (415-418). Otherwise the new sample becomes the previous pose (419-422). `sBlend` is 0 when a clip is swapped in (pose 204). When a layer is removed, every layer listed before it (lower layer number) gets `sBlend = lastUpdate - sAnim` (550-553), which restarts its blend at the last update.
- Skeleton: each bone's world matrix is its parent's matrix times its own (446-450). A head look offset is applied to the head node, yaw then pitch (452-455; `setHeadRotation` 827-830 sets it; callers in npc.cpp, e.g. 1407, not read).
- Attachments: for each item submesh, the attach name in the mesh file is resolved to a skeleton node index once, when the binder is built (attachbinder.cpp 9-12). What the renderer does with the index was not read.
- Tick: `Pose::update` rebuilds frames at most once per `tickCount` value (328). `World::tickCount` returns `game.tickCount()` (world.cpp 386-387), which is `GameSession::ticks`, advanced by `tick(dt)` after scaling (session 305-313). The clip code treats the value as milliseconds (frame = age x fps / 1000), so that is the unit assumed here; the unit of the dt passed in was not read.

## 2. Key functions

- `Pose::continueCombo`: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/pose.cpp` 728-787.
- `Pose::startAnim`: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/pose.cpp` 161-212.
- `Animation::Sequence::canInterrupt` and `isFinished`: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp` 239-273.
- `Animation::AnimData::setupEvents`: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animation.cpp` 614-638 (windows from events).
- `Pose::updateFrame`: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/pose.cpp` 354-427 (sample pick, crossfade).
- `AnimationSolver::solveFrm` and `implSolveAnim`: `/mnt/frankendom-donors/OpenGothic/common/graphics/mesh/animationsolver.cpp` 113-395, 456-478, 515-527.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Window test: start exclusive, end inclusive, measured from the clip start | `defWindow[id] < t && t <= defWindow[id+1]` (pose.cpp 768; animation.cpp 277) |
| Frame to time: frame x 1000 / fps | animation.cpp 18 (setupTime) |
| Combo step counter, broken flag | `ComboState`: 15-bit length, top bit = broken (pose.h 108-114) |
| Chain: rewind clock to the step's hit end | `prev->sAnim = tickCount - defHitEnd[len]` (pose.cpp 784) |
| Crossfade window: max(blend out, blend in) | pose.cpp 388; each value x 1000 (animation.cpp 219-220) |
| Frame clock: age x fps, 1/1000 frame steps | pose.cpp 366-370 |
| Move-translation threshold 0.4 (model units) | animation.cpp 598 |
| Head look: yaw then pitch | pose.cpp 454-455 |
| No window pair = break | pose.cpp 763-765 |

The donor sets no fixed frame counts of its own: every window and hit end comes from the clip file. So the numbers are per clip, not per engine.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for branches 2-8 of `continueCombo` (the window test, the broken flag, the forced starts and the rewind). Branch 1 (no previous clip on the layer) is not modelled. It takes windows and hit ends per combo step rather than the donor's flat pair list (index = combo length, same thing). The sketch reports every forced start as accepted; in the donor `startAnim` may still refuse it (branches 2, 3 and 7 call it). It does not model the layer list, `isPrehit`, the solver, or the blend. Times are plain ms numbers, not the clip's frame data.

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism; no line is translated.
// clean-room
interface ComboWindow {
  start: number; // ms after the swing started; window is open for start < t <= end
  end: number;
}

interface Swing {
  clip: string;             // clip name
  startedAt: number;        // ms; can be rewound when a combo step continues
  windows: ComboWindow[];   // one window per combo step (index = combo length)
  hitEnd: number[];         // ms at which each combo step ends
}

interface ComboState {
  len: number;     // steps already chained
  broken: boolean; // once broken, no further continuation until a new swing starts
}

interface Continue {
  accepted: boolean;
  combo: ComboState;
  startedAt: number;
}

// Try to chain `nextClip` onto the running swing at time `now`.
function continueCombo(prev: Swing, nextClip: string, nextHasHitEnd: boolean, combo: ComboState, now: number): Continue {
  const t = now - prev.startedAt;
  if (prev.windows.length === 0 || prev.hitEnd.length === 0) {
    return { accepted: true, combo: { len: 0, broken: false }, startedAt: now }; // no combo data: plain start
  }
  if (!nextHasHitEnd) {
    return { accepted: true, combo: { len: 0, broken: false }, startedAt: now }; // not an attack clip: forced start
  }
  const w = prev.windows[combo.len];
  if (w === undefined) {
    return { accepted: false, combo: { len: combo.len, broken: true }, startedAt: prev.startedAt }; // out of steps
  }
  if (!(w.start < t && t <= w.end)) {
    const broken = prev.clip === nextClip ? true : combo.broken;
    return { accepted: false, combo: { len: combo.len, broken }, startedAt: prev.startedAt };
  }
  if (combo.broken) {
    return { accepted: false, combo, startedAt: prev.startedAt };
  }
  if (prev.clip !== nextClip) {
    return { accepted: true, combo: { len: 0, broken: false }, startedAt: now }; // different clip: new swing
  }
  // Same clip: rewind the start so the clip continues from this step's hit end.
  const startedAt = combo.len < prev.hitEnd.length ? now - prev.hitEnd[combo.len] : prev.startedAt;
  return { accepted: true, combo: { len: combo.len + 1, broken: false }, startedAt };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/swing-windows.ts` (new): the combo-window test and the chain state for the duel step. The engine decides accept or reject; the clip is presentation.
- Parity-checklist row 1 (duel step / sim) fits the window decision, which is the engine's. The clip's own playback is row 6 (hero actor/animation), which is not the target here. Row 3 (guard/parry) would take the parry window (`PARRY_FRAME`, defParFrame), not this module.
- today: not located in this pass (the Frankendom repo is not on this Mac and was not read).
- Reuse tag: adapt-shape (MIT; code may be adapted; this note uses the shape only, written as a sketch)
- Brief rule served: one engine decides the swing (accept, reject, break); the clip only shows it. Kills stay server-verified.

## 6. Gaps and risks

- The donor reads the windows from the clip's events on the client. Frankendom must not let the client decide a swing. The windows belong in the catalogue (rows 20-21), and the server reads them. A client clip event may only be checked against the catalogue, never trusted.
- The rewind (`prev->sAnim = tickCount - defHitEnd[len]`) moves a shared clock. In a single-ledger server it would silently shift a swing's start, so the server must store the step index and its own start time, and must not rewrite a shared clock.
- The parry choice in G2 uses `std::rand()` (animationsolver.cpp 139). That is not replayable. Frankendom's fight record (row 19) needs a seeded or recorded choice.
- Transition clips are found by name (`T_<cur>_2_<new>`, pose.cpp 189). Frankendom's catalogue should declare each transition explicitly (row 20), not build it from strings.
- Timing windows only work if the server clock and the swing clock agree. The donor has no server; Frankendom's server tick (row 18, post-K item 3 sub-line: fixed step, input intake, per-tick NPC budget) must decide the window test, with the window in ms converted once from the catalogue.
- MAX_ATTACKERS = 3 does not change the window test itself, but three attackers can each try a chain on the same hero; the chain state must be per attacker, not per hero.
- Not read: the caller code that reads these windows (npc code), `pose.cpp` 1-160 and 556-612, `skeleton.cpp`, and the zenkit parser. The claims about those callers are not made in this note.
