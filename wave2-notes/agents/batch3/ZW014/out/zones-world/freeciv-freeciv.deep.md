# freeciv-freeciv (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` (main) with `server/barbarian.h`, `server/animals.c`, `server/srv_main.c` | Licence: GPL-2.0-or-later (per the header of server/barbarian.c and server/animals.c: "either version 2, or (at your option) any later version"; top-level COPYING is GPL v2) | C | symbols `summon_barbarians`, `try_summon_barbarians`, `create_animals`, `place_animal`

Checked: Read in full: `summon_barbarians` (server/barbarian.c 738-760), `try_summon_barbarians` (533-732), the spawn constants (server/barbarian.h 23-28, common/game.h 52-56 and 666-668), the once-per-turn call (server/srv_main.c 1669-1670, inside `end_turn`, which starts at 1609), and the whole of server/animals.c (49-166), plus the animal rule lines in data/civ2civ3/terrain.ruleset and the loader (server/ruleset/ruleload.c 3441-3450). Not read: `unleash_barbarians` (server/barbarian.c 272-), the hut and "is known to victim" helpers, `real_map_distance` in non-square topologies (I read only the call and the top of `map_vector_to_real_distance`), `get_player_bonus`, `create_unit` side effects, hut placement in map generation. Scope: this is a turn-based spawn director, not a real-time loop; it is not a camera topic. Confidence: high on the uprising path (order and numbers read), medium on the exact distance metric (topology dependent, not read in full).

Best transferable idea: Spawn zone population by sampling a random point, accepting it only inside a distance band from an existing zone anchor, and scaling the group size by how many anchors the owner holds.
Decision (proposed): adapt - keep the ring-band sampler and the population-tiered count as the zone spawn director; reject the one-shot, no-despawn uprising as it stands, because Frankendom needs caps, despawn-on-empty and a grace timer that the donor does not have.
Acceptance: a server test seeds three anchors on a 200x200 map; over 1000 passes at the NORMAL rate every spawn lands 5 to 8 tiles from an anchor on a tile with no unit, the tier steps up at exactly 10 anchors, and the live count per zone never exceeds the zone cap (cap is new, not in the donor).

## 1. Mechanism

- Trigger: once per turn at turn end (server/srv_main.c 1670), from `summon_barbarians`. Nothing happens before the onset turn (default 60, server/barbarian.c 747; common/game.h 668). The setting `barbarianrate` decides everything: DISABLED and HUTS_ONLY return at once (742-743). NORMAL = 2, FREQUENT = 3, HORDES = 4 (common/game.h 52-56 as enum order).
- Attempts per pass: `n = map_num_tiles() / MAP_FACTOR` (MAP_FACTOR 2000, minimum 1), then `n * (barbarianrate - 1)` independent tries (server/barbarian.c 751-757). On a 4000-tile map at NORMAL that is two tries per turn.
- Each try (`try_summon_barbarians`, 533-732), in the donor's order:
  1. Draw one uniformly random tile (552). Reject if its terrain has the no-barbarian flag (554-556).
  2. Find the nearest city of any player (558-559, all filters FALSE and no player given). Reject if there is none. The city's owner becomes the "victim".
  3. Reject unless the real map distance from the sample to that city is between MIN_UNREST_DIST 5 and MAX_UNREST_DIST 8 (566-571; barbarian.h 23-24). This is the spawn ring: a band 5 to 8 tiles out from a settlement.
  4. Reject if no tile in the 3x3 block around the sample is free of units (574; helper 504-513), or if that tile is not known to the victim and is not ocean, or if it is not "near land" (within a square of radius 4 holding a non-ocean tile, 490-499; 574-577).
  5. Gate A: `fc_rand(30) + 1 > victim cities * (barbarianrate - 1)` returns (584-585). So the more cities the victim holds, the more often the gate passes.
  6. Gate B: `fc_rand(100) > EFT_CIVIL_WAR_CHANCE` of the victim returns (586). A pass is a roll at or below the government's chance (classic ruleset: Anarchy 90, Despotism 80; data/classic/effects.ruleset 432 and 440).
  7. Remove any hut on the chosen tile (591-602).
  8. Tier from the victim's city count: start at tier 1 with `city_max = 10`; while `city_max <= city_count` raise the tier and set `city_max += city_max*1.2 + 10` (605-611). By hand from that loop (my arithmetic, not run): tier 2 from 10 cities, tier 3 from 32, tier 4 from 80.
  9. Count: `barb_count = fc_rand(3) + tier * barbarianrate` (613). At NORMAL and tier 1 that is 2 to 4.
  10. Land tile (616-636): create one barbarian player if needed; create up to `barb_count` units of the land barbarian type on tiles where the unit can live and only if the player does not already hold that unique unit; create a leader unit the same way (637-642).
     Ocean tile (643-705): a sea raider transport, then cargo up to capacity minus one, then a leader (only if the boat can be placed safely).
  11. If no unit was created, return silently (707-709). Otherwise show the spawn to the victim and the barbarians (713-731).
