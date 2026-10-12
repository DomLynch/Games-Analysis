# dkfans-keeperfx (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/roomspace.c` | Licence: GNU GPL version 2 (`/mnt/frankendom-donors/dkfans-keeperfx/LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") | C | symbol `check_slabs_in_roomspace`

Checked: `check_slabs_in_roomspace` (289-309), `can_afford_roomspace` (120-126), `calc_distance_from_roomspace_centre` (128-131), `create_box_roomspace` (214-237), `can_build_roomspace_of_dimensions` (239-278), `can_build_fancy_roomspace` (280-287), `can_build_roomspace` (480-492), `update_slab_grid` (1503-1618, read in full), `roomspace_can_use_slab` (1493-1501), `roomspace_can_build_room_at_slab` (1620-1665), `keeper_build_roomspace` (1201-1232), `can_build_room_at_slab` in `src/slab_data.c` (298-321), and the build click path in `src/packets_input.c` (150-200). Config read: `config/fxdata/terrain.cfg` room blocks by grep (the NAME and COST lines), `src/config_terrain.c` 149, `config/fxdata/rules.cfg` 38, `src/roomspace.h` 32. Callers: `check_slabs_in_roomspace` and `can_build_roomspace` were not traced to their callers; the input path in `packets_input.c` is one caller of `can_build_room_at_slab`. Camera scope: not applicable. Confidence: high on the per-tile rule order and the cost arithmetic (read end to end); medium on the preview cost after the fallback (I read the lines that set it; I did not trace the UI that displays it). Not read: `roomspace_detection.c` (455 lines; the composite search; grep only), `create_box_roomspace_from_drag` (163-199), the sell-mode rule in full (1495-1499 read, the rest not), and the step that actually takes gold when a room is built (not located in this pass).

## 1. Mechanism

- A room is not placed as one object. The player proposes a footprint (a box centred on the cursor, or a dragged shape), and the game judges each tile of it one at a time. Only the tiles that pass are priced; the rest become holes in a shaped room, or are reported as invalid.
- Order of steps, as the code runs: (a) the footprint is made. A box of width × height, centred on the cursor, gets slab_count = width × height with no per-tile check (`create_box_roomspace` 214-237, slab count at 224). A dragged shape starts from its drag region (not read). (b) `update_slab_grid` (1503) sweeps the footprint in one of four orders picked by the drag direction. For a box, every tile is checked; for a fancy shape, only the tiles still marked true are checked (1518, 1545, 1572, 1599). Each check calls `roomspace_can_use_slab` (1520). (c) In build mode, `roomspace_can_use_slab` calls `roomspace_can_build_room_at_slab` (1500). For a normal room that calls `can_build_room_at_slab` (1625), whose rules run in this order: the tile is revealed to the player (`slab_data.c` 301), no room is already on it (306), no trap or door is on it (310), the player owns it (317), and the slab kind is claimed floor (320). Rooms that can sit over water, lava or an abyss use a different rule (314-316) and liquid-path checks (`roomspace.c` 1636-1648). (d) A tile that passes adds to slab_count (1524). A tile that fails adds to invalid_slabs_count (1529) and stays a hole. (e) `check_slabs_in_roomspace` (289-309) sets total_roomspace_cost = slab_count × room cost (294). If the region is not in drag placement mode (301) and has no valid tiles or more than 81 (9 × 9, 303), it is reduced to a 1 × 1 box at the centre (305). (f) Affordability: `can_afford_roomspace` (120-126) requires slab_count × cost <= money owned. The full box check (239-278) counts the valid tiles and returns 0 when the count is not affordable (272). (g) At input, `packets_input.c` 170 refuses when total_roomspace_cost > money, with a "gold not enough" message (174); otherwise it plays the refusal sound (182). (h) `keeper_build_roomspace` (1201-1232) refuses if a roomspace is already active (1204), otherwise copies the roomspace into the player's record, marks it active (1213), and for a fancy shape sets the first point (1230).
- Costs are per tile, per room kind, from config: TREASURE 50 (`terrain.cfg` 1175, cost on 1178), SCAVENGER 750 (1309, cost 1312), GUARD_POST 50 (1444, cost 1447). Selling refunds 50 percent (`rules.cfg` 38).
- Tick: none. The check runs on input and when the footprint changes. The per-frame update `update_roomspaces` (1373) was not read.

## 2. Key functions

