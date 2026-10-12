# beyond-all-reason-Beyond-All-Reason (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/modules/graphics/instancevboidtable.lua` | Licence: GPL v2 (`LICENSE.md` line 2: "BAR game code is released under the GPL v2 licence"; the module carries no licence header of its own) | Lua (Recoil/Spring engine GL API) | symbols `makeInstanceVBOTable`, `pushElementInstance` (215), `popElementInstance` (327), `resizeInstanceVBOTable` (135), `uploadAllElements` (606)

Checked: Hint file `icons/icon_atlas.lua` was the wrong file for the mechanism: it is a static atlas data table (name to UV rectangle, 718 entries, `return atlas` at 722; first entry at line 2), cited as the atlas data half. The mechanism is the instance table in `modules/graphics/instancevboidtable.lua`. Read in full: header and table setup (1-70), resize (135-213), push (215-325), pop (327-420), upload-all (606-620). Read in part: pop tail and the unit-id shuffle (420-550, grep and partial). Callers checked: `gfx_DrawUnitShape_GL4.lua` (immediate push, noUpload nil, 327 and 402), `gfx_DrawFeatureShape_GL4.lua` (deferred push flushed per bucket, 331 and 601), `gizmo3d_gl4.lua` 803, `gfx_deferred_rendering_GL4.lua` 767, `gfx_decals_gl4.lua` 528 and 2266 (deferred pushes, path not read in full). Not read: `compactInstanceVBO`, `uploadElementRange` body, the icon-mode shader body (only the condition at 175 is read), `AtlasOnDemand.lua` (892 lines, not read), `map_grass_gl4.lua` (1942 lines, not read), `gfx_decals_gl4.lua` push path beyond grep. Confidence: high on the instance-table order of operations (read end to end); medium on the icon switch (condition only); the GPU draw behaviour is not verified beyond the calls. camera_scope: n/a.

## 1. Mechanism

- One instance table per model bucket. It owns a GPU instance buffer (`newInstanceVBO:Define(maxElements, layout)`, 20) and a CPU mirror `instanceData` of `instanceStep` numbers per element (25-29). It also owns a VAO built by `makeVAOandAttach` (88) over the used elements; the unit shape widget attaches its VAOs at `gfx_DrawUnitShape_GL4.lua` 557 and 573. Default capacity is 64 (10).
- Push (215-325), in donor order:
  1. Validate the object (a valid unit or feature id, or a known def; message at 230) and the row size (242): a wrong size only logs through Spring.Echo and the push carries on and copies the row (no return).
  2. Grow first if the next slot would fill the buffer: `(usedElements + 1) >= maxElements` (259). The table doubles (148) and re-attaches its VAO; each stored object is re-bound to the new buffer (171-200). This runs before the existing-id check, so a refused duplicate can still double the buffer (defect, below).
  3. New id: index = used + 1, used increases, both maps are set (266). Existing id: refused (273) unless `updateExisting` is set; if allowed, the old index is reused.
  4. Copy the row into the mirror (280-283).
  5. If `noUpload` is not true: upload that single row (291) and bind the object into the submission for new ids. If `noUpload` is true: only set `dirty` (321).
- Pop (327-420), in donor order:
  1. Find the index of the id; bail with a log if the id is unknown or the table is empty (338-348).
  2. Unmap the removed id (353-354).
  3. If it was the last element (fast path, 362): decrement used and drop the unit id slot. The submission entry is removed only when not dirty (374-376).
  4. Otherwise (swap-remove): the last element's index entry moves to the hole (407), its mirror row is copied over the hole (413-416), and only the moved row is uploaded (421). The last slot is cleared and used is decremented.
  5. If the last element has no recorded id (inconsistent bookkeeping), the table becomes dirty, used is decremented, and nil is returned (388-401).
- Deferred flush. `uploadAllElements` (606-652) uploads the whole used range in one call (618), clears dirty (an empty table takes an early path that only clears the VAO submission and dirty, 609-616), clears the submission and re-adds each object. A widget that defers pushes must call it. `gfx_DrawFeatureShape_GL4` does this once per bucket per frame (331, 601), so a fleet of ghosts that moves every frame costs one upload, not one per object.
- Draw: each table keeps one VAO and one submission over its used elements. The GPU draw count was not measured; what is read is that each table holds one submission, not one per object.
- Icon switch (LOD by distance). In the unit shape shader, when the squared distance from the camera exceeds `iconDistance * iconDistance`, the shader draws the icon path instead of the model (175; body not read). The uniform is `27 * UnitIconDist` (731, 776), so the default is 27 x 200 = 5400 in the shader's distance units (default config value 200 at 731).