- The loop is turn-based: no fixed step, no accumulator, no per-frame loop. Each pass is a batch of independent random tries.

Animals (same design, a different path, `server/animals.c`):
- Once, at new-game start (server/srv_main.c 3512-3515 calls `create_animals`; server/animals.c 110 returns if the setting is 0).
- Count: `MAP_NATIVE_WIDTH * MAP_NATIVE_HEIGHT * animals / 1000` tries (animals.c 161-165). The default is 15 per thousand tiles (common/map.h 646).
- Each try (`place_animal`, 61-98): a random map position (63). Reject if it holds a hut (66-72), if any unit is already there (74-78), or if a city or a non-allied unit is within squared distance 5 of it (80-85; `circle_iterate` takes a squared radius, common/map.h 407-420). Pick the animal type with a uniform draw from the terrain's own list (49-56, 87). Reject if the player already holds that unique type (89).
- The per-terrain list is ruleset data: server/ruleset/ruleload.c 3441 reads `%s.animals`. In data/civ2civ3/terrain.ruleset only Ocean (section at 315, entry at 350) and Deep Ocean (section at 366, entry at 401) have `animals = "Storm"`. The classic ruleset has no animal entries. So in the shipped rulesets the only animals are sea storms.
- Animals are not respawned or despawned after creation (nothing in animals.c; not searched beyond this file).

## 2. Key functions

- `try_summon_barbarians`: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` 533-732. The full spawn try: sample, ring band, gates, tier, count, land or sea placement.
- `summon_barbarians`: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.c` 738-760. The pass: onset check, attempts `n * (rate - 1)`.
- `place_animal`: `/mnt/frankendom-donors/freeciv-freeciv/server/animals.c` 61-98. One animal try with the exclusion circle.
- `create_animals`: `/mnt/frankendom-donors/freeciv-freeciv/server/animals.c` 103-166. Density loop, once at game start.
- Constants: `/mnt/frankendom-donors/freeciv-freeciv/server/barbarian.h` 23-28.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sample a random point, accept only inside a distance band from an anchor | Band 5 to 8 tiles (theirs, server/barbarian.h 23-24) |
| Attempts per pass scale with map area, times a rate factor | One try per 2000 tiles, times (rate - 1) (theirs, barbarian.c 751-757) |
| Gate that grows with the owner's anchor count | Roll of 30 against cities times (rate - 1) (theirs, barbarian.c 584-585) |
| Government chance as a percentage gate | Anarchy 90, Despotism 80 in the classic ruleset (theirs, data/classic/effects.ruleset 432, 440) |
| Group size = small random base + tier times rate, tier from city count | Random base 0 to 2; tier thresholds at 10, 32, 80 cities (theirs, barbarian.c 605-613; thresholds by hand from the loop) |
| Animal density per 1000 tiles, rejected on occupied tiles | Default 15 per 1000 (theirs, common/map.h 646); exclusion squared radius 5 (theirs, animals.c 164) |
| Per-terrain spawn table, uniform pick | Shipped only for sea storms (theirs, data/civ2civ3/terrain.ruleset 350, 401) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the spawn try (sample, terrain no-spawn check, nearest anchor and ring band, free tile in the 3x3 block, gate A, gate B, tier and count). It omits the sea-raider boat and leader, the hut removal, the "known to victim" and "near land" tests, the unique-unit checks, the notification, and the use of real map distance (it uses a square-grid distance). It replaces the government chance with a per-owner function. It does not add any cap, despawn or grace timer; those are Frankendom additions, not in the donor.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Pt = { x: number; y: number };
interface Anchor { pos: Pt; owner: string; }            // a settled point (a donor city) that anchors a zone
interface Rules {
  minBand: number; maxBand: number;                      // tile distance band from the nearest anchor
  rate: number;                                          // barbarian rate: 2 = NORMAL, 3 = FREQUENT, 4 = HORDES
  mapFactor: number;                                     // one attempt per mapFactor tiles, per pass
  onsetTick: number;                                     // no spawns before this tick
  chanceByOwner: (owner: string) => number;              // percent 0..100 for the owner's government
}
interface World {
  width: number; height: number; anchors: Anchor[];
  noSpawn(p: Pt): boolean; occupied(p: Pt): boolean;
}
export interface Spawn { owner: string; at: Pt; count: number; }

