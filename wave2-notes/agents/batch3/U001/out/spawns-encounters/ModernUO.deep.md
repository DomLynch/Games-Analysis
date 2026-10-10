# ModernUO (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` | Licence: GPL-3.0 (repo `LICENSE`, GNU GPL version 3; no per-file licence header in the lines read) | C# | symbols `BaseSpawner.OnTick`, `BaseSpawner.Spawn`, `BaseSpawner.DoTimer`, `BaseSpawner.Remove`, `ProximitySpawner.OnMovement`, `BaseCreature.OnSectorDeactivate`, `BaseCreature.GoHome_Callback` (the entry and the return-home grace are in `BaseCreature.cs`)

Checked: Read in full: `BaseSpawner.OnTick` (829-848), `Spawn()` (850-895), `DoTimer` (1169-1213), `Remove` (391-405), `Respawn` (406-412), `Spawn(entry)` (978-1166, the create and place steps; the property reflection at the top read in part), `SpawnerEntry` `IsFull` and `Defrag` (162-174), `BaseSpawner.OnDefragSpawn` (810-822), `ProximitySpawner` `ValidTrigger` and `OnMovement` (86-120), `Mobile.OnDelete` (4647-4650) and the non-player branch of `Mobile.OnDeath` (4890-4902), `BaseCreature.OnDeath` spawner notify (3475-3480), `BaseCreature.OnSectorDeactivate` and `GoHome_Callback` (4186-4212), default constants (BaseSpawner.cs 49-50, 148, 261; SpawnerEntry.cs 91). Not read: `Spawner.cs` (the concrete spawner class), `RegionSpawner.cs` body, `GetSpawnPosition` past the attempt loop (the spiral scan, `SectorSpawnCache.cs`, `SpawnPositionState.cs`), the house and blocker checks, `BaseCreature.OnDeath` branches above line 3662, `OnSpawned` and `OnBeforeSpawn` overrides, `InstantFlag` consumers. No test file for the spawner was checked. Confidence: high on the timer, the cap, the weighted entry pick and the death and trigger paths; medium on the placement (only the attempt loop read); the sector grace is read directly. Camera scope: not applicable.

## 1. Mechanism

- A spawner holds a count (`_count`, default 1, BaseSpawner.cs 261) and a list of entries. Each entry has a probability weight (`SpawnedProbability`) and its own cap (`SpawnedMaxCount`, default 1, SpawnerEntry.cs 91). The spawner is full when the live count reaches `_count` (292). An entry is full when its live count reaches its cap (SpawnerEntry.cs 162).
- Timer, the main loop: `OnTick` (829) for a normal spawner calls `Spawn()` once and then `DoTimer()` (end of the same tick). A group spawner (`_group`, 831) instead waits until none of its spawns is alive, then calls `Respawn()`, which removes all and spawns `_count` at once (406-412).
- Each `Spawn()` (850): first `Defrag()` removes dead or unowned spawns from the list (801, 810-822). If the spawner is full or has no entries, it returns (855). Otherwise it sums the weights of entries that are not full and not disabled (857-870). A roll `1..sum` (876) walks the entries; the first entry whose weight covers the roll spawns one creature (886-888) and the call returns. So one spawn per fire, weighted by entry weight.
- Respawn delay (`DoTimer`, 1169-1179): the delay is a uniform random value between the min and max delay (defaults 5 and 10 minutes, 49-50). The timer starts only if the spawner is not full (1209-1211). When the count changes and the spawner becomes full, the timer stops (316-320). So a fully killed zone refills at one creature per random 5-10 minute fire, not all at once.
- Death and removal: a creature's death first notifies the spawner (`BaseCreature.OnDeath`, 3477-3479), then base `OnDeath` runs (3662). For a non-player mobile, base `OnDeath` deletes it (Mobile.cs 4899-4901). `Mobile.OnDelete` calls `Spawner.Remove(this)` (4649). `Remove` (391-405) drops the spawn from the list and, if the spawner is running, not full and not already timed, restarts the timer (400-402). Note: a running timer is not reset, so a death does not push back a pending fire.
- Presence trigger (`ProximitySpawner`, 96-120): on a player's movement inside `TriggerRange`, if the spawner is empty and its timer is due (`End <= Now`, 103), it re-arms the timer (108) and spawns once now (109). A valid trigger must have player access level (86-94); it is accepted if it is a player, or if it is a living, visible, damageable mobile. A creature that is a dead bonded pet, or neither controlled nor summoned, is rejected first (88-90). `InstantFlag` then sets each spawned creature's combatant to the triggering player (111-).
- Placement (`GetSpawnPosition`, 424-): up to 10 random points inside the spawn bounds (`DefaultMaxSpawnAttempts`, 148; loop at 443-457); if none is valid, the code falls into a cache and spiral path (not read) or the spawner's own location.
- Return home after a sector empties (`BaseCreature`, 4186-4212): when a sector deactivates and a home-bound creature is outside its home range plus 5 tiles (4188-4189), it starts a grace timer of `Utility.Random(45) + 15` seconds (4190), i.e. 15 to 59 seconds. When it fires, if the sector is still inactive, the creature is moved home (4204-4206). A range-sensitive creature with no home return is deactivated instead (4196).

