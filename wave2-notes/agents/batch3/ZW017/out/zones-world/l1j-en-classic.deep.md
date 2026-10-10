# l1j-en-classic (zones-world, cell 3)

Donor: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Spawn.java (spawn, presence gate, retry and respawn timing: 298-553; respawn trigger in model/Instance/L1NpcInstance.java 1179-1260; table loader datatables/SpawnTable.java; per-map density datatables/MapsTable.java; on-screen test types/Point.java 137-155) | Licence: GPL-2.0-or-later (L1Spawn.java header: "either version 2, or (at your option) any later version"; COPYING is GPL version 2, June 1991) | Java | symbol `L1Spawn.doSpawn`

Checked: The hint file command/executor/L1MapInfo.java (77 lines, read in full) is a GM command that reads or sets one map tile and saves the map file. It is not the zone spawn logic. The spawn logic is in model/L1Spawn.java (read 77-101, 298-360, 356-553), with the respawn trigger in model/Instance/L1NpcInstance.java (1179-1190 and deleteMe 1201-1260, read in part), the loader in datatables/SpawnTable.java (76-123 and calcCount 197-207), the density table in datatables/MapsTable.java (36-48, 80-100, 204-210), the on-screen test in types/Point.java (122-124, 137-160), the player query in model/L1World.java (377-419), utils/NumberUtil.java (33-44) and model/L1MapArea.java (read in full; a rectangle plus map id, not used by the spawn path). Candidates opened: L1MapInfo.java, L1Spawn.java, SpawnTable.java, MapsTable.java, L1NpcInstance.java, L1World.java, Point.java, NumberUtil.java, L1MapArea.java; SpawnTimeTable.java was checked by grep only. Not read: the group path (L1MobGroupSpawn.doSpawn), L1BossSpawn (its own executeSpawnTask at 77), NpcSpawnTable, L1SpawnUtil, L1Map.isPassable and the map reader, the thread pool, the setter for _reSpawn, L1World.storeObject. Confidence: high on the spawn order, the retry and the constants; medium-high on the non-monster loop reading in section 6 (read, not run). camera_scope: not a camera cell.
Best transferable idea: Before a monster appears, pick a point at random in the zone's box (or near a fixed point), refuse any point a player can see, and retry the same spawn after 3 seconds with a new point, with the respawn delay as a fixed minimum plus a uniform whole-second jitter.
Decision (proposed): adapt - the presence gate and the min-plus-jitter respawn timer fit row 23 directly, but the donor's view test is the client's screen shape, and our camera is client-only, so the server must use its own range; the donor's band test and its fallbacks do not port.
Acceptance: Server test: a monster area spawn whose first random point has a player within 13 tiles is retried after 3000 ms and placed only at a point with no player within 13 tiles; with respawn_screen set it is placed at the first passable point even in view; with min 10 and max 20 s, 10,000 draws give delays in [10, 19] s.

## 1. Mechanism

- Trigger (L1NpcInstance.java 1201-1258): when a respawning NPC is removed (deleteMe), and it is a respawning spawn (1248), `onDecay` runs (1179-1187) and calls `executeSpawnTask(spawnNumber, id)`. The old object id is reused only when `isReuseId` is true (1181-1185). For a mob group, the call happens only when the last member leaves (1251-1257).
- Delay (L1Spawn.java 298-302, 323-326): the delay is `min_respawn_delay * 1000` ms, plus `nextInt(max - min) * 1000` ms when max is greater than min (`_delayInterval` is set at 332). So the delay is min plus a uniform whole-second jitter in [0, max - min). The task is scheduled on the thread pool with that delay (325). A time-window branch (304-311) would replace the delay with the time until a window opens. The field `_time` (67) is declared and read, but no assignment was found in the source tree (grep), so as far as the source shows it is unused.
- Attempt loop (`doSpawn`, 356-467): up to 51 attempts (`tryCount <= 50`, 386). Each attempt picks a location by spawn type:
  - PC-around (387-407): on a non-initial spawn with a player on the same map, a random player is chosen and the point is a random location within 30 tiles of that player (PC_AROUND_DISTANCE, 535).
  - Area (410-432): a random x in [locx1, locx2) and y in [locy1, locy2) (423-426), or, on a respawn of a home-point spawn, a random point within `spawn_home_range` of the point stored at the first spawn (412-421). The 51st attempt (tryCount > 49, 428) uses the fixed point.
  - Random offset (433-438): fixed point plus a random difference in each axis, bounded by randomx and randomy.
  - Fixed (439-442).
