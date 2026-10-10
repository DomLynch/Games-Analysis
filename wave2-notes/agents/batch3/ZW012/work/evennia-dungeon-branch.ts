// Licence: BSD-3-Clause (donor, Evennia). Re-expression of the described mechanism in TypeScript, not a line copy.
// clean-room
export type Dir = "north" | "east" | "south" | "west";

const SHIFT: Record<Dir, [number, number]> = {
  north: [0, 1],
  east: [1, 0],
  south: [0, -1],
  west: [-1, 0],
};
const REVERSE: Record<Dir, Dir> = { north: "south", east: "west", south: "north", west: "east" };
const DIRS: Dir[] = ["north", "east", "south", "west"];

export interface Room {
  id: number;
  x: number;
  y: number;
  depth: number;                 // radial distance from the start; drives difficulty
  cleared: boolean;              // false = exits other than the way back are locked
  backDir: Dir;                  // the exit back the way the player came; never locked
  exits: Map<Dir, number | null>; // null = placeholder, the room is not generated yet
}

export interface Branch {
  maxUnexplored: number;         // unexplored exits allowed in the whole branch (2 in donor)
  maxNewPerRoom: number;         // new exits opened per generated room (2 in donor)
  rooms: Map<number, Room>;
  grid: Map<string, number | null>; // "x,y" -> room id, or null when reserved
  unvisited: Set<string>;        // "roomId:dir" of placeholder exits not yet walked
  lastGenerated: number;         // ms; set only when a room is generated (donor behaviour)
}

const key = (x: number, y: number): string => `${x},${y}`;

// Fisher-Yates shuffle driven by a caller-supplied integer RNG (rand(n) gives 0..n-1).
function shuffle<T>(xs: T[], rand: (n: number) => number): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const t = xs[i];
    xs[i] = xs[j];
    xs[j] = t;
  }
}

// Generate one room at the far side of `from` in direction `dir`.
export function newRoomAt(
  b: Branch,
  from: Room,
  dir: Dir,
  now: number,
  rand: (n: number) => number,
  nextId: () => number,
): Room {
  const [dx, dy] = SHIFT[dir];
  const x = from.x + dx;
  const y = from.y + dy;
  const back = REVERSE[dir];
  const room: Room = {
    id: nextId(),
    x,
    y,
    depth: Math.floor(Math.sqrt(x * x + y * y)),
    cleared: false,
    backDir: back,
    exits: new Map<Dir, number | null>(),
  };
  b.rooms.set(room.id, room);
  b.grid.set(key(x, y), room.id);
  b.lastGenerated = now;
  room.exits.set(back, from.id);

  // Open new placeholder exits only while the branch is under its unexplored budget.
  if (b.unvisited.size < b.maxUnexplored) {
    let n = Math.min(b.maxNewPerRoom, b.maxUnexplored);
    if (n > 1) n = 1 + rand(n); // 1..n inclusive
    const options = DIRS.filter((d) => d !== back);
    shuffle(options, rand);
    for (let i = 0; i < n; i++) {
      while (options.length > 0) {
        const d = options.shift() as Dir;
        const [ex, ey] = SHIFT[d];
        const tx = x + ex;
        const ty = y + ey;
        if (!b.grid.has(key(tx, ty)) && !(tx === 0 && ty === 0)) {
          room.exits.set(d, null);
          b.unvisited.add(`${room.id}:${d}`);
          b.grid.set(key(tx, ty), null); // reserve the coordinate so no other room claims it
          break;
        }
      }
    }
  }
  return room;
}

// Walk an exit. Locked unless the room is cleared, except the way back.
export function traverse(
  b: Branch,
  from: Room,
  dir: Dir,
  now: number,
  rand: (n: number) => number,
  nextId: () => number,
): Room | null {
  if (!from.exits.has(dir)) return null;
  if (!from.cleared && dir !== from.backDir) return null;
  const target = from.exits.get(dir);
  if (target !== null && target !== undefined) return b.rooms.get(target) ?? null;
  b.unvisited.delete(`${from.id}:${dir}`);
  return newRoomAt(b, from, dir, now, rand, nextId);
}

// Age rule as the donor has it: idle time since the last generated room, not player presence.
export function isStale(b: Branch, now: number, maxLifeMs: number): boolean {
  return now - b.lastGenerated > maxLifeMs;
}

// Collapse: drop every room. The caller moves any players back to the start first.
// The donor's delete() looks rooms up by a tag that is never set, so it removes none.
export function collapse(b: Branch): number[] {
  const ids = [...b.rooms.keys()];
  b.rooms.clear();
  b.grid.clear();
  b.unvisited.clear();
  return ids;
}

export {};
