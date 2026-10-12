# MrAntares-roBrowserLegacy (client-performance-memory-loading, cell 39)

Donor: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Core/MemoryManager.js` (with `Core/MemoryItem.js`) | Licence: GNU GPL v3 (LICENSE: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; package.json `"license": "GNU GPL V3"`) | JavaScript (ES modules, classes, static arrow methods) | symbol `MemoryManager.clean`

Checked: `Core/MemoryManager.js` 1-290 (read in full), `Core/MemoryItem.js` 1-150 (read in full), `Core/Client.js` 60-80 (read: `getFile`; its sibling read path at 116-120 by grep only), `Renderer/MapRenderer.js` 355-380 (read: the only periodic caller of `clean`), `Renderer/Renderer.js` 336-382 (read: the frame cap and the engine tick), `Renderer/Effects/ThreeDEffect.js` 413 (signature), 432-450 and 640-662 (read: a holder that keeps cache data; 451-639 not read), grep of every `MemoryManager.` and `Memory.` call site (callers of `clean`, `forceClean`, `remove`, `search`, `get`). Callers: `clean` has one periodic caller (MapRenderer.js:372); `forceClean` has two (DBManager.js:379, Renderer.js:190; the context of the Renderer call not read); `remove` has three (CursorManager.js:143-144, GraphicsOption.js:232, Damage.js:163; context of the last two only partly read). Not read: `Core/FileManager.js` (492 lines; the actual file load and parse), the worker side (`Core/ThreadEventHandler.js`, `Core/Thread.js`), `Renderer/Renderer.js` 190 context, `DBManager.js` 379 context. `AGENTS.md` and `REVIEW.md` at the donor root were not read (treated as data; not needed). Confidence: high on the cache, sweep and removal order (read end to end); medium on the eviction-under-a-holder defect (read by code path, not run in a browser). camera_scope: n/a.

Best transferable idea: a timed sweep of unused decoded assets that releases GPU handles in small idle slices, with a holder count so an entity that still draws from an asset cannot have its texture freed under it.
Decision (proposed): adapt - the timed, idle-sliced eviction shape fits our zone and actor art loading, but Frankendom needs explicit holds (retain and release) and must not port the global mutable map or the donor's unguarded removal.
Acceptance: an asset read at t = 29 s survives the t = 30 s sweep; an asset held by a live creature or effect is never freed during a 60 s fight; a half-loaded asset is never removed; a unit test asserts each sweep frees at most 5 assets per idle slice.

## 1. Mechanism

- One process-wide cache keyed by file name (`_memory`, MemoryManager.js 19). `get(filename, onload, onerror)` creates the slot on first use, attaches callbacks, and returns `item.data` (56-73). `set(filename, data, error)` completes the slot and fires the callbacks, or records the error (92-103).
- Each cache item (MemoryItem.js) holds `_data`, `complete`, `lastTimeUsed` and two callback lists. Reading `data` stamps `lastTimeUsed = Date.now()` (63-66), and completing or failing an item stamps it too (116, 136). Callbacks added after completion fire at once (73-104).
- Eviction is a sweep driven from the map frame. Order of steps in `clean(gl, now)` (MemoryManager.js 111-171), as the code runs:
  - (a) Skip if the last sweep was less than 10 s ago (`_cleanUpInterval`, 37, 113) or a chunked clean is still running (113).
  - (b) Collect every complete item whose `lastTimeUsed` is older than `now - 30 s` (`_rememberTime`, 27, 122-129). Note the threshold uses `now`, which the caller passes as the engine tick (`Renderer.js` 374, `Date.now()`), so the same clock as `lastTimeUsed`.
  - (c) If nothing is collected, record the sweep time and return (131-134).
  - (d) Otherwise set the running flag and schedule `cleanChunk` with `requestIdleCallback` (137-141). Each callback removes at most 5 items (144), while time remains on the idle deadline (146). It reschedules itself until the list is done (153-155), then clears the running flag and the list and logs the count (157-168).
- `remove(gl, filename)` (205-275) frees what the item owns by extension: `.spr` deletes every frame's GPU texture and the atlas texture (225-235; the frame loop deletes at 229), `.pal` deletes its texture (239-243), `.str` deletes each layer's material textures (246-262), and any other blob URL is revoked (265-269). It then deletes the entry (274). It checks neither `complete` nor `lastTimeUsed`.
- `forceClean(gl, regex)` (180-197) is the synchronous variant: it removes every complete item that matches a regex, with no time check. It is used after bulk loads (DBManager.js 379, text and scripts) and in the renderer at Renderer.js 190 for images and sprites (context not read).
- Frame-cap throttle in the same engine (Renderer.js 355-367): when `frameLimit > 0` it skips a frame until `1000 / frameLimit` ms have passed, and keeps the last frame time on the interval grid (`now - (elapsed % interval)`, 367). The engine tick is `Date.now()` per presented frame (374, 380).

## 2. Key functions

- `MemoryManager.clean`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Core/MemoryManager.js` 111-171. The sweep: gate, collect, chunked idle removal.
- `MemoryManager.remove`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Core/MemoryManager.js` 205-275. Type-specific GPU free, then entry delete.
- `MemoryManager.forceClean`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Core/MemoryManager.js` 180-197.
- `MemoryItem.data` getter and `onload`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Core/MemoryItem.js` 63-66 and 111-124 (timestamp, callbacks).
- Per-frame caller: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/MapRenderer.js` 372.
- Holder example: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Effects/ThreeDEffect.js` 413 (`render`), 437-441 (load once), 446 (texture read on the draw path).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep an asset while it is in use, evict after it has been idle for a window | Remember time 30 s (theirs, MemoryManager.js 27); the comment at 22-24 says PHP hosts need 30 s and Node 120-300 s (data, not checked). |
| Sweep on a slow cadence, not every frame | Sweep interval 10 s (theirs, 37), gate at 113. |
| Free in small slices so a frame does not stall | Five removals per idle slice (theirs, 144); the idle deadline gates each removal (146). |
| Free GPU handles when the owner is evicted | Per-type free: sprite frame textures (229), palette texture (241), stream layer materials (256) (theirs). |
| Stamp use time on every read and every completion | Read stamp (theirs, MemoryItem.js 64); completion stamp (116). |
| Tick clock shared with the cache clock | Engine tick is `Date.now()` per presented frame (theirs, Renderer.js 374, 380). |
| Frame cap by a fixed interval | `1000 / frameLimit` (theirs, Renderer.js 356); the grid alignment is at 367. |

## 4. TypeScript sketch

simplified: the sketch uses a single `Map` and an injected clock and idle scheduler, so it runs without a browser. It adds what the donor lacks: holder counts (`retain` and `release`), a re-check of eviction at removal time, and no eviction of incomplete items. It omits the error path (the donor records an error on the item and fires `onerror` listeners), the regex-based `forceClean`, the blob revocation and the per-type GPU frees (the caller supplies one `free` callback), and the donor's log line. It reorders the sweep stamp: the sketch records the sweep time when the sweep starts, the donor when the chunked clean finishes.

```ts
// Licence: GNU GPL v3 (donor). Clean-room shape only; no donor line copied or translated.
interface Entry<T> {
  data: T | null;
  complete: boolean;
  lastUsed: number;     // ms; set on every read and on completion
  holds: number;        // live holders; a held entry is never evicted
  waiters: Array<(data: T) => void>;
}

