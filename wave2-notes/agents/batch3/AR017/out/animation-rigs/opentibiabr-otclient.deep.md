# opentibiabr-otclient (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` (with `animator.h`) | Licence: MIT (`LICENSE`: "OTClient is made available under the MIT License"; same MIT text in the `animator.h` header) | C++ | symbol `Animator::getPhase` (with `Animator::getPhaseAt`, `Animator::calculateSynchronous`, `Animator::getPingPongPhase`, `Animator::getLoopPhase`)

Checked: Read in full: `animator.h` (98 lines) and `animator.cpp` (253 lines). Callers read: `creature.cpp` 468-486 and 1218-1231, `item.cpp` 246-256, `effect.cpp` 44-60, `attachedeffect.cpp` 190-200, `paperdoll.cpp` 110-120. Callers of `setPhase` and `resetAnimation` outside the animator: none found by grep under `src/`. Topic fit, stated plainly: this is 2D sprite-phase clip playback, not a skeletal rig. A grep under `src/` for skeleton, skinning, bone, ragdoll and inverse kinematics found no files, and nothing in the donor attaches a part to a bone. `attachedeffect.cpp` 190-200 and `paperdoll.cpp` 110-120 were read only as far as their calls to `getPhaseAt`; neither was read as an attachment point. The mechanism transfers as clip timing only. Not read: the protobuf appearance mapping (what makes `loop_count` negative), `g_gameConfig` tick values, the frame-tick config. Confidence: high on the phase clock and loop policy; medium on the sync-path behaviour, which I traced by reading but did not run.

Best transferable idea: Give every instance its own clip clock with a random per-phase duration and carry the overrun into the next phase, so identical creatures and flipbook effects stop moving in lockstep while loops stay counted, ping-pong or hold-last.
Decision (proposed): adapt - take the per-instance clock, overrun carry, loop policy and random per-phase jitter for creature idle variation and flipbook VFX (sparks, dust); do not port the synchronized resync path until the donor's double random draw is fixed (the sketch draws once).
Acceptance: Headless client test: a counted clip with loop count 2 plays exactly two cycles and then holds its last phase, and 20 instances of one creature with per-phase durations that differ (min below max) are not on the same phase at the same frame after one cycle.

## 1. Mechanism

- Each animated thing (a creature, item or effect) owns one `Animator` with: a phase count, a min and max duration per phase (ms), a loop count, a start phase, and an async flag. Phase durations come from the appearance data (`animator.cpp` 32-41, 52 replaces zero-duration phases with the first non-zero pair, or 1 ms).
- Start: `m_phase` is the start phase, or a random phase when the start phase is -1 (`animator.cpp` 176).
- The clock is `getPhase()` (122). Each call: if the current millisecond is new and the clip is not complete (126), compare elapsed time with the current phase's remaining duration (127).
  - If the time is up, pick the next phase. Loop policy: a negative loop count means ping-pong (129); otherwise the next phase is the following index, and at the end: a loop count of 0 wraps to 0 forever; a count n > 0 repeats the cycle until n cycles are done, then holds the last phase and marks the clip complete (`getLoopPhase` 201-212, complete at 143).
  - The overrun is carried. The new phase's duration (drawn with `getPhaseDuration`, 215-223, fixed when min equals max, otherwise random in the range) is reduced by the overrun, and the result is clamped at 0 (140).
  - If the reduced duration is negative and the animator is synchronized (async false), the animator resyncs from the shared clock instead (136-137, `calculateSynchronous` 225-243): cycle length from the global clock modulo the total, then a walk through the phases.
  - If the time is not up, the remaining duration is reduced by the elapsed time (145).
- A second accessor, `getPhaseAt(timer, speed)` (157-171), works from elapsed time alone. It sums each phase's max duration divided by the speed factor, returns the first phase whose running total exceeds the elapsed time, and past the end returns the last phase and restarts the timer. It uses no random draw and ignores the loop count and loop type.
- Callers choose between them:
  - An item with an idle animator uses `getPhase()` (`item.cpp` 253).
  - Effects with the enhanced-animation feature use `getPhaseAt` with their own timer, because `getPhase()` would give all effects the same phase (`effect.cpp` 47-53, comment at 52).
  - Attached effects and paperdolls pass their speed to `getPhaseAt` (`attachedeffect.cpp` 197, `paperdoll.cpp` 117).
  - Creature outfits take a different path (`creature.cpp` 476-480). Only an item-type outfit with an idle animator uses `getPhase()`; any other creature uses a fixed clock: `(g_clock.millis() % (animateTicks * phases)) / animateTicks` (480). That path is in lockstep for every creature of that type.
  - Walk phases are indexed after the idle phases in one index space: `m_walkAnimationPhase + idle phases - 1` (`creature.cpp` 1225-1226).
