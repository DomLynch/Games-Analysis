# evennia-evennia (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/grid/mapbuilder/mapbuilder.py` (primary, `build_map` 306-405) with `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/grid/ingame_map_display/ingame_map_display.py` (minimap fold-in) | Licence: BSD 3-Clause (repo `LICENSE.txt`, line 1: "BSD 3-Clause License"; copyright Griatch and Gregory Taylor) | Python (Evennia contrib) | symbol `build_map`

Checked: Candidate files opened (4): mapbuilder/mapbuilder.py (read 1-80, 116-135, 184-187, 219-291, 292-405, 500-515), ingame_map_display/ingame_map_display.py (read 1-40, 67-296 in full), mapbuilder/tests.py (grep only: legend lines 100-103), and the donor's `LICENSE.txt` (line 1). The defect in the legend was checked by a one-line Python run on the VPS (a dict with tuple keys and string keys, matched against single characters; no file written). Confidence: high on the build loop, the exit pass and the tuple-key defect; medium on the example road builder failing at run time (inferred from the code, not run); the minimap is read end to end but its geometry on looped maps is not run. NOT read: `xyzgrid/xymap.py` and `xyzgrid/xymap_legend.py` (a second ASCII-legend system, 2,369 lines together; not claimed here), `wilderness/wilderness.py` (786 lines), the body of the mapbuilder tests. Camera scope: n/a.

