# Dawn-of-Light-DOLSharp (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameNPC.cs` (main: `Die` 3952-4010, `Spawn` 2907-2927, `RespawnInterval` 4219-4246, `StartRespawn` 4284-4311, `RespawnTimerCallback` 4313-4316) | Licence: GNU GPL, version 2 or any later version (`GameNPC.cs` header lines 6-7; `LICENSE` is GPL-2.0) | C# | symbol `GameNPC.RespawnInterval`

Checked: Read the respawn path end to end: `GameNPC.Die` (3952-4006: `Delete` at 4000, `StartRespawn` at 4006 for non-pets), `StartRespawn` (4284-4308), `RespawnInterval` (4219-4245), the callback and `Spawn` (2907-2926), the database load of the interval (1854-1858), the region registry field (`Region.cs` 155), `Util.Random(min, max)` (`Util.cs` 173-180, inclusive per its doc comment; `RandomImpl` not read), the server property default (`ServerProperties.cs` 1319-1320), the timer wheel that drives the respawn timer (`gameutils/GameTimer.cs` 142-144, 205-210, 821-824; the timer thread's sleep and balance logic, after line 830, was not read), and the resync utility (`gameutils/RegionTimersResync.cs` 82-130 and 224-229). Not read: `RegionTimer.cs` (only the class line), the `AddToWorld` path, the brain restart in resync, and `RegionTimerAction.cs`. Searched for population caps (`MaxPopulation`, `max_population`, `SpawnCap`, `spawn_cap`, `MaxMobs`, `max_mobs`, `PopulationCap`) across `GameServer`: no hits. Two callers of `StartRespawn` were read: `Die` (4006) and the resync (229). Confidence: high on the interval formula and the respawn flow; high on the resync re-draw; medium on the timer thread's exact timing (its loop was only partly read). camera_scope: not applicable (spawns topic).

Best transferable idea: a dead mob's respawn is a per-mob timer whose delay is a random draw from a tiered band (named mobs get extra minutes, realm mobs a fixed 5 to 10 minutes, higher-level mobs a level add-on), registered in a region-wide pending list, and the spawn itself refuses to run if the mob is already alive.

Decision (proposed): adapt - the tiered random delay and the pending registry are a clean fit for zone respawn as data, but DOL has no population cap, no despawn and no grace timer, so the cap and grace rules must come from Frankendom's row 23 design, not from this donor.
Acceptance: a server test kills a seeded mob and asserts its respawn delay falls inside the zone's band for its tier (named +5 minutes, realm 5 to 10 minutes), that a server resync re-arms every pending respawn exactly once, and that a second spawn call on a live mob is refused; in play a killed zone mob returns at its spawn point after the tier's delay, at full health.

## 1. Mechanism

- Death: `GameNPC.Die` (3952) runs the reward path when there is a killer (loot, faction, server rules), then `Delete()` (4000), then `StartRespawn()` for any NPC that is not a pet (4005-4006).
- `StartRespawn` (4284-4311): does nothing if the mob is alive (4286) or if its brain is a controlled brain (pet or summon, 4288-4289). It draws `respawnInt = RespawnInterval` (4291). If the draw is positive (4292), it creates or reuses one `RegionTimer` for the mob (4296-4300), stops a running timer (4301-4303), registers the mob in the region's pending list with its interval (4306), and starts the timer with that interval (4308). A non-positive draw means no respawn.
- `RespawnInterval` (4219-4246), in the order the code runs: (a) an explicit value wins: if the stored interval is positive or negative it is returned as is (4223-4224). A negative value means never respawn (from the database only values below -1 reach this, because -1 is mapped to 0, 1854-1858). (b) Otherwise `minutes = Util.Random(NPC_MIN, NPC_MIN + 5)` (4226): by default 5 to 10 minutes, where `NPC_MIN` is the server property `npc_min_respawn_interval` (default 5, `ServerProperties.cs` 1319-1320). (c) A name with any capital letter adds 5 minutes (4228-4230). (d) A non-realm mob at level 65 or below returns `minutes` as milliseconds (4233-4235). (e) A realm mob (`Realm != 0`) returns a random 5 to 10 minutes in milliseconds (4240). (f) Any other mob (non-realm, above level 65) returns `(minutes + (Level - 65) + NPC_MIN)` minutes (4244-4245).
- The callback (4313-4315) calls `Spawn()`. `Spawn` (2907-2927) removes the mob from the region's pending list (2910), stops and clears its timer (2912-2918), returns false if the mob is alive or already active (2921), otherwise restores health, mana and endurance to maximum, sets the position to the spawn position (2926) and adds the mob back to the world.
- Database: the stored interval is in seconds; `-1` becomes the default 0 (1854-1856) and the value is multiplied by 1000 (1858).
- Timer driver: a `RegionTimer` inserts itself into the region's `TimeManager` (`GameTimer.cs` 142-144). The manager is a timer wheel: 16 ms buckets (`BUCKET_BITS = 4`, 205) and a table of 2^17 buckets (`TABLE_BITS = 17`, 210), driven by a timer thread that advances the tick each loop (821-824).
- Resync: `RegionTimersResynch` (`RegionTimersResync.cs` 82) detects a frozen manager when its clock has not moved (89), stops and restarts the manager (100, 128), and then restarts every pending respawn with `StartRespawn()` (224-229). `StartRespawn` re-reads `RespawnInterval`, which returns a stored explicit interval unchanged (4223-4224), so a resync restarts every respawn from the start rather than with the time that was left: a mob with a derived interval gets a fresh random delay, and a mob with an explicit interval gets its full stored interval again.

## 2. Key functions

- `GameNPC.Die`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameNPC.cs` 3952-4010. Respawn start at 4005-4006.
- `GameNPC.StartRespawn`: same file, 4284-4311.
- `GameNPC.RespawnInterval`: same file, 4219-4246.
- `GameNPC.Spawn` and `RespawnTimerCallback`: same file, 2907-2927 and 4313-4316.
- Region pending list: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Region.cs` 155.
- Resync: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/RegionTimersResync.cs` 82-130 and 224-229.
- Timer wheel: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameTimer.cs` 142-144, 205-210, 821-824.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Base respawn delay drawn from a band of minutes | Band from the server property, default 5, width 5 (theirs, GameNPC.cs 4226; ServerProperties.cs 1319-1320) |
| Named or unique bonus | +5 minutes when the name has a capital letter (theirs, 4228-4230) |
| Realm (faction) mobs: fixed short band | 5 to 10 minutes, in milliseconds (theirs, 4240) |
| Level add-on above a cap | Cap 65; add (level - 65) plus the base minutes (theirs, 4233, 4244) |
| Explicit per-mob value | Stored in seconds, times 1000; -1 is mapped to 0 (default); any other negative means never (theirs, 1854-1858, 4223) |
| Pending registry, one timer per dead mob | Registry field (theirs, Region.cs 155); timer wheel 16 ms buckets, 2^17 table (theirs, GameTimer.cs 205, 210) |
| Respawn guard | Refuse if alive or active (theirs, 2921) |
| Resync re-arms every pending respawn | Restart from zero on resync: fresh draw for derived intervals, the full stored value for explicit ones (theirs, RegionTimersResync.cs 224-229; GameNPC.cs 4223-4224) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the interval (explicit value first, then the random band, the named bonus, the realm branch, the level branch), the pending registry (one entry per dead mob, removed when the respawn runs), the restart-from-zero resync (the caller's `drawMs` supplies a fresh draw or the explicit value) and the alive-or-active guard. It omits the Die reward path (loot, faction, server rules, pets), the brain check for pets and summons, the RegionTimer and timer wheel internals (not read in full), the `AddToWorld` call, mana and endurance, the brain restart in resync, and the donor's integer details (the donor's `Util.Random` inclusive band is assumed by `randInt`). The restart-from-zero resync is kept on purpose because it is the donor's behaviour; section 6 says why Frankendom should not copy it.

```ts
// Licence: GPL-2.0-or-later (donor, Dawn of Light). Clean-room: written from the described mechanism, not translated.

export interface RespawnProfile {
  baseMinMinutes: number;      // donor: NPC_MIN_RESPAWN_INTERVAL (default 5)
  spreadMinutes: number;       // donor: random band width (5)
  namedBonusMinutes: number;   // donor: +5 when the name has a capital letter
  levelCap: number;            // donor: 65
  realmMinMs: number;          // donor: 5 minutes
  realmMaxMs: number;          // donor: 10 minutes
  isRealm: boolean;
  level: number;
  named: boolean;
  explicitMs: number;          // >0 fixed, <0 never respawn, 0 = derive (donor m_respawnInterval)
}

// randInt(lo, hi) is inclusive on both ends (donor Util.Random(min, max)).
export function respawnIntervalMs(p: RespawnProfile, randInt: (lo: number, hi: number) => number): number {
  if (p.explicitMs !== 0) return p.explicitMs;
  let minutes = randInt(p.baseMinMinutes, p.baseMinMinutes + p.spreadMinutes);
  if (p.named) minutes += p.namedBonusMinutes;
  if (!p.isRealm && p.level <= p.levelCap) return minutes * 60000;
  if (p.isRealm) return randInt(p.realmMinMs, p.realmMaxMs);
  const add = (p.level - p.levelCap) + p.baseMinMinutes;
  return (minutes + add) * 60000;
}

export interface RespawnEntry { id: string; dueAtMs: number; }

// Region registry of pending respawns (donor: MobsRespawning plus one timer per mob).
export class RespawnRegistry {
  private pending = new Map<string, RespawnEntry>();

  start(id: string, nowMs: number, intervalMs: number): void {
    if (intervalMs <= 0) return;                       // never respawn (donor: respawnInt > 0 check)
    this.pending.set(id, { id, dueAtMs: nowMs + intervalMs });
  }

  // Returns ids whose timer is due and removes them (donor: Spawn removes its registry entry).
  due(nowMs: number): string[] {
    const out: string[] = [];
    for (const e of this.pending.values()) if (e.dueAtMs <= nowMs) out.push(e.id);
    for (const id of out) this.pending.delete(id);
    return out;
  }

  // Donor resync: every pending respawn is started again (not with the remaining time). The donor's StartRespawn re-reads
  // RespawnInterval, so a derived-interval mob gets a fresh draw but an explicit-interval mob restarts with its full stored
  // interval; the caller's drawMs must do the same (return the explicit value when there is one).
  resync(nowMs: number, drawMs: (id: string) => number): void {
    for (const id of [...this.pending.keys()]) this.start(id, nowMs, drawMs(id));
  }
}

// Donor Spawn guard: refuse when alive or already active; otherwise restore to the spawn point.
export function spawnBack(
  alive: boolean,
  active: boolean,
  spawnPos: { x: number; y: number },
  maxHp: number,
): { hp: number; pos: { x: number; y: number } } | null {
  if (alive || active) return null;
  return { hp: maxHp, pos: spawnPos };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (server zone respawn: the delay draw, the pending registry and the spawn guard run on the server; the tier bands are zone data). Parity-checklist row 23 (zone population: respawn; the donor has no cap or despawn, so those parts of row 23 come from Frankendom's own ruling).
- Server tick sub-line: the respawn timer is a timer-wheel entry on the region's clock, so the due check runs on the server tick ("server tick: fixed step, input intake, per-tick NPC budget", row 18 / post-K item 3).
- Zone data fields: base band, named bonus, realm band, level cap and add-on, explicit value (see the JSON sidecar).
- Reuse tag: adapt (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: zone population (row 23, respawn): respawn timing is zone data on the one engine; the server verifies the spawn guard; server tick sub-line (row 18 / post-K item 3)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- No population cap, no despawn and no grace timer were found (grep across `GameServer` for the cap names returned nothing). A mob respawns 1 for 1 on its own timer. Frankendom's cap, despawn-on-empty and grace timer (row 23) must be added, not copied.
- Resync restarts each respawn from zero (`RegionTimersResync.cs` 224-229 calling `StartRespawn`, which reads `RespawnInterval` again at `GameNPC.cs` 4291): derived intervals are re-drawn, explicit ones restart at their full value. A server restart or freeze can therefore shorten or lengthen a respawn at random. Frankendom should store the due time and re-arm with the remaining time, so a replay or audit can reproduce the respawn.
- Randomness: `Util.Random(min, max)` (`Util.cs` 178-180) forwards to `RandomImpl`, which was not read, so its seeding is unknown. Server-verified respawns need a seeded server RNG.
- The respawn delay is in `int` milliseconds (`minutes * 60000`, 4235 and 4245). Frankendom should keep the unit in zone data (seconds) and convert once.
- Explicit value semantics are split: 0 derives, negative means never, positive is fixed (4223-4224, 1854-1858). Frankendom should use a named enum (derive, fixed, never) instead of a sign convention.
- The pet and summon exclusion (`StartRespawn` 4288-4289) is donor-specific; Frankendom has no pets in the duel, so only the guard shape transfers.
- The timer wheel's exact tick rate was not confirmed (the timer thread's sleep and balance code was not read). Frankendom does not need the wheel; it needs a due-time check on the server tick.

Reuse tag: adapt (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: zone population (row 23, respawn); server tick sub-line (row 18 / post-K item 3)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Verified: Die 3952-4007 (Delete 4000, StartRespawn 4005-4006 non-pet), RespawnInterval 4219-4246 (all six branches and numbers), StartRespawn 4284-4311, Spawn 2907-2927, DB load 1854-1858, Region.cs 155, ServerProperties 1319-1320, Util.Random inclusive doc 173-180, timer wheel 205/210/821-824, resync 82-130/224-229, GPL-2-or-later header. Error: note says a resync 'restarts each respawn with a fresh random delay'; StartRespawn re-reads RespawnInterval, which returns the stored explicit interval unchanged when m_respawnInterval != 0 (4223-4224), so only derived-interval mobs are re-drawn; explicit-interval mobs restart with the full interval (not remaining time). Also stored negative intervals cannot come from the DB loader except values below -1 (only -1 is mapped to 0).

**Missed:** IsAlive override (4257-4266) returns false while a respawn timer is alive (IsRespawning 4271-4278), so the 'alive' guard in StartRespawn/Spawn treats a mob with a running respawn timer as dead; Spawn clears the registry entry and timer BEFORE the alive/active guard (2910-2921), so a refused second spawn still cancels the timer. Neither is in the note.
