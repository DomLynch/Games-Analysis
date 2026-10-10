# rathena-rathena (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/map.cpp` (2990-3096), with `clif.cpp` 10805-10806, `unit.cpp` 3716-3717 and `npc.cpp` 5392-5408 | Licence: GNU GPL v3 (`LICENSE` lines 1-2) | C++ | symbols `map_spawnmobs`, `map_removemobs_timer`

Checked: the hint was INFERRED (no file), so I searched the donor for spawn, respawn and removal code. Read in full: `map_spawnmobs` (3004-3026), `map_addmobtolist` (2990-3002), `map_removemobs_sub` (3028-3053), `map_removemobs_timer` (3055-3082), `map_removemobs` (3084-3096), `npc_parse_mob2` (5198-5216), the spawn-line parse and cache choice (5230-5290 and 5341-5410, read in part). Read in part: `clif_parse_LoadEndAck` (10748-10812), `unit_remove_map_` (3580-3720). Not read: `unit_free` (called at 3050, so whether a removed mob awards anything is not checked), and the `active` counter's decrement. Confidence high on the enter and leave order; medium on how removal interacts with combat state, since `unit_free` was not read.

## 1. Mechanism

Creature population follows player presence. Spawn lines from the map files are kept as data at load. On a map that has dynamic spawning on, nothing is created until a player arrives, and the creatures are removed a grace period after the last player leaves.

Order of steps:
(a) At load, each spawn line is stored as a spawn record if the dynamic setting is on and the map has a free slot in its list (npc.cpp 5389 copies the record; 5392-5394 mark it dynamic). A line is also spawned at load if the map already has players (5400). Otherwise the line is spawned at once and never removed (5405-5407).
(b) The first player onto the map (users go from 0 to 1) calls `map_spawnmobs` (clif.cpp 10805-10806; map.cpp 3004). If a removal timer is still pending, it is cancelled and the existing creatures stay (3009-3013). Otherwise each cached line is spawned (3015-3020), and `npc_parse_mob2` creates the missing count, one mob at a time (5202-5214; the `active` counter at 5213).
(c) The last player leaving (users reach 0) calls `map_removemobs` (unit.cpp 3716-3717). It arms a timer for `mob_remove_delay` ms (map.cpp 3095). Instance maps are not swept (3091-3093).
(d) When the timer fires, it clears its own id and does nothing if a player has come back (3072-3074). Otherwise it sweeps the map (3076).
(e) The sweep (3028-3053) removes a creature unless one of these holds: it has no spawn record and is not a slave (3035-3036); its line is not dynamic (3038-3039); its respawn timer is pending (3041-3042); it is an MVP (3047-3048); or it is damaged while `mob_remove_damaged` is off (3044-3045). The shipped config has `mob_remove_damaged: yes` (monster.conf 257), so damaged creatures are removed too.

Numbers: a line's count is capped at 1 to 1000 (npc.cpp 5277-5281) and scaled by `mob_count_rate` (5341-5344). The shipped grace period is 300000 ms, five minutes (monster.conf 259-260). The code default is 60000 ms (battle.cpp 8621). Dynamic spawning is on in the shipped config (monster.conf 254) and in the code default (battle.cpp 8582).

## 2. Key functions

- `map_spawnmobs`: `/mnt/frankendom-donors/rathena-rathena/src/map/map.cpp` 3004-3026. Enter: cancel a pending sweep, or spawn every cached line.
- `map_removemobs`: same file, 3084-3096. Leave: arm the grace timer.
- `map_removemobs_timer`: same file, 3055-3082. Timer fire: recheck players, then sweep.
- `map_removemobs_sub`: same file, 3028-3053. Which creatures survive the sweep.
- `npc_parse_mob2`: `/mnt/frankendom-donors/rathena-rathena/src/map/npc.cpp` 5198-5216. Spawns the missing count of one line.
- Load-time cache choice: `/mnt/frankendom-donors/rathena-rathena/src/map/npc.cpp` 5392-5408.
- Enter hook: `/mnt/frankendom-donors/rathena-rathena/src/map/clif.cpp` 10805-10806.
- Leave hook: `/mnt/frankendom-donors/rathena-rathena/src/map/unit.cpp` 3716-3717.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A zone's population exists only while someone is in it | Dynamic on (theirs, monster.conf 254; battle.cpp 8582 default 1) |
| Leaving arms a grace timer; it does not remove at once | Shipped 300000 ms (theirs, monster.conf 260); code default 60000 ms (theirs, battle.cpp 8621) |
| Re-entering before the timer fires cancels the sweep and keeps the creatures | none (the cancel, 3009-3013) |
| The sweep rechecks the player count when it fires | none (3073-3074) |
| Keep the boss and anything still waiting to respawn | none (3041-3042, 3047-3048) |
| Creature count per spawn line | cap 1000 (theirs, npc.cpp 5277); scale 100 percent (theirs, battle.cpp 8333) |

