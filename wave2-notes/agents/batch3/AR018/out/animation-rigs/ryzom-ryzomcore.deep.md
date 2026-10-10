# ryzom-ryzomcore (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/animation_playlist.cpp` | Licence: GNU AGPL v3 (`/mnt/frankendom-donors/ryzom-ryzomcore/LICENSE`, and the per-file header "either version 3 of the License, or (at your option) any later version") | C++ | symbol `CAnimationPlaylist::setupMixer`

Checked: `CAnimationPlaylist::setupMixer` (animation_playlist.cpp:170-236), `getLocalTime` (310-345) and `getWeightValue` (240-268) were read in full. The blend side was read in channel_mixer.cpp 88-165, 200-265, 340-400 and 455-600, plus animated_value.h 75-90 and channel_mixer.h 60-66. The driver was read in play_list_manager.cpp 40-110 and scene.cpp 863-890. Candidates opened: animation_playlist.h, animation_playlist.cpp, channel_mixer.h, channel_mixer.cpp, animated_value.h, play_list_manager.cpp, scene.cpp. Grep hit only, not opened: play_list_user.cpp (its setupMixer call at line 240). Not read: CAnimationSet::getAnimation, CSkeletonWeight, the detail/LOD path in CChannelMixer::eval (165-200), the quaternion blend body, and what the application passes as the time. Confidence: high on the ramp maths, the slot order and the blend order. Camera: not a camera note.

## 1. Mechanism

- A playlist has eight slots (`NumAnimationSlot=8`, channel_mixer.h:64). Each slot holds an animation id, an optional skeleton mask id with an invert flag, a time origin, a speed factor (default 1), a start weight and its time, an end weight and its time, a smoothness value, and a wrap mode (default Clamp). Defaults are set at animation_playlist.cpp:34-62 (constructor and `emptyPlayList`).
- Per frame, `CPlayListManager::animate` calls `setupMixer` on each playlist with the caller's time, then `eval(false)` on that playlist's mixer (play_list_manager.cpp:67-68).
- Order inside `setupMixer`, for slots 0 to 7 in turn (animation_playlist.cpp:170-236):
  (a) If an animation set exists and the slot has an animation, compute the local time with `getLocalTime` (189). For a Disable slot whose unwrapped time lies outside the clip, the slot is switched off (195-196, and `emptySlot` at 233-234).
  (b) If the slot is still enabled: set the animation id or empty the slot (210-215); apply the skeleton mask or reset it (219-225); set the slot weight to `getWeightValue(start, end, time, startWeight, endWeight, smoothness)` (228).
  The local time, the speed and the ramp all use the same caller `time`. The ramp times are on that clock too.
- `getLocalTime` (310-345): unwrapped = clip begin + (global time - time origin) x speed (319). Clamp limits it to [begin, end] (325). Repeat takes fmod by the clip length, with a negative branch (332-334). Disable and the default case do not wrap (switch default at 337). If the slot has no animation, the global time is returned unchanged (344).
- `getWeightValue` (240-268): before the start time it returns the start weight, and after the end time the end weight (243-247). Between the two, the linear value is start + (end - start) x fraction (252). If smoothness is below 0.0001 the linear value is used (255-256). Otherwise a cubic with a = 2(start - end), b = 3(end - start) gives quad = a x^3 + b x^2 + start (259-264), which is a smoothstep from start to end. The result is smoothness x quad + (1 - smoothness) x linear (267).
- Mixing (channel_mixer.cpp). Only slots that are non-empty with weight above 0 are kept (215). A channel's contribution from a slot is channel weight x slot weight (112). The first contributor is copied. Each later contributor is blended as a running weighted mean: value = value x lastBlend/(lastBlend + blend) + new x (1 - that fraction), then lastBlend += blend (148, 151). The blend itself is `this x f + other x (1 - f)` (animated_value.h:86). Quaternion tracks are aligned to the first contributor before blending (144). If every contribution is zero, the value is left as it was (155). With one active slot there is a fast path that copies the track value (226-254).
- Masks. `applySkeletonWeight` (channel_mixer.cpp:530-573) writes a per-channel weight for the slot, as 1 - w when inverted (569). It only does this for mask nodes whose name matches a channel of the animation set (561) and is set up in the mixer (567-568). Channel weights start at 1 (366). `resetSkeletonWeight` (577-597) sets every channel back to 1 (594), but only when the slot had a mask (583). These three lines are the only writes to channel weights in the file (366, 569, 594).
- Time source. `CScene::animate(atTime)` (scene.cpp:863) computes its own delta from the caller time (878), and replaces a negative delta with 0.01 (880-882). The playlist code has no fixed step and no accumulator: it evaluates at whatever time the caller passes. This is a variable-step design.