## 2. Key functions

- `BaseSpawner.OnTick` and `BaseSpawner.Spawn`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` 829-895. The tick, the defrag, the weighted entry pick, one spawn per fire.
- `BaseSpawner.DoTimer` and `BaseSpawner.Remove`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` 391-412 and 1169-1213. The random delay, the full-stop, the death re-arm.
- `BaseSpawner.Spawn(SpawnerEntry, out EntryFlags)`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs` 978-1166. Creates the mobile, places it, sets home and range, calls the hooks.
- `ProximitySpawner.OnMovement`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/ProximitySpawner.cs` 96-120. The presence trigger.
- `BaseCreature.OnSectorDeactivate` and `GoHome_Callback`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 4186-4212. The grace timer and return home.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone-wide cap on live spawns; a spawner stops its timer when full | Default count 1 (BaseSpawner.cs 261); full test `Spawned >= count` (292) |
| Per-entry cap, so one spawn type cannot take the whole cap | Default entry cap 1 (SpawnerEntry.cs 91); entry full test (162) |
| Weighted pick among entries that are not full; one spawn per fire | Weights are spawner data (`SpawnedProbability`); roll `1..sum` (BaseSpawner.cs 876) |
| Respawn after a random delay between min and max; restart only when not already timed | Min 5 min, max 10 min (49-50); delay uniform in the range (1179) |
| Presence trigger: spawn now only when empty and due, then re-arm | Trigger range is spawner data (`ProximitySpawner` `TriggerRange`) |
| Grace before a displaced creature goes home after its sector empties | Grace 15 to 59 s (BaseCreature.cs 4190, `Random(45) + 15`) |
| Placement by random attempts inside bounds, then fallback | 10 attempts (BaseSpawner.cs 148); x and y uniform inside bounds (457-458) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order: a timer fire spawns at most one creature from a weighted pick among entries under their caps, then re-arms unless the zone is full; a death frees the slot and restarts a stopped timer; a player entering an empty zone whose timer is due spawns one now; a displaced creature returns home after a 15 to 59 s grace; placement tries up to 10 random points and falls back. It omits: the group respawn (remove all and spawn the full count at once); the defrag rules for owned, controlled, stabled and locked-down items; the reflective property setting and the parameter constructors; the house and blocker checks; the spiral scan and the sector spawn cache; the `InstantFlag` combatant assignment; `RegionSpawner`; and the order of `DoTimer` against `Spawn` in the proximity path (the sketch re-arms inside the same fire).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnEntry {
  name: string;
  weight: number;      // relative chance this entry is picked
  maxAlive: number;    // per-entry cap
  alive: number;
  enabled: boolean;
}

export interface Zone {
  cap: number;         // zone-wide cap on live spawns
  minDelayMs: number;  // respawn delay range, one spawn per timer fire
  maxDelayMs: number;
  entries: SpawnEntry[];
  alive: number;
  nextAt: number | null; // null = timer stopped (full or not started)
}

export const isFull = (z: Zone): boolean => z.alive >= z.cap;

// Weighted pick among enabled entries that are below their own cap.
export function pickEntry(z: Zone, rand: () => number): SpawnEntry | null {
  const open = z.entries.filter((e) => e.enabled && e.alive < e.maxAlive && e.weight > 0);
  const total = open.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = 1 + Math.floor(rand() * total); // 1..total
  for (const e of open) {
    if (r <= e.weight) return e;
    r -= e.weight;
  }
  return null;
}

function armTimer(z: Zone, now: number, rand: () => number): void {
  const span = z.maxDelayMs - z.minDelayMs;
  const delay = z.minDelayMs + Math.floor(rand() * (span + 1));
  z.nextAt = isFull(z) ? null : now + delay;
}