// Tile distance. Sketch uses Chebyshev distance; the donor uses real_map_distance in the active topology (not read in full).
const dist = (a: Pt, b: Pt): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Tier rises at owner-anchor counts 10, 32, 80 (donor loop, city_max truncated to int on each step).
function tierFor(anchorCount: number): number {
  let tier = 1; let max = 10;
  while (max <= anchorCount) { tier++; max = Math.trunc(max + max * 1.2 + 10); }
  return tier;
}

// One attempt: sample a uniform random tile, then pass through the donor's gates in order.
export function tryOneSpawn(w: World, r: Rules, rng: () => number, owned: Record<string, number>): Spawn | null {
  const pick = (n: number): number => Math.floor(rng() * n);
  const p: Pt = { x: pick(w.width), y: pick(w.height) };
  if (w.noSpawn(p)) return null;

  let best: Anchor | null = null; let bestD = Infinity;
  for (const a of w.anchors) { const d = dist(p, a.pos); if (d < bestD) { bestD = d; best = a; } }
  if (best === null || bestD < r.minBand || bestD > r.maxBand) return null;

  let at: Pt | null = null;                              // a free tile in the 3x3 block around p
  for (let dy = -1; dy <= 1 && at === null; dy++) {
    for (let dx = -1; dx <= 1 && at === null; dx++) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x >= 0 && q.y >= 0 && q.x < w.width && q.y < w.height && !w.occupied(q)) at = q;
    }
  }
  if (at === null) return null;

  const owner = best.owner;
  const n = owned[owner] ?? 0;
  if (pick(30) + 1 > n * (r.rate - 1)) return null;      // gate A: more anchors, more likely
  if (pick(100) > r.chanceByOwner(owner)) return null;   // gate B: government chance

  return { owner, at, count: pick(3) + tierFor(n) * r.rate };
}

// Per-pass driver: attempts = floor(area / mapFactor) * (rate - 1), none before the onset tick.
export function passSpawns(w: World, r: Rules, rng: () => number, owned: Record<string, number>, tick: number): Spawn[] {
  if (tick < r.onsetTick || r.rate <= 1) return [];
  const area = w.width * w.height;
  const attempts = Math.max(1, Math.floor(area / r.mapFactor)) * (r.rate - 1);
  const out: Spawn[] = [];
  for (let i = 0; i < attempts; i++) {
    const s = tryOneSpawn(w, r, rng, owned);
    if (s !== null) out.push(s);
  }
  return out;
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file /tmp/freeciv-barbarian-spawn.ts).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director; engine logic, zones as data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The ring-band sampler and the tier count feed row 23. The per-pass attempt budget is the "server tick: fixed step, input intake, per-tick NPC budget" sub-line of row 18 / post-K item 3. Frankendom would run it on a fixed server tick (interval as data), not once per turn.
- Today: origins/server/world-spawns.ts (row 23's file). No fight-module target; this is not a fight step.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (spawn numbers in zone data, the sampler is one engine rule); one engine (spawn logic in the engine, not in each zone client).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no lines are translated.
- No cap: the donor keeps no count of live barbarians. Uprisings only add units; `BARBARIAN_MIN_LIFESPAN` (barbarian.h 30) is defined and not referenced anywhere else in the donor tree (grep over the whole tree). Frankendom needs a per-zone cap and must not copy the unbounded growth.
- No despawn, no grace timer: a barbarian group, once spawned, stays until killed. Frankendom's row 23 needs despawn on empty after a grace timer; that has no counterpart here.
- Turn-based: the donor's pass runs once per turn at end of turn. Frankendom runs on a real-time server tick, so the attempt count per pass must be rescaled to a per-tick budget (data field), or spawns will happen at the wrong rate.
- The spawn ring is measured from the nearest city of any player, not from a zone boundary. Frankendom's zones have explicit boundaries; the anchor must be the zone anchor, not a random settlement.
- Gate B is a government percent with no equivalent in Frankendom. Replace it with a zone data field, or drop it.
- The sea and leader branches (barbarian.c 643-705) and the hut removal (591-602) are not in the sketch. They are not needed for the zone director.
- The tier thresholds (10, 32, 80) are a loop, not a table. Frankendom should keep them as zone data, not as constants.
- The per-terrain animal table is a good data idea but the shipped rulesets only use it for sea storms. Animals are placed once and never replaced (animals.c has no respawn path). Do not treat this as a respawn model.
- Not read: `unleash_barbarians` (the hut-triggered release path, barbarian.c 272-), so the hut-to-spawn behaviour is not described here.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data; one engine; spawn logic in the engine, numbers in zone data (row 23)
