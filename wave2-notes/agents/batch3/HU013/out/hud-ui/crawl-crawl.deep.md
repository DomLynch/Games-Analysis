# crawl-crawl (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/map-knowledge.cc` (with `tilesdl.cc`, `tilereg-map.cc`, `travel.cc`, `feature.cc`, `view.cc`) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/crawl-crawl/LICENSE` lines 7-8: "either version 2 of the License, or (at your option) any later version.") | C++ | symbol `get_cell_map_feature`

Checked: Read in full: `get_cell_map_feature` (map-knowledge.cc 260-321, both overloads), `is_explore_horizon` (226-245), `_floor_mf` (220-223), `MapRegion` set/pack/render/set_window/update_bounds/handle_mouse/update_tip_text (tilereg-map.cc), `autosize_minimap`, `place_minimap`, `update_minimap` and `load_dungeon` (tilesdl.cc 1063-1096, 1380-1405, 483-499), `click_travel` and `click_travel_safe` (travel.cc 5340-5375), `init_show_table` (feature.cc 150-170). Callers of the dungeon-load overload that calls `set_window`: `view.cc` 708 (read); `files.cc` 2180 (grep hit, not read); the other overload used by `viewmap.cc` 790 (not read, and it may not call `set_window`). Not read: `_adjacent_cmd`, `start_travel`, `_monster_blocks_travel`, `i_feel_safe`, `MapRegion::resize`, `Region::place`, the `tile_map_pixels` default, and the `view.cc` loop that decides how often the dungeon view updates. Confidence: high on the category order and the sizing rule (read end to end); medium on the click path (the adjacent-command branch is unread). camera_scope: not applicable (HUD cell).

## 1. Mechanism

- Each known map cell is reduced to one minimap category, a single byte, stored in a grid the size of the level (`MapRegion::set` writes `m_buf[gc.x + gc.y * GXM] = f`). The colour is looked up from that category when the region is packed (tilereg-map.cc 128, 79).
- `TilesFramework::update_minimap` decides the category in this order (tilesdl.cc 1389-1404):
  (a) the player's own cell becomes the player marker, unless it is the arena or the player is not on the current level (1389-1390);
  (b) otherwise `get_cell_map_feature` (map-knowledge.cc 260-321) runs. Its order, first match wins:
  1. an explore frontier: an unseen cell with a known, non-wall, non-magic-mapped neighbour returns the frontier category (260-261; the frontier test is 226-245);
  2. a detected-but-unseen monster returns the hostile monster category (269-270);
  3. a detected-but-unseen item returns the item category (not line-numbered: the block between 270 and 278);
  4. a known, unseen wall or floor is a magic-mapped wall or floor (278-283);
  5. "exciting" features win outright: anything that is not floor, water, deep water or lava returns its own category (285-287, `_floor_mf` at 222);
  6. clouds: returns the cloud category, but only if it is not MF_SKIP (291-299);
  7. items: returns the item category if the cell has an item (304-309);
  8. firewood monsters return the plant category (311-315);
  9. the base feature (321).
  (c) if the result is a floor-like category and the cell is in the exclusion root or excluded set, it is overwritten with the exclusion category (1395-1400).
  (d) the category is written into the grid (1404).
- Size: `autosize_minimap` (1063-1073) fits the map beside the stat column. Horizontal cells = (window width - stat column - 2 x margin) / GXM; vertical cells = (stat column bottom - top - 2 x margin) / GYM; the cell size is the smaller of the two, then capped by the user option `tile_map_pixels` when that option is non-zero (1070-1072). `place_minimap` (1078-1094) re-fits only when the map does not fit horizontally (1080), and drops the map only when its height is larger than the stat column (1084-1086).
- Window box: the dungeon-load overload (`vbuf` form) calls `set_window` with the rectangle of the current view (tilesdl.cc 493-497). `view.cc` 708 is the update path that calls it (read); `files.cc` 2180 also calls it (not read). The minimap draws that rectangle as an outline (tilereg-map.cc 170-175 sets the window and marks the buffer dirty; the outline is drawn in `pack_buffers`).
- Input, from `MapRegion::handle_mouse` (tilereg-map.cc 230-244 and 262): left press with shift runs autoexplore (235-238). Left press otherwise calls `click_travel(gc, ctrl, false)` (244). Right press opens the full map if it is not already showing; otherwise it starts far-viewing, which stops on release. The tip text reads "[L-Click] Travel / [R-Click] View" (283), with a shift-click autoexplore line added only when `i_feel_safe()` is true.
- `click_travel` (travel.cc 5347-5375), in order: (a) if the click is adjacent, return the adjacent command (`_adjacent_cmd`, not read); (b) if `click_travel_safe` passes (not excluded, the player not excluded, `i_feel_safe(false, false, false, false)`, 5340-5344) and no monster in the cell blocks travel (5363), start auto-travel to the cell (5365); (c) otherwise path one step towards the cell, with danger ignored for the path (5370-5373), and act on that step.
- Tick: not a loop. The category is recomputed when `update_minimap` is called for a cell, and the buffer is repacked on the next render only if `m_dirty` is set (104-107). `set()` does not set `m_dirty` (125-129); only `set_window` does (175), so a changed cell is drawn at the next dungeon load (see section 6).

## 2. Key functions

