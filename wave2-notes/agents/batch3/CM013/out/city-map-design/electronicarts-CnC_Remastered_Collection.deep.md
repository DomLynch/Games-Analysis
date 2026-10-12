# electronicarts-CnC_Remastered_Collection (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/` (DISPLAY.CPP primary; also DLLInterface.cpp, HOUSE.CPP, BDATA.CPP, EVENT.CPP, CELL.CPP) | Licence: GPL-3.0 with Electronic Arts additional terms (repo root `LICENSE.md`: "under the GPL V3 below, with additional terms at the bottom"; section 7 adds: do not misrepresent the origins, and an indemnity clause; `REDALERT/License.txt` exists and was not read) | C++ | symbol `DisplayClass::Passes_Proximity_Check`

Checked: Candidate files opened (7): DISPLAY.CPP (read 655-835 in full, 895-920, 3866-3900), DLLInterface.cpp (read 4975-5175 in full), HOUSE.CPP (read 2600-2622, 3068-3200, 3236-3262, 7870-7915), BDATA.CPP (2820-2840, 3765-3776), CELL.CPP (443-480), EVENT.CPP (620-630), BUILDING.CPP (1053-1160, Unlimbo only). Confidence: high on the cursor rule and the wrapper ring field (read end to end); medium on "the wrapper and the cursor agree" (inference from reading both, not run). NOT read: `TechnoClass::Unlimbo` (the only cell check in `Place_Object`), `Legal_Placement`, `Random_Cell_In_Zone`, the sidebar production UI (SIDEBAR.CPP), radar/minimap drawing, and the per-building `Adjacent` values (not present in this donor tree: a grep for `Adjacent=` across .INI/.ini/.txt/.cpp/.h found none). Camera scope: n/a (not a camera topic).

Best transferable idea: A new hub service may only be placed within a fixed short reach of an existing hub building, one completed structure is held pending at a time, and the cursor shows the same yes/no result the engine will apply.
Decision (proposed): adapt - take the reach-to-hub rule and the one-pending-slot flow for hub services in a town zone; the engine (not the cursor) owns the check, the reach is zone data, and the reach field is rebuilt when the hub set changes.
Acceptance: A server test places a hub service next to the first hub (accepted), refuses the same service three cells away even when the client sends it (reason `not-near-hub`), refuses a second start while one service is pending, and the client ghost shows the same pass/fail cells as the engine check.

## 1. Mechanism

- Two halves. The CLIENT cursor decides whether a click is allowed; the SIM applies the placement. In this file the sim does not repeat the adjacency rule.
- Order of steps for one placement, as the code runs:
  (a) A completed structure waits in its factory slot. `Place_Object` only proceeds when `factory->Has_Completed()` (HOUSE.CPP 3083).
  (b) The player enters placement mode only if no other structure is pending: `Manual_Place` requires `!Map.PendingObject` (HOUSE.CPP 3243) and then sets the pending object and its occupy-list cursor (3253). One pending structure at a time.
  (c) Every cursor move recalculates the cached result `ProximityCheck` (DISPLAY.CPP 914).
  (d) The rule (DISPLAY.CPP 683-820). For the default `Adjacent == 1` (721): each footprint cell is checked; if any of its 8 neighbours is a friendly `IsBase` building (760), it passes. Otherwise each neighbour's 8 neighbours are checked (772-787). So a footprint cell passes when a friendly base building is within two king-moves, i.e. Chebyshev distance 2 (one clear cell in between). Walls use a different rule: a wall must touch a friendly wall or bib cell (750, 775). For `Adjacent > 1` (811) the rule is centre distance: `centdist` (cells from the cursor cell to the friendly `IsBase` building centre) minus `(Width() + Height()) / 2` must be `<= Adjacent` (818).
  (e) Left release: if the cached check passed, a PLACE event with the cell is queued (DISPLAY.CPP 3880-3881); otherwise the deny line plays (3883).
  (f) On the sim side, the PLACE event calls `Place_Object` (EVENT.CPP 626). `Place_Object` checks the factory is complete (HOUSE.CPP 3083), then calls `tech->Unlimbo(Cell_Coord(cell))` (3187). Unlimbo success clears the pending slot and plays the placed sound (3188-3196). The proximity rule is not called in this path (verified by grep: the only callers of `Passes_Proximity_Check` are DISPLAY.CPP 914, DLLInterface.cpp 5120 and HOUSE.CPP 7904).