- `check_slabs_in_roomspace`: `/mnt/frankendom-donors/dkfans-keeperfx/src/roomspace.c` 289-309. Count the valid tiles, price them, and apply the fallback.
- `update_slab_grid`: `/mnt/frankendom-donors/dkfans-keeperfx/src/roomspace.c` 1503-1618. The sweep. Read in full; the four cases differ in sweep direction and which index is mirrored (the tile rule is the same in all four).
- `roomspace_can_build_room_at_slab`: `/mnt/frankendom-donors/dkfans-keeperfx/src/roomspace.c` 1620-1665. Build-mode tile rule for drag rooms, with bridge and liquid checks.
- `can_build_room_at_slab`: `/mnt/frankendom-donors/dkfans-keeperfx/src/slab_data.c` 298-321. The five-rule per-tile check.
- `can_afford_roomspace` and `can_build_roomspace_of_dimensions`: `/mnt/frankendom-donors/dkfans-keeperfx/src/roomspace.c` 120-126 and 239-278. The price check, and the full box count with its affordability gate.
- Input gate: `/mnt/frankendom-donors/dkfans-keeperfx/src/packets_input.c` 150-200. Refusal and message on an unaffordable build.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Judge each proposed tile one at a time; failing tiles become holes, not a failed build | Five tile rules in order: revealed, no room, no blocker, owned, claimed (`slab_data.c` 301-320). Theirs. |
| Price = valid tiles × per-tile price; check affordability before committing | Per-tile price by room kind: TREASURE 50, SCAVENGER 750, GUARD_POST 50 (`terrain.cfg` 1178, 1312, 1447). Theirs. |
| Cap the footprint so the check stays bounded | 9 per side, 81 tiles (`roomspace.h` 32; `roomspace.c` 303). Theirs. |
| Fallback when nothing valid, or too many | 1 × 1 box at the centre (305). Theirs. |
| Refund on sell | 50 percent (`rules.cfg` 38). Theirs. |

## 4. TypeScript sketch

simplified: keeps the donor's logic: each tile is judged by the same five rules; the valid count is priced; an affordability check comes before commit; and a zero-valid or over-cap footprint falls back to one tile at the centre. The donor checks its rules in early-return order; the sketch checks them in the same order with a boolean chain, which gives the same result. It omits the drag shapes, the sweep orders, the bridge and liquid rules, the composite (fancy shape) bookkeeping, the sell rule and the money charge. It changes one thing on purpose: the fallback tile is checked and priced again, instead of keeping the price computed before the fallback (the donor defect in section 6).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/cm012-footprint-budget.ts`: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity-checklist row 23 (zone population). This is the closest row; no Frankendom feature places a footprint today, so there is no target for this idea yet.
- Frankendom module for player-placed structures: none exists in the files I read (not read).
- Reuse tag: shape only (GPL-2.0; clean-room, no code adapted)
- Brief rule served: addendum rules 1-6 (judged the idea); Frankendom rulings: zones as data, one ledger (the price is spent once, on the valid tiles, and only the server spends it).

## 6. Gaps and risks

- Conflicts with "zones as data": KeeperFX lets the player author the footprint. Frankendom's zones are authored data, and the server owns the layout. A player-placed footprint would add a second layout path, which is the reason for the decision.
- Defect, fallback price: total_roomspace_cost is set at 294 before the fallback at 303-305. After a fallback the cost still carries the count from before it (for example, a region over the cap keeps the cost of all its tiles while the box is one tile). Read, not run. Fix: recompute the price after the fallback (the sketch does).
- Drag placement mode is exempt from the fallback (301). A drag with no valid tile keeps a zero-cost preview; I did not trace what the build does with it.
- The money charge is not located in this pass. The input gate (packets_input.c 170) is a pre-check on the client path. Frankendom must charge once, on the server, against the one ledger, and the client preview must never be the source of the price.
- The per-tile rules read the donor's own slab model (room index, owner, claimed kind, trap and door). Frankendom needs its own equivalents before the rules can be ported.
- What is worth keeping, if a plot or housing feature is ever added: the preview shows the valid count and the total before commit, and only the valid tiles are charged. Keep that idea, not the builder.

Reuse tag: shape only (GPL-2.0; clean-room)
Brief rule served: addendum rules 1-6; Frankendom rulings zones as data and one ledger

Best transferable idea: Before a build is committed, judge each proposed tile one at a time, price only the tiles that pass, and show the count and total so the player sees what they will pay for.
Decision (proposed): reject - no current Frankendom feature lets players place footprints, and zones are authored data (a ruling), so adopting this would add a second layout path; keep the preview-count idea for a future plot feature.
Acceptance (if built later): a server test asserts that a 3 x 3 request with 4 failing tiles charges for 5 tiles only, and is refused when money is below 5 times the per-tile price.
