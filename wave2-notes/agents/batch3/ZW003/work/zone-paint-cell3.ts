// Licence: Zlib (donor, DFHack plugins). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cell {
  group: number;   // connected walkable region id; 0 = not in any region
  outside: boolean;
  hidden: boolean;
  wall: boolean;   // wall terrain: a fringe that can be added to a zone
  walkable: boolean;
}

type Grid = (x: number, y: number) => Cell | undefined;
const key = (x: number, y: number): string => `${x},${y}`;
const NEIGHBOURS: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// Paint (enable = true) or erase a zone from a seed cell. Rules, as in the donor's flood_fill (2D form):
//  - a cell must match the seed's outside and hidden flags;
//  - a seed inside a region spreads only inside that region; a seed outside every region spreads only into cells outside every region;
//  - a cell of another region is taken once (the fringe) but the fill does not spread out of it;
//  - a cell already in the requested state is not expanded again.
function paintZone(grid: Grid, zone: Set<string>, seed: [number, number], enable: boolean): void {
  const s = grid(seed[0], seed[1]);
  if (!s) return;
  const stack: [number, number][] = [seed];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const c = grid(x, y);
    if (!c || c.outside !== s.outside || c.hidden !== s.hidden) continue;
    if (s.group === 0 && c.group !== 0) continue;
    const isSeed = x === seed[0] && y === seed[1];
    if (!isSeed && enable === zone.has(key(x, y))) continue;
    if (enable) zone.add(key(x, y));
    else zone.delete(key(x, y));
    if (s.group !== 0 && s.group !== c.group) continue; // fringe of another region: taken, not crossed
    for (const [dx, dy] of NEIGHBOURS) stack.push([x + dx, y + dy]);
  }
}

// A zone flagged auto-expand takes the wall ring around a cell that a dig opens (donor: 3 by 3 ring, wall terrain only).
// Only a walkable new tile expands the zone (donor: expand_burrows returns early otherwise).
function onDug(grid: Grid, zone: { autoExpand: boolean; cells: Set<string> }, x: number, y: number, wasWalkable: boolean, nowWalkable: boolean): void {
  if (!zone.autoExpand || !zone.cells.has(key(x, y))) return;
  if (!nowWalkable) return;
  if (wasWalkable) return;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const c = grid(x + dx, y + dy);
      if (c && c.wall) zone.cells.add(key(x + dx, y + dy));
    }
  }
}

export {};
