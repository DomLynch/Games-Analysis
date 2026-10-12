# luanti-org-luanti (housing-player-built-spaces, cell 1)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/util/areastore.cpp` | Licence: LGPL-2.1-or-later (SPDX header, `src/util/areastore.h` line 2; COPYING.LESSER is LGPL 2.1; textures/sounds CC BY-SA 3.0, not used here) | C++ with Lua bindings | symbol `AreaStore::getAreasForPos`

Checked: Read in full: `src/util/areastore.h` (Area, AreaStore, VectorAreaStore declarations, cache fields), `src/util/areastore.cpp` 20-27 (containment macros), 33-40 (backend choice), 104-233 (cache, id gap scan, cache miss, point query, VectorAreaStore insert/remove/query). Callers read: `src/script/lua_api/l_areastore.cpp` 107-182 (Lua get_areas_for_pos, get_areas_in_area, insert_area); the only non-test C++ caller of getAreasForPos is line 122. Also read the engine protection hook: `builtin/game/misc.lua` 122-127 and 142-186, `builtin/game/item.lua` 185-190 and 503-509, `builtin/game/privileges.lua` 59-60. NOT read: `SpatialAreaStore` (libspatialindex backend, areastore.cpp 235 onward), serialize/deserialize, the spatial overlap/containment bodies. Confidence: high on the vector store and cache; medium on the claim that the spatial backend behaves the same (not read). No housing, plot owner, size limit, upkeep, storage or vendor code exists in this donor: the owner is an opaque string set by a mod, and the donor's only permission logic is a stub hook. camera_scope: not a camera cell.

## 1. Mechanism

- A box store. Each `Area` is an axis-aligned box (`minedge`, `maxedge`, sorted on construction) with an integer id and an opaque `data` string (`areastore.h` 21-32). The Lua side passes an owner or any tag as that string (`l_areastore.cpp` 159-182).
- Three queries: point (`getAreasForPos`), overlap (`getOverlappingAreas`) and containment (`getContainingAreas`). Overlap and containment are the placement checks a housing system needs (does a new box hit an existing one; is it wholly inside a region).
- Point query order (cache on, the default): (a) the point is mapped to its block cube, key `getContainerPos(pos, r)` with radius r (default 64, clamped to at least 16); (b) `lookupCache` returns the list of areas overlapping that whole cube, built on a miss by `cacheMiss` (`areastore.cpp` 132-146); (c) each cached area is tested with the inclusive `AST_CONTAINS_PT` (`areastore.cpp` 153-165). Cache off: a plain scan of every area (`getAreasForPosImpl`, 208-215).
- Writes: insert gives an id if none was set (`areastore.cpp` 179-180, next free id from a linear gap scan at 111-121), refuses a duplicate id, stores the area, and clears the whole cache (185-186). Remove deletes the area and clears the whole cache (199-204). Every write therefore invalidates every cached block.
- Backend: `getOptimalImplementation` returns the libspatialindex store when `USE_SPATIAL` is set (`areastore.cpp` 35-36) and the vector store otherwise (38). The vector store scans a flat list; the spatial store (not read) uses the libspatialindex library.
- Protection, the rest of the donor's permission story: `core.is_protected(pos, name)` returns false and is meant to be overridden by a mod (`misc.lua` 122-126). Dig and place call it and, on a hit, log, call `record_protection_violation` and refuse (`item.lua` 185-191 place, 503-509 dig). A privilege `protection_bypass` lets a player ignore it (`privileges.lua` 59-60). `core.is_area_protected` checks a volume by sampling a lattice of points at most `interval` apart (default 4, `misc.lua` 153), with step `span / ceil(span/interval) - 1e-4` (165-166), and returns the first protected sample (179-180).
- Tick: none. Everything runs on demand in the calling function; there is no per-frame loop in this code.

## 2. Key functions

