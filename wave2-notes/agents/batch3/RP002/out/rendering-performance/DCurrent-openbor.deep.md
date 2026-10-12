# DCurrent-openbor (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/spriteq.c` (symbols `spriteq_draw` 300, `spriteq_sort` 236, `spriteq_lock` 346, `spriteq_clear` 364; caller in `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c`) | Licence: BSD 3-clause as read (`/mnt/frankendom-donors/DCurrent-openbor/LICENSE`: "Redistribution and use in source and binary forms, with or without modification" plus the non-endorsement clause; permissive, code may be adapted with the notice kept) | C | symbol `spriteq_draw`

Checked: the list hint `engine/sdl/loadgl.c` is the GL function loader (275 lines). Grep for batch, cull, atlas, fps and LOD terms in it found nothing; it is the wrong file for this topic. Read: `engine/source/gamelib/spriteq.c` in full (386 lines); `engine/source/gamelib/sprite.c` 636-700 (blit dispatch and tiled repeats); `engine/openbor.c` 25522-25575 (pause freeze and lock), 51467-51490 (update entry), 51683-51720 (per-frame draw and wait), 25636-25656 (getFPS), 51761-51818 (fade loop); `engine/sdl/video.c` 220-345 (present, FramerateDelay, vga_vwait); `LICENSE` lines 1-5. Candidate files opened: 6 (loadgl.c, spriteq.c, sprite.c, openbor.c, video.c, LICENSE). Confidence: high on the sprite queue (read end to end); high on the vga_vwait timing defect (derived from the code and checked with a small model, see section 6); medium on the pause loop body (not read). Not read: the blit routines `putsprite_8`, `putsprite_x8p16` and `putsprite_x8p32` (clipping and any culling live there), `opengl.c` draw path (any GL batching), the sprite loader. Grep found no atlas or instancing code. Camera scope: not a camera cell.

Best transferable idea: Freeze the scene into one base layer while a menu is open (pause = one queued screen sprite kept across frames), and keep draw order as explicit (z, sortid, insertion) keys with a z-band filter so a caller can draw one depth band at a time.
Decision (proposed): adapt - keep the frozen base layer and the z-band draw; drop the in-place selection sort and the silent drop; use a stable sort and count drops.
Acceptance: Opening the pause menu during a three-attacker fight shows the same frozen frame with no sprite redrawn beneath it, and a client test asserts that two items with equal z and sortid keep insertion order and that a full queue reports a drop count instead of dropping silently.

## 1. Mechanism

- Queue. During a frame, code calls `spriteq_add_*` once per drawn thing. `spriteq_add_frame` (63) and `spriteq_add_sprite` (92) write x, y, z, sortid, the frame, a draw method and two or three parameters into `queue[n]`, then set `order[n] = &queue[n]` (88). The order array therefore starts each frame in insertion order. When the queue holds `MAXQSPRITES` (5000) entries, the add returns with no report (69).
- Frame flow. Once per frame `update()` calls `spriteq_draw(vscreen, 0, MIN_INT, MAX_INT, 0, 0)` (openbor.c 51683), then `spriteq_clear()`. `spriteq_draw` sorts first (304), then walks `order` (307-326): it skips items with `newonly` and locked, and items whose z is outside `[minz, maxz]` (308); it adds dx and dy; then it dispatches by type: sprite to `putsprite` (325), screen to `putscreen`, dot, line and box to their primitives.
- Sort. `spriteq_sort` (236-297) is a two-ended selection pass. Each pass scans the live range `[start, end]` for the lowest and highest keys (z, then sortid), swaps them to the two ends, then shrinks the range by one at each end. It returns early when the lowest and highest keys are equal (272), which means the rest of the range shares one key. Equal keys are not kept in insertion order.
- Lock. `spriteq_lock` (346) stores the current length as `spriteq_old_len` and sets `spriteq_locked = 1` (349). While locked, `spriteq_clear` (364) sets the length back to `spriteq_old_len` (371) and points `order[]` at the first entries again, so only entries added after the lock are dropped each frame. Unlock (354) only clears the flag.
- Pause use. `pausemenu` (openbor.c 25567-25572) copies the screen into a buffer, draws the queue into it, clears the queue, adds the buffer as one screen item at `MIN_INT` (lowest z), and locks. `backto_mainmenu` does the same (25529-25532). The lock is released at the end (25635). So the frozen frame is the base, and the menu's own sprites are added on top each frame.
- Blit. Each queued sprite is one `putsprite` call (sprite.c 659 onward, the repeat loops end at 683). A tiled sprite with `xrepeat` and `yrepeat` makes `xrepeat x yrepeat` calls to `_putsprite` (682). `_putsprite` (636) dispatches by pixel depth; for 8-bit surfaces without a draw method it calls `putsprite_8` (643). Nothing in the queue culls by screen position; whether the blit routines clip is (not read).

