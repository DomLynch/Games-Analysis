# daggerfall-unity (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` | Licence: MIT (`LICENSE` line 3: "Copyright (c) 2009-2023 Daggerfall Workshop"; `Game/Utility/FoeSpawner.cs` line 4: "MIT License") | C# (Unity) | symbol `IntermittentEnemySpawn`

Checked: Read in full: `PlayerEntity.cs` 347-368 and 470-530 (the per-frame catch-up that calls the roll) and 547-618 (`IntermittentEnemySpawn`); `FoeSpawner.cs` 1-243 (whole file); `RandomEncounters.cs` 1334-1527 (`ChooseRandomEnemy`); `FormulaHelper.cs` 1765-1813 (the four roll functions); `GameObjectHelper.cs` 1314-1333 (`CreateFoeSpawner`); `Dice100.cs` 1-25; `GameManager.cs` 684-732 (`AreEnemiesNearby`). Also opened as candidates: `Utility/PopulationManager.cs` 1-80 (civilian NPC pool, not foe spawns; not used); `Questing/Actions/CreateFoe.cs` (grep only, not read). Callers: `IntermittentEnemySpawn` has one caller, the catch-up loop at `PlayerEntity.cs` 491; `CreateFoeSpawner` is called from `PlayerEntity.cs` 574, 594, 610 (read) and from `SkullOfCorruptionEffect.cs` 76 and `SanguineRoseEffect.cs` 56 (grep only). Not read: what calls `PlayerEntity.Update` each frame (the code comment at 558 says it is called from `Update`), the `EnemySenses.cs` body around 535, `MeshReader.GlobalScale`, and what despawns a foe later. Confidence: high on the order of the director and the placement; medium on frame-level timing, because it depends on the unread per-frame caller. The table contents (other than the Crypt table, 34-56, which has 20 entries) were not read.

## 1. Mechanism

- A random encounter director runs on the game clock, not on the frame. Each frame, `PlayerEntity.Update` reads the world clock in game minutes and compares it with the last value it saw (367, 521). For every game minute in between, it calls `IntermittentEnemySpawn` once (486-491). The roll is skipped when spawns are suppressed (482) and for each minute while the player swims or is on a ship (489-490). `Update` returns early during a load or at zero health (349-353) before the cursor moves (521), so those minutes are rolled when it next runs.
- Only minutes inside a fixed window can roll. The window is 12 game minutes long and opens every 144 game minutes (`((Minutes / 12) % 12) == 0`, line 559). So a window opens 10 times per game day, at minute offsets 0, 144, 288 ... 1296 of the day.
- Presence picks the rule. Inside a building, nothing rolls unless the player is in a dungeon and resting (564, 600-605, 617). Outdoors in a town location, only night rolls (567-572, time check 569). Outdoors in the wilderness, a day roll and a night roll with different odds (577-596). In a dungeon, only while resting (605) and only if the enemy alert is active (1809-1812).
- A roll passes when the random number is 0 out of N: 1 in 24 (location night, wilderness night), 1 in 36 (wilderness day, dungeon with alert). On a pass, one foe is queued through `CreateFoeSpawner` with a minimum distance of 10, 10 or 8 units (550-552, 572-574, 590-594, 607-610). The foe is not created immediately; a `FoeSpawner` object waits for a valid spot.
- The first pass ends the catch-up for that frame (`break`, 491-492). The cursor is still moved to the current minute (521), so the rest of that frame's minutes are skipped and not rolled later. A later frame can still roll the rest of the same 12-minute window, so a window is not limited to one spawn.
- Placement (`FoeSpawner.Update` 53-80 calls `PlaceFoeFreely` every frame until the spot is placed; there is no time limit in the code). For outdoor spawns (line of sight on), the ray starts at the player and points at the camera's field-of-view edge plus a 0-4 degree jitter, on a random side (145-150, 159-161). A hit on a surface must leave at least the minimum distance after a 1.25-unit separation (166-176); with no hit, the point is a random distance between min and max along the ray (185). The point must have a floor within 4 units below (191-194) and an empty 0.65-unit sphere 1.25 units above the floor (195-198); then the foe is aligned to the ground, or flying foes are raised 1.5 units (210-228).
- Foe pick (`ChooseRandomEnemy`, 1334-1527): a table is chosen by place (dungeon type; building type; or town or wilderness with climate, day or night). Then `Dice100.Roll()` gives 1-100 (1471; `Dice100.cs` 12). The window of list entries is: roll 81-95 gives 0 to level+1; roll 96-100 gives 0 to level+2 (or 0-19 above level 5); roll 1-80 gives level-3 to level+3 (1476-1502). If the window starts below 0 it becomes entries 0-5; if it ends above 19 it becomes 14-19 (1503-1512). A uniform pick inside the window is returned (1526).
- Rest block: `AreEnemiesNearby` counts a pending spawner inside `1024 * MeshReader.GlobalScale` of the player as an enemy nearby (686, 721-729). So a queued spawn already blocks rest, before the foe exists.
- Enemy alert (the dungeon gate): the doc comment says it is raised by hostile enemies or by trying to rest near them (`PlayerEntity.cs` 294-295); the call sites are `EnemySenses.cs` 535 and `DaggerfallUI.cs` 655 (bodies not read). It is lowered when a hostile is killed (`EnemyDeath.cs` 136, caller condition not read) or after 8 hours of game minutes (`PlayerEntity.cs` 382-384, 297-302).