- The loop-type enum (`m_loopType`) is only read by `isInfiniteLoop()` (`animator.h` 68). The phase code picks ping-pong from the sign of `m_loopCount` (`animator.cpp` 129).

## 2. Key functions

- `Animator::getPhase`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` 122-151. The per-instance clock: advance, loop policy, overrun carry, complete flag.
- `Animator::calculateSynchronous`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` 225-243. The resync path (see defect 2 below).
- `Animator::getPhaseAt`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` 153-172. The timer path.
- `Animator::getLoopPhase` and `Animator::getPingPongPhase`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` 187-213. Loop policy.
- `Animator::setPhase`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` 97-120. Manual phase set (no callers found; see defect 1).
- `Animator::unserializeAppearance` and `Animator::unserialize`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/animator.cpp` 29-60 and 63-83. Data load.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-instance phase clock: elapsed vs remaining duration, carry the overrun into the next phase | None (rule, `animator.cpp` 127-140) |
| Random duration per phase when min is below max; fixed when equal | Per-phase min and max from the appearance data (`animator.cpp` 41, 220-222) |
| Zero-duration phases replaced by the first non-zero pair, else 1 ms | 1 ms fallback (`animator.cpp` 44-52) |
| Counted loops: n cycles then hold last; 0 = wrap forever; negative = ping-pong | Loop count from data (`animator.cpp` 33, 129, 204-212) |
| Start at a fixed or random phase | Sentinel -1 = random (`animator.cpp` 176); sentinels 254 (random) and 255 (async) in `animator.h` 37-38 |
| Timer path: phase from elapsed time with speed factor, no random | Max duration per phase divided by speed (`animator.cpp` 161) |
| Lockstep path: phase from a shared clock modulo the cycle | Frame ticks per phase from config (`creature.cpp` 480; config values not read) |

## 4. TypeScript sketch

simplified: keeps the per-instance clock, overrun carry, loop policy, random durations and the timer helper; the sketch draws each phase's duration once per resync (the donor draws twice, `animator.cpp` 229 and 235, see defect 2), uses plain numbers for time (the donor uses integer ticks that truncate as they sum), and draws an integer in [min, max] because random inclusivity was not read. It omits the sentinel values (-1, 254, 255), the zero-duration fallback, `setPhase`, and the speed factor on the clock path; the shared-clock resync is shown in its fixed form.

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface PhaseSpec { min: number; max: number; }            // ms; min == max means fixed

interface ClipSpec {
  phases: PhaseSpec[];
  loopCount: number;          // 0 = wrap forever; n > 0 = play n cycles then hold last; n < 0 = ping-pong
  async: boolean;             // false = synchronized: may resync from the shared clock on a long stall
  startPhase: number;         // -1 = random start phase
}

interface PlayState {
  phase: number;
  direction: number;          // ping-pong direction: 1 or -1
  loop: number;               // cycles already repeated
  duration: number;           // ms left in the current phase
  last: number;               // ms timestamp of the last tick
  complete: boolean;          // held on the last phase
}

type Rand = () => number;     // uniform in [0, 1)

// One random duration per phase use. min == max returns min.
function durationOf(clip: ClipSpec, phase: number, rand: Rand): number {
  const { min, max } = clip.phases[phase];
  return min === max ? min : min + Math.floor(rand() * (max - min + 1));
}

function start(clip: ClipSpec, now: number, rand: Rand): PlayState {
  const n = clip.phases.length;
  const phase = clip.startPhase > -1 ? clip.startPhase : Math.floor(rand() * n);
  return { phase, direction: 1, loop: 0, duration: durationOf(clip, phase, rand), last: now, complete: false };
}

// Next phase for the loop policy. Ping-pong is chosen by the sign of loopCount.
function nextPhase(s: PlayState, clip: ClipSpec): number {
  const n = clip.phases.length;
  if (clip.loopCount < 0) {
    let step = s.direction;
    if (s.phase + step < 0 || s.phase + step >= n) {
      s.direction = -s.direction;
      step = -step;
    }
    return s.phase + step;
  }
  if (s.phase + 1 < n) return s.phase + 1;
  if (clip.loopCount === 0) return 0;
  if (s.loop < clip.loopCount - 1) {
    s.loop += 1;
    return 0;
  }
  return s.phase;             // hold on the last phase: complete
}

// Synchronized resync: pick the phase from the shared clock. One draw per phase per resync (see simplified line).
function resyncFromClock(s: PlayState, clip: ClipSpec, now: number, rand: Rand): void {
  const durations = clip.phases.map((_, i) => durationOf(clip, i, rand));
  const total = durations.reduce((a, b) => a + b, 0);
  if (total <= 0) return;
  let t = now % total;
  for (let i = 0; i < durations.length; i++) {
    if (t < durations[i]) {
      s.phase = i;
      s.duration = durations[i] - t;
      s.last = now;
      return;
    }
    t -= durations[i];
  }
}