- Gate (449-466): if the point is in the map and passable (449-450), and the spawn is a monster (451):
  - if `respawn_screen` is set, place now (452-454);
  - otherwise, if no player on the same map is on screen of the point (456-459, using L1World.getVisiblePlayer with radius -1, which applies Point.isInScreen), place now;
  - otherwise schedule the same spawn number and the same object id after 3000 ms (462-464) and return.
- Failure: `tryCount++` (467) and the loop goes on.
- Placement (469-523): a monster gets `initHide` (469-471), the spawn link and spawn number (472-474), the home point on the first spawn (475-480), the group hook (514-517), the world store and visible-object add (505-506), and AI start on a non-initial spawn (508-512).

## 2. Key functions

- `L1Spawn.doSpawn`: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Spawn.java 356-523. Location choice, passability, presence gate, retry, placement.
- `L1Spawn.calcRespawnDelay` and `executeSpawnTask`: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Spawn.java 298-326.
- `L1Spawn.init`: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Spawn.java 331-346. Sets the jitter interval and fills the spawn count.
- `L1NpcInstance.onDecay` and `deleteMe`: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java 1179-1187 and 1201-1258.
- `SpawnTable` loader and `calcCount`: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/datatables/SpawnTable.java 76-123 and 197-207.
- `L1World.getVisiblePlayer` and `Point.isInScreen`: /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1World.java 381-418; /mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/types/Point.java 137-155.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Respawn delay = fixed minimum plus uniform whole-second jitter in [0, max - min) (L1Spawn.java 299-301, 332) | Minimum and maximum are per-spawn rows (SpawnTable.java 113-114) |
| Presence gate: a point in view of a player is not used now; retry the same spawn later with a new point (456-464) | Retry 3000 ms (L1Spawn.java 463) |
| Attempts before giving up on the random point: 51 (386), with the last one at the fixed point (428) | 51 (theirs, 386); 50 as the loop bound (theirs, 386) |
| In-view test: Manhattan tile distance up to 13 counts as visible (Point.java 143); from 14 to 17 a second metric from a point 15 tiles up-left must fall in 17 to 43 (148-150); beyond 17 never (141) | 13, 17, 43 and the 15-tile offset are the client's screen shape (theirs) |
| Density: count times the map's monster amount, randomly rounded (SpawnTable.java 93-96, 204; NumberUtil.java 34-40) | Default amount 1 (theirs, MapsTable.java 41); a map with no row gives 0 (MapsTable.java 204-207; SpawnTable.java 97-99) |
| Pc-around spawn radius | 30 tiles (theirs, L1Spawn.java 535) |
| Spawn box is half-open (nextInt, 425-426) | Columns locx1..locy2 (theirs, SpawnTable.java 108-111) |

## 4. TypeScript sketch

simplified: the sketch keeps the jitter, the 51-attempt loop with the fixed-point fallback on the last attempt, the presence gate with the 3000 ms retry, the respawn_screen bypass, and the box and offset picks. It keeps only the near band of the in-view test (Manhattan 13). It omits the pc-around branch, the home-point respawn, the time-window branch, mob groups, the NPC special cases, the object-id reuse, and the AI start. It also drops the donor's non-monster loop behaviour (section 6): the sketch treats every spawn as a monster. The final placement after the 51st failure is kept as in the donor: it is placed without another passability or view check.