- `AreaStore::getAreasForPos`: `/mnt/frankendom-donors/luanti-org-luanti/src/util/areastore.cpp` 153-169. Cached point query, then the exact containment filter.
- `AreaStore::cacheMiss`: `/mnt/frankendom-donors/luanti-org-luanti/src/util/areastore.cpp` 132-146. Builds the block cube and loads every area overlapping it.
- `VectorAreaStore::insertArea` / `removeArea`: `/mnt/frankendom-donors/luanti-org-luanti/src/util/areastore.cpp` 177-188 and 190-206. Id assignment, duplicate refusal, cache clear.
- `VectorAreaStore::getOverlappingAreas` / `getContainingAreas`: `/mnt/frankendom-donors/luanti-org-luanti/src/util/areastore.cpp` 217-233. The two placement queries.
- `LuaAreaStore::l_get_areas_in_area`: `/mnt/frankendom-donors/luanti-org-luanti/src/script/lua_api/l_areastore.cpp` 129-158. Picks overlap or containment by a flag.
- `core.is_area_protected`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/misc.lua` 144-186. The sampled volume check.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Box store with point, overlap and containment queries | None |
| Block cache: key = block cube, value = areas overlapping that cube, exact filter after | Cube side r = 64 default (`areastore.h` 112), clamped to at least 16 (`areastore.cpp` 127) |
| Cache size | 1000 entries (`areastore.h` 39) |
| Any write clears the whole cache | None (a cost, see section 6) |
| Sampled volume check, lattice step <= interval | Default interval 4 (`misc.lua` 153) |
| Protection default: allow everything, mods override | Stub returns false (`misc.lua` 124-126) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's query order (block cube key, cached overlap list, exact containment filter) and its inclusive corners. It omits the disabled-cache path (the donor does a full scan), caller-supplied ids and the gap scan (it uses a counter), the Lua data string (owner is a string field), serialization, and the spatial backend. It adds two things the donor does not have: a rule that a new plot may not overlap another plot, and an exact box test in place of the donor's sampled volume check, which can miss a protected region thinner than its sample step.

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec3 { x: number; y: number; z: number; }
interface Plot { id: number; min: Vec3; max: Vec3; owner: string; }

function sortCorners(a: Vec3, b: Vec3): [Vec3, Vec3] {
  return [
    { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) },
    { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) },
  ];
}

// Inclusive on both corners, like the donor containment macro.
function containsPoint(p: Plot, v: Vec3): boolean {
  return p.min.x <= v.x && v.x <= p.max.x &&
         p.min.y <= v.y && v.y <= p.max.y &&
         p.min.z <= v.z && v.z <= p.max.z;
}

// Two boxes overlap unless one lies entirely beyond the other on some axis.
function overlaps(p: Plot, min: Vec3, max: Vec3): boolean {
  return !(min.x > p.max.x || max.x < p.min.x) &&
         !(min.y > p.max.y || max.y < p.min.y) &&
         !(min.z > p.max.z || max.z < p.min.z);
}

export class PlotIndex {
  private readonly blockSize: number;
  private plots = new Map<number, Plot>();
  private cache = new Map<string, Plot[]>(); // block key -> plots overlapping that block cube
  private nextId = 1;

  constructor(blockSize = 64) {
    this.blockSize = Math.max(blockSize, 16); // donor clamps the cache radius to at least 16
  }

  insert(a: Vec3, b: Vec3, owner: string): number | null {
    const [min, max] = sortCorners(a, b);
    // Our rule, not in the donor: a plot may not overlap another plot.
    if (this.overlapping(min, max).length > 0) return null;
    const id = this.nextId++;
    this.plots.set(id, { id, min, max, owner });
    this.cache.clear(); // any write drops the whole point cache
    return id;
  }

  remove(id: number): boolean {
    const hit = this.plots.delete(id);
    if (hit) this.cache.clear();
    return hit;
  }

  // Exact box test over every plot. Used for placement; no sampling, so a one-node plot cannot be skipped.
  overlapping(a: Vec3, b: Vec3): Plot[] {
    const [min, max] = sortCorners(a, b);
    return [...this.plots.values()].filter(p => overlaps(p, min, max));
  }

  // Point query: the cache holds plots overlapping the whole block cube, then exact containment filters them.
  plotsAt(v: Vec3): Plot[] {
    const bs = this.blockSize;
    const bx = Math.floor(v.x / bs), by = Math.floor(v.y / bs), bz = Math.floor(v.z / bs);
    const key = `${bx},${by},${bz}`;
    let list = this.cache.get(key);
    if (!list) {
      const lo: Vec3 = { x: bx * bs, y: by * bs, z: bz * bs };
      const hi: Vec3 = { x: lo.x + bs - 1, y: lo.y + bs - 1, z: lo.z + bs - 1 };
      list = this.overlapping(lo, hi);
      this.cache.set(key, list);
    }
    return list.filter(p => containsPoint(p, v));
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hs003-luanti-plot-index.ts`, copy of `work/luanti-plot-index.ts`). The local tsc is not installed on the Mac, so the Mac hook could not check it.

