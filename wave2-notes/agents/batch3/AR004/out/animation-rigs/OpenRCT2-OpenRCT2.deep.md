# OpenRCT2-OpenRCT2 (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Peep.cpp` | Licence: GPL-3.0 (file header: "licensed under the GNU General Public License version 3"; "or later" not stated; licence.txt is GPL v3) | C++ | symbol `Peep::updateAction`

Checked: Symbol `Peep::updateAction` (Peep.cpp 453-495) and the chain it uses: `updateActionAnimation` (497-513), `updateWalkingAction` (515-556), `updateWalkingAnimation` (558-570), `getAnimationType` (363-379), `updateCurrentAnimationType` (384-397), `isActionInterruptable` (1472-1475), `switchNextAnimationType` (1511-1528), `updateWaitingAtCrossing` (243-281), and the animation-group maps (80-117). Read also: Paint.Peep.cpp 19-40 (how the frame is drawn), PeepAnimationsObject.cpp 107-150 (where frame lists come from), Scenario.cpp 522-525 (ScenarioRand). The hint file PeepAnimations.cpp (378 lines) was read in full: it is a registry (name tables per staff type, object lookup, costume sort, sprite bounds scan); its only random call is a costume pick on std::random_device (line 210), not a clip mechanism. Not read: where each action starts and resets `animationFrameNum` (outside the functions above), the per-tick caller that runs `performNextAction` (2252) and how often it runs per game tick, the frame data values (they come from object JSON, not the repo), the effects of `guest->throwUp()`. Confidence: high on the action-to-clip chain and the frame arithmetic; medium on timing, because the update cadence was not read. Depth: full for the clip mechanism. Structure check: no skeleton, bone, skin, IK or ragdoll terms in src/openrct2/peep (grep, not read per hit).

Best transferable idea: an action owns its clip and its length; the action ends when the clip runs out, with a frame-keyed event at a chosen frame, so the strike's contact frame and the attack's end come from the same data.
Decision (proposed): adapt - the duration-from-clip and contact-frame event fit a hero/creature strike where the damage is resolved on the contact frame, but the server must own the frame counter (the donor keeps it in saved peep state) and the sprite-frame model is not a rig.
Acceptance: A server test asserts that a hero strike's damage entry is written on the tick equal to the strike start tick plus the contact-frame index, and that the strike ends at the clip length with no separate timer; on the client, a creature in a strike returns to its stance clip exactly when its clip's last frame plays.

## 1. Mechanism

- Action picks the clip. `Peep::updateAction` (453) is the per-step entry. The clip group comes from the action: `getAnimationType` (363-379) returns `PeepSpecialSpriteToAnimationGroupMap` for interruptable states (idle or walking, 365-367), otherwise `PeepActionToAnimationGroupMap[action]` (370-372). The new group is stored by `updateCurrentAnimationType` (384-392), which also refreshes the sprite bounds.
- An action is a clip with a frame count and no timer. Each call to `updateActionAnimation` (497-513) does `animationFrameNum++` (503). If the index has reached the sequence length (506-509) it returns false. Then `updateAction` (477-482) zeroes the image offset, sets `action = walking` (480) and refreshes the clip group. Otherwise the image offset becomes `frameOffsets[animationFrameNum]` (511). So the action lasts exactly as long as its clip.
- Frame-keyed event. After a frame advances, `updateAction` checks for a throw-up at frame 15 and calls `guest->throwUp()` (486-491). The event lives in the same step as the clip, so it fires on that frame and not on a timer.
- Walk cycle advances per step, not per time. When the action is walking, `updateWalkingAction` (515) returns early at the destination tolerance (522-525). Otherwise it turns the peep toward the next tile (530-548) and calls `updateWalkingAnimation` (553). That increments `walkingAnimationFrameNum` (563), wraps it at the sequence length (565-567) and draws that frame (569). The walk frame advances once per step taken.
- Interruptable gate. `isActionInterruptable` (1472-1475) is true only for idle and walking. `updateWaitingAtCrossing` (243-281) does not start its crossing wait while a non-interruptable action runs: it runs that action one step (245-247) and returns unless the peep is walking again (248-251), which means the action has ended.
- Deferred clip switch. `switchNextAnimationType` (1511-1528) applies `nextAnimationType` if it differs. The crossing wait sets it to `watchRide` (254) and applies it at once (255). Paint.Peep.cpp reads `nextAnimationType` only while the action is idle (24-28) and draws the base image plus `direction + imageOffset * 4` (26, 37).
- Chance triggers on the game RNG. In the crossing wait, `eatFood` is chosen when `ScenarioRand() & 0xFFFF` is at most 1310 (about 2 percent) and `wave2` when it is at most 64 (about 0.1 percent) (264-276). `ScenarioRand` returns `getGameState().scenarioRand()` (Scenario.cpp 522-525), so this roll is part of saved game state.
- Sim state. The frame counters are serialised with the peep (`animationFrameNum` 2645, `walkingAnimationFrameNum` 2653), so they are game state, not a render-side clock.
- Data-driven frames. The frame list is read from object JSON `sequence` (PeepAnimationsObject.cpp 141). A missing animation is copied from the primary group (116-127). So a costume only needs to define what differs.

