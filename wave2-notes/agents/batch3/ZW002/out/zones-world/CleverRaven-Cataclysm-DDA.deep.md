# CleverRaven-Cataclysm-DDA (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mongroup.h` with `src/overmap.cpp`, `src/overmapbuffer.cpp`, `src/map.cpp`, `src/game.cpp` (the lifecycle code) | Licence: CC-BY-SA 3.0 Unported (repo `LICENSE.txt`, line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License") | C++ | symbols `overmap::place_mongroups`, `overmap::add_mon_group` (radius spread), `map::spawn_monsters_submap_group` (spend on load), `overmapbuffer::spawn_monster` (reload), `overmapbuffer::despawn_monster` and `game::despawn_monster` (unload), `overmap::process_mongroups` (daily decay)

Checked: Read in full: `mongroup.h` 118-175 (the group struct); `mongroup.cpp` 75-87; `map.cpp` 10028-10270 (group spawn, submap spawn, map-wide spawn); `overmap.cpp` 1299-1312 (decay), 3455-3530 (city hordes; 3444-3454 by grep and excerpt), 3793-3885 (spread); `overmapbuffer.cpp` 137-170, 702-710, 2129-2215 (reload, despawn); `game.cpp` 918-928, 8486-8520, 9796-9816, 10296-10320, 10376-10404 (transition and despawn callers, read in part); `do_turn.cpp` 574-586 (daily call); `options.cpp` 2876-2882; `data/core/external_options.json` 179-203 (defaults, read in part). Callers grep only: `overmap` spawn callers (`overmap.cpp` 1138, 3114, 3523, 3548, 3574, 3630, 3637), `savegame.cpp` 425-448, `explosion.cpp` 1029, `game.cpp` 9881 and 10316 (read in part). Not read: `MonsterGroupManager::GetResultFromGroup` (it takes `&pop`, so it may change the loop bound; not read), `trig_dist`, `place_critter_at` and `place_critter_around` internals, `monster::try_reproduce` and `map::add_spawn` (a separate refill path), the overmap UI's dying toggle (`overmap_ui.cpp` 1928, grep only), and the source of `SPAWN_DENSITY`'s default (the donor's own comment at `overmap.cpp` 3457-3458 says "1 density"). The hint file was INFERRED; the real mechanism is in `mongroup.h` and `map.cpp`. Confidence: high on the lifecycle (generate, spend on load, store on unload, reload, decay); medium on the spread total (the shares may not sum exactly to the group population; not checked, and the donor cites an issue on this point at `overmap.cpp` 3850-3851). camera_scope: n/a (not a camera cell; the sight rule is noted in section 6).

## 1. Mechanism

- Population is a budget, not a list of monsters. A `mongroup` (`mongroup.h` 121-175) holds a type, an absolute submap position, a `population` (default 1, line 139), and two flags, `dying` (line 149) and `horde` (line 151). `empty()` is population at or below zero with no stored monsters (`mongroup.cpp` 80); `clear()` sets population to 0 and drops the monsters (85-86).
- Generation sets the budget per area. `overmap::place_mongroups` (3444) reads four options, `SPAWN_CITY_HORDE_THRESHOLD`, `SPAWN_CITY_HORDE_SMALL_CITY_CHANCE`, `SPAWN_CITY_HORDE_SCALAR` and `SPAWN_CITY_HORDE_SPREAD`, plus `SPAWN_DENSITY` (3447-3452). A city gets a horde budget when its size is above the threshold, or on a one-in-N roll for small cities (3455). The budget is size × scalar × density (3459). The radius is size × spread (3461). Road submaps inside the radius are candidates; each road submap contributes four quadrants (3479-3488), and the count kept shrinks with distance from the centre (3493-3496). Each spawn call takes at most 10 from the budget (3523-3524), and the loop reshuffles while budget remains (3517-3526). The donor's own example: a size-16 city with the default numbers gives 1280 (3457-3458).
- A group spreads its budget over a radius. `overmap::add_mon_group(group, radius)` (3829) does nothing special for radius 1 or less (3832-3835). For a larger radius R, each cell at distance d from the centre (up to R, 3842) gets a share `((R - d) / R) × P / (π·R² + 1)` (3837, 3852). The share keeps its integer part, and the fraction becomes one extra unit with that probability (3857-3865). Cells with zero units are skipped (3867-3869).
- The budget is spent once, on load. `map::spawn_monsters` (10249-10262) calls `map::spawn_monsters_submap` (10175) for every loaded submap each time it runs (the transitions below). That call first reloads stored monsters (10179, section 2 below), then calls `spawn_monsters_submap_group` for every group on that submap (10181-10184), then places the submap's own mapgen spawn points and clears them (10198-10246). In the group step (10028-10173):
  1. The legal tiles are the submap cells with no creature, passable with floor or water (10089), not inside the player's sight range unless sight is ignored (10093-10095), and not indoors on the surface (10097-10099).
  2. If there are no legal tiles, a horde keeps its population; a non-horde group is cleared (10105-10118).
  3. Otherwise the population is turned into monsters through `MonsterGroupManager::GetResultFromGroup(group.type, &pop)` (10121-10141). Each result is a monster with a pack size, and pack copies are pushed (10126-10138).
  4. Each monster takes up to 10 tries at a random legal tile, removing a tile per try (10144-10169). A monster that finds no tile in 10 tries is dropped.
  5. The group is cleared in every case that reaches the end (10171-10172). So the budget is spent on the first load, whether or not everything was placed.
  - Sight is ignored on the outermost submaps and on other z-levels (10039-10047). Horde groups get a wander target (10151-10161).
- Unload stores the monster instead of deleting it. `game::despawn_monster` (10376-10388) calls `on_unload`, then `overmap_buffer.despawn_monster` (10383), which stores the monster as a horde entity at its position on the overmap (2203), or turns a nemesis into an overmap nemesis (2199-2201). Then it is removed from the map and its HP is set to 0 (10387). This runs for every monster when the player changes overmap (8498-8501) and in `game::vertical_move` (which starts at 9331) before the level change (9811-9813). Monsters beyond a margin of the loaded area are despawned the same way by `despawn_nonlocal_monsters` (10390-10404; its caller was not traced).
- Reload restores stored monsters. `overmapbuffer::spawn_monster` (2129-2182) takes the stored horde entries for the submap, clears that bucket (2154), sorts by position (2157-2160), and places each one within radius 1 (2169-2175). An entry that cannot be placed goes back into the overmap's horde store (2179).
- Decay runs daily. `do_turn` calls `overmap_buffer.process_mongroups()` once per in-game day (`do_turn.cpp` 582-583). That calls `overmap::process_mongroups` for overmaps within `MAPSIZE * 2` of the player (`overmapbuffer.cpp` 702-710). A group marked `dying` loses a fifth of its population (integer: `population * 4 / 5`, `overmap.cpp` 1303-1304). Empty groups are removed (1306-1307).
- Transitions call the spawn: game start (`game.cpp` 927), overmap change (8519), vertical move (9881, with `spawn_nonlocal` true), and map shift (10316). Each is a load event; the spawn is not per frame.
- No periodic respawn was found. Mongroups are created at generation (`place_*` calls listed under Checked), by the save loader (`savegame.cpp` 425-448) and by a debug menu item. No timer or refill calls `spawn_mongroup` or `spawn_mon_group`. Monster reproduction (`map::add_spawn`, a comment at `map.cpp` 10195) is a separate refill path that was not read.

## 2. Key functions

- `mongroup` struct, population and flags: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mongroup.h` 118-175.
- `overmap::add_mon_group(group, radius)`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap.cpp` 3829-3885 (spread).
- `overmap::place_mongroups()`: same file, 3444-3530 (city hordes).
- `overmap::process_mongroups()`: same file, 1299-1312 (daily decay and removal).
- `map::spawn_monsters_submap_group(gp, group, ignore_sight)`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/map.cpp` 10028-10173 (spend on load).
- `map::spawn_monsters_submap(gp, ignore_sight, spawn_nonlocal)`: same file, 10175-10247 (reload, then groups, then mapgen spawns).
- `map::spawn_monsters(ignore_sight, spawn_nonlocal)`: same file, 10249-10264 (loops every loaded submap). A spent group and cleared spawn points are not spawned again; a horde with no legal tile is kept and retried on the next call.
- `overmapbuffer::spawn_monster(p, spawn_nonlocal)`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmapbuffer.cpp` 2129-2182 (reload).
- `overmapbuffer::despawn_monster(critter)`: same file, 2193-2205 (store).
- `game::despawn_monster(critter)`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game.cpp` 10376-10388 (unload; HP set to 0 after storing).
- `game::despawn_nonlocal_monsters()`: same file, 10390-10404.
- `overmapbuffer::process_mongroups()`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmapbuffer.cpp` 702-710; daily caller `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/do_turn.cpp` 582-583.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Budget per area, from size × scalar × density | Scalar 80.0 (`data/core/external_options.json` 203); density 1 (comment, `overmap.cpp` 3457-3458); size × spread 1.5 (json 196) |
| Small settlements get a budget only one time in N | Threshold 4 (json 182); one-in-16 small-city chance (json 189); the check at `overmap.cpp` 3455 |
| Spawn calls capped at 10 units per horde group | `desired_zombies > 10 ? 10 : desired_zombies` (`overmap.cpp` 3523); `desired_zombies -= 10` (3524) |
| Radial spread with falloff and a probabilistic fraction | Share `((R - d) / R) × P / (π·R² + 1)` (3837, 3852); the fraction is rolled at 10000 steps (3862-3863) |
| Spend the budget on first load | Group cleared after spawning (`map.cpp` 10172) |
| Ten tries per monster to find a tile | `tries < 10` (`map.cpp` 10145) |
| Stored monsters placed within 1 tile on reload | `place_critter_around(..., 1, true)` (`overmapbuffer.cpp` 2169-2171) |
| Daily decay of dying groups | `population * 4 / 5` (`overmap.cpp` 1304); once per in-game day (`do_turn.cpp` 582) |
| Overmaps near the player that decay | `MAPSIZE * 2` (`overmapbuffer.cpp` 705) |
| Sight exclusion for spawns | Player sight range, capped at `HALF_MAPSIZE_X` (`map.cpp` 10032-10033) |
| Nonlocal despawn margin | `MAPSIZE_X / 6` beyond each edge of the loaded area (`game.cpp` 10397-10400) |

## 4. TypeScript sketch

simplified: the sketch keeps the radial spread (with an assumed rounded Euclidean distance, since the donor's `trig_dist` was not read), the spend-once load with its 10-try placement and the horde rule (no legal tile means a horde keeps its population), the store-on-unload and sorted reload with radius 1, the daily decay as integer 4/5, and the city budget with groups of at most 10. It omits: pack sizes (each unit is one monster; the donor's `GetResultFromGroup` and its `&pop` argument are not read); the uniform-submap shortcut; the mapgen spawn points; the sight range computation (the sketch takes a precomputed `visibleToPlayer` flag); the outermost-submap and other-z exceptions to the sight rule; horde wander targets; nemesis; the overmap-level road and quadrant selection (the sketch takes a budget, not a list of submaps); the 10-tile-per-try removal detail (the sketch removes the chosen tile on each try, as the donor does); and the HP-to-0 step on unload (the sketch stores the monster as data only, a deliberate change).

```ts
// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Cell { x: number; y: number; }
export interface PopGroup { cell: Cell; population: number; dying: boolean; horde: boolean; }
export interface Tile extends Cell { passable: boolean; occupied: boolean; visibleToPlayer: boolean; indoors: boolean; }
export interface Placed { kind: string; cell: Cell; }
export interface StoredHorde { kind: string; cell: Cell; }

// a group of population P at a centre spreads over cells within radius r; each cell gets a share that falls off with distance
export function spreadPopulation(centre: Cell, pop: number, r: number, rand: () => number): PopGroup[] {
  if (r <= 1) return [{ cell: centre, population: pop, dying: false, horde: false }];
  const totalArea = r * r * Math.PI + 1;
  const out: PopGroup[] = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      const d = Math.round(Math.hypot(dx, dy)); // distance metric assumed; the donor's trig_dist was not read
      if (d > r) continue;
      const share = ((r - d) / r) * pop / totalArea;
      let p = Math.floor(share);
      if (rand() < share - p) p++; // fractional share: one extra unit with that probability
      if (p > 0) out.push({ cell: { x: centre.x + dx, y: centre.y + dy }, population: p, dying: false, horde: false });
    }
  }
  return out;
}

// submap load: the group's population is spent once; a unit that finds no tile after 10 tries is dropped.
// With no legal tile at all, a horde keeps its population for a later load; a non-horde group is cleared.
export function spendOnLoad(g: PopGroup, tiles: Tile[], rollKind: () => string, rand: () => number): { placed: Placed[]; dropped: number } {
  const free = tiles.filter(t => t.passable && !t.occupied && !t.visibleToPlayer && !t.indoors);
  const placed: Placed[] = [];
  let dropped = 0;
  if (free.length === 0 && g.horde) return { placed, dropped };
  for (let i = 0; i < g.population; i++) {
    const kind = rollKind();
    let done = false;
    for (let tries = 0; tries < 10 && free.length > 0 && !done; tries++) {
      const idx = Math.floor(rand() * free.length);
      const t = free.splice(idx, 1)[0];
      if (t === undefined) break;
      placed.push({ kind, cell: { x: t.x, y: t.y } });
      done = true;
    }
    if (!done) dropped++;
  }
  g.population = 0; // spent: the group is empty after the load, whatever was placed
  return { placed, dropped };
}

// unload: the monster is kept in the overmap store at its cell, not deleted
export function storeOnUnload(m: Placed, store: StoredHorde[]): void {
  store.push({ kind: m.kind, cell: { x: m.cell.x, y: m.cell.y } });
}

// reload on submap load: sorted by position, placed on a free tile within 1; if none, kept in the store
export function reloadOnLoad(store: StoredHorde[], tiles: Tile[]): { placed: Placed[]; kept: StoredHorde[] } {
  const sorted = [...store].sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y);
  const free = tiles.filter(t => t.passable && !t.occupied);
  const placed: Placed[] = [];
  const kept: StoredHorde[] = [];
  for (const h of sorted) {
    const spot = free.find(t => Math.abs(t.x - h.cell.x) <= 1 && Math.abs(t.y - h.cell.y) <= 1);
    if (spot === undefined) {
      kept.push(h);
    } else {
      free.splice(free.indexOf(spot), 1);
      placed.push({ kind: h.kind, cell: { x: spot.x, y: spot.y } });
    }
  }
  return { placed, kept };
}

// once per in-game day: dying groups lose a fifth (integer), empty groups are removed
export function dailyDecay(groups: PopGroup[]): PopGroup[] {
  return groups
    .map(g => (g.dying ? { ...g, population: Math.floor((g.population * 4) / 5) } : g))
    .filter(g => g.population > 0);
}

// city horde budget: size x scalar x density, then groups of at most 10 until the budget is used up
export function cityHordeSizes(size: number, scalar: number, density: number): number[] {
  const out: number[] = [];
  let desired = Math.floor(size * scalar * density);
  while (desired > 0) {
    out.push(Math.min(10, desired));
    desired -= 10;
  }
  return out;
}
```

The sketch typechecks: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ZW002-cdda-population.ts`, with `export {}` appended).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the budget per zone, the radial spread, spend once on first entry, store on exit, reload on re-entry, daily decay). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer). Donor cite for the caps and the decay: row 23. The donor has no respawn and no grace timer, so the row's respawn and grace parts are Frankendom's to write.
- today: no matching module read in this donor pass (Frankendom's own zone spawn code was not read here).
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only)
- Brief rule served: zones as data (the budget and scalar are zone fields); server-verified (the spawn and store run on the server; a store is not a kill)
- Best transferable idea: give each zone a population budget that spreads from its centre with falloff, spend it the first time the zone is entered, and on exit store each monster at its cell so re-entry restores it instead of re-rolling it.
- Decision (proposed): adapt — take the budget spread, the spend-once load, the store-on-exit and reload, and the 10-try placement; add a respawn timer with a grace period on empty (row 23), since the donor has none; reject the donor's HP-to-zero step on unload (a stored monster is data, not a death, and must not look like a kill that pays loot or XP).
- Acceptance: a server test where `spreadPopulation` of 12 at a centre with radius 3 puts no unit outside radius 3 and more units at the centre than at the rim; entering a zone spawns its budget once; leaving and re-entering restores the same monsters at their cells and spawns nothing new; no spawned monster appears on a tile inside the player's sight radius (server-side proxy, see section 6).

## 6. Gaps and risks

- CC-BY-SA 3.0: clean-room only. The sketch is written from the mechanism; donor names are not carried over.
- No respawn. Once a zone is loaded its budget is cleared (`map.cpp` 10172), and a killed monster is not stored, so the donor's zones run out until the world is regenerated. Row 23 needs respawn and a grace timer on empty; this donor provides neither. The reproduction path (`monster::try_reproduce`, `map::add_spawn`) may refill zones, but it was not read.
- Store is not kill. The donor marks an unloaded monster as dead in memory (`game.cpp` 10387) after storing it. In Frankendom every kill goes through the server ledger with loot and XP, so a store must never pass through the death path. The sketch stores data only.
- The sight rule is a screen rule in the donor. The donor keeps spawns off tiles inside the player's sight range (`map.cpp` 10093-10095). The world camera is client-only and the engine never reads it, so the server cannot test the camera frustum. Use a server-side proxy (a distance band or the player's sight radius), and test it with the camera rather than assuming the two agree.
- Loop bound. `GetResultFromGroup` receives `&pop` (`map.cpp` 10125), so it may change the loop bound. Not read. Frankendom must not rely on that; a fixed unit count per budget is the safe shape.
- Determinism. The spread and placement use random rolls on the server. A replay or fight record (row 19) needs seeded rolls per zone so a load produces the same monsters.
- Budget sums. The shares in the spread may not sum to the group's population (the donor's own comment at `overmap.cpp` 3850-3851 cites an issue about the delicate computation). The test in section 5 must measure the sum rather than assume it.
- Campaign numbers are per world (SPAWN_CITY_HORDE_* options). In Frankendom they would be zone fields with defaults, not a world option; the defaults above are the donor's and are not tuned for us.
- MAX_ATTACKERS = 3 is an engagement cap in the fight engine, not a population cap. A budget can place more monsters in a zone than can attack at once; the spawn code must not treat population as attacker count.
- Several claims rest on grep and partial reads: the callers of `spawn_monsters` in `game.cpp` (read in part), `savegame.cpp` 425-448 (grep), and the overmap UI's dying toggle (grep). They are marked as such in the Checked line.

Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only)
Brief rule served: zones as data; server-verified spawns; store is not a kill (one ledger)
