# ModernUO (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` (timer, cap, entry pick, respawn, defrag) with `SpawnerEntry.cs`, `ProximitySpawner.cs`, `RegionSpawner.cs` and `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.cs` | Licence: GPL-3.0 (the repo LICENSE file is GPLv3; `ProximitySpawner.cs` header: "either version 3 of the License, or (at your option) any later version"; `BaseSpawner.cs` has no per-file header) | C# | symbol `BaseSpawner.OnTick`

Checked: `BaseSpawner.cs` read at 391-418 (remove, respawn), 436-456 and 500-560 (position search, partial), 769-1000 (start, stop, defrag, tick, spawn, entry pick, spawn entry start), 1160-1215 (timer), 1310-1324 (InternalTimer); lines 49-50, 148, 261, 292 and 536 were seen only in grep output, and the other numbers in the table were taken from grep hits, not from a full read. `SpawnerEntry.cs` read 14-177 in full. `ProximitySpawner.cs` read in full (1-123). `RegionSpawner.cs` read 16-124. `Timer.cs` read 40-55 (constructor, one-shot). `Timer.TimerWheel.cs` read 146-178 (`Execute`, finished check). Not read: `SectorSpawnCache.cs` (grep hit only, 255-270), `BaseSpawner.Hooks.cs`, `Spawner.cs`, `SpawnerJsonSerializer.cs`, `BaseRegion` (rectangle weights), the body of `Spawn(SpawnerEntry)` after 1000 and the position-search phases 2-4 after 560. Confidence: high on the timer, cap, entry pick and group rules (read in full); medium on what a successful spawn does (creation and placement not read). camera_scope: not applicable.

## 1. Mechanism

- A spawner is one data object per zone or point (JSON-serialized, `SpawnerEntry` items). It holds a cap `_count` (default 1, line 261), a min and max respawn delay (defaults 5 and 10 minutes, lines 49-50), a list of entries, and a `_running` flag (`Start` needs at least one entry, 781).
- A single timer runs the zone (`InternalTimer`, 1310-1324). `Timer(TimeSpan delay)` is a one-shot: `Count = 1` (`Timer.cs` 40, `Init` 46-51), so `Execute` finishes it after one call (`Timer.TimerWheel.cs` 148). `DoTimer()` picks a random delay in [min, max] ms each time it arms (1176-1179) and sets `End = Now + delay` (1192-1196). It starts the timer only when the zone is not full (1209-1211).
- `OnTick` (829-848), in order. Group mode (`_group`): `Defrag()`, then if any spawn is still alive it returns at once (835-837), so the timer is not re-armed; if the zone is empty, `Respawn()` removes all and spawns `_count` times (406-416), then calls `DoTimer()`, which starts the timer only if the zone is still not full. Non-group: `Spawn()`, then `DoTimer()`.
- `Spawn()` (850-895): `Defrag()`; return if there are no entries or the zone is full (852-858). Sum the probability of entries that are neither full nor disabled (862-869). If the sum is 0, return (871-874). Draw `rand` in [1, sum] (876). Walk the open entries; the first whose weight is at least `rand` spawns (886-890); otherwise subtract its weight and continue (893).
- `Remove(spawn)` (391-404): `Defrag()`, remove from the zone and the entry, then `DoTimer()` only if the zone is running, not full, and the timer is not already running (400-403). So a death re-arms the one timer with a fresh random delay, and a second death while the timer runs does not restart it.
- `Defrag` (801-823, `SpawnerEntry.Defrag` 164-176) drops a spawn when it is deleted, has no spawner, is an item carried by a mobile, locked down or secure, or is a creature that is controlled or stabled (814-819). It is called from `Spawn` (852), `Remove` (393), `OnTick` (833, group mode), `CountSpawns` (1217), `RemoveSpawns` (1247) and `BringToHome` (1277), and once from `BaseSpawner.Entries.cs` 95 (not read).
- `ProximitySpawner` (subclass, `ProximitySpawner.cs`): no timer. `DoTimer` only sets `End` (69-76); `Respawn` removes all and sets `End = Now` (79-84). `OnMovement` (96-122) spawns only when the zone is empty, `End <= Now`, a valid player is within `TriggerRange` and has moved (103-104); it then calls `DoTimer()` and `Spawn()`. This makes respawn presence-gated: a player must walk into range after the delay.
- `RegionSpawner` (`RegionSpawner.cs`): `GetBoundsForSpawnAttempt` picks a rectangle from the region with probability proportional to its weight (77-89). It has no spiral scan (67).
- Position search (`GetSpawnPosition`, 436-560, partly read): up to 10 random attempts (443, 148); after a non-transient failure, a spiral scan that covers 3 rings while the scan is still at ring 0 and 1 ring after that (536), limited per call.

