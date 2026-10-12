# opentibiabr-otclient (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/framework/graphics/drawpool.h` (with `drawpool.cpp`, `drawpoolmanager.cpp`, `declarations.h`, `src/client/client.cpp`, `src/client/lightview.cpp`, `src/framework/core/graphicalapplication.cpp`) | Licence: MIT (`/mnt/frankendom-donors/opentibiabr-otclient/LICENSE`, "OTClient is made available under the MIT License"; the `drawpool.h` header reads 2010-2026, the LICENSE file says 2010-2020) | C++ | symbol `DrawPool::add`

Checked: camera_scope n/a (sprite and overlay batching, not a camera). Read in full: `drawpool.h` (1-367), `drawpool.cpp` (1-527), `drawpoolmanager.cpp` (1-279). Read in part: `client.cpp` 120-145 (canDraw), `graphicalapplication.cpp` 160-240 (draw loop), `lightview.cpp` 60-110 (hash use), `stdext/hash.h` 50-66, `declarations.h` 58-66 (enum only). Confidence high on the pool batching and the repaint gate; medium on the threading (which thread calls each draw was read only at the call site). Not read: `textureatlas.cpp` (atlas packing), `timer.h` (`Timer::update`, `ticksElapsed`), `coordsbuffer.cpp`, the painter draw calls, `framebuffer.cpp`, the map widget code that calls `preDraw` (only `uimap.cpp` line 64 read).

## 1. Mechanism

- A pool (`DrawPool`) is a recording of 2D draw calls for one layer of the screen: map, foreground, light, creature information. Each draw call goes to `DrawPool::add` (`drawpool.cpp` 54), which records a state (texture or atlas page, opacity, clip, transform, colour, shader) and geometry (a quad or triangle), and appends it to the pool's list for the current draw order.
- Batching, in order:
  (a) The state hash is computed for every draw in `updateHash` (116) from framebuffer id, blend, composition, opacity, clip, shader, transform, colour and texture.
  (b) For framebuffer pools only, a draw whose geometry hash equals the previous draw's is skipped (164). Each draw's hash is folded into the pool's content hash (167).
  (c) If the last recorded object has the same state, the quad is appended to its vertex buffer (84). Otherwise, pools with `m_alwaysGroupDrawings` look up one buffer per state hash for the whole recording (88); other pools start a new buffer.
  (d) Textures are not bound per draw. A texture in the pool's atlas is referenced by atlas id and transform-matrix id (`getState` in `drawpool.cpp`; lines not receipted). The texture is packed into the atlas on first execute (428).
- Pools and their settings (`create`, 29-48; enum 58-64 in `declarations.h`):
  MAP: framebuffer, alpha writing off, blend off, map atlas. No refresh delay. `canDraw` allows it whenever a game is online (client.cpp 126-127), and `release` keeps the old picture when the content hash is unchanged (281).
  FOREGROUND: framebuffer plus a smoothing temporary framebuffer, refresh 10 per second (38, 100 ms), foreground atlas.
  LIGHT: no framebuffer; the hash controller is in grouping mode (44).
  CREATURE_INFORMATION and FOREGROUND_MAP: no framebuffer; group by state (46); refresh 500 per second (47, 2 ms). The comment at 46 says "CREATURE_INFORMATION & TEXT", but the enum (58-64) has no TEXT pool; the comment is stale.
- Repaint gate, decided before recording (`Client::canDraw`, `client.cpp` 124-141): MAP only when a game is online; FOREGROUND when `canRepaint()` (131); CREATURE_INFORMATION and FOREGROUND_MAP when online and `canRepaint()`; LIGHT when online and the map is drawing lights.
- `canRepaint` (`drawpool.cpp` 272-277): false if the pool is disabled or a repaint is still pending; otherwise `canRefresh()`.
- `canRefresh` (`drawpool.h` 211-217): the delay is the pool's refresh delay, unless an animated shader has set a shorter one. The shader delay is 50 ms (`FPS20`, 82; set at 249 for any shader that is not the replace-colour shader; cleared in `resetState` at 268). The pool may record when the delay has passed since the last record (`m_refreshTimer.ticksElapsed()`).
- Recording order (`DrawPoolManager::preDraw`, `drawpoolmanager.cpp` 196-215): select the pool; `resetState()` (201) clears the grouping map, parameters and the content hash (264) and the shader delay (268); run the draw callback; then `release()` (214).
- `release` (`drawpool.cpp` 280-332):
  (a) If the pool has a framebuffer, its content hash did not change since the last frame, and the refresh is not due, the recording is dropped (281-285).
  (b) Otherwise the refresh timer restarts (288), and the recorded lists are merged into the draw list. The first object of a new list merges into the last object of the old list when the states are equal (`last.state == first.state`, the comparison is 64-bit hash equality, 165). The swap is under a spin lock (309).
  (c) An atomic flag is set so the draw side knows a new recording is ready (332).
