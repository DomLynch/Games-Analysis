# DFHack-dfhack (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/DFHack-dfhack/plugins/burrow.cpp` (symbols `expand_burrows` 161-191, `flood_fill` 526-608; dig handlers 130-212) | Licence: Zlib (`LICENSE.rst`: "DFHack is distributed under the Zlib license"; "The core, plugins, scripts, and other DFHack code all use the ZLib license unless noted otherwise"; burrow.cpp has no licence header) | C++ | symbol `flood_fill`

Checked: the hint file `plugins/zone.cpp` is the wrong mechanism for zone layout. It assigns units to civilian zones and cages (function list, filter registry 881-883, `isInBuiltCageRoom` 339-352); I read those lines but none of its layout code. The real zone-boundary mechanism is in `plugins/burrow.cpp` (a burrow is DFHack's name for a tile zone; the hint did not point there). Read in full: `expand_burrows` (161-191), `jobStartedHandler` (130-144), `jobCompletedHandler` (193-212), `flood_fill` (526-608), `get_walk_group` (481-496), `is_outside` (509-524), `add_walls_to_burrow` (146-159), `plugin_enable` (62-79), and the predicates `isWalkable` and `isWallTerrain` (library/include/TileTypes.h 263-278). Candidates opened: plugins/zone.cpp, plugins/burrow.cpp, library/include/TileTypes.h. Grepped only, not read: plugins/lair.cpp, plugins/diggingInvaders/, plugins/preserve-rooms.cpp. Not read: burrow.cpp 1-35, 93-129, 218-480, 628-708; `Maps::getWalkableGroup` and `Burrows::setAssignedTile` (library bodies). Confidence: high on the paint rules and the dig expansion (read, not run); medium on what a walk group means in the game (the library body was not read). camera_scope: n/a (not a camera cell).

Best transferable idea: paint a zone from one seed by flood fill that stays inside one connected region, takes that region's edge cell once, and does not cross it; and when an edit opens a wall next to a zone, the zone takes the wall ring so its boundary stays closed.

Decision (proposed): adapt - use the connected-region paint with an edge fringe as an authoring tool that draws zone bounds into zone data; reject the runtime expansion on dig for now, because it changes zone data during play, which conflicts with "zones as data" and needs a destructible-terrain feature Frankendom does not have.

Acceptance: a zone-editor test (if such a tool is built): filling from a cell inside a room stops at the room's opening; the first cell past the opening is included once and the fill does not go further; a second fill from the same seed changes nothing.

## 1. Mechanism

- Dig start (`jobStartedHandler`, 130-144): for a digging job (135) the tile type at the dig position is stored in the plugin's `active_dig_jobs` map (143).
- Dig completion (`jobCompletedHandler`, 193-212, registered on JOB_COMPLETED at 70): it reads the stored previous tile (205) and the current tile (206). If the tile is set and changed (208), `expand_burrows` runs (209). The stored entry is erased (211).
- `expand_burrows` (161-191): returns unless the new tile is walkable or a ramp top (162-163). For each burrow whose name ends in '+' and which already contains the tile (166-168, the '+' naming is the donor's flag):
  - if the previous tile was not walkable (170): the wall terrain in the 3 by 3 block around the tile, on the same level, joins the burrow (172; wall test 154). If the new tile is walkable-up, the tile above joins (174-175). For a ramp, the 3 by 3 block one level up joins (177-178).
  - if the new tile is low-passable and the previous one was not (181): the tile below joins (183), and for a ramp top the 3 by 3 block one level down joins (184-185).
  - `Job::checkDesignationsNow()` runs if anything changed (189-190).
- `flood_fill` (526-608), run from Lua with a burrow, a seed and an enable flag (526-537):
  - it records the seed's outside flag (544), hidden flag (545) and walk group (546), then runs a stack-based fill (550-607).
  - a cell is skipped if it is missing, or its outside or hidden state differs from the seed's (559-565).
  - a seed with no walk group spreads only into cells with no walk group (567-569).
  - a cell already in the requested state is skipped, unless it is the seed (571-572).
  - the cell's state is set (574).
  - if the seed has a walk group and the cell belongs to a different one, the fill stops at this cell (576-579; the cell itself was set at 574). Trees do not count (tree trunks are exempt from this stop, 578).
  - otherwise the 8 neighbours on the same level are pushed (581-588). Unless the zlevel option is set, the tile above and the tile below are pushed when their walk group equals the seed's (590-606).
- `get_walk_group` (481-496): zero for a missing or hidden designation (482-484); otherwise the game's walk group (485-487); for a ramp top, the group of the tile below (488-493).
- `is_outside` (509-524): true when the outside bit is set (512); for a lit tile, it is outside when the tile above is a tree or low-passable and is itself outside (514-523).

## 2. Key functions

- `flood_fill`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/burrow.cpp` 526-608 (seed flags 544-546; group rule 567-569; visited rule 571; fringe rule 578; neighbours 581-588).
- `expand_burrows`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/burrow.cpp` 161-191 (gate 162; '+' flag 167; ring 172; wall test in `add_walls_to_burrow` 154).
- `jobStartedHandler` / `jobCompletedHandler`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/burrow.cpp` 130-144 and 193-212.
- `get_walk_group`, `is_outside`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/burrow.cpp` 481-496 and 509-524.
- Predicates: `/mnt/frankendom-donors/DFHack-dfhack/library/include/TileTypes.h` 263-278 (`isWalkable`, `isWallTerrain`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ring fill around an edited cell | Radius 1, a 3 by 3 block (theirs, burrow.cpp 172); only wall terrain joins (154) |
| Eight-neighbour spread on one level | 8 neighbours (theirs, 581-588) |
| One-cell fringe past a region edge | Rule, no number (578) |
| Zone flag by naming convention | A trailing '+' on the zone name (167); transfer as a data flag, not a name |
| Outside test for a lit tile | Outside when the tile above is a tree or low-passable and outside (512-523) |

## 4. TypeScript sketch

simplified: the 2D form of the donor's paint and dig rules, in donor order: seed flags, the group and outside/hidden gates, the visited rule, the set, the fringe stop, then the eight neighbours; and for an edit, the walkable gate and the wall ring. It omits: the z-level neighbours (590-606) and the vertical parts of `expand_burrows` (174-185); the ramp-top cases (162-163, 177-178, 184-185); tree trunks as exceptions (578, 502-504); the designation refresh (189-190); the dig-start record and reset (143, 205, 58-60), which the caller must keep; the Lua option parse (get_opts, 228). The walk group is an input here (the donor gets it from `Maps::getWalkableGroup`, body not read). The donor's '+' name flag is a boolean on the zone here.

```ts
@@SKETCH@@
```

## 5. Lands in

- TARGET `origins/zones/zone-paint.ts` (proposed path; no Frankendom file was read). This is authoring-time geometry, not runtime population.
- Parity row: none fits. Row 23 (zone population) is the closest, only because a zone is where spawns are placed. The 1-23 checklist has no row for zone geometry; say so to Lead.
- Reuse tag: adapt-from-idea (Zlib, permissive; the sketch is written fresh)
- Brief rule served: zones as data (the zone cells are data; the paint tool writes data at authoring time, nothing at runtime)

## 6. Gaps and risks

- Zlib permits adaptation. The sketch is still clean-room, from the described rules.
- Runtime expansion (`expand_burrows`, 161-191) changes zone data during play. That conflicts with "zones as data" and with one ledger unless the change is replicated and server-owned. The addendum rulings name no destructible terrain, so this part is rejected unless such a feature is planned.
- Donor state lives in a plugin-global map (`active_dig_jobs`, 42). A dig that started before the plugin was enabled has no entry, and `operator[]` inserts a default (205), so the previous tile reads as the enum's zero value. Frankendom must not rely on a record that a load or a restart can lose; server state, one ledger.
- The walk group is the game's own connected-region id (`Maps::getWalkableGroup`); Frankendom has no such id. A region id would have to be computed from zone data at load and kept in the ledger, not read from the engine.
- The outside and hidden flags keep a zone within one class of space (indoor or outdoor). For Frankendom that would be a region class field in zone data, not a sunlight test.
- Naming convention: the '+' suffix is a flag hidden in a string (167). Do not copy it; use a data field.
- Z levels: the donor's zone can run up and down (590-606, 174-185). Frankendom's zone data would need a rule for vertical reach; this sketch does not cover it.
- The stop at a region edge is a rule for the paint tool only. It is not a combat or AI rule and should not be used to clip gameplay areas at runtime.
- zone.cpp (the list hint) is unit assignment to civilian zones and cages, a different mechanism. Its filter registry (881-883) is a name-to-predicate map, a pattern for selection filters only.
