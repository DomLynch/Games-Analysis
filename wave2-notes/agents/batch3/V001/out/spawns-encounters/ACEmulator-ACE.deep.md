# ACEmulator-ACE (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/WorldObject_Generators.cs` | Licence: AGPL-3.0 (LICENSE file: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3") | C# | symbol `WorldObject.SelectAProfile` (with `GeneratorProfile` in `Entity/GeneratorProfile.cs`)


Checked: Read in full or in the ranges shown: `Entity/GeneratorProfile.cs` 36-240 (state, CurrentCreate, Delay, availability, Enqueue, ProcessQueue), 236-320 (Spawn), 352-462 (scatter, container, shop, default placement, landblock and slope checks), 520-627 (NotifyGenerator, Reset, KillAll, DestroyAll, CleanupProfile). `WorldObjects/WorldObject_Generators.cs` 1-420 (profiles, probability roll, slot caps, stop conditions), 436-446 and 474-508 (status and StartGenerator), 560-707 (NotifyOfEvent, Generator_Update, Generator_Generate). `Entity/Landblock.cs` 262-330 (SpawnEncounters), 390-410, 440-560 (tick loops, dormancy, unload), 870-884 (failed placement), 1105-1116 (SetActive). `WorldObjects/WorldObject_Tick.cs` 125-137. `WorldObjects/Creature_Death.cs` 84-138 (death chain). `WorldObjects/WorldObject.cs` 837-884 (Destroy, partly). `WorldObjects/Player_Location.cs` 792 (grep line only). Not read: `GeneratorProfile.Spawn_Specific` (320-351), `TreasureGenerator` and `RemoveTreasure` (463-520), `WorldObject_Generators.cs` 420-435 and 447-473 (status staging body), 508-559 (DisableGenerator, OnGeneratorDeath, ProcessGeneratorDestructionDirective), `WorldObject_Properties.cs` 2349 (MaxGeneratedObjects), `DatabaseManager.World.GetCachedEncountersByLandblock`, and the code that loads landblocks. Confidence: high on the selection, cap and cooldown order; medium on what makes a whole landblock load (not read). Camera scope: not applicable.

Best transferable idea: Give each zone spawn profile its own cap, a cumulative chance roll (one roll per tick queues at most one profile), and a respawn cooldown that starts when the spawn is removed, so population is data and respawns cannot stampede.
Decision (proposed): adapt - take the per-profile cap, the single weighted roll and the removal-started cooldown; do not copy the parent-generator destruction or the 1000-iteration power-up loop, and add the creature despawn-on-empty grace timer the donor does not have.
Acceptance: A server test with a seeded RNG asserts that a profile with cap 3 never has more than 3 live or queued objects, and that after one of its objects dies no new spawn from that profile appears for the configured respawn time (60 s in the test).

## 1. Mechanism

