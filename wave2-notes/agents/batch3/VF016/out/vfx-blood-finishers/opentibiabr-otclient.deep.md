# opentibiabr-otclient (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/attachedeffect.cpp` (draw 79-169, bounce 73-77, phase 181-225, move 229-232) with `src/client/attachableobject.cpp` (attach, detach and the draw loop 44-169) and the effect data `modules/game_attachedeffects/effects.lua` + `lib.lua` | Licence: MIT (LICENSE line 1: "OTClient is made available under the MIT License", copyright 2010-2026 in the source header) | C++ with Lua data | symbol `AttachableObject::attachEffect`

Checked: The hint file `attachedeffect.cpp` is the draw path for one attached effect. It is not a blood, gore, finisher or screen-effect implementation. I searched `src/client` for blood, splash, death, shake and flash terms and `modules` and `mods` for blood, onDeath and splash: no blood or gore visual, no finisher and no screen shake exist in those trees. Death shows up only as the Lua callback `Creature::onDeath` (creature.cpp 680-682, seen) and the player death window (`modules/game_playerdeath`, not read). Particle effects are created by name at attachableobject.cpp 173 (seen, not read). So the STRONG mechanism here is the attached-effect lifecycle (timed end, loop count, end-of-effect burst, hide-owner counter, bounce, pulse, fade and move tween) and its data format, not blood. Read in full: attachedeffect.cpp 1-236, attachableobject.cpp 20-180, effects.lua 1-148, lib.lua 1-70 (executeConfig; line 71 seen in grep). Not read: attachedeffectmanager.cpp, lib.lua 72-209, attachedeffects.lua, attachedeffect.h except the setters and fields. Confidence: high on the lifecycle and the defects I list; medium on whether it is the right base for blood. camera_scope: not a camera cell.

Best transferable idea: An effect is data with a timed end, a loop count and an end-of-effect burst, and a counted hide keeps an owner hidden while any hiding effect is still running.
Decision (proposed): adapt — keep the data shape for finisher staging; drop the dispatcher and Lua callbacks; the server, not a client timer, decides when a kill is final.
Acceptance: When a finisher lands the defeated creature disappears for 1.5 s and a burst plays once; a second finisher on the same creature keeps it hidden until it ends; the end hook fires exactly once even if two frames see the end.

## 1. Mechanism

