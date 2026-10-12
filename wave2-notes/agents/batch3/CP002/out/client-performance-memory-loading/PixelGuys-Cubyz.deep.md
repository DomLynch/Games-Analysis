# PixelGuys-Cubyz (client-performance-memory-loading, cell 2)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/utils/heap.zig` (symbol `MemoryPool`, 575-657) | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Zig | symbol `MemoryPool`

Checked: Read `MemoryPool` (heap.zig 575-657) in full. Read the three pool call sites that create records: `Chunk.init` and `deinit` (chunk.zig 366-398), `ChunkMesh.init` and the mesh teardown (renderer/chunk_meshing.zig 500-512 and 544-550), and `ChannelChunk.init` and `deinit` (renderer/lighting.zig 48-66). Not read: the five server terrain pools (CaveMap, SurfaceMap and others, declared by grep only), `NeverFailingArenaAllocator` (arena semantics), `deferredDeinit` in lighting, and the name of the mesh teardown function. Confidence high on the pool's create/destroy/count order; medium on whether every caller follows the same reset rule (three of the callers read). Camera: not a camera cell. Also read but not sketched: the frame cap and the GC sync point (section 1).

## 1. Mechanism

- A generic fixed-size pool, `MemoryPool(Item)`. Items are the same size. Free items form a singly linked list whose link is stored inside the freed item's own memory (`Node` is one next pointer; `item_size` is the larger of `Node` and `Item`, 581).
- `create()` (619-630): take the mutex (620); if the free-list head exists, pop it; otherwise `allocNew()` (625), which bumps `totalAllocations` and `freeAllocations` (650) and takes memory from the pool's arena (652). Then `freeAllocations -= 1` (627) and the item is poisoned with `ptr.* = undefined` (629). The caller then writes the whole struct at the call site (`self.* = Chunk{...}`, chunk.zig 380).
- `destroy()` (635-646): take the mutex; poison the item (638); write the link into the item and push it onto the head of the free list (644); `freeAllocations += 1` (645).
- `deinit()` (609-616): if `freeAllocations != totalAllocations`, log an error with the leaked count (`total - free`) at 611; otherwise, if anything was allocated, log the MiB in use (613). Leaks show up at teardown only, not during play.
- Order of operations is the point: the counts change in step with the free list, so `total - free` is always the number of items in use. Nothing is ever returned to the OS while the pool lives (inferred from the arena use at 652; arena not read).
- Callers (read): `Chunk.init` takes a record at 376 and `Chunk.deinit` returns it at 394. `ChunkMesh.init` takes a record at 507 and `errdefer`-returns it at 508 if a later step fails; the teardown returns it at 548. `ChannelChunk.init` takes a record at lighting.zig 53; `deinit` returns it at 63 after `data.deferredDeinit()` (not read).
- Second mechanism in the same cell (read, not sketched): the main loop caps the frame. `sleep = min(P, max(0, P - measured cycle work))` (471-472, where P is `1e9 / fpsCap`). The measured work is from the previous frame's begin to this frame's render end. There is no schedule to catch up, so a late frame just gets a shorter sleep. On Windows, below a 20 ms period the loop busy-waits instead of sleeping (473-475). The FPS presets run 5 to 480 with "unlimited" last (graphics.zig 31-37); `fpsCap` defaults to null (settings.zig 23); vsync defaults to true (settings.zig 40). A minimised window sleeps 16 ms (main.zig 463).
- Third (read, not sketched): a deferred-free scheme for objects shared across threads. `deferredFree` appends the item to the calling thread's list for the current cycle (heap.zig 748). `syncPoint()` (733) compares the thread's cycle with the shared one; when they differ, the thread leaves the waiting set and frees its own list for the old cycle. The shared cycle advances when the last waiting thread has passed a sync point (`startNewCycle` and `removeThreadFromWaiting`, heap.zig 714-730). This is similar to quiescent-state reclamation. The main loop calls `syncPoint()` once per frame (main.zig 446).

## 2. Key functions

