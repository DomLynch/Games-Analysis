// Licence: GPL-3.0 (donor, CytopiaTeam-Cytopia). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "residential" | "industrial" | "commercial" | "agricultural";
type Density = "low" | "medium" | "high";

interface Tile { id: string; kind: Kind; density: Density; size: number; } // size = square footprint side
interface Cell { x: number; y: number; free: boolean; }
interface Zone { kind: Kind; density: Density; present: boolean; cells: Map<string, Cell>; }
interface Placement { x: number; y: number; size: number; tileId: string; }

const SPAWN_CAP_PER_TICK = 5; // donor: amountOfBuildingsToSpawn = 5 (ZoneArea.cxx:29)
const MAX_SIZE = 3;

const key = (x: number, y: number): string => `${x},${y}`;

// Footprint of a square of side `size` placed at origin (x, y): extends to -x and +y, as in the donor's cell formula.
function footprint(x: number, y: number, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) out.push(key(x - i, y + j));
  return out;
}

// Largest square whose every cell is a free cell of the zone. Unlike the donor (origin row and column only), every footprint cell is tested.
function largestFit(zone: Zone, x: number, y: number, maxSize: number): number {
  let size = 1;
  while (size < maxSize) {
    const next = size + 1;
    const fits = footprint(x, y, next).every((k) => zone.cells.get(k)?.free === true);
    if (!fits) break;
    size = next;
  }
  return size;
}

// Spawn table: the tiles this zone may use at one footprint size. Empty means no spawn at that size.
function spawnTable(tiles: Tile[], zone: Zone, size: number): Tile[] {
  return tiles.filter((t) => t.kind === zone.kind && t.density === zone.density && t.size === size);
}

function shuffle<T>(a: T[], rnd: () => number): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// One 1-second tick for one zone. Only real placements count toward the cap; covered cells are taken at once.
function spawnTick(zone: Zone, tiles: Tile[], rnd: () => number): Placement[] {
  if (!zone.present) return []; // presence gate (donor: power supply)
  const out: Placement[] = [];
  const free = [...zone.cells.values()].filter((c) => c.free);
  shuffle(free, rnd);
  for (const c of free) {
    if (out.length >= SPAWN_CAP_PER_TICK) break;
    if (!c.free) continue; // covered by an earlier placement this tick
    const fit = largestFit(zone, c.x, c.y, MAX_SIZE);
    const sizes = Array.from({ length: fit }, (_, i) => i + 1).filter((s) => spawnTable(tiles, zone, s).length > 0);
    if (sizes.length === 0) continue; // nothing to place here; does not use the cap
    const size = sizes[Math.floor(rnd() * sizes.length)];
    const options = spawnTable(tiles, zone, size);
    const tile = options[Math.floor(rnd() * options.length)];
    for (const k of footprint(c.x, c.y, size)) {
      const cell = zone.cells.get(k);
      if (cell) cell.free = false;
    }
    out.push({ x: c.x, y: c.y, size, tileId: tile.id });
  }
  return out;
}

export {};
