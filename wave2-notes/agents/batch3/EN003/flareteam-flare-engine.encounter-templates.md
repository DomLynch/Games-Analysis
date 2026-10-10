# flareteam-flare-engine - encounter-templates (EN003)

Donor root: /mnt/frankendom-donors/flareteam-flare-engine/ (engine, VPS read-only). Paired data half in the box: /mnt/frankendom-donors/flareteam-flare-game/ (maps, enemy and power definitions, read here for counts and values only). Asset audits: AU020/flareteam-flare-engine.assets.md and AU020/flareteam-flare-game.assets.md. Engine licence: GNU GPL v3 (README.engine.md line 33). Game data: CC-BY-SA 3.0 (flare-game README line 21). Shape only: no code, map, enemy file or text copied.

Checked: src/MapRenderer.cpp (enemyGroupPlaceEnemy 92-113, pushEnemyGroup 119-166, load 224), src/EnemyGroupManager.cpp (load 26-75, getRandomEnemy 77-122), src/Map.cpp (loadEnemyGroup 599-680), src/Map.h (Map_Group 67-105), src/EntityBehavior.cpp (target and aggro 140-290, idle and waypoint 455-620, wander point 985-1005), src/StatBlock.cpp (defaults 133-160, threat and cooldown 799-871, setWanderArea 1514-1518), src/Entity.cpp (hit path 355-366), src/EntityManager.cpp (spawn 150-160), src/MapCollision.cpp (isValidTile 238-260), src/UtilsMath.h (randBetween and percentChanceF 45-65), src/main.cpp 430 (srand). Confidence: high on the spawn order and the aggro rule; medium on the cadence of the per-step rolls (not traced); the beacon distance measure was not read.

