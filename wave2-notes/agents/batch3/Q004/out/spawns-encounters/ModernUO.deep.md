# ModernUO (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` (with `SpawnerEntry.cs`, `ProximitySpawner.cs`; creature and mobile hooks in `Projects/UOContent/Mobiles/BaseCreature.cs` and `Projects/Server/Mobiles/Mobile.cs`) | Licence: GNU GPL v3 (`/mnt/frankendom-donors/ModernUO/LICENSE`, line 4 "Version 3, 29 June 2007"); per-file headers in `ProximitySpawner.cs` and `SectorSpawnCache.cs` say GPL v3 or any later version | C# | symbol `BaseSpawner.OnTick` (with `Spawn`, `Respawn`, `Remove`, `DoTimer`; `ProximitySpawner.OnMovement`)

Checked: Read in full: `BaseSpawner.cs` 286-300, 391-420, 684-707, 769-1000 (tick, spawn, entry pick, spawn-one), 1100-1130 (entity placement tail), 1165-1215 (`DoTimer`), 1245-1275 (`RemoveSpawns`), 1310-1334 (timer class); `SpawnerEntry.cs` 136-177; `ProximitySpawner.cs` 1-123 (whole file); `BaseCreature.cs` 3470-3482 and 3758-3806, 4176-4215 (callers of `Remove` and `NotifySpawnedDeath`); `Mobile.cs` 4640-4652 (`OnDelete`). Callers checked by grep: `OnTick` (only the timer class, line 1320); `Respawn` (gumps and commands, `AdvancedSearchGump`, `SpawnerGump`, `RespawnCommand`, `ImportSpawnersCommand`, `SpawnerControllerGump`); `Remove` (taming, region change, `Mobile.OnDelete`, `FarmableCrop`, `Item`). Not read: the Server `Timer` base class (one-shot behaviour is inferred from `DoTimer` re-arming it explicitly); `GetSpawnPosition` and the placement search (only the header and member list of `SectorSpawnCache.cs` were read); what deletes a creature's body on death (`BaseCreature.OnDeath` 3470-3482 only notifies the spawner); `Spawner.cs` and `RegionSpawner.cs`. Confidence: high on the cap, timer, park-when-full and presence-trigger rules (read in code, receipts verified); medium on the group refill timing, which I traced by hand from `OnTick` and `Remove` and did not run.

## 1. Mechanism

- One spawner owns a set of live mobs (`Spawned`, a dictionary from mob to entry). Its cap is `_count`: `IsFull` is `Spawned.Count >= _count`. Each entry also has its own cap (`SpawnedMaxCount`) and a weight (`SpawnedProbability`).
- Timed mode (the default). A timer calls `OnTick` after a delay drawn uniformly between `_minDelay` and `_maxDelay`. `OnTick` (non-group branch) calls `Spawn()` once, then `DoTimer()` again. So at most one new mob per timer fire.
- `Spawn()` order: (a) `Defrag()` drops dead or unlinked records; (b) return if there are no entries or `IsFull`; (c) sum the weights of entries that are neither full nor disabled; (d) roll `1..probsum` (inclusive); (e) walk the entries and take the first whose weight covers the roll. The roll is taken once. The entry's spawn is attempted once and `Spawn()` returns either way (lines 886-891).
- `Spawn(entry)` creates one mob. Veto point `OnBeforeSpawn`, then properties and constructor, then `Spawned.Add(m, entry)` and `entry.AddToSpawned(m)`, then position (`GetSpawnPosition`), `MoveToWorld`, and `m.Spawner = this`. Position search is not read in full.
- Park-when-full. `DoTimer(delay)` always records the next time (`End = Core.Now + delay`), but starts the timer only `if (!IsFull)` (lines 1209-1211). So a full spawner stops ticking.
- Re-arm on removal. `Remove(mob)` runs `Defrag()`, removes the record, then calls `DoTimer()` only if `_running && !IsFull && _timer?.Running != true` (lines 391-402). A death does not remove the record by itself: `BaseCreature.OnDeath` calls `NotifySpawnedDeath` (3479), a hook only. The record is released when the mob is deleted (`Mobile.OnDelete` calls `Spawner?.Remove(this)`, 4647-4650) or when `Defrag` finds it deleted, unlinked or owned (814).
- Group mode (`_group` true). `OnTick` runs `Defrag()`, then returns without re-arming if any mob is still alive (lines 831-837). Only when a fire finds zero survivors does `Respawn()` run: `RemoveSpawns()` deletes any leftovers, then `Spawn()` runs `_count` times (406-412). If survivors are still alive at a fire, the timer is not re-armed, and the next `Remove` arms a new random delay. So the refill waits for a whole-zone wipe and is paced by the timer, not by each death.
- Manual `Respawn()` (gumps, commands) deletes every mob and refills, bypassing the timer.
- Presence-triggered variant (`ProximitySpawner`). Its `DoTimer(delay)` override only sets `End = Core.Now + delay` and never starts the timer (`ProximitySpawner.cs` 69-77). So the variant has no tick at all. `OnMovement` (96-122) spawns when all of these hold: the spawner is running; `IsEmpty`; `End <= Core.Now` (cooldown elapsed); the mobile is within `TriggerRange`; it moved (`m.Location != oldLocation`); and `ValidTrigger(m)` (88-94: a player account, and either a player or an alive, unhidden, damageable mobile; uncontrolled creatures and dead bonded pets do not count). On a trigger it calls `DoTimer()` (cooldown = a random delay between min and max from the trigger time, lines 108) and then `Spawn()` once (109). `InstantFlag` then sets each spawned mob's `Combatant` to the trigger mobile (111-120). A manual `Respawn()` override (79-84) deletes all mobs and sets `End = Core.Now`, so the next trigger is allowed at once.
- Tick and loop. The donor has no per-frame loop for this topic. Every timer is one-shot, fired by the ModernUO `Timer` class (not read). Times come from `Core.Now`, and delays are random milliseconds from `Utility.RandomMinMax`.

