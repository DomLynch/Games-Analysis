# OpenEnroth-OpenEnroth (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` | Licence: LGPL-3.0 (LICENSE read: "GNU LESSER GENERAL PUBLIC LICENSE Version 3"); clean-room only | C++ | symbol `SpawnEncounter`

Checked: Opened in full `Actor.cpp` 4210-4369 (`SpawnEncounter`) and the odds table at line 63. Opened `Outdoor.cpp` 470-520 (respawn branch of `OutdoorLocation::Load`, header at 428 by receipt only) and 1737-1775 (caller). Opened `Indoor.cpp` 905-925 (caller), 912-919, and 1617-1703 (`SpawnEncounterMonsters`, the party-side placement). Opened `Game.cpp` 1128-1160 (rest encounter), `Evt/EvtInterpreter.cpp` 81-100 (script spawns), and `LocationFunctions.cpp` 8-20 (`GetAlertStatus`). Read `SpawnPoint.h` (the hinted file): it is a data struct only (position, radius, type, treasure level, monsterIndex, attributes, group). Field definitions in `MapData.h`, `LocationInfo.h` and `GameConfig.h` were grep-read only. Confidence high on `SpawnEncounter`, the rest roll, the party-side placement and the outdoor respawn branch. Not read: the body of `IndoorLocation::Load` (258-330; only lines 292, 298 and 912-916 by receipt), the callers of `GetAlertStatus`, `SpawnRandomTreasure`, `RespawnGlobalDecorations`, `Rest()`, the monster lookups, `grng`, the value of `TrigLUT.uIntegerDoublePi`, and what `HOSTILITY_FRIENDLY` does in the AI.

## 1. Mechanism

Four parts. No per-tick spawn timer turned up in the donor (grep for respawn and spawn; not exhaustive). Spawns happen at map entry, at a rest, or on a script event.

1. Respawn gate on map entry (`Outdoor.cpp` 479-516). A first visit (`lastRespawnDay == 0`) gets an initial respawn (479-480). A later visit gets a timed respawn when `days_played - lastRespawnDay >= respawn_interval_days` (485-486). `days_played` is playing time in days plus 1 (1755). A savegame load sets the interval to 0x1BAF800 (482-483), so it effectively never respawns. A respawn reloads the base object state from the LOD file (502), keeps the revealed-cell fields (saved at 500-501, restored at 503-505), stamps `lastRespawnDay` (514) and bumps `respawnCount` (516). After a respawn, every spawn point fires: `SpawnEncounter` for actor points, `SpawnRandomTreasure` otherwise (1763-1770). The indoor path has the same shape by its receipts (`Indoor.cpp` 292, 298, 912-916); its full body was not read.

2. Alert gate (`Actor.cpp` 4214-4218). A spawn point's attribute bit 0 decides whether it fires. While alert is on, it fires only if the bit is set. While alert is off, it fires only if the bit is clear. The alert state is `GetAlertStatus()` (`LocationFunctions.cpp` 11-20), which reads the other level type's record: indoors it reads `pOutdoor->ddm.alertStatus`, outdoors it reads `pIndoor->dlv.alertStatus`. The donor's own TODO on line 14 says this may be a bug. The code is used as written.

3. Count and tier, per spawn point (`Actor.cpp` 4220-4278, 4286-4311). The monster index minus 1 selects the entry. Indices 0-2 are the three encounter slots: a count `min + random(max - min + 1)` (4226 and the two others), and a per-map odds set (`Dif_M1`, 4225). Indices 3-11 pin one tier (`A`, `B` or `C` suffix); the count stays 1 unless a caller passes an override. A name that starts with `'0'` is an empty slot and returns (4270). The odds set takes the caller's `monsterCatMod` (4272; every caller read passes 0) and is clamped at 5 (4273). A caller count override replaces the count (4275). The config multiplier `SpawnCountMultiplier` (default 1.0, `GameConfig.h` 263) is then applied with `ceil` and a floor of 1 (4278).
   Tier roll (4292-4302): `catRandom = random(100)` (4293). The table `word_4E8152` (line 63) has six sets of three numbers. Only the first two are read: A threshold and B width. Set 0 means no roll. Set 1 is A 90 / B 8 (C is the rest). Set 2 is 70 / 20. Set 3 is 50 / 30. Set 4 is 30 / 40. Set 5 is 10 / 50. Roll below A gives A (4301). Roll from A up to A+B gives B (4297). Anything else keeps the default C set at 4294. The third number of each set is never read; it equals the remainder.

