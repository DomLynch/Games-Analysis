// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

type Feature = "unseen" | "wall" | "floor" | "water" | "lava" | "stair" | "door" | "trap";

type Cat =
  | "unseen" | "mapWall" | "mapFloor" | "wall" | "door" | "stair" | "trap"
  | "item" | "hazard" | "monsterHostile" | "plant" | "water" | "lava" | "floor"
  | "player" | "exclRoot" | "excl" | "frontier";

interface Cell {
  feature: Feature;
  known: boolean;           // ever mapped or seen
  seen: boolean;            // in view now
  magicMapped: boolean;
  detectedMonster: boolean; // known but not seen
  detectedItem: boolean;
  item: boolean;            // seen item on the cell
  cloud: boolean;           // hazard cloud on the cell
  firewoodMonster: boolean;
  player: boolean;
  excludedRoot: boolean;
  excluded: boolean;
}

function featureCat(f: Feature): Cat {
  switch (f) {
    case "wall": return "wall";
    case "door": return "door";
    case "stair": return "stair";
    case "trap": return "trap";
    case "water": return "water";
    case "lava": return "lava";
    case "floor": return "floor";
    default: return "unseen";
  }
}

const floorLike = (c: Cat): boolean => c === "floor" || c === "water" || c === "lava";

// Unseen cell next to a known, non-wall cell that is not magic-mapped.
export function isFrontier(unseenHere: boolean, neighbours: Cell[]): boolean {
  if (!unseenHere) return false;
  return neighbours.some(n => n.feature !== "unseen" && n.feature !== "wall" && !n.magicMapped);
}

// First match wins. Donor order: player, frontier, detected monster, detected item,
// magic-mapped wall/floor, exciting feature, cloud, item, firewood, base.
export function minimapCategory(c: Cell, frontier: boolean): Cat {
  if (c.player) return "player";
  if (frontier) return "frontier";
  if (c.detectedMonster) return "monsterHostile";
  if (c.detectedItem) return "item";

  const base = featureCat(c.feature);
  if (c.known && !c.seen && (base === "wall" || base === "floor")) {
    return base === "wall" ? "mapWall" : "mapFloor";
  }
  if (!floorLike(base)) return base; // stairs, walls, doors, traps win outright

  // fix (donor defect): the donor's cloud category is MF_SKIP, so its cloud branch never fired.
  if (c.cloud) return "hazard";
  if (c.item) return "item";
  if (c.firewoodMonster) return "plant";
  return base;
}

// Exclusion overlay applies only to floor-like cells.
export function finalMinimapCat(c: Cell, frontier: boolean): Cat {
  const cat = minimapCategory(c, frontier);
  if (cat === "floor" || cat === "mapFloor" || cat === "water" || cat === "lava") {
    if (c.excludedRoot) return "exclRoot";
    if (c.excluded) return "excl";
  }
  return cat;
}

// Cell size in px: fit the map beside the stat column, then cap by the optional user limit (0 = no cap).
export function minimapCellPx(
  winW: number, statColW: number, colTop: number, colBottom: number,
  gxm: number, gym: number, margin: number, capPx: number,
): number | null {
  const horiz = Math.floor((winW - statColW - margin * 2) / gxm);
  const vert = Math.floor((colBottom - colTop - margin * 2) / gym);
  let sz = Math.min(horiz, vert);
  if (capPx > 0) sz = Math.min(sz, capPx);
  // fix (donor defect): a 0 or negative size passes the donor's height check and is placed; hide the map instead.
  return sz >= 1 ? sz : null;
}

// Shift-click autoexplores. Otherwise an adjacent cell is acted on; a safe, unblocked far cell is travelled to;
// anything else moves one step towards the click.
export type Click = "explore" | "adjacentAct" | "travel" | "oneStep";

export function minimapClick(shift: boolean, adjacent: boolean, safe: boolean, blockedByMonster: boolean): Click {
  if (shift) return "explore";
  if (adjacent) return "adjacentAct";
  if (safe && !blockedByMonster) return "travel";
  return "oneStep";
}
