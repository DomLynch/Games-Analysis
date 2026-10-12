# KsanaDock-Microverse (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomManager.gd` (with `script/ai/AIAgent.gd`, `script/RoomData.gd`, `script/RoomArea.gd`, `script/Desk.gd`, `scene/maps/Office.tscn`) | Licence: MIT (`LICENSE`, "Copyright (c) 2025 KsanaDock"; code may be adapted) | GDScript (Godot 4) | symbol `RoomManager.get_current_room`

Checked: Read in full: `script/RoomManager.gd` (all 56 lines), `script/RoomArea.gd`, `script/RoomData.gd`, `script/Desk.gd` (all 43 lines), the room rectangles of `scene/maps/Office.tscn` (the nine `room_area` nodes and their shapes, read from the file). Read in part: `script/ai/AIAgent.gd` 66-200 (scene description, object and character lookups, compass helper, environment text); the other room loops at 1343, 1650, 1875 and 1960 were not read. Not read: `script/Chair.gd`, `script/RoomData.gd` consumers beyond AIAgent, `GameSaveManager.gd` (only the lookup at line 100 was seen by grep), the object-info helper (AIAgent 220), the drawing of the map (no code found). Candidates opened: the hint file `scene/maps/Office.tscn` (scene data, read by section), `script/RoomManager.gd`, `script/ai/AIAgent.gd`, `script/Desk.gd`, `script/RoomData.gd`. Overlap check: computed by hand from the nine rectangles (centre ± half size); no two rooms overlap, so first-match order does not change the result on this map. Confidence: moderate. The mechanism is a small room-as-rectangle layer that feeds a text map (current room, room list with bearing and distance, occupants). It is a minimap and signage layer, not a town layout generator. camera_scope: n/a.

## 1. Mechanism

- Rooms are `Area2D` nodes in the group `room_area`, each with exported `room_name` and `room_desc` and one `CollisionShape2D` (`scene/maps/Office.tscn`: nine room areas, all `RectangleShape2D`, group tag on each node). `RoomManager._init_rooms` (deferred from `_ready`, RoomManager.gd 12-27) builds one `RoomData` per area: centre = area global position + the shape's local position (20); size = `extents * 2` for a rectangle (23), otherwise a 100 by 100 default (25). Rooms are stored keyed by node name (27).
- Point test: `is_position_in_room` (38-50) builds the four edges from centre and size and tests inclusive bounds (50). A room whose centre is exactly (0, 0) is treated as no room (40).
- Current room: `get_current_room` (30-35) returns the first room in dictionary value order whose rectangle contains the point; otherwise null.
- Scene text for the AI (`AIAgent.generate_scene_description`, 66-130): the current room name and description; the environment line; the objects in the room (`get_room_objects`, 137-146: group `interactable`, point test per object); the characters in the room; then a map section (107-125) for every room: centre, bounds, distance from the character to the room centre (109), compass direction (`get_direction_description`, 159-179), and the characters inside each room.
- Compass: `direction = to_pos - from_pos` (160), `angle = rad_to_deg(direction.angle())` (161), eight 45-degree sectors with boundaries at ±22.5 (east, 163) and labels for north at 67.5 to 112.5 (167). The vector is in screen coordinates, where +y points down.
- Furniture depth (`Desk.gd`): a 0.1 s timer (13) re-sorts the desk against characters and chairs whose y is within `y_threshold` (4, 27). Each character in range sets the desk z to that character's z plus or minus 1 (30), so the last character in range wins; chairs use max and min (40).

## 2. Key functions

- `RoomManager._init_rooms`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/RoomManager.gd` 12-28.
- `RoomManager.get_current_room`: same file, 30-35. `RoomManager.is_position_in_room`: same file, 38-50.
- `AIAgent.generate_scene_description`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/AIAgent.gd` 66-130 (map section 107-125).
- `AIAgent.get_room_objects`: same file, 137-146. `AIAgent.get_direction_description`: same file, 159-179.
- `Desk._update_z_order`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/Desk.gd` 1-43 (timer 13, loops 27-40).
- Room rectangles: `/mnt/frankendom-donors/KsanaDock-Microverse/scene/maps/Office.tscn` (sub-resources 16744-16770; node blocks 16970-17050).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Room as a centred rectangle; inclusive point test; first match | Nine rectangles, e.g. Office 512 by 405 at (896, 213.5) (Office.tscn 16757, 17012) |
| Room list with distance and one of eight compass sectors | Sector width 45 degrees, boundaries at ±22.5 (AIAgent.gd 163-167) |
| Distance from the character to each room centre | Units are pixels; the donor's text says metres (AIAgent.gd 109 and the metres label in the text section) |
| Furniture depth by y, within a band | Band 32 (Desk.gd 4); re-sort every 0.1 s (13) |
| Default size for a non-rectangle room | 100 by 100 (RoomManager.gd 25) |

## 4. TypeScript sketch

simplified: the sketch keeps the inclusive rectangle test, the first-match room lookup, the eight-sector compass and a per-room list with distance and direction. It fixes the north and south sign (screen y points down, so north is negative y), sorts the list nearest first (the donor keeps dictionary order), labels distances in pixels, and removes the zero-centre sentinel and the 100 by 100 default (a room must carry its size). It omits the Godot node reading and the group query, occupant lists, object lookups, the Desk depth sort, the AI prompt wording and the Chinese text. Overlap is not checked in code; the shipped map has none.

```ts
// Licence: MIT (donor, KsanaDock). Sketch written from the described mechanism; not a translation of the donor lines.
interface Vec2 { x: number; y: number }

