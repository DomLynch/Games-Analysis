// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Cell { x: number; y: number; }
export interface PopGroup { cell: Cell; population: number; dying: boolean; horde: boolean; }
export interface Tile extends Cell { passable: boolean; occupied: boolean; visibleToPlayer: boolean; indoors: boolean; }
export interface Placed { kind: string; cell: Cell; }
export interface StoredHorde { kind: string; cell: Cell; }

// a group of population P at a centre spreads over cells within radius r; each cell gets a share that falls off with distance
export function spreadPopulation(centre: Cell, pop: number, r: number, rand: () => number): PopGroup[] {
  if (r <= 1) return [{ cell: centre, population: pop, dying: false, horde: false }];
  const totalArea = r * r * Math.PI + 1;
  const out: PopGroup[] = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      const d = Math.round(Math.hypot(dx, dy)); // distance metric assumed; the donor's trig_dist was not read
      if (d > r) continue;
      const share = ((r - d) / r) * pop / totalArea;
      let p = Math.floor(share);
      if (rand() < share - p) p++; // fractional share: one extra unit with that probability
      if (p > 0) out.push({ cell: { x: centre.x + dx, y: centre.y + dy }, population: p, dying: false, horde: false });
    }
  }
  return out;
}

// submap load: the group's population is spent once; a unit that finds no tile after 10 tries is dropped.
// With no legal tile at all, a horde keeps its population for a later load; a non-horde group is cleared.
export function spendOnLoad(g: PopGroup, tiles: Tile[], rollKind: () => string, rand: () => number): { placed: Placed[]; dropped: number } {
  const free = tiles.filter(t => t.passable && !t.occupied && !t.visibleToPlayer && !t.indoors);
  const placed: Placed[] = [];
  let dropped = 0;
  if (free.length === 0 && g.horde) return { placed, dropped };
  for (let i = 0; i < g.population; i++) {
    const kind = rollKind();
    let done = false;
    for (let tries = 0; tries < 10 && free.length > 0 && !done; tries++) {
      const idx = Math.floor(rand() * free.length);
      const t = free.splice(idx, 1)[0];
      if (t === undefined) break;
      placed.push({ kind, cell: { x: t.x, y: t.y } });
      done = true;
    }
    if (!done) dropped++;
  }
  g.population = 0; // spent: the group is empty after the load, whatever was placed
  return { placed, dropped };
}

// unload: the monster is kept in the overmap store at its cell, not deleted
export function storeOnUnload(m: Placed, store: StoredHorde[]): void {
  store.push({ kind: m.kind, cell: { x: m.cell.x, y: m.cell.y } });
}

// reload on submap load: sorted by position, placed on a free tile within 1; if none, kept in the store
export function reloadOnLoad(store: StoredHorde[], tiles: Tile[]): { placed: Placed[]; kept: StoredHorde[] } {
  const sorted = [...store].sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y);
  const free = tiles.filter(t => t.passable && !t.occupied);
  const placed: Placed[] = [];
  const kept: StoredHorde[] = [];
  for (const h of sorted) {
    const spot = free.find(t => Math.abs(t.x - h.cell.x) <= 1 && Math.abs(t.y - h.cell.y) <= 1);
    if (spot === undefined) {
      kept.push(h);
    } else {
      free.splice(free.indexOf(spot), 1);
      placed.push({ kind: h.kind, cell: { x: spot.x, y: spot.y } });
    }
  }
  return { placed, kept };
}

// once per in-game day: dying groups lose a fifth (integer), empty groups are removed
export function dailyDecay(groups: PopGroup[]): PopGroup[] {
  return groups
    .map(g => (g.dying ? { ...g, population: Math.floor((g.population * 4) / 5) } : g))
    .filter(g => g.population > 0);
}

// city horde budget: size x scalar x density, then groups of at most 10 until the budget is used up
export function cityHordeSizes(size: number, scalar: number, density: number): number[] {
  const out: number[] = [];
  let desired = Math.floor(size * scalar * density);
  while (desired > 0) {
    out.push(Math.min(10, desired));
    desired -= 10;
  }
  return out;
}

export {};
