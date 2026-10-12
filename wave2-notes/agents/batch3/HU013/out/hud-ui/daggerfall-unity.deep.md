# daggerfall-unity (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Automap.cs` (with `StringTableCSVParser.cs`, `StringTablePatcher.cs`, `Assets/Localization/StringTables/`) | Licence: MIT (`Automap.cs` line 4: "MIT License (http://www.opensource.org/licenses/mit-license.php)"; `LICENSE` line 3 "Copyright (c) 2009-2023 Daggerfall Workshop") | C# (Unity) | symbol `CheckForNewlyDiscoveredMeshes`

Checked: Read in full: `Automap.cs` Update (981-1020), the three-ray hit test `ScanWithRaycastInDirectionAndUpdateMeshesAndMaterials` (1021-1148), `CheckForNewlyDiscoveredMeshes` (1149-1229 and 1262-1296), the 5 Hz coroutine (1280-1292), the constants (160-172), the save and prune code (2131-2160 in part, 2212-2245). `Start` (938-979) read only for the coroutine start (978). `StringTableCSVParser.cs` 88-150 read; 112-124 read in part (the regex lines); `StringTablePatcher.cs` 26-50 read in part. Not read: the entrance-marker branch (1230-1261), the state-fill loop (2160-2212), the render modes, and `StringTablePatcher` body after line 40. Callers: `CheckForNewlyDiscoveredMeshes` is called from Update (1001) and the coroutine (1287); the scan function is called from `CheckForNewlyDiscoveredMeshes` only (three call sites, all read). Confidence: high on scan order, the agreement rule, the rates and the prune; medium on the first-run branch in Update. camera_scope: not applicable (HUD cell).

## 1. Mechanism

- Gate. `Update` returns unless the game state is Game or UI and the player is inside (981-990). Discovery runs from a coroutine started in `Start` (978) that loops: if the automap window is closed (1285), run the check, then wait `1 / 5` s (1289). The first check is also run from Update if the automap geometry object does not exist yet (1000-1001).
- Scope. `CheckForNewlyDiscoveredMeshes` returns unless the player is inside a building, dungeon or castle (1152-1155). It turns the automap geometry on for the rays (1158) and turns it off after the scan (1194), so the level-geometry colliders do not affect movement.
- Order of rays, for each scan:
  1. Floor under the head. Ray straight down 3 units (1163, 168) from `player position + camera local position` (1161), with a side protection offset of 0.1 units (1164), cast at 1165.
  2. View ray. Forward from the head for 30 units (1171, 169), with a side offset of 0.1 units taken from camera-down x forward (1170), cast at 1172.
  3. Sweep. Only if the view ray hit a wall (`hitForward`, 1172). Step 1 unit at a time along the view direction (1180) and stop once the step length reaches the view hit distance (1181). At each step, cast a 3-unit floor ray down (1188) with a 0.1-unit side offset (1187), cast at 1189.
- The three-ray test (`ScanWithRaycast...`, 1021-1148). Every ray is cast from three origins: the centre, the centre plus the side offset, and the centre plus a third offset (1031: the cross product of ray direction and side offset, with the same length).
  (a) True geometry: `RaycastAll` on the default layer from each origin (1046-1048), keeping the nearest hit whose object is not the player's capsule ("PlayerAdvanced", 1055).
  (b) Automap geometry: `Physics.Raycast` on the automap layer from each origin (1091-1095).
  (c) Reveal only if all three automap hits exist and share one collider (1117) and each automap distance matches the true distance from the same origin within 0.01 units (1123-1125). Then the mesh renderer is enabled (1132, "discovered") and the grayscale keyword is removed from each material (1137, "visited in this run"). Otherwise nothing is revealed and null is returned. On success the nearest true hit is returned, and the sweep uses it as the wall distance.