## 2. Key functions

- `CAnimationPlaylist::setupMixer`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/animation_playlist.cpp` 170-236. Slot order, disable check, ramp call.
- `CAnimationPlaylist::getLocalTime`: animation_playlist.cpp 310-345. Speed, origin, clamp, repeat.
- `CAnimationPlaylist::getWeightValue`: animation_playlist.cpp 240-268. Ramp clamp, linear, smoothstep, mix.
- `CChannelMixer::evalSingleChannel`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/channel_mixer.cpp` 88-160. Per-channel running weighted mean.
- `CChannelMixer::applySkeletonWeight` and `resetSkeletonWeight`: channel_mixer.cpp 530-597. Per-channel masks.
- `CPlayListManager::animate`: `/mnt/frankendom-donors/ryzom-ryzomcore/nel/src/3d/play_list_manager.cpp` 50-72. Setup then eval, per playlist.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Eight slots, each a clip with a weight | `NumAnimationSlot=8` (channel_mixer.h:64, engine constant) |
| Speed factor scales time from an origin | default `1.f` (animation_playlist.cpp:55) |
| Start and end weight ramp, clamped outside the ramp | default weights `1.f` (56-57); ramp times are supplied by the caller (127), with no donor default |
| Linear to smoothstep blend | default smoothness `0.f` (60); linear below `0.0001` (255) |
| Clamp, repeat, disable wrap | default Clamp (41) |
| Normalised weighted mean over active slots | none (the algorithm itself; fraction at 148) |
| Mask invert | `1 - w` (569) |

The donor fixes no ramp duration and no clip length. Those belong to the caller.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (slot time, disable check, weight ramp, then a per-channel running mean) and the same ramp and smoothstep maths. It omits named channels and the skeleton-name lookup (the sketch takes a channel name per call), quaternion sign alignment (the sketch uses scalar channels), the single-slot fast path, the detail/LOD path, and the stale-mask behaviour. It differs on purpose in one place: a channel that a mask does not name gets weight 1 on every frame, where the donor keeps the previous weight (see section 6). Times are in the caller's unit. The file was typechecked with `export {}` appended.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Clip { begin: number; end: number; }             // clip range in clip-local time (caller's unit)
type Wrap = "clamp" | "repeat" | "disable";

interface Slot {
  clip: Clip | null;                 // null = empty slot
  timeOrigin: number;                // mixer time at which the clip starts
  speed: number;                     // playback speed factor (default 1)
  wrap: Wrap;
  startWeight: number; startAt: number;   // weight before/at the ramp start
  endWeight: number;   endAt: number;     // weight at/after the ramp end
  smooth: number;                    // 0 = linear ramp, 1 = smoothstep ramp
  mask: Map<string, number> | null;  // per-channel (bone) weight; null = all channels 1
  maskInvert: boolean;
}

type Sample = (clip: Clip, localT: number, channel: string) => number;

// Clip-local time for one slot at mixer time t.
function localTime(s: Slot, t: number): number {
  const c = s.clip!;
  const raw = c.begin + (t - s.timeOrigin) * s.speed;
  if (s.wrap === "repeat") {
    const len = c.end - c.begin;
    const m = (raw - c.begin) % len;          // same sign rule as C fmod
    return c.begin + (m >= 0 ? m : m + len);
  }
  if (s.wrap === "clamp") return Math.min(Math.max(raw, c.begin), c.end);
  return raw;                                  // disable: unclamped, range-checked by the caller
}

// Weight ramp: clamp outside [startAt, endAt], else linear mixed with smoothstep.
function rampWeight(s: Slot, t: number): number {
  if (t <= s.startAt) return s.startWeight;
  if (t >= s.endAt) return s.endWeight;
  const x = (t - s.startAt) / (s.endAt - s.startAt);
  const linear = s.startWeight + (s.endWeight - s.startWeight) * x;
  const eased = s.startWeight + (s.endWeight - s.startWeight) * (3 * x * x - 2 * x * x * x);
  return s.smooth * eased + (1 - s.smooth) * linear;
}