- What is a spawn here. A spawner is a world object with `GeneratorProfiles`, one per biota generator entry (`WorldObject_Generators.cs` 27, 41-51). Each profile has a weenie to make, an init count, a max count, a probability, a respawn delay, and a `Spawned` dictionary and a `SpawnQueue` of due times (`GeneratorProfile.cs` 42-47, 85-90, 106-115).
- Encounters at landblock load. `Landblock.SpawnEncounters` (269-330) reads the landblock's encounter rows, places each weenie at cell x 24 and cell y 24 (units), clamped to 0.5 to 191.5 (282-283), and destroys it if its cell has a building (294-299). Server properties can override regen interval and profile delay (301-323). This is one-shot placement at load, not a per-tick director. Whether a placed creature repopulates itself depends on its own biota generator profile; not confirmed.
- The director, once per regeneration (`Generator_Generate`, 655-687). A generator is "powered up" at start (`StartGenerator` 474-496) and selects profiles while `GenStopSelectProfileConditions` is false (665-675, capped at 1000 loops). Otherwise it calls `SelectAProfile` once (681). Then every profile runs its heartbeat (685-686).
- Selection (`SelectAProfile`, 108-178): one roll, `ThreadSafeRandom.Next(0, GetTotalProbability())` (120), where the total counts only profiles that are not maxed and are available (184-214, 196-207). Profiles are walked in order; placeholders, maxed profiles and cooling profiles are skipped (127-136). Each eligible profile's adjusted probability (238-276) is a running sum of its threshold over the eligible profiles so far. The first profile with `roll < adjusted` is queued (157-160), and a roll-selected profile ends the roll (167-171). A profile with probability -1 is queued on every select and does not end the roll (157, 167).
- Count per selection (`GetSpawnObjectsForProfile`, 281-314). Init count is taken as one when init or max is -1 (292-295). It is capped by the spawner slots, `MaxCreate - CurrentCreate` (299, 302-303), and by the profile slots when the profile max is not -1 (300, 305-306). `CurrentCreate` for a profile counts live objects plus queued entries (`GeneratorProfile.cs` 70).
- Queue and heartbeat (`GeneratorProfile.cs` 154-229). `Enqueue` adds one entry per object with due time = now (164-167, 173-184). `ProcessQueue` walks the queue: a not-yet-due entry is skipped (198-203); a due entry spawns only if `MaxCreate == -1 || Spawned.Count < MaxCreate` (205-207); every due entry is removed afterwards (225), whether or not it spawned (218-225). `FirstSpawn` is cleared after the pass (228).
- Placement (`GeneratorProfile.cs` 236-315, 352-393). Each object is placed by its regen location type: specific, scatter (random placement by physics within `GeneratorRadius`, 354, 386-388), container, shop, or the default at the generator's location (418-426). A failed placement is destroyed; the first spawn still counts so it does not retry forever (300-311). A failed placement also tells the generator it was picked up (`Landblock.cs` 880).
- Respawn cooldown (`GeneratorProfile.cs` 526-564). When a spawned object is removed, `NotifyOfEvent` finds the profile that holds it (`WorldObject_Generators.cs` 566-567), `NotifyGenerator` checks the event type against WhenCreate (535-559), removes the object from `Spawned` (561) and sets `NextAvailable = now + Delay` (563). Removal fires from `Destroy` with the default flag (`WorldObject.cs` 837, 879-880). A creature's death runs an action chain: wait for the death animation (`Creature_Death.cs` 129), create the corpse and destroy the creature (133-134). So the cooldown starts after the death animation, not at the killing blow.
- Parent destruction (`WorldObject_Generators.cs` 566-577). When the object's parent generator has no live spawns left (`CurrentCreate == 0`) and has an init count above zero, the parent is destroyed in two cases: when it is itself a child generator (and is not a container, or has automatic destruction), or when automatic destruction is set. This removes the spawner (a chest, corpse or similar), not the spawned creatures.
- Presence and time. Each landblock has a dormant flag. After one minute with no activity it goes dormant (`Landblock.cs` 113, 534-546); `SetActive` clears it on player location change (1111-1114; `Player_Location.cs` 792, grep line). While dormant the physics tick returns early (397-400) and the creature think loop is skipped (451-471). The generator update and regeneration loops (474-511) sit after the closing brace of that dormant block, so as read they are not gated by dormancy. Landblocks unload after five minutes with no activity (118, 548-549).
- Tick cadence. Generators regenerate from a sorted list keyed by next regeneration time (494-511) and re-insert themselves at the new time. Each regeneration sets the next time from the cached interval (`WorldObject_Tick.cs` 125-134). The interval is per object (`RegenerationInterval`), not one global value.

## 2. Key functions

