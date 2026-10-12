# wowserhq-wowser (client-performance-memory-loading, cell 39)

Donor: `/mnt/frankendom-donors/wowserhq-wowser/src/lib/game/world/doodad-manager.js` (with `game/world/map.js`, `lib/pipeline/m2/blueprint.js`, `lib/pipeline/m2/index.js`, `lib/pipeline/worker/pool.js`) | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2012-2018 Wowser Contributors; package.json `"license": "MIT"`) | JavaScript (ES modules, static class fields, `::` bind operator) | symbol `DoodadManager.loadDoodads` / `loadChunk`

Checked: `game/world/doodad-manager.js` 1-236 (read in full), `game/world/map.js` 1-136 (read in full), `lib/pipeline/m2/blueprint.js` 1-101 (read in full), `lib/pipeline/m2/index.js` 10-80 and 556-590 (read: constructor branches, `dispose`, `clone`), `lib/pipeline/worker/pool.js`, `thread.js`, `task.js`, `index.js` (read in full), `game/world/handler.js` 133 (grep only; the frame order around it, 120-135, not read). Callers: `M2Blueprint.load` from `game/unit.js:54`, `doodad-manager.js:116`, `wmo-manager/wmo-handler.js:169`; `M2Blueprint.unload` from `doodad-manager.js:182` and `wmo-handler.js:246`; `M2Blueprint.animate` once per frame from `handler.js:133`; `DoodadManager.loadChunk`/`unloadChunk` from `map.js:97` and `110`. Not read: `lib/game/world/terrain-manager.js`, `wmo-manager/index.js` (except the load call), `lib/pipeline/m2/animation-manager.js` (`length`, `update`), and `canInstance` itself (decoded by the `blizzardry` dependency, not in this repo; `(not read)`). Confidence: high on the streaming and refcount order (read end to end); high on the defects (read by code path, not run). camera_scope: n/a. `AGENTS.md` and `CLAUDE.md` were not present in the listing read; nothing from a donor file was treated as an instruction.

Best transferable idea: stream world props by chunk window, with a reference set per prop (a prop unloads only when its last chunk leaves), drain each load and unload backlog in slices sized to a fixed share of what is left, and share one refcounted model blueprint across instances so an animated model is advanced once, not once per copy.
Decision (proposed): adapt - the chunk-reference set, the backlog-proportional slice and the shared blueprint fit zones as data; Frankendom must fix the four defects below before taking them, and must map the donor's props to zone content (row 23 maps only partly).
Acceptance: a unit test walks a 25 x 25 chunk window back and forth; every prop released exactly once when its last chunk leaves; a prop removed mid-load is released, not shown; a failed chunk or model load is retried on the next window change; no timer runs while the pending queues are empty.

## 1. Mechanism

