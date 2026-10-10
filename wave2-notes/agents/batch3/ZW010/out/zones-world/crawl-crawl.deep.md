# crawl-crawl (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/abyss.cc` (with `abyss.h`) | Licence: GPL v2 or later (repo `LICENSE` lines 7-8: "either version 2 of the License, or" / "(at your option) any later version."; `abyss.cc` has no licence header of its own) | C++ | symbols `maybe_shift_abyss_around_player`, `abyss_area_shift`, `_abyss_shift_level_contents_around_player`, `_abyss_move_entities`, `_update_abyss_terrain`, `_abyss_grid`

Checked: The hint file `dbg-maps.cc` is wrong for this topic. From its function names (grep, body not read) it is a map-statistics reporter (`mapstat_*`), not a level mover. The real mechanism is in `abyss.cc`, the Abyss shifting window. Files opened: `dbg-maps.cc` (function list from grep only, not read in body), `abyss.h` 9-16, `abyss.cc` 65, 619-634, 740-806, 881-1072, 945-958, 991-1027, 1150-1181, 1233-1270, 1336-1375, 1459-1562, 1698-1700 (morph entry only), `defines.h` 113 (and 83/85 read but not receipted: the lines are below the receipt quote minimum), `coordit.h` 12-18, `coordit.cc` 26-32, `coord-def.h` 169-173, `main.cc` 2622-2632, `l-you.cc` 1682-1692, `LICENSE`. Full read of the shift path. Not read: `_abyss_move_entities_at`, `_abyss_move_sanctuary`, `_abyss_move_masked_vaults_by_delta`, `_abyss_place_vaults`, `_update_abyss_terrain` lines 1270-1335, the Worley layout classes and `_get_random_level`, `place_transiting_monsters`, `pick_random_monster` (`mon-pick.cc`), `forget_map`. Confidence: high on the trigger, window size, move offset, wipe and regeneration rule (each receipted); medium on the monster top-up (formula read, the placement helper not read). camera_scope: not applicable (zones topic).

## 1. Mechanism

- A finite 80 x 70 grid stands in for an endless level. The player stays near the middle. When the player drifts too far from the middle, the grid is re-anchored around the player and the parts that fall off the window are regenerated from world coordinates. Regenerated cells sample the same world coordinates they had before, so the intent is that the terrain looks continuous.
- Trigger (once per player turn, not per frame): `main.cc` 2624-2630 runs `run_environment_effects()` (2624), then `player_reacts()` (2627), then `if (player_in_branch(BRANCH_ABYSS))` (2629) calls `maybe_shift_abyss_around_player()` (2630). A Lua teleport also calls it (`l-you.cc` 1690). The check is the Chebyshev distance from the centre: `(you.pos() - ABYSS_CENTRE).rdist() <= ABYSS_SHIFT_DISTANCE` returns early (1050). Otherwise `abyss_area_shift()` runs (1055). `rdist` is the larger of the two axis offsets (`coord-def.h` 172).
- Constants: `ABYSS_CENTRE` = (GXM/2, GYM/2) = (40, 35) (`abyss.cc` 65; GXM 80 and GYM 70 from `defines.h` 83 and 85). `ABYSS_AREA_SHIFT_RADIUS` = LOS_RADIUS + 2 = 8 + 2 = 10 (`abyss.h` 11; LOS 8 at `defines.h` 113). `ABYSS_SHIFT_DISTANCE` = min(GXM, GYM)/2 - 1 - MAPGEN_BORDER - ABYSS_AREA_SHIFT_RADIUS = 35 - 1 - 2 - 10 = 22 (`abyss.h` 14-15; MAPGEN_BORDER 2 at `defines.h` 96).
- Order of steps in `abyss_area_shift` (1514):
  - (a) If the player is not already at the centre (1526), contents move: `_abyss_shift_level_contents_around_player(ABYSS_AREA_SHIFT_RADIUS, ABYSS_CENTRE, mask)` (1531-1532).
  - (b) Inside the mover (991), first `major_coord += (source_centre - ABYSS_CENTRE)` (998). The world origin moves by the displacement.
  - (c) `_abyss_identify_area_to_shift` (from 945) builds the keep mask, called by the mover before the wipe and the move: a square around the player, `rectangle_iterator ri(source, radius)` (951), with cells outside the border margin dropped (953). `rectangle_iterator(center, halfside)` starts at centre minus halfside (`coordit.cc` 29), so the square is 21 x 21 for radius 10 before expansion. The mask is then widened to cover every vault map that touches the square (`affected_vault_indexes`, `_abyss_expand_mask_to_cover_vault`, 958-964), so the kept area is not always 21 x 21.
  - (d) Everything outside the keep mask is wiped (`_abyss_wipe_unmasked_area`, 802; called before the move at 1017). Per wiped cell (`_abyss_wipe_square_at`, 740): shops and traps are destroyed (743-744) and the vault mask flag is cleared (746-748), terrain becomes unseen (750), the item stack is lost (755), a monster on it goes to `_abyss_lose_monster` (765), which sends a monster that needs Abyss transit to transit and otherwise destroys its inventory and cleans it up (632-633). Clouds are deleted.
  - (e) The kept block moves (`_abyss_move_entities`, from 881). For each kept cell, `dst = src - source_centre + target_centre` (917). Since the source is the player, the player lands on `ABYSS_CENTRE`. The function comment says the walk runs backward to handle overlap (comment in `_abyss_move_entities`, not receipted).
  - (f) The inverse of the keep mask is the area to regenerate. `_generate_area(mask, delta)` (1535) applies terrain. `_update_abyss_terrain` skips cells out of bounds, vault cells, altars, and runelight, exit and stair cells (the skip list is in the function, partly read), skips cells outside the mask (1260), and skips cells that are not unseen unless morphing (1263). For the rest it samples `_abyss_grid(rp)`, where `rp = world - major_coord` (1236).
  - (g) `_abyss_grid(p)` computes `pt = p + major_coord` (1152) and samples a Worley layout at that world coordinate (the layout classes are not read). Terrain is therefore a pure function of world coordinate: a regenerated cell matches what was there before, given the same origin.
  - (h) Top-up: `num_monsters = 15 + you.depth * (1 + coinflip())` (1544); `_abyss_generate_monsters` makes that many calls to `pick_random_monster(level_id::current())` (1040) and places each with `PROX_ANYWHERE` (1035), unless spawns are disabled (the early return at the top of the function). Then transit monsters get another chance to return (comment and call after the top-up; not receipted).
  - (i) `forget_map(true)` (1537): map memory is cleared, and the view is updated (`los_changed()` follows in the function).
