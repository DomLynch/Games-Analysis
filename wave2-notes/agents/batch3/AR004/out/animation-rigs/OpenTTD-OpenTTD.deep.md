# OpenTTD-OpenTTD (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/animated_tile.cpp` | Licence: GPL-2.0 (file headers: "free software ... under the terms of the GNU General Public License ... version 2"; no "or later" stated) | C++ | symbol `AnimateAnimatedTiles`

Checked: `AnimateAnimatedTiles`, `AddAnimatedTile`, `DeleteAnimatedTile` (animated_tile.cpp 19-109, read in full); `AnimationBase::AnimateTile` and `ChangeAnimationFrame` (newgrf_animation_base.h 21-151, read in full); `AnimateTile_Industry` and the per-industry steps (industry_cmd.cpp 555-745, read in full, including the mine tower 663-693); animated_tile_map.h (state bits, read in full); tile_cmd.h 268-279 (dispatch); timer_game_tick.cpp 50-60 and timer_game_tick.h 60 (tick counter); openttd.cpp 1240-1256 (the loop that calls them). Not read: the sound helpers, the body of `Chance16` (random_func.hpp 143), `MarkTileDirtyByTile`, the industry animation spec tables, the trigger sites beyond newgrf_industrytiles.cpp 282, and what the industry does after construction stage 3 (only the set call, 654). Structure check: this is a tile-sprite game; there is no skeleton, bone, skin, blend, IK, ragdoll, retarget or attachment code for animation (grep for those terms was not run per file; the list is what the tile code uses). Camera: not a camera cell. Confidence: high on the list and the frame step; high on the speed gate and play-once clips; medium on the mine-tower phase (read as written, not run). Depth: full for the cadence and list mechanics.

Best transferable idea: ambient loops keyed off the shared game tick (a speed gate and phase windows, no per-prop timer to save), plus an active list that drops finished props lazily and cancels a pending drop when a prop is re-triggered.
Decision (proposed): adapt - take the tick-gated cadence and the lazy active list for zone props and ambient loops (client cosmetics), change the phase to the server tick so every player sees the same flicker, and leave out the NewGRF callback API and the sound and gameplay side effects.
Acceptance: Two players standing at the same zone brazier see its flicker in the same phase, and it stays in phase after a reconnect (phase read from the server tick); a one-shot prop (say a spark burst) is absent from the client's active list on the tick after it ends, and re-triggering it before that tick leaves one entry, not two.

Parity note: no parity row 1-23 covers zone props or ambient loops. Row 23 is zone population (spawns), not props. Row 7 (creature actor/clips) is the nearest, used here for the cadence rule only; this is a plain gap, not a fit.

## 1. Mechanism

