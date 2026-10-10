# diasurgical-DevilutionX (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` (`UpdateEnemy` 679; `ProcessMonsters` 4257; `ZombieAi` 2069) | Licence: Sustainable Use License 1.0 (root LICENSE.md line 1; no per-file licence header found in monster.cpp; restricted, not OSI) | C++ | symbol `UpdateEnemy`

Checked: `UpdateEnemy` read whole (679-752). `MonsterIdle` 1069-1081 read whole. `AiPlanPath` 1860-1891 read whole; `AiPlanWalk` 1815-1830 read in part (the path call and the first step). `ProcessMonsters` 4257-4330 read (the per-monster tick, from the regen through the AI call and the mode loop; 4330-4337 not read). `ZombieAi` 2069-2098 read whole. `UpdateModeStance` 3165-3209 read whole (switch only). `M_StartStand` 3927-3941 (head only). `GetMonsterDirection` 772-775 read whole. `monstdat.cpp` 264 read (flag name). Callers of `UpdateEnemy` in monster.cpp: 1077 (`MonsterIdle`, read), 4295 (`ProcessMonsters` wake-up, read), 3939 (`M_StartStand`, head read), 2485 (`GargoyleAi`, grep only), 3274 (`InitGolem`, grep only), 4168 (`GolumAi`, grep only). Not read: the declaration and definition of `dTransVal` (used here as a region id; compared for equality only), `Point::WalkingDistance`, `IsTileVisible`, `LineClear` and `IsTileSafe` bodies, `FindPath`, `FollowTheLeader`, `GroupUnity`, the Diablo exception in the aggro countdown beyond the one line read, `Monster` struct fields, and how often the game calls `ProcessMonsters` (the tick rate was not read). Confidence: high on the target choice, the aggro memory, and the path gate; medium on how complete the caller list is (three of five call sites read). Depth full for the target-choice and aggro path.

Best transferable idea: Pick the enemy in the same room before a closer one in another room, and keep an aggro memory that holds at full while the enemy is seen and counts down to zero when it is not.
Decision (proposed): adapt — the room-first rule with walking distance is a clean way to make zones matter for aggro, and the seen-then-count-down memory is a plain hysteresis; adapt because the donor refreshes its enemy at animation boundaries and on wake-up (not a fixed tick), uses a region value compared by equality that we would have to define, and its monster-vs-monster rules are not ours.
Acceptance: Server test: a zone NPC with a hero in its room at distance 6 and another hero in an adjacent room at distance 2 picks the room hero; after the room hero leaves sight, the NPC stays aggro for 255 ticks and then drops it (fixed seed, tick log asserted).

## 1. Mechanism

- Enemy choice, `UpdateEnemy` (679-752), runs for one monster at a time. It scans two candidate sets and keeps a single best:
  - Heroes (694-698 region): skipped if not active, not on the active level, or changing level, and dead heroes are skipped only in multiplayer (691). Each hero gets a same-room flag (`dTransVal` equal at both tiles, 693) and a walking distance (694). The hero is chosen when `(sameroom && !bestsameroom)`, or `((sameroom || !bestsameroom) && dist < bestDist)`, or there is no best yet (695-697). So a same-room hero beats any other-room best, and a closer hero wins only within the same room class. Choosing a hero clears `MFLAG_TARGETS_MONSTER` (698).
  - Other monsters (720-734): a normal monster (not golem, not berserk) skips every other monster that is not a golem. If the other is a golem, it still skips it at walking distance 2 or more unless it is ranged (720-724). Berserk monsters and golems consider all monsters. Player-minion golems do not fight each other. The same comparison picks the best monster (730-734).
  - Result: `enemy` and `enemyPosition` are set (744) and `MFLAG_NO_ENEMY` is cleared, or `MFLAG_NO_ENEMY` is set if there is no candidate (746).
- Enemy choice is called at these points:
  - `MonsterIdle` (1069-1081): at the last frame of the stand animation (1076-1077). So an idle monster re-picks once per idle animation cycle. Golems use the walk animation here.
  - `ProcessMonsters` wake-up (4279-4295): if the monster's tile is visible and `activeForTicks` is 0, it re-picks.
  - `M_StartStand` (3939), `GargoyleAi` (2485), `InitGolem` (3274), `GolumAi` (4168): grep only, not read in full.