## 2. Key functions

- `BaseSpawner.OnTick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` 829-848. Group branch (831-840) and non-group branch (`Spawn()` then `DoTimer()`, 844-847).
- `BaseSpawner.Spawn()` (no args): same file, 850-892 (defrag, cap, weighted pick). `Spawn(entry)` 978-1130 (one mob per call).
- `BaseSpawner.Respawn()`: same file, 406-416. `RemoveSpawns()`: 1245-1275.
- `BaseSpawner.DoTimer()` and `DoTimer(TimeSpan)`: same file, 1169-1215 (random delay; park-when-full).
- `BaseSpawner.Remove(ISpawnable)`: same file, 391-404 (re-arm on removal).
- `SpawnerEntry.Defrag` and `IsFull`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/SpawnerEntry.cs` 162-172.
- `ProximitySpawner.OnMovement`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/ProximitySpawner.cs` 96-122; `ValidTrigger` 86-94; `DoTimer` override 69-77; `Respawn` override 79-84.
- Death and release: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3477-3480 (notify only); `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 4647-4650 (`OnDelete` unlinks).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone cap: at most `cap` live spawns; the tick is paused when full | `_count` set by constructor `amount`; default 1 (`BaseSpawner.cs` 261) |
| Per-type cap inside the zone | `SpawnedMaxCount` per entry; default 1 (`SpawnerEntry.cs` 102) |
| Weighted pick among types that still have room | `SpawnedProbability` per entry; default 100 (`SpawnerEntry.cs` 90) |
| One roll per timer fire, no retry on failed spawn | Roll range `1..probsum` (`BaseSpawner.cs` 876) |
| Respawn delay drawn uniformly from [min, max] | Min 5 min (300 s), max 10 min (600 s) defaults (`BaseSpawner.cs` 49-50, 261) |
| First spawn shortly after init | 1 s after `InitSpawn` (`BaseSpawner.cs` 707) |
| Random placement with a try limit | 10 attempts (`BaseSpawner.cs` 148); placement not read in full |
| Presence trigger with cooldown from the trigger | Trigger range `_triggerRange`, default 0 in constructor (`ProximitySpawner.cs` 27, 53-54); cooldown uses the same min and max delay |
| Respawn refill only after a full wipe (group) | Group flag `_group`, off by default (`BaseSpawner.cs` 689) |

## 4. TypeScript sketch

simplified: keeps the cap, the weighted pick with a single roll, the park-when-full timer, the re-arm-on-removal rule and the presence trigger with a cooldown from the trigger. It omits the group (refill-when-empty) mode, manual `Respawn` (which deletes all), the position search and sector cache, the `OnBeforeSpawn` veto and property or constructor failure flags, `InstantFlag`, and the `Defrag` of dead records (the sketch only drops records through `remove`). It reorders nothing: the donor's cap check and entry roll happen in the same order. The sketch's `alive` map stands for `Spawned`.

```ts
// Clean-room sketch from the described mechanism (donor is GPL-3.0-or-later; no lines translated).
type Ms = number;

interface EntryDef { name: string; weight: number; maxCount: number; }

interface SpawnerDef {
  cap: number;          // whole-spawner cap (donor: _count, IsFull)
  minDelayMs: number;   // donor: _minDelay
  maxDelayMs: number;   // donor: _maxDelay
  entries: EntryDef[];
}

export class ZoneSpawner {
  private alive = new Map<number, number>(); // mob id -> entry index
  private perEntry: number[];
  private nextAt: Ms | null = null;          // null = timer not running
  private cooldownUntil: Ms = 0;             // presence mode only
  private running = true;

  constructor(private def: SpawnerDef, private rand: () => number = Math.random) {
    this.perEntry = def.entries.map(() => 0);
  }

  get full(): boolean { return this.alive.size >= this.def.cap; }
  get empty(): boolean { return this.alive.size === 0; }

  private randomDelay(): Ms {
    const span = this.def.maxDelayMs - this.def.minDelayMs;
    return this.def.minDelayMs + Math.floor(this.rand() * (span + 1));
  }