- Window (map.js 44-67): when the player's chunk index changes (48-53), the map builds the window of indices within `CHUNK_RENDER_RADIUS` = 12 chunks each way (55-56, 69-82: 25 x 25 = 625 chunks). Each window index not already queued is queued (58-60, 84-99). Each loaded chunk is stored (94) and hands its doodad entries to the doodad manager (97) and its WMO entries to the WMO manager (98). Any loaded chunk outside the window is unloaded (62-66, 102-114).
- Doodad reference sets (DoodadManager.loadChunk 35-60): for each entry, the chunk index is added to that entry's set (42-50); a pending unload for the entry is cancelled (53-55); the entry is queued for load (58). `unloadChunk` (62-85) removes the index from the set (66-69); if other chunks still hold the entry, nothing else happens (73-75). Otherwise the entry leaves the pending-load map (78-80) and enters the pending-unload map (83).
- Backlog-proportional slice (loadDoodads 88-113; unloadDoodads 146-174 is the same shape with the same constants): walk the pending map; skip an entry that is already loaded (92-95); load it (97); remove it from pending (99); count it (101). Yield when `count >= MINIMUM_LOAD_THRESHOLD` (2) and `count > remaining pending x LOAD_FACTOR` (1/40) (103-104). Yielding reschedules the slice `LOAD_INTERVAL` = 1 ms later (107). So a backlog of 400 gives slices of about 11, and a backlog of 40 gives slices of 2.
- Each slice always reschedules itself (112, and 172 for unload), even when nothing is pending (see defect 4).
- Load completion (loadDoodad 115-131): `M2Blueprint.load` resolves to a clone (116). If the entry was marked for unload meanwhile, the callback returns (117-119), without releasing the clone. Otherwise it records the doodad (121-123), places it (125; placement sets position, rotation and scale, then `map.add` at 210), and enables animation for animated doodads (127-129).
- Unload (unloadDoodad 176-183): remove from the doodad and animated maps (177-179), `map.remove` (180), then `M2Blueprint.unload` (182).
- Shared blueprint cache (blueprint.js): `load` normalises the path (16), cancels a pending unload of the same path (19-21), starts the background unloader once (23-27), increments the path's reference count (29-32), creates the blueprint promise once through the worker pool (34-46; the constructor and animation target registration are at 38-42), and returns a clone of the cached blueprint (48-50). `unload` disposes a non-instanced clone at once (57-59), decrements the count (61-63), and at zero adds the path to `pendingUnload` (65-66). `backgroundUnload` runs every `UNLOAD_INTERVAL` = 15 s (13, 87): for each pending path it disposes the cached blueprint (75-79), deletes the cache, animation target, count and pending entries (81-84).
- Instancing (m2/index.js): a clone of an instanceable model (`canInstance`, 28) shares the blueprint's animations (579), geometry (580), submesh geometries (581) and batches (582), and does not receive animation deltas (56). A non-instanced model is rebuilt in full (58, 74-78).
- Animation pass (blueprint.js 90-97; called once per frame from handler.js 133): for each animation target (one per blueprint that receives updates), `animations.update(delta)` runs once. Instances are skipped, so an animated model advances once no matter how many copies exist.
- Worker pool (pool.js 6-46): concurrency defaults to `navigator.hardwareConcurrency || 4` (14-16); a thread is created lazily below the limit (18-29); tasks run first-in first-out (31-46); a thread runs one task at a time (thread.js 12-24) and receives the result on `message` (26-34).

## 2. Key functions

- `DoodadManager.loadChunk` / `unloadChunk`: `/mnt/frankendom-donors/wowserhq-wowser/src/lib/game/world/doodad-manager.js` 35-85 (reference sets and pending maps).
- `DoodadManager.loadDoodads` / `unloadDoodads`: same file, 88-113 and 146-174 (budgeted slice, 1 ms reschedule).
- `DoodadManager.loadDoodad` / `unloadDoodad`: same file, 115-131 and 176-183.
- `WorldMap.render` / `loadChunkByIndex` / `unloadChunkByIndex`: `/mnt/frankendom-donors/wowserhq-wowser/src/lib/game/world/map.js` 44-67, 84-100, 102-114.
- `M2Blueprint.load` / `unload` / `backgroundUnload` / `animate`: `/mnt/frankendom-donors/wowserhq-wowser/src/lib/pipeline/m2/blueprint.js` 15-51, 53-70, 72-88, 90-97.
- `M2` constructor branches and `clone`: `/mnt/frankendom-donors/wowserhq-wowser/src/lib/pipeline/m2/index.js` 12-80 and 575-588.
- `WorkerPool.next` / `thread`: `/mnt/frankendom-donors/wowserhq-wowser/src/lib/pipeline/worker/pool.js` 18-46.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stream a window of zone chunks around the player; unload what leaves | Window radius 12 chunks each way (theirs, map.js 18), so 625 chunks (55-56). |
| A prop stays loaded while any loaded chunk wants it | No constant: the set of chunk indices per entry (theirs, doodad-manager.js 42-50, 66-75). |
| Drain the backlog in slices, big when the backlog is big | Minimum 2 per slice (theirs, 9); share 1/40 of what remains (theirs, 6, 104); slice interval 1 ms (theirs, 12, 107). |
| Shared model data, per-use placement | Clone shares blueprint data only when `canInstance` (theirs, m2/index.js 578-582); `canInstance` value not read. |
| Release the shared blueprint after a quiet period | Unload delay 15 s (theirs, blueprint.js 13). |
| Animation advanced once per shared blueprint | One update per target per frame (theirs, blueprint.js 91-95). |
| Worker decode concurrency | `navigator.hardwareConcurrency || 4` (theirs, pool.js 15). |

## 4. TypeScript sketch