## 2. Key functions

- `spriteq_add_frame`, `/mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/spriteq.c` 63-90 (insertion, silent cap at 69).
- `spriteq_add_sprite`, same file 92-124 (lazy sprite load on first use, then the same insertion path).
- `spriteq_sort`, same file 236-297 (two-ended selection on (z, sortid); early return at 272).
- `spriteq_draw`, same file 300-334 (sort, z-band filter at 308, dispatch by type).
- `spriteq_lock` and `spriteq_clear`, same file 346-350 and 364-386 (base layer kept across clears at 371).
- Pause freeze, `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 25522-25532 (`backto_mainmenu`) and 25567-25572 (`pausemenu`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Capped per-frame queue; add past the cap is dropped | Cap 5000 (theirs, spriteq.c 20); the drop is silent (69) |
| Draw order by (depth, sortid), insertion order as the array start | Keys are supplied by the caller; no constants in the queue |
| Draw one depth band `[minz, maxz]` | Full range in the frame draw (openbor.c 51683); base layer at `MIN_INT` (openbor.c 25531) |
| Lock: keep the first N entries across clears | N = queue length at lock time (theirs, spriteq.c 346-349) |
| One blit per queued item; tiled repeats multiply the count | `xrepeat x yrepeat` per sprite (sprite.c 682) |

Draw-call count per frame is the number of queued items plus each tiled sprite's repeats. There is no batching of same-texture items.

Order of operations in one frame, as the code runs: add all items (insertion order), sort (two-ended selection), walk and blit, clear (locked: keep the base; unlocked: reset to zero).

## 4. TypeScript sketch

simplified: keeps the donor's rules: a capped add that counts the drops (the donor drops silently), order by z then sortid then insertion, a z-band filter on draw, and a lock that keeps the first N items across clear. It replaces the donor's in-place two-ended selection sort with a stable comparator sort (a reorder of how equal keys are kept; the donor's early return is implied). It drops the item types (dot, line, box, screen), the per-item draw method, the centre re-set and the `newonly` flag, and it does not model the blit or the repeat count.

```ts
// Licence: BSD-3-Clause (donor, permissive). Clean-room sketch of the queue rules: capped add with counted drops, order by z then sortid then insertion, z-band draw, and a locked base layer kept across clear.
// clean-room
interface Item { z: number; sortid: number; seq: number; draw: () => void }

const QUEUE_CAP = 5000; // donor MAXQSPRITES; the donor drops silently when full, this sketch counts the drops

class SpriteQueue {
  private items: Item[] = [];
  private locked = false;
  private frozenLen = 0;   // items [0, frozenLen) are the locked base layer
  dropped = 0;             // clamp-and-report: how many adds did not fit this frame

  add(z: number, sortid: number, draw: () => void): void {
    if (this.items.length >= QUEUE_CAP) { this.dropped++; return; }
    this.items.push({ z, sortid, seq: this.items.length, draw });
  }

  // Freeze what is queued now as the base layer; later clear() calls keep it.
  lock(): void {
    this.frozenLen = this.items.length;
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
  }

  // Per frame: a locked queue keeps its base layer and drops only the new items.
  clear(): void {
    this.items.length = this.locked ? this.frozenLen : 0;
  }

