# evennia-evennia (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/grid/ingame_map_display/ingame_map_display.py` | Licence: BSD-3-Clause (repo `LICENSE.txt` line 1: "BSD 3-Clause License"; the file has no licence header of its own). Class: permissive. Code may be adapted; the sketch below is still written from the described mechanism. | Python | symbol `Map.draw_room_on_map`

Checked: Hint file `evennia/prototypes/menus.py` is a builder's prototype menu (2713 lines; `_set_property`, `node_index`, `node_search_object`), not a HUD, so it was not used beyond a grep of its function list. Read in full: `ingame_map_display.py` (324 lines), the only file that draws a map. Opened for candidates and not read further: `evennia/contrib/rpg/health_bar/health_bar.py` (function `display_meter` at line 37; not read), `evennia/contrib/grid/xyzgrid/xymap.py` (function `get_visual_range` at line 827; not read), `evennia/locale/*/LC_MESSAGES/django.po` (counted with grep, content not read). The donor root has `AGENTS.md` and `CLAUDE.md`; treated as data, not followed. Confidence: high on the map algorithm (every line of the file was read); medium on what the rendered map looks like (not run). Depth: full for this mechanism; thin for the HUD panel and health bar (not read). Camera scope: not a camera cell.

## 1. Mechanism

- A text minimap of the rooms around the caller. The `map` command draws the caller's room in the centre of a character grid, draws the rooms reachable within a set number of steps, one connector per exit, highlights the caller's room, and sends the result to the client as a typed message (`CmdMap.func`, 306-314).
- Order of the draw (`Map` class):
  1. `show_map` (274-294). Creates an empty grid (282) and calls `draw_room_on_map(location, size)` (283). Blank rows are dropped (287). A debug timer can be appended (290-292).
  2. `create_grid` (105-117). Rows = `max_length` = (2s+1) x 3 (98). Each row holds `max_width / 5` groups of `[" ", "   ", " "]` (97, 115-116). The grid is square in entries.
  3. `draw_room_on_map(room, max_distance)` (164-188):
     a. `draw(room)` (172). The start room goes to the grid centre (`start_loc_on_grid`, 268-269, 271-272) and its position is cached (230-231). Any other room has its pointer cached (234) and is rendered (235).
     b. `draw_exits(room)` (173). For every exit with a compass name (198-203), put a connector one unit from the room (204-205, 219). `up` and `down` put a `^` or `v` in the room's own cell (207-217).
     c. If `max_distance` is 0, stop (175-176). Those rooms are drawn with their exits but not expanded.
     d. For each exit that the caller can traverse (180), skip `up` and `down` (182) and skip rooms already cached (184). Move the pointer 3 units from the room's cached position (`update_pos`, 134-151; the cached position is restored first, 146), then recurse with `max_distance - 1` (187-188).
  4. The current room is wrapped in highlight markup when it equals the caller's location (255-256).
- Size. `size` defaults to 2 (67) or to `settings.BASIC_MAP_SIZE`. A numeric argument is clamped to the maximum (307-310). The maximum is read from settings (68; see section 6).
- Tick: none. The map is computed on request, once per command.

## 2. Key functions