## 2. Key functions

- `PlayerEntity.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` 347-368 (clock read and checks), 482-521 (catch-up loop, roll call, cursor advance).
- `PlayerEntity.IntermittentEnemySpawn`: same file, 547-618. Order: window gate (559-561), presence (564), location or wilderness rolls (567-596), dungeon rest gate (600-610), return false.
- `FormulaHelper.RollRandomSpawn_*`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1765-1813. Each returns 0 to pass, or uses a `TryGetOverride` delegate first (1768, 1781, 1794, 1807), so a mod can replace the roll.
- `RandomEncounters.ChooseRandomEnemy`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RandomEncounters.cs` 1334-1527.
- `FoeSpawner.Update` and `PlaceFoeFreely`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/FoeSpawner.cs` 53-80 and 119-207.
- `GameObjectHelper.CreateFoeSpawner`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/GameObjectHelper.cs` 1314-1333 (the spawner starts on the player's position, 1330).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed window of 12 clock steps out of every 144; one roll per step inside the window | 144 and 12 game minutes (theirs, PlayerEntity.cs 559) |
| Each clock step rolls at 1 in N; first pass ends the frame's catch-up | N = 24 (location night, wilderness night), 36 (wilderness day, dungeon with alert) (theirs, FormulaHelper.cs 1771, 1784, 1797, 1810) |
| Minimum distance from the player, outdoors and indoors | 10 (location, 551), 10 (wilderness, 552), 8 (dungeon, 550); default maximum 20 (FoeSpawner.cs 37) |
| Spawn outside the camera view | Field-of-view edge plus 0-4 degrees (FoeSpawner.cs 146) |
| Placement clearance | Separation 1.25 (122), floor 4 (123), sphere 0.65 (121), extra distance up to 2 (179) |
| Foe window from the player's level | Base level-3 to level+3 (1500-1501), widened to level+1 at roll 81-95 and level+2 at 96-100 (1479-1496) |
| Alert decay | 8 * DaggerfallDateTime.MinutesPerHour game minutes (382; the constant's value was not read) |
| Rest block radius | 1024 * GlobalScale (GameManager.cs 686) |

The odds per window are arithmetic from these constants, not a measurement: with 1 in 36 and 12 rolls, about 29 percent of windows produce a spawn (1 - (35/36)^12 = 0.287); with 1 in 24, about 40 percent (1 - (23/24)^12 = 0.400). The frame split can change this, because a pass drops the rest of that frame's minutes.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (window, then presence and time of day, then the roll), and the frame catch-up with the break and the cursor. It omits the enemy pick, the placement raycasts and the field-of-view rule, the guard arrivals that share the same loop (500-511), the swim and ship gate, the suppression flag, the alert timer (the alert is an input here), the rest radius, and the foe-count cap (none exists in the donor).

```ts
type Presence = "outdoor-location" | "outdoor-wild" | "dungeon-resting" | "building" | "dungeon-moving";

interface SpawnRule {
  oneIn: number;          // roll passes when the dice returns 0 out of oneIn
  minDistance: number;    // world units from the player
  lineOfSight: boolean;   // place outside the camera view when true
}

const WINDOW_PERIOD = 144; // game minutes between window openings
const WINDOW_LENGTH = 12;  // game minutes per window; each minute is one roll

// True for the first 12 minutes of every 144-minute period.
function inWindow(minute: number): boolean {
  return Math.floor(minute / WINDOW_LENGTH) % (WINDOW_PERIOD / WINDOW_LENGTH) === 0;
}