```ts
// Licence: GPL-2.0-or-later (donor header: "either version 2, or (at your option) any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Pt { x: number; y: number; }

export interface SpawnSpec {
  minRespawnS: number;                                  // min_respawn_delay, seconds
  maxRespawnS: number;                                  // max_respawn_delay, seconds
  area?: { x1: number; y1: number; x2: number; y2: number }; // half-open box, as the donor's nextInt range
  offset?: { rx: number; ry: number };                  // random offset around the fixed point
  fixed: Pt;
  respawnScreen: boolean;                               // true = skip the presence gate
}

export type SpawnResult =
  | { kind: "placed"; at: Pt }
  | { kind: "retry"; afterMs: number };

const MAX_TRIES = 50;       // 51 attempts in total, as the donor loop does
const RETRY_MS = 3000;      // a spawn point in view of a player is retried after this
const NEAR_TILES = 13;      // Manhattan tile distance counted as "in view" (near band only)

// Uniform whole-second jitter in [0, max - min), added to the minimum, in milliseconds.
export function respawnDelayMs(spec: SpawnSpec, rand: () => number): number {
  const interval = spec.maxRespawnS - spec.minRespawnS;
  let ms = spec.minRespawnS * 1000;
  if (interval > 0) ms += Math.floor(rand() * interval) * 1000;
  return ms;
}

function pickArea(a: { x1: number; y1: number; x2: number; y2: number }, rand: () => number): Pt {
  return {
    x: Math.floor(rand() * (a.x2 - a.x1)) + a.x1,
    y: Math.floor(rand() * (a.y2 - a.y1)) + a.y1,
  };
}

function pickOffset(spec: SpawnSpec, rand: () => number): Pt {
  const o = spec.offset!;
  return {
    x: spec.fixed.x + (Math.trunc(rand() * o.rx) - Math.trunc(rand() * o.rx)),
    y: spec.fixed.y + (Math.trunc(rand() * o.ry) - Math.trunc(rand() * o.ry)),
  };
}

function inView(p: Pt, players: Pt[]): boolean {
  return players.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) <= NEAR_TILES);
}

// One spawn attempt for a monster. Presence gate: a point with a player in view is not used now.
export function trySpawn(
  spec: SpawnSpec,
  players: Pt[],
  rand: () => number,
  isPassable: (p: Pt) => boolean
): SpawnResult {
  let at: Pt = spec.fixed;
  for (let tries = 0; tries <= MAX_TRIES; tries++) {
    if (spec.area) {
      at = pickArea(spec.area, rand);
      if (tries === MAX_TRIES) at = spec.fixed;      // the last attempt falls back to the fixed point
    } else if (spec.offset) {
      at = pickOffset(spec, rand);
    } else {
      at = spec.fixed;
    }
    if (!isPassable(at)) continue;
    if (spec.respawnScreen || !inView(at, players)) return { kind: "placed", at };
    return { kind: "retry", afterMs: RETRY_MS };
  }
  // After the last failed attempt the donor places the monster at that point without checking
  // passability or view again. The sketch keeps that.
  return { kind: "placed", at };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ZW017/l1j-spawn.ts) exited 0 with no output.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the row-23 engine module named in the addendum; the attempt loop and the retry are engine logic there, the boxes, minimums, maximums, density and the respawn_screen flag are zone data).
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). Row 23 is the closest fit and it fits well for the presence gate and the respawn timer. It does not cover despawn on empty, which this file does not show.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (every box, minimum, maximum, density and flag is a row, see SpawnTable.java 108-121); server-verified (the presence test uses server positions; the camera is not read).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The last attempt places the monster without a passability or view check (L1Spawn.java 386, 428-432, 449-467, then 469-473). On a blocked map a monster can end up inside a wall or in view of a player. Frankendom must check the final point and skip or reroll it, and test that case.
- Non-monster spawns never leave the loop (449-467): the passable branch has no break for them, so they always run all 51 attempts and end at the last point, which for an area spawn is the fixed point (428-432). Read, not run. Frankendom must not copy this; area spawns must work for every entity kind.
- The retry is not capped. Each 3-second retry starts a new 51-attempt loop and repeats while the first passable point is in view (462-464). Frankendom needs a retry cap and a fallback that is tested.
- The in-view test is the client's screen shape (Point.java 137-155): a tile-distance diamond, with a special band from 14 to 17 tiles. Frankendom's camera is client-only, so the server needs its own range. The band and the offset of 15 tiles do not port as they are.
- The presence query scans every player on the server for each attempt (L1World.java 390-401), filtered by map. Cost is O(players) per attempt. Keep a per-zone player list.
- The time-window respawn (304-311) is never assigned in this tree, so the code is dead as far as the source shows. Do not port it from this file; write it fresh if a time-of-day spawn is needed.
- Map and NPC special cases live in the spawn path: one NPC id on one map scatters across maps (377-380), and another NPC on map 2 teleports every non-GM player on that map to a fixed point (486-493; a second case at 495-503). These are one-engine violations if they stay in code. Frankendom should express any of them as zone data.
- The density default is a footgun: a map missing from the table gives an amount of 0 (MapsTable.java 204-207), so its spawns silently vanish (SpawnTable.java 97-99). Frankendom should fail loudly on a missing zone.
- Not read: the group path (L1MobGroupSpawn.doSpawn), L1BossSpawn (its own executeSpawnTask at line 77), NpcSpawnTable, L1SpawnUtil, the passability method and the map reader, the thread pool, the setter for _reSpawn, and the world store method.
