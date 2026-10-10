# freeciv-freeciv (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` | Licence: GPL-2.0-or-later (`mapview_common.c` header: "either version 2, or (at your option) any later version"; `COPYING` is GPL v2) | C | symbol `decrease_unit_hp_smooth` (battle HP presentation queue: `battle_animation`, `update_animation`, `animation_add`)

Checked: Read end to end: the animation queue (mapview_common.c 128-242), movement_animation (247-284), battle_animation (289-345), update_animation (441-483), decrease_unit_hp_smooth (2529-2665, both the frame-by-frame queued path and the blocking fallback), the movement queue entry (2692-2745, the queued branch 2717-2733 and the timer branch only skimmed). Callers: `decrease_unit_hp_smooth` has one caller, packhand.c 611-612 (grep); `update_animation` is called only from the GTK tick sites: gui-gtk-3.22/mapview.c 431, gui-gtk-4.0/gui_main.c 2425 (read, inside the frame-clock callback 2420-2427), gui-gtk-5.0/gui_main.c 2482. `set_frame_by_frame_animation` is called only from the GTK backends (gtk-3.22 1726, gtk-4.0 1701, gtk-5.0 1702), so SDL2, SDL3 and Qt clients take the blocking fallback. Not read: `timer_read_seconds` and `timer_renew` (common timing code), `unit_virtual_create` and `unit_virtual_destroy`, `put_unit`, `explosion_animation` (350-400) and `nuke_animation` (402-438), the GTK 3.22 and 5.0 tick sites beyond the one call each. Confidence: high on the battle HP ticks and the queue order; moderate on how the real HP is finally written (not read). Depth: full for the hit presentation mechanism; explosion and nuke not read. camera_scope: n/a.

Best transferable idea: Present a hit as a queued HP drain on copies of the two units, computed from the start and end HP the authority already sent, so the presentation never writes the ledger and the drain takes a fixed number of ticks.
Decision (proposed): adapt - the head-only queue, the presentation over authority and the integer tick drain are the shape the Pit needs for hit display, especially with up to three attackers on one defender; the wall-clock timing and the blocking fallback that writes real HP are rejected.
Acceptance: In a Pit fight with three attackers, each hit plays as a queued drain on a copy of the defender (tick 10 ms, tick count max(defender HP before, damage dealt)), the server's final HP is already the ledger value, the second hit waits for the first, and a test asserts the drawn HP sequence never rises and the kill is applied once from the server's record.

## 1. Mechanism

