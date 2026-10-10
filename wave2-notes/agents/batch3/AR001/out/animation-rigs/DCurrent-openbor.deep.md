# DCurrent-openbor (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` (`calculate_edelay` 27940-28010; `update_frame` 28079; `update_animation` 32895; the logic clock 51516-51604) with `engine/openbor.h` (delay constants 182-187; `s_edelay` 2570-2579; `expand_time` 1838-1840) | Licence: BSD-3-Clause (LICENSE line 1 "Copyright (c) 2003, Roel van Mastbergen & Senile Team"; line 11 is the no-endorsement clause) | C | symbol `calculate_edelay`

Note on the file list: the hint `engine/source/openborscript/animation.c` is the script binding layer (property get and set, sub-entity allocation). The timing and frame logic is in `engine/openbor.c`, which the hint did not point to.

Checked: Read in full: `calculate_edelay` (27940-28010), `animation_timestamp_add_bounded` and `animation_timestamp_from_delay` (27875-27910), the delay constants (openbor.h 182-187), `s_edelay` (openbor.h 2570-2579), `expand_time` (openbor.h 1836-1842), `is_frozen` (openbor.c 1422-1426), the logic clock in `main` (openbor.c 50812-50819 and 51486-51606). Read in part: `update_frame` (28079-28298; read to 28240; the spawn, summon and child-spawn triggers at 28207-28224 were read, but their callees `ent_spawn_ent`, `ent_summon_ent` and `child_spawn_execute_list` were not), `update_animation` (32895-33055; the loop-wrap branch and the update call were read). Callers of `calculate_edelay`, found by grep: `update_frame` (28102) and `ent_set_model` (28480); both read. Callers of `update_frame`: several, grep only. Not read: `timer_getinterval` (its body is not in this donor's source tree, only the declaration in `source/gamelib/timer.h`), so the clock's milliseconds per unit is unknown. Confidence: high on the timing chain (clock, next-frame timestamp, enhanced delay, freeze), because each function was read end to end. Medium on the frame events, because only part was read. camera_scope: not applicable (not a camera cell).

Best transferable idea: each animation frame stores an absolute "advance at" time computed as now plus one authored delay scaled by one per-entity factor and modifier, clamped to caps, and a freeze moves that time forward one unit per logic step, so per-entity attack speed and hit-stop both come from data without touching the frame list.
Decision (proposed): adapt. The absolute next-frame time, the single factor and modifier with range and caps, and the freeze that stretches the timeline fit windup speed and hit-stop, but the donor's frame timing is client presentation, so the server must keep its own tick timeline and use the same factor only as data.
Acceptance: a server test sets a windup factor of 0.8 on one attack and asserts that the hit window opens 20 percent sooner in server ticks (within the cap), and that a freeze of two ticks moves the hit window back by exactly two ticks; the Pit clip for the same attack plays with the same factor.

## 1. Mechanism

- Clock. `_time` is a logic counter, starts at 0 (openbor.c 593, 23931), and goes up by one at each logic step (`++_time`, 51604). Each display frame calls `getinterval()` (50812-50819), which asks the timer for the interval for the game speed and clamps it: if it is above the game speed it becomes 1, and if it is above a quarter of the game speed it becomes a quarter (the default game speed is 200, openbor.h 80, so the cap is 50). The logic target is `newtime = _time + interval` (51521; slow motion skips most display frames, 51516). The target is capped at 100 units ahead (51533-51535). The loop `while(_time < newtime)` runs all logic and then `++_time` (51538-51604). So logic always steps by one unit, and a slow display makes the loop catch up in several steps, up to the cap.
- Next-frame time. `update_frame(ent, f)` sets `animpos = f` (28095). If the entity is animating, it sets `nextanim = animation_timestamp_from_delay(_time, calculate_edelay(self, f))` (28100-28103). That is an absolute time, not a count of frames.
- Enhanced delay, `calculate_edelay` (27940-28010), in this order: (a) read the authored delay of frame f; split off the behaviour flag bits (27944-27950). (b) Range gate (27961-27964): if `range.max < 0`, or `range.min > 0` and the raw delay is below it, or the raw delay is above `range.max`, return the raw delay unchanged. (c) `result = delay * factor + modifier` (27972 onwards). (d) If the result is NaN (a script gave a non-number), return the raw delay (the donor's comment says this on the same block). (e) Clamp to `[cap.min, cap.max]` (27988 onwards). (f) If the result is 0 or below, return only the flag bits, so the frame is instant. If it reaches the 32-bit maximum, cap it there (not read in full beyond the comment). (g) Otherwise return the flag bits or the truncated result (28010).
- Timestamp arithmetic (27875-27910): an infinite operand gives `DELAY_INFINITE`; a sum that would go past the timestamp maximum (2^63 - 2) stops at the maximum; otherwise it adds. `DELAY_INFINITE` means the frame never advances by time, only by outside influence (openbor.h 183-187).
- Advance. In `update_animation`, a frame advances when the entity is not on an infinite time and `nextanim <= _time` (32976-32977). Textbox entities also advance when an attack or jump key is newly pressed (32978-32985), unless marked no-skip. The next index is `animpos + animating` (32988). It wraps: with a loop mode and a loop maximum, it jumps to the loop minimum or to 0 at the maximum; without loop mode it wraps to 0 or the last frame and stops animating (32990-33040). Then `update_frame` runs for the new frame (33055).
- Freeze. If `is_frozen(self)`, the entity calls `expand_time(self)` instead of its update (33968-33970). `expand_time` adds one to `stalltime`, `releasetime`, `nextanim`, `nextthink` and `nextmove` when each is positive (openbor.h 1838-1842). So a frozen entity's next frame moves forward by one unit per logic step, and the frame does not advance while frozen.
- `is_frozen` (openbor.c 1422-1426): true when a textbox is on screen and this entity is not a textbox, or when a smartbomber is active and this is not it, or when `self->frozen` is set and `self->freezetime > _time`. Note: the third test reads `self`, the current entity, not the argument `e`.
- Frame events run in `update_frame` after the time is set (28122 onwards): per-frame root motion (x and z added to `movex`/`movez`, 28122; vertical to `base`, 28135), flip frame (28147), weapon frame (28152), quake frame (28162), sub-entity unsummon at its frame (28185), sub-entity spawn at its frame when the model index is non-negative (28207), and child spawn lists per frame (28224).
- Spawn data. The animation script's spawn command stores the frame, x, z, y and a placement value (openbor.c 20725-20731). The runtime use of the placement value was not read.

## 2. Key functions

- `calculate_edelay`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 27940-28010. Per-frame delay after the entity's enhanced delay.
- `animation_timestamp_from_delay` and `animation_timestamp_add_bounded`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 27875-27910.
- `update_frame`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 28079-28298 (time set at 28095-28103; events 28122-28224; read in part).
- `update_animation`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 32895 onwards (advance test 32975-32977; wrap 32988-33040; update call 33055).
- Logic clock: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 50812-50819 (interval) and 51516-51604 (catch-up loop).
- `expand_time` (macro) and `is_frozen`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.h` 1838-1842; `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 1422-1427.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One logic step per clock unit; display frames run the steps needed to reach a target | Step size 1 unit (theirs, openbor.c 51604) |
| Target capped at 100 units ahead, so a stall does not spiral | 100 units (theirs, openbor.c 51533-51535) |
| Interval clamp: above the game speed becomes 1; above a quarter of it becomes a quarter | Game speed 200 default (theirs, openbor.h 80); quarter (theirs, openbor.c 50817-50819) |
| Next-frame time is now plus one scaled delay | Scale is the entity's factor and modifier (theirs, openbor.h 2576-2577) |
| Range gate: outside the range the delay passes through | Gate uses min and max of the raw delay (theirs, openbor.c 27961-27964) |
| Caps on the scaled delay | Cap min and max (theirs, openbor.c 27988) |
| Infinite wait as a flag bit | Bit 63; finite values use the low 32 bits (theirs, openbor.h 182-187) |
| Freeze stretches the timeline one unit per step | One unit per logic step (theirs, openbor.h 1840) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the scaled delay (range gate, factor and modifier, NaN guard, caps, zero as instant) and the clock (interval clamp, 100-unit catch-up cap, one unit per step), and the freeze step. It omits the 64-bit flag encoding (infinity is `Number.POSITIVE_INFINITY` here), the 32-bit finite maximum clamp, the loop and wrap of the frame index, the frame events (root motion, flip, weapon, quake, summon, spawn, child spawn), the textbox skip, the slow-motion duty cycle and the recording clock. It reads the frame's raw delay from an array the caller passes in.

```ts
// Licence: BSD-3-Clause (donor LICENSE, Senile Team / OpenBOR Team). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
// Infinity stands for the donor's DELAY_INFINITE flag: the frame never advances without outside influence.
export const DELAY_INFINITE = Number.POSITIVE_INFINITY;

export interface EDelay {
  factor: number;                           // multiplier applied to the frame delay
  modifier: number;                         // static amount added after the factor
  range: { min: number; max: number };      // raw delays outside this range pass through unchanged (max < 0 disables)
  cap: { min: number; max: number };        // final delay is clamped to this
}

// Final delay for one frame, in clock units. Same check order as the donor's calculate_edelay.
export function frameDelay(raw: number, e: EDelay): number {
  const outside = e.range.max < 0 || (e.range.min > 0 && raw < e.range.min) || raw > e.range.max;
  if (outside) return raw;

  let r = raw * e.factor + e.modifier;
  if (Number.isNaN(r)) return raw;          // a broken multiplier keeps the authored delay

  r = Math.min(Math.max(r, e.cap.min), e.cap.max);
  if (r <= 0) return 0;
  return Math.floor(r);
}

// Next-frame time: now plus the final delay for frame f.
export function scheduleFrame(now: number, delays: number[], f: number, e: EDelay): number {
  const raw = delays[f];
  if (raw === undefined) return now;
  return now + frameDelay(raw, e);
}

export interface AnimState {
  nextAt: number; // absolute clock time the frame advances; DELAY_INFINITE = wait
}

// The frame advances when its time has been reached (infinite times never are).
export function frameDue(now: number, a: AnimState): boolean {
  return a.nextAt !== DELAY_INFINITE && a.nextAt <= now;
}

// While the entity is frozen, each logic step pushes its next-frame time forward by one unit.
export function freezeStep(a: AnimState): void {
  if (a.nextAt > 0 && a.nextAt !== DELAY_INFINITE) a.nextAt += 1;
}

// Logic step length in clock units from the measured display interval, clamped as in the donor's getinterval().
export function logicInterval(gameSpeed: number, measured: number): number {
  let i = measured;
  if (i > gameSpeed) i = 1;
  if (i > gameSpeed / 4) i = gameSpeed / 4;
  return i;
}

// One display frame: run logic steps of one unit until the clock reaches the target,
// which may be at most 100 units ahead (the donor's catch-up cap).
export function runLogic(clock: { time: number }, interval: number, paused: boolean, step: (t: number) => void): void {
  if (paused) return;
  let target = clock.time + interval;
  if (target > clock.time + 100) target = clock.time + 100;
  while (clock.time < target) {
    step(clock.time);
    clock.time += 1;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (sketch copy: `/tmp/openbor-frame-clock.ts`).

## 5. Lands in

- TARGET `src/fight/anim-clock.ts` (new, the presentation timing rule for clips, with the same factor used by the engine's windup timeline). Parity-checklist row 6 (hero actor/animation). The server-side tick is row 18 (post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget"), which this note names only as the link, not as the target.
- today: not checked in this pass (the Frankendom repo was not opened here).
- Reuse tag: adapt-allowed (BSD-3-Clause: code may be adapted with the notice kept; this sketch is written clean-room from the mechanism)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor is 2D presentation. Its frame timing runs on the entity's own timeline and advances in logic steps, and nothing about it is server-verified. Frankendom's kills and hit windows must be decided on server ticks. Only the factor, the range and the caps should carry over, applied to the server's own windup timeline.
- Per-entity scaling is one factor and one modifier (openbor.h 2576-2577). A stacked speed effect (buff, slow, boss phase) has no defined order in the donor. Frankendom needs one named stack with a rule for which value wins.
- `is_frozen` (openbor.c 1424-1425) tests `self->frozen` and `self->freezetime`, not the entity argument `e`. The two agree only when the call is on the current entity. Do not copy the test; check the argument.
- Freeze is one unit per logic step (openbor.h 1840), and it is applied to every timestamp field together. A Frankendom hit-stop must freeze only the attacker's and target's windup and recovery timers, not the world clock.
- The catch-up cap of 100 units (openbor.c 51535) drops time when the display falls behind. A server tick must not drop ticks silently; if it adopts the cap, it must report the drop (row 18).
- Units: the clock unit is not converted to milliseconds in this donor's source (the timer body is missing). Frankendom must fix one unit (ticks) in the catalogue before the factor becomes data.
- Frame events (spawn, summon, child spawn, flip, weapon) run from the same `update_frame` step. The bodies of `ent_spawn_ent`, `ent_summon_ent` and the child-spawn list were not read, so this note does not describe them. Frankendom's hit and spawn events must come from the server engine, not from a client animation callback.
- Sub-entity placement (x, y, z and a placement value, openbor.c 20728-20731) is an animation-timed spawn at an offset. It is a rough analogue of an attachment point, but the placement value's meaning was not read, so no rig claim is made from it.
