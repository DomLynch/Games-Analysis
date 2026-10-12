// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const CELL = 50;      // world units per grid cell (donor: 50)
const COLS = 28;      // one constant for width (fix: donor array is 29 wide, reveal clamps at 28)
const ROWS = 30;      // one constant for height (fix: donor array is 31 tall, reveal clamps at 30)
const SEEN_NEAR = 1;  // revealed by walking nearby
const WALKED = 2;     // stood on at least once; never reset to SEEN_NEAR

interface Section { name: string; x: number; y: number; mapIdx: number; mapFile: string; knownVar: number; known: boolean; }
interface Hub { name: string; col: number; row: number; gateVar: number; sections: Section[]; firstVisit: boolean; }

class FogGrid {
  readonly cells: Uint8Array;
  constructor(readonly oceanEdge: number[], readonly cols: number = COLS, readonly rows: number = ROWS) {
    this.cells = new Uint8Array(cols * rows);
  }
  at(col: number, row: number): number {
    return this.cells[row * this.cols + col];
  }
  // A walker marks its own cell WALKED and every cell in a square around it SEEN_NEAR,
  // except cells already WALKED. Scout widens the square from radius 1 to radius 2.
  reveal(x: number, y: number, scout: boolean): void {
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    this.cells[row * this.cols + col] = WALKED;
    const r = scout ? 2 : 1;
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        const c = col + dc;
        const rr = row + dr;
        if (c < 0 || rr < 0 || c >= this.cols || rr >= this.rows) continue; // edge clamp
        const i = rr * this.cols + c;
        if (this.cells[i] !== WALKED) this.cells[i] = SEEN_NEAR;
      }
    }
    // Ocean rule: cells left of this row's edge column are treated as walked.
    if (col <= this.oceanEdge[row]) {
      for (let c = 0; c < this.oceanEdge[row]; c++) this.cells[row * this.cols + c] = WALKED;
    }
  }
}

// Gate hubs and sections from world flags. A hub is shown when its gate flag is exactly 1;
// each section is known when its flag is non-zero; the first section is forced known with its hub.
function syncFromFlags(hubs: Hub[], flags: number[], grid: FogGrid): void {
  for (const hub of hubs) {
    for (const s of hub.sections) {
      if (s.knownVar === 0) break;
      s.known = flags[s.knownVar] !== 0;
    }
    if (flags[hub.gateVar] === 1) {
      if (grid.at(hub.col, hub.row) === 0) grid.cells[hub.row * grid.cols + hub.col] = SEEN_NEAR;
      hub.firstVisit = true;
      if (hub.sections.length > 0) hub.sections[0].known = true;
    }
  }
}

// Map a world position to the hub whose cell contains it (cell = floor(position / CELL)).
function hubAt(hubs: Hub[], x: number, y: number): Hub | undefined {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  return hubs.find((h) => h.col === col && h.row === row);
}

// Fast travel is allowed only to hubs visited at least once; the target is the hub's cell centre.
function travelTarget(hub: Hub): { x: number; y: number } | null {
  if (!hub.firstVisit) return null;
  return { x: CELL * hub.col + CELL / 2, y: CELL * hub.row + CELL / 2 };
}

// Labels and section buttons appear only for discovered hubs and known sections.
function labelVisible(hub: Hub): boolean { return hub.firstVisit; }
function visibleSections(hub: Hub): Section[] { return hub.sections.filter((s) => s.known); }

export {};