- Two states per mesh: `discovered` (drawn at all) and `visitedInThisRun` (drawn in colour, not grayscale) (72-73; set at 2107-2108 and 2178-2185).
- Memory of dungeons. `SaveStateAutomapDungeon` (2131) writes a per-dungeon state keyed by location and stamps it with the in-game time (2155). `numberOfDungeonMemorized` defaults to 1 (257). With 0, the saved state is cleared while the player is outside (2133-2137) and 1 is used while inside (2148). With N, saved dungeons are sorted by time, the Nth most recent time is the limit (2229), and entries strictly older than the limit are removed (2233).
- Entrance marker. A second check (from 1197) casts from the entrance marker to the player head over 100 units (170) and marks the marker discovered when the three rays reach the player capsule (1262, then 1268). The body between 1230 and 1261 was not read.

## 2. Key functions

- `CheckForNewlyDiscoveredMeshes`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Automap.cs` 1149-1229. Scope, floor ray, view ray, sweep.
- `ScanWithRaycastInDirectionAndUpdateMeshesAndMaterials`: Automap.cs 1021-1148. The three-ray agreement test and the reveal.
- `CoroutineCheckForNewlyDiscoveredMeshes`: Automap.cs 1280-1292. The 5 Hz gate and the open-map skip.
- `SaveStateAutomapDungeon`: Automap.cs 2131-2245 (save and prune). `GetState` / `SetState`: 378-392 (save-system hooks).
- String table parse: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/StringTableCSVParser.cs` 90-150. Load, dictionary, unescape.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Three rays from offset origins; reveal only if they agree on one object and on distance | Side offset 0.1 units (theirs, Automap.cs 1164); tolerance 0.01 units (theirs, 1123) |
| Floor ray under the head reveals the ground the player stands on | 3 units down (theirs, 168) |
| View ray reveals far geometry, but not too far | 30 units (theirs, 169; the comment says the value is chosen so big halls are not too easy to reveal) |
| Sweep along the view ray reveals the floor between the player and a wall | 1 unit step (theirs, 1180) |
| Scan gate, skipped while the map is open | 5 Hz, 0.2 s between scans (theirs, 172, 1289) |
| Remember the last N explored places, pruned by time | Default N = 1 (theirs, 257) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (floor ray, view ray, floor sweep up to the wall distance), the three-ray agreement test, the 5 Hz gate that skips while the map is open, and the keep-N-most-recent memory. It omits: the Unity layers (the sketch takes two cast functions), the camera-roll dependence of the side offsets (a fixed side offset is used), the mesh and material state (a reveal callback replaces it), the entrance-marker branch, the geometry enable and disable, and the save format. It fixes three donor defects: a missing true hit refuses the reveal (the donor treated it as a distance of 0), the sweep starts at half the wall distance when the wall is closer than one step (the donor skipped the sweep), and the memory keeps exactly N with a tie-break by id (the donor's `<` kept ties).

```ts
// Licence: MIT (donor). Sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Vec { x: number; y: number; z: number }
interface Hit { id: string; dist: number }
type Cast = (origin: Vec, dir: Vec, maxDist: number) => Hit | null;

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const len = (a: Vec): number => Math.hypot(a.x, a.y, a.z);
const norm = (a: Vec): Vec => scale(a, 1 / (len(a) || 1));
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

export const REVEAL_DOWN = 3.0;      // units: floor reveal depth under the head and under each sweep point
export const REVEAL_VIEW = 30.0;     // units: view ray length
export const PROTECT_OFFSET = 0.1;   // units: side offset of the protection rays
export const AGREE_TOL = 0.01;       // units: allowed gap between automap and true distances
export const SWEEP_STEP = 1.0;       // units: spacing of floor sweep points along the view ray
export const SCAN_HZ = 5;            // scans per second

export interface Zone {
  autoCast: Cast;   // nearest hit on the reveal layer (the cell geometry)
  truthCast: Cast;  // nearest hit on true level geometry, player excluded
}

const DOWN: Vec = { x: 0, y: -1, z: 0 };
const FLOOR_SIDE: Vec = { x: -PROTECT_OFFSET, y: 0, z: 0 };

// Centre ray plus two protection rays; the third is at a right angle to the first two.
// Reveal only if the three automap hits name the same cell and each distance matches the true
// distance within tolerance, so a gap, a door or a pillar blocks the reveal.
export function scanRay(zone: Zone, origin: Vec, dir: Vec, maxDist: number, side: Vec, reveal: (id: string) => void): Hit | null {
  const d = norm(dir);
  const side3 = scale(norm(cross(d, norm(side))), len(side));
  const offsets: Vec[] = [{ x: 0, y: 0, z: 0 }, side, side3];
  const auto = offsets.map(o => zone.autoCast(add(origin, o), d, maxDist));
  const truth = offsets.map(o => zone.truthCast(add(origin, o), d, maxDist));
  const [a1, a2, a3] = auto;
  const [t1, t2, t3] = truth;
  // fix (donor defect): the donor treated a missing true hit as distance 0; a missing hit now refuses the reveal.
  if (!a1 || !a2 || !a3 || !t1 || !t2 || !t3) return null;
  if (a1.id !== a2.id || a1.id !== a3.id) return null;
  if (Math.abs(t1.dist - a1.dist) >= AGREE_TOL) return null;
  if (Math.abs(t2.dist - a2.dist) >= AGREE_TOL) return null;
  if (Math.abs(t3.dist - a3.dist) >= AGREE_TOL) return null;
  reveal(a1.id);
  return t1;
}

// One scan: floor under the head, then the view ray, then floor under points stepped along the view ray up to the wall.
export function scanCycle(zone: Zone, head: Vec, forward: Vec, reveal: (id: string) => void): void {
  const f = norm(forward);
  scanRay(zone, head, DOWN, REVEAL_DOWN, FLOOR_SIDE, reveal);
  const view = scanRay(zone, head, f, REVEAL_VIEW, scale(norm(cross(DOWN, f)), PROTECT_OFFSET), reveal);
  if (!view) return;
  // fix (donor gap): the donor starts the sweep at one step, so a wall nearer than one step gets no floor sweep.
  let s = Math.min(SWEEP_STEP, view.dist / 2);
  while (s < view.dist) {
    scanRay(zone, add(head, scale(f, s)), DOWN, REVEAL_DOWN, FLOOR_SIDE, reveal);
    s += SWEEP_STEP;
  }
}

// Scan gate: 5 Hz, skipped while the map is open.
export class RevealClock {
  private last = -Infinity;
  tick(nowS: number, mapOpen: boolean, zone: Zone, head: Vec, forward: Vec, reveal: (id: string) => void): boolean {
    if (mapOpen) return false;
    if (nowS - this.last < 1 / SCAN_HZ) return false;
    this.last = nowS;
    scanCycle(zone, head, forward, reveal);
    return true;
  }
}

// Explored-zone memory: keep the N most recently visited zones. Ties are broken by id so exactly N are kept.
export interface Visit { zoneId: string; lastVisitedS: number; explored: Set<string> }

export function remember(visits: Map<string, Visit>, v: Visit, keep: number): void {
  visits.set(v.zoneId, v);
  const sorted = [...visits.values()].sort((a, b) => (b.lastVisitedS - a.lastVisitedS) || (a.zoneId < b.zoneId ? -1 : a.zoneId > b.zoneId ? 1 : 0));
  for (const old of sorted.slice(Math.max(keep, 1))) visits.delete(old.zoneId);
}
```

## 5. Lands in

- TARGET (proposed; not checked against the Frankendom tree): `src/hud/worldmap-reveal.ts` (new client module). The reveal rays are queries on the engine's collision data; only the explored set is state, and that must go to the character ledger if it is to persist (see section 6).
- Parity-checklist row 14 (HUD).
- Best transferable idea: Reveal map cells only when three rays from offset points agree on the same object and on its distance, so a gap or a pillar cannot reveal what the player cannot see, and keep the N most recently explored zones.
- Decision (proposed): adapt - take the three-ray agreement test, the floor-under-head, view and sweep order, the 5 Hz gate that skips while the map is open, and the keep-N memory; the view length is zone data, and the three defects are fixed before porting.
- Acceptance: On a 375 px phone, walking a zone fills in the map cells in view and the floor just in front of the player, and a cell seen only through a pillar gap stays unrevealed. A unit test asserts that a fixture with a 0.2-unit gap refuses the reveal, and a test asserts that the explored set for the character is restored after re-login from the character ledger.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed; this sketch is clean-room from the described mechanism)
- Brief rule served: HUD is client-only (the reveal); the explored memory is character progress, so it lives in the one ledger; the view length is zone data.

