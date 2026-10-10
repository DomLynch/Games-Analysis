// Licence: BSD-3-Clause (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Dir = "north" | "east" | "south" | "west";
type Dest = Room | "hub" | null; // null = out-exit whose room is not generated yet

const DIRS: Dir[] = ["north", "east", "south", "west"];
const SHIFT: Record<Dir, [number, number]> = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] };
const BACK: Record<Dir, Dir> = { north: "south", east: "west", south: "north", west: "east" };

interface Config {
  maxUnexplored: number; // donor: 2
  maxNewPerRoom: number; // donor: 2
  idleMs: number;        // donor: 7 days, but measured from the last NEW room (fix: any traversal)
  resetChance: number;   // donor: 0.5 per recycle tick, per hub exit
}

interface Room {
  x: number;
  y: number;
  depth: number;
  cleared: boolean;
  instance: Instance;    // fix: each room knows its instance, so cleanup can find it
  exits: Map<Dir, Dest>;
}

interface Instance {
  lastActivity: number;  // ms
  members: Set<string>;  // fix: every entrant, not only the opener
  grid: Map<string, Room | null>;
  unexplored: number;
  rooms: Room[];
}

interface HubExit {
  entry: Room | null;    // null = sentinel: the next entrant opens a new instance
}

interface World {
  cfg: Config;
  hub: Map<Dir, HubExit>;
  instances: Instance[];
  rnd: () => number;
}

const key = (x: number, y: number): string => `${x},${y}`;

function makeRoom(inst: Instance, x: number, y: number): Room {
  const room: Room = {
    x,
    y,
    depth: Math.floor(Math.sqrt(x * x + y * y)),
    cleared: false,
    instance: inst,
    exits: new Map<Dir, Dest>(),
  };
  inst.rooms.push(room);
  inst.grid.set(key(x, y), room);
  return room;
}

function shuffled<T>(xs: T[], rnd: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

// Reserve up to `want` new out-exits, never more than the budget left.
// fix: donor checks the budget before adding up to maxNewPerRoom exits, so it can overshoot.
function growExits(inst: Instance, room: Room, back: Dir, cfg: Config, rnd: () => number): void {
  const budget = cfg.maxUnexplored - inst.unexplored;
  if (budget <= 0) return;
  let want = Math.min(cfg.maxNewPerRoom, budget);
  if (want > 1) want = 1 + Math.floor(rnd() * want); // donor: randint(1, n)
  let made = 0;
  for (const d of shuffled(DIRS, rnd)) {
    if (made >= want) break;
    if (d === back) continue;
    const [dx, dy] = SHIFT[d];
    const tx = room.x + dx;
    const ty = room.y + dy;
    if (inst.grid.has(key(tx, ty)) || (tx === 0 && ty === 0)) continue; // taken, or the hub
    room.exits.set(d, null);
    inst.grid.set(key(tx, ty), null); // reserve the coordinate so no other room links to it
    inst.unexplored += 1;
    made += 1;
  }
}

// The donor blocks every exit except the way in while a room is not cleared.
function canTraverse(from: Room, dir: Dir, cameFrom: Dir | undefined): boolean {
  return from.cleared || dir === cameFrom;
}

function clearRoom(room: Room): void {
  room.cleared = true;
}

// Walk one exit. Returns the next room, "hub", or undefined when blocked or absent.
function traverse(
  inst: Instance,
  from: Room,
  dir: Dir,
  cameFrom: Dir | undefined,
  now: number,
  cfg: Config,
  rnd: () => number,
): Dest | undefined {
  if (!from.exits.has(dir) || !canTraverse(from, dir, cameFrom)) return undefined;
  inst.lastActivity = now; // fix: any successful traversal keeps the instance alive
  const cur = from.exits.get(dir);
  if (cur) return cur; // already generated: the whole party shares it
  // cur is null: an unvisited out-exit. Generate its room on first use.
  inst.unexplored -= 1;
  const [dx, dy] = SHIFT[dir];
  const room = makeRoom(inst, from.x + dx, from.y + dy);
  room.exits.set(BACK[dir], from);
  from.exits.set(dir, room);
  growExits(inst, room, BACK[dir], cfg, rnd);
  return room;
}

// Hub exit. The entrant who finds the sentinel opens a new instance; later entrants join it until the next recycle.
function enterHub(w: World, dir: Dir, player: string, now: number): Room | undefined {
  const ex = w.hub.get(dir);
  if (!ex) return undefined;
  let entry = ex.entry;
  if (entry === null) {
    const inst: Instance = {
      lastActivity: now,
      members: new Set<string>(),
      grid: new Map<string, Room | null>(),
      unexplored: 0,
      rooms: [],
    };
    w.instances.push(inst);
    entry = makeRoom(inst, SHIFT[dir][0], SHIFT[dir][1]);
    entry.exits.set(BACK[dir], "hub");
    growExits(inst, entry, BACK[dir], w.cfg, w.rnd);
    ex.entry = entry;
  }
  entry.instance.members.add(player); // fix: every entrant is recorded
  entry.instance.lastActivity = now;
  return entry;
}

// Donor: on each recycle tick every hub exit is reset with probability resetChance.
function recycleHub(w: World): void {
  for (const ex of w.hub.values()) {
    if (w.rnd() < w.cfg.resetChance) ex.entry = null;
  }
}

// Idle collapse, run on a slow tick.
function sweep(w: World, now: number, returnToHub: (player: string) => void): void {
  for (const inst of w.instances.slice()) {
    if (now - inst.lastActivity < w.cfg.idleMs) continue;
    for (const p of inst.members) returnToHub(p); // fix: every member goes back, not only the opener
    for (const ex of w.hub.values()) {
      if (ex.entry !== null && ex.entry.instance === inst) ex.entry = null; // fix: no stale hub exit into a dead instance
    }
    inst.grid.clear();
    inst.rooms.length = 0; // fix: rooms are dropped by their instance id, not by an unset tag
    inst.members.clear();
    w.instances.splice(w.instances.indexOf(inst), 1);
  }
}

export {};
