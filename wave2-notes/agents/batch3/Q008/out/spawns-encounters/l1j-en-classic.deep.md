# l1j-en-classic (spawns-encounters, cell 2)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Spawn.java` | Licence: GPL-2.0-or-later (COPYING is GPL version 2, June 1991; source headers read "either version 2, or (at your option) any later version") | Java | symbol `L1Spawn.executeSpawnTask` / `L1Spawn.doSpawn` / `L1NpcInstance.deleteMe` / `L1NpcInstance.onDecay`

Checked: The list's hint file, `L1SpawnCmd.java`, is a GM command. Its line 79 hands the spawn to `L1SpawnUtil.spawn` (grep-read), so it is not the respawn logic. The real mechanism is across `L1Spawn.java` (298-346, 352-523, read in full except the group call at 514-517), `L1NpcInstance.java` (1179-1260 and 2164-2212: death-to-decay and delete timer), `L1MonsterInstance.java` (414-425 and 452-472 read; 426-451 only by a pattern grep), `L1World.java` (390-418: the presence test), `types/Point.java` (137-150: screen distance), and `datatables/SpawnTable.java` (100-125: the DB row fields). Sibling read: `L1BossSpawn.java` 77-98 (boss waits for all members dead, then a clock cycle; its cycle class was not read). Not read: `L1MobGroupSpawn.java` (group respawn), `L1SpawnTime` (the time-window class), the Config mapping of `NpcDeletionTime`, and `Point.isInScreen` after line 150. Confidence: high on the single-slot respawn loop and the presence gate; medium on the time-window branch (the code comment says "real time to game time" and I did not check that conversion).

Best transferable idea: Each spawn slot is refilled on its own timer after its mob has been gone for a linger plus a random delay, and the refill is held back while any player can see the chosen tile.
Decision (proposed): adapt - the slot-based population cap and the "not in view" hold are the parts to take; the screen-based view test cannot run on the server (the camera is client-only), so Frankendom needs a server distance rule per zone instead, and a cap on the retry.
Acceptance: A server test with a two-slot zone kills one mob and asserts the slot stays empty for the linger plus a delay in [min, max) seconds; when it is placed, no hero is within the zone's no-spawn distance of the tile; while a hero stands on the chosen tile, the placement retries every 3 s and, after the retry cap, the mob is placed at the home tile.

## 1. Mechanism

- Death and decay. A monster's death task sets dead and then calls `startDeleteTimer()` (L1MonsterInstance.java 425, 467). That starts a timer for `Config.NPC_DELETION_TIME * 1000` ms (L1NpcInstance.java 2164-2169). The config key is `NpcDeletionTime = 50`, so the corpse lingers 50 s by default. The timer's `run` checks that the NPC is still dead and not destroyed (2187-2202), then calls `deleteMe()` (2204).
- Removal. `deleteMe()` (1201-1260) removes the monster from the world (1214-1215), sends remove packets to players who knew it (1216-1227), and then, if the monster is not in a group and `isReSpawn()` is true, calls `onDecay(true)` (1248-1249). In a group it removes the member, and when the group is empty it calls `onDecay(false)` (1254-1255). `onDecay(isReuseId)` (1179-1187) passes the old id if reuse is requested (or 0) and the spawn number to `_spawn.executeSpawnTask` (1186).
- Respawn timer. `executeSpawnTask` (L1Spawn.java 323-326) schedules a `SpawnTask` after `calcRespawnDelay()` ms on the general thread pool. `calcRespawnDelay` (298-314) computes `min * 1000` ms (299), plus `nextInt(_delayInterval) * 1000` ms when the interval is positive (300-302), where `_delayInterval = max - min` (332). So the delay is `min + k` seconds with `k` in `[0, max - min)`, and `max` itself is never drawn. If the spawn has a time window and the current game time is outside it, the delay is replaced by the time to the window start, divided by 6 (303-312; the comment says "real time to game time", not checked).
- Slots. At init, `doSpawn` is called once for each slot up to `_maximumCount` (340-344). That count is the `amount` column of the DB row (SpawnTable.java 102). Each slot keeps its `spawnNumber` on the monster (472-474), so when that monster leaves, the same slot is refilled. The population cap is therefore one mob per slot per row; this code path has no zone-wide cap.
- Placement, in `doSpawn` (356-523), in order:
  1. Create the NPC from the template; reuse the old id if one was passed (363-368); set heading and map (369-383).
  2. Loop up to 51 times (`while (tryCount <= 50)`, 386). The candidate tile depends on the row: for "near a player" rows (not at init) pick a random online player on the same map and a random tile within 30 tiles (387-406, `PC_AROUND_DISTANCE = 30` at 535); for area rows pick a random tile in the rectangle (410-427), or in the home range if spawn-home is set (412-421); after 49 failed tries an area row uses its home tile (428-432); for other rows, use the home tile, with a random offset if random offsets are set (433-442).
  3. Accept the tile only if it is in the map and passable (449-450). For a monster: if the row has the respawn-screen flag, accept at once (452-453). Otherwise, if no player is visible at that tile, accept (456-457). If a player is visible, schedule the same slot again in 3000 ms, reusing the id, and return without placing (462-464). An impassable tile falls through to `tryCount++` (467) and the loop repeats. A non-monster NPC on a passable tile also falls through to `tryCount++` (the monster test at 451 fails), so it re-rolls until the loop ends, as read.
  4. If the loop ends (51 tries), the NPC is placed at the last candidate with no further check (469-523). For the modelled row types that candidate is the home tile, which may be impassable. It is then stored and added to the world (505-506), starts AI unless it is hidden or this is init (508-513), joins its group (514-517), and shows its appearance chat (518-519).
