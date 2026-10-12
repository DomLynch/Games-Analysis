// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SUB = 50;             // subtile size in world units (donor: WM_SUBTILE_SIZE 50)
const SUB_PER_TILE_X = 7;   // subtiles per map tile across (donor: SUBTILE_GRID_WIDTH 7)
const SUB_PER_TILE_Y = 6;   // subtiles per map tile down (donor: SUBTILE_GRID_HEIGHT 6)
const RND_GAP_MS = 1500;    // minimum time between encounter rolls (donor: 1500)
const MIN_STEP = 3;         // minimum move on each axis before a roll (donor: 3)

enum Known { Unknown = 0, Known = 1, Visited = 2 }
type Fill = "none" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

class SubtileMap {
  readonly state: Uint8Array;
  constructor(readonly w: number, readonly h: number, readonly fill: Fill[]) {
    this.state = new Uint8Array(w * h);
  }
  private idx(x: number, y: number): number { return y * this.w + x; }
  private inside(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  // Known never downgrades Visited; Visited always wins.
  mark(x: number, y: number, s: Known): void {
    if (!this.inside(x, y)) return;
    const k = this.idx(x, y);
    if (s !== Known.Known || this.state[k] === Known.Unknown) this.state[k] = s;
  }

  // One walker step: a known ring around the walker, then the stood-on subtile becomes visited,
  // then a directional corridor for fills s and w (the only two fills the donor acts on).
  step(px: number, py: number, scout: boolean): void {
    const sx = Math.floor(px / SUB);
    const sy = Math.floor(py / SUB);
    const r = scout ? 2 : 1;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) this.mark(sx + dx, sy + dy, Known.Known);
    }
    this.mark(sx, sy, Known.Visited);
    const f = this.fill[this.idx(sx, sy)];
    if (f === "s") {
      // fix: the corridor runs to the grid edge; the donor stops at the tile edge here but crosses it for fill_w
      for (let y = sy - 1; y >= 0; y--) this.mark(sx, y, Known.Visited);
    } else if (f === "w") {
      for (let x = sx - 1; x >= 0; x--) this.mark(x, sy, Known.Visited);
    }
  }
}

// Encounter rolls: at most one per RND_GAP_MS, only after a move of MIN_STEP on both axes,
// and never while inside a city area.
class EncounterGate {
  private last = Number.NEGATIVE_INFINITY;
  // fix: the timer is stamped only when a roll is allowed (the donor stamps it before the distance and city gates)
  allow(nowMs: number, dx: number, dy: number, inCityArea: boolean): boolean {
    if (nowMs - this.last < RND_GAP_MS) return false;
    if (Math.abs(dx) < MIN_STEP || Math.abs(dy) < MIN_STEP) return false;
    if (inCityArea) return false;
    this.last = nowMs;
    return true;
  }
}

export {};
