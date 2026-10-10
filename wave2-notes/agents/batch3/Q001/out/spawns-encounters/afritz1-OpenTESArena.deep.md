# afritz1-OpenTESArena (spawns-encounters, cell 2)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/ArenaEntityUtils.cpp` (encounter gates, chance, level and row choice, offset sampler), with `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/GameState.cpp` (trigger and placement) | Licence: MIT (LICENSE.txt line 1: "The MIT License (MIT)", copyright 2016-2026 The OpenTESArena Developers) | C++ | symbol `ArenaEntityUtils::getEncounterParameters` / `ArenaEntityUtils::chooseEncounterEnemy` / `GameState::tickGameClock`

Checked: Read in full: `ArenaEntityUtils.cpp` 1000-1230 (gates, chance, level, row choice), `ArenaEntityUtils.cpp` 1231-1277 (offset sampler, the enclosing loop), `GameState.cpp` 848-935 (spawn placement, the tail after 935 not read), `GameState.cpp` 1240-1344 (clock tick, trigger), `ArenaMathUtils.cpp` 40-100 (dice), `Random.cpp` 66-85 (RNG), `EntityChunkManager.cpp` 2100-2112 (nearby-enemy test), `Game.cpp` 125-135 and 920-930 (frame delta into the clock). Callers: the trigger is the only caller of `getEncounterParameters` and `chooseEncounterEnemy` in `src/` (grep). Not read: the chance and table bytes (read from the original game's EXE at load, `ExeData.cpp` 536 and 584; the values are not in the repo as text as far as read); `ArenaClockUtils` constants (GameSecondsPerRealTimeSecond, CampingTimeScale); `PlayerConstants::SAFE_SLEEP_DISTANCE` value; `anyCitizensNearby`. Confidence: high for order of operations and the level and row logic; medium for the chance values, which the code only reads from the EXE. camera_scope: n/a.

Best transferable idea: a chance roll per attempt, with each attempt gated by environment and presence (no live enemy near), then a level picked as a folded dice curve centred on the player's level with a reroll when it falls too low, and an offset sampler that widens its search after a miss.

Decision (proposed): adapt - take the gate chain, the per-environment percent chance and the level fold with reroll, and the offset sampler with widening; reject the EXE byte-table layout and the terrain-zero shortcut (the donor's caller always passes 0), and keep the group size under MAX_ATTACKERS = 3 instead of the donor's table counts.
Acceptance: a server test with a seeded RNG: at player level 5 in a zone with a 30 percent day chance and no enemy within the safe distance, 10,000 attempts give an encounter rate within 3 points of 30 percent, group sizes match the chosen row and never exceed 3, a level-0 player only gets levels 0-2, and no placed point lands on the player's own tile.

## 1. Mechanism

Encounters are driven by the in-game clock, not by frames. During world play, each frame the game loop passes the clamped frame delta to `tickGameClock` (Game.cpp 925; the clamp is at 132). The clock advances by that delta times a game-seconds-per-real-second scale, with a camping multiplier (GameState.cpp 1240-1246). Scale values were not read. One encounter attempt runs when the in-game hour changes or the minute changes (1273, 1302). Order of steps:

(1) Gates. Hour-change gate (ArenaEntityUtils.cpp 1023-1040): never on a raised platform; always in wilderness; otherwise only while camping. Minute-change gate (1002-1021): never on a raised platform; in a city only when no citizens are present (1012, `return !areCitizensPresent; // During night`); in a building or dungeon only when not camping, or in an interior even when camping; never in wilderness. Both gates are combined with an OR (1305). Then a presence gate: no living enemy within the safe distance of the player (GameState 1305; EntityChunkManager.cpp 2100-2112, dying entities are skipped at 2108-2110).

(2) Chance. `getEncounterParameters` (1043-1161) picks an index into the EXE chance array by environment, with +5 at night (outdoors, 1113-1116) or while resting (dungeons, 1130-1133). A table index of 7 is the default, +7 at night (1142), and 13 or more means no encounter (1145-1147). Fixed chances: 20 percent for trespassing in a building (1074), 25 percent on two holiday nights (1155-1157). The roll is `encounterChance > arenaRandom.next(100)` (GameState 1316), so the chance is a percent.

(3) Level. `chooseEncounterEnemy` (1175-1228). Start level = min(player level + 1, 20) plus a random 0 to 3 (1179-1180). Weighted roll: `rollBoundedDice(2L)` then, if the value is above L, fold it to 2L minus the value (1166-1169). That gives a bell-like weight that peaks at L. Accept when the roll is at least L/2 (integer division), taking max(roll, 1); otherwise round L down to even and roll again (1185-1191). A level-0 player at level 2 or more gets a random 0 to 2 (1194-1197). The main-quest floor (1199-1202) does not run: the caller passes `false` (GameState 1318).

(4) Row. The level-to-entry index list for the chosen table index is scanned for the level; the first two matches are kept and one is picked by a coin flip (1206-1218), and that index selects the entry row (1222). The entry gives `count`, `id` and `level` (1224-1227). The debug build asserts there are exactly two matches (1217); with no match, a release build would use -1 as the index (the asserts at 1217 and 1219 are debug-only).

(5) Placement. `spawnEncounterEnemies` (GameState 848) calls `findRandomSpawnLocationAroundPlayer` once per enemy (874). The sampler (a square offset, not a ring) adds `(int16)random >> shift` to the player's position on each axis, with shift starting at 6 (1233, 1241), so the first ring is about ±512 arena units, which is about ±4 tiles of 128 units (the converter at GameState 876-881 divides by 128). It makes 40 attempts per shift (1239), rejects a sample on the player's own tile (1254), snaps to a tile centre (1317), and halves the shift to widen (1276). The validity check (wall and floor) that the sampler's own code would do is inside a comment block (1262-1264); the real check is in GameState: an empty voxel with a floor (895), and a failed sample is skipped, so fewer than `count` enemies can spawn.

RNG: `next()` is `value *= 7143469` then `(value >> 16) & 0xFFFF` (Random.cpp 68-69); `next(n)` is `next() % n` (74).

## 2. Key functions

- `GameState::tickGameClock`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/GameState.cpp` 1240-1344 (trigger at 1305-1322).
- `ArenaEntityUtils::isEnemyEncounterAllowedOnMinuteChanged`: `.../src/Entities/ArenaEntityUtils.cpp` 1002-1021.
- `ArenaEntityUtils::isEnemyEncounterAllowedOnHourChanged`: `.../ArenaEntityUtils.cpp` 1023-1040.
- `ArenaEntityUtils::getEncounterParameters`: `.../ArenaEntityUtils.cpp` 1043-1161.
- `ArenaEntityUtils::rollWeightedEncounterLevel`: `.../ArenaEntityUtils.cpp` 1164-1171.
- `ArenaEntityUtils::chooseEncounterEnemy`: `.../ArenaEntityUtils.cpp` 1175-1228.
- `ArenaEntityUtils::findRandomSpawnLocationAroundPlayer`: `.../ArenaEntityUtils.cpp` 1231-1277.
- `GameState::spawnEncounterEnemies`: `.../src/Game/GameState.cpp` 848-935 (placement loop 874-903).
- `EntityChunkManager::anyEnemiesNearby`: `.../src/Entities/EntityChunkManager.cpp` 2100-2112.
- `ArenaMathUtils::rollBoundedDice`, `getDiceParameters`: `.../src/Math/ArenaMathUtils.cpp` 48-100.
- `ArenaRandom::next`: `.../src/Math/Random.cpp` 66-75.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Chance roll per attempt, percent against a uniform 0-99 | Fixed chances 20 (trespass, theirs 1074) and 25 (holiday night, theirs 1157); the rest are EXE table bytes (theirs, read at load, ExeData.cpp 536, 584; values not read) |
| Level = player level + 1, capped at 20, plus 0-3 | Cap 20 (theirs, 1179); jitter 4 (theirs, 1180) |
| Folded bell weight: roll 0 to 2L, values above L mirrored | Mechanism only; fold at 1169 |
| Accept when at least half the level, else round to even and retry | Half, integer division (theirs, 1185); round-to-even (theirs, 1191) |
| Level-0 newcomers get 0-2 | 0-2 (theirs, 1196) |
| Offset sampler: random offset >> shift, 40 tries per shift, shift halves | Start shift 6 (theirs, 1233); 40 tries (theirs, 1239); tile 128 units (theirs, GameState 876-881) |
| Night hours | Night is hour 18 or later and hour 5 or earlier in the chance utility (theirs, 1059); the trigger's night is hour 5 or earlier and hour 19 or later, so 18 is day there (theirs, GameState 1259) |

## 4. TypeScript sketch

simplified: this sketch uses one encounter table; the donor picks the table from environment, terrain, night and building type (1058-1161), and the sketch takes the table as data. It keeps the gate order, the chance roll, the level choice with its reroll, the row coin flip, and the offset sampler with widening. It omits the trigger's clock logic, the camping timers, the citizen check, the holiday override, the spawn-voxel validity check, the entity creation and the main-quest floor. The donor asserts that the shift stays above zero (1277) and, in a release build, keeps sampling at shift 0; the sketch stops at shift 1 and returns null. The donor's debug assertion on two matching rows is a `null` return here.

```ts
// Licence: MIT (donor LICENSE.txt). Adaptable; this sketch re-expresses the mechanism in TypeScript with the donor's order of steps.
type Env = "city" | "wilderness" | "interior" | "dungeon";

interface Gate {
  env: Env;
  hourChanged: boolean;
  minuteChanged: boolean;
  citizensPresent: boolean;   // donor: !isNightForEncounters || anyCitizensNearby
  camping: boolean;
  onRaisedPlatform: boolean;
  enemyNearby: boolean;       // donor: anyEnemiesNearby(playerPosition)
  playerLevel: number;
}

interface Row { count: number; id: number; level: number; }

interface EncounterData {
  chance: Record<Env, { day: number; night: number }>; // zone data: percent 0..100 (donor: EXE table, read at load)
  rowsByLevel: number[][];                              // zone data: for each level, the row indexes that carry it (donor: two matches)
  rows: Row[];                                          // zone data: count, id, level per row
}

interface Rng { next(n: number): number; raw16(): number; }

// Donor: ArenaMathUtils::getDiceParameters and rollBoundedDice (ArenaMathUtils.cpp 52-96).
function diceParams(value: number): { faces: number; count: number } {
  let v = value;
  for (;;) {
    for (let divisor = 6; divisor > 4; divisor--) {
      if (v % divisor === 0) return { faces: divisor + 1, count: v / divisor };
    }
    v++;
  }
}
function rollBoundedDice(maxValue: number, rng: Rng): number {
  if (maxValue <= 8) return rng.next(maxValue);
  const p = diceParams(maxValue);
  let sum = 0;
  for (let i = 0; i < p.count; i++) sum += rng.next(p.faces);
  return sum > maxValue ? rollBoundedDice(maxValue, rng) : sum;
}

// Donor: rollWeightedEncounterLevel (ArenaEntityUtils.cpp 1166-1169). Triangular fold around the level.
function weightedLevel(level: number, rng: Rng): number {
  const r = rollBoundedDice(level * 2, rng);
  return r > level ? level * 2 - r : r;
}

// Donor: chooseEncounterEnemy level part (ArenaEntityUtils.cpp 1179-1201).
function chooseLevel(playerLevel: number, rng: Rng): number {
  let level = Math.min(playerLevel + 1, 20) + rng.next(4);
  for (;;) {
    const r = weightedLevel(level, rng);
    if (r >= Math.floor(level / 2)) { level = Math.max(r, 1); break; }
    level = (level >> 1) * 2; // round down to even, then roll again
  }
  if (playerLevel === 0 && level >= 2) level = rng.next(3);
  return level;
}

// Donor: findRandomSpawnLocationAroundPlayer (ArenaEntityUtils.cpp 1231-1276). Offset sampler that halves the shift to widen.
const snap = (c: number): number => (c & ~127) + 64;
export function offsetSample(px: number, pz: number, rng: Rng): { x: number; z: number } | null {
  let shift = 6;
  while (shift > 0) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const dx = ((rng.raw16() << 16) >> 16) >> shift;
      const dz = ((rng.raw16() << 16) >> 16) >> shift;
      const x = snap(px + dx);
      const z = snap(pz + dz);
      if ((x >> 7) === (px >> 7) && (z >> 7) === (pz >> 7)) continue; // same tile as the player
      return { x, z };
    }
    shift >>= 1;
  }
  return null; // donor asserts here; sketch gives up
}