4. Placement (`Actor.cpp` 4321-4368). Each monster takes its stats from the name (4313-4322; unknown names fall back to `MONSTER_ANGEL_A`, 4318). Position is the spawn point's position (4327-4328). Tether distance is 256 (4329). Hostility group comes from the monster type (4331). `hostilityType` is set to FRIENDLY on every spawn (4334). A random ring point at distance 128 outdoors or 64 indoors (4337-4343) is computed, but the code never uses it (4336 TODO). Outdoors, the aggressor flag is set for every monster when the caller passes `aggro` (4345-4348). Indoors, the flag is set only when the ring point is in the same sector, has a floor, and that floor is within 1024 of the spawn height (4351-4358). Otherwise the monster stays at the spawn point with no flag (the `Remove` call is commented out, 4367). Result: all monsters from one spawn point stand on one tile.

Party-side encounters (two sources, one placement function):

- Rest roll (`Game.cpp` 1139-1160). On a rest, roll 1-100 against `encounterChance` (1139). On a hit, roll 1-100 again: at or below `encounter1Chance` gives encounter 1, at or below the sum with `encounter2Chance` gives 2, else 3 (1140-1149). Placement failure cancels the encounter (1151-1152). On success, one party member is woken, the rest runs 1 hour plus 0-5 minutes (1154-1156), and an escape message is queued (1160). The `Rest()` body was not read.
- Placement (`Indoor.cpp` 1617-1703). Outdoors: distance `512 + random(1024)` from the party, random angle, floor from `ODM_GetFloorLevel`, up to 100 tries (1636-1663, distance at 1638). Indoors: distance `256 + random(512)` (1673), same sector as the party and floor within 1024 of the party height (1683-1689), up to 100 tries. Failure after 100 tries returns false (1664, 1696-1697). Success calls `SpawnEncounter(..., aggro = 1)` (1699), and the position used is the chosen point (not the ring).
- Script spawns (`EvtInterpreter.cpp` 81-96). Builds a point with `monsterIndex = typeindex + 2*level + level` (92), passes the script count as override with `aggro = 0` (96).

## 2. Key functions

- `SpawnEncounter` (the per-spawn roll and placement): `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` 4210-4369.
- Tier odds table: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` 63.
- `OutdoorLocation::Load`, respawn branch: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Outdoor.cpp` 428 (header), 470-520.
- `SpawnEncounterMonsters` (party-side placement): `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Indoor.cpp` 1617-1703.
- Rest encounter: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Application/Game.cpp` 1139-1160.
- `GetAlertStatus`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/LocationFunctions.cpp` 11-20.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-spawn count as a range roll, then a per-map multiplier with a floor of 1 | Count range from map data, `encounter1MinCount` / `encounter1MaxCount` (MapData.h 31-32); multiplier default 1.0 (GameConfig.h 263); ceiling and floor of 1 (Actor.cpp 4278) |
| Tier from one roll against a threshold table (A, then B, C is the rest) | Six odds sets of A/B values (Actor.cpp 63); set chosen by the map's `Dif_M1` (MapData.h 30) plus a caller mod, clamped at 5 (4272-4273) |
| Alert gate as a bit test against a level-wide state | Bit 0 of `attributes` (SpawnPoint.h 14; bit meaning per the code at 4215-4217) |
| Day-based respawn at entry, with a "never" value for savegame loads | Interval per map (MapData.h 18); savegame interval 0x1BAF800 days (Outdoor.cpp 483) |
| Ring placement around a point, 100 tries, fail = no spawn | Outdoor ring 512 + random(1024) (Indoor.cpp 1638); indoor ring 256 + random(512) (1673); 100 tries (1636); floor test 1024 (Indoor.cpp 1689) |
| Leash radius as a field on each monster | Tether 256 (Actor.cpp 4329) |
| Rest-triggered encounter roll, cumulative chances | `encounterChance` and `encounter1Chance` / `encounter2Chance` (Game.cpp 1139-1149) |

## 4. TypeScript sketch