- The queue. `animations` is one FIFO list of `struct animation` with four kinds: movement, battle, explosion, nuke (mapview_common.c 130-176). Only the head runs. `update_animation` takes index 0 (444); when the head is marked finished it is removed on the next call, and if items remain the shared `anim_timer` is renewed so the next item's clock starts when it becomes the head (446-459). `animation_add` starts the timer only when the list was empty (233-236), then marks the item not finished and appends it (239-241).
- Clock. Each update passes `time_gone = timer_read_seconds(anim_timer)` (461) to the head's progress function. The progress is a function of elapsed wall time, not of a frame count. The timer's implementation was not read.
- Battle setup (2529-2595, frame-by-frame branch). The losing unit is `punit0` if its end HP `hp0` is 0, otherwise `punit1` (2532). The function first raises the real units' HP to at least their end values (2540-2541), then creates two virtual copies (2565, 2572). The loser copy starts at the loser's current HP (2570) and ends at its end HP (2571). The winner copy starts at `MAX(winner hp, winner end)` (2577) and ends at its end HP (2578). The tick count is `steps = MAX(losing_unit->hp, winner_start - winner_end)` (2579-2580): the larger of the loser's HP before the hit and the damage the winner took. The battle item is queued (2583). If the loser's end HP is 0 or less, an explosion item is queued after it (2585-2595).
- Battle progress (289-345). The total time is `steps * smooth_combat_step_msec / 1000` (294-295). At or after that time the function destroys both copies and reports finished, without drawing (297-304). Before it, `time_per_step = timing / steps` (306) and `step = (int) (time_gone / time_per_step)` (307). Each copy's HP is `start - ((start - end) * step / steps)` in integer arithmetic (310-313 for the loser, 329-331 for the winner), and the copy is drawn at its tile (309-325, 327-342). So the HP falls in whole ticks and the last drawn tick is `steps - 1`. Worked from the formula (not run): loser 10 HP to 0 with 10 steps draws 1 HP last, then the explosion item runs.
- Real HP is not drained by the queued path. The drain uses copies; this function leaves the real HP alone (its only write is the raise at 2540-2541) and redraws the real units at the end (2662-2664). Where the real HP is finally written was not read.
- Blocking fallback (2596-2659, when frame mode is off). A loop reduces the real units' HP one point at a time (2600-2611). It picks the loser with probability `diff0 / (diff0 + diff1)` using `fc_rand` (2605), redraws, and sleeps `smooth_combat_step_msec` per point (2616-2617). The loop blocks the thread and writes real HP. Frame mode is `FALSE` by default (78) and is switched on only by the GTK backends (4081).
- Movement (247-284). `timing = smooth_move_unit_msec / 1000` (251). `mytime = MIN(time_gone, timing)` (252). The mover's canvas position is `start + delta * (mytime / timing)` (261-262). At or after the timing it has drawn the destination, destroys the virtual mover and finishes (273-277). The queued movement is added at 2717-2733 with a virtual mover whose HP copies the unit (2725).
- Option defaults: movement 30 ms per tile (options.c 122), combat step 10 ms (options.c 124). Packet handler: if the step is above 0, the smooth path runs (packhand.c 611-612).

## 2. Key functions

- `battle_animation`: `/mnt/frankendom-donors/freeciv-freeciv/client/mapview_common.c` 289-345 (tick interpolation over copies; no draw at the end).
- `update_animation`: same file 441-483 (head-only dispatch, next-item timer renew).
- `animation_add`: same file 233-242 (timer starts on an empty queue).
- `decrease_unit_hp_smooth`: same file 2529-2665 (setup of the copies and tick count; queued path and blocking fallback).
- `movement_animation`: same file 247-284 (clamped linear slide).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One item at a time; each clock starts when the item becomes the head | none (queue shape, 441-459) |
| Presentation over authority: copies carry the animated numbers, the authority's end values are the targets | copies at 2565 and 2572; end values at 2571 and 2578 |
| Integer tick drain: value = start - (start - end) * floor(t / tick) / steps | tick 10 ms (options.c 124), integer division (311-313) |
| Tick count = max(loser HP, winner damage) | 2579-2580 (rule) |
| Last tick not drawn; finish returns before drawing | 297-303 |
| Death follows the HP drain: explosion queued when the loser's end HP is 0 or less | 2585 |
| Move slide clamped to its time | 30 ms per tile (options.c 122), 251-252 |

## 4. TypeScript sketch

simplified: the sketch keeps the head-only queue, the tick drain over copies, the tick count rule and the pure draw functions. It draws the final value once at the end (the donor draws the final movement position but nothing on the last battle call), and it removes a finished head in the same tick (the donor removes it on the next tick). It omits the explosion and nuke items, the virtual unit creation and destruction, canvas coordinates, isometric offsets, dirty rectangles, the blocking fallback, and the real-HP writes. Timing values are arguments, not constants.