// One timer fire: spawn at most one creature, then re-arm (or stop when full).
export function tick(z: Zone, now: number, rand: () => number, place: () => boolean): void {
  if (!isFull(z)) {
    const e = pickEntry(z, rand);
    if (e !== null && place()) {
      e.alive++;
      z.alive++;
    }
  }
  armTimer(z, now, rand);
}

// A spawn died and was deleted: free the slot, and restart the timer if it was stopped.
export function onSpawnGone(z: Zone, e: SpawnEntry, now: number, rand: () => number): void {
  e.alive = Math.max(0, e.alive - 1);
  z.alive = Math.max(0, z.alive - 1);
  if (z.nextAt === null && !isFull(z)) armTimer(z, now, rand);
}

// Player entering the trigger range of an empty zone whose timer is due: spawn now and re-arm.
export function onPlayerTrigger(z: Zone, now: number, rand: () => number, place: () => boolean): boolean {
  if (z.alive !== 0 || (z.nextAt ?? now) > now) return false;
  tick(z, now, rand, place);
  return true;
}

// Sector emptied while a creature is out of its home range: go home after a grace of 15 to 59 s.
// Returns the time to check, or null if the creature stays put.
export function goHomeAt(now: number, outOfHome: boolean, rand: () => number): number | null {
  if (!outOfHome) return null;
  return now + (15 + Math.floor(rand() * 45)) * 1000;
}

// Random spawn point inside bounds, up to 10 attempts; otherwise the zone's own point.
export function pickPosition(
  bounds: { x0: number; x1: number; y0: number; y1: number }, attempts: number,
  canSpawnAt: (x: number, y: number) => boolean, rand: () => number, fallback: { x: number; y: number }
): { x: number; y: number } {
  for (let i = 0; i < attempts; i++) {
    const x = bounds.x0 + Math.floor(rand() * (bounds.x1 - bounds.x0));
    const y = bounds.y0 + Math.floor(rand() * (bounds.y1 - bounds.y0));
    if (canSpawnAt(x, y)) return { x, y };
  }
  return fallback;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic; the numbers are zone data fields). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The server tick is not the timer here: the fire is a per-zone timer, so the per-tick NPC budget sub-line of row 18 / post-K item 3 still applies to the fights these spawns start.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a zone population rule with a zone-wide cap, a per-type cap, one spawn per random respawn timer fire, a presence trigger that spawns one when a player enters an empty zone, and a 15 to 59 second grace before a displaced creature goes home.
Decision (proposed): adapt — take the caps, the one-per-fire timer with a random min-max delay, the restart-on-death rule and the presence trigger as zone data for row 23. Do not take the grace as a despawn: the donor returns the creature home after the grace, it does not delete it, so Frankendom's "despawn on empty" needs its own decision. The grace is a good number to start from.
Acceptance: a server test with a zone cap of 3 never holds more than 3 live spawns; one spawn appears per respawn fire; killing a spawn restarts the timer if it had stopped; a player entering an empty zone whose timer is due gets exactly one spawn at once; a creature displaced by an empty sector returns home between 15 and 59 seconds later.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- The donor has no despawn. It returns a displaced creature home after a grace timer and deactivates range-sensitive AI. Frankendom's ruling of "despawn on empty with a grace timer" is not something the donor shows; it is a design choice that the sketch leaves open.
- The donor's timer and presence trigger are per spawner, with no shared server budget. Frankendom's zones need the per-tick NPC budget (server tick sub-line of row 18). A respawn fire should be a queued event the fixed server step drains, not a free timer.
- Zones as data: cap, respawn min and max, per-entry cap and weight, trigger range and grace are all per zone. The 10 placement attempts and the 15 to 59 s grace are engine constants. The donor's defaults (count 1, 5 to 10 minutes) are not Frankendom values and should not be copied.
- Caps and MAX_ATTACKERS: a zone cap of 3 live spawns is not the same rule as MAX_ATTACKERS = 3 on one player. The fight engine must enforce attackers per player; the zone cap only limits population.
- Placement: the donor retries random points and then falls back to the spawner's own point. Frankendom must not spawn inside an arena or on a blocked tile; the sketch's `canSpawnAt` stands in for a check that was not read in the donor (the house and blocker checks).
- Kills are server events. The donor frees the slot when the creature is deleted (`Mobile.OnDelete`), so the death path must go through the server ledger before the slot is freed, to keep one ledger and server-verified kills.
- Persistence: a respawn that was pending when the server stopped is handled by the donor's serialized timer state (not read). Frankendom must decide whether a pending respawn survives a restart.
