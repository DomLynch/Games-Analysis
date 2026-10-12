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
// simplified: the donor draws 3-character rooms on a grid whose column groups are 1, 3 and 1 characters wide (create_grid, line 116).
// This sketch uses one character per cell, so the spacing differs from the donor. It passes (col, row) as arguments, so
// it has no backtracking step (the donor restores the cached position in update_pos, line 146). It omits up/down exits, the
// "[^v]" combined glyph, colours and the size argument clamp (line 310).
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