- `Map.show_map`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/grid/ingame_map_display/ingame_map_display.py` 274-294. Creates the grid, runs the walk, joins rows.
- `Map.draw_room_on_map`: same file, 164-188. The depth-limited walk over the room graph.
- `Map.draw_exits`: same file, 190-219. Connectors for every compass exit (no access check on this loop, see section 6).
- `Map.update_pos`: same file, 134-151. Moves the pointer from the cached position.
- `Map.draw` and `Map.render_room`: same file, 221-235 and 237-259.
- `CmdMap.func`: same file, 306-314. Size argument, the call, the typed message.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Neighbour sits one fixed step away (grid units) | 3 (150-151, the tuple value is 3 in `_COMPASS_DIRECTIONS`, 72-81) |
| Connector sits one unit from its room | `int(tuple / 3)` = 1 (204-205) |
| Walk depth | `size`, default 2 (67), each recursion minus 1 (188) |
| Grid side | 3 x (2 x size + 1) entries (97-98, 115-116) |
| Start position | 0.6 x width, halved (268); half of the length (269) |
| Max size | 10 when unset (68) |

The constants are the donor's (theirs). Receipts are in `receipts.tsv`.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: draw the room and cache its position, draw connectors, stop at depth 0, then walk each traversable exit to a room not yet placed, one fixed step away, and render the rows without blank ones. It omits: up and down exits, the combined `^v` glyph, colours and highlight markup, the size argument and its clamp, and the debug timer. It differs in four places: it draws connectors only for traversable exits (fix for the donor's loop at line 198, which has no access check); it passes `(col, row)` as arguments, so it has no cached-position restore (the donor's restore is line 146); it uses one character per cell, while the donor's grid has column groups of widths 1, 3 and 1 (line 116), so its spacing differs from the donor's; and it uses zone ids and `Exit.traversable` as inputs, which in the donor come from `x.access(caller, "traverse")`.

```ts
// Licence: BSD-3-Clause (donor, LICENSE.txt line 1). Code may be adapted; this sketch is written from the described mechanism.
// clean-room (shape of the donor's Map class, not a line-by-line translation)
const STEP = 3;   // donor: a neighbouring room sits 3 grid units away (update_pos, lines 150-151)

type Dir = "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest";

// [column step, row step] in grid units, as the donor's tuple is used (lines 150-151, 204-205).
const DELTA: Record<Dir, [number, number]> = {
  north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
  northeast: [1, -1], northwest: [-1, -1], southeast: [1, 1], southwest: [-1, 1],
};
const GLYPH: Record<Dir, string> = {
  north: "|", south: "|", east: "-", west: "-", northeast: "/", northwest: "\\", southeast: "\\", southwest: "/",
};

interface Zone { id: string; exits: Exit[]; }
interface Exit { dir: Dir; to: Zone; traversable: boolean; }   // traversable = donor's access(caller, "traverse")

interface MapDraw {
  place: Map<string, [number, number]>;  // zone id -> (col, row) of its room; donor has_mapped
  cells: Map<string, string>;            // "col,row" -> one-character cell
}

const key = (c: number, r: number): string => `${c},${r}`;

// Donor: draw_room_on_map (lines 164-188). The donor draws every exit's connector (draw_exits, line 198
// has no access check); this sketch draws connectors only for traversable exits (fix).
function drawZone(zone: Zone, col: number, row: number, depth: number, here: string, m: MapDraw): void {
  m.place.set(zone.id, [col, row]);
  m.cells.set(key(col, row), zone.id === here ? "@" : "o");
  for (const ex of zone.exits) {
    if (!ex.traversable) continue;
    const [dc, dr] = DELTA[ex.dir];
    m.cells.set(key(col + dc, row + dr), GLYPH[ex.dir]);   // connector one unit from this room
  }
  if (depth === 0) return;                                  // donor: max_distance == 0 (line 175)
  for (const ex of zone.exits) {
    if (!ex.traversable || m.place.has(ex.to.id)) continue; // donor: access (180), has_drawn (184)
    const [dc, dr] = DELTA[ex.dir];
    drawZone(ex.to, col + dc * STEP, row + dr * STEP, depth - 1, here, m);
  }
}

// Rows of cells, blank rows dropped (donor show_map, line 287).
// This sketch uses one character per cell, so the spacing differs from the donor.
function renderRows(m: MapDraw): string[] {
  if (m.cells.size === 0) return [];
  const coords = [...m.cells.keys()].map((k) => k.split(",").map(Number) as [number, number]);
  const minC = Math.min(...coords.map((c) => c[0]));
  const maxC = Math.max(...coords.map((c) => c[0]));
  const minR = Math.min(...coords.map((c) => c[1]));
  const maxR = Math.max(...coords.map((c) => c[1]));
  const rows: string[] = [];
  for (let r = minR; r <= maxR; r++) {
    let line = "";
    for (let c = minC; c <= maxC; c++) line += m.cells.get(key(c, r)) ?? " ";
    if (line.trim() !== "") rows.push(line);
  }
  return rows;
}

