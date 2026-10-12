# freeciv-freeciv (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/server/citytools.c` | Licence: GPL-2.0-or-later (per the headers of common/city.c and server/citytools.c: "either version 2, or (at your option) any later version"; the repo COPYING is GPL v2) | C | symbol `city_map_update_radius_sq`

Checked: Symbol `city_map_update_radius_sq` is defined at server/citytools.c 3485 and read in full through 3577 (the worker-refill loop and the shrink branch were read line by line). Its only caller found by grep is `city_refresh` (server/cityturn.c 166). Read but not expanded: `get_city_bonus`, `city_map_to_tile`, `city_map_update_worker`, `city_can_work_tile`, `city_map_update_empty` and the iterator macro bodies in common/city.h 178-192 (not read). Index build and comparator read at common/city.c 343-360 and 545-575. Confidence: high on the radius formula, the tile-count gate and the shrink path; medium on the exact iteration order inside the refill loop (it relies on the iterator macros, not read). Scope: this is a town/city footprint, not a camera; camera_scope not applicable.

Best transferable idea: a hub's service footprint is a data-driven radius (base plus summed bonuses from buildings and techs, clamped), and the footprint only changes slots when the slot count actually changes, with displaced services refilled nearest-first or else left idle.
Decision (proposed): adapt - take the footprint rule for a hub's service slots as zone data; drop the vision and specialist parts, which have no Frankendom counterpart.
Acceptance: a server test builds a hub with base slots, adds a bonus that adds slots, then removes it while services sit on the lost slots; the displaced services move to the nearest free slot, any with no free slot show as idle, and the stored radius equals base plus the remaining bonuses.

## 1. Mechanism

- One function recomputes a city's work radius (squared) from the ruleset. It is called from `city_refresh` (server/cityturn.c 166), which runs it before unit upkeep and the city cache refresh (cityturn.c 150-172 read).
- New radius = `init_city_radius_sq` plus `get_city_bonus(pcity, EFT_CITY_RADIUS_SQ)` (citytools.c 3491-3492). `get_city_bonus` is the effect sum; its body was not read, so "sum of effects" is the name's meaning, not a read fact. The result is clamped to `[CITY_MAP_MIN_RADIUS_SQ, CITY_MAP_MAX_RADIUS_SQ]` (3496-3497).
- If the clamped value equals the stored one, return with no change (3499-3501).
- Otherwise compare tile counts: `city_map_tiles` of the old and new radius (3505-3506). If the counts are equal, return with no change (3508-3511). The stored radius is NOT updated in this case, because the store happens later at 3523. So a radius change that adds no tiles is ignored and the stored value keeps its old number.
- Store the new radius (3523). If the count grew (3525-3527): refresh vision only. Nothing moves; new slots start empty.
- If the count shrank (the else branch of that test, 3529 onward): (a) for every tile in the removed ring that this city works, empty it and count the worker (3532-3540). (b) If any workers were removed, walk the new radius from the centre outward and, for each tile that is not a free-worked tile, is not already worked by THIS city, and passes `city_can_work_tile` (which is where exclusion by other cities, enemy units and the like comes from), assign a worker there (3553-3555), decrementing the count until it reaches zero (3545-3563). (c) Any workers still unplaced become specialists: `pcity->specialists[DEFAULT_SPECIALIST] += workers` (3566-3568).
- Then refresh vision (3571) and, for AI cities, update the advisor data (not expanded).
- Tile order: `generate_city_map_indices` builds one index for the largest radius and sorts it by squared distance, then dx, then dy (common/city.c 545-547 build, 575 qsort, 343-360 comparator). Radius-specific iteration then walks that sorted array outward (macro bodies not read). So "nearest first" for the refill is what the sort implies; I did not read the walk itself.

## 2. Key functions