- Only listed tiles animate. `_animated_tiles` is a vector (animated_tile.cpp 19-20). Each tile carries a two-bit state in its map byte: None (0), Deleted (1), Animated (3) (animated_tile_map.h 19-23, 42).
- Add. `AddAnimatedTile` (56-70) returns at once if the tile is already Animated (63). A None tile is pushed onto the list (67). Then it is set to Animated (69). A Deleted tile is still in the list, so it is only set back to Animated, which cancels the pending removal.
- Delete (lazy). `DeleteAnimatedTile` without `immediate` (27-49) changes Animated to Deleted (48) and leaves the list alone. The list is cleaned on the next pass. (The immediate path, 29-44, removes at once by swapping in the last entry.)
- Pass. `AnimateAnimatedTiles` (75-101) is called from the game-loop body (openttd.cpp 1250; the enclosing function header was not read). For each entry not in state Animated it sets None and moves the last entry into the slot, then re-checks that slot (82-95). Otherwise it calls `AnimateTile(tile)` (98), which dispatches by tile type (tile_cmd.h 274-279).
- Speed gate. The NewGRF base reads speed from the spec (58) and may override it by a callback clamped to 0..16 (59-65). It returns unless `TimerGameTick::counter % (1ULL << animation_speed) == 0` (71). Speed 0 means every tick. The donor's comment says speed 0 is 30 ms (newgrf_animation_base.h 67-70, receipted); that is the donor's note, not a measured time.
- Frame step. If no callback set the frame, then: frame below the count goes up one (105-106); frame at the count and looping goes back to 0 (107-109); otherwise the tile is deleted and stays on its last frame (110-113). The callback result 0xFF deletes (85-86); 0xFE means no change so the normal step runs (89-91); any other value sets the frame (93-95). A changed frame marks the tile dirty (116-117).
- Triggers from gameplay. `ChangeAnimationFrame` (132-150) is called with a trigger value (for example newgrf_industrytiles.cpp 282). Result 0xFD does nothing; 0xFE adds the tile to the list (139); 0xFF deletes it (140); any other value sets the frame, and the tile joins the list only if the frame changed (142-143).
- Built-in industry loops (no NewGRF). `AnimateTile_Industry` (696-745) gates each kind on the shared tick: sieve every 2 ticks (707), toffee every 4 (711), bubble every 2 (715), sparks every 4 (719), toy factory every 2 (723), plastic fountain every 4 (730), oil well every 8 (736). Mine towers run every tick and gate inside (742).
- Play-once clips. The sieve steps frames 0..95 and at 96 resets to 0 and deletes (557, 566-570). Toffee stops after 70 (583-587), bubble after 40 (596-600), sparks at frame 6 (608-613). Each stops by deleting itself.
- Nested loop. Toy factory steps frames 0..49 (619, 626). At 50 it wraps to 0 and increments a loop counter (627-628). At 8 loops it deletes (629-632).
- Chance at the cycle end. Oil well steps frames 0..3 (651-657). It rolls `Chance16(1, 7)` on each call (650); read as a 1-in-7 roll, body of `Chance16` not read. When the frame wraps past its last graphic, the roll decides: if it hits, the graphic is set to not animated, the construction stage is set to 3 (654), and the tile is deleted (652-655). Otherwise it loops.
- Stateless phase cycle. The mine tower reads `TimerGameTick::counter & 0x7FF` (665), a 2048-tick period, and stores no timer. Local time is the position in the period minus 1024 (667). Up window: local 0-415. It steps every 8 ticks near the edges (local below 32 or at least 384) and every 4 in the middle (669-679). Each up step sets bit 0x40 and raises the frame; a value above 0xC2 is set to 0xC0 (680-681). Down window: local 512-927. It steps every 8 ticks below 544 or at 896 and above, else every 4 (684-685). Each down step clears bit 0x40, lowers the frame and wraps below 0x80 to 0x82 (688-689). Every mine tower reads the same phase, so towers stay in step with each other; each tile's frame byte still depends on its own history.
- Clock. `TimerGameTick::counter` is a monotonic 64-bit count (timer_game_tick.h 60), incremented in `Elapsed` (timer_game_tick.cpp 51-53). The game-loop body calls `Elapsed(1)` (openttd.cpp 1255; enclosing function not read). Whether the counter is saved with the game was not read.

## 2. Key functions

- `AnimateAnimatedTiles` (animated_tile.cpp 75-101): the per-loop pass with lazy removal.
- `AddAnimatedTile` and `DeleteAnimatedTile` (56-70, 27-49): state moves between None, Animated and Deleted.
- `AnimationBase::AnimateTile` (newgrf_animation_base.h 53-118): speed gate, callback, frame step, loop or delete.
- `AnimationBase::ChangeAnimationFrame` (132-150): trigger path.
- `AnimateTile_Industry` (industry_cmd.cpp 696-745): per-kind speed gates.
- `AnimateSugarSieve` through `AnimateOilWell` (555-661): play-once, nested loop and chance-at-end steps.
- `AnimateMineTower` (663-693): the stateless two-window cycle.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Speed gate: step only when the shared tick is a multiple of 2^speed | Speed 0-16 per spec (theirs, newgrf_animation_base.h 58-65, 71); 2 ticks, 4 ticks, 8 ticks in the built-in loops (theirs, industry_cmd.cpp 707, 711, 736) |
| Play-once clip that deletes itself at the end | Sieve 96 frames (theirs, 566); toffee 70 (583); bubble 40 (596); sparks frame 6 (608) |
| Nested loop with a counter | Toy factory 50 frames x 8 loops (theirs, 626, 629) |
| Chance decided at the cycle end, not per step | 1 in 7 (theirs, 650) |
| Stateless phase window keyed to the shared tick | 2048-tick period; window starts at 1024 (theirs, 665-667); edge steps every 8 ticks, middle every 4 (theirs, 670-685) |
| Lazy active list with cancel-on-re-add | Two-bit state (theirs, animated_tile_map.h 21-22) |

## 4. TypeScript sketch

simplified: keeps the active list (lazy delete, cancel on re-add, swap-with-last removal), the speed gate on the shared tick, the callback result (none, delete, set frame), the loop-or-stop step at the end of a clip, and the stateless mine-tower window as step decisions. It omits the NewGRF callback plumbing, sound, dirty marking, the immediate-delete path, the per-industry sprite switches, the construction-stage side effect of the oil well, Chance16, the mine tower's bit-0x40 start flag and its frame values. It keeps the donor order for the list pass, but uses an index loop instead of an iterator. The mine tower returns a step decision, not the frame byte.