- The Glyphx wrapper (DLLInterface.cpp) builds a different but equivalent-for-default structure:
  - `Calculate_Placement_Distances` (4982-5041): every cell is set to 255. Every friendly `IsBase` building cell (or a friendly bib/wall) gets 0 (5022). From it, square rings are walked out to `Adjacent + 1` (5024), each ring cell keeping the minimum distance (5032). The field is built once per placement.
  - `Passes_Proximity_Check` (5137-5160): a footprint cell that is off the radar returns false at once (5151). Otherwise the check passes when any footprint cell has a field value `<= Adjacent + 1` (5155).
  - `Get_Placement_State` (5066-5127): a snapshot of pass/clear for every cell in the map window, for the client ghost.
  - The field is rebuilt only in `Start_Placement` (5679) in this file.
- AI placement: `Find_Cell_In_Zone` (HOUSE.CPP 7874-7915) picks a random point in the zone (7885), then scans every map cell (7896-7898), keeps only cells that pass legal placement and the same proximity check (7899-7904), and returns the legal cell nearest that point.

## 2. Key functions

- `DisplayClass::Passes_Proximity_Check`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/DISPLAY.CPP` 683-820. The cursor rule (default branch 721-783; centre-distance branch 811-820).
- `DisplayClass::Set_Cursor_Pos` (cached result): DISPLAY.CPP 914.
- `DisplayClass::Mouse_Left_Release` (click gate): DISPLAY.CPP 3876-3884.
- `HouseClass::Manual_Place` (one pending slot): HOUSE.CPP 3236-3262 (the pending check is at 3243, the slot is set at 3253).
- `HouseClass::Place_Object` (sim placement): HOUSE.CPP 3068-3196.
- `DLLExportClass::Calculate_Placement_Distances` (ring field): DLLInterface.cpp 4982-5041.
- `DLLExportClass::Passes_Proximity_Check` (wrapper check): DLLInterface.cpp 5137-5160.
- `DLLExportClass::Get_Placement_State` (ghost snapshot): DLLInterface.cpp 5066-5127.
- `HouseClass::Find_Cell_In_Zone` (AI pick): HOUSE.CPP 7874-7915.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A new structure must sit within a fixed reach of an existing base building (Chebyshev rings, one clear cell allowed) | Reach = `Adjacent + 1`; default `Adjacent` = 1, so reach 2 (theirs: BDATA.CPP 2836 `Adjacent(1),`; wrapper 5024 and 5155) |
| Base buildings are the only things that count as hubs | `IsBase` default true (theirs: BDATA.CPP 2826 `IsBase(true),`); INI key `BaseNormal` (3775) |
| Per-building reach can be set from data | INI key `Adjacent` read at BDATA.CPP 3770. Per-building values: (not read: not in this donor tree) |
| Walls and bibs have their own rule | Wall must touch a friendly wall/bib cell (theirs: DISPLAY.CPP 750, 775) |
| Mines and similar: centre distance instead of rings | Branch for `Adjacent > 1` (theirs: DISPLAY.CPP 811, 818). The comment on 810 says "within 10 squares" but the code compares to `Adjacent`; the comment is stale |
| Click gate on a cached result | One pending structure (theirs: HOUSE.CPP 3243) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's reach-field idea (rings out to `reach`, Chebyshev distance, minimum kept), the one-pending rule and the "any footprint cell in reach" pass. It adds the engine-side check that the donor does not have in `Place_Object`, and it rebuilds the field from a passed-in hub list (the caller must call `buildReachField` on every hub change, which the donor does not do). It omits: the donor's wall/bib rule, the centre-distance branch for `Adjacent > 1`, the off-radar early return in the cursor version (the sketch keeps the equivalent off-grid return), the `Unlimbo` details (the sketch uses an `isClear` callback), the AI random-point search, and the ghost snapshot. The grid is passed as width and height; the donor's 128-wide cell index is not used.

```ts
// Licence: GPL-3.0 with Electronic Arts additional terms (donor, repo root LICENSE.md). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type HubId = number;

interface PlacementState {
  // One structure may be waiting to be placed at a time (donor: Map.PendingObject).
  pending: string | null;
  // Cached reach field: distance (Chebyshev, in cells) from the nearest friendly hub cell, 255 = out of reach.
  field: Uint8Array;
}