## 2. Key functions

- `Peep::updateAction(int16_t&)` (Peep.cpp 453-495): entry; walk branch (472-475), action step and end-of-clip handling (477-483), throw-up event at frame 15 (486-491).
- `Peep::updateActionAnimation()` (497-513): one frame per call; reports the end of the clip.
- `Peep::updateWalkingAction` (515-556) and `Peep::updateWalkingAnimation` (558-570): walk step and walk frame.
- `Peep::getAnimationType` (363-379) and `Peep::updateCurrentAnimationType` (384-397): action to clip group.
- `Peep::isActionInterruptable` (1472-1475): the interruptable gate.
- `Peep::switchNextAnimationType` (1511-1528): deferred clip switch.
- `Peep::updateWaitingAtCrossing` (243-281): the one caller that rolls chances and sets `nextAnimationType`.
- `PaintPeepGetBaseImageAndOffset` (Paint.Peep.cpp 19-40): reads the clip and frame to draw.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Action owns its clip; ends when the frame index passes the clip length (no timer) | Clip length comes from data (theirs, PeepAnimationsObject.cpp 141) |
| Frame-keyed event fires when a frame is reached | Throw-up at frame 15 (theirs, Peep.cpp 488) |
| Walk cycle advances once per movement step | Destination tolerance gate (theirs, 522-525); step offset 2 per direction (theirs, 432-437) |
| Only idle or walking can be interrupted | Gate = idle OR walking (theirs, 1474) |
| Chance roll on the game RNG against a threshold out of 65536 | eatFood 1310 (theirs, 264); wave2 64 (theirs, 271) |
| Deferred clip switch applied on the next safe point | Applied when the crossing wait runs (theirs, 254-255, 1514-1517) |

## 4. TypeScript sketch

simplified: keeps the donor's action step (one frame per update; end of clip returns to walk; contact-frame event inside the step), the walk cycle advanced by movement steps, the interruptable gate (idle or walk), the deferred clip switch and the chance roll on the game RNG. It omits the peep's location, tile pathing, orientation and direction images, the sprite bounds, the crossing wait itself, the Guest and Staff specifics (eat, sick, drown, pick up), serialisation, the costume index and the per-tick caller. It does not reorder the donor's steps. Two departures are made on purpose: the walk frame count is a plain constant (donor reads it from the object's sequence), and the deferred switch also waits for an interruptable state (the donor applies it in the crossing wait without that check). The chance roll uses a float RNG in place of the donor's low 16 bits of an integer.