## 2. Key functions

- `makeInstanceVBOTable`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/modules/graphics/instancevboidtable.lua` 1-70. Default capacity 64 (10), debug zombies on (42).
- `resizeInstanceVBOTable`: same file, 135-213. Doubling (148), copy to the new buffer, re-bind objects (176-210).
- `pushElementInstance`: same file, 215-325. Grow check (259), new-or-existing (266-273), mirror copy, upload or dirty (290-321).
- `popElementInstance`: same file, 327-420 and tail 420-550. Fast path (362), swap-remove (407-421), inconsistency path (388-401).
- `uploadAllElements`: same file, 606-652. One upload of 0..used (618).
- Callers: `gfx_DrawUnitShape_GL4.lua` 327 and 402 (immediate pushes); `gfx_DrawFeatureShape_GL4.lua` 331-340 (deferred) and 601 (flush).
- Loader: `modules/graphics/init.lua` line 4 exposes the table as `gl.InstanceVBOIdTable`.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Dense array with swap-remove and two index maps (O(1) add and remove) | Not a number (mechanism) |
| Capacity doubling with one spare slot | 64 start (theirs, 10); doubles (theirs, 148); grow when used + 1 >= capacity (theirs, 259) |
| Deferred bulk upload of one contiguous range | One upload of 0..used (theirs, 618) |
| Distance icon switch | Icon distance = 27 x UnitIconDist; default config 200 (theirs, 731) |
| Unit instance row width | Nine slots, last is teamID (theirs, `gfx_DrawUnitShape_GL4.lua` 323-325) |

## 4. TypeScript sketch

simplified: keeps the donor order for pop (fill the hole with the last element, keep the index maps in step, same converge-to-dirty branch for broken bookkeeping) and for push (new-or-existing, refused unless updateExisting, row copy, then immediate single-row upload or dirty). It changes two things on purpose: a wrong row size is refused (returns false), where the donor only logs and keeps copying; and the grow check moves after the existing-id refusal and runs only when a new id takes the last spare slot, so refused pushes and updates never grow the pool (the donor grows on every push, defect below). It omits the GPU buffer, the VAO submission, the object binding (unit or feature ids), the zombie debug tracking, the resize-time revalidation of objects, and `compactInstanceVBO` (not read). Uploads are recorded as ranges in `gpuUploads` instead of calling the GPU.

```ts
// Licence: GPL v2 (donor LICENSE.md). Clean-room shape of a dense instance table, written from the mechanism, not a translation.
export interface Table {
  data: number[];                     // CPU mirror: stride numbers per element, 0-based element index
  stride: number;
  used: number;                       // elements in use
  capacity: number;                   // elements the (notional) GPU buffer holds
  idToIndex: Map<number, number>;     // element id -> index
  indexToId: (number | undefined)[];  // index -> element id
  dirty: boolean;                     // deferred pushes/pops not yet uploaded
  gpuUploads: { from: number; to: number }[]; // recorded single-row uploads (stand-in for GPU calls)
}

export function makeTable(stride: number, capacity = 64): Table {
  const data: number[] = [];
  for (let i = 0; i < stride * capacity; i++) data.push(0);
  return { data, stride, used: 0, capacity, idToIndex: new Map(), indexToId: [], dirty: false, gpuUploads: [] };
}

// Double the capacity and extend the mirror (donor: maxElements * 2).
function grow(t: Table): void {
  t.capacity *= 2;
  for (let i = t.data.length; i < t.stride * t.capacity; i++) t.data.push(0);
}

// Insert or update one element. Grows only when a new id takes the last spare slot (the donor grows on every push).
// Returns false when the row size is wrong, or when an existing id is pushed without updateExisting.
export function push(
  t: Table,
  id: number,
  row: number[],
  opts: { updateExisting?: boolean; defer?: boolean } = {},
): boolean {
  if (row.length !== t.stride) return false;
  let index = t.idToIndex.get(id);
  if (index !== undefined && !opts.updateExisting) return false; // refused before any growth
  if (index === undefined) {
    if (t.used + 1 >= t.capacity) grow(t);  // grow only when a new slot is actually taken
    index = t.used;
    t.used += 1;
    t.idToIndex.set(id, index);
    t.indexToId[index] = id;
  }
  const base = index * t.stride;
  for (let i = 0; i < t.stride; i++) t.data[base + i] = row[i];
  if (opts.defer) t.dirty = true;
  else t.gpuUploads.push({ from: index, to: index + 1 });
  return true;
}

