# KsanaDock-Microverse (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomManager.gd` | Licence: MIT (donor `LICENSE` line 1: "MIT License", Copyright (c) 2025 KsanaDock) | GDScript (Godot 4.4, `project.godot` line 15) | symbol `get_current_room` / `is_position_in_room`

Checked: Read `script/RoomManager.gd` (all 56 lines), `script/RoomArea.gd`, `script/RoomData.gd`, `script/ui/MapSelection.gd`, the nine room nodes in `scene/maps/Office.tscn` (16967-17049) and their rectangle sizes (16744-16770), and these callers in `script/ai/AIAgent.gd`: 73-76, 142, 1640-1660, 1840-1886, 1955-1961. The hint file (`MapSelection.gd`) is the scene-change button only; the real zone code is `RoomManager.gd`. Grep over all 30 `.gd` files for zone, bound, spawn, transition, stream, respawn, population, capacity found no zone streaming, no per-zone spawn table and no zone transition (the only scene changes are menu to map select to `Office.tscn`). Not read: the other ~2000 lines of `AIAgent.gd`; `GameSaveManager.gd` rooms save (lines 88-107, grep only). Not run: Godot 4.4 is not on the VPS, so the `extents` problem below is inferred from the engine's property name, not observed. Confidence: high on the point test and on the id/name mix-up; medium on the `extents` failure. Scope: this is a zone volume (boundary) check, not streaming.

Best transferable idea: give every zone one authored id and a rectangle, build the registry once at load, and answer "which zone is this point in" with one inclusive box test that returns null outside every zone.
Decision (proposed): adapt - take the authored zone box plus one id and the null-outside rule as zone data; reject the node-name-keyed registry that shows a different name to the AI, the silent 100x100 fallback and the origin skip. Why for Frankendom: zones are data on one runtime, and the population caps in row 23 need one unambiguous zone id per point.
Acceptance: A server test loads a 9-zone table, asserts each spawn point and each test character position resolves to exactly one zone id (never the display name), a point in a gap returns null without error, and a zone with a missing rectangle fails the load.

## 1. Mechanism

- Zones are authored in the scene editor. Each zone is an `Area2D` in group `room_area` with two exports, `room_name` and `room_desc` (`RoomArea.gd` 3-4), and one `CollisionShape2D` with a `RectangleShape2D` (example: `Office.tscn` 16972, 16976-16977, 16745 for the 387x184 Meeting Room).
- Build (once, deferred at ready): `_ready` calls `call_deferred("_init_rooms")` (`RoomManager.gd` 9-10). For each node in the group, the centre is the Area2D global position plus the collision shape position (line 20); the size is `shape.extents * 2` for a rectangle (23), else 100x100 (24-25). A `RoomData` is made from the display name, centre, size and description (26) and stored under the node name, `area.name` (27).
- Lookup, order of steps: `get_current_room` walks the registry values in insertion order and returns the first zone for which `is_position_in_room` is true (30-35), else `null` (35). `is_position_in_room` rejects a null zone and a zone whose centre is exactly (0,0) (40). It takes left, right, top and bottom as centre minus and plus half the size (44-47), and tests with inclusive edges (50).
- Callers (read): `AIAgent.gd` 73 asks for the character's zone inside `generate_scene_description` (70-76) and writes `current_room.name` into the description (75); 142 uses the same point test for objects. The lookup moves nothing. Grep finds no other lookup callers in this donor; `GameSaveManager.gd` 100-107 reads the registry for saves (grep only).

## 2. Key functions

- `_init_rooms`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomManager.gd` 12-27. Builds the registry from the group.
- `get_current_room`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomManager.gd` 30-35. First match in insertion order; null otherwise.
- `is_position_in_room`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomManager.gd` 38-50. Centre plus or minus half size, inclusive; origin-centred zones skipped.
- Authored fields: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomArea.gd` 3-4 (`room_name`, `room_desc`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor-specific values |
|---|---|
| Zone box = centre plus or minus half size | Stored rectangle sizes in `Office.tscn`, e.g. 387x184 (16745) for the Meeting Room, centre (526.5, 516) (16976). Nine zones in total. |
| Inclusive point-in-box test, first match wins | No priority field; tree order decides overlaps. I computed the nine rectangles from the scene values and found no overlaps, but nothing in code enforces that. |
| Outside every zone returns null | Gaps are real: e.g. the Gym (y 232-417) and the Meeting Room (y 424-608) leave a 7 px band in y. Computed from the scene values, not read from code. |
| Fallback size for a non-rectangle shape | 100x100 (`RoomManager.gd` 25). No zone in the scene uses a non-rectangle, so this never runs. |
| Centre (0,0) means "no zone" | Literal origin (40). No zone sits at the origin in this scene. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (build once, then first-match inclusive box test, null outside). It omits the Godot node tree and the deferred ready call, the display-name export, and the debug print on every lookup (`RoomManager.gd` 31). It changes three things on purpose: zones are keyed by one id (not the node name, with the display name kept only for the UI), a missing or zero rectangle throws at load (not a silent 100x100), and a duplicate id throws. It also replaces the Vector2 type with plain numbers. It does not port the `extents` call, which is the thing to check in Godot.

```ts
{{TS}}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone lookup used to count population per zone). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer). Fit is weak: row 23 is the closest row (1-23) and this donor has no spawn logic at all; the mechanism only supplies the point-to-zone lookup that row 23's per-zone counts need.
- Reuse tag: adapt-from-idea (MIT, adaptation allowed; the sketch is a re-expression, not a copy)
- Brief rule served: zones as data (one runtime reads authored zone boxes); rule 7 licence (MIT, adapted shape only)

## 6. Gaps and risks

- Two names for one zone. The registry is keyed by node name (`RoomManager.gd` 27) and the AI sees node names in its room list (`AIAgent.gd` 1840, 1876, 1886). Other code uses the display name (75, 1956). At `AIAgent.gd` 1956 and 1961 the current room's display name is compared with node-name keys, so in this scene the current room is never excluded from the candidate list. Frankendom must use one zone id everywhere.
- `shape.extents` (`RoomManager.gd` 23): Godot 4 stores this property as `size` (the scene file does, `Office.tscn` 16745) and `extents` was the Godot 3 name. Not run. If Godot 4.4 has no `extents` on `RectangleShape2D`, line 23 fails on the first zone, `rooms` stays empty, and every lookup returns null, which the AI code reports as an unknown location. Check this in Godot before copying any number from it.
- The silent 100x100 fallback (25) would hide a missing or wrong shape. Frankendom should reject it at load.
- Outside-every-zone returns null (35). Row 23 counts need a rule for "in no zone" (a corridor is not a zone): this donor leaves it to the caller, and the AI treats it as unknown location.
- Origin skip (40) silently drops a zone centred exactly at (0,0). A data trap, not a feature.
- Overlaps resolve by tree order, with no check. The nine scene rectangles do not overlap (computed), so this donor never hits it.
- Scene-editor zones, not data files. The shape transfers (id, box, name, description) but the editor does not.
- Per-lookup scan over all zones, and a debug `print` on each call (31). Fine for nine zones; not a template for a large world.
- Not in this donor at all: zone streaming, per-zone spawn tables, zone transitions, respawn logic. The cell's other sub-topics have no code here.