simplified: the sketch keeps the chunk-reference sets, the pending maps, the backlog-proportional slice (same 2 and 1/40 rule, same order: delete, count, check), the refcount through an injected loader, and the 1 ms reschedule that only arms with pending work. It fixes defects 1 to 4 (release on a late load, no duplicate in-flight loads, failure not cached, no idle polling). It omits the window arithmetic and the edge clamp (defect 6), the queued-chunk cancel (defect 5), the WMO and terrain managers, the placement and animation enable, the blueprint cache itself (the caller supplies it through `load` and `release`), and the background unload delay. The sketch uses an injected scheduler, so it does not depend on `setTimeout`.

```ts
// Licence: MIT (donor). Adapted shape, re-expressed here; no donor line copied.
export interface ChunkEntry {
  id: string;
  filename: string;
}

export interface AssetLoader<T> {
  load(filename: string): Promise<T>;   // per-user clone in the donor (refcounted blueprint)
  release(item: T): void;               // per-user unload; the blueprint frees at zero refs
}

const LOAD_FACTOR = 1 / 40;   // share of the remaining backlog handled per slice
const MIN_PER_SLICE = 2;

export class ChunkStreamer<T> {
  private readonly refs = new Map<string, Set<number>>();
  private readonly pendingLoad = new Map<string, ChunkEntry>();
  private readonly pendingUnload = new Map<string, ChunkEntry>();
  private readonly loaded = new Map<string, T>();
  private readonly inFlight = new Set<string>();
  private scheduled = false;

  constructor(
    private readonly loader: AssetLoader<T>,
    private readonly schedule: (fn: () => void) => void,   // e.g. a 1 ms timer
    private readonly onLoaded: (id: string, item: T) => void,
    private readonly onUnloaded: (id: string, item: T) => void,
  ) {}

  addChunk(index: number, entries: ChunkEntry[]): void {
    for (const e of entries) {
      let set = this.refs.get(e.id);
      if (!set) {
        set = new Set<number>();
        this.refs.set(e.id, set);
      }
      set.add(index);
      this.pendingUnload.delete(e.id);
      if (!this.loaded.has(e.id) && !this.inFlight.has(e.id)) this.pendingLoad.set(e.id, e);
    }
    this.kick();
  }

  removeChunk(index: number, entries: ChunkEntry[]): void {
    for (const e of entries) {
      const set = this.refs.get(e.id);
      if (!set) continue;
      set.delete(index);
      if (set.size > 0) continue;   // still wanted by another chunk
      this.refs.delete(e.id);
      this.pendingLoad.delete(e.id);
      if (this.loaded.has(e.id)) this.pendingUnload.set(e.id, e);
    }
    this.kick();
  }

  // Only arms a timer while there is work: no idle polling.
  private kick(): void {
    if (this.scheduled) return;
    if (this.pendingLoad.size === 0 && this.pendingUnload.size === 0) return;
    this.scheduled = true;
    this.schedule(() => {
      this.scheduled = false;
      this.drainUnloads();
      this.drainLoads();
      this.kick();
    });
  }

  private drainLoads(): void {
    let count = 0;
    for (const [id, e] of this.pendingLoad) {
      this.pendingLoad.delete(id);
      if (this.loaded.has(id) || this.inFlight.has(id)) continue;   // no duplicate loads
      this.inFlight.add(id);
      this.loader.load(e.filename).then(
        (item) => {
          this.inFlight.delete(id);
          // Removed while loading: give the item back at once instead of keeping it.
          if (!this.refs.has(id)) {
            this.loader.release(item);
            return;
          }
          this.loaded.set(id, item);
          this.onLoaded(id, item);
        },
        () => {
          this.inFlight.delete(id);   // a failure is not cached; a later addChunk retries
        },
      );
      count += 1;
      if (count >= MIN_PER_SLICE && count > this.pendingLoad.size * LOAD_FACTOR) return;
    }
  }

  private drainUnloads(): void {
    let count = 0;
    for (const [id] of this.pendingUnload) {
      this.pendingUnload.delete(id);
      const item = this.loaded.get(id);
      if (item === undefined) continue;
      this.loaded.delete(id);
      this.onUnloaded(id, item);
      this.loader.release(item);
      count += 1;
      if (count >= MIN_PER_SLICE && count > this.pendingUnload.size * LOAD_FACTOR) return;
    }
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/cp001-wowser-chunk-streamer.ts` with `export {};` appended) exited 0.

## 5. Lands in