// Remove one element. The last element moves into the hole, so the used range stays dense.
export function pop(t: Table, id: number, defer = false): boolean {
  const index = t.idToIndex.get(id);
  if (index === undefined || t.used === 0) return false;
  const last = t.used - 1;
  t.idToIndex.delete(id);
  if (index !== last) {
    const movedId = t.indexToId[last];
    if (movedId === undefined) {
      // Bookkeeping is broken: converge to empty and rebuild on the next flush.
      t.used -= 1;
      t.dirty = true;
      return false;
    }
    t.idToIndex.set(movedId, index);
    t.indexToId[index] = movedId;
    const base = index * t.stride;
    const from = last * t.stride;
    for (let i = 0; i < t.stride; i++) t.data[base + i] = t.data[from + i];
    if (defer) t.dirty = true;
    else t.gpuUploads.push({ from: index, to: index + 1 });
  }
  t.indexToId[last] = undefined;
  t.used -= 1;
  return true;
}

// Rebuild everything in one contiguous upload of the used range, then clear dirty.
export function flush(t: Table): { from: number; to: number } {
  t.dirty = false;
  t.gpuUploads = [];
  return { from: 0, to: t.used };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/beyond-all-reason-sketch.ts`, exit 0.

## 5. Lands in

- TARGET `origins/client/instance-pool.ts` (new client module: a dense pool for many same-shape draw objects: decals, blood and wound marks, sparks, ghost markers). Client-only: the engine never reads it. Parity-checklist row 8 (blood, wounds, decals).
- Reuse tag: clean-room-shape (GPL v2; the sketch is written from the mechanism, the code is not translated)
- Brief rule served: 1 (one engine, client-only draw); rules 7-9 n/a

## 6. Gaps and risks

- Client-only: the pool does not decide hits, kills or loot. A decal or wound mark is cosmetic. The server-verified kill is not affected; a pool must never be the source of a hit (row 8 is a draw concern).
- Zones as data: the pool's start capacity and flush rule are engine constants; the number of decals per zone (cap) is zone data if it is ever a per-zone choice.
- Many-on-one: a burst of fight FX (sparks, dust) from up to MAX_ATTACKERS = 3 attackers can fill the pool. The pool must cap or drop the oldest FX rather than grow without bound; the donor only grows.
- Defects found, each kept as an idea with the fix:
  - Duplicate push can double capacity: the grow check (259) runs before the existing-id refusal (273), so a refused push still doubles the buffer. fix: look up the id first; grow only when a new id is actually added (done in the sketch).
  - Debug tracking on by default: `debugZombies = true` (42) runs the zombie bookkeeping in every pop. fix: default to false outside a debug build; keep the check behind the flag. (Cost not measured.)
  - Inconsistent-state pop returns nil after it has already decremented `used` (400). Caller sees nil for a removal that partly happened. fix: validate the last element's id before any mutation, or return a distinct code and always flush.
  - No shrink: capacity only doubles (148). fix: compact after a large drop (the donor's `compactInstanceVBO` exists but was not read).
- Frankendom rulings: one engine, one ledger, MAX_ATTACKERS = 3 do not touch this module, but a pool must not be read by the engine. The client pool may only be read by the renderer.
- Icon switch (LOD by distance): the switch is a shader decision at a squared-distance threshold; the donor's icon body was not read. For Frankendom, a distance-to-billboard switch is a candidate for far crowds only, not for the fighters (rule: fight actors always draw as models).

## Reuse tag

clean-room-shape (GPL v2, code not translated).

## Brief rule served

1 (one engine, client-only draw). Rules 7 and 8: the licence is GPL v2, so the sketch is clean-room.

Best transferable idea: A dense instance pool with swap-remove and deferred bulk upload lets a browser game draw hundreds of blood, decal and FX objects in one call, if the grow check runs only when a new id is added.
Decision (proposed): adapt — the pool shape transfers to WebGL instancing for decals and FX; adapt it by checking the id before growing and by making debug tracking opt-in. Reject the engine-side object binding (unit ids) because Frankendom's draw objects are not engine units.
Acceptance: In a fight with three attackers and a heavy hit, blood and sparks appear as one batched draw per pool (one draw call for the pool, not one per mark), a refused duplicate does not grow the pool, and a test asserts the pool's capacity is unchanged after a refused push.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Confirmed: a wrong row size only logs via Spring.Echo and the donor push carries on copying (instancevboidtable.lua 242-250); the note said push validates it and the sketch returns false without listing the change.
- Missed: uploadAllElements has an early path for usedElements == 0 (clears VAO submission and dirty, 609-616).
Fixed 2026-10-12: Step 1 now says wrong size only logs; the sketch's simplified line lists the refusal as a deliberate change; the flush line mentions the empty-table early path (no sketch code change).