// A room is an axis-aligned rectangle given by its centre and full size (rows in the map data).
interface Room { id: string; name: string; centre: Vec2; size: Vec2 }

// Inclusive point-in-rectangle test, as in the donor.
export function inRoom(p: Vec2, r: Room): boolean {
  const left = r.centre.x - r.size.x / 2;
  const right = r.centre.x + r.size.x / 2;
  const top = r.centre.y - r.size.y / 2;
  const bottom = r.centre.y + r.size.y / 2;
  return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
}

// First match in list order, as in the donor. The shipped map has no overlapping rooms (checked from its rectangles).
export function currentRoom(rooms: Room[], p: Vec2): Room | null {
  for (const r of rooms) {
    if (inRoom(p, r)) return r;
  }
  return null;
}

export type Compass = "E" | "NE" | "N" | "NW" | "W" | "SW" | "S" | "SE";

const SECTORS: readonly Compass[] = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];

// Eight 45-degree sectors centred on the compass points.
// Fix: screen y points down, so north (up on the map) is negative y. The donor labels +y as north.
export function compass(from: Vec2, to: Vec2): Compass {
  const deg = (Math.atan2(-(to.y - from.y), to.x - from.x) * 180) / Math.PI;
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  return SECTORS[idx];
}

export interface MinimapRow { name: string; distancePx: number; direction: Compass }

// Minimap list: every room, nearest first. Distances are pixels (the donor's text says metres).
export function minimapRows(rooms: Room[], from: Vec2): MinimapRow[] {
  return rooms
    .map((r) => ({
      name: r.name,
      distancePx: Math.hypot(r.centre.x - from.x, r.centre.y - from.y),
      direction: compass(from, r.centre),
    }))
    .sort((a, b) => a.distancePx - b.distancePx);
}

export {};
```

Typecheck: copied to the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/client/minimap.ts` (new, proposed; not checked against the Frankendom repo): a client-only minimap and hub list fed by zone data rows (name, centre, size). The room rectangles are data; the list is HUD.
- Parity row 14 (HUD). The parent's hint was row 23, but row 23 is zone population and this is a HUD minimap, so row 14 is the honest fit. Flagged for Lead to confirm.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written from the mechanism)
- Brief rule served: the camera, HUD and sound are client-only (the minimap reads zone data but decides no rules); zones as data on one runtime (rooms are rows).

Best transferable idea: a minimap list that gives, for each named place in the zone, its nearest-first distance and one of eight compass sectors from the player, with the current place found by a first-match rectangle test.
Decision (proposed): adapt — take the rectangle places, the first-match lookup and the nearest-first compass list as a HUD minimap; fix the north and south sign and the pixel label; reject the AI prompt use, since Frankendom has no text map for an AI.
Acceptance: at 375 px wide the minimap lists every room nearest first with a compass letter and a pixel distance; standing in the Office shows "Office" as the current room; a unit test asserts that a place above the player on the map gets N.

## 6. Gaps and risks

- MIT: adapt allowed; the sketch is still written from the mechanism.
- Defect 1, north and south: the sector labels treat +y (screen down) as north (AIAgent.gd 163-167, the 67.5 to 112.5 band is labelled north). If the map is drawn with north up, the labels are inverted. The map's orientation convention is not in the code (not read); check it against the art before porting. Fix: negative y is north (sketch `compass`).
- Defect 2, units: the distance is in pixels, labelled metres in the text (AIAgent.gd 109). Fix: label units from the map scale, or keep pixels and say so.
- Defect 3, sentinels: a zero room centre is treated as no room (RoomManager.gd 40); a non-rectangle room gets a 100 by 100 default (25). A room with a missing shape is silently mis-sized. Fix: require a rectangle or fail the data load.
- Defect 4, first match: overlapping rooms resolve by dictionary order (RoomManager.gd 32). None overlap in the shipped map, but nothing enforces it. Fix: validate overlap at load and make the priority explicit.
- Per-call print: `get_current_room` prints the position on every call (RoomManager.gd 31). Harmless in a prototype; remove before any client build.
- Client-only: the room lookup runs on the client and the AI reads it. For Frankendom, any rule that depends on a room (who is inside a hub, a guard zone) must be computed by the server from its own position; the minimap only displays it.
- Furniture depth sort (Desk.gd): a 2D sprite-order rule (y band of 32, last character in range wins, chairs max and min). It transfers only to a 2D or side-view layer; it does not transfer to a 3D third-person camera. Not written up; the order-dependence is a defect if reused.
- Not read: `Chair.gd`, the other room loops in AIAgent.gd (1343, 1650, 1875, 1960), object info (220), `GameSaveManager.gd` beyond the grep line, and the scene's non-room nodes.