Half read: both. Engine (src/) and game data (mods/*/maps, mods/*/enemies, mods/*/powers). The data counts are over every map under mods/*/maps with an [enemy] block, computed with awk; a few files were opened by eye (listed in section 7).

Best transferable idea: a spawn group is one row (category, level window, count range, rectangle, chance, wander radius), species are drawn from a duplicate pool weighted by rarity, and a hit enemy calls allies within four tiles into the fight.
Decision: adapt (idea). Six defects (section 4) are fixed in the sketch; the spawn-row idea is sound.

## 1. What the player sees and feels
A map loads with its spawn rectangles already populated. A camp is three or four bodies of one category (for example antlion, at level 6) inside a rectangle about eight by nine tiles. The bodies are not one species: each member draws its own species from the category and level window, so the knot reads as one kind of creature with some variety. They wander inside a box four tiles either side of where they stood, and they do not notice you until you are both in line of sight and inside their threat range. A hero with stealth shrinks that range (threat times (100 minus stealth) percent). When one of them is hit it shouts: nearby allies within four tiles join the fight. On a 375 wide screen the readable thing is a cluster of three or four of one category, and the shout is a visible cause and effect.

## 2. Why it works / is striking
- Readable silhouette: one category per spawn row, with the rectangle as the camp boundary. The cluster is the unit, not the single creature.
- One signature behaviour: the call for help. One hit draws the allies within four tiles that are not yet in combat (beacon power, radius 4.0, lifespan 33 ms, empyrean powers/categories/beacon.txt lines 8-9; included by 15 enemy files; the pull path is inferred, see section 3 item 9). Players can learn it in one fight.
- One signature effect: a join-combat power on six lines of enemy definitions (on_join_combat, power id 167, for example lvl9_goblin_shaker.txt line 17). The sound is not in this donor: the engine repo has no audio, and AU020 marks the game audio as unclear.
- Could be made ours at 20-30 percent resemblance: yes. The duplicate-pool rarity, the stealth-scaled threat range and the call-for-help pull all transfer. The creatures, categories and levels do not.

## 3. The rule behind it
Map load, one row at a time (MapRenderer::load 224, pushEnemyGroup 119-166):
1. Chance: the row is skipped unless a percent roll passes (percentChanceF, 121). The default is 100 (Map.h 97).
2. Count: a random number from the min to the max, inclusive (132).
3. Position: a random tile in the rectangle (139). A zero width or height pins to the origin.
4. Placement: a tile is accepted if the walls allow it (enemyGroupPlaceEnemy 93). The miss budget is five times the max count (135). If the budget runs out, a raster sweep takes the first free tiles from the origin (151-155).
5. Species, per member: getRandomEnemy (EnemyGroupManager 77-122). The candidates are enemies in the category whose level is in the window (91; a window of 0 and 0 means any level). Each is repeated six times if common, three if uncommon and once if rare (96-102). A uniform pick from that list (121).
6. Facing: random unless given (98). Wander radius defaults to four (Map.h 69). A waypoint list cancels wandering and is allowed on single-enemy rows only (Map.cpp 634 and 648, group area 1 by 1 at MapRenderer 103).
Each AI step (EntityBehavior.cpp):
7. Wander: the box is the spawn point plus or minus the radius, a side of two times radius plus one (StatBlock 1514-1518). A new point is a random tile in the box with a clear line (993). A pause happens only if a waypoint pause is set (460); a timer with zero duration ends at once.
8. Aggro: join when there is line of sight, the hero is inside the threat range (208), and inside the stealth-scaled range (154, 224, 228). Aggressive enemies are always in combat. Passive ones join only when hit. Disabled ones never.
9. Call for help: a hit on an enemy not yet in combat sets join-combat (Entity.cpp 360-362). Join-combat activates the beacon power (EntityBehavior 243-245). The power's own description is "bring other enemies into the fight with a dummy attack" (beacon.txt line 4), so allies in radius are hit by it and join through the same path. The power's target code was not read; that link is inferred from the description and the hit path.
10. Chase and flee: when in combat and farther than melee range, the enemy moves at the target on a percent roll (631). Flee range defaults to half the threat range (871).
11. Leave combat: the target is beyond twice the threat range (807 and 261), or a line-of-sight memory timer has run out (264). That timer only runs if cooldown_los is set, and no enemy file in the box sets it.

Data fields (designer-tunable; the donor licence is GPL v3 and data is CC-BY-SA, so donor_value is null everywhere):
- group_chance_pct (percent): engine default 100 (Map.h 97).
- group_count_min, group_count_max (count): engine default 1 and 1.
- group_level_min, group_level_max (level): default 0 and 0 (any level).
- rarity_pool_weight_common, _uncommon, _rare (count): donor 6, 3, 1 (EnemyGroupManager 96, 99, 102).
- wander_radius (tiles): engine default 4 (Map.h 69).
- threat_range (tiles): set in 65 enemy files; 8.0 is the most frequent value (16 lines).
- threat_range_far (tiles): engine default twice threat_range (StatBlock 807).
- hero_stealth_pct (percent): scales threat range by (100 minus stealth) percent (154).
- chance_pursue (percent per step): 10 is the most frequent value (54 lines in 152 enemy files).
- chance_flee (percent per step): 20 is the most frequent value (25 lines).
- beacon_radius (tiles): 4.0 (beacon.txt line 9).
- beacon_lifespan (milliseconds): 33 (beacon.txt line 8).
- miss_budget_mult (multiplier): 5 (MapRenderer 135).
- cooldown_los (duration): not set in any file under mods/* (zero matches for the key).

Counts (awk over mods/*/maps, 107 map files with [enemy] blocks; some maps may repeat across mods, not de-duplicated): 1429 spawn rows; the sum of maximum counts is 3382. Per 1000 map tiles (width times height, walls included, not open tiles): median 4.5, 90th percentile 7.8, maximum 11.5. In empyrean_campaign alone there are 1096 spawn rows, 257 with a wander radius, 3 with waypoints, and 2 waypoint pauses across all mods. Enemy files: 164 with a level line; 65 with threat_range; 152 with chance_pursue.