// One encounter attempt, called on a game-clock change. Order follows GameState.cpp 1273-1322.
export function encounterAttempt(g: Gate, night: boolean, data: EncounterData, rng: Rng, place: () => { x: number; z: number } | null): { row: Row; points: ({ x: number; z: number } | null)[] } | null {
  const minuteOk = g.minuteChanged && !g.onRaisedPlatform && (g.env === "city" ? !g.citizensPresent
    : g.env !== "wilderness" ? (!g.camping || g.env === "interior") : false);
  const hourOk = g.hourChanged && !g.onRaisedPlatform && (g.env === "wilderness" || g.camping);
  if (!(minuteOk || hourOk) || g.enemyNearby) return null;

  const chance = data.chance[g.env][night ? "night" : "day"];
  if (chance <= rng.next(100)) return null;

  const level = chooseLevel(g.playerLevel, rng);
  const matches = (data.rowsByLevel[level] ?? []).slice(0, 2);
  if (matches.length === 0) return null; // donor asserts two matches (debug only)
  const row = data.rows[matches[rng.next(2)]];
  const points: ({ x: number; z: number } | null)[] = [];
  for (let i = 0; i < row.count; i++) points.push(place());
  return { row, points };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone encounter director on the server; the gates run against server state, and the roll runs once per clock change on the server tick). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn).