- Drawing each frame (`drawpoolmanager.cpp` 219-260): `drawObjects` returns early only for a pool with a framebuffer and no repaint pending (223). When a repaint is pending the draw lists are swapped (231). The list in `m_objectsDraw[1]` is then replayed (235) on every frame, including for pools without a framebuffer, which therefore re-submit their last list each frame. The atlas is flushed (244). For a pool with a framebuffer, `drawPool` blits the framebuffer every frame (259). So a cached layer is re-rasterised only on change or timer, and blitted every frame.
- Lights (`lightview.cpp`): each light's position, intensity, colour and opacity are hashed (77). The light texture's pixels are re-uploaded only when the frame hash changed (96). The hash controller is reset at the end (103).
- Buffers: `getCoordsBuffer` (510) takes a buffer from a free list (`m_coordsCache`) and returns it there on release (522), so buffers are reused across frames instead of allocated per draw.
- Threading: the map loop runs as an async task (`graphicalapplication.cpp` 204). Foreground, light and foreground-map pools are drawn as further async tasks when `canDraw` says so (221, 236). The list swap uses a spin lock and an atomic flag (above).
- Tick: no fixed step and no accumulator. The only time input is the millisecond refresh timer and the 500 per second and 10 per second delays. There is no per-frame budget or cap on the number of draws per pool.

## 2. Key functions

- `DrawPool::add`: `/mnt/frankendom-donors/opentibiabr-otclient/src/framework/graphics/drawpool.cpp`, starts at 54. Merge into last object (84), grouped buffer (88), new object.
- `DrawPool::updateHash`: same file, starts at 116. State hash, pool hash for framebuffer pools, repeat skip (164), content hash fold (167).
- `DrawPool::canRepaint`: same file, 272-277. Gate on the refresh timer.
- `DrawPool::release`: same file, starts at 280. Drop or keep (281), timer restart (288), merge and swap (309), repaint flag (332).
- `DrawPool::canRefresh`: `/mnt/frankendom-donors/opentibiabr-otclient/src/framework/graphics/drawpool.h` 211-217. Shorter of pool and shader delays (214), elapsed-ticks test (217).
- `DrawHashController`: `drawpool.h`, starts at 36. `put` (36-37), `forceUpdate` (50-51), `reset` (58-60).
- `DrawPoolManager::preDraw`: `/mnt/frankendom-donors/opentibiabr-otclient/src/framework/graphics/drawpoolmanager.cpp`, starts at 196. Select, reset (201), release (214).
- `DrawPoolManager::drawObjects`: same file, starts at 219. Early return (223), swap (231), replay (235).
- `DrawPoolManager::drawPool`: same file, starts at 247. Blit (259).
- `Client::canDraw`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/client.cpp`, starts at 124. Foreground case at 130-131.
- `DrawPool::getCoordsBuffer`: `drawpool.cpp`, starts at 510. Return to free list at 522.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Layer refresh rate: pool refresh delay = 1000 / fps ms | `setFPS` (`drawpool.h` 209); foreground 10 per second = 100 ms (`drawpool.cpp` 38); creature and foreground-map 500 per second = 2 ms (47) |
| Animated-shader refresh cap | 50 ms, 20 Hz (`drawpool.h` 82; set at `drawpool.cpp` 249) |
| Refresh gate uses the shorter of the two delays | `drawpool.h` 214 |
| Batch key | 64-bit state hash (`drawpool.h` 165) |
| Hash combine | boost-style, xor with `0x9e3779b9` and shifts (`stdext/hash.h` 54-58) |
| State pool size | 10 saved states per pool (`PoolState m_states[10]`, `drawpool.h` 330) |
| Atlas size | config value, 0 means the GPU's max texture size (`drawpoolmanager.cpp` 43-47) |
| Light batching | a light is kept only when its hash is new this frame (`lightview.cpp` 77) |

## 4. TypeScript sketch

simplified: the recorder is written for a single thread. Omitted: the threading (spin lock and async swap), the framebuffer and atlas (the caller rasterises `ready` into the cache and blits it), the temporary framebuffers, the light view, the `onlyOnce` state save and restore, the transform stack, and the coordinate-buffer free list. Reordered on purpose: the donor compares the content hash to the previous frame's value at the start of the next frame (`resetState` at `drawpool.cpp` 264); the sketch does the same in `beginFrame`. The donor's `forceUpdate` flag is dropped, because as read it does nothing (section 6). The donor keeps one list per draw order; the sketch keeps one list, so draw order is kept only in consecutive mode.

```ts
// Licence: MIT (donor LICENSE). Adapted: rewritten from the described shape; no donor lines are copied.
// clean-room
export type Rect = { x: number; y: number; w: number; h: number };
export interface PoolState { key: string; hash: number; }   // key: texture page, opacity, clip (identity); hash: its number form
export interface Quad { dest: Rect; src: Rect; }
export interface Batch { state: PoolState; quads: Quad[]; }