## 2. Key functions

- `BaseSpawner.OnTick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` 829-848. Group versus single-spawn branch, then re-arm.
- `BaseSpawner.Spawn()`: same file 850-895. Cap check, weighted entry pick over open entries.
- `BaseSpawner.Respawn()`: same file 406-416. Group refill.
- `BaseSpawner.DoTimer()` and `DoTimer(TimeSpan)`: same file 1169-1213. Random delay, one-shot timer start only when not full.
- `BaseSpawner.Remove()`: same file 391-404. Re-arm after a removal.
- `BaseSpawner.Defrag` / `OnDefragSpawn`: same file 801-823; `SpawnerEntry.cs` 164-176.
- `ProximitySpawner.OnMovement`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/ProximitySpawner.cs` 96-122.
- `RegionSpawner.GetBoundsForSpawnAttempt`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/RegionSpawner.cs` 69-92.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Zone cap: live spawns across all entries, refill blocked when full | Default cap 1 (theirs, BaseSpawner.cs 261); `IsFull` = live >= cap (292) |
| Respawn delay drawn at random in a range, a fresh draw each time the timer arms | Min 5 min = 300000 ms, max 10 min = 600000 ms (theirs, 49-50, 1176-1179) |
| Weighted entry pick over open entries; full entries leave the sum | Default probability 100 (theirs, SpawnerEntry.cs 90); default per-entry cap 1 (theirs, 91); probability is a relative weight, not a percent |
| Group zones refill only when empty, one survivor blocks the refill | Rule (835-838) |
| One-shot timer that re-arms only when not full and not running | Rule (400, 1209-1211); one-shot via `Timer(delay)` (Timer.cs 40) |
| Random position attempts, then a spiral budget per call | 10 attempts (theirs, 148); 3 rings first call, 1 after (theirs, 536) |
| Proximity respawn: empty, delay elapsed, player in range | Trigger range is data (theirs, ProximitySpawner.cs 27); no delay constant of its own (uses the same min and max) |

## 4. TypeScript sketch

simplified: one zone, one timer, no creation or placement, no position search, no proximity or region spawner, no serialization, no `OnBeforeSpawn` hook. It keeps the donor's cap check, weighted pick with per-entry caps and full entries removed from the sum, the group refill rule (a survivor leaves the timer off), the single-spawn re-arm only when not full, and the removal re-arm only when the timer is not already armed. It uses `Math.random` for the draws and omits `Defrag`: the caller must decrement the live counts itself when a spawn is removed, where the donor runs Defrag first.