## 6. Gaps and risks

- MIT: the donor code may be adapted. The sketch was written clean-room.
- Defect 1 (sweep skipped for near walls): when the view hit is nearer than one step, the donor's first step (1180) already exceeds the distance (1181), so no floor is swept between the player and the wall. Fix: start the sweep at half the wall distance (the sketch does this). Reading, not run.
- Defect 2 (missing true hit counts as 0): `RaycastHit` defaults to distance 0, so with no true hit the distance test passes whenever the automap hit is also at 0. Fix: refuse when a true hit is missing (the sketch does this). Reading, not run.
- Defect 3 (ties kept): the prune removes only entries strictly older than the Nth time (2233), so entries with the same in-game second survive and the count can exceed N. Fix: sort, keep exactly N, break ties by id (the sketch does this). Reading, not run.
- Cost: each scan can cast about 30 floor rays (one per sweep step) plus the view ray, and each ray runs three true-geometry casts and three automap casts. Frankendom's per-tick budget needs a cap on sweep points per scan (not in the sketch).
- Clock: the donor gate uses wall-clock waits (WaitForSeconds). Frankendom's client should use its own clock with a per-frame accumulator, so the gate is testable with a fake time (the sketch takes `nowS` as an argument).
- Persistence: the explored set is character progress. Under the one-ledger rule it must be saved in the character ledger, not in browser storage. Browser storage is only acceptable for per-viewer conveniences (the rule for artifacts also applies here). The donor's save hook is a per-save dictionary (378-392).
- Coverage: the reveal depends on what the player sees (30 units ahead) and on the floor under the path (3 units down). Frankendom zones need the view length as zone data, since big halls and small rooms need different values (zone data field `view_reveal_units`).
- Entrance-marker branch (1230-1261) was not read; it is not used by the sketch.
- Not run: no code was executed. The typecheck is the only check.