// Recompute the reach field from every friendly hub cell. Must be called whenever the hub set changes;
// the donor only does this once, when placement starts (stale-state defect).
function buildReachField(hubCells: HubId[], w: number, h: number, maxDist: number): Uint8Array {
  const field = new Uint8Array(w * h).fill(255);
  for (const hub of hubCells) {
    const hx = hub % w;
    const hy = Math.floor(hub / w);
    for (let y = hy - maxDist; y <= hy + maxDist; y++) {
      for (let x = hx - maxDist; x <= hx + maxDist; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = Math.max(Math.abs(x - hx), Math.abs(y - hy));
        const i = y * w + x;
        if (d < field[i]) field[i] = d;
      }
    }
  }
  return field;
}

// A footprint passes when ANY of its cells is within `reach` of a hub (donor wrapper: reach = Adjacent + 1).
// An off-grid footprint cell fails the whole check, as in the donor.
function passesProximity(footprint: number[], field: Uint8Array, reach: number, w: number, h: number): boolean {
  for (const c of footprint) {
    if (c < 0 || c >= w * h) return false;
    if (field[c] <= reach) return true;
  }
  return false;
}

type PlaceResult = "ok" | "no-pending" | "not-near-hub" | "blocked";

// Engine-side placement: the proximity rule is checked here too, not only on the client cursor.
function tryPlace(
  st: PlacementState,
  structure: string,
  footprint: number[],
  reach: number,
  w: number,
  h: number,
  isClear: (cell: number) => boolean,
): PlaceResult {
  if (st.pending !== structure) return "no-pending";
  if (!passesProximity(footprint, st.field, reach, w, h)) return "not-near-hub";
  if (!footprint.every(isClear)) return "blocked";
  st.pending = null;
  return "ok";
}

// Only one completed structure may wait at a time (donor: Manual_Place refuses when PendingObject is set).
function startPlacement(st: PlacementState, structure: string): boolean {
  if (st.pending !== null) return false;
  st.pending = structure;
  return true;
}

export {};
```

## 5. Lands in

- TARGET `origins/zones/hub-placement.ts` (proposed new module, does not exist yet): the engine check for hub services in a town zone, called from the same place that spawns or places a zone structure, so a placement the client sends is verified on the server. Parity-checklist row 21 (catalogue fields: the reach value and the hub flag are per-type fields of the building entry). No parity row covers town layout; row 21 is the nearest fit. This is a placement rule, not spawns, so row 23 (zone population) does not apply; flagged for Lead.
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
- Brief rule served: addendum rules 2, 3 and 5 (judged the idea; the not-read items are marked); Frankendom ruling "kills and placements are server-verified" (the engine must check reach, not the cursor)

## 6. Gaps and risks

- Licence: GPL-3.0 with EA section 7 terms. Clean-room only: the sketch is written from the described rule, not from the donor lines.
- Authority gap: in this file the adjacency rule runs only on the client cursor (DISPLAY.CPP 914, 3880). `Place_Object` (HOUSE.CPP 3068-3196) does not call it; it relies on `Unlimbo` (not read). Frankendom must run the reach check in the engine. Fix: the sketch's `tryPlace` does this before the clear check.
- Stale field: the wrapper builds the field only at `Start_Placement` (DLLInterface.cpp 5679). A hub destroyed or sold while the player is placing leaves the field stale. Fix: rebuild on every hub add or remove (`buildReachField` is cheap for a small zone).
- Two rules that disagree for `Adjacent >= 2`: the cursor uses centre distance (DISPLAY.CPP 811-818), the wrapper uses ring reach `Adjacent + 1` (DLLInterface.cpp 5024, 5155). Fix: one function in the engine; the client reads its result.
- Stale comment: DISPLAY.CPP 810 says "10 squares" for mines; the code uses `Adjacent`. The mine value was not read.
- AI cost: `Find_Cell_In_Zone` scans every map cell per pick (HOUSE.CPP 7896-7904). Fix: scan only the zone's bounding box.
- Walls and bibs are a separate placement rule (touch a friendly wall or bib). Frankendom has no walls; drop the branch unless a zone needs fences.
- Values: `Adjacent` per hub service and the `BaseNormal` flag per service are zone data in Frankendom. The donor's per-building numbers were not read (not in this tree), so no donor number is copied into the sketch except the default 1.
- Not checked: whether the wrapper and the original cursor give the same answer in play. Not run; the answer above is inferred from reading the two functions.

Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
Brief rule served: addendum rules 2, 3, 5; ruling: server-verified placement