```ts
// Licence: GPL-3.0 (donor, "version 3" as stated in the file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type ActionId = string;

interface ActionDef {
  clip: string;            // clip name shown while the action runs
  frames: number;          // clip length; the action ends when the frame index passes it
  contactFrame?: number;   // frame index that fires an event (donor: throw-up at frame 15)
  onFrame?: () => void;    // event hook for contactFrame
}

interface PeepState {
  action: ActionId;        // "idle", "walk" or an action name
  frame: number;           // frame index inside the current action clip
  walkFrame: number;       // walk-cycle index, advanced per movement step
  clip: string;            // clip whose frame is drawn
  nextClip: string | null; // deferred clip switch, applied when idle
}

const WALK = { clip: "walk", frames: 8 }; // walk cycle length (illustrative)

// One clip frame per update call. When the frame index passes the clip length the action ends and the peep returns to walk.
export function stepAction(p: PeepState, defs: Record<ActionId, ActionDef>): void {
  const def = defs[p.action];
  if (!def) return;
  p.frame++;
  if (p.frame >= def.frames) {
    p.action = "walk";
    p.frame = 0;
    p.clip = WALK.clip;
    return;
  }
  if (def.contactFrame !== undefined && p.frame === def.contactFrame) def.onFrame?.();
  p.clip = def.clip;
}

// Walk cycle advances only on a real movement step (donor: not at the destination tolerance).
export function stepWalk(p: PeepState, moved: boolean): void {
  if (!moved) return;
  p.walkFrame = (p.walkFrame + 1) % WALK.frames;
}

// Only idle or walking can be interrupted; any other action must run out first.
export function canInterrupt(p: PeepState): boolean {
  return p.action === "idle" || p.action === "walk";
}

export function requestAction(p: PeepState, action: ActionId, defs: Record<ActionId, ActionDef>): boolean {
  if (!canInterrupt(p) || !defs[action]) return false;
  p.action = action;
  p.frame = 0;
  p.clip = defs[action].clip;
  return true;
}

// Deferred clip switch: the next clip is applied only when the peep is not mid-action.
export function applyDeferredClip(p: PeepState): void {
  if (p.nextClip !== null && p.nextClip !== p.clip && canInterrupt(p)) p.clip = p.nextClip;
}

// Chance roll on the game RNG: a value of 0..65535 at or below the threshold (donor: low 16 bits of ScenarioRand).
export function rollChance(rng: () => number, threshold: number): boolean {
  return Math.floor(rng() * 65536) <= threshold;
}
```

## 5. Lands in

- TARGET `origins/client/actor-clips.ts` for the clip presentation (proposed path; not located in the Frankendom repo in this pass). The strike timing and the contact-frame damage belong on the server side in `src/fight/` (duel step, row 1) and are not in this sketch.
- Parity-checklist row 7 (creature actor/clips); the hero strike clip maps to row 6 (hero actor/animation). The contact-frame hit cue belongs to row 10 (hit impact/hitstop). Row 7 is cited for the clip mechanism.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, two clients: the server counts frames and resolves hits, the client draws the clip); rules 7-9 n/a

## 6. Gaps and risks

- Frame clock. The donor advances the action one frame per update call, so the update cadence sets the speed. Frankendom must define the strike clock on the sim tick, with the contact frame as a tick offset. Do not let a render clock decide when damage lands.
- The contact event is the only hit-timing rule here. Nothing in the donor's action code resolves damage; the frame-15 throw-up event calls `guest->throwUp()` (Peep.cpp 488-490), whose effect was not read. Frankendom's server must write the ledger entry itself, on the sim tick of the contact frame.
- Chance rolls are on the game RNG. That is correct for a deterministic replay, but the donor's `ScenarioRand` is one shared stream. Frankendom's fight-record replay (row 19) needs its own seeded stream per fight so one roll does not shift the next.
- Random costume (PeepAnimations.cpp 196-212) uses `std::random_device`, which is not the game RNG and cannot be replayed. Frankendom must not use this pattern for any value a fight record depends on. Costume choice is not in the fight in any case.
- Interruptable gate is a single boolean (idle or walking). Frankendom's hit-reaction and guard states need more classes (for example, a hitstun that can be cancelled by a guard). The donor cannot answer that.
- No blending, no skeleton, no attachment points. A 3D hero rig needs a different source for cross-fades and bone-level layers. The NONE rows (blending, skinning, IK) are not covered by this donor.
- Clip lookup falls back to the primary group on load (PeepAnimationsObject.cpp 116-127). Frankendom's catalogue should keep the same rule so a creature can share a base clip set.
- Not read: where each action starts and resets `animationFrameNum`; how often `performNextAction` runs per game tick; the effects of `throwUp`. The strike-timing numbers above are the donor's frame arithmetic, not measured timings.