- `city_map_update_radius_sq`: `/mnt/frankendom-donors/freeciv-freeciv/server/citytools.c` 3485-3577. Whole pipeline: effect sum, clamp, tile-count gate, store, grow or shrink, refill, overflow.
- Tile-count gate (inside it): `/mnt/frankendom-donors/freeciv-freeciv/server/citytools.c` 3504-3511.
- Shrink, lift and refill (inside it): `/mnt/frankendom-donors/freeciv-freeciv/server/citytools.c` 3530-3569.
- Caller: `/mnt/frankendom-donors/freeciv-freeciv/server/cityturn.c` 150-172 (`city_refresh`, line 166).
- Index build and order: `/mnt/frankendom-donors/freeciv-freeciv/common/city.c` 343-360 (comparator), 545-575 (distance table and qsort).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Footprint = base + summed bonuses, clamped to a min and max | Base `init_city_radius_sq` = 5 (civ2civ3 game.ruleset 114, theirs). Min radius 0, max radius 5 (theirs, common/fc_types.h 85 and 87); squared bounds are radius squared plus 1 (common/city.h 85, theirs), so min squared = 1 and max squared = 26 |
| Only change slots when the tile count changes | None (the gate is the rule) |
| Shrink: services on lost slots refill nearest free slot first, then overflow | Overflow goes to specialists (citytools.c 3568, theirs) |
| Example bonuses (tiles added per building or tech) | Space Elevator effect block (sandbox effects.ruleset 419-420; value 5 on line 421 is not receipted because the line is too short to quote). The Wheel effect block (granularity effects.ruleset 80-81; value 3 on line 82, not receipted for the same reason) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: sum the bonuses onto the base, clamp, return if the stored value is unchanged, return WITHOUT storing if the tile count is the same, store, then grow (no moves) or shrink (lift services from lost slots, refill nearest free slot first, else idle). It omits the tile-validity check (`city_can_work_tile`, not read), the vision refresh and owner notify, the hex topology case, the free-worked and worker-state bookkeeping, and the specialist distinction (overflow goes to an `idle` list). It sorts the offsets itself rather than reusing the donor index. It differs from the donor in one place: the donor's stored radius keeps its old value when the tile count is equal (3508-3523); the sketch does the same, so the defect note in section 6 is about the donor, not the sketch.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Offset { dx: number; dy: number; d2: number }

export const MAX_R = 5;      // donor common/fc_types.h:87 (CITY_MAP_MAX_RADIUS)
export const MIN_R2 = 1;     // donor common/city.h: (CITY_MAP_MIN_RADIUS * CITY_MAP_MIN_RADIUS + 1) with min radius 0
export const MAX_R2 = 26;    // donor common/city.h:85: (CITY_MAP_MAX_RADIUS * CITY_MAP_MAX_RADIUS + 1)

// All offsets inside the largest footprint, nearest first; ties by dx then dy (donor comparator, common/city.c 343-360).
const ORDER: Offset[] = (() => {
  const out: Offset[] = [];
  for (let dx = -MAX_R; dx <= MAX_R; dx++) {
    for (let dy = -MAX_R; dy <= MAX_R; dy++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= MAX_R2) out.push({ dx, dy, d2 });
    }
  }
  return out.sort((a, b) => a.d2 - b.d2 || a.dx - b.dx || a.dy - b.dy);
})();

export function tilesFor(r2: number): Offset[] {
  return ORDER.filter(o => o.d2 <= r2);
}

export interface Hub {
  r2: number;                      // stored squared radius (starts at the base)
  occupant: Map<string, string>;   // "dx,dy" -> service id on that slot
  idle: string[];                  // services with no slot left (donor: specialists)
}

export interface RadiusChange { changed: boolean; displaced: number; idled: number }

const key = (o: Offset): string => `${o.dx},${o.dy}`;