- Presence test. `getVisiblePlayer(mob)` with the default radius -1 (L1World.java 403-404) keeps players on the same map (399-401) for whom `pt.isInScreen(element.getLocation())` is true. `isInScreen` (Point.java 137-150) returns false beyond 17 tiles (141) and true within 13 tiles (143); between 13 and 17 a second test runs (the rest is not read).

## 2. Key functions

- `L1Spawn.calcRespawnDelay`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Spawn.java` 298-314. Respawn delay from min, random extra, time-window override.
- `L1Spawn.executeSpawnTask`: same file, 323-326. Schedules the respawn.
- `L1Spawn.doSpawn(spawnNumber, objectId)`: same file, 356-523. Placement loop, presence check and retry, registration.
- `L1Spawn.init`: same file, 331-346. Fills the slots at start-up.
- `L1NpcInstance.onDecay` and `L1NpcInstance.deleteMe`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 1179-1187 and 1201-1260. Removal, then the respawn call.
- `L1NpcInstance.startDeleteTimer` and `DeleteTimer.run`: same file, 2164-2212. The corpse linger.
- `L1World.getVisiblePlayer` with radius -1: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1World.java` 385-418 (the branch at 403-404). Presence test.
- `Point.isInScreen`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/types/Point.java` 137-150. Screen distance.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Slot refill: one timer per empty slot, delay = linger + min + random extra below max | Linger 50 s (theirs, altsettings.properties 138, `NpcDeletionTime`); min and max per DB row (theirs, SpawnTable.java 113-114); draw in [min, max) (theirs, L1Spawn.java 301) |
| Population cap: one mob per slot, slot count per row | Count per row from the DB `amount` column (theirs, SpawnTable.java 102; loop at L1Spawn.java 341) |
| Presence hold: do not place where a player can see; retry later | Retry 3000 ms (theirs, L1Spawn.java 463); visibility by screen distance, inner 13 and outer 17 tiles (theirs, Point.java 141-143) |
| Placement retry cap, then fall back to home | 50 tries (theirs, L1Spawn.java 386); 30-tile range for player-near rows (theirs, 535) |
| Time window stretches the delay | Divide the real gap by 6 (theirs, L1Spawn.java 310; not verified against the clock) |

## 4. TypeScript sketch

simplified: the sketch keeps the slot timer (linger plus random delay), the per-row slot count and home fallback, the 50-try loop, the presence hold with a 3 s retry, and the home placement after the loop. It models monsters only: the donor's non-monster re-roll (467, reached because 451 fails) is left out. It omits the player-near spawn type, the spawn-home point memory, the random offset for non-area rows, the respawn-screen flag (it always applies the presence hold), the time-window branch, the group logic and the boss cycle, and the packets, AI start and chat. It reorders nothing, with one exception: the presence hold is checked after the passability check, which matches the donor.

```ts
// Licence of donor: GPL-2.0-or-later (source headers: "either version 2, or (at your option) any later version"). Clean-room sketch from the described mechanism, not a translation.
type Tile = { x: number; y: number };

interface SpawnRow {
  amount: number;                                             // slots kept filled (donor: _maximumCount)
  minDelayS: number;                                          // donor: min_respawn_delay, seconds
  maxDelayS: number;                                          // donor: max_respawn_delay, seconds
  area?: { x1: number; y1: number; x2: number; y2: number };  // donor: locx1..locy2
  home: Tile;                                                 // donor: getLocX / getLocY
}

interface World {
  isPassable(t: Tile): boolean;     // donor: in-map and passable
  playersSeeing(t: Tile): number;   // donor: getVisiblePlayer(mob).size()
  place(row: number, slot: number, t: Tile): void;
}

const LINGER_MS = 50_000;  // donor: NpcDeletionTime = 50 (config), corpse stays before the respawn timer starts
const RETRY_MS = 3_000;    // donor: retry delay when a player can see the chosen tile
const MAX_TRIES = 50;      // donor: while (tryCount <= 50)