- Per tick, in `ProcessMonsters` (4257-4330), for each active monster:
  - If multiplayer, the monster's RNG is reseeded from its own `aiSeed` (4266) and the seed advanced.
  - If there is an enemy: `enemyPosition` is the enemy's future position (4306), or the other monster's (4298-4302). If the monster's tile is visible, `position.last` (last known position) is set to the player's future position (4308).
  - Aggro memory (4313-4318): if the monster is not targeting a monster and its tile is visible, `activeForTicks` = 255 (`UINT8_MAX`, 4315). If not visible and not zero, it counts down by one per tick (4317). The Diablo exception applies only to the countdown (4317 region).
  - The AI step (4322-4323): monsters without the `SEARCH` flag always run their AI proc. For `SEARCH` monsters, `AiPlanPath` runs first, and if it returns true that tick's AI proc is skipped. Then the mode step runs (4326) and the loop repeats while it returns true.
- Path gate, `AiPlanPath` (1860-1891): for non-golems it returns false unless `activeForTicks` is not 0 (1863), the mode is `Stand` (1865), and the goal is Normal, Move or Attack (1867). Then it tests line of sight with `LineClear` over walkable and safe tiles (1873). If the line is not clear, or `pathCount` is 5 to 7, it checks doors if the monster can open them (1878) and `pathCount` goes up (1880). Below 5 it returns false (1881). From 5 it calls `AiPlanWalk` (1883), which runs `FindPath` to `enemyPosition` (1822) and walks the first step. When no step is planned, non-golems reset `pathCount` to 0 (1888).
- Chase style of `ZombieAi` (2069-2098): it acts only in `Stand` mode (2071) and only when the tile is visible (2075). Each tick, with chance `2 * intelligence + 10` percent (2079), it measures the walking distance to `enemyPosition` (2081). Far (at least `2 * intelligence + 4`, 2082): it walks on its own facing (2083, 2087), sometimes in a random direction. Mid (2 to the far limit): it random-walks toward the enemy direction (2089; `GetMonsterDirection` = direction from its tile to `enemyPosition`, 772-774). Adjacent (under 2): it attacks (2092). So zombies do not path-find; they steer by facing and direction.
- Who gets targeted by a monster hit: `MonsterAttackMonster` sets the target's `activeForTicks` to 255 when it was 0 (1138-1139). This is monster-on-monster only; the player case is the visible-tile rule above.

## 2. Key functions

