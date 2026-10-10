# freeciv-freeciv (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` (with `client/packhand.c`, `client/options.c`, `server/unittools.c` header only) | Licence: GPL-2.0-or-later (file header: "either version 2, or (at your option) any later version"; COPYING is GPL v2, June 1991) | C | symbols `decrease_unit_hp_smooth`, `battle_animation`, `explosion_animation`, `update_animation`

Checked: Read the client path end to end: `decrease_unit_hp_smooth` (client/mapview_common.c 2527-2661, both the queued branch and the immediate branch), the animation queue (235-246, 441-480), `battle_animation` (289-348), `explosion_animation` (350-399), the caller (client/packhand.c 596-614), the default step (client/options.c 124 and the old-option case 6400-6412). Server side: only the signature and call site of `unit_versus_unit` (server/unittools.c 293-300; server/unithand.c 5080 seen in grep); the combat maths inside `unit_versus_unit` was not read, so I do not describe how the server picks the final HP. Whether the queued or immediate branch runs depends on `set_frame_by_frame_animation` (client/mapview_common.c 4079), whose callers were not read. Candidate files opened: `data/granularity/effects.ruleset` (the hint file: game-rules effects, not visuals; read 1-15 and grep only), and grep over all C and header files for blood, gore, splatter, decal, particle, spark, shake, bleed and wound found no blood, decal, particle or screen-shake code (the only hits are map geometry, city text and AI flavour strings). Camera: not applicable.