// Presence and time of day decide the rule; null means no roll applies at this minute.
function ruleFor(presence: Presence, minute: number, alertActive: boolean): SpawnRule | null {
  const timeOfDay = minute % 1440;
  const day = timeOfDay >= 360 && timeOfDay <= 1080;
  switch (presence) {
    case "outdoor-location":
      return day ? null : { oneIn: 24, minDistance: 10, lineOfSight: true };
    case "outdoor-wild":
      return day
        ? { oneIn: 36, minDistance: 10, lineOfSight: true }
        : { oneIn: 24, minDistance: 10, lineOfSight: true };
    case "dungeon-resting":
      return alertActive ? { oneIn: 36, minDistance: 8, lineOfSight: false } : null;
    default:
      return null;
  }
}

interface Tick {
  spawnMinute: number | null;
  rule: SpawnRule | null;
}

// One frame: the clock moved from `last` to `now`; every minute in (last, now] is a roll.
// The first pass ends the loop for this frame; the caller still moves its cursor to `now`.
function catchUp(
  last: number,
  now: number,
  presence: Presence,
  alertActive: boolean,
  rollOneIn: (n: number) => number,
): Tick {
  for (let m = last + 1; m <= now; m++) {
    if (!inWindow(m)) continue;
    const rule = ruleFor(presence, m, alertActive);
    if (rule === null) continue;
    if (rollOneIn(rule.oneIn) === 0) return { spawnMinute: m, rule };
  }
  return { spawnMinute: null, rule: null };
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: the zone spawn director. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The numbers (window, 1-in-N per zone kind, minimum distance, alert) are zone data; the window period and the catch-up rule are engine logic. The server tick sub-line for this is "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3, row 18): the donor's clock catch-up is per frame, and Frankendom must run it on the fixed server step instead.
- Reuse tag: adapt-allowed (MIT: code may be adapted; this sketch is written fresh from the shape)
- Brief rule served: zones as data (the odds and distances are per-zone fields; the window and catch-up are one engine rule); one engine (the director runs on the server, the placement and camera stay client-side)

Best transferable idea: a zone spawn rate as a per-zone-kind 1-in-N roll on each clock step, inside a fixed 12-of-144 window, gated by presence (outdoor, dungeon while resting and alerted), with a server-side rule and no per-frame randomness.
Decision (proposed): adapt — take the window and the per-step 1-in-N shape as zone data, but add the population cap the donor lacks and run it on the fixed server step, so spawn counts do not depend on frame splits; reject the donor's frame-level catch-up and its client-side placement.
Acceptance: server test with a seeded RNG and a night rule of 1 in 24: advance a zone clock 1 440 steps one minute at a time; assert that every spawn falls on a minute inside a 12-minute window of a 144-minute period, that no two spawns share a minute, and that the live spawn count never exceeds the zone cap (row 23).

## 6. Gaps and risks

- No population cap. Nothing in `IntermittentEnemySpawn` or `CreateFoeSpawner` counts living or pending foes (547-618, 1314-1333). Each roll that passes adds one foe. Row 23 needs a cap, a respawn timer and a despawn on empty with a grace timer; the donor gives none of these in this path, so Frankendom must add them, not copy them.
- Frame-dependent outcome. A pass drops the rest of that frame's minutes (491-492, 521). So the spawn count depends on how the clock is split into frames. Frankendom's server tick is fixed-step; the same rule must roll once per fixed step and must not drop steps. This is a donor quirk to avoid.
- Placement is client geometry. `FoeSpawner.PlaceFoeFreely` uses the camera field of view and Unity raycasts (145-198). Frankendom's rulings say the camera is client-only and the server verifies kills; the server must pick the zone point from data, and the client may only pick a visible-out-of-view spot among the server's points. Do not put raycasts in the engine.
- Enemy pick uses the player's level and a per-place table (1334-1527). Frankendom should keep the table as zone data; the donor's level window is classic, and the table length guard (1516-1524) is a patch for short tables.
- Alert is a global player flag in the donor (297-302, 382-384). In Frankendom the alert belongs to the zone or to the encounter, not to the player.
- The catch-up loop is shared with city guard arrivals (500-511). A spawn break also skips those rolls for that frame. Frankendom should keep the two rolls separate.
- The rest radius (686) and "pending spawner blocks rest" (721-729) are rest rules, not spawn rules; Frankendom has no rest yet, so this is not transferable now.
- The donor's `TryGetOverride` delegates (FormulaHelper.cs 1768 and others) show a hook for replacing a roll; the Frankendom equivalent is a zone rule override in data, not a function hook.
- Not read: the body of `EnemySenses.cs` around 535, the per-frame caller of `PlayerEntity.Update`, and what despawns foes later. The despawn claim is therefore not made.