Best transferable idea: A zone's layout can be a short text grid with one character per tile, a legend from each character to a builder, one row-order scan that creates the tiles, a second scan that wires connections between tiles that already exist, and automatic two-way N/E/S/W links.
Decision (proposed): adapt - take the text-grid layout, the flat character legend and the two-scan create-then-wire order for zone layouts (zones as data); the legend must be single characters and validated at load (the donor's tuple keys are broken); drop the donor's one-database-object-per-room model, since Frankendom keeps tiles in a typed array on the server.
Acceptance: A town zone is authored as a text grid in its zone file; a server test loads it, refuses a legend key that is more than one character at load, and asserts a road tile on the grid edge produces no exit and no crash; the client minimap shows only rooms the player can traverse.

## 1. Mechanism

- Input: a map string, split into rows on newlines (mapbuilder.py 303), and a legend mapping trigger characters to build functions (example at 184-187 and 271-274). A character with no legend entry (spaces, water in the example) is skipped.
- Order of steps, as `build_map` runs them (306-405):
  (a) Passes: `for iteration in range(iterations)` (337). `iterations` is 1 by default and 2 with the `/two` switch (508-512).
  (b) Scan: rows top to bottom (`y`), then columns left to right (`x`) (338-339). For each cell, every legend key is compared to the character (340-342); a match calls the build function with `x`, `y`, the pass number, the caller and the dictionary of rooms made so far (343-345).
  (c) Only in pass 0 is the returned room stored at `room_dict[(x, y)]` (346-347). Build functions can return None; the stored value is then None.
  (d) Exits, only if `build_exits` (349): for every stored room (352), create a north exit if the north cell is stored (357-366), then east (368-377), south (379-388), west (390-399). Each room creates its own links, so two adjacent rooms get an exit in both directions.
- Switches (command, 500-515): no switch = one pass with automatic exits; `/one` = one pass, no automatic exits (508); `/two` = two passes, no automatic exits (511-512). The `/two` mode is what the road example uses: pass 0 makes rooms, pass 1 makes exits by reading `room_dict` for the neighbours (239).
- Minimap fold-in (ingame_map_display.py, `Map` class): the map is drawn on demand from the current room. A depth-limited recursive walk follows the exits the caller can traverse (180), skips up and down (182), skips rooms already drawn (184), and recurses with depth minus one (188). Each room is placed by adding compass deltas to a pointer (150) and stored when first drawn (234). Exits are drawn as one-character markers in the slot between two rooms (219).

## 2. Key functions

- `build_map`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/grid/mapbuilder/mapbuilder.py` 306-405. Pass loop 337-347, exit pass 349-399.
- `CmdMapBuilder.func` switches: mapbuilder.py 500-515.
- Example road builders (the grammar in use): mapbuilder.py 233-252 (vertical `|`, two exits) and 254-270 (horizontal `-`, two exits). Both return without action on pass 0 (236, 257).
- Example forest builder: mapbuilder.py 219-231 (returns None on pass 1 and later, 222).
- Minimap `Map.draw_room_on_map`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/grid/ingame_map_display/ingame_map_display.py` 164-188. `Map.draw` 221-235 and `Map.show_map` 274-295 (not re-read after 296).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One scan creates a tile for each legend character, in row order | Row order and legend lookup (theirs: mapbuilder.py 337-347) |
| Second scan wires neighbours that already exist | Passes: 1 by default, 2 with `/two` (theirs: 508-512) |
| Two-way N/E/S/W links between adjacent tiles | Four directions, no diagonals in the builder (theirs: 357-399) |
| Minimap: search depth limits how far the map is drawn | Default depth 2 unless the setting is given (theirs: ingame_map_display.py 67, `_BASIC_MAP_SIZE`) |
| Minimap grid: rooms sit three slots apart with a one-slot connector | Step 3 per compass delta (theirs: ingame_map_display.py 72-81, `_COMPASS_DIRECTIONS`); slot grid side 3 x (2 x depth + 1), i.e. 15 at the default depth (computed from 97 and 67, not run) |
| Minimap start cell at the centre of the grid | Start x = int((0.6 x max_width - 1) / 2) (theirs: 268); with the default depth this is 7 of 0-14 (computed, not run) |

## 4. TypeScript sketch

simplified: the sketch keeps the create-then-wire order, the row-major scan, the one-builder-per-character legend, the create-only-in-pass-0 rule, and the two-way N/E/S/W links. It changes three things the donor gets wrong or leaves open: the legend keys are validated (a key must be one character; the donor's tuple keys never match), a missing neighbour is skipped (the donor's road builder looks it up and fails), and the grid is read by UTF-16 index (fine for the BMP characters in the examples; the donor indexes by Python code point). It omits the donor's multi-key match (more than one legend key may build on one cell), the caller messages, the Evennia exit and room objects, the minimap, and the switch parsing.

```ts
// Licence: BSD-3-Clause (donor, evennia LICENSE.txt). Re-expressed here as a clean sketch of the mechanism (not a line translation).
// clean-room
type Builder = (x: number, y: number, pass: number, cells: Map<string, Room | null>) => Room | null;

interface Room {
  id: string;
  kind: string;
  exits: Record<string, string>; // direction -> neighbour id
}

const key = (x: number, y: number): string => `${x},${y}`;

// The donor's legend keys are sometimes tuples such as ("♣", "♠"), which never equal a single character.
// Here every key must be exactly one character; anything else is rejected at load time.
function validateLegend(legend: Record<string, Builder>): void {
  for (const k of Object.keys(legend)) {
    if ([...k].length !== 1) throw new Error(`legend key must be one character: "${k}"`);
  }
}

// Scan rows in order. Pass 0 creates rooms; later passes can wire roads between rooms that already exist.
// Characters with no legend entry (spaces, water) are skipped.
function buildLayout(rows: string[], legend: Record<string, Builder>, passes: number, autoExits: boolean): Map<string, Room> {
  validateLegend(legend);
  const cells = new Map<string, Room | null>();
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const build = legend[rows[y][x]];
        if (build === undefined) continue;
        const room = build(x, y, pass, cells);
        if (pass === 0) cells.set(key(x, y), room);
      }
    }
  }

  // Automatic N/E/S/W exits between adjacent rooms; each room lists its own neighbours, so links are two-way.
  const rooms = new Map<string, Room>();
  for (const [k, room] of cells) {
    if (room) rooms.set(k, room);
  }
  if (autoExits) {
    const steps: [string, number, number][] = [["north", 0, -1], ["east", 1, 0], ["south", 0, 1], ["west", -1, 0]];
    for (const [k, room] of rooms) {
      const [sx, sy] = k.split(",").map(Number);
      for (const [dir, dx, dy] of steps) {
        const neighbour = rooms.get(key(sx + dx, sy + dy));
        if (neighbour) room.exits[dir] = neighbour.id;
      }
    }
  }
  return rooms;
}

export {};
```

## 5. Lands in

- TARGET `origins/zones/layout-grid.ts` (proposed new module, does not exist yet): compiles a zone's text layout into the zone's tile and link arrays at load, on the server. Parity-checklist row 20 (catalogue as runtime source): the layout text and its legend are read from zone data at runtime. Row 20 is the one row cited.
- Reuse tag: rewrite-from-idea (BSD 3-Clause: code may be adapted with the notice kept; this sketch is clean-room)
- Brief rule served: addendum rules 2, 3 and 5; zones as data (the layout is data on one runtime)

## 6. Gaps and risks

- Legend keys are broken in the donor. The examples use tuple keys (mapbuilder.py 185 `("♣", "♠"): example1_build_forest,` and 272 `("♣", "♠"): example2_build_forest,`), and the docstring at 13 shows the same form. The match at 342 compares one character with the key, so a tuple never matches. Checked by a one-line Python run on the VPS: the tuple key matched nothing and the string key `"c"` matched. Consequence: in EXAMPLE1 the forest and the mountains never build; only the temple (`("▲")` is a plain string, line 187) builds. The test legend (tests.py 100-103) has the same keys. Fix: normalise each key to its characters at load and refuse multi-character keys (the sketch's `validateLegend`).
- The road builder looks up its neighbours without a check (mapbuilder.py 239-240 and the horizontal one at 260-261). If the neighbour cell was never stored, the lookup raises KeyError. As shipped, the forest tiles are not stored (tuple key), so the vertical and horizontal road examples would look up missing cells (inferred from the code, not run). Fix: a bounds and presence check, skipping the link when the neighbour is missing.
- Pass 0 is the only pass that stores rooms (346-347). A tile cannot be added or replaced in pass 1. That is a fine rule for Frankendom if written down; it is the reason the two-scan order works.
- Evennia model: each tile is a database object (`create_object(rooms.Room, ...)` in `example1_build_forest`, mapbuilder.py 116-130, not re-read line by line). Frankendom keeps tiles in typed arrays on the server; the donor's object model does not transfer.
- The donor has no landmark, no signage and no building variety beyond the legend characters, so those parts of the topic are NONE in this donor. The "road grammar" is only a `|` tile that links the rooms north and south and a `-` tile that links east and west (233-270). The "hub placed one at a time" idea is the scan order: each build call sees the rooms made before it.
- Minimap (fold-in, not the main verdict): it is a depth-limited walk from the current room, with a visited set (184). Positions come from adding compass deltas along the first path that reaches a room (150, 234). On a loop, a room reached again by a second path keeps its first position, so the drawn geometry can disagree with the real exits (inferred from the code, not run). Fix: store each room's coordinates in the layout grid and draw from those, not from a path walk. The access gate (180: only exits the caller can traverse are drawn) is worth keeping as the fog-of-war rule for a Frankendom town map.
- The minimap has no timers and no delta time, so none of the frame-count defects of the Endless Sky minimap apply here.
- Not read: `xyzgrid/xymap.py` and `xymap_legend.py` (a second ASCII-legend system that may hold the in-game map for the xyz grid) and `wilderness/wilderness.py`. If Lead wants a second donor for the same idea, read xymap next.

Reuse tag: rewrite-from-idea (BSD 3-Clause; the sketch is clean-room)
Brief rule served: addendum rules 2, 3 and 5; ruling: zones as data on one runtime