- World origin: in `_initialize_abyss_state` (1489), `major_coord.x` and `.y` are random 31-bit values (1491-1492), so each game has its own world coordinates.
- Morph (per-turn terrain drift, `abyss_morph` at 1698, called after the shift check in `main.cc`): not covered in depth here. `_abyss_apply_terrain` (inside 1336-1375) computes `delta = you.time_taken * (you.abyss_speed + 40) / 200` and uses it as a chance of change per cell. Partly read only.

## 2. Key functions

- `maybe_shift_abyss_around_player`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/abyss.cc` from 1047. The trigger test (1050) and the call to `abyss_area_shift` (1055).
- `abyss_area_shift`: same file, 1514-1562. Calls the mover (1531-1532), regenerates (1535), forgets the map (1537), tops up monsters (1544-1545), then updates vault lists and map knowledge.
- `_abyss_shift_level_contents_around_player`: same file, 991-1027. Origin update (998), keep-mask build (via `_abyss_identify_area_to_shift`), wipe, then move (1017).
- `_abyss_move_entities`: same file, from 881. Offset from source to target (917).
- `_abyss_identify_area_to_shift`: same file, from 945. Keep-mask square (951, 953).
- `_update_abyss_terrain`: same file, 1233-1270+. Mask gate (1260), seen-cell gate (1263), world sample (1268).
- `_abyss_grid`: same file, 1150-1181. World-coordinate sample (1152).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Re-anchor a window on the player: keep a square, move it so the player is at the centre, regenerate the rest from world coordinates | Window half-side 10 = LOS 8 + 2 (`abyss.h` 11) |
| Trigger when the Chebyshev distance from the centre passes a threshold | Threshold 22 = map half-side minus border minus window (`abyss.h` 14-15) |
| Generated terrain is a pure function of world coordinate (so regeneration is consistent) | Random origin per game (1491-1492) |
| Top-up count per re-anchor: base + per-level term with a coin flip | 15 base; depth times (1 or 2) (1544) |
| Anything outside the keep square is removed on the spot | None; the removal is the rule (765, 755, 750) |

## 4. TypeScript sketch

simplified: the sketch keeps the trigger (Chebyshev distance over 22), the 21 x 21 window moved so the player lands on the centre, the wipe of everything else (with lost occupants returned rather than destroyed), regeneration of the vacated cells from world coordinates, and the 15 + depth x (1 or 2) top-up. It omits the vault, altar, stair and runelight exceptions in `_update_abyss_terrain`, the morph drift, the sanctuary and transit handling, the transporter and cloud moves, the vault masks (which widen the kept area beyond 21 x 21), the map-border margin check on moved cells, the reversed walk order, and the `forget_map` effect. The terrain is a hash in place of Crawl's Worley layouts. The coin flip is a supplied `rnd()`.

```ts
// Licence: GPL v2 or later (donor, Dungeon Crawl Stone Soup). Clean-room sketch of the shape only; not a translation.
interface Pos { x: number; z: number; }
interface Cell { kind: "floor" | "wall"; occupant?: string; }

const W = 80;                 // map width (donor GXM)
const H = 70;                 // map height (donor GYM)
const CENTRE: Pos = { x: 40, z: 35 };
const HALF_WINDOW = 10;       // kept square is 21 x 21 around the player (donor: LOS radius 8 + 2)
const SHIFT_DISTANCE = 22;    // Chebyshev distance from centre that triggers a shift