simplified: keeps the donor's order: alert gate first, then the count, then one tier roll per monster, then placement at the spawn point; the respawn gate and the rest roll are separate functions, and the party-side ring is a separate call that the caller follows with a spawn. It omits: the outdoor model test (inverted in the donor, see section 6; the sketch takes it as the caller's `valid`); the indoor sector and floor test beyond what `valid` carries; the donor's ring offset for static spawns (computed and never used, so the sketch does not compute it); the rule that indoor monsters are aggressive only when their ring point passes (the sketch sets `aggro` for every monster when the caller asks); the hostility, tether and hostility-group fields and the monster stat lookup; the event-spawn path (its count override is handled by the same function); the respawn failure path and the revealed-cell preservation; the savegame interval beyond the one constant; and the rest's wake-up and timer. The `catMod` argument is kept, but every donor caller read passes 0, so pinned entries are never rolled in practice. The angle step count is 2048 (the ring-angle constant at Actor.cpp 4337); the party-side code uses `TrigLUT.uIntegerDoublePi`, whose value was not read.

```ts
// Licence: LGPL-3.0 (donor, OpenEnroth). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export interface Vec3 { x: number; y: number; z: number }
export type Tier = 'A' | 'B' | 'C' | 'none';

// Odds set s: [A threshold, B width]. C is the remainder; the donor's third number per set is unused.
const TIER_ODDS: ReadonlyArray<readonly [number, number]> = [[0, 0], [90, 8], [70, 20], [50, 30], [30, 40], [10, 50]];

export function rollTier(oddsSet: number, roll: number): Tier {   // roll in [0, 100)
  if (oddsSet === 0) return 'none';                               // base name, no tier suffix
  const [aMax, bWidth] = TIER_ODDS[Math.min(oddsSet, 5)];
  if (roll < aMax) return 'A';
  if (roll < aMax + bWidth) return 'B';
  return 'C';
}

export interface Encounter {
  min: number; max: number;   // count range, inclusive (ignored when pinned)
  oddsSet: number;            // per-map difficulty, 0-5
  pinned?: Tier;              // fixed-tier entry: one monster, no tier roll
}

// Count for one spawn point: range, then override, then floor of 1 after the multiplier.
export function encounterCount(e: Encounter, rand: (n: number) => number, override: number, multiplier: number): number {
  let n = e.pinned ? 1 : e.min + rand(e.max - e.min + 1);
  if (override) n = override;
  if (n <= 0) return 0;
  return Math.max(1, Math.ceil(n * multiplier));
}

export interface Spawned { tier: Tier; pos: Vec3; aggro: boolean }

// One spawn point. Alert gate first; then count; then one entry per monster, all at the spawn point.
export function spawnEncounter(
  point: { pos: Vec3; alertBit: boolean },
  e: Encounter | null,             // null = empty slot
  alertOn: boolean,
  opts: { catMod: number; override: number; multiplier: number; aggro: boolean },
  rand: (n: number) => number,
): Spawned[] {
  const skip = alertOn ? !point.alertBit : point.alertBit;
  if (skip || e === null) return [];
  const set = Math.min(5, e.oddsSet + opts.catMod);
  const n = encounterCount(e, rand, opts.override, opts.multiplier);
  const out: Spawned[] = [];
  for (let i = 0; i < n; i++) {
    const tier: Tier = e.pinned ?? rollTier(set, rand(100));
    out.push({ tier, pos: point.pos, aggro: opts.aggro });
  }
  return out;
}

// Party-side encounter: up to 100 tries at a random point in a ring around the party; null if none passes.
export function placeEncounter(
  party: Vec3,
  ring: { min: number; span: number },   // outdoor 512 + rand(1024); indoor 256 + rand(512)
  valid: (p: Vec3) => boolean,            // caller's test (outdoor model test, indoor sector and floor)
  rand: (n: number) => number,
): Vec3 | null {
  const STEPS = 2048;                     // angle steps: donor uses TrigLUT.uIntegerDoublePi here (value not read); 2048 is the ring-angle constant at Actor.cpp 4337
  for (let i = 0; i < 100; i++) {
    const d = ring.min + rand(ring.span);
    const a = (rand(STEPS) / STEPS) * 2 * Math.PI;
    const p: Vec3 = { x: party.x + Math.cos(a) * d, y: party.y + Math.sin(a) * d, z: party.z };
    if (valid(p)) return p;
  }
  return null;
}

// Map entry: first visit is 'initial'; a later visit is 'timed' once the interval has passed.
export function respawnDue(lastRespawnDay: number, daysPlayed: number, intervalDays: number, savegameLoad: boolean): 'initial' | 'timed' | 'none' {
  if (lastRespawnDay === 0) return 'initial';
  const interval = savegameLoad ? 0x1baf800 : intervalDays;   // savegame load: effectively never
  return daysPlayed - lastRespawnDay >= interval ? 'timed' : 'none';
}

// Rest roll: chance to meet an encounter, then which one (cumulative chances; the rest goes to 3).
export function restEncounter(encounterChance: number, enc1: number, enc2: number, rand100: () => number): 1 | 2 | 3 | null {
  if (rand100() + 1 > encounterChance) return null;
  const r = rand100() + 1;
  if (r <= enc1) return 1;
  if (r <= enc1 + enc2) return 2;
  return 3;
}
```