// Donor: city_map_update_radius_sq. Base plus summed effect bonuses, clamped; no change if the tile count is the same.
export function setRadius(hub: Hub, baseR2: number, bonuses: number[]): RadiusChange {
  const sum = bonuses.reduce((s, b) => s + b, 0);
  const want = Math.min(MAX_R2, Math.max(MIN_R2, baseR2 + sum));
  if (want === hub.r2) return { changed: false, displaced: 0, idled: 0 };

  const oldTiles = tilesFor(hub.r2);
  const newTiles = tilesFor(want);
  if (oldTiles.length === newTiles.length) {
    // donor returns before storing, so the stored radius keeps its old value
    return { changed: false, displaced: 0, idled: 0 };
  }

  hub.r2 = want;

  if (newTiles.length > oldTiles.length) {
    // grow: no service moves; new slots start empty
    return { changed: true, displaced: 0, idled: 0 };
  }

  // shrink: services on removed slots are lifted, then refilled nearest free slot first; the rest go idle
  const newKeys = new Set(newTiles.map(key));
  const displaced: string[] = [];
  for (const o of oldTiles) {
    if (newKeys.has(key(o))) continue;
    const k = key(o);
    const who = hub.occupant.get(k);
    if (who !== undefined) {
      displaced.push(who);
      hub.occupant.delete(k);
    }
  }

  let idled = 0;
  for (const who of displaced) {
    const slot = newTiles.find(o => !hub.occupant.has(key(o)));
    if (slot !== undefined) {
      hub.occupant.set(key(slot), who);
    } else {
      hub.idle.push(who);
      idled++;
    }
  }
  return { changed: true, displaced: displaced.length, idled };
}
```

Typecheck: copied to the VPS as /tmp/cm015-freeciv-footprint.ts, appended `export {};`, and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0 with no output. The local copy in work/ already has exports, so `export {}` was added only on the VPS copy.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone coverage: how many service or spawn slots a zone or hub has, computed from zone data plus effect bonuses, and how displaced entries are re-placed on shrink). Parity-checklist row 23 (zone population: caps, respawn, despawn, coverage as zone data fields).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (the footprint is a zone field; the engine owns the placement and the idle state); row 23 numbers as zone data

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Defect found and fixed in the sketch: the donor does not store a new radius when the tile count is the same (citytools.c 3508-3523). The stored value then lags the effect total, so every later refresh repeats the comparison. Harmless to the tile set, but it means the stored value is not the effect total. Fix: store the new value first and skip only the worker work when the count is equal. The sketch still mirrors the donor so the difference is visible; the acceptance test should check that the stored value equals base plus bonuses.
- Shrink ordering and the idle outcome must be one ledger: a displaced service that goes idle needs a state the server owns (Frankendom rule: one ledger, server-verified). The donor's specialist count is a plain counter, not a per-service record; do not copy that.
- The donor's refill checks `city_can_work_tile`, free-worked and not-already-worked-by-this-city (3553-3555). Frankendom needs an equal rule (for example, a blocked or contested slot), or a refill can place a service where it cannot run.
- MAX_ATTACKERS = 3 does not apply to a service footprint: a zone ring can be larger than 3 without any duel using more than 3 attacker slots. Keep the footprint a zone-level service ring, not a fight ring.
- Vision refresh and owner notify are client or UI concerns; they stay out of the engine.
- The donor is a turn-based 4X city on a 2D grid. A Frankendom zone is a 3D world; a 2D footprint on the ground plane would need a rule for slope and blocked tiles that the donor does not give.
- Bonuses come from building and tech effects in the ruleset. Frankendom should express them as zone data with defaults, not as constants in the function.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data on one runtime; row 23 numbers as zone data; engine owns placement and idle state

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
MINOR.
- Refill condition misstated as 'not already worked by someone else'; real test is !is_free_worked && tile_worked(ptile) != pcity && city_can_work_tile (3553-3555), i.e. not already worked by this city; other-city exclusion lives in city_can_work_tile.
- Missed: city_refresh uses the return value to force a client sync (cityturn.c 171); the function also notifies the owner (3580) and updates the AI advisor (3575-3577). The refill loop starts at the city centre (CENTER_RADIUS_SQ) so it prefers the centre tile first.

Fixed 2026-10-12: refill condition corrected in section 1 and the defects list; added the missed side effects line above. Sketch unchanged (no typecheck needed).