## 4. TypeScript sketch

simplified: keeps the enter and leave order, the cancel of a pending sweep when a player returns, the recheck when the timer fires, and the sweep rules for MVPs, pending respawns and damaged creatures. It omits the load-time choice of which lines are dynamic and the slot cap on the cache, the instance-map exception, the script-spawned and slave exemptions, and the `unit_free` cleanup (not read). It counts live creatures per line instead of the donor's `active` counter, whose decrement was not read. The donor's enter path spawns the missing count only when no sweep is pending; the sketch does the same.

```ts
// Licence: GPL-3.0 (donor, rAthena LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SpawnLine { id: string; count: number; }
interface Mob { lineId: string; hp: number; maxHp: number; isMvp: boolean; respawnPending: boolean; }

class ZonePopulation {
  private users = 0;
  private live: Mob[] = [];
  private sweepAt: number | null = null; // pending sweep time, like the map's removal timer

  constructor(
    private cache: SpawnLine[],                 // spawn lines are data; they are kept even while the zone is empty
    private graceMs: number,                    // how long an empty zone keeps its mobs
    private removeDamaged: boolean,
    private spawnOne: (line: SpawnLine) => Mob, // creates one mob for a line
  ) {}

  playerEnter(): void {
    this.users += 1;
    if (this.users !== 1) return;
    if (this.sweepAt !== null) { this.sweepAt = null; return; } // mobs are still here: cancel the sweep
    for (const line of this.cache) {
      let have = this.live.filter(m => m.lineId === line.id).length;
      while (have < line.count) { this.live.push(this.spawnOne(line)); have += 1; }
    }
  }

  playerLeave(now: number): void {
    this.users -= 1;
    if (this.users === 0) this.sweepAt = now + this.graceMs; // arm the sweep; do not remove yet
  }

  // Called from the server loop. Sweeps only if the zone is still empty when the grace period ends.
  tick(now: number): void {
    if (this.sweepAt === null || now < this.sweepAt) return;
    this.sweepAt = null;
    if (this.users > 0) return; // someone came back before the timer fired
    this.live = this.live.filter(m => this.shouldKeep(m));
  }

  private shouldKeep(m: Mob): boolean {
    if (m.isMvp) return true;
    if (m.respawnPending) return true;
    if (!this.removeDamaged && m.hp < m.maxHp) return true;
    return false;
  }
}
```

## 5. Lands in

- TARGET `src/fight/population.ts` (new module: a zone's creature population, driven by player presence). Parity-checklist row 17 (death/respawn) is the nearest row, since creatures leave and return with the zone. No row covers zone population, so this needs a decision (see gaps). Current Frankendom spawn code was not read; not checked.
- Ruling (Lead Dev, 2026-10-10): this lands on NEW parity row 23, "Zone population: spawn caps, respawn, despawn on empty with a grace timer" (not row 17, not row 4). Logic in the engine's server spawns (origins/server/world-spawns.ts); numbers (cap, spawn chance, respawn s, grace s, coverage) are zone data fields in the zone schema. No per-zone code.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, the shape transfers and the code does not)
- Best transferable idea: a zone's creatures exist only while a player is in it; leaving arms a grace timer, and a return before it fires cancels the sweep.
- Brief rule served: zones as data on one runtime (the spawn lines are records; the population runs on the one server)

## 6. Gaps and risks

- The population must run on the engine's server side, not in the Pit or zone client (one runtime). The donor runs it in the server's map loop.
- A sweep removes creatures without a kill. It must not pay loot or XP (row 18); `unit_free` was not read, so the donor's behaviour here is not checked.
- A respawn can fire on an empty zone: `mob_delayspawn` (mob.cpp 1044-1058) has no player-count check, and the sweep skips creatures with a pending respawn (3041-3042). Not tested.
- The `active` counter (npc.cpp 5202, 5213) is decremented somewhere not read. The sketch counts live creatures instead, which may differ for a creature that is dead and waiting to respawn.
- The donor caps how many spawn lines a map can cache (`MAX_MOB_LIST_PER_MAP`, map.cpp 2995-3000). Lines past the cap spawn statically and are never swept. Frankendom would hold zone spawns as data with no slot cap.
- The grace period is a tuning value. 300 s suits a persistent world; a fast browser fight zone would want a much shorter grace. Make it zone data, not a constant.
- The count cap of 1000 per line (npc.cpp 5277) is far above MAX_ATTACKERS = 3. Population size is not an attacker limit; do not use it as one.
- Not written up here, though read: the per-creature respawn delay (mob.cpp 1064-1098: `delay1` plus `rnd()%delay2`, floored at 1000 ms) and free-cell placement (map.cpp 1798-1867). Each would need its own cell.
- Licence GPL-3.0: clean-room only. The sketch is written from the described mechanism.