Best transferable idea: Play the damage as a tween from the server's start HP to its end HP over a number of steps set by the larger HP change, and queue the death burst after it, so the on-screen numbers always land on the server's values.
Decision (proposed): adapt. Take the queued tween (both bars move over the same step count, the death burst waits for the drain to end, and the server's HP is the only source of numbers). Reject the random per-point interleave for Frankendom duels: it draws client-side randomness, so a replay shows a different sequence from the same server result, and the tween gives the same visual with no randomness.
Acceptance: A duel hit that takes a fighter from 30 to 0 while the attacker goes from 40 to 35 plays a 30-step bar drain at 10 ms per step (about 0.3 s, example numbers only), then the death burst on the fighter's tile, and the bars end on the packet's values. A server test asserts the damage packet carries start and end HP for both fighters and the kill flag.

## 1. Mechanism

- Trigger: the client packet handler reads `attacker_hp` and `defender_hp` from the server's combat packet (client/packhand.c 602). If the smooth step is above zero (611), it calls `decrease_unit_hp_smooth(punit0, hp0, punit1, hp1)` (612). If the step is zero, it sets the HP at once (the else branch, not read in full).
- The losing unit is the one whose end HP is 0 (client/mapview_common.c 2532, `losing_unit = (hp0 == 0 ? punit0 : punit1)`). Both units keep their start HP no lower than the packet's end HP (2540-2541).
- Queued branch (used only when `frame_by_frame_animation` is set, 2545; default FALSE at 78):
  - One `ANIM_BATTLE` is appended (2563). Steps = `MAX(losing_unit->hp, winner_start - winner_end)` (2579-2580). Both bars are interpolated over those steps: `hp = start - ((start - end) * step / steps)` with integer division (310-311 for the loser, 329 for the winner).
  - Timing: `timing_sec = step_msec x steps / 1000` (294), and each step lasts `timing_sec / steps`, which is `step_msec` milliseconds (306). The default step is 10 ms (options.c 124), so a 30-step drain takes about 0.3 s.
  - If the loser ends at 0 or below (2585), one `ANIM_EXPL` is appended after the battle (2587). Its frame time is `timing_sec / sprite_count` (363), which is also `step_msec` ms at the default. The frame index is clamped to the last sprite (368). The sprite count comes from the tileset (not read).
  - The queue (235-246, 441-480) runs one animation at a time: the head runs; when it finishes it is removed and the next one starts. So the death burst waits for the drain.
- Immediate branch (the `else` at 2596): no queue. While either unit is above its end HP, pick the unit to lose one point with `fc_rand(diff0 + diff1) < diff0` (2605), which gives the loser of each point a chance equal to its share of the remaining HP above end. Each point waits `step_msec` (the sleep at 2616-2617). After the loop, the explosion frames are drawn one by one, each held for `2 x step_msec` (the sleep at 2656).
- Timing: event-driven timer, not a fixed logic step. Each animation reads `timer_read_seconds(anim_timer)` and draws the frame for that time (update_animation 441-480).

## 2. Key functions

- `decrease_unit_hp_smooth`: `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` 2529-2661 (queued branch 2545-2599; immediate branch 2600-2660).
- `battle_animation`: `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` 289-348 (HP interpolation for both units).
- `explosion_animation`: `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` 350-399 (sprite frames over the step time).
- `update_animation` (queue): `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` 441-480; `animation_add` 233-241.
- Caller: `/mnt/frankendom-donors/freeciv-freeciv/client/packhand.c` 596-614.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Tween HP from start to end over N steps, N = larger HP change | Steps = MAX(loser HP, winner HP loss) (mapview_common.c 2579-2580); integer division in the interpolation (310-311, 329) |
| Step length, so the drain takes N x step time | 10 ms per step (options.c 124); 0 turns smoothing off (options.c 6407; packhand.c 611) |
| Death burst after the drain, one sprite per step | Frame time = step time (363); sprite count from the tileset (not read) |
| Immediate fallback: hold each frame for two steps | 2 x step (mapview_common.c 2657) |
| Random loser per HP point, weighted by remaining HP | `fc_rand(diff0 + diff1) < diff0` (2605); fc_rand range not read (assumed [0, n)) |
| Queue: one animation at a time, next starts when the last ends | No number (235-246, 446-457) |

## 4. TypeScript sketch

simplified: keeps the queued-branch order: the step count from the larger HP change, the interpolation of both bars over that count, and the death burst queued after the drain; plus the immediate-branch order as a pure function that takes an injected RNG. It returns a timeline of frames instead of drawing sprites, and it omits the animation queue and timers (the timeline stands in for them), the virtual unit drawing, the tile-to-canvas position and isometric offsets, the unit id link (`anim->id`), the set_units_in_combat flag, the movement and nuke animations, and the zero-step option (the caller picks the instant path). The donor's immediate branch redraws the map after each point; the sketch only returns the order.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1), stands in for the donor's fc_rand(n) (range not read)

interface Frame {
  atMs: number;
  loserHp: number;
  winnerHp: number;
  explosionFrame: number | null; // sprite index for the death burst, or null
}

// Donor decrease_unit_hp_smooth, frame-by-frame branch: one queued HP drain, then a death burst.
// Numbers are the server's start and end HP; nothing here changes the outcome.
export function queuedDrain(
  loserStart: number, loserEnd: number,
  winnerStart: number, winnerEnd: number,
  stepMs: number, spriteCount: number,
): { steps: number; drainMs: number; frames: Frame[] } {
  const steps = Math.max(loserStart, winnerStart - winnerEnd); // donor: steps = MAX(...)
  const drainMs = stepMs * steps;
  const frames: Frame[] = [];
  for (let s = 0; s < steps; s++) {
    // Donor: hp = start - (start - end) * step / steps, integer division.
    frames.push({
      atMs: s * stepMs,
      loserHp: loserStart - Math.floor(((loserStart - loserEnd) * s) / steps),
      winnerHp: winnerStart - Math.floor(((winnerStart - winnerEnd) * s) / steps),
      explosionFrame: null,
    });
  }
  if (loserEnd <= 0) {
    // Donor: death burst is queued after the drain; one sprite per step (10 ms at the default).
    for (let f = 0; f < spriteCount; f++) {
      frames.push({ atMs: drainMs + f * stepMs, loserHp: loserEnd, winnerHp: winnerEnd, explosionFrame: f });
    }
  }
  return { steps, drainMs, frames };
}

// Donor immediate branch (no queue): each step removes one HP from one side,
// the side chosen with probability proportional to its remaining HP above the end value.
export function immediateOrder(
  hp0Start: number, hp0End: number, hp1Start: number, hp1End: number, rng: Rng,
): Array<0 | 1> {
  let a = Math.max(hp0Start, hp0End); // donor: punit->hp = MAX(current, end)
  let b = Math.max(hp1Start, hp1End);
  const order: Array<0 | 1> = [];
  while (a > hp0End || b > hp1End) {
    const diff0 = a - hp0End;
    const diff1 = b - hp1End;
    if (Math.floor(rng() * (diff0 + diff1)) < diff0) {
      a -= 1;
      order.push(0);
    } else {
      b -= 1;
      order.push(1);
    }
  }
  return order;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/damage.ts`: the engine's damage result carries start and end HP for both fighters and the kill flag; the drain tween and the death burst are client-only and read those numbers. The tween module itself is client code (path not in my brief).
- Parity-checklist row 10 (hit impact / hitstop): the HP drain is the hit-impact timing. The death burst is the finisher tail and touches row 9, but this note takes row 10.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients): the server sets the numbers and the client plays them; rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor client trusts the packet's end HP. Frankendom's rule is the same (the server verifies kills), so the drain is safe as long as the client never recomputes HP.
- The step count is the larger HP change, so a long drain for a big hit is automatic. Frankendom should cap the drain (for example at a fixed maximum duration) if a big hit would otherwise hold up the next action.
- The donor has no hitstop: the attacker and defender do not pause. Any pause before the death burst is a Frankendom design call, not a port.
- The random interleave on the immediate branch is client randomness on top of server numbers. Reject it for duels: a replay would differ from the server's result for the same fight.
- The explosion sprite count comes from the tileset (not read). Frankendom needs a burst frame count as data, not a constant.
- The server's combat maths (`unit_versus_unit`, server/unittools.c 293 onward) was not read; I do not describe how the final HP is chosen.
- The donor's "frame by frame" switch decides which branch runs; the setter's callers were not read, so which branch players actually see is not verified.
- No blood, decal, gore or particle code exists in this donor (grep over C and header files). Only the HP drain and the explosion burst are visual combat effects here.