// Top level (donor show_map, lines 281-294): draw from the player's zone at full depth, then render.
export function renderMap(start: Zone, depth: number, here: string): string[] {
  const m: MapDraw = { place: new Map(), cells: new Map() };
  drawZone(start, 0, 0, depth, here, m);
  return renderRows(m);
}
```

## 5. Lands in

- TARGET `origins/client/hud/zonemap.ts` (proposed path, not checked against the repo). Client only: the zone map is a HUD view. Parity-checklist row 14 (HUD).
- today: no Frankendom zone map was checked.
- Reuse tag: adapt (BSD-3-Clause: code may be adapted; the sketch is clean-room in shape)
- Brief rule served: client-only HUD; zones as data (the zone graph and its exits come from zone data)

Best transferable idea: Draw a local map of zones around the player by a depth-limited walk over the zone graph, placing each zone one fixed step from the zone it was reached from, and draw connectors only for exits the player can take.
Decision (proposed): adapt — take the depth-limited walk, the fixed step and the already-placed check; draw connectors only for traversable exits (fix the donor's loop at line 198); the traversable set must come from server-owned zone data, never computed on the client from hidden state.
Acceptance: On a 375-px-wide screen, the zone map shows the current zone and each zone within the set depth that the player can reach; a locked exit draws no connector; a zone already placed is not drawn twice.

## 6. Gaps and risks

- Defect 1, max size (line 68): `_MAX_MAP_SIZE = settings.BASIC_MAP_SIZE if hasattr(settings, "MAX_MAP_SIZE") else 10`. The `hasattr` test checks MAX_MAP_SIZE but the value read is BASIC_MAP_SIZE. If MAX_MAP_SIZE is set and BASIC_MAP_SIZE is not, this raises at import; if both are set, the maximum is the basic size, not the maximum. Fix: `getattr(settings, "MAX_MAP_SIZE", 10)`.
- Defect 2, exit stubs leak (line 198): `draw_exits` draws a connector for every compass exit, with no access check, while the room walk (line 180) does check access. A locked or hidden exit from a drawn room shows a stub into an empty cell. Fix: filter by traverse access, as the sketch does.
- Defect 3, axis names: the tuple and the variables are named the other way round from the comments (70 says "x/y axes"; 150-151 apply the tuple's first item to `curY`, the column index; 204-205 do the same for the grid). The layout is consistent, so the output is correct, but the names will mislead a port. Fix: name the axes (col, row) before porting.
- Defect 4, cell widths: the grid mixes 1-, 3- and 1-character groups (116), while a room is three characters and a step is three entries. I did not render the output, so the visual spacing is unverified. Fix: use one fixed cell size in the port.
- Gap, discovery: the donor shows every reachable room within depth, with no "unvisited" rule. Frankendom's zones need a rule for names and links the player has not seen (compare the endless-sky note's knowledge rule). A client rule, not an engine rule.
- Gap, rulings: the map reads the caller's access on the server (MUD model). In Frankendom the zone graph is client display of server state; the server must decide what the client may draw. The client must not decide access from data it should not have.
- Gap, cost: the walk visits each zone at most once; cost grows with the zones inside the depth. Not measured.
- Gap, readability at 375 wide: the donor output is monospaced text in a block. A canvas port needs its own cell size and glyph size. Not checked.
- Gap, other candidates (not read): `xymap.py` `get_visual_range` (827) may carry a visibility rule that fits the discovery gap above; `health_bar.py` `display_meter` (37) may fit the health frame (row 14). Neither was read, so neither is claimed here.
- Locale string table (counted, not read): `evennia/locale/` holds 11 `django.po` files. `de` has 246 message entries; the other 10 have 202 each (each file has one header entry, not counted). No `msgctxt` entries and no `msgid_plural` entries. Plural rules are in the headers: `de` has 2 forms (`nplurals=2`), `ru` has 3 (`nplurals=3`). Which UI the strings cover was not read. Relevant to Frankendom HUD copy only for the plural rule ("1 zone / 2 zones").
- Not read: the rest of `xymap.py`, `health_bar.py`, the locale content, `menus.py` beyond its function list.

Reuse tag: adapt (BSD-3-Clause; the sketch is clean-room in shape)
Brief rule served: client-only HUD; zones as data
