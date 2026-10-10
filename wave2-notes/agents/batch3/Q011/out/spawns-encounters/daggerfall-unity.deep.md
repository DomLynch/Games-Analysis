# daggerfall-unity (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` (main: `IntermittentEnemySpawn`, 547-618) | Licence: MIT License (LICENSE file; header line 4 of `Utility/RandomEncounters.cs` and `Game/Entities/PlayerEntity.cs`) | C# (Unity) | symbol `IntermittentEnemySpawn`

Checked: Read the wandering-encounter director end to end: the caller `PlayerEntity.Update` (347-521, catch-up loop 486-493 and clock write 521), `IntermittentEnemySpawn` (547-618), the four roll helpers `FormulaHelper.RollRandomSpawn_*` (1765-1813), the spawn placer `FoeSpawner.Update` and `PlaceFoeFreely` (53-80, 119-207, plus `FinalizeFoe` 210-226 read), `GameObjectHelper.CreateFoeSpawner` (1314-1332), `RandomEncounters.ChooseRandomEnemy` (1334-1527) and `Dice100.Roll` (`Game/Utility/Dice100.cs` 10-13). Not read: the 20-entry monster tables in `RandomEncounters.cs` (28-1333, data only, only the first table and the index comments were read), `DaggerfallEntityBehaviour` (the caller of `Update`, so "runs every frame" is an assumption), `WorldTime.Now.IsDay`, and `PopulationManager.cs` (14-60 only; civilian NPC pool, not used). Only one caller of `IntermittentEnemySpawn` was read (`PlayerEntity.Update` 491). Confidence: high on the timing gate, odds and break behaviour; high on the selection bands; medium on the placement details (Unity physics specifics). camera_scope: not applicable (spawns topic).

Best transferable idea: a timed encounter director where a few game minutes in each period roll a zone-specific 1-in-N chance, the first success ends that catch-up batch, and the spawn point is a ring around the player that is kept out of view.

Decision (proposed): adapt - the window gate, per-zone 1-in-N odds and level-band monster pick fit a server-side zone director and zone data, but the spawn placement is a Unity camera-and-raycast step that must not run on the server, and the donor's unseeded `UnityEngine.Random` is not acceptable for server-verified encounters.
Acceptance: a server test (seeded RNG, 144 x 1000 simulated in-game minutes) asserts that spawns occur only on window minutes and that the observed rate per zone kind is within 5% of its `one_in_n`; in play a player in an open zone sees the new foe appear 10-20 units away and outside their view cone.

## 1. Mechanism