- `WorldObject.SelectAProfile`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/WorldObject_Generators.cs` 108-178. The one-roll director over profiles.
- `WorldObject.GetTotalProbability` and `GetAdjustedProbability`: same file, 184-214 and 238-276. Eligible cumulative chance.
- `WorldObject.GetSpawnObjectsForProfile`: same file, 281-314. Count after the slot caps.
- `WorldObject.GenStopSelectProfileConditions`: same file, 319-338.
- `WorldObject.Generator_Generate`: same file, 655-687. Power-up loop, normal select, then per-profile heartbeat.
- `WorldObject.NotifyOfEvent`: same file, 562-584. Parent destruction.
- `GeneratorProfile.ProcessQueue`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/GeneratorProfile.cs` 190-229. Due entries, cap check, removal.
- `GeneratorProfile.NotifyGenerator`: same file, 526-564. Removal and respawn cooldown.
- `Landblock.SpawnEncounters`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Landblock.cs` 269-330. Load-time placement.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One roll per tick over cumulative chances of eligible profiles; first hit queues its count; a -1 profile fires every tick | Cumulative thresholds are biota data (`Probability`), roll range is the total (theirs, WorldObject_Generators.cs 120) |
| Spawn count = init count, capped by spawner slots and profile slots; init -1 counts as 1 | Init -1 counts as 1 (theirs, 292-295) |
| Per-profile cap counts live plus queued objects | Max -1 is unlimited (theirs, GeneratorProfile.cs 130, 205) |
| Respawn cooldown starts when the object is removed, not when it is queued | Cooldown = Delay seconds (theirs, GeneratorProfile.cs 563); Delay read from profile, fallback first profile (113) |
| Encounter cell position | Cell x 24 units, clamp 0.5 to 191.5 (theirs, Landblock.cs 282-283) |
| Server override of encounter regen and delay | Property names encounter_regen_interval and encounter_delay (theirs, Landblock.cs 301-322) |
| Dormant after no activity; unload later | Dormant after 1 minute, unload after 5 minutes (theirs, Landblock.cs 113, 118) |
| Power-up loop safety cap | 1000 selections (theirs, WorldObject_Generators.cs 670) |

## 4. TypeScript sketch

simplified: the sketch keeps the profile director (one roll, eligible cumulative chance, per-profile and zone caps, queue, removal cooldown). It omits: the generator heartbeat timing (RegenerationInterval and the sorted regen list); the power-up loop and its 1000 cap; GeneratorInitialDelay; the regen location modes (specific, scatter, container, shop) and the failed-placement rule; the treasure branch; the placeholder profile (WCID 3666) skip; the FirstSpawn retry rule; the parent-generator destruction; the event and time-of-day gating; the dormant landblock gating; and NotifyOfEvent's WhenCreate matching (the sketch assumes every removal matches). The roll uses the donor's order: total chance first, then the eligible running sum. Times are milliseconds here; the donor uses seconds in Delay and UTC dates.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
interface SpawnProfile {
  probability: number;   // cumulative threshold for the roll; -1 means it fires on every select (zone data)
  initCount: number;     // objects queued when selected; -1 counts as one (zone data)
  maxCount: number;      // per-profile cap; -1 is unlimited (zone data)
  respawnS: number;      // cooldown after one of its objects is removed, seconds (zone data)
  spawned: Set<string>;  // live object ids
  queue: number[];       // due times in ms for pending spawns
  availableAt: number;   // cooldown end in ms
}
interface ZoneSpawner {
  maxCount: number;      // spawner-wide cap across profiles (zone data)
  profiles: SpawnProfile[];
}

const count = (p: SpawnProfile): number => p.spawned.size + p.queue.length;
const isMaxed = (p: SpawnProfile): boolean => p.maxCount !== -1 && count(p) >= p.maxCount;
const isAvailable = (p: SpawnProfile, now: number): boolean => now > p.availableAt;

// Total probability of the profiles that can still spawn right now; any eligible -1 profile makes it 1.
function totalChance(z: ZoneSpawner, now: number): number {
  let total = 0;
  let last = 0;
  for (const p of z.profiles) {
    if (p.probability === -1) {
      if (!isMaxed(p) && isAvailable(p, now)) return 1;
      continue;
    }
    if (!isMaxed(p) && isAvailable(p, now)) {
      if (last > p.probability) last = 0;
      total += p.probability - last;
    }
    last = p.probability;
  }
  return total;
}

// Objects to queue for one selection: init count, capped by the spawner slots and the profile slots.
function spawnCount(z: ZoneSpawner, p: SpawnProfile): number {
  let n = p.initCount === -1 || p.maxCount === -1 ? 1 : p.initCount;
  const zoneUsed = z.profiles.reduce((s, q) => s + count(q), 0);
  n = Math.min(n, z.maxCount - zoneUsed);
  if (p.maxCount !== -1) n = Math.min(n, p.maxCount - count(p));
  return Math.max(0, n);
}

function enqueue(p: SpawnProfile, n: number, now: number): void {
  for (let k = 0; k < n; k++) p.queue.push(now);
}

// One regeneration: one roll over the eligible profiles' cumulative chances; the first profile the roll lands in is queued.
// A -1 profile is queued on every selection and does not end the roll.
function selectProfile(z: ZoneSpawner, now: number, rand: () => number): void {
  const roll = rand() * totalChance(z, now);
  let cum = 0;
  let last = 0;
  for (const p of z.profiles) {
    const eligible = !isMaxed(p) && isAvailable(p, now);
    if (p.probability === -1) {
      if (eligible) enqueue(p, spawnCount(z, p), now);
      continue;
    }
    if (eligible) {
      if (last > p.probability) last = 0;
      cum += p.probability - last;
      if (roll < cum) {
        enqueue(p, spawnCount(z, p), now);
        return;
      }
    }
    last = p.probability;
  }
}

// Heartbeat: spawn due entries while under the profile cap; every due entry is consumed, spawned or not.
function processQueue(p: SpawnProfile, now: number, spawnOne: () => string | null): void {
  let i = 0;
  while (i < p.queue.length) {
    if (p.queue[i] > now) { i++; continue; }
    if (p.maxCount === -1 || p.spawned.size < p.maxCount) {
      const id = spawnOne();
      if (id !== null) p.spawned.add(id);
    }
    p.queue.splice(i, 1);
  }
}

// Removal (kill or destroy) frees the slot and starts the profile's respawn cooldown.
function onRemoved(p: SpawnProfile, id: string, now: number): void {
  if (!p.spawned.delete(id)) return;
  p.availableAt = now + p.respawnS * 1000;
}

export {};
```

