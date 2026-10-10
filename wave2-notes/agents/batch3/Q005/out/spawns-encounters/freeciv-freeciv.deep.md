# freeciv-freeciv (spawns-encounters, cell 5)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` | Licence: GPL-2.0-or-later (file header: "either version 2, or (at your option) any later version"; COPYING is GNU GPL version 2) | C | symbol `try_summon_barbarians`

Checked: The list hint `data/nation/animals.ruleset` is only the animal nation's definition, not the spawn logic. Read as candidates: `server/animals.c` (166 lines, read in full: one-shot animal placement at new-game start, called from `server/srv_main.c` 3515; no respawn, so rejected for this topic); `server/barbarian.c` 533-783 (read in full: `try_summon_barbarians`, `summon_barbarians`, `barbarian_initial_wars`), 486-513 (`is_near_land`, `find_empty_tile_nearby`); `server/barbarian.h` 23-28; `common/game.h` 51-57 and 666-668; `server/srv_main.c` 1609 and 1670 (the call inside `end_turn`; only the call lines read, the rest of `end_turn` not read); `common/map.c` 1237-1240 (`rand_map_pos`). Ruleset values in `data/civ2civ3/effects.ruleset` 1149-1183 read by grep only. Not read: `real_map_distance` and `square_iterate` macro bodies, `find_closest_city` flags, `get_player_bonus`, `create_barbarian_player` (97-202, body not read), `unleash_barbarians` (272-485, hut uprisings). Confidence: high on the gates, order of steps and counts in `try_summon_barbarians` (read in full); medium on per-turn cadence (only the call site was read); the tier thresholds are worked out by hand from the update line and not run.

Best transferable idea: each wave attempt samples one random tile in a fixed distance band from the nearest settlement, passes a chain of cheap gates (free spot, known ground, near land, a size roll and a chance roll), and then spawns a group whose size steps up with the victim's size and the difficulty rate.
Decision (proposed): adapt. Why: the distance band, the ordered gates and the per-attempt random sample fit a zone wave director, but the group size is up to 4 at NORMAL and must be capped at MAX_ATTACKERS = 3, and the "victim" is an empire size we would have to define as a player stat.
Acceptance: a server test places a wave 5 to 8 tiles from a player's outpost, only on ground the player has seen, and asserts that one wave never has more than MAX_ATTACKERS = 3 living attackers at once, with surplus units waiting in a queue and entering when a slot frees.

## 1. Mechanism

- Cadence: `summon_barbarians()` runs once per turn from `end_turn` (srv_main.c 1609, 1670). It returns at once if the rate is disabled or huts-only (barbarian.c 742-743) or if the turn is below the onset (747). Otherwise it makes `n * (rate - 1)` attempts, where `n = map_num_tiles() / MAP_FACTOR` and at least 1 (751-757). Rate values: DISABLED 0, HUTS_ONLY 1, NORMAL 2, FREQUENT 3, HORDES 4 (game.h 52-56). Default: NORMAL (666), onset turn 60 (668).
- One attempt (`try_summon_barbarians`, 533-732), in this order:
  1. Sample one uniform random position (552, 1239). The donor's comment says each tile's chance is independent of the others, which it calls essential for balance (547-551).
  2. Reject if the terrain has the no-barbarians flag (554).
  3. Find the closest city of any owner (558-560). That owner is the victim. Reject if the real distance is below 5 or above 8 (566-571; MIN_UNREST_DIST 5, MAX_UNREST_DIST 8 in barbarian.h 23-24).
  4. Spot: the sampled tile or a neighbour with no units (574, 504-513). Reject if the spot is not known to the victim and is not ocean (575-576). Reject if no land is within the square of radius 4 (577, 490-499).
  5. Size gate: reject unless `fc_rand(30) + 1 <= victim cities * (rate - 1)` (584-585). So a victim with 9 cities at NORMAL passes 9 of 30 rolls.
  6. Civil-war gate: reject unless `fc_rand(100) <= Civil_War_Chance effect` of the victim (586). In civ2civ3 that effect is 99 for anarchy (effects.ruleset 1149-1151), 90 for tribal (1159), 80 for despotism (1167), 70 for monarchy (1175), 50 for communism (1183). Other rulesets may differ.
  7. Size: tier starts at 1 and steps up whenever the city count reaches `city_max`, which starts at 10 and grows as `city_max += city_max*1.2 + 10` (605-611). By hand, the tier rises at 10, 32, 80 and 186 cities. Group count `barb_count = fc_rand(3) + tier * rate` (613), so 0 to 2 extra units on top of tier times rate.
  8. Remove any hut on the spot (593-602), then create the group under a barbarian player for the land or sea type (`create_barbarian_player`, 618 and 648; its body was not read, and the comment at 652-657 says an existing player may be returned and reused). Land units are created only where the tile supports the type and only once per unique type, plus the leader (616-641). Sea raiders get a boat and up to capacity minus one barbarians plus a leader (643-699). That branch is not used for a browser game.
  9. If nothing was created, return with no notice (707-710). Otherwise reveal a radius-squared-9 circle around the spot and the city (718-719; BARBARIAN_INITIAL_VISION_RADIUS_SQ 9, barbarian.c 70), and notify the victim (722-731).