- `UpdateEnemy`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 679-752. Hero and monster candidates, room-first walking-distance choice.
- `ProcessMonsters`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 4257-4337. Per-monster seed, enemy position, aggro memory, AI proc, mode loop.
- `AiPlanPath` and `AiPlanWalk`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 1815-1891. Line-of-sight gate, pathCount ramp, path step.
- `ZombieAi`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 2069-2098. Per-tick roll, far, mid, adjacent.
- `MonsterIdle`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 1069-1081. Re-picks the enemy at the end of each stand cycle.
- `SEARCH` flag: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/tables/monstdat.cpp` 264. Monster-data switch that enables path search.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Same-room candidate beats other-room best; within a class, the nearer wins | Room id is `dTransVal` equality (693); distance is `WalkingDistance` (694, not read) |
| Dead targets skipped only in multiplayer | Condition at 691 |
| Aggro memory: full while seen, count down per tick when not seen | 255 (`UINT8_MAX`) at 4315; countdown at 4317 |
| Path planning after a number of blocked checks | Threshold 5 and window 5 to 7 (1877, 1881) |
| Per-tick act roll that scales with intelligence | `2 * intelligence + 10` percent (2079); far limit `2 * intelligence + 4` (2082) |
| Per-monster RNG seed in multiplayer | `aiSeed` (4266) |

## 4. TypeScript sketch

simplified: keeps the donor's hero candidate rule (active and not changing level; dead skipped only in multiplayer; same-room test; the three-part comparison, first candidate always taken) and the aggro memory (full while seen, countdown when not). It omits the monster-vs-monster candidates and their golem and berserk rules, the future-position use, the wake-up and animation-boundary call sites, the path gate and pathCount ramp, the multiplayer RNG reseed, the door opening, and the Diablo exception in the countdown. The room and walking-distance functions are passed in because their bodies were not read.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Hero {
  id: number;
  alive: boolean;
  inActiveRoom: boolean; // on the active level and not changing level
  x: number;
  y: number;
}

interface Mob {
  x: number;
  y: number;
  enemy: number | null; // hero id
  aggro: number; // 0..AGGRO_MAX ticks of memory
}

interface Grid {
  room(x: number, y: number): number;                             // region id of a tile (donor: dTransVal, not read)
  walkDist(ax: number, ay: number, bx: number, by: number): number; // donor WalkingDistance (not read)
}

const AGGRO_MAX = 255;

// Pick the enemy: a hero in the same room beats one in another room; within the same class the nearer wins;
// the first candidate is always taken.
function pickEnemy(mob: Mob, heroes: Hero[], grid: Grid, multiplayer: boolean): number | null {
  let best: Hero | null = null;
  let bestDist = -1;
  let bestSameRoom = false;
  for (const h of heroes) {
    if (!h.inActiveRoom) continue;
    if (!h.alive && multiplayer) continue;
    const sameRoom = grid.room(mob.x, mob.y) === grid.room(h.x, h.y);
    const dist = grid.walkDist(mob.x, mob.y, h.x, h.y);
    if ((sameRoom && !bestSameRoom) || ((sameRoom || !bestSameRoom) && dist < bestDist) || best === null) {
      best = h;
      bestDist = dist;
      bestSameRoom = sameRoom;
    }
  }
  mob.enemy = best === null ? null : best.id;
  return mob.enemy;
}

// Aggro memory, once per tick: seen this tick -> full memory; unseen -> counts down to 0.
function tickAggro(mob: Mob, seenThisTick: boolean): boolean {
  if (seenThisTick) {
    mob.aggro = AGGRO_MAX;
  } else if (mob.aggro !== 0) {
    mob.aggro--;
  }
  return mob.aggro > 0;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the fight loop's aggro: enemy choice and the aggro memory, run in the engine). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted: clean-room, shape only)
- Brief rule served: one engine (enemy choice and aggro memory run in the engine, not the client); zones as data (the room rule needs a zone region map)

## 6. Gaps and risks

- Licence is restricted (Sustainable Use License 1.0). Clean-room only; nothing is copied.
- The enemy is refreshed at animation boundaries and on wake-up, not on a fixed tick. A monster can keep a stale enemy for a whole idle cycle. Frankendom's tick rule is fixed-step, so the refresh point must be explicit and tested.
- The room rule needs a region id per tile. The donor's `dTransVal` is compared only for equality and its definition was not read. Frankendom needs a zone region map as data, with a test that a same-room hero beats a nearer other-room hero.
- The only aggro refresh I traced is seen-based: the monster's tile is visible (4313-4315). Hits by heroes on monsters were not traced in the monster AI procs, so I do not know whether a hit also refreshes the memory. Frankendom's rule must say which one it uses and test it.
- Path planning is gated on a monster-data flag (`SEARCH`, read in tables/monstdat.cpp 264; the flags come from assets/txtdata/monsters/monstdat.tsv). The zombie rows there have an empty flags column (read, not receipted), and ZombieAi steers by facing and direction. Frankendom should keep that choice as data per enemy type, not as one engine rule.
- MAX_ATTACKERS = 3: this code has no attacker cap; any number of monsters can pick the same hero. The cap must come from the engine's fight rules, not from enemy choice.
- Monster-vs-monster candidates and golem rules are not Frankendom rulings. Do not port them.
- Not read: `dTransVal` definition, `WalkingDistance`, `IsTileVisible`, `LineClear`, `IsTileSafe`, `FindPath`, `FollowTheLeader`, `GroupUnity`, the tick rate of `ProcessMonsters`, and the bodies of `GargoyleAi`, `InitGolem`, `GolumAi` and `M_StartStand` beyond the call lines.