export const SHADER_DELAY_MS = 1000 / 20; // 50 ms: an animated shader refreshes at up to 20 Hz

// 32-bit combine in the spirit of a boost-style hash_union.
function mix(seed: number, v: number): number {
  const s = seed >>> 0;
  return (s ^ ((v >>> 0) + 0x9e3779b9 + ((s << 6) >>> 0) + (s >>> 2))) >>> 0;
}

function rectHash(r: Rect): number {
  let h = 0;
  for (const n of [r.x, r.y, r.w, r.h]) h = mix(h, Math.round(n * 16));
  return h;
}

export class DrawRecorder {
  private recording: Batch[] = [];
  private byState = new Map<string, Batch>();   // grouped mode: one batch per state for the whole recording
  private lastBatch: Batch | null = null;       // consecutive mode: extend the batch only from the previous draw
  private curHash = 0;
  private lastHash = 0;
  private lastQuadHash = -1;
  private lastRecordedAt = Number.NEGATIVE_INFINITY;
  private shaderDelayMs = 0;
  ready: Batch[] = [];                          // the last recording, read by the rasteriser

  constructor(
    private readonly grouped: boolean,          // overlays (names, bars): group by state, order not kept
    private readonly cached: boolean,           // a cached raster target exists: skip repeats, re-raster on change or timer
    private readonly refreshDelayMs: number,    // 0 = no timer
  ) {}

  // Called while recording a frame: an animated shader asks for a shorter refresh.
  setAnimatedShader(on: boolean): void {
    this.shaderDelayMs = on ? SHADER_DELAY_MS : 0;
  }

  // Shorter non-zero of the pool and shader delays, and enough time since the last recording.
  canRefresh(now: number): boolean {
    let delay = this.refreshDelayMs;
    if (this.shaderDelayMs > 0 && (delay === 0 || this.shaderDelayMs < delay)) delay = this.shaderDelayMs;
    return delay > 0 && now - this.lastRecordedAt >= delay;
  }

  // Asked before recording a frame. Note: reads the shader delay set during the previous frame (see section 6).
  canRepaint(now: number): boolean {
    return this.canRefresh(now);
  }

  // Start of a frame: the previous content hash becomes the comparison value; the recording is emptied.
  beginFrame(): void {
    this.lastHash = this.curHash;
    this.curHash = 0;
    this.lastQuadHash = -1;
    this.shaderDelayMs = 0;
    this.recording = [];
    this.byState.clear();
    this.lastBatch = null;
  }

  add(state: PoolState, q: Quad): void {
    const h = mix(mix(state.hash, rectHash(q.dest)), rectHash(q.src));
    this.curHash = mix(this.curHash, h);
    if (this.cached) {
      if (h === this.lastQuadHash) return;     // same draw as the previous one: skip
      this.lastQuadHash = h;
    }

    let batch: Batch | undefined;
    if (this.lastBatch !== null && this.lastBatch.state.key === state.key) batch = this.lastBatch;
    else if (this.grouped) batch = this.byState.get(state.key);

    if (batch === undefined) {
      batch = { state, quads: [] };
      this.recording.push(batch);
      if (this.grouped) this.byState.set(state.key, batch);
    }
    batch.quads.push(q);
    this.lastBatch = batch;
  }