## 5. Lands in

- TARGET `src/fight/spawn.ts` (new module: engine-side encounter roll, placement and respawn gate; zone data supplies the tables). Parity-checklist row 17 (death / respawn / fight end: "by design (open-world respawn)"; the checklist says Zone 1 has it as its own).
- today: zone-owned (row 17). The file was not located (not checked).
- Ruling (Lead Dev, 2026-10-10): this lands on NEW parity row 23, "Zone population: spawn caps, respawn, despawn on empty with a grace timer" (not row 17, not row 4). Logic in the engine's server spawns (origins/server/world-spawns.ts); numbers (cap, spawn chance, respawn s, grace s, coverage) are zone data fields in the zone schema. No per-zone code.
- Reuse tag: rewrite-from-idea (LGPL-3.0: clean-room only; the sketch is clean-room)
- Brief rule served: 4 (zones are data); 5 (many-on-one) for the count cap
- Best transferable idea: one roll per spawn point decides whether it fires (a state gate), how many (range times multiplier, floor 1), and the tier (one threshold table), with a day-based respawn at zone entry and a party-side ring placement that tries 100 times and then gives up.

## 6. Gaps and risks

- Zones as data: the count range, odds set, pinned tiers and respawn interval live per map in the donor's map table (MapData.h 18, 30-32), and the tier table is one global (Actor.cpp 63). Frankendom must carry each as zone-data fields with explicit defaults; a zone override needs its own field, not an edit to the global table.
- MAX_ATTACKERS = 3: the donor allows a count up to the map's max (MapData.h 31-32, no cap in the donor) and stands all of them on one point. Under the ruling, the director must queue spawns beyond three or cap how many are engaged at once. A group of six on one tile is not valid for Frankendom.
- Stacked monsters: the donor computes a ring offset for each monster and never uses it (Actor.cpp 4336-4343). A group of several stands on one tile. Frankendom needs a real per-monster offset, and a test that checks the offsets differ.
- Server-verified and one ledger: the donor rolls with its engine generator `grng` (not read in detail), inside the game process. Frankendom's roll must run on the server, and the outcome (count, tier, placement) must go into the ledger so a client cannot re-roll it.
- Alert gate: the donor reads the other level type's alert state (LocationFunctions.cpp 15-18, with its TODO on 14). Do not port the swap; a zone reads its own state.
- Outdoor model test is inverted (`Indoor.cpp` 1653-1662). The comment at 1649 says "check spawn point is not in a model", but the test sets `not_in_model = 1` when the point is within `boundingRadius + 256` of a model, and the loop exits on that flag (1660). Read literally, it accepts points near a model and rejects open ground after 100 tries. Read only, not run. Frankendom must not copy it; the intended rule is for the owner to set.
- Respawn interval 0: when the interval is 0, the timed condition (`Outdoor.cpp` 485) is always true on any later visit, so every visit respawns. Zone data must set an explicit interval, and 0 needs a stated meaning.
- Aggro: outdoor party-side encounters are aggressive (aggro = 1); static spawns are not (aggro = 0). Frankendom's "engage is a state change" ruling means aggro is the state the engine sets at engage, not a flag on the spawn record.
- The rest trigger is a zone action outside the fight. Keep the rolls in the zone layer and the placement in the engine, so the fight code never reads rest state.
- Not read: `IndoorLocation::Load` body; callers of `GetAlertStatus`; `SpawnRandomTreasure`; `Rest()`; `grng`; the value of `TrigLUT.uIntegerDoublePi`; the meaning of `HOSTILITY_FRIENDLY`; and the field-level meaning of attribute bit 0 (inferred from the gate code only).