Typecheck: the sketch file with `export {};` (already in the block) was run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director, server side; zones are data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer).
- Shape to take: one roll per tick over eligible profiles, per-profile and per-zone caps, a queue, and the cooldown that starts on removal. The despawn-on-empty grace timer is not in the donor for creatures; Frankendom adds it.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: zones as data (one runtime, numbers in zone data); server-verified spawns (the director runs on the server; the client sees the result only)

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. Do not copy the donor lines; the sketch is written from the mechanism.
- Despawn on empty with a grace timer: the donor has no such rule for creatures. The only empty-check destroys the parent spawner when its children are gone (`WorldObject_Generators.cs` 566-577), which is a different thing. Frankendom's row 23 grace timer has to be designed here, not copied. The closest donor analogue is the dormant timer (`Landblock.cs` 113, 534-546), a presence grace of one minute, which pauses creature thinking (451) but, as read, not the generator loops (474-511).
- Spawner-wide and profile caps both count queued entries (`GeneratorProfile.cs` 70), so a queued spawn holds a slot. Frankendom should count the same way or the cap is overrun on a burst.
- The cooldown starts after the death animation and corpse creation (`Creature_Death.cs` 129-134), not at the killing blow. For fast fights a 60 s respawn is measured from the end of the death, which is the place to decide the start point.
- Failed placement is treated as a pickup (`Landblock.cs` 880), and the first spawn is kept even if it failed (`GeneratorProfile.cs` 300-311). Frankendom should not keep a failed spawn as live; it should release the slot and retry on the next roll.
- MAX_ATTACKERS = 3 is about fights, not spawns; this director should not cap the number of mobs near a player at three. Keep the caps (population) separate from attacker caps (fight).
- Zone data: the donor's numbers are biota properties per object (probability, init, max, delay). Frankendom should keep them in the zone file per spawner, with defaults, not on the mob.
- Not read: `Spawn_Specific`, the treasure branch, the event and time gating bodies, the destruction directive, the load path for landblocks, and the database loader for encounters.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: zones as data (population numbers in zone data, one runtime); server-verified spawns (the director runs on the server only)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** Verified SelectAProfile 108-178 (single roll 120, skip placeholder/maxed/unavailable, -1 profiles queue and do not end roll, 167), GetTotalProbability/GetAdjustedProbability, GetSpawnObjectsForProfile 281-314, GenStopSelectProfileConditions, Generator_Generate 1000 cap, CurrentCreate=Spawned+Queue (GeneratorProfile 70), ProcessQueue 190-229, failed first spawn kept 301, NotifyGenerator cooldown 563, NotifyOfEvent parent destruction 569-577, Landblock encounter 24 units clamp 0.5-191.5 and building destroy, dormant 1 min / unload 5 min, generator loops outside dormant block, Landblock 880 PickUp notify. AGPL licence line.

**Missed:** Dormancy only applies when !Permaload && HasNoKeepAliveObjects (Landblock.cs 532); Chest generators have Delay 0 (GeneratorProfile 110-111); Treasure profiles clamp init/max to 1 (WorldObject_Generators 138-150).