```ts
// Licence: GPL-3.0 (donor repo LICENSE; no per-file header in BaseSpawner.cs). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Entry {
  name: string;
  probability: number;   // weight in the pick (donor: SpawnedProbability, default 100)
  maxCount: number;      // per-entry cap (donor: SpawnedMaxCount, default 1)
  disabled: boolean;
  live: number;
}

interface Zone {
  count: number;         // zone cap: live spawns across all entries (donor: _count, default 1)
  minDelayMs: number;    // donor DefaultMinDelay: 5 min
  maxDelayMs: number;    // donor DefaultMaxDelay: 10 min
  group: boolean;        // group mode: refill only after every spawn is gone
  entries: Entry[];
  live: number;
  dueMs: number | null;  // null = timer not armed
}

const full = (z: Zone): boolean => z.live >= z.count;

// Fresh random delay in [min, max] every time the timer is armed (donor DoTimer, RandomMinMax).
function arm(z: Zone, now: number): void {
  z.dueMs = now + z.minDelayMs + Math.floor(Math.random() * (z.maxDelayMs - z.minDelayMs + 1));
}

// Weighted pick over enabled, non-full entries; full entries drop out of the sum (donor Spawn()).
function pickEntry(z: Zone): Entry | null {
  const open = z.entries.filter(e => !e.disabled && e.live < e.maxCount);
  const sum = open.reduce((a, e) => a + e.probability, 0);
  if (sum <= 0) return null;
  let r = 1 + Math.floor(Math.random() * sum);
  for (const e of open) {
    if (r <= e.probability) return e;
    r -= e.probability;
  }
  return null;
}

// One spawn, only when the zone is not full. Creating the mobile is the caller's job.
function spawnOne(z: Zone): void {
  if (full(z)) return;
  const e = pickEntry(z);
  if (!e) return;
  e.live++;
  z.live++;
}

// Timer fired (donor OnTick): group mode refills only when nothing is left, and a survivor
// leaves the timer off; non-group spawns one and re-arms only if not full.
function onFire(z: Zone, now: number): void {
  z.dueMs = null;
  if (z.group) {
    if (z.live > 0) return;
    for (let i = 0; i < z.count; i++) spawnOne(z);
    return;
  }
  spawnOne(z);
  if (!full(z)) arm(z, now);
}

// A spawn was removed (donor Remove): re-arm only if not full and the timer is not already running.
function onRemoved(z: Zone, now: number, entry: Entry): void {
  entry.live = Math.max(0, entry.live - 1);
  z.live = Math.max(0, z.live - 1);
  if (z.dueMs === null && !full(z)) arm(z, now);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine: caps, respawn, despawn on empty with a grace timer, presence gate). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer; numbers as zone data: cap, spawn chance, respawn s, grace s, coverage). The donor has no grace timer, so that half is Frankendom's own addition.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the cap, delays and entry weights are per-zone data, not code); one ledger (the zone's live count is one count, updated on spawn and removal)
- Best transferable idea: One zone timer with a random respawn delay drawn fresh on each arm, a cap that blocks refill when full, weighted entries whose full members leave the pool, and a removal that re-arms the timer only when it is idle and the zone has room.
- Decision (proposed): adapt - take the cap, the one-timer re-arm rule, the weighted entry pick with per-entry caps, and the presence-gated proximity trigger; do not port the donor's silence on empty zones (it has no despawn), and add the grace despawn ourselves with its own test.
- Acceptance: Server test: a zone with cap 6 and respawn 90-180 s, after one kill, schedules exactly one respawn timer in [90, 180] s and does not arm a second one on a further kill while armed; in a group zone with two survivors at timer fire, nothing spawns; after the last player leaves, spawns persist for the grace seconds and despawn when it expires, and a re-entry inside the grace cancels the despawn.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- No despawn on empty in the donor. Spawns persist until they are killed, deleted, carried or made controlled (`Defrag`, 814-819). Frankendom's row 23 grace despawn has no donor counterpart; it must be built and tested alone.
- The live count is lazy. `IsFull` reads `Spawned.Count` directly (292). Defrag runs only at the call sites listed in section 1, so a deleted spawn can still count as live until one of them runs. Frankendom's one ledger must update the count on every removal, not rely on a sweep.
- A non-group zone whose open entries all sit at their caps (probability sum 0, 871-874) still gets `DoTimer()` from `OnTick` and re-fires later, doing nothing each time. It is a harmless no-op cycle, but it is wasted timer work at zone scale.
- Group mode blocks refill while one survivor lives (835-837). That is a deliberate rule for pack spawns; Frankendom must decide per zone whether a lone survivor should block refill.
- The probability is a relative weight among open entries (865-893), not a percent. A full entry's weight leaves the pool, so the spawn mix shifts as entries fill. Designers reading "probability 100" as a chance will be wrong.
- Respawn delay is a random draw per arm, not a fixed timer. A death while the timer is running does not restart it (400). Transferable, but test it: a second death must not extend the wait.
- The donor has no player-count scaling in the spawner files read. Presence gating exists only in `ProximitySpawner` (103-104), with a trigger range and no grace. Frankendom's presence gate (empty zone, grace seconds, coverage) is not in the donor.
- `Spawn(SpawnerEntry)` (978) is a public manual path that does not Defrag (the comment at 988-989 says defrag and count were checked before the call). A caller that uses it directly skips the cap check at this layer. Frankendom must route all spawns through one function.
- Position search is a per-call budget (10 random attempts, then a spiral of 3 rings while at ring 0 and 1 ring after, 536). It belongs to the server-tick budget gap in cell 5, not to this note; `SectorSpawnCache.cs` was not read.
- Fight rulings: the zone cap is not the fight cap. MAX_ATTACKERS = 3 limits attackers in a fight, not spawns in a zone; do not reuse the donor's cap as an attacker limit.
- Pit as client: no effect. The donor's spawner has no client side.