```ts
// Licence: GPL-2.0-or-later (donor mapview_common.c header: "either version 2, or (at your option) any later version").
// clean-room: shape only, written from the described mechanism, not a translation of the donor lines.
interface HpTickBattle {
  loserStart: number;  // HP shown on a copy of the loser at the start of the hit
  loserEnd: number;    // HP the hit ends on (already decided by the authority)
  winnerStart: number; // HP shown on a copy of the winner (never below its end value)
  winnerEnd: number;
  steps: number;       // tick count, see battleSteps
  stepS: number;       // seconds per tick
}

// Donor rule: the tick count is the larger of the loser's HP and the damage the winner took.
function battleSteps(loserHp: number, winnerStart: number, winnerEnd: number): number {
  return Math.max(loserHp, winnerStart - winnerEnd);
}

// Pure: the values to draw at this elapsed time. Never writes game state.
// Returns null once the hit is over (the donor returns before drawing the final tick).
function battleDraw(b: HpTickBattle, elapsedS: number): { loserHp: number; winnerHp: number } | null {
  const total = b.steps * b.stepS;
  if (elapsedS >= total) return null;
  const step = Math.floor(elapsedS / b.stepS); // at most steps - 1
  return {
    loserHp: b.loserStart - Math.trunc(((b.loserStart - b.loserEnd) * step) / b.steps),
    winnerHp: b.winnerStart - Math.trunc(((b.winnerStart - b.winnerEnd) * step) / b.steps),
  };
}

// Pure: a movement drawn as a linear slide over a fixed time, clamped to the end point.
function moveDraw(fromX: number, fromY: number, dx: number, dy: number, durS: number, elapsedS: number): { x: number; y: number } {
  const t = Math.min(elapsedS, durS);
  return { x: fromX + dx * (t / durS), y: fromY + dy * (t / durS) };
}

interface Presentation {
  durationS: number;
  draw(elapsedS: number): void;
}

// One head at a time. The head's clock starts when it becomes the head.
class PresentationQueue {
  private items: Presentation[] = [];
  private elapsed = 0;

  push(p: Presentation): void {
    this.items.push(p);
  }

  // Called once per display frame with the wall-clock delta.
  tick(dtS: number): void {
    const head = this.items[0];
    if (head === undefined) return;
    this.elapsed += dtS;
    if (this.elapsed < head.durationS) {
      head.draw(this.elapsed);
      return;
    }
    head.draw(head.durationS);
    this.items.shift();
    this.elapsed = 0;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit-presentation.ts` (new, client presentation only): turns the server's hit record (start and end HP of attacker and defender) into a queued HP drain on copies; the ledger is never written from here. Parity-checklist row 10 (hit impact / hitstop). Rows 6 and 7 are about actor clips and do not fit this (the HP drain is a hit display, not a clip); row 10 is the closest row.
- today: the Frankendom hit display was not read in this pass.
- Reuse tag: adapt (GPL-2.0-or-later: clean-room only; shape, not code)
- Brief rule served: 1 (one engine; the Pit is a client that draws the engine's result, and kills are server-verified)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and nothing from the donor C is to be copied.
- Wall-clock timing. The donor's head clock is `timer_read_seconds` (461), so a slow frame changes what is drawn. Frankendom's fight record and replay (row 19) need identical frames from the same record, so the presentation clock must come from the record or a fixed replay step, and the queue must stay out of the ledger.
- Writing real HP from the presentation. The blocking fallback decrements real HP (2606, 2609). Reject: the Pit client must never write HP. Only the authority's HP applies.
- Death from a number. The donor queues an explosion when the loser's end HP is 0 or less (2585). Frankendom kills are server-verified, so the death presentation should key on the server's kill record, not on a HP value the client infers.
- The last tick is not drawn. A 10-HP defender shows 1 HP before its explosion (worked from the formula, not run). The Pit acceptance above needs a decision on whether the final value is shown.
- Queue depth. Up to three attackers can each queue a hit on one defender (MAX_ATTACKERS = 3). The donor queues each hit as a full item with no merging (2583), so three hits take the sum of their durations. Frankendom needs a cap or a merge rule, and the total time must stay short enough for fast duels.
- Not read: `timer_read_seconds`, `timer_renew`, `unit_virtual_create` and `unit_virtual_destroy`, `put_unit`, `explosion_animation` (350-400), `nuke_animation` (402-438), where the real HP is finally written after the queued animation, and the GTK 3.22 and 5.0 tick sites beyond their one call each.