- Driver: `PlayerEntity.Update` (347) reads the absolute game clock (367). If the clock moved, it loops over every elapsed in-game minute (486) and calls `IntermittentEnemySpawn(minute)` (491), skipped while swimming or on a ship. The loop breaks at the first spawn (488 comment, 491-492), then `lastGameMinutes` is set to the current clock (521). Minutes after a spawn in the same batch are dropped, not carried.
- Window gate (`IntermittentEnemySpawn`, 559-560): a roll is possible only when `(Minutes / 12) % 12 == 0`, that is the first 12 minutes of every 144-minute block, and only when `preventEnemySpawns` is false (set after fast travel, jail time and vampire transform, per the comment at 479).
- Outside, inside a location rectangle (567): spawns only at night, where night means minute-of-day before 360 or after 1080 (566, 569). Roll `RollRandomSpawn_LocationNight() == 0` (572), 1 in 24. Spawner min distance 10 (551).
- Outside, wilderness (not in a location rectangle, 579-595): day (360-1080) rolls 1 in 36 (584); night rolls 1 in 24 (590). Spawner min distance 10 (552).
- Inside a dungeon (600-611): only while resting (605). Roll 1 in 36, and only when `EnemyAlertActive` is true (`FormulaHelper.cs` 1809-1810); otherwise the helper returns 1, meaning no spawn (1812). Spawner min distance 8 (550) and no line-of-sight check (610 passes `false`).
- On a success the function creates one foe spawner (`CreateFoeSpawner`, 574/594/610) and returns true, which stops the catch-up batch.
- Pick: `ChooseRandomEnemy` (1334) picks a table by dungeon type (1346), by building type or climate, or by day and night in the open (1343-1465). A location in daylight returns None (1372-1373). Then a d100 roll (1471, `Dice100.Roll` returns 1..100) picks a band of table indices around the player's level (1472): roll 1-80 gives `[level-3, level+3]` (1500-1501); roll 81-95 gives `[0, level+1]` (1495); roll 96-100 gives `[0, level+2]` if level <= 5 (1484), else `[0, 19]`. Out-of-range bands are clamped to `[0,5]` (1503) or `[14,19]` (1508-1510). If the table is shorter than the band needs, the band becomes its last six entries (max-5 to max), or, when max is under 5, a random pick from 0 to max-1 (1517-1523). The final index is a uniform random pick in the band (1526).
- Placement: `FoeSpawner` (created at the player's position, `GameObjectHelper.cs` 1330) places foes one per frame in `Update` (53-80). `PlaceFoeFreely` (119-207) picks a ray at the player's field-of-view angle plus 0-4 degrees, on a random side (145-155), or any direction when line-of-sight is off. If the ray hits something, it stops short of the hit by 1.25 units measured perpendicular to the surface, plus up to 2 units of random extra, and fails the attempt if the hit is closer than min distance plus that separation (166-185). Otherwise it places a point between min and max distance. It needs a floor within 4 units below (191) and an empty sphere of radius 0.65 at 1.25 above the floor (196). A failed attempt is retried next frame. The foe is aimed at the player (203). The spawner destroys itself after the last foe (71).

## 2. Key functions

- `PlayerEntity.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` 347-521. Catch-up loop 486-493; clock write 521.
- `PlayerEntity.IntermittentEnemySpawn`: same file, 547-618. Window gate 559-560; zone branches 566-611.
- `FormulaHelper.RollRandomSpawn_LocationNight / WildernessDay / WildernessNight / Dungeon`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1765-1813. Each returns 0 for a spawn, nonzero for none.
- `RandomEncounters.ChooseRandomEnemy`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RandomEncounters.cs` 1334-1527. Table pick 1343-1465; band and clamp 1471-1523; pick 1526.
- `FoeSpawner.Update` and `PlaceFoeFreely`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/FoeSpawner.cs` 53-80 and 119-207.
- `GameObjectHelper.CreateFoeSpawner`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/GameObjectHelper.cs` 1314-1332.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Periodic window: roll only during a fixed slice of each period | 12 of every 144 minutes (theirs, PlayerEntity.cs 559) |
| Per-minute independent roll per zone kind, 1 in N | N = 24 (night in a location, wilderness night), 36 (wilderness day; dungeon while resting and alerted) (theirs, FormulaHelper.cs 1771, 1784, 1797, 1810) |
| Catch-up over elapsed minutes; first success ends the batch and the rest is dropped | Break on first spawn (theirs, PlayerEntity.cs 488-491, 521) |
| Ring of spawn distance around the player | Minimum 10 (location, wilderness), 8 (dungeon) (theirs, PlayerEntity.cs 550-552); maximum 20 (theirs, FoeSpawner.cs 37) |
| Band of table entries around player level, with clamps | d100; roll 1-80: level plus or minus 3; roll 81-95: 0 to level+1; roll 96-100: 0 to level+2 (level <= 5) or 0 to 19 (theirs, RandomEncounters.cs 1477-1510) |
| Alert state that makes a zone dangerous and decays | 8 game hours (theirs, PlayerEntity.cs 382-383) |
| Chance that a roll succeeds at least once in one 12-minute window (my arithmetic, not in donor) | 1 - (1 - 1/24)^12 is about 40%; 1 - (1 - 1/36)^12 is about 29%, assuming the zone is constant over the window |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (window gate, zone odds per elapsed minute, first success ends the batch and the rest is dropped, level-band pick with its clamps). It omits the swimming and ship gate, the guard and reputation rolls, the `preventEnemySpawns` flag, the climate and building table lookup (the caller passes the zone), the dungeon-type table, the alert decay, the Unity raycast placement and the foe-type-None case. It mirrors the donor's exclusive bound on the short-table branch (`Random.Range(0, max)`) with `randInt(0, max - 1)`, so a shorter list than 20 entries is handled as in the donor.

```ts
// Licence: MIT (donor, Daggerfall Unity). Shape adapted; the numbers become zone data.

export type ZoneKind = 'night-location' | 'wilderness-day' | 'wilderness-night' | 'dungeon-rest';

export interface ZoneOdds {
  oneIn: number;          // 1-in-N chance per in-game minute while the window is open
  minDistance: number;    // spawn ring inside maxDistance (world units)
  maxDistance: number;
  losCheck: boolean;      // spawn outside the view cone (false in the donor's dungeon case)
}

// Donor values (PlayerEntity.cs 550-552, FormulaHelper.cs 1771/1784/1797/1810, FoeSpawner.cs 37).
export const DONOR_ODDS: Record<ZoneKind, ZoneOdds> = {
  'night-location':   { oneIn: 24, minDistance: 10, maxDistance: 20, losCheck: true },
  'wilderness-day':   { oneIn: 36, minDistance: 10, maxDistance: 20, losCheck: true },
  'wilderness-night': { oneIn: 24, minDistance: 10, maxDistance: 20, losCheck: true },
  'dungeon-rest':     { oneIn: 36, minDistance: 8,  maxDistance: 20, losCheck: false },
};

// Window: 12 minutes out of every 144 (donor: (minute / 12) % 12 === 0).
export function inWindow(minute: number): boolean {
  return Math.floor(minute / 12) % 12 === 0;
}

// Night band: before 06:00 or after 18:00 on the 1440-minute clock.
export function isNightClock(minute: number): boolean {
  const t = minute % 1440;
  return t < 360 || t > 1080;
}

// Catch-up over elapsed minutes (fromMinute, toMinute]. The first success ends the batch;
// the caller sets its clock to toMinute, so the remaining minutes of the batch are dropped.
export function catchUpRoll(
  fromMinute: number,
  toMinute: number,
  zoneFor: (minute: number) => ZoneKind | null,
  rollBelow: (n: number) => number,        // integer in [0, n)
): { minute: number; zone: ZoneKind } | null {
  for (let m = fromMinute + 1; m <= toMinute; m++) {
    if (!inWindow(m)) continue;
    const zone = zoneFor(m);
    if (zone === null) continue;
    if (rollBelow(DONOR_ODDS[zone].oneIn) === 0) return { minute: m, zone };
  }
  return null;
}

// Level-band pick over a 20-entry table (donor: RandomEncounters.ChooseRandomEnemy, d100 roll).
export function pickIndex(
  playerLevel: number,
  listLength: number,
  roll100: number,
  randInt: (lo: number, hi: number) => number,  // inclusive bounds
): number {
  let min: number;
  let max: number;
  if (roll100 > 80) {
    if (roll100 > 95) {
      min = 0;
      max = playerLevel <= 5 ? playerLevel + 2 : 19;
    } else {
      min = 0;
      max = playerLevel + 1;
    }
  } else {
    min = playerLevel - 3;
    max = playerLevel + 3;
  }
  if (min < 0) { min = 0; max = 5; }
  if (max > 19) { min = 14; max = 19; }
  if (max + 1 > listLength) {
    max = listLength - 1;
    // donor uses an exclusive upper bound here (Random.Range(0, max)); mirrored as randInt(0, max - 1)
    min = max >= 5 ? max - 5 : randInt(0, max - 1);
  }
  return randInt(min, max);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (server-side zone director: the window roll, zone odds and catch-up run on the server and read from zone data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The catch-up over elapsed in-game minutes is the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Zone data fields (see the JSON sidecar): one_in_n per zone kind, min and max distance, window 12 of 144 minutes, dungeon alert gating, level-band pick.
- Reuse tag: adapt (MIT, code may be adapted; shape used, numbers as zone data)
- Brief rule served: zone population (row 23): spawns come from zone data on the one engine, not from a per-scene script; server tick (row 18 sub-line)

## 6. Gaps and risks

- No population cap on live encounters on this path. A grep for `MaxEnem`, `maxEnem`, `enemyCap`, `MaxFoe`, `maxFoe` and `SpawnCap` across `Assets/Scripts` returned nothing. The only limit is the one-spawn-per-batch break. Frankendom needs an explicit cap per zone as data; `MAX_ATTACKERS = 3` is about attackers on one player, not zone population.
- The break is not a once-per-window cap. A spawn at minute m ends that batch, but the next frame's batch starts at m+1 and can roll again in the same 12-minute window. The effective rate is per frame, not per window.
- Placement needs the player's camera (FOV angle, 145) and Unity physics (166-203). The camera is client-only and the server never reads it, so placement must move to the client or to a server spawn-point list. Do not port the FOV rule to the server.
- Unseeded randomness: `UnityEngine.Random` is used throughout (1771, 1784, 1797, 1810, 1526). Server-verified encounters need a seeded server RNG so a replay or audit can reproduce the spawn.
- Empty-type spawn: `ChooseRandomEnemy` returns `MobileTypes.None` for an unmapped climate (1401, 1434, 1465) or when there is no PlayerEnterExit or PlayerGPS (1341). The caller still creates a spawner and returns true (574, 594, 610), so the batch is consumed. `FoeSpawner.Update` returns early when there is no pending foe (64) and never reaches the self-destroy (71), so the spawner GameObject stays. Read in code only; not run in the game.
- Two clocks: the spawn gate uses minute-of-day (566-569); the band pick uses `WorldTime.Now.IsDay` (1372, 1406). Whether they agree was not checked (`IsDay` not read).
- Alert state: the dungeon branch needs `EnemyAlertActive` (1809) and the alert decays after 8 game hours (382-383). Frankendom zone data should expose the decay, not hard-code it.
- The monster tables (`RandomEncounters.cs` 28-1333) are data. Frankendom should keep them as zone data, not port them. Only the first table and the index comments were read.
- MIT: code may be adapted. The sketch is written from the mechanism; no line of donor code is translated.

Reuse tag: adapt (MIT; shape used, numbers as zone data)
Brief rule served: zone population (row 23); server tick sub-line (row 18 / post-K item 3)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** none found. Verified MIT LICENSE; Update catch-up loop 486-493 (minute = l+last+1) and clock write 521; IntermittentEnemySpawn 547-618 (window 559, night <360 or >1080 at 566-569, distances 550-552, rest-only dungeon 605); FormulaHelper 1765-1813 (24/36/24/36, dungeon requires alert else returns 1); alert decay 382-383; FoeSpawner MaxDistance 20 (line 37), constants 0.65/1.25/4 (121-123), FOV-angle ray 145-150, retry via return, spawner destroy at 71, early return at 64; ChooseRandomEnemy bands 1471-1526; Dice100.Roll 1..100; Random.Range(0,max) exclusive mirrored correctly in sketch

**Missed:** CreateFoeSpawner places the spawner on the player at creation so rest/travel treats a pending spawn as a nearby enemy (GameObjectHelper.cs 1328-1330): a rest-interrupt rule not covered. Also FoeSpawner uses camera.fieldOfView degrees as the yaw offset (145), a looser 'outside view' rule than a cone test
