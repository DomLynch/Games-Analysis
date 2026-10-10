# cvet-fonline (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/cvet-fonline/Source/Client/ModelAnimation.cpp` (with `Source/Client/ModelInstance.cpp`) | Licence: MIT (`/mnt/frankendom-donors/cvet-fonline/LICENSE`: "MIT License", Copyright (c) 2006 - 2026, Anton Tsvetinskiy aka cvet; code may be adapted with the notice kept) | C++ (FOnline engine; skeletal runtime on ozz-animation) | symbol `ModelAnimationController::AdvanceTimeline`, `ModelInstance::PlayAnim`

Checked: Read in full: `Source/Client/ModelAnimation.h` (293 lines, the controller and pose types), `ModelAnimation.cpp` 186-380 (track switch, events, timeline), 728-800 (pose evaluate), 1230-1480 (track input, body and movement blend, movement selection; the blend's rotation-packing helper at 1371-1436 was read only in part). `Source/Client/ModelInstance.cpp` 431-500, 596-640 (only the child-link branch), 680-745 (body slot switch), 765-793 (movement state), 836-925 (turn and leg track), 1334-1342 (speed), 1405-1500 (per-frame track inputs, timeline advance, evaluate). Also read: `ModelManager.cpp` 89-90 and `ModelManager.h` 99 (smooth time), `ModelInformation.cpp` 192-198 and 240-245 (fast-transition bones), `Common/Settings.inc` 210, 235, 238-240 (render defaults), `Common/Geometry.cpp` 315-321 (angle difference). Not read: `ModelInstance.cpp` 500-595 (building the layer and child-model lists), 795-835 (start of `RefreshMoveAnimation`), `ModelInformation::GetAnimationIndex` (where the clip speed comes from), the ozz sampling code, rig loading, attachment points (`ModelInstance.h` 64-117 only seen in grep), and the procedural look rotations. The hint file `ThirdParty/ufbx/ufbx.h` is the FBX importer, not the runtime; not read. Confidence: high on the body crossfade order, the timeline arithmetic and the numbers (all receipted); moderate on the turn-in-place branch (the start of `RefreshMoveAnimation` not read). camera_scope: n/a (not a camera cell).

Best transferable idea: Crossfade a clip by fading the outgoing slot and the incoming slot over one smooth time on a small timed-event timeline, with one blend rule and a per-bone rule that lets a bone set snap at once.

Decision (proposed): adapt - take the two-slot crossfade with a timed event list for creature and hero clips (rows 6-7), but the clip clock is presentation only; hit windows and attack resolution must come from the server state, not from the animation timeline. Reject the client deciding when a hit lands.

Acceptance: When a creature goes from idle to an attack, its pose blends over the smooth time (150 ms by default) and never shows a frame where both slots are at full weight; a client test asserts the two slot weights sum to 1 during the blend, and a server test asserts the hit frame comes from the server message, not from the clip position.

## 1. Mechanism

- Two body slots (track 0 and track 1) alternate; `_curTrack` names the live one. A new clip never reuses the live slot: `new_track = _curTrack == 0 ? 1 : 0` (`ModelInstance.cpp` 695).
- Order inside `PlayAnim` for a real change (the early return is at 485-487 when the state, action and layers are all unchanged):
  1. Fast-transition bones are suppressed on the other slot (699-701), so those bones follow the incoming clip with no blend.
  2. The event list is cleared (703).
  3. Smooth time: `smooth_time` is the setting `Animation3dSmoothTime` / 1000 (`ModelManager.cpp` 89, minimum 0.001 s at 90), or 0 for NoSmooth, Freeze or Init (705-706).
  4. Start position: `min(duration x ntime, duration - 0.001)` (707). Remaining time: 0 for Freeze or Init, else `duration - start` (708).
  5. Outgoing slot: if smoothing, three events are queued on the event clock: enable off at `smooth_time`, speed to 0 over `smooth_time` (716), weight to 0 over `smooth_time` (717). If not, the slot is disabled at once (712).
  6. Incoming slot: enabled, clip set, position set to the start (724-726); speed event to 1 at time 0 (727); a speed-0 event at `remaining` for PlayOnce, Freeze or Init (729-731); weight event to 1 over `smooth_time` (733); `AdvanceTimeline(0)` applies the time-0 events now (734).
- Each frame (`ProcessAnimation`, 1454-1457): the body timeline advances by `elapsed x GetSpeed()`; the movement timeline by `elapsed x GetMovementSpeed()` only while moving or turning (1459-1460). Positions update inside `AdvanceTimeline`: a track's position grows by `time x speed` while enabled (358-360).
- The timeline itself (`AdvanceTimeline`, 304-362): the clock grows by `time` (306). For each event whose start has passed (312): inside `start + smooth` it sets the value by lerp from the value captured on the first active frame (316-331, capture at 319-329: speed and weight from the track's current value, enable from 0); after that it sets the target and the event is removed (334-335, 348-351). Enable events set `Enabled = value > 0`; speed and weight are set from the value (338-346).
- Evaluate (`ModelAnimation.cpp` 763-789, called from 1496): samples each body slot (779-780), mixes them (781), samples and mixes the two movement slots (783-785), then selects the movement pose over the body pose for the joints a movement slot covers (786), applies procedural rotations (787), and builds model matrices (788).
- Body mix (`BlendModelAnimationRuntimeTracks`, 1316-1370): a joint counts as present on a slot when the slot is active (enabled and weight above 0), the clip has the joint, and the joint is not masked (1261, 1296-1299, 180). Present on both: slot 1 gets its weight, slot 0 gets `1 - weight`, linear, except clips with fixed sample times which snap at 0.5 (1336-1343). Present on one only: that slot gets 1.0 (1346, 1349). On neither: the rest pose.
- Movement mix (`SelectModelAnimationRuntimeMovementPose`, 1438-1472): a joint covered by either movement slot takes the movement pose at full weight and the body pose gets 0 (1449-1451). Movement slots are limited to the leg bone set (`SetTrackAnimation(..., &_modelMngr->_legBones)`, `ModelInstance.cpp` 901).
- Fast-transition snap: `ResetBonesTransition` adds the bone names to the suppressed set of every slot except the new one (`ModelAnimation.cpp` 231-243). The old slot then stops providing those bones, so only the new slot is present for them and the mix (1346 or 1349) takes the new clip at full weight in one frame. Which bones are in the set comes from the baked model (`ModelInformation.cpp` 192-198, 243-245); not read which bones.
- Locomotion cadence: `SetMovementState` (765-793) sets the speed factor to `moving_speed / WalkAnimBaseSpeed` below `RunAnimStartSpeed`, else to `moving_speed / RunAnimBaseSpeed` (771-777). The leg slot's clip speed is `clip speed x factor` (873-904), with a 0.001 s smooth time (889).
- Turn in place: in `RefreshMoveAnimation` (partly read), if the angle between the target move direction and the look direction is above `CritterTurnAngle`, the critter plays a turn clip (`TurnLeft` or `TurnRight`, by the sign of the difference) on the movement slot, and sets the target to the look direction (848-856; the turn clip is loaded through the movement track at 885-913).
- Facing eases in `ProcessAnimation`: while the move direction differs from the target, it moves by `clamp(diff x elapsed x 10, -|diff|, |diff|)` (1445-1447): a step proportional to the remaining difference, at rate 10 per second, never past the target.

## 2. Key functions

- `ModelInstance::PlayAnim`: `ModelInstance.cpp` 431-742 (the body slot switch is 688-742). The one entry that changes clips.
- `ModelAnimationController::AdvanceTimeline`: `ModelAnimation.cpp` 304-362. Event clock, lerp, removal, track position.
- `ModelAnimationController::ResetBonesTransition` and `IsTrackBoneEnabled`: `ModelAnimation.cpp` 216-245 and 167-180.
- `ModelAnimationRuntimePose::Evaluate`: `ModelAnimation.cpp` 763-789.
- `BlendModelAnimationRuntimeTracks`: `ModelAnimation.cpp` 1316-1370 (weights 1319-1355, blend job 1357-1369).
- `SelectModelAnimationRuntimeMovementPose`: `ModelAnimation.cpp` 1438-1472.
- `ModelInstance::ProcessAnimation` (per-frame driver and facing ease): `ModelInstance.cpp` 1434-1500.
- `ModelInstance::SetMovementState` and the leg and turn logic: `ModelInstance.cpp` 765-921 (partial).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-slot crossfade: outgoing fades out and incoming fades in over the same time, so the weights stay complementary | Smooth time 150 ms by default (theirs, `Settings.inc` 210, read at `ModelManager.cpp` 89) |
| Event timeline: an event waits for its start time, lerps over its smooth time, then sets its target value | Leg smooth time 0.001 s (theirs, `ModelInstance.cpp` 889); minimum body smooth 1 ms (theirs, `ModelManager.cpp` 90) |
| Start position clamped just before the clip end | Clamp 0.001 s (theirs, `ModelInstance.cpp` 707) |
| Joint present on both slots: linear mix by the incoming weight; on one: that slot at full weight | Snap at 0.5 for fixed-sample clips (theirs, `ModelAnimation.cpp` 1337) |
| Bone suppression on the outgoing slot gives an instant bone snap | None (the rule) |
| Speed scaled by movement speed over a base speed | Walk base 60, run base 120, run start 80 (theirs, `Settings.inc` 238-240, `ModelInstance.cpp` 771-777) |
| Turn in place when the facing and look differ by more than a limit | 100 degrees (theirs, `Settings.inc` 235; angle folded into 0..180 at `Geometry.cpp` 317) |
| Facing eases toward target | Rate 10 per second, clamped to the remaining difference (theirs, `ModelInstance.cpp` 1447) |

Trap: `ModelManager.h` 99 initialises the smooth time to 0.25 s, but `ModelManager.cpp` 89 overwrites it from the 150 ms setting when the manager starts. The effective default is 150 ms, not 0.25 s.

## 4. TypeScript sketch

simplified: the sketch models one scalar per bone where the donor blends joint transforms with ozz jobs; it omits ozz sampling, loop wrap (the donor applies fmod and reversed playback), nearest-sample snapping, the movement pair and its leg mask, procedural look rotations, turn-in-place, and the child-model links. It keeps the donor order inside `switchBody` (suppress the fast bones, clear events, queue the outgoing fade, set the incoming slot, add the stop event, advance by 0). `switchBody` takes `stopAfter` where the donor computes it from the start position and the Freeze flags.

```ts
// Licence: MIT (donor, cvet/fonline). Clean-room sketch of the mechanism, not a translation of the donor lines.
type EventType = "enable" | "speed" | "weight";
type Slot = 0 | 1;

interface TimelineEvent {
  type: EventType;
  valueTo: number;       // enable: 1 = on, -1 = off
  start: number;         // seconds on the controller's event clock
  smooth: number;        // 0 = jump at start
  from?: number;         // captured on the first frame the event is active
}

interface TrackState {
  enabled: boolean;
  speed: number;         // scales the timeline step for this slot
  weight: number;        // 0..1
  position: number;      // seconds into the clip
  clip: number;          // -1 = none
  events: TimelineEvent[];
  suppressed: Set<string>;
}

function makeTrack(): TrackState {
  return { enabled: false, speed: 0, weight: 0, position: 0, clip: -1, events: [], suppressed: new Set<string>() };
}

function currentValue(t: TrackState, type: EventType): number {
  if (type === "speed") return t.speed;
  if (type === "weight") return t.weight;
  return 0;
}

function applyValue(t: TrackState, type: EventType, value: number): void {
  if (type === "enable") t.enabled = value > 0;
  else if (type === "speed") t.speed = value;
  else t.weight = value;
}

class BodyController {
  readonly tracks: [TrackState, TrackState] = [makeTrack(), makeTrack()];
  current: Slot = 0;
  private eventsTime = 0;

  resetEvents(): void {
    this.eventsTime = 0;
    for (const t of this.tracks) t.events = [];
  }

  addEvent(slot: Slot, type: EventType, valueTo: number, start: number, smooth: number): void {
    this.tracks[slot].events.push({ type, valueTo, start, smooth });
  }

  // dt is already scaled by the global speed before this call.
  advance(dt: number): void {
    this.eventsTime += dt;
    for (const t of this.tracks) {
      t.events = t.events.filter((e) => {
        if (this.eventsTime < e.start) return true;
        let value = e.valueTo;
        let keep = false;
        if (this.eventsTime < e.start + e.smooth) {
          if (e.from === undefined) e.from = currentValue(t, e.type);
          value = e.from + (e.valueTo - e.from) * ((this.eventsTime - e.start) / e.smooth);
          keep = true;
        }
        applyValue(t, e.type, value);
        return keep;
      });
      if (t.enabled) t.position += dt * t.speed;
    }
  }
}

// Fast-transition bones: the outgoing slot stops driving them, so the incoming clip takes them at once.
function resetBonesTransition(c: BodyController, skip: Slot, bones: readonly string[]): void {
  for (const i of [0, 1] as const) {
    if (i === skip) continue;
    for (const b of bones) c.tracks[i].suppressed.add(b);
  }
}

// Body clip switch: the outgoing slot fades out while the other slot fades in over `smooth` seconds.
function switchBody(c: BodyController, clip: number, startTime: number, stopAfter: number | null, smooth: number, fastBones: readonly string[]): void {
  const old = c.current;
  const next: Slot = old === 0 ? 1 : 0;

  if (fastBones.length > 0) resetBonesTransition(c, next, fastBones);
  c.resetEvents();

  if (smooth > 0) {
    c.addEvent(old, "enable", -1, smooth, 0);
    c.addEvent(old, "speed", 0, 0, smooth);
    c.addEvent(old, "weight", 0, 0, smooth);
  } else {
    c.tracks[old].enabled = false;
  }

  c.current = next;
  const n = c.tracks[next];
  n.enabled = true;
  n.clip = clip;
  n.position = startTime;
  n.suppressed.clear();
  c.addEvent(next, "speed", 1, 0, 0);
  if (stopAfter !== null) c.addEvent(next, "speed", 0, stopAfter, 0);
  c.addEvent(next, "weight", 1, 0, smooth);
  c.advance(0);
}

function present(t: TrackState, bone: string): boolean {
  return t.enabled && t.weight > 0 && t.clip >= 0 && !t.suppressed.has(bone);
}

// One scalar per bone stands in for a joint transform. Both slots present: linear mix by slot 1's weight.
// One slot present: that slot alone (full weight). Neither: rest pose.
function blendBody(
  c: BodyController,
  bones: readonly string[],
  sample: (clip: number, pos: number, bone: string) => number,
  rest: (bone: string) => number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const bone of bones) {
    const p0 = present(c.tracks[0], bone);
    const p1 = present(c.tracks[1], bone);
    const s0 = p0 ? sample(c.tracks[0].clip, c.tracks[0].position, bone) : 0;
    const s1 = p1 ? sample(c.tracks[1].clip, c.tracks[1].position, bone) : 0;
    if (p0 && p1) {
      const w1 = c.tracks[1].weight;
      out[bone] = (1 - w1) * s0 + w1 * s1;
    } else if (p0) {
      out[bone] = s0;
    } else if (p1) {
      out[bone] = s1;
    } else {
      out[bone] = rest(bone);
    }
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/fonline-body-crossfade.ts`), exit 0. Not run: the sketch was not executed.

## 5. Lands in

- TARGET `src/fight/creature-presentation.ts` (proposed new module name; the Frankendom repo was not read, so this path is not checked against it). Client-only clip presentation; it reads the server-verified fight state. Parity-checklist row 7 (creature actor/clips). The same shape would serve row 6 (hero actor/animation).
- Reuse tag: adapt-idea (MIT: code may be adapted with the notice kept; this sketch is clean-room, written from the mechanism)
- Brief rule served: one engine (the clip clock is presentation; the engine never reads it); zones as data (the base speeds and turn angle become per-creature data instead of the donor's global render settings).

## 6. Gaps and risks

- Weight invariant: the mix reads only slot 1's weight and assumes slot 0 is `1 - w1` on shared joints. The switch keeps that true only because both fades use the same smooth time and start from complementary values. Any second code path that moves one slot's weight breaks the blend. Frankendom must give clip weights one owner.
- Snap by suppression is a visible pop on any bone set that is suppressed (1346 and 1349 take the new clip at once). It is right for a hit or weapon bone, wrong for a full body. Keep the fast-bone list short and test it on a replay frame.
- Timing authority: the donor's timeline is the client clock (`elapsed x speed`). Frankendom's server runs a fixed step with an input intake and a per-tick NPC budget (row 18 / post-K item 3: "server tick: fixed step, input intake, per-tick NPC budget"). The hit frame, the guard window and the attack end must come from the server state; the client may only draw them. Otherwise two clients will show different outcomes.
- Global settings: the speed bases and turn angle are render settings shared by every model (`Settings.inc` 235-240). Frankendom needs them per creature as zone data, not one global value.
- Trap in the header: the 0.25 s initializer in `ModelManager.h` 99 is overwritten by the 150 ms setting. Copying the header value gives the wrong feel.
- A turn clip goes on the movement slot, so it is not a body-slot change. Whether a turn can overlap an attack on the body slot was not checked. Frankendom's attack must not be interrupted by a facing change unless the server says so.
- Not read: how the clip speed (`GetAnimationIndex`) and the bone set for the fast transitions are authored, the ozz sampling and loop wrap, and attachments. Do not copy the attachment design from this note.
- Licence: MIT. Adapting code is allowed with the notice; this note does not copy it.