String tables (fold-in, read by structure and grep; no text quoted):
- Locale files: 10 English string-table assets under `Assets/Localization/StringTables/`, with 3,501 entries in total across nine non-empty tables (the Locations table is empty; Quests has one entry). The largest is the general strings table with 990 entries, then the resource table with 1,448 (both counted under the table-data block only).
- Grammar of the assets: Unity YAML. Each entry has an integer id and one localized value; there are no string keys (zero key lines). The first entry of the general strings table is a note about the collection, not game text.
- Grammar of the CSV patch format (`StringTableCSVParser.cs` 112-124, 130, 136-146): two columns, key then value. The key is unquoted and may not contain a quote, a comma or a newline. The value is either unquoted (no comma, quote or newline) or quoted with doubled quotes for an inner quote. A header row whose key and value equal the parser's two header words is dropped. Mods can override a CSV by name (`StringTablePatcher.cs` 35).
- Defect 4 (reading): an unquoted value containing a comma is cut at the comma, and the rest of the line is dropped silently, because the match ends there and the next match must start at a line break (116-123). Fix: quote any value that contains a comma, and report lines with unmatched text.
- Defect 5 (reading): `LoadDictionary` calls `dict.Add` (100), so one duplicate key throws and the whole load fails. Fix: detect the duplicate, report it, and keep a deterministic winner.

Reuse tag: rewrite-from-idea (MIT; adaptation allowed; this sketch is clean-room from the described mechanism)
Brief rule served: HUD is client-only; explored memory goes to the one character ledger; view length is zone data.