- `get_cell_map_feature(const map_cell&)`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/map-knowledge.cc` 266-321. The priority list for one cell.
- `is_explore_horizon`: map-knowledge.cc 226-245. Frontier test.
- `TilesFramework::update_minimap`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tilesdl.cc` 1380-1405. Player marker, exclusion overlay, write.
- `TilesFramework::autosize_minimap` and `place_minimap`: tilesdl.cc 1063-1096. Size fit and hide rule.
- `MapRegion::set`, `set_window`, `pack_buffers`, `handle_mouse`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tilereg-map.cc` 125-129, 170-175, 67-94 (pack path, read in part), 223-270.
- `click_travel` and `click_travel_safe`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/travel.cc` 5340-5375.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One category per cell by fixed priority (exciting features, then items, then floor) | Priority order is code, not data (the order of the `if` blocks in map-knowledge.cc 260-321) |
| Frontier marker: unseen cell next to known walkable ground | None (the rule); Abyss turns it off (map-knowledge.cc 229) |
| Fit cell size to the free space beside the stats, minus a margin | Margin 2 (theirs, tilesdl.cc 796); column count 80 (GXM, defines.h 83) and row count 70 (GYM, defines.h 85) |
| Optional user cap on cell size | `tile_map_pixels`, 0 means no cap (theirs, tilesdl.cc 1071-1072); default not read |
| Safe tap-to-travel, otherwise one step | Safety test = exclusions plus `i_feel_safe` (theirs, travel.cc 5342-5344); the test's internals not read |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's priority order (player, frontier, detected monster, detected item, magic-mapped wall or floor, exciting feature, cloud, item, firewood, base) and the exclusion overlay. It fixes two donor defects: the cloud branch is live (the donor's cloud category is MF_SKIP, so it never fires), and a zero or negative cell size returns null instead of being placed. It omits: the Abyss exception, deep water, the adjacency loop (the caller passes the neighbours), the firewood test (the caller passes a boolean), the colour tables, the window outline, far-viewing and the redraw. The click function omits the no-path case (the donor returns no command when pathfinding fails) and the adjacent command body.

```ts
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
```

## 5. Lands in

- TARGET (proposed; not checked against the Frankendom tree): `src/hud/minimap.ts` (new client module). The addendum names `src/fight/<module>.ts` or `origins/<path>` for section 5, but the HUD is client-only and does not belong in the fight engine, so this path is my proposal.
- Parity-checklist row 14 (HUD). The click path also touches row 5 (controls/input), but the cell is HUD.
- Best transferable idea: Resolve each map cell to one colour by a fixed priority (monster over item over floor), add an unexplored-frontier colour, and fit the cell size to the free space, so a zone minimap reads on a 375 px phone.
- Decision (proposed): adapt - keep the priority-resolved cell colour, the frontier marker and the safe tap-to-travel rule for the zone minimap; fix the three donor defects below before porting, and drop the terminal-grid assumptions (80 x 70 is one level's size, which is zone data in Frankendom).
- Acceptance: On a 375 px phone a seen item on a floor cell shows the item colour, a detected but unseen monster shows the hostile colour, and an unknown cell next to known floor shows the frontier colour. A tap on an adjacent cell acts on it, a tap on a far cell in a safe zone starts travel, and a tap on a far cell when the safety test fails takes one step. A server-free unit test asserts each category for these fixtures.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: HUD and camera are client-only (addendum ruling); hud-ui fold-ins (minimap and world map, touch UX).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described order, not from the donor lines.
- Defect 1 (cloud precedence is dead): map-knowledge.cc 294-299 checks a cloud category that feature.cc 168 sets to MF_SKIP, so the donor's own intent (clouds show over the floor) never happens. Fix: give hazard clouds a real category; the sketch returns "hazard".
- Defect 2 (dead monster colours): tilereg-map.cc 45-47 gives FRIENDLY, PEACEFUL and NEUTRAL the same magenta and marks them "buggy". Only HOSTILE (map-knowledge.cc 270) and NO_EXP (315) are ever produced, so the three entries are unreachable. Fix: delete them, or give them categories if Frankendom needs friend and neutral distinctions. The sketch has none.
- Defect 3 (zero-size map placed) - reading, not run: place_minimap (tilesdl.cc 1080-1086) hides the map only when `dy * GYM` exceeds the column height; with a size of 0 or less the test passes and the map is placed. Fix: refuse sizes below 1 px (the sketch returns null).
- Defect 4 (stale cells) - reading, not run: `MapRegion::set` writes the cell but does not set `m_dirty` (tilereg-map.cc 125-129); only `set_window` sets it (175), and `load_dungeon` calls `set_window` (tilesdl.cc 497) from the dungeon view update (view.cc 708). A cell change made between dungeon updates is therefore drawn late. How often that update runs was not read. Fix: set the dirty flag in `set()`, or track dirty cells.
- Desktop grid: 80 x 70 is one level in Crawl. Frankendom zones differ in size, so the grid must be zone data, not a constant.
- Click path not fully read: the adjacent-command branch and the monster-block test are unread, so the sketch's `adjacentAct` and `blockedByMonster` are modelled, not verified. The donor also has no-path handling (no step when pathfinding fails); the sketch leaves that out.
- Ctrl-click passes "force attack" into `click_travel` (tilereg-map.cc 244); what that does for an adjacent enemy is in `_adjacent_cmd`, which was not read. Frankendom's one-engine rule means a tap must never attack without the engine's own input rule; do not copy the force flag.
- Crawl is a turn-based grid roguelike. The map has no real-time threat, so the "safe" test is a between-turn check and does not carry over to a real-time fight; the Frankendom equivalent is a state check on the zone (no engaged enemies), not a per-tile check.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: HUD client-only ruling; hud-ui fold-ins (minimap and world map, touch UX).