interface CacheOptions<T> {
  free: (key: string, data: T) => void;                  // frees GPU handles, revokes blobs
  scheduleIdle: (run: (hasTime: () => boolean) => void) => void;
  clock: () => number;                                   // ms, same clock as lastUsed
}

const REMEMBER_MS = 30000;   // unused for this long => eligible for eviction
const SWEEP_EVERY_MS = 10000;
const CHUNK = 5;             // evictions per idle slice

export class AssetCache<T> {
  private readonly items = new Map<string, Entry<T>>();
  private lastSweepAt = Number.NEGATIVE_INFINITY;
  private queue: string[] = [];
  private sweeping = false;

  constructor(private readonly opts: CacheOptions<T>) {}

  /** Returns the data if complete; otherwise queues onload and returns null. */
  get(key: string, onload?: (data: T) => void): T | null {
    const e = this.entry(key);
    e.lastUsed = this.opts.clock();
    if (e.complete) {
      if (onload && e.data !== null) onload(e.data);
      return e.data;
    }
    if (onload) e.waiters.push(onload);
    return null;
  }

  set(key: string, data: T): void {
    const e = this.entry(key);
    e.data = data;
    e.complete = true;
    e.lastUsed = this.opts.clock();
    const waiters = e.waiters;
    e.waiters = [];
    for (const w of waiters) w(data);
  }

  retain(key: string): void {
    this.entry(key).holds += 1;
  }

  release(key: string): void {
    const e = this.items.get(key);
    if (e && e.holds > 0) e.holds -= 1;
  }

  /** Call once per frame. Starts a sweep at most every SWEEP_EVERY_MS. */
  tick(): void {
    const now = this.opts.clock();
    if (this.sweeping || now - this.lastSweepAt < SWEEP_EVERY_MS) return;
    this.lastSweepAt = now;
    this.queue = [];
    for (const [key, e] of this.items) {
      if (this.evictable(e, now)) this.queue.push(key);
    }
    if (this.queue.length === 0) return;
    this.sweeping = true;
    this.opts.scheduleIdle(hasTime => this.drain(hasTime));
  }