- Data first. `effects.lua` registers each effect by id with a config table (`register(id, name, thingId, thingType, config)`, header 2-13). `lib.lua` `executeConfig` (4-71) copies the config onto the C++ object: `bounce` (44-46), `pulse` (48-50), `fade` (52-54), `duration` (56-58), `loop` (60-62), `permanent` (64), `transform` (66), `hideOwner` (70-71), plus speed, shader, opacity, light, offset and draw order. `onAttach` and `onDetach` are Lua functions.
- Attach (`attachableobject.cpp` 44-65): the effect is added to the owner's list. If `hidesOwner`, the owner's hide counter goes up (51-52). If the duration is above 0, a detach is scheduled on the event dispatcher after that delay (54-58; the dispatcher's unit is not read, the config values read as ms). Then the Lua `onAttach` runs on the next dispatcher event (61-64).
- Detach (67-104): find the effect, call `onDetachEffect` (the hide counter goes down at 97-98; Lua `onDetach` runs at 102-103), then erase it. A loop that has finished also detaches (157-160), so a one-shot effect removes itself.
- Draw per frame (`attachedeffect.cpp` 79-169), in this order: transform effects draw nothing (80-81); the on-top and on-UI filters (85-90); the loop counter: on each phase change, and when the phase returns to 0 the counter goes down, and at 0 the effect stops drawing (93-97); the phase is read (92); opacity, shader, pulse scale and fade opacity are set for this draw only (110-121); the position is the draw point minus the offset, plus the move tween (123-127); the bounce offset is subtracted (129-131); then the texture or the thing is drawn (140-150), and the state is restored (154-162). Child effects are drawn after the parent (165-168).
- Phase (181-225). For a texture, the animated texture's frame. For an effect-type thing, ticks per frame = max(1, effectTicksPerFrame / speed); the phase advances with elapsed time and holds on the last frame, and the timer restarts when the last phase is reached (199-210). For an animate-always creature, the phase comes from the global clock modulo the period (212-222), so every instance of that creature is in step.
- Bounce (`getBounce`, 73-77): a triangle wave, `minHeight + (height - |height - (elapsed / (speed/100)) mod 2*height|)`. The period is 2 x height x (speed/100) ms. Bat `{20, 20, 2000}` (effects.lua 147): period 2 x 20 x 20 = 800 ms, and the sprite rises between 20 and 40 px.
- Move (229-232): `m_toPoint` is the tile vector times the sprite size, and the timer restarts. The draw adds `m_toPoint x min(elapsed/duration, 1)` (124-127): a linear slide over the duration.
- Numbers in the data: Lake Monster (effects.lua 86-93) hides its owner (87) for 1500 ms (88), and its `onDetach` (90) spawns effect 54 (92) as the end burst. Transform (registered at 71) lasts 5000 ms (73) and its `onDetach` (79) spawns effect 50 (81). Ki pulse `{0, 50, 3000}` (105): the scale gets 0 to 0.5 added over a 3000 ms period (2 x 50 x 30). Thunder (109-110) has `loop = 1`: one cycle, then it detaches. Dynamic Effect (114-115, duration 500) spawns two missiles that move in from three tiles to the owner over the same duration (the missile block is read; its line numbers are not cited).

## 2. Key functions

- `AttachedEffect::draw`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/attachedeffect.cpp` 79-169. Order: transform skip, filters, loop counter, opacity/shader/pulse/fade for this draw, position with move and bounce, texture or thing, restore, children.
- `getBounce`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/attachedeffect.cpp` 73-77 (the triangle wave).
- `AttachableObject::attachEffect` and the scheduled detach: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/attachableobject.cpp` 44-65.
- `AttachableObject::detachEffect` / `onDetachEffect`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/attachableobject.cpp` 67-104.
- `AttachableObject::drawAttachedEffect` (loop-end detach): `/mnt/frankendom-donors/opentibiabr-otclient/src/client/attachableobject.cpp` 152-163.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Timed effect: detach itself after N ms and run an end hook | Duration in the data: 1500 (Lake Monster), 5000 (Transform), 500 (Dynamic Effect) (effects.lua 88, 73, 115) |
| End burst: the end hook spawns a second effect | Effect ids 54 and 50 (effects.lua 92, 81) |
| Counted hide: the owner hides while at least one hiding effect is attached | Count, not a boolean (attachableobject.cpp 51-52, 97-98) |
| Loop count: N full cycles, then the effect stops and detaches | `loop = 1` (effects.lua 110); default -1 means no limit (attachedeffect.h 118) |
| Triangle-wave bounce with a period set by height and ms per unit | `{20, 20, 2000}` (effects.lua 147): 800 ms period |
| Pulse and fade as percent offsets on scale and opacity | `pulse {0, 50, 3000}` (effects.lua 105); fade clamp to 0..1 (attachedeffect.cpp 119) |
| Linear move over the duration, clamped at the end | Tween fraction min(elapsed/duration, 1) (attachedeffect.cpp 125) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters for behaviour: the duration and loop checks run each frame, the end hook runs once, and the hide counter goes up on attach and down on detach. Where the donor compares the animation phase with the last phase to count a loop, the sketch counts cycle indices, which gives the same count. It omits the drawing (texture, shader, scale, opacity, light, offset and draw order), the move tween, the transform flag, the child effects, the dispatcher (the donor defers attach and detach through it), the Lua callbacks other than `onDetach`, and the permanent flag. It fixes two donor defects: the end hook can fire once only (the donor queues a detach every frame a finished loop is drawn), and the modulus in the bounce is guarded.

```ts
// Licence: MIT (donor, OTClient LICENSE). Shape adapted; written from the described mechanism, not a translation of the donor lines.
export interface Bounce { minHeight: number; height: number; msPerUnit: number }

export interface FxConfig {
  durationMs: number;      // 0 = no timed end
  loop: number;            // -1 = no loop limit; N = end after N full cycles
  cycleMs: number;         // length of one animation cycle
  bounce?: Bounce;
  hidesOwner: boolean;
  onDetach?: () => void;   // e.g. spawn an end burst
}

// Triangle wave from minHeight up to minHeight + height and back. Period = 2 * height * msPerUnit.
export function bounceOffset(b: Bounce, elapsedMs: number): number {
  const period = 2 * b.height;
  if (period <= 0 || b.msPerUnit <= 0) return b.minHeight; // guard: the donor takes a modulus with no guard
  const units = Math.floor(elapsedMs / b.msPerUnit) % period;
  return b.minHeight + (b.height - Math.abs(b.height - units));
}

export class Fx {
  private readonly startMs: number;
  private readonly endAt: number;
  private lastCycle = 0;
  private loopsLeft: number;
  private detached = false;

  constructor(private readonly cfg: FxConfig, private readonly owner: { hideCount: number }, nowMs: number) {
    this.startMs = nowMs;
    this.endAt = cfg.durationMs > 0 ? nowMs + cfg.durationMs : Infinity;
    this.loopsLeft = cfg.loop;
    if (cfg.hidesOwner) owner.hideCount += 1;   // counted, so two hiding effects do not un-hide early
  }

  // Called once per frame. Returns false once the effect has ended.
  tick(nowMs: number): boolean {
    if (this.detached) return false;
    const cycle = Math.floor((nowMs - this.startMs) / this.cfg.cycleMs);
    if (cycle > this.lastCycle) {
      this.lastCycle = cycle;
      if (this.loopsLeft > 0 && --this.loopsLeft === 0) { this.detach(); return false; }
    }
    if (nowMs >= this.endAt) { this.detach(); return false; }
    return true;
  }

  private detach(): void {
    if (this.detached) return;   // detach exactly once, however many frames ask
    this.detached = true;
    if (this.cfg.hidesOwner) this.owner.hideCount -= 1;
    if (this.cfg.onDetach) this.cfg.onDetach();
  }
}

// Example: a hiding effect of 1500 ms with a burst on detach, then a bounce sample.
const owner = { hideCount: 0 };
let bursts = 0;
const fx = new Fx({ durationMs: 1500, loop: -1, cycleMs: 1000, hidesOwner: true, onDetach: () => { bursts += 1; } }, owner, 0);
fx.tick(1600);
fx.tick(1700);
export const hiddenAfter = owner.hideCount;   // 0
export const burstCount = bursts;             // 1
export const bounceSample = bounceOffset({ minHeight: 20, height: 20, msPerUnit: 20 }, 400); // peak 40
```

## 5. Lands in

- TARGET `src/fight/finisher-fx.ts` (new, client-only effect player; the engine emits the finisher start and end events and never waits on effect timers). Parity-checklist row 9 (finishers). Blood and wounds, row 8, would reuse the same player for decal sprites, but this donor has no blood to copy.
- Use for Frankendom: a finisher hides the defeated creature for a fixed time with a counted hide, and an end burst runs on detach. Two overlapping finishers on one creature keep it hidden until both end. The durations and the loop count are zone or content data, not engine constants.
- Decision (proposed): adapt. Keep the data shape (duration, loop, bounce, end hook, counted hide). Drop the dispatcher and Lua callbacks; the server, not a client timer, decides when a kill is final.
- Acceptance: when a finisher lands, the defeated creature disappears for 1.5 s and then a burst plays once; a second finisher on the same creature started during that time keeps it hidden until the second one ends; a test asserts the end hook fires exactly once even if two frames both see the end.
- Reuse tag: adapt-shape (MIT; the code may be adapted, the sketch is clean-room from the mechanism)
- Brief rule served: 1 (one engine; the effect player is client-only); 9 (finishers) per the parity row above

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is written from the mechanism; no donor line is copied.
- No blood, gore, screen effect or particle-system code in the read path; those are not covered here. Particle effects are named in the data (attachableobject.cpp 171-178 seen, not read).
- Defects found, and the fix for each:
  - `m_speed` is `uint8_t` (attachedeffect.h 120) and `setSpeed` stores `speed * 100u` into it (attachedeffect.h 42). A speed of 5, which Bat Wings uses (effects.lua 27-28), stores 500 and wraps to 244, so `getSpeed()` returns 2.44. Fix: use `uint16_t` and clamp the input.
  - `setFade(start, end, speed)` stores `end` as the height (attachedeffect.h 83-84), so the sprite runs from `start` to `start + end`, not `start` to `end`. The Lua comment (effects.lua 10) says `fade{start, end, speed}`. With `fade {50, 100, s}` the fade runs 50 to 150 and is clamped to 1.0 above 100 (attachedeffect.cpp 118-119). Fix: store `end - start` as the height, or change the comment and the data.
  - The bounce modulus is `static_cast<int>(height * 2)` (attachedeffect.cpp 76) with no guard on the scaled value. The callers check the unscaled height (114, 129), not the scaled one, so a scale below half can make it zero. Fix: clamp to at least 1 (the sketch guards the period).
  - `drawAttachedEffect` queues a detach on every frame in which a finished loop is drawn (attachableobject.cpp 157-161). `detachEffect` does nothing on a second call, so this is wasteful but harmless. Fix: a `detached` flag (the sketch does this).
  - `m_duration` is `uint16_t` (attachedeffect.h 126): durations over 65.5 s wrap. No data uses more than 5000. Fix: `uint32_t`.
  - The move tween divides by `m_duration` (attachedeffect.cpp 125). A duration of 0 with zero elapsed gives 0/0 (NaN) for one frame. Edge case, not reproduced. Fix: return the target when the duration is 0.
- Frankendom's rulings: durations here are wall-clock client timers. The server must not depend on them (kills are server-verified, one ledger). A finisher's end hook is a visual only.
- Counted hide: the donor's hide count is `uint8_t` (declared at attachableobject.h 97). 256 overlapping hides would wrap. Not a practical limit; noted for completeness.
- The donor's `clearTemporaryAttachedEffects` runs Lua `onDetach` inside `std::erase_if` (attachableobject.cpp 117-124). A callback that changes the same list would be unsafe. Frankendom should collect first, then fire hooks.

Reuse tag: adapt-shape (MIT; clean-room sketch)
Brief rule served: 1 (one engine, client effect player); 9 (finishers)