## 4. For Frankendom
- 700 zones as data: a spawn row is already our zone row shape: a category tag, a level window, a count range, a rectangle, a chance, a wander radius and a gate flag. The engine's requires_status and requires_not_status gates (Map.cpp 657-674; used by 6 and 9 rows in empyrean_campaign maps) map to our one-ledger world flags.
- 100 Pit characters reused: a category tag is the filter. A row draws species from the 100 by tag and level, with the rarity pool as weights. Recolour or one swapped ability gives variants (our reuse, not the donor's).
- Many-vs-one: a row of three fits the three-attacker cap; a row of four is one over. Keep the rectangle as the camp, and let the call-for-help pull only as many as the cap allows; hold the rest.
- Server-verified: the server rolls chance, count, species and tile from the zone seed and emits spawn events. The donor seeds the global rand() from time(NULL) (main.cpp 430), so its spawns are not reproducible; that cannot pass server verification.
- Server tick: the stealth-scaled threat and the beacon are per-step checks. We count them in server ticks, with a per-tick budget the donor does not have.
- Row 23 (zone population): the donor has spawn rows and one spawn per map load (MapRenderer 224), but no caps, no respawn timer and no despawn on empty. Our origins/server/world-spawns.ts still needs those three rules from elsewhere.
- Keep: the duplicate-pool rarity, the stealth-scaled threat, the call-for-help radius, the rectangle with a miss budget, the wander box, and the requires-status gate on a spawn row.
- Change: the defects below, the global rand(), the waypoint-only-single rule (we may want patrol loops for small groups), and the creature set.

Defects found, with fixes (Decision: adapt the idea; defects fixed in the sketch):
- Defect 1, MapRenderer 93: the spawn check uses COLLIDE_TYPE_NONE, which skips entity blocks (MapCollision 242-251). So two members, or a member and the hero, can share a tile at spawn. Whether EntityManager separates them later was not read. Fix: check an occupied set and the hero tile.
- Defect 2, EnemyGroupManager 117 and MapRenderer 94-96: an unknown category returns an empty species, the logger complains, and enemyGroupPlaceEnemy still returns true, so the member counts as placed and no enemy appears. Fix: validate every row at load and fail the zone build.
- Defect 3, EnemyGroupManager 96-102 and its error branch: an unknown rarity string adds zero copies, so that species is silently out of the pool. Fix: reject at load; default to common only with an error.
- Defect 4, MapRenderer 98, 139 and UtilsMath 48: the global rand() with modulo, seeded from time. Not reproducible and not server-verifiable. Fix: a per-zone seeded generator keyed by zone, row and respawn epoch.
- Defect 5, MapRenderer 151-155: the fallback sweep takes the first free tiles in raster order, so a crowded row clusters at its top-left corner. Fix: shuffle the free tiles, then take from the list.
- Defect 6 (data, not code): cooldown_los is unset in every enemy file, so enemies leave combat only by distance. The LOS memory is a good idea and the engine has it. Fix: set it in the enemy base files. Not a code defect.

Sketch (typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0). It is the rule in TypeScript, not the donor's code.

simplified: keeps the duplicate-pool rarity, the chance roll, the rectangle with a miss budget, the species drawn per member, the stealth-scaled aggro, the call-for-help pull, and the wander box. It drops the entity and power types, the waypoint queue and the file loader, and uses a plain Euclidean distance for the beacon. Fixes defects 1, 2, 4 and 5: occupancy is checked, rows are validated at load, the RNG is seeded, and the fallback shuffles.

```ts
export {};

type Tile = { x: number; y: number };
type Rarity = "common" | "uncommon" | "rare";
interface Species { id: string; category: string; level: number; rarity: Rarity }
interface SpawnGroup {
  category: string;
  levelMin: number;                                      // levelMin and levelMax both 0 = any level
  levelMax: number;
  area: { x: number; y: number; w: number; h: number };  // w or h of 0 pins to the origin tile
  countMin: number;
  countMax: number;
  chancePct: number;                                     // 0 to 100
  wanderRadius: number;                                  // donor default 4
}
interface Placed { tile: Tile; species: Species }

// Duplicate-entry pool: common 6, uncommon 3, rare 1 (donor EnemyGroupManager.cpp 96-102).
const WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 3, rare: 1 };
const MISS_MULT = 5; // donor allowed_misses = 5 * numbermax

function candidates(cat: string, lo: number, hi: number, all: Species[]): Species[] {
  const out: Species[] = [];
  for (const s of all) {
    if (s.category !== cat) continue;
    if (!(lo === 0 && hi === 0) && (s.level < lo || s.level > hi)) continue;
    for (let i = 0; i < WEIGHT[s.rarity]; i++) out.push(s);
  }
  return out;
}

// Donor logs a missing category at spawn time and still counts the member as placed; this fails at load.
export function validateGroups(groups: SpawnGroup[], all: Species[]): void {
  for (const g of groups) {
    if (candidates(g.category, g.levelMin, g.levelMax, all).length === 0) {
      throw new Error(`spawn group: no species for ${g.category} ${g.levelMin}-${g.levelMax}`);
    }
  }
}

// Seeded generator (mulberry32). Donor uses the global rand(), seeded from time(NULL).
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Donor: random tries inside the rectangle within a miss budget, then a raster sweep.
// Simplified: the fallback shuffles the free tiles (donor sweep clusters at the top-left).
// Fix: occupancy is checked (donor checks walls only).
export function spawnGroup(g: SpawnGroup, all: Species[], walkable: (t: Tile) => boolean,
  occupied: Set<string>, rnd: () => number): Placed[] {
  if (rnd() * 100 >= g.chancePct) return [];
  const pool = candidates(g.category, g.levelMin, g.levelMax, all);
  if (pool.length === 0) return [];
  const rndInt = (n: number): number => Math.floor(rnd() * n);
  const want = g.countMin + rndInt(g.countMax - g.countMin + 1);
  const key = (t: Tile): string => `${t.x},${t.y}`;
  const ok = (t: Tile): boolean => walkable(t) && !occupied.has(key(t));
  const out: Placed[] = [];
  const place = (t: Tile): void => {
    occupied.add(key(t));
    out.push({ tile: t, species: pool[rndInt(pool.length)] }); // species per member, as in the donor
  };
  const w = Math.max(1, g.area.w);
  const h = Math.max(1, g.area.h);
  let misses = MISS_MULT * g.countMax;
  while (out.length < want && misses > 0) {
    const t: Tile = { x: g.area.x + rndInt(w), y: g.area.y + rndInt(h) };
    if (ok(t)) place(t);
    else misses--;
  }
  if (out.length < want) {
    const cells: Tile[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t: Tile = { x: g.area.x + x, y: g.area.y + y };
        if (ok(t)) cells.push(t);
      }
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = rndInt(i + 1);
      const tmp = cells[i];
      cells[i] = cells[j];
      cells[j] = tmp;
    }
    for (const t of cells) {
      if (out.length >= want) break;
      if (ok(t)) place(t);
    }
  }
  return out;
}

// Donor wander box: spawn point plus or minus the radius (StatBlock.cpp 1514-1518).
export function wanderBox(spawn: Tile, r: number): { x: number; y: number; w: number; h: number } {
  return { x: Math.floor(spawn.x) - r, y: Math.floor(spawn.y) - r, w: 2 * r + 1, h: 2 * r + 1 };
}

// Donor aggro: sight plus a range that the hero's stealth shrinks (EntityBehavior.cpp 154, 208, 224).
export function engages(distance: number, lineOfSight: boolean, threatRange: number, heroStealthPct: number): boolean {
  const stealthRange = threatRange * (100 - heroStealthPct) / 100;
  return lineOfSight && distance < threatRange && distance < stealthRange;
}

// Donor beacon: a hit enemy calls allies within the beacon radius into combat.
// Simplified: Euclidean distance (the donor power code was not read).
export function beaconPull(at: Tile, radius: number,
  allies: { id: string; x: number; y: number; inCombat: boolean }[]): string[] {
  return allies
    .filter(a => !a.inCombat && Math.hypot(a.x - at.x, a.y - at.y) <= radius)
    .map(a => a.id);
}

// Keep: duplicate-pool rarity, rectangle spawn with a miss budget, stealth-scaled threat, beacon pull, wander box.
const species: Species[] = [
  { id: "a", category: "camp", level: 6, rarity: "common" },
  { id: "b", category: "camp", level: 6, rarity: "rare" },
];
const group: SpawnGroup = {
  category: "camp", levelMin: 6, levelMax: 6, area: { x: 50, y: 55, w: 8, h: 9 },
  countMin: 3, countMax: 3, chancePct: 100, wanderRadius: 4,
};
validateGroups([group], species);
const placed = spawnGroup(group, species, () => true, new Set<string>(), seededRng(42));
void placed.length;
void wanderBox({ x: 54, y: 59 }, 4);
void engages(5, true, 8, 50);
void beaconPull({ x: 0, y: 0 }, 4, []);
```

## 5. Five-minute look test (Dom, on his phone)
Target file: src/fight/aggro.ts, row 4 (fight loop: aggro, chase, leash).
Stub one camp at 375 wide: three or four bodies of one category in an eight by nine box, wandering four tiles either side. Run three variants: (a) the hero walks in at threat range 8 with stealth 0, then with stealth 50, so the approach distance changes; (b) one body is struck and the call for help is on, then off; (c) one lone guard on a four-point loop against the same guard wandering. Walk in and answer: from the door, does the cluster read as one camp; does the shout read as a call the player caused; does stealth change the feel of the approach; does the loop read as a guard on duty.

## 6. Licence and IP
Engine: GNU GPL v3 (README.engine.md line 33). Data and art: CC-BY-SA 3.0 (flare-game README line 21, per AU020). Shape only: no code, map, enemy file, text, or art is copied. The data counts above are numbers about other people's files, recorded for design only; the field names are ours. Kept as shape: the spawn row, the duplicate-pool rarity, the stealth-scaled threat, the call-for-help radius, the wander box. Changed: the creatures, categories, levels, numbers (ours are our own tuning) and the RNG. No legal conclusions drawn.

## 7. Gaps
- Half read: engine and data both. The data was read by counts and by a few files opened by eye: mods/empyrean_campaign/maps/antlion_nest.txt (spawn rows at lines 393-421, a camp of antlions at level 6 with rectangle 50,55,8,9 at line 395), mods/empyrean_campaign/powers/categories/beacon.txt (lines 1-12), mods/empyrean_campaign/enemies/base/beacon.txt (line 2), and lvl9_goblin_shaker.txt (line 17).
- Not read: the rest of Entity.cpp; EntityManager's enemy placement and any later separation of members on one tile; the beacon and join-combat power code (only the power definitions); MapSaver.cpp and SaveLoad.cpp (whether killed enemies stay gone after a map reload; MapRenderer 224 re-runs the spawn rows on every load); the death and respawn presentation; sound (no audio in the engine repo; AU020 marks game audio unclear).
- Cadence: the per-step rolls for chase, flee and wander run inside the AI step; their frequency per second was not traced, so the percent values are per decision, not per second.
- Walk density: a count per 1000 map tiles including walls. The donor does not give open-tile density or per-distance walking spawns. The "about every 20 seconds of walking" figure is not available here.
- Row 23: spawn rows exist; caps, respawn and despawn-on-empty do not appear in the spawn code read (src/MapRenderer.cpp, src/EnemyGroupManager.cpp).
- Readability: the sample map is isometric (orientation=isometric, tile size 192 by 96 in antlion_nest.txt header). Not measured at 375 wide.
- Enemy leader and follower links: none in the engine. grep for "leader" in src/*.cpp returned no hits, so this donor has no escort shape. The beacon is the only group link.