// Per-channel mask. Sketch choice: a channel the mask does not name keeps weight 1 (the donor can keep a stale weight, see simplified).
function maskWeight(s: Slot, channel: string): number {
  if (!s.mask) return 1;
  const w = s.mask.get(channel);
  if (w === undefined) return 1;
  return s.maskInvert ? 1 - w : w;
}

// One pose evaluation. Slots are filtered first, then each channel is a running weighted mean.
function evalPose(slots: Slot[], t: number, channels: string[], sample: Sample): Record<string, number> {
  const active: { slot: Slot; time: number; weight: number }[] = [];
  for (const s of slots) {
    if (!s.clip) continue;
    const lt = localTime(s, t);
    if (s.wrap === "disable" && (lt < s.clip.begin || lt > s.clip.end)) continue;
    const w = rampWeight(s, t);
    if (w <= 0) continue;
    active.push({ slot: s, time: lt, weight: w });
  }

  const out: Record<string, number> = {};
  for (const ch of channels) {
    let acc = 0;
    let lastBlend = 0;
    let first = true;
    for (const a of active) {
      const blend = a.weight * maskWeight(a.slot, ch);
      if (blend === 0) continue;
      const v = sample(a.slot.clip!, a.time, ch);
      if (first) { acc = v; lastBlend = blend; first = false; }
      else {
        const keep = lastBlend / (lastBlend + blend);    // weight of the running sum
        acc = acc * keep + v * (1 - keep);
        lastBlend += blend;
      }
    }
    if (!first) out[ch] = acc;                           // all-zero channel: left unset, caller keeps its last value
  }
  return out;
}
```

## 5. Lands in

- TARGET `src/fight/anim-mixer.ts` (new client module: the pose evaluator for hero and creature clips; it never decides a hit). Parity-checklist row 6 (hero actor/animation).
- today: not located in the Frankendom repo (not read).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine, client-only presentation); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0 is copyleft. Clean-room only: the sketch was written from the described mechanism, and no donor line is copied.
- Client only. Nothing in the mixer decides a hit, a guard or damage. Those come from the server-verified duel step (row 1). A clip's weight curve must never time a hit window, or the client and the server would disagree.
- Stale masks (a donor defect, read from the code). `applySkeletonWeight` writes only channels the new mask names (channel_mixer.cpp:561-569), and weights return to 1 only in `resetSkeletonWeight` (594). If an arm mask switches from attack to guard without a reset, a channel the guard mask leaves out keeps the attack value. Frankendom should build every mask as a full bone table, so no old value survives a switch.
- Null clip in Disable mode (donor defect, read from the code). The Disable branch dereferences `pAnimation` with no null check (animation_playlist.cpp:192-196), while `getLocalTime` does check for null (316). Frankendom should validate each clip id when the catalogue loads (row 21), not during play.
- Ramp times and clip ranges are in the caller's time unit. The donor does not say whether that is seconds or milliseconds (not read). Frankendom must pick one unit in the catalogue.
- Cost is bounded per actor (8 slots times channels). With MAX_ATTACKERS = 3, at most three creature actors mix against the hero at once. That is a client frame cost, not a server rule.
- The hero is one ledger: the mixer owns no game state. Attack and guard state remain in the duel record.

Best transferable idea: layer a hero's motion as a few weighted clip slots, each with a speed and an eased start and end ramp, and blend the active slots per bone as a normalised running mean with a full mask table per move.
Decision (proposed): adapt - the hero needs layered clips (a locomotion or guard base plus an arm-only attack on a mask, ramped in and out), and this slot-plus-ramp-plus-normalised-mean is that shape; Frankendom changes it to use bone-index masks from the catalogue, full mask tables, and one time unit, and keeps it client-only.
Acceptance: a unit test on `src/fight/anim-mixer.ts` checks that the blended pose equals the weighted mean of the active slot samples for each channel, and that after an arm-mask switch from attack to guard no channel keeps the attack weight; in play the arm eases from guard into attack over the catalogue ramp time while the legs keep the locomotion clip.