// The world is a pure function of world coordinates, so a regenerated cell matches what was there before.
function worldCell(wx: number, wz: number, seed: number): Cell {
  let h = Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return { kind: (h & 1) === 1 ? "floor" : "wall" };
}

// Chebyshev distance from the centre; a shift only fires past the trigger distance.
function needsShift(player: Pos): boolean {
  return Math.max(Math.abs(player.x - CENTRE.x), Math.abs(player.z - CENTRE.z)) > SHIFT_DISTANCE;
}

// Re-anchor the window: keep the block around the player, move it so the player lands on the centre,
// wipe everything else, then regenerate the vacated cells from world coordinates.
function shift(
  cells: Map<string, Cell>,   // local grid, keyed "x,z"
  origin: Pos,                // world coordinate of local (0,0)
  player: Pos,
  seed: number,
  depth: number,
  rnd: () => number,
): { origin: Pos; player: Pos; cells: Map<string, Cell>; lost: string[]; topUp: number } {
  const dx = player.x - CENTRE.x;
  const dz = player.z - CENTRE.z;
  const next = new Map<string, Cell>();
  const lost: string[] = [];

  for (const [key, cell] of cells) {
    const [x, z] = key.split(",").map(Number);
    const inWindow = Math.abs(x - player.x) <= HALF_WINDOW && Math.abs(z - player.z) <= HALF_WINDOW;
    if (inWindow) {
      next.set(`${x - dx},${z - dz}`, cell);
    } else if (cell.occupant !== undefined) {
      lost.push(cell.occupant); // donor destroys these; the sketch returns them so the caller can ledger them
    }
  }

  const newOrigin: Pos = { x: origin.x + dx, z: origin.z + dz };
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < H; z++) {
      const key = `${x},${z}`;
      if (!next.has(key)) next.set(key, worldCell(x + newOrigin.x, z + newOrigin.z, seed));
    }
  }

  const topUp = 15 + depth * (1 + Math.floor(rnd() * 2)); // donor: 15 + depth * (1 + coinflip())
  return { origin: newOrigin, player: { x: CENTRE.x, z: CENTRE.z }, cells: next, lost, topUp };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zw010-crawl-abyss-shift.ts`, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The top-up after a re-anchor is a population rule; the window itself is a zone-world transition and would be a separate origins module if we ever built it.
- Reuse tag: rewrite-from-idea (GPL v2 or later; clean-room shape only)
- Brief rule served: zones as data on one runtime (terrain from world coordinates, not stored per cell); parity row 23 (population top-up count).

## 6. Gaps and risks

- GPL v2 or later: clean-room only. The sketch is written from the described mechanism.
- Destructive wipe: monsters outside the window are removed (632-633, 765) and item stacks are lost (755), with no kill, drop or ledger record. That breaks one ledger and server-verified kills. Frankendom must move or ledger such entities, never delete them.
- Randomness: the top-up uses the game's coin flip (1544) and the origin uses the game RNG (1491-1492). Frankendom's spawns must draw from the seeded server stream and log the count.
- Authored zones: Frankendom's zones are authored data, not endless terrain. The shift is worth porting only if we add endless or re-centred wilderness. Otherwise adopt only the top-up rule.
- Preserved features: vaults, altars, stairs and runelights are kept in place by name checks (`_update_abyss_terrain` 1233-1260). Authored zones would need the same kind of marker, which the donor does not describe in general terms.
- Multiplayer: the donor is single-player. Nothing here handles another player standing inside the window, so a shared zone would need a separate rule.
- Unread: the Worley layouts, `place_transiting_monsters`, the sanctuary and vault moves, and the morph drift in full.
- Vault expansion of the keep mask (abyss.cc 958-964) is not in the sketch; the kept area is a 21 x 21 square plus any touching vaults.
- Wipe also destroys shops and traps and clears the vault flag (abyss.cc 743-748), not only terrain, items and monsters.
- Sanctuary move (`_abyss_move_sanctuary`, defined 639, called 1010) is part of the shift and was not read.

Best transferable idea: generate terrain from world coordinates and keep only a small window around the player, so terrain you leave and come back to is rebuilt identically without storing it.
Decision (proposed): adapt — Keep the world-coordinate generator and the population top-up per re-anchor only if Frankendom adds endless wilderness. Reject the destructive wipe: removed entities must be moved or ledgered.
Acceptance: a server test walks a player 23 cells from the zone centre, triggers a re-anchor, then walks back. The terrain at each world coordinate is identical before and after. Every entity that leaves the window is either moved or recorded (no silent delete). At depth 3 the top-up is 18 or 21 spawns.

Reuse tag: rewrite-from-idea (GPL v2 or later; clean-room shape only)
Brief rule served: zones as data on one runtime; parity row 23 (population top-up count).

## Checker findings

- Verdict: MINOR
- Corrected: keep-mask description: the 21 x 21 square is now stated as widened by touching vaults (958-964); wipe description now includes shop and trap destruction and vault-flag clear (743-748)
- Missed (also added to section 6): vault expansion of the keep mask (958-964); shop/trap destruction and vault flag clear on wipe (743-748); sanctuary move at 1010
