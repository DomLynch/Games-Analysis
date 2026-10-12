// Licence: GPL-2.0 (donor COPYING, version 2 text). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cell {
  okPlain: boolean;      // terrain allows a footprint tile of a normal building
  okStrict: boolean;     // terrain allows a footprint tile of a notOnConcrete building
  concrete: boolean;     // a laid slab
  wall: boolean;
  structure: number | null; // owner id of a building covering this tile
  owner: number;         // owner of a slab or wall tile
  occupied: boolean;     // a unit or other object sits here
}

interface Grid { w: number; h: number; cells: Cell[] } // flat, index = y * w + x

interface BuildingType {
  footprint: number[];   // tile offsets from the anchor (donor: layoutTiles)
  ring: number[];        // edge-adjacent offsets (donor: layoutTilesAround)
  notOnConcrete: boolean;
  isYard: boolean;       // the construction yard is exempt from the adjacency rule
  hpMax: number;
}

function inMap(g: Grid, p: number): boolean {
  return p >= 0 && p < g.w * g.h;
}

// Donor convention: 0 = invalid, 1 = valid on slabs, -n = valid with n footprint tiles still needing a slab.
function buildCheck(g: Grid, at: number, owner: number, t: BuildingType): number {
  let needSlabs = 0;
  for (const off of t.footprint) {
    const p = at + off;
    if (!inMap(g, p)) return 0;
    const c = g.cells[p];
    if (c.occupied) return 0;
    if (t.notOnConcrete ? !c.okStrict : !c.okPlain) return 0;
    if (!t.notOnConcrete && !c.concrete) needSlabs++;
  }
  if (!t.isYard) {
    // Growth rule: some ring tile must hold one of the owner's buildings, slabs or walls.
    let touches = false;
    for (const off of t.ring) {
      const q = at + off;
      if (!inMap(g, q)) continue;           // fix: the donor reads ring tiles without a map check
      const c = g.cells[q];
      if (c.structure === owner) { touches = true; break; }
      if ((c.concrete || c.wall) && c.owner === owner) { touches = true; break; }
    }
    if (!touches) return 0;
  }
  return needSlabs === 0 ? 1 : -needSlabs;
}

// Donor: Structure_CheckAvailableConcrete. True if some anchor has every footprint tile on the owner's slab.
// Fix: the donor scans 4096 anchors and does not bound-check i + offset; this version does.
function hasSlabSpot(g: Grid, owner: number, t: BuildingType): boolean {
  for (let a = 0; a < g.w * g.h; a++) {
    let full = true;
    for (const off of t.footprint) {
      const p = a + off;
      if (!inMap(g, p) || !g.cells[p].concrete || g.cells[p].owner !== owner) { full = false; break; }
    }
    if (full) return true;
  }
  return false;
}

// Donor: a building with missing slabs loses hp in proportion to the share of footprint tiles without a slab.
// Donor order is (hpMax / 2) * tilesWithout / tileCount, integer math.
function hpAfterPlacement(t: BuildingType, slabCount: number, tileCount: number): number {
  const missing = -slabCount;
  if (missing <= 0) return t.hpMax;
  return t.hpMax - Math.floor(Math.floor(t.hpMax / 2) * missing / tileCount);
}

// Donor: Structure_AI_PickNextToBuild. Fix: the donor's 1-in-4 random pick is overwritten by any later
// higher-priority item, so priority can undo the randomness. Here the random roll is taken first.
function pickNext(buildable: number[], priority: (type: number) => number, rand: () => number): number | undefined {
  if (buildable.length === 0) return undefined;
  if (rand() < 0.25) return buildable[Math.floor(rand() * buildable.length)];
  let best = buildable[0];
  for (const t of buildable) {
    if (priority(t) > priority(best)) best = t; // earliest wins ties
  }
  return best;
}

export {};