interface Timer { row: number; slot: number; at: number; }

class SpawnDirector {
  private timers: Timer[] = [];

  constructor(
    private rows: SpawnRow[],
    private world: World,
    private now: () => number,
    private rand: () => number,   // uniform in [0, 1)
  ) {}

  onDeath(row: number, slot: number): void {
    const r = this.rows[row];
    const interval = r.maxDelayS - r.minDelayS;
    const extra = interval > 0 ? Math.floor(this.rand() * interval) : 0; // donor: nextInt(interval), so max itself is not reached
    this.timers.push({ row, slot, at: this.now() + LINGER_MS + (r.minDelayS + extra) * 1000 });
  }

  tick(): void {
    const t = this.now();
    const due = this.timers.filter(x => x.at <= t);
    this.timers = this.timers.filter(x => x.at > t);
    for (const x of due) this.attempt(x);
  }

  private attempt(x: Timer): void {
    const r = this.rows[x.row];
    for (let tries = 0; tries <= MAX_TRIES; tries++) {
      const c = this.candidate(r, tries);
      if (!this.world.isPassable(c)) continue;
      if (this.world.playersSeeing(c) > 0) {        // presence gate
        this.timers.push({ ...x, at: this.now() + RETRY_MS });
        return;
      }
      this.world.place(x.row, x.slot, c);
      return;
    }
    this.world.place(x.row, x.slot, r.home);        // donor: placed at home after the loop, no presence check
  }

  private candidate(r: SpawnRow, tries: number): Tile {
    if (!r.area || tries > 49) return r.home;       // donor: area rows use home after 49 failed tries; non-area rows use home
    return {
      x: r.area.x1 + Math.floor(this.rand() * (r.area.x2 - r.area.x1)),
      y: r.area.y1 + Math.floor(this.rand() * (r.area.y2 - r.area.y1)),
    };
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population layer). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The slot count, min and max delay, area and home are zone data; the linger, the 3 s retry and the 50-try cap are engine constants. The donor's "one mob per slot" maps to a per-row cap, not a zone-wide cap. (Frankendom side not read in this pass.)
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, this note uses the shape and the numbers, not the code)
- Brief rule served: 1 (one engine: the refill and hold run on the server, not in the client); zones as data (rows are zone data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The presence test is screen-based (`isInScreen`, 13 and 17 tiles). Frankendom rules that the camera and HUD are client-only, so the server cannot see a screen. The server needs a per-zone distance rule (zone data) instead; this is the main thing not to copy.
- The retry has no counter. The 3 s path (462-464) reschedules without a limit, so a hero who stands on the only free tile can hold a slot empty forever. Frankendom needs a cap and a fallback, as the sketch shows.
- Death and kill timing: the linger (50 s) runs before the respawn timer, and the donor shows no kill accounting. Under server-verified kills and one ledger, the kill, XP and loot must be recorded at death, not at the end of the linger. Where the donor counts a kill is not read here (not read).
- One mob per slot and a per-row count: no zone-wide population cap appears in this path. Row 23 needs a zone cap as well as the per-row cap.
- Group respawn (`L1MobGroupSpawn`, called at 514-517 and in `deleteMe` 1254-1255) was not read, so group refills are not described here.
- Boss spawns (`L1BossSpawn.executeSpawnTask`, 77-98) wait for all members to die and then use a clock cycle. That is a different mechanism; its cycle class was not read.
- Several special NPC ids are handled inline: `deleteMe` resurrects NPC 45477 once at half HP (1202-1204), `doSpawn` offsets the map for two NPC ids (377-383), and it teleports players for three more (486-503). These are one-off hacks; Frankendom should express them as zone data or not at all.
- Id reuse: the donor reuses the old id on a presence retry and on single-member removal (1179-1187, 364-368). Frankendom's one-ledger rule means a reused id must not keep stale state; this was not checked in this pass.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None found. Verified L1Spawn.java calcRespawnDelay 298-314 (min*1000 + nextInt(interval)*1000, window diff/6), executeSpawnTask 323-326, init 331-346, 51-try loop (386, tryCount>49 -> home), isRespawnScreen accept, 3000 ms retry with same id (462-464), PC_AROUND_DISTANCE 30 (535); L1NpcInstance onDecay/deleteMe/DeleteTimer; altsettings.properties 138 NpcDeletionTime=50; Point.isInScreen 13/17; SpawnTable fields; GPL. Nit: Config.java 1045 hard default is 10, shipped properties 50 (note says 50 default; fine for shipped config).

**Missed:** PC_AROUND case with zero players on the map just breaks the switch without setting newlocx/newlocy (previous candidate reused); spawnHome point memory (_spawnHomePoint, getSpawnHomeRange) path is acknowledged omitted.