- today: not checked in this pass (the Frankendom repo was not opened); the target is a proposal.
- Reuse tag: adapt (MIT; keep the MIT notice if any code or text is copied)
- Brief rule served: 1 (one engine, zones as data); row 23 spawn caps

## 6. Gaps and risks

- MIT: adaptation is allowed. Frankendom should still write its own sketch from the mechanism and keep the notice if code is copied.
- The chance and table bytes are read from the user's original game EXE at load (ExeData 536, 584). Frankendom must author its own zone numbers; the donor values do not ship as text here.
- Group size: the donor has no cap beyond the table row count (1224-1225). Frankendom's ruling is MAX_ATTACKERS = 3, so the row count must be clamped and tested.
- Presence gate: `anyEnemiesNearby` only checks living enemies within the safe distance (EntityChunkManager 2102-2112). It does not check for a fight already in progress (none seen in these lines); Frankendom must add its own rule for that.
- Terrain is hard-coded: the trigger passes `terrainType = 0` with a todo (GameState 1311), so the donor's wilderness table index is always 0 (plus 7 at night). Do not copy the zero; the zone id should select the table.
- Night hours disagree: `ArenaEntityUtils.cpp` 1059 treats hour 18 as night, `GameState.cpp` 1259 does not. Pick one value in the zone data.
- The level rule (1185-1191) can repeat without changing the level: at level 2, rounding leaves it at 2, so the loop only ends when a roll passes. Frankendom should cap the retries.
- The sampler's own wall check is commented out (1262-1264); the real check is in GameState (895). Frankendom must check walkability and the player's exclusion distance on the server, in one place.
- Spawn placement can produce fewer enemies than the row count when samples fail (skipped at GameState 895-903). Frankendom must decide whether to retry or report the shortfall.
- The encounter cadence is in-game time (hour and minute changes), not server ticks. Frankendom's cadence is the server tick, so the zone's time scale must be data, not a clock rule.