- `MemoryPool` (struct and methods): `/mnt/frankendom-donors/PixelGuys-Cubyz/src/utils/heap.zig` 575-657. The create/destroy/count logic is 619-646 and the leak report is 609-616.
- `Chunk.init` and `Chunk.deinit`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/chunk.zig` 376 and 394 (pool declared at 138).
- `ChunkMesh.init` and teardown: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer/chunk_meshing.zig` 507-508 and 548 (pool declared in `mesh_storage.zig` 69).
- `ChannelChunk.init` and `deinit`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/renderer/lighting.zig` 53 and 63 (pool declared at 17).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Free list of fixed-size items with total, free and in-use counts; leak check at teardown | Item size = max(pointer, item) (581); no capacity limit (the arena grows) |
| Recycle with a mutex around the list | Mutex (600) |
| Reset on release (poison), full re-init at the create site | `undefined` poison (638, 629); `Chunk{...}` init (chunk.zig 15) |
| Frame cap from measured work, not from a schedule | Period = 1e9 / cap (471); cap presets 5-480 and unlimited (graphics.zig 31); default off (settings.zig 23); busy-wait under 20 ms on Windows (473) |

## 4. TypeScript sketch

simplified: keeps the donor order (pop or make, count, return the item on destroy; in-use count = total - free) and the leak count. It omits the mutex (JavaScript runs one thread per worker, so a worker needs its own pool), the arena (the JS GC owns memory, and nothing is returned to the OS), the intrusive free list (JS uses an array), the poison step (replaced by a caller-supplied `reset`), the MiB log, and the alignment rules. It adds a `cap` that the donor does not have: `create()` returns undefined when in-use items reach the cap.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface PoolStats { total: number; free: number; live: number; }

interface Pool<T> {
  create(): T | undefined;   // undefined when the cap is reached
  destroy(item: T): void;
  stats(): PoolStats;
}

// Fixed-size object pool: create() takes a recycled item or makes a new one; destroy() puts it back.
// total - free is the number of items in use, which is the leak count the donor reports at deinit.
function makePool<T>(make: () => T, reset: (item: T) => void, cap: number): Pool<T> {
  const freeList: T[] = [];
  let totalAllocations = 0;
  let freeAllocations = 0;   // equals freeList.length
  return {
    create(): T | undefined {
      if (totalAllocations - freeAllocations >= cap) return undefined;   // added: cap (donor has none)
      let item: T;
      if (freeList.length > 0) {
        item = freeList.pop() as T;
      } else {
        item = make();
        totalAllocations++;
        freeAllocations++;
      }
      freeAllocations--;
      return item;
    },
    destroy(item: T): void {
      reset(item);
      freeList.push(item);
      freeAllocations++;
    },
    stats(): PoolStats {
      return { total: totalAllocations, free: freeAllocations, live: totalAllocations - freeAllocations };
    },
  };
}

// Usage sketch (not part of the donor): a pool for hit-feedback records (damage numbers, sparks).
const pool = makePool(() => ({ x: 0, y: 0, text: "" }), (r) => { r.x = 0; r.y = 0; r.text = ""; }, 64);
const rec = pool.create();
if (rec) { rec.text = "12"; pool.destroy(rec); }
console.log(pool.stats());
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended: exit 0, no output.

Best transferable idea: Recycle fixed-size combat-feedback records (damage numbers, sparks, hit records) through a free-list pool that counts total, free and in-use items, so a leak shows as a non-zero in-use count at teardown.

Decision (proposed): adapt — keep the pool with the in-use count and the teardown leak report; JS has no intrusive free list (use an array), and a cap is added because the donor's arena grows without limit.
Acceptance: A Vitest: after 10,000 spawn-and-despawn cycles of hit records in a scripted 3-attacker fight, the pool's total stays at its warm-up peak (64 or fewer), the in-use count returns to 0 after the fight, and a record that is never destroyed makes the test fail.

## 5. Lands in

- TARGET `origins/client/fx-pool.ts` (new; client only). The engine (`src/fight`) keeps the hit record and its numbers; the pool is presentation memory for the damage numbers and sparks.
- Parity-checklist row 10 (hit impact / hitstop): damage numbers and sparks are the hit-impact presentation.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (client only, one engine untouched); rule 8 (target file and row named); camera and Pit rules n/a.

## 6. Gaps and risks

- GPL-3.0 is copyleft: clean-room only. The sketch is written from the described steps.
- The donor's leak check runs only at teardown (`deinit`, 609-616), so a leak during play is silent. Frankendom should check the in-use count every N seconds, or on zone exit, and log it.
- The donor has no cap: the arena grows with the number of live records. The cap in the sketch is a Frankendom addition, and its value (64 is a proposal, not measured) must be set per record type on a phone.
- Reset rule: the donor poisons on destroy and re-initialises the whole struct at the create site (chunk.zig 15). The sketch's `reset` must clear every field that a later user could read, or a recycled damage number could show old text.
- Threads: Frankendom runs the engine in one thread; if a Worker ever owns records, each Worker needs its own pool, or records must be transferred, not shared. The donor's mutex does not carry over.
- Not read: the server-side pools (declared, use not read), arena semantics, `deferredDeinit`, and the mesh teardown function's name. The deferred-free scheme (section 1, third item) is the donor's answer to freeing shared objects safely; it is a candidate for a later note on shared buffers and is not sketched here.
