// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number; }

interface EnemyGroup {
  pos: Pt;                   // top-left tile, zone data
  size: Pt;                  // width and height in tiles; 0 means a single point (donor: area 0)
  chance: number;            // percent 0..100, zone data, read once per map load
  countMin: number;          // zone data
  countMax: number;          // zone data
  requirementsMet: boolean;  // status or level gate, evaluated once per map load
}

const MISS_FACTOR = 5;       // engine constant: random misses allowed = MISS_FACTOR * countMax

function percentChance(percent: number, rnd: () => number): boolean {
  return rnd() * 100 < percent;
}

// Inclusive range, as the donor's randBetween.
function randBetween(lo: number, hi: number, rnd: () => number): number {
  if (lo === hi) return lo;
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function randomCell(g: EnemyGroup, rnd: () => number): Pt {
  const x = g.size.x === 0 ? g.pos.x : g.pos.x + Math.floor(rnd() * g.size.x);
  const y = g.size.y === 0 ? g.pos.y : g.pos.y + Math.floor(rnd() * g.size.y);
  return { x, y };
}

// Returns the tiles to fill for this group on this map load. Empty when the group is gated off or its chance fails.
function placeGroup(g: EnemyGroup, rnd: () => number, walkable: (p: Pt) => boolean, taken: Set<string>): Pt[] {
  if (!g.requirementsMet) return [];
  if (!percentChance(g.chance, rnd)) return [];

  const key = (p: Pt): string => `${p.x},${p.y}`;
  const usable = (p: Pt): boolean => walkable(p) && !taken.has(key(p));   // taken check: a change from the donor, which only checks walkability

  let toSpawn = randBetween(g.countMin, g.countMax, rnd);
  let misses = MISS_FACTOR * g.countMax;
  const out: Pt[] = [];

  while (toSpawn > 0 && misses > 0) {
    const p = randomCell(g, rnd);
    if (usable(p)) {
      out.push(p);
      taken.add(key(p));
      toSpawn--;
    } else {
      misses--;
    }
  }

  // Fallback: the first free tiles in row-major order inside the area.
  for (let x = g.pos.x; x < g.pos.x + g.size.x && toSpawn > 0; x++) {
    for (let y = g.pos.y; y < g.pos.y + g.size.y && toSpawn > 0; y++) {
      const p = { x, y };
      if (usable(p)) {
        out.push(p);
        taken.add(key(p));
        toSpawn--;
      }
    }
  }

  // Anything still missing is a shortfall; the caller must report it, not drop it silently.
  return out;
}
export {};