  // Draw in (z, sortid, insertion) order, skipping items outside the z band [minZ, maxZ].
  draw(minZ: number, maxZ: number): void {
    const order = this.items.slice().sort((a, b) => a.z - b.z || a.sortid - b.sortid || a.seq - b.seq);
    for (const it of order) {
      if (it.z < minZ || it.z > maxZ) continue;
      it.draw();
    }
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 rp002-openbor-sprite-queue.ts` on the VPS (with `export {};` appended), exit 0.

## 5. Lands in

- TARGET `origins/client/render/sprite-queue.ts` (proposed path; not checked against the repo; the queue is client presentation, so it is not `src/fight`). The engine never reads the queue.
- Parity-checklist row 16 (colour grade/quality). The list hint said row 12, but row 12 in the addendum is combat sound cues. No row 1-23 is a render-budget row, so 16 is the closest; flagged for Strategy.
- Reuse tag: rewrite-from-idea (BSD 3-clause; the sketch is clean-room)
- Brief rule served: licence rule (permissive: adaptable with notice kept). Row 16 render cost. The one-engine rule does not bind a client render path.

## 6. Gaps and risks

- Sort cost (derived from the loop, not timed): the selection pass scans the live range once per pair of items, so n items cost about n²/4 comparisons. At the 5000 cap that is about 6.25 million compares per frame in the worst case. Fix: a stable sort (or sort by z buckets, then sortid, then seq). The sketch does this.
- Stability (defect): equal keys can leave insertion order, so two sprites on the same z and sortid can swap draw order. Fix: add `seq` as the last key. The sketch does this.
- Silent drop at the cap (spriteq.c 69): sprites vanish with no count. Fix: count the drops and report them in dev builds. Text is also sprites (comment at spriteq.c 17-18), so a busy HUD can use up the cap. Fix: the sketch counts drops.
- Frozen layer cost: the pause keeps one full-screen blit per frame (the saving is the world's sprite work, not the blit). A browser version can take one bitmap snapshot and draw it per frame.
- Multiplayer risk: the pause freezes the picture, not the server. If the server keeps ticking during a pause, the frozen frame shows stale state. Frankendom must show a "server still running" state or refuse pause in multiplayer; kills stay server-verified.
- Pause loop body not read: the claim that world sprites are not re-queued during pause is an inference from the queue being reset to the base each frame.
- No batching: each item is one blit, and tiled repeats multiply the count. Frankendom should count draws per frame at 375 wide; with MAX_ATTACKERS = 3 the count stays small, so the queue's cost is mostly HUD and text.
- No culling in the queue. Whether the blit routines clip is (not read).
- Secondary defects, outside the main mechanism (noted so they are not lost):
  - `vga_vwait` (sdl/video.c 333-344): the wait is `1000/60 - (now - prevtick)` (337), and `prevtick = now` (343) is stored before the sleep. Integer `1000/60` is 16 ms (62.5 Hz, not 60). Model, run inline on the Mac in python3 with integer ms and no file written, gave about 125 calls per second with no blit work, 105 with 3 ms of work, and 83 with 8 ms, against a target of 60. The model does not include SDL_Delay overshoot. Callers are the fade loop (openbor.c 51761, 51813), the animated GIF loop (52410), and two calls at 56243 and 56256 that I did not read in detail; none is the main game loop (51716 is gated by `usevwait`, which the main loop passes as 0). Fix: anchor on a deadline (`deadline += period`), use `1000.0 / 60`, and clamp catch-up.
  - `FramerateDelay` (sdl/video.c 232-247): `last_time = current_time` (246) anchors on the wake time, not the target, so each frame loses its oversleep and runs slightly under the cap. Fix: `last_time = target_time`, with a catch-up clamp. The idea is sound.
  - The vsync path (openbor.c 51474-51486) sleeps until 4 ms before the refresh, then reads input, to reduce input latency. This is a useful input-timing idea for fast duels (row 5); it is not part of the sprite queue and is not written up here.

Reuse tag: rewrite-from-idea (BSD 3-clause; clean-room sketch)
Brief rule served: licence rule (permissive); row 16 render cost; one-engine rule not applicable to client render.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN.
- Errors: none; all cited lines and the vga_vwait re-simulation verified.
- Missed: Unlocked spriteq_clear stores spriteq_old_len = length before zeroing (379), harmless, not noted.