// One tick. The overrun past a phase end is carried into the next phase's duration.
function tick(s: PlayState, clip: ClipSpec, now: number, rand: Rand): number {
  if (now === s.last || s.complete) return s.phase;
  const elapsed = now - s.last;
  if (elapsed >= s.duration) {
    const next = nextPhase(s, clip);
    if (next !== s.phase) {
      const d = durationOf(clip, next, rand) - (elapsed - s.duration);
      if (d < 0 && !clip.async) {
        resyncFromClock(s, clip, now, rand);
      } else {
        s.phase = next;
        s.duration = Math.max(0, d);
      }
    } else {
      s.complete = true;
    }
  } else {
    s.duration -= elapsed;
  }
  s.last = now;
  return s.phase;
}

// Timer path: a phase from elapsed time alone, using each phase's max duration divided by a speed factor.
// No loop count, no random draw. Past the end it reports restart, and the caller restarts its timer.
function phaseAtTimer(clip: ClipSpec, elapsedMs: number, speed: number): { phase: number; restart: boolean } {
  let total = 0;
  for (let i = 0; i < clip.phases.length; i++) {
    total += clip.phases[i].max / speed;
    if (elapsedMs < total) return { phase: i, restart: false };
  }
  return { phase: clip.phases.length - 1, restart: true };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/clip-timing.ts` (new client module; proposed path). Per-instance clip clock for creature idle variation and flipbook effects; no fight state. Lead to confirm the path, as with the openmw note. Parity-checklist row 7 (creature actor/clips).
- today: not read. The Frankendom repo was not opened in this pass.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is still written from the mechanism)
- Brief rule served: 1 (one engine: no fight state in the clock; the clock is client presentation). Creature clip variety is a client choice; the server owns which creature is there.

## 6. Gaps and risks

Defects in the donor, with the fix I would write (the idea stays):

1. `setPhase` reads the duration of the requested phase, not of `m_phase` (`animator.cpp` 118). For the sentinels -1, 254 and 255, and any out-of-range phase, that index is out of bounds: the only check is an assert on the upper bound (217), and -1 passes it. Fix: take the duration from the phase actually set. No callers of `setPhase` or `resetAnimation` were found under `src/`, so this is latent in this snapshot.
2. `calculateSynchronous` draws a random duration for each phase twice: once for the cycle total (229) and again during the lookup (235). When min is below max, the cycle length it searches with is not the one it walks through, so the walk can run past the end and set nothing, leaving the phase unchanged. This path is live: `getPhase` calls it when a synchronized animator overruns (136-137). Fix: draw once per phase per resync and store the array (the sketch does this).
3. The "synchronized" name suggests a shared clock, but in normal running a synchronized animator only resyncs on a negative overrun (136). Two synchronized instances with random durations drift apart between resyncs. Frankendom should decide whether it wants a true shared clock (then use the lockstep path on purpose) or the drift.
4. Ping-pong is chosen by the sign of `m_loopCount` (129), while the loop-type enum is only used by `isInfiniteLoop()` (68). The protobuf mapping that makes the count negative was not read (not verified). Fix: one field.
5. `getPhaseAt` ignores the loop count and loop type, and returns the last phase for one call before restarting (161-170). Effects on this path loop forever whatever their data says. The caller's comment (`effect.cpp` 52) explains why it exists (start times differ per effect). Keep the timer path for independent effects, but give it the loop count if the data needs it.
6. A creature outfit (not an item) ignores its idle animator and uses the fixed lockstep clock (`creature.cpp` 476-480), because the first branch requires `m_outfit.isItem()`. Whether that is intended was not checked.

Other risks:

- Random inclusivity: `stdext::random_range` was not read, so the sketch's integer draw in [min, max] is an assumption.
- Lockstep is the donor's default for creatures without an item-type outfit. Frankendom's many-on-one fights (MAX_ATTACKERS = 3) need instances to desynchronise on purpose; the random per-phase jitter here is the donor's tool for that, not a fight rule.
- Tunable data: per-clip phase min and max, loop count, start phase, async flag. Engine constants: the overrun carry, the complete-on-hold rule, the 1 ms fallback, and the sentinels. The schema has no third `where` value, so the clip durations are marked `engine constant` in the sidecar; in practice they are per-creature catalogue data.
- Not searched: any hit-reaction or hitstop that freezes a flipbook (row 10 territory).

Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is still written from the mechanism)
Brief rule served: 1 (one engine: no fight state in the clock; the clock is client presentation)
