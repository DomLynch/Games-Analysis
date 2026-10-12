// clean-room: written from the described mechanism (per-target grace areas by state,
// no-overlap pass, priority layers, press versus long press, drag-release commit).
// Donor licence MIT (source code); no line is translated.

export enum Priority { None = 0, Low = 1, High = 2 }

export interface Grace { up: number; right: number; down: number; left: number; priority: Priority; }
export const NO_GRACE: Grace = { up: 0, right: 0, down: 0, left: 0, priority: Priority.None };

// Facts about one tile (data). radius = inside a move or attack radius that is not the attack type.
export interface TileFacts {
  radius: boolean;
  message: boolean;
  attackable: boolean;
  ownUnit: boolean;               // own unit, or the selected unit
  ownBuildingUnderConstruction: boolean;
  buildingSpaceAboveFree: boolean; // no own building and no own unit above
}

// Grace in px by what the tile holds (donor values, kept as data).
export const GRACE_PX = { radius: 4, message: 1, attackable: 6, unit: 6, buildingUp: 12, buildingSide: 6 };

export function graceFor(t: TileFacts): Grace {
  if (t.radius) return { up: GRACE_PX.radius, right: GRACE_PX.radius, down: GRACE_PX.radius, left: GRACE_PX.radius, priority: Priority.Low };
  if (t.message) return { up: 1, right: 1, down: 1, left: 1, priority: Priority.High };
  if (t.attackable) return { up: GRACE_PX.attackable, right: GRACE_PX.attackable, down: GRACE_PX.attackable, left: GRACE_PX.attackable, priority: Priority.High };
  if (t.ownBuildingUnderConstruction) {
    const up = t.buildingSpaceAboveFree ? GRACE_PX.buildingUp : GRACE_PX.buildingSide;
    return { up, right: GRACE_PX.buildingSide, down: GRACE_PX.buildingSide, left: GRACE_PX.buildingSide, priority: Priority.Low };
  }
  if (t.ownUnit) return { up: GRACE_PX.unit, right: GRACE_PX.unit, down: GRACE_PX.unit, left: GRACE_PX.unit, priority: Priority.High };
  return NO_GRACE;
}

type Side = 'up' | 'right' | 'down' | 'left';
// [dx, dy, side of this tile, side of the other tile]: edge and corner neighbours.
const NEIGHBOURS: Array<[number, number, Side, Side]> = [
  [-1, 0, 'left', 'right'],
  [0, -1, 'up', 'down'],
  [-1, -1, 'left', 'right'],
  [1, -1, 'right', 'left'],
];

// No-overlap pass. Reads the original grace of every tile, then cuts both sides wherever two
// expansions meet. Pure: no tile is written through another tile's array.
export function resolveGrace(tiles: ReadonlyMap<string, Grace>): Map<string, Grace> {
  const out = new Map<string, Grace>();
  for (const [key, g] of tiles) out.set(key, { ...g });
  for (const [key, g] of tiles) {
    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy, mine, theirs] of NEIGHBOURS) {
      const otherKey = `${x + dx},${y + dy}`;
      const other = tiles.get(otherKey);
      if (other && g[mine] > 0 && other[theirs] > 0) {
        out.get(key)![mine] = 0;
        out.get(otherKey)![theirs] = 0;
      }
    }
  }
  return out;
}

export const LONG_PRESS_MS = 380;   // donor: usePress threshold
export const DRAG_MIN_TILES = 2;    // donor: lastVectors.length >= 2

// Press: a short press selects; a long press fires once and suppresses the click that follows.
export class PressTracker {
  private longFired = false;
  start(): void { this.longFired = false; }
  cancel(): void { this.longFired = false; }
  onLongPress(open: () => void): void { this.longFired = true; open(); }
  onClick(select: () => void): void { if (!this.longFired) select(); }
}

// Assumed: a long press is cancelled when the pointer moves more than one tile. The donor passes
// the tile size to the library option; the library's exact rule was not read.
export function longPressCancelled(movedPx: number, tilePx: number): boolean {
  return movedPx > tilePx;
}

// Drag-release: the finger's path of tiles. Commit only after a drag over at least two tiles, and
// only onto a tile the caller accepts (radius or attackable, not locked).
export class DragPath {
  private path: string[] = [];
  enter(tileKey: string): void {
    if (this.path[this.path.length - 1] !== tileKey) this.path.push(tileKey);
  }
  release(canCommit: (tileKey: string) => boolean): string | null {
    const path = this.path;
    this.path = [];
    if (path.length < DRAG_MIN_TILES) return null;
    const last = path[path.length - 1];
    return canCommit(last) ? last : null;
  }
}

export {};