  private drain(hasTime: () => boolean): void {
    let done = 0;
    while (this.queue.length > 0 && done < CHUNK && hasTime()) {
      const key = this.queue.shift() as string;
      const e = this.items.get(key);
      // Re-check at the moment of removal: a read or a hold since the sweep keeps the entry.
      if (e && this.evictable(e, this.opts.clock())) {
        this.opts.free(key, e.data as T);
        this.items.delete(key);
      }
      done += 1;
    }
    if (this.queue.length > 0) {
      this.opts.scheduleIdle(next => this.drain(next));
    } else {
      this.sweeping = false;
    }
  }

  private evictable(e: Entry<T>, now: number): boolean {
    return e.complete && e.data !== null && e.holds === 0 && e.lastUsed < now - REMEMBER_MS;
  }

  private entry(key: string): Entry<T> {
    let e = this.items.get(key);
    if (!e) {
      e = { data: null, complete: false, lastUsed: 0, holds: 0, waiters: [] };
      this.items.set(key, e);
    }
    return e;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/cp001-robrowser-asset-cache.ts` with `export {};` appended) exited 0.

## 5. Lands in

- TARGET `origins/client/asset_cache.ts` (proposed path, client-side; Lead to confirm). Parity-checklist row 7 (creature actor and clips): the creature and hero art a fight draws is what a timed eviction could free mid-fight. The engine (`src/fight`) does not import the cache.
- Reuse tag: adapt (GPL-3.0; clean-room shape only, the sketch is written from the described mechanism, not translated).
- Brief rule served: CP topics asset streaming and loading, texture and memory budgets, pooling and GC avoidance; rule 8 (target file and one parity row); rule 6 n/a (no tick loop of its own beyond the per-frame sweep call).

## 6. Gaps and risks

- Defect 1, race between the sweep and the removal (MemoryManager.js 126-127 collect, 147 remove): the chunk removes each collected key without re-checking `lastTimeUsed` or `complete`. An asset read after collection (the data getter stamps at 64) is still freed. Fix: re-check `lastTimeUsed < now - REMEMBER_MS` at the moment of removal (done in the sketch, `drain`).
- Defect 2, removal of an in-flight load (`remove`, 205-274, checks neither `complete`): `GraphicsOption.js` 230-232 removes every `.spr` returned by `search` (283-285), which includes in-flight items. Their pending onload listeners are dropped with the entry; a later `set` makes a fresh entry that the waiters never see. Fix: never evict an incomplete entry, or move its listeners to the new entry (the sketch never evicts incomplete items).
- Defect 3, eviction under a live holder (the worst one): `ThreeDEffect` loads its sprite once (437-441) and keeps the cache data on the instance; its `render` (413) reads `this.spriteRessource.frames[0].texture` (446) and the act data on each draw, with no `get` call to refresh `lastTimeUsed` (the only stamp on the read path is `MemoryItem.data` at 64, reached through `Client.getFile`, 75, and the other read path at 120). After 30 s without a re-read, the sweep deletes the GPU textures (229) while the effect is still alive. By code reading only: the effect would then draw from a deleted texture. Not run in a browser. Fix: `retain` on load and `release` on destroy (the sketch's holder count), so the sweep cannot free an asset that a live object still draws from.
- Defect 4, no feature check on `requestIdleCallback` (141, 155): where it is missing the sweep never runs and the cache only grows. Not verified which browsers lack it. Fix: fall back to a 0-ms timer with a 4 ms budget, and keep the 5-per-slice cap.
- Sketch risk (not a donor defect): the sketch's `sweeping` flag clears only when a scheduled idle callback runs. If the scheduler never calls back, sweeps stop for good. Frankendom needs a timer fallback, as in defect 4.
- Frankendom rules: this is client-only art lifetime. It changes no kill, hit, timer or attack window, and never touches `MAX_ATTACKERS = 3` or the server-verified kill rule. The risk is visual: a freed texture shows as a blank or wrong creature at 375 wide, which the holder rule prevents.
- Companion idea (not a separate note): the frame-cap throttle (Renderer.js 355-367) keeps the last frame time on the interval grid, which avoids drift. It is a small idea that fits the Pit's fixed cap, but its frame-skip branch was read once and not timed.
- Data: the 30 s and 10 s windows are engine constants, not zone data; zones could override the window only if an encounter needs its art kept longer (not a need we have checked).