  // Donor DoTimer(): always records the next time, but the timer only runs while not full.
  private arm(now: Ms): void {
    if (!this.running) return;
    this.nextAt = this.full ? null : now + this.randomDelay();
  }

  // Donor Spawn(): weighted pick among entries that are not at their own max.
  private spawnOne(place: (entry: number) => number | null): void {
    if (this.full) return;
    const open = this.def.entries.map((e, i) => (this.perEntry[i] < e.maxCount ? e.weight : 0));
    const total = open.reduce((s, w) => s + w, 0);
    if (total <= 0) return;
    let roll = 1 + Math.floor(this.rand() * total); // 1..total, as RandomMinMax(1, probsum)
    for (let i = 0; i < open.length; i++) {
      if (open[i] === 0) continue;
      if (roll <= open[i]) {
        const id = place(i);                          // one attempt; no retry on failure
        if (id !== null) { this.alive.set(id, i); this.perEntry[i]++; }
        return;
      }
      roll -= open[i];
    }
  }

  // Donor OnTick(): fires only when the timer is running; one spawn per fire, then re-arm.
  tick(now: Ms, place: (entry: number) => number | null): void {
    if (this.nextAt === null || now < this.nextAt) return;
    this.nextAt = null;
    this.spawnOne(place);
    this.arm(now);
  }

  // Donor Remove(): drop the record; re-arm only if not full and no timer is running.
  remove(id: number, now: Ms): void {
    const entry = this.alive.get(id);
    if (entry === undefined) return;
    this.alive.delete(id);
    this.perEntry[entry]--;
    if (!this.full && this.nextAt === null) this.arm(now);
  }

  // Donor ProximitySpawner: trigger only when empty, cooldown elapsed, a real step in range.
  onStep(
    playerInRange: boolean, movedThisStep: boolean, validPlayer: boolean,
    now: Ms, place: (entry: number) => number | null,
  ): void {
    if (!this.running || !this.empty || now < this.cooldownUntil) return;
    if (!playerInRange || !movedThisStep || !validPlayer) return;
    this.cooldownUntil = now + this.randomDelay(); // cooldown starts at the trigger, not at the death
    this.spawnOne(place);
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the spawn engine, one per zone runtime). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Numbers are zone data fields (cap, entry caps, weights, min and max respawn s, trigger range).
- Note on row 23: the donor has no despawn-on-empty grace timer. Its "wait for empty" is the group refill and the presence trigger, so the grace timer in row 23 is ours to add.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zone population (row 23): one spawn engine, zones as data; the cap and the timer are engine rules, the numbers are zone fields.
Best transferable idea: a zone spawn director that makes at most one spawn per timer fire, pauses its timer while full, re-arms on removal, and for presence zones triggers only when empty and off cooldown.
Decision (proposed): adapt — keep the park-when-full timer, one spawn per fire, the weighted entry pick and the empty-plus-cooldown presence gate; start the cooldown at the despawn with a grace timer (row 23), not at the trigger; the group refill-after-wipe stays an optional zone flag, not the default.
Acceptance: a server test on a zone with cap 3 and respawn 5 to 10 s: killing all three wolves empties the zone; a fourth wolf never appears while three are alive; the timer does not run while the zone is full; a player stepping into range of an empty zone gets one spawn, and only after the cooldown has elapsed.

## 6. Gaps and risks

- Clean-room only: GPL-3.0-or-later. The sketch is written from the mechanism, and the receipts are for locating the rules, not for copying.
- One engine: the donor spreads the spawn logic over `BaseSpawner`, `ProximitySpawner` and the creature hooks. Frankendom must keep the whole rule in `origins/server/world-spawns.ts` and the numbers in zone data, with no per-subclass overrides.
- Server-verified kills and one ledger: in the code read, a death does not free a slot (`BaseCreature.OnDeath` only notifies, 3479). The slot is freed when the mob is deleted (`Mobile.OnDelete`, 4649) or found deleted at `Defrag`. Frankendom must free a slot on a server-verified kill, in the same write that records the kill in the ledger, and never on a client event.
- Timer, not a tick: the donor's timers are wall-clock (`Core.Now`) and re-armed explicitly. Frankendom's server tick is row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget". The spawn timer should count server ticks, not wall time, so a zone spawn does not drift when the server stalls.
- Group refill timing is subtle: the first timer after a death can fire while survivors remain, and then it does not re-arm until the next death. Frankendom should not copy this; if group refill is ever wanted it needs its own explicit rule and a test.
- The presence trigger starts the cooldown at the trigger, not at the death. That means a fast kill in the cooldown window does not shorten the next respawn. Decide the rule in zone data and test it.
- MAX_ATTACKERS = 3 is a duel rule (fight engine) and does not apply to spawner caps. Do not reuse the donor cap for attackers.
- Placement: the donor tries 10 random positions and then uses a sector cache keyed by map and sector. The placement search was not read in full, so do not cite it for Frankendom placement yet.
- Death body and delete path (who deletes the creature after `OnDeath`) was not read. The slot-release timing depends on it.
