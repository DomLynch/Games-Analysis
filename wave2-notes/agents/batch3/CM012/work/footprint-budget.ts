// Licence: GPL-2.0 (donor). Clean-room sketch of the shape, not a line-by-line translation.
// Fix applied: the donor prices the region before its one-tile fallback; here the fallback tile is checked and priced again.

export {};

interface Tile {
  revealed: boolean;   // seen by the player
  occupied: boolean;   // already part of a room
  blocked: boolean;    // a trap or door sits on it
  owned: boolean;      // claimed by this player
  claimed: boolean;    // the tile is claimed floor
}

interface Footprint {
  side: number;        // box side in tiles
  valid: number;       // tiles that pass every rule
  invalid: number;     // tiles that fail one rule
  cost: number;        // price of the valid tiles, after any fallback
  fellBack: boolean;   // true when the box was reduced to its centre tile
}

const MAX_SIDE = 9;                  // donor: MAX_USER_ROOMSPACE_WIDTH 9
const MAX_TILES = MAX_SIDE * MAX_SIDE;

// Rules in the donor's order. A tile is valid only if every rule passes.
function tileOk(t: Tile): boolean {
  if (!t.revealed) return false;
  if (t.occupied) return false;
  if (t.blocked) return false;
  if (!t.owned) return false;
  return t.claimed;
}

// tiles: side x side, row by row. centre: the tile at the middle of the box.
function evaluateFootprint(tiles: Tile[], side: number, centre: Tile, costPerTile: number): Footprint {
  let valid = 0;
  for (const t of tiles) {
    if (tileOk(t)) valid++;
  }
  const invalid = tiles.length - valid;

  // Donor: no valid tile, or more valid tiles than the cap, reduces the box to one tile.
  if (valid > 0 && valid <= MAX_TILES) {
    return { side, valid, invalid, cost: valid * costPerTile, fellBack: false };
  }
  const one = tileOk(centre) ? 1 : 0;
  return { side: 1, valid: one, invalid: 1 - one, cost: one * costPerTile, fellBack: true };
}

function canAfford(f: Footprint, money: number): boolean {
  return f.cost <= money;
}