  // End of a frame. Returns true when `ready` must be re-rasterised into the cache.
  // A cached target keeps its picture when the content did not change and the refresh is not due.
  release(now: number): boolean {
    const changed = this.curHash !== this.lastHash;
    if (this.cached && !changed && !this.canRefresh(now)) {
      this.recording = [];
      return false;
    }
    this.lastRecordedAt = now;
    this.ready = this.recording;
    return true;
  }
}
export {};
```

## 5. Lands in

- TARGET `origins/client/render/hud-batch.ts` (proposed path, not checked against the Frankendom repo). Client-only overlay batcher for nameplates, health bars and slow panels in the fight and the zones.
- Parity-checklist row 14 (HUD). The lane hint said row 12, but in the addendum list row 12 is combat sound cues, so I used row 14. Lead should confirm the row.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, and the sketch is rewritten)
- Brief rule served: the camera, HUD and sound are client-only (the recorder reads no game state); defect rule (keep the idea, fix the defect).

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is rewritten from the described shape and does not copy donor lines.
- Client only. The recorder must never decide a hit, a kill or a spawn. Fight-critical HUD (hit numbers, own health) must not sit on a cached layer.
- Refresh rate is a trap for the fight. The foreground pool refreshes 10 times per second (`drawpool.cpp` 38, 100 ms). A damage number or a health bar on that layer lags by up to 100 ms. Keep such items on a per-frame layer, and use the cached layer only for slow panels and static nameplates.
- Defect 1, dead force flag. `forceUpdate` sets `m_currentHash = 1` (`drawpool.h` 50-51). `reset()` (58-60) copies the current hash to the last hash only when it is not 1 and then clears the current hash to 0 (`drawpool.h` 58-63). `resetState` runs `reset()` at the start of every `preDraw` (`drawpool.cpp` 264), so the forced value is cleared before `release` reads it. The forced flag therefore changes nothing; `repaint()` (`drawpool.h` 99) works only because it also rewinds the refresh timer (`Timer::update` not read). Fix: drop the flag and force a repaint by resetting the refresh timer (or by clearing the last hash, as the sketch does by not having the flag at all).
- Defect 2, shader rate applies one frame late. `canRepaint` (called from `canDraw`, `client.cpp` 131) reads `m_shaderRefreshDelay` before the next `preDraw` clears it in `resetState` (`drawpool.cpp` 268). So the shader rate from frame N applies to the gate for frame N+1. Fix: pass the shader use of the current frame into the gate, or keep the shader rate on the pool and apply it in the same frame.
- Defect 3, stale comment (no logic bug). `drawpool.cpp` 46 says "CREATURE_INFORMATION & TEXT", but no TEXT pool exists in the enum (`declarations.h` 58-64). Fix: correct the comment.
- Risk, state equality is 64-bit hash only (`drawpool.h` 165). The merges at `drawpool.cpp` 84 and 309 use `==` on states, so a hash collision would merge two different states. Fix: key batches by the full state string (as the sketch does) or use a 128-bit key.
- Risk, grouped mode loses draw order. Pools with `m_alwaysGroupDrawings` (46) draw all quads of one state together, so a health bar cannot be guaranteed above a name drawn earlier in another state. Fix: group within a layer only; keep bars and names in separate layers with an explicit order.
- Risk, skip of repeated draws is only for cached pools (164). An uncached layer with 40 identical nameplates still submits each one. Fix: only use the repeat skip where the layer is cached.
- Thread model. The donor splits recording and drawing across tasks and a spin lock (`graphicalapplication.cpp` 204, 236; `drawpool.cpp` 309). A browser main thread does not need this for a single recording; the list swap is a reference swap in the sketch.
- Atlases are shared by pool group, not per pool: the map atlas serves the MAP pool, and one foreground atlas serves FOREGROUND, FOREGROUND_MAP and CREATURE_INFORMATION (assignments in `drawpoolmanager.cpp` `init`, switch block; sizes at 43-47). A Frankendom HUD should use one atlas per UI set, so nameplates and bars batch into one state.

Best transferable idea: Group overlay sprites by draw state and rasterise the overlay layer into a cache that re-rasterises only when its content changes or a slow timer fires, so 40 nameplates cost one blit on most frames.

Decision (proposed): adapt - take the state grouping and the change-or-timer cache for slow overlay layers; keep fight-critical HUD per frame; fix the dead force flag, the one-frame shader lag and the hash-only state equality. Why: nameplates and bars in many-vs-one fights are the main overlay load on a phone, and the cache removes most of their per-frame cost; the defects are fixable and the idea does not conflict with the rulings.

Acceptance: In a 3-vs-1 fight with 20 visible nameplates on a phone (375 wide), a dev counter shows the static overlay layer costs one blit per frame when nothing changed, and the hit number and own health bar update on the same frame as the hit (per-frame layer, not the 10 Hz layer).

Brief rule served: HUD is client-only; the cache never reads game state; defect rule (keep the idea, fix the defect).