## 5. Lands in

- TARGET `origins/server/plots.ts` (proposed path, not checked against the Frankendom repo): a server-side plot index built from plot rows (box + owner) in the one ledger. It is a derived index, rebuilt on load and updated by the same write that adds or removes the row.
- Parity-checklist row: 23 (zone population, per the task hint). Housing has no row of its own in the addendum; this is the nearest row and the lead should confirm it.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room, shape only)
- Brief rule served: zones as data and one ledger (rulings). Rules 7-9 n/a.

## 6. Gaps and risks

- The donor has no housing. No plot size limit, no upkeep or eviction, no storage, no vendors, no guild halls, no instancing. What transfers is the index and the query shape only.
- One ledger: the index must never be a second source of truth. Plot rows live in the ledger; the index is rebuilt from them. A cache that is not rebuilt from rows will drift after a crash.
- Server-verified: placement and permission checks run in the server command that writes the plot. The client may ask, never decide.
- Defect 1 (sampled volume check): `core.is_area_protected` tests points at most `interval` apart (`misc.lua` 165-166). A protected region thinner than the step can fall between samples and pass. fix: use the exact box query (`overlapping` in the sketch) for box protections; keep sampling only for arbitrary predicates.
- Defect 2 (silent refusal): the Lua `insert_area` returns nothing on a duplicate id (`l_areastore.cpp` 177-178) instead of an error. fix: return an explicit error code to the caller.
- Defect 3 (linear id scan): `getNextId` scans the whole map for a gap (`areastore.cpp` 111-121), which is O(n) per insert. fix: a counter, as the sketch does, with ids never reused.
- Cost, not a defect: every insert or remove clears the whole cache (`areastore.cpp` 186, 204). A world with many plots and frequent writes rebuilds every block on next read. fix: invalidate only the block cubes that the changed box touches.
- Overlap is allowed by the donor store. The no-overlap rule belongs to the caller (the mod); the donor does not enforce it. Frankendom must enforce it in the placement command.
- Permission is only a stub in the donor (`misc.lua` 124-126). The owner check, friends and guild rights do not exist here; the sketch does not implement them.
- Not read: the spatial backend (`SpatialAreaStore`, from `areastore.cpp` 235). If Frankendom needs a large world with many plots, that backend should be read before adoption.

Best transferable idea: keep plots as boxes with an owner string in one spatial index, answer "who owns this block" with a per-block cache, and check placement with an exact box overlap rather than a sampled volume test.

Decision (proposed): adapt - the index shape transfers, but as a derived view of plot rows in the one ledger, with the three defects fixed. Not a second store.
Acceptance: a server test places a plot, then refuses an overlapping plot; a one-node plot is found by a point query at its corner; building in another player's plot is refused by the server command, and a thin protected box is never skipped by the placement check.