- TARGET `origins/client/zone_streaming.ts` (proposed path, client-side; Lead to confirm). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Mapping is partial: the donor streams scenery props and terrain, not spawns, so the row is used for the load-on-entry and release-on-leave lifecycle only. The engine (`src/fight`) does not import the streamer.
- Reuse tag: adapt (MIT; code may be adapted; the sketch re-expresses the shape).
- Brief rule served: CP topics asset streaming and loading, pooling and GC avoidance (shared blueprints), battery and frame cost (no idle timers); rule 8 (target file and one parity row).

## 6. Gaps and risks

- Defect 1, leak on a late load (doodad-manager.js 117-119): a prop removed while its load was in flight returns early and never calls `M2Blueprint.unload`, so the path's reference count never reaches zero, the clone is never disposed, and the blueprint is never evicted. Fix: release the clone on that branch (the sketch's late-load release, `drainLoads`).
- Defect 2, duplicate load (doodad-manager.js 58, 92, 97, 123): an entry removed and re-added while its first load is in flight is queued again, because the skip at 92 checks only loaded entries. Both loads place a doodad (125, 210); the second `doodads.set` (123) overwrites the first, which stays on the map with no owner. Fix: track in-flight ids (the sketch's `inFlight` set).
- Defect 3, failures are cached (blueprint.js 35-50; map.js 93-99): the rejected load promise stays in `cache`, every later `load` of that path rejects, and no unload runs on the failure path, so nothing retries. A failed chunk load leaves its `queuedChunks` entry (map.js 85-87), and it can only be cleared by unloading a loaded chunk (112), which never happens for it (defect 5 below). Fix: drop the cache or queue entry on rejection; retry on the next window change (the sketch's rejection handler).
- Defect 4, unconditional timers (doodad-manager.js 112 and 172): both slices reschedule every 1 ms forever, even with empty pending maps, so two timers run for the whole session. Fix: arm only when work is pending (the sketch's `kick`). Browsers clamp nested timers, so this costs CPU on idle rather than a crash (the clamp is a browser rule, not read in the donor).
- Defect 5, queued chunks unloaded during load (map.js 102-106): `unloadChunkByIndex` returns early when the chunk is not loaded yet, so the queue entry stays. The chunk then loads, and its props and terrain load although the player has left. It is removed only at the next window change (62-66, which runs only when the chunk index changes, 48-50). A player who stands still keeps it. Fix: cancel queued chunks on exit (mark them and drop the result on resolve).
- Defect 6, no clamp at the grid edge (map.js 77 and 90-91): window indices are plain integers, `base + y * perRow + x`. Near column 0 or 1023 a step past the edge lands on the neighbouring row, and a negative column is passed to `Chunk.load`. By arithmetic on lines 77 and 90-91 (not run). Fix: clamp (x, y) to the grid before computing the index.
- Frankendom rules: client-only streaming changes no kill, hit, timer or attack window; `MAX_ATTACKERS = 3` and the server-verified kill rule are untouched. The visual risk is a prop or creature that disappears when the player turns; the hold rule (no release while referenced) prevents it.
- Worker pool (pool.js and thread.js): the pool gives decode off the main thread and is worth a note of its own. Two gaps seen while reading: a worker-level crash (an `error` event, not a `message`) is not listened for (thread.js 9 registers `message` only), so a task on a crashed thread never settles and that thread stays busy; and `concurrency` is `hardwareConcurrency || 4` with no cap for phones (pool.js 15). Not run.
- Not verified: the value of `canInstance` (decoded by `blizzardry`), so the share of instanceable models is unknown; the 1 ms timer clamp in browsers.
- Scope: the donor's streamer is about props. Frankendom's zone content is spawns and actors; the lifecycle transfers, the spawn rules (row 23's caps and respawn) do not come from this file.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All 20+ line claims verified (doodad-manager 35-183, blueprint 15-97, map 44-114, pool 6-46, thread 9, m2/index 28/56/575-588, handler 133, MIT licence). Defects 1-6 are real. Not-read list honest. Only slips: sketch comment-level.
Missed: DoodadManager.animate (doodad-manager.js 214-232) is a second per-frame pass over animatedDoodads (visible check, receivesAnimationUpdates, billboards, skeletonHelper) not described. BUILD-RISK: Acceptance says a failed model load is retried on the next window change, but the sketch only re-queues on a later addChunk that lists that entry; a failure for a prop held by an already-loaded chunk is never retried when the window shifts elsewhere, so a correct build of the sketch can fail that test line. Also the 25x25 test needs the edge clamp (defect 6) stated as in or out of scope.