```ts
// Licence: GPL-2.0 (donor, "version 2" in the file header; no "or later" stated). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type TileState = "none" | "deleted" | "animated";
interface Tile { id: number; state: TileState; frame: number; }

const animated: Tile[] = [];

// Lazy removal: a delete only marks the tile; the next loop drops it. Re-adding a marked tile cancels the delete.
export function addAnimated(t: Tile): void {
  if (t.state === "animated") return;
  if (t.state === "none") animated.push(t); // "deleted" tiles are still in the list
  t.state = "animated";
}

export function deleteAnimated(t: Tile): void {
  if (t.state === "animated") t.state = "deleted";
}

// One pass per game loop. Dropped entries are replaced by the last entry (no shifting).
export function animateAll(step: (t: Tile) => void): void {
  let i = 0;
  while (i < animated.length) {
    const t = animated[i];
    if (t.state !== "animated") {
      t.state = "none";
      animated[i] = animated[animated.length - 1];
      animated.pop();
      continue; // re-check the entry that was moved into this slot
    }
    step(t);
    i++;
  }
}

// Speed gate on the shared game tick: advances when counter is a multiple of 2^speed (speed 0 = every tick).
export function speedGate(counter: number, speed: number): boolean {
  return counter % 2 ** speed === 0;
}

export interface AnimSpec { frames: number; looping: boolean; }
// Result of a callback or trigger: keep the normal step, delete the animation, or set the frame.
export type CbResult = { kind: "none" } | { kind: "delete" } | { kind: "frame"; frame: number };

// One frame step. The end of a non-looping clip removes the tile from the list.
export function stepFrame(t: Tile, spec: AnimSpec, cb: CbResult): void {
  if (cb.kind === "delete") { deleteAnimated(t); return; }
  if (cb.kind === "frame") { t.frame = cb.frame; return; }
  if (t.frame < spec.frames) t.frame++;
  else if (t.frame === spec.frames && spec.looping) t.frame = 0;
  else deleteAnimated(t);
}

// Stateless phase cycle keyed to the shared tick: a 2048-tick period; the animation runs in its upper half.
// Inside the window it steps every 8 ticks at the edges and every 4 ticks in the middle.
export function mineTowerDue(counter: number): { dir: "up" | "down"; step: boolean } | null {
  const local = (counter & 0x7ff) - 0x400;
  if (local < 0) return null;
  if (local < 0x1a0) {
    const mask = local < 0x20 || local >= 0x180 ? 7 : 3;
    return { dir: "up", step: (local & mask) === 0 };
  }
  if (local >= 0x200 && local < 0x3a0) {
    const mask = local < 0x220 || local >= 0x380 ? 7 : 3;
    return { dir: "down", step: (local & mask) === 0 };
  }
  return null;
}
```

## 5. Lands in

- TARGET `origins/client/zone-props.ts` for prop and ambient-loop presentation (proposed path; not located in the Frankendom repo in this pass). Client only: it reads the server tick and never writes game state.
- Parity-checklist row: none of 1-23 fits zone props or ambient loops. Row 7 is cited as the nearest for the cadence rule; row 23 covers spawns, not props.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine, two clients: the server tick is the clock; the client only draws); rules 7-9 n/a

## 6. Gaps and risks

- Phase must come from the server tick, not from the render clock or a per-prop timer. Otherwise two players see different flicker, and a reconnect resets it. The acceptance test above is the check.
- The donor counts ticks in a 64-bit monotonic counter. Whether the donor saves it was not read. If a loop's phase must survive a reload, Frankendom's server tick must be saved; otherwise ambient phase jumps after a reload.
- Speed is per prop (0-16 as a power of two of the tick). Keep it as catalogue data with a range check; the donor clamps it in the base (line 63).
- Sound is driven by frame numbers (toffee 0xFF sound check, 579-581). Frankendom's sound cues are client-only (row 12). Map them there, not in the loop.
- The oil well's stop changes the industry's construction stage (654). That is a gameplay side effect inside a visual loop. Frankendom must keep state changes out of the client cosmetic loop; a prop that changes state must go through the engine.
- No skeleton, blend, IK, ragdoll, retarget or attachment. This donor does not help the hero or creature rig (rows 6 and 7 proper).
- The NewGRF callback API (`CallbackID`, spec-driven) is a modding interface. Do not expose it; keep speed and frame count as data fields.
- Not read: `Chance16`'s body (so the 1-in-7 reading is an inference from the call and the argument order), the sound helpers, `MarkTileDirtyByTile`, the industry spec tables, the trigger sites beyond one, and what the industry does after stage 3.
