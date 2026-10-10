// Licence of donor: GPL-2.0-or-later (file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

interface Tile { x: number; y: number; }

interface Owner {
  id: string;
  cityCount: number;          // cities the victim owns
  civilWarChancePct: number;  // 0..100, from the government effect
}

interface Nearest {
  owner: Owner;  // owner of the closest city to the sampled tile
  dist: number;  // real distance in tiles
}

interface World {
  randomTile(): Tile;                            // uniform over the map
  nearestCity(t: Tile): Nearest | null;
  noBarbs(t: Tile): boolean;                     // terrain forbids uprisings
  emptyTileNear(t: Tile): Tile | null;           // the tile or a neighbour with no units
  nearLand(t: Tile): boolean;
  isOcean(t: Tile): boolean;
  knownTo(t: Tile, owner: Owner): boolean;
  randomInt(n: number): number;                  // 0 .. n-1
  spawnBand(t: Tile, count: number): number;     // returns units actually created
}

const MIN_DIST = 5;        // tiles from the nearest city
const MAX_DIST = 8;
const CIV_STEP = 10;       // base size step for uprising tiers
const MAP_FACTOR = 2000;   // tiles per attempt unit

// Tier rises when the city count reaches the next threshold (10, 32, 80, 186 by hand from the update rule).
function upriseTier(cityCount: number): number {
  let tier = 1;
  let cap = CIV_STEP;
  while (cap <= cityCount) {
    tier++;
    cap = Math.trunc(cap + cap * 1.2 + CIV_STEP);
  }
  return tier;
}

// One random attempt. Returns the number of units created (0 = no uprising).
function trySummon(w: World, rate: number): number {
  const t = w.randomTile();
  if (w.noBarbs(t)) return 0;
  const near = w.nearestCity(t);
  if (near === null) return 0;
  if (near.dist < MIN_DIST || near.dist > MAX_DIST) return 0;

  const spot = w.emptyTileNear(t);
  if (spot === null) return 0;
  if (!w.knownTo(spot, near.owner) && !w.isOcean(spot)) return 0;
  if (!w.nearLand(spot)) return 0;

  // Small victims rarely see an uprising: the roll must be within cities * (rate - 1).
  if (w.randomInt(30) + 1 > near.owner.cityCount * (rate - 1)) return 0;
  if (w.randomInt(100) > near.owner.civilWarChancePct) return 0;

  const count = w.randomInt(3) + upriseTier(near.owner.cityCount) * rate;
  return w.spawnBand(spot, count);
}

// Called once per turn. Attempts = (tiles / MAP_FACTOR) * (rate - 1), so a higher rate means more attempts.
function summonPerTurn(w: World, rate: number, turn: number, onsetTurn: number, tiles: number): number {
  if (rate <= 1 || turn < onsetTurn) return 0;  // disabled, huts only, or before onset
  const n = Math.max(1, Math.floor(tiles / MAP_FACTOR));
  let uprisings = 0;
  for (let i = 0; i < n * (rate - 1); i++) {
    if (trySummon(w, rate) > 0) uprisings++;
  }
  return uprisings;
}