## 2. Key functions

- `try_summon_barbarians`: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` 533-732. One attempt: sample, distance band, spot, victim gates, group size, creation, notice.
- `summon_barbarians`: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` 738-760. Per-turn cadence: disabled and onset gates, attempt count.
- `is_near_land` and `find_empty_tile_nearby`: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` 490-513.
- Caller: `/mnt/frankendom-donors/freeciv-freeciv/server/srv_main.c` 1670 (inside `end_turn`, 1609).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One random sample per attempt; a chain of cheap gates; the rejects cost nothing | Independent per-tile sampling (theirs, barbarian.c 547-552) |
| Spawn only in a distance band from the nearest settlement | 5 to 8 real-map tiles (theirs, barbarian.h 23-24) |
| Spot must be seen by the victim (warn before the attack) | Known-to-victim test, ocean exempt (theirs, barbarian.c 575-576) |
| Attempts per period scale with map size | `map_num_tiles() / MAP_FACTOR`, MAP_FACTOR = 2000 (theirs, barbarian.h 28; barbarian.c 751) |
| Attempts per period scale with difficulty | `n * (rate - 1)`, rate NORMAL = 2 (theirs, barbarian.c 757; game.h 666) |
| Start after an onset period | 60 turns at default (theirs, game.h 668; barbarian.c 747) |
| Size roll limited by victim size | `fc_rand(30) + 1` against cities * (rate - 1) (theirs, barbarian.c 584-585) |
| Chance roll limited by government | Civil_War_Chance effect, 50 to 99 in civ2civ3 (theirs, effects.ruleset 1149-1183) |
| Group size steps up at city thresholds | Tiers at 10, 32, 80, 186 cities, from `city_max += city_max*1.2 + 10` (theirs, barbarian.c 605-611; hand-worked) |
| Group size = tier times rate, plus 0 to 2 | `fc_rand(3) + uprise * rate` (theirs, barbarian.c 613) |
| Vision for the defender | Radius squared 9 (theirs, barbarian.c 70, 718) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one attempt (distance band, spot, known-or-ocean, near land, size roll, chance roll, count) and the per-turn gates and attempt count. It omits the hut removal at the spot, the sea-raider boat branch, the unique-unit check, the veteran level, the notices and vision, the barbarian player object, the real-distance and square-iterate helpers (not read) and the exact search inside `find_closest_city`. The donor's tier loop uses C integer assignment; the sketch uses `Math.trunc`, which gives the same result for these positive values.

```ts
// Licence of donor: GPL-2.0-or-later. Clean-room sketch written from the described mechanism, not a translation of the donor lines.

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
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone wave director: the distance band, the gates and the count tiers; numbers come from zone data). The per-attempt cap belongs to the same module and to the per-tick NPC budget (server tick sub-line under row 18).
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). A wave is a spawn event under the cap, not a separate row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: zones as data (band, onset, count tiers per zone); one ledger (the wave is recorded on the zone, not in a barbarian player object as in the donor); row 23 spawn caps.

## 6. Gaps and risks

- Group size is 2 to 4 at tier 1 and NORMAL (barb_count = fc_rand(3) + 1 * 2, barbarian.c 613). That is above MAX_ATTACKERS = 3. Frankendom must cap the live attackers at 3 and queue the rest, or split the wave into two encounters. The donor has no such cap.
- Cadence is per turn in the donor, and the attempt count scales with map size and rate. Frankendom is real time, so the cadence and the attempt budget must be set as engine constants with a per-tick budget. A burst of attempts in one tick is the same risk as Veloren's refill burst.
- The victim is a player with many cities (empire size). Frankendom has no city count. It would need one player-level stat in the one ledger, defined and stored on the server, or the tier rule has no input.
- The known-to-victim test is the opposite of Veloren's presence gate. Freeciv spawns only on ground the victim has seen, so the player gets a warning. For Frankendom this is a design choice: a telegraphed wave (seen ground, shown warning) or a surprise wave (out of view). Pick one explicitly.
- The civil-war chance is a government effect in civ2civ3 (50 to 99). Frankendom should express the equivalent as zone data, not as a government.
- The donor removes a hut from the spot when a wave lands (593-602). Frankendom must decide what a wave may replace on the map, as an explicit rule, not as a side effect.
- The donor's own header comment questions the empire-size rule ("it seems a bit unjust if someone is always small", barbarian.c 527-531) and marks the government part as questionable (531). Do not treat the size gate as a balance guarantee.
- Server-verified kills: a wave creates attackers; it does not verify kills. Frankendom's kill rule stays in the engine.
