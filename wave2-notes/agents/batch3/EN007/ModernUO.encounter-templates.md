# ModernUO (encounter-templates, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/` (VPS) | Licence: GPL-3.0 (`LICENSE`, header "Copyright 2019-2020 ModernUO Development Team"); no asset licence in the box | C# | Verdict: STRONG. Decision: adapt (idea), with the defects in section 6 fixed in the sketch.

Best transferable idea: make a camp or lair a data row (fixed roster, boundary-crossing trigger, lifetime that restarts only while occupied), and let an ambush trigger aggro the triggering player the moment it spawns.

Checked: Read the code, not only the names, for five encounter shapes: camp (`Multis/Camps/BaseCamp.cs`, `BrigandCamp.cs`, `OrcCamp.cs`, `RatCamp.cs`, `LizardmenCamp.cs`, `HealerCamp.cs`, `MageCamp.cs`, `BankerCamp.cs`), ambush (`Engines/Quests/Uzeraan Turmoil/Objectives.cs`, `Engines/Spawners/ProximitySpawner.cs`), pack and lair spawning (`Engines/Spawners/BaseSpawner.cs` in the lines cited, `Engines/CannedEvil/ChampionSpawn.cs` in the lines cited), escort (`Engines/ML Quests/Objectives/EscortObjective.cs`, `Mobiles/Townfolk/BaseEscortable.cs` in the lines cited, `Engines/ML Quests/Definitions/TownEscorts.cs`), patrol (`Engines/Factions/Mobiles/Guards/GuardAI.cs`, `BaseFactionGuard.cs`, `Mobiles/AI/BaseAI/PetOrders.cs`, `Mobiles/BaseCreature.cs`). Confidence high on the order of operations I cite. Medium on the escort death defect (read in code, not run). 58 receipts verified against the VPS files (`ModernUO.encounter-templates.receipts.tsv` alongside this note).

## 1. Mechanism

What the donor ships for "encounter" is six small mechanisms, each with its own trigger:

- **Camp (a placed multi).** `BaseCamp` is a multi with an event radius of 10 tiles (`BaseCamp.cs` 45). On build it lays out a centre prop, one of three random cooking props, optional crates and chests, and a set of mobiles: a roster of four roamers (brigands, ratmen or lizardmen; the orc camp has three orcs and a captain), each leashed to a home point 6 tiles from the camp centre, and one bound prisoner (`IsPrisoner` and `CantWalk`) 2 tiles off centre (`BrigandCamp.cs` 52-68). Crates are locked with an explosion trap and a loot fill. Decay is the camp's lifetime: the base class uses 30 minutes (`BaseCamp.cs` 39), and the four field camps set 5 minutes (`BrigandCamp.cs` 25). Only boundary crossings call enter and exit (`BaseCamp.cs` 135). The base class restarts decay on both (`BaseCamp.cs` 122, 127). The brigand, orc, rat and lizard camps override both to do nothing (`BrigandCamp.cs` 123, 144), so their lifetime is fixed from creation. A player entering the field camp makes the prisoner call out one of eight lines (`BrigandCamp.cs` 126).
- **Ambush (a quest objective).** A one-shot latch (`m_Ambushed`, saved). On each progress check (called from `QuestSystem.cs` 95), if the player is on Trammel within 30 tiles of a fixed point (`Objectives.cs` 316), the code tries the tile one west and two north of the player (318-319). If `CanSpawnMobile` says yes (322), it creates one hostile, moves it there, sets its combatant to the player at once (332-334), and posts an overhead line. If the tile is blocked it simply tries again on the next check.
- **Proximity spawner (an ambush trigger on a spawner).** `ProximitySpawner.OnMovement` (96) fires only when the spawner is empty (`IsEmpty`), its end time has passed, the mover is inside the trigger range, the mover moved, and the mover is a valid trigger (`ValidTrigger`, line 86: a player, or a living, visible, damageable creature that is not an uncontrolled pet). It then sends the spawn message, restarts its timer, calls `Spawn()` once (109), and if `InstantFlag` is set it sets every spawned member's combatant to the trigger (111-117). `DoTimer` is overridden to set only the end time (69-77), so the proximity spawner never runs the internal timer; it waits for a step-in. `Respawn` removes spawns and sets the end time to now (79-84).
- **Pack wave (a group flag on the base spawner).** When `_group` is set, `OnTick` (829-840) returns while any member is alive (835). Only when the last member is gone does the spawner respawn the whole group at its count (840). `Remove` (BaseSpawner.cs 391-404) re-arms the timer when a member dies, so the wave starts a random 5-10 minute delay (`DefaultMinDelay` and `DefaultMaxDelay`, 49-50) after the last death.
- **Lair (a champion altar).** `ChampionSpawn` runs a one-second slice (366). Kills count toward a threshold (`_kills / MaxKills`). The white-skull meter steps in fifths (`SetWhiteSkullCount(p / 20)`, 663). At 99% it advances a level (659), plays a sound and a location effect at the altar (687-688), and restarts the expiry clock (676). Each slice refills creatures up to `MaxSpawn`, which is 250 minus 40 per sub-level (764), and skips the refill while the champion lives (768). Expiry is 30 minutes after the last level-up (183, 937). If no white skull was reached by then, the lair drops one level (918-922).
- **Escort (a quest that makes an NPC follow).** A player may hold one escort at a time and waits 5 minutes between escorts (`EscortDelay`, `BaseEscortable.cs` 25; `EscortObjective.cs` 41). The escort follows at escort pace (`SetSpeed(0.1, 0.2)`). In the ML path a 5-second check (105) pays out when the escort enters the destination area (139), ends the follow (157), and awards fame or virtue. If the player goes out of 30 tiles or off the map (166), the escort is abandoned once the grace time has passed (`AbandonDelay`, 1 minute with ML on, 2 minutes with it off, `BaseEscortable.cs` 28). In the legacy path the escort goes to Stay while its master is out of range (571) and is released after the grace time (559).
- **Patrol.** In ModernUO "patrol" is not a route. Faction guards set `MovementType.Patrol` (`BaseFactionGuard.cs` 306). Any non-stand movement in `GuardAI` (526) ends in `WalkRandomInHome(2, 2, 1)` (559), a random walk inside the home range. The pet "Patrol" order is not implemented: it falls through to a persistent order (`PetOrders.cs` 123).

## 2. Key functions

- Camp base, decay and boundary: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Multis/Camps/BaseCamp.cs` 39-45, 75-89 (RefreshDecay), 120-143 (OnEnter, OnExit, OnMovement), 145-172 (OnAfterDelete, lines 154-162 delete the non-walking and non-prisoner mobs).
- Brigand camp composition and prisoner: `.../Multis/Camps/BrigandCamp.cs` 22-69 (AddComponents), 123-147 (no-decay overrides).
- Ambush objective: `.../Engines/Quests/Uzeraan Turmoil/Objectives.cs` 306-357 (GetDaemonBloodObjective, CheckProgress 312-337).
- Proximity spawner: `.../Engines/Spawners/ProximitySpawner.cs` 22-123 (whole file read).
- Spawn selection and pack logic: `.../Engines/Spawners/BaseSpawner.cs` 391-404 (Remove), 406-416 (Respawn), 829-840 (OnTick, group), 850-899 (Spawn picks one entry by weight), 978 onward (Spawn(entry) creates one mobile per call, 1096).
- Lair: `.../Engines/CannedEvil/ChampionSpawn.cs` 366 (slice), 512-690 (OnSlice), 674-676 (AdvanceLevel), 764-790 (MaxSpawn and Respawn), 912-937 (Expire).
- Escort: `.../Engines/ML Quests/Objectives/EscortObjective.cs` 15-64 (CanOffer), 124-177 (CheckDestination), 197-207 (EndFollow), 262-271 (OnPlayerDeath). `.../Mobiles/Townfolk/BaseEscortable.cs` 25-31 (constants), 539-590 (GetEscorter legacy and ML branch, BeginDelete). `.../Engines/ML Quests/Definitions/TownEscorts.cs` 7-22 (one class per destination, 13 classes).
- Patrol: `.../Engines/Factions/Mobiles/Guards/GuardAI.cs` 522-566, `.../Mobiles/AI/BaseAI/WalkRandomLogic.cs` 52, `.../Mobiles/AI/BaseAI/PetOrders.cs` 110-125.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (theirs, not copied into the sketch) |
|---|---|
| Boundary-crossing trigger with a fixed radius | Camp event radius 10 tiles (`BaseCamp.cs` 45) |
| Field camp lifetime fixed at creation | 5 minutes (`BrigandCamp.cs` 25); base class 30 minutes (`BaseCamp.cs` 39) |
| Roam leash around a home point | 6 tiles for roamers, 2 tiles for the prisoner (`BrigandCamp.cs` 54, 68) |
| Ambush radius around a fixed point | 30 tiles (`Objectives.cs` 316); spawn offset (-1, -2) from the player (318-319) |
| Trigger cooldown as a random window | Spawner min and max delay, defaults 5 and 10 minutes (`BaseSpawner.cs` 49-50); reagent grove record 11 to 23 minutes (`Reagents.json` 9-10) |
| Escort cooldown, check rate, abandon grace | 5 minutes (`BaseEscortable.cs` 25); 5 seconds (`EscortObjective.cs` 105); 1 or 2 minutes (`BaseEscortable.cs` 28); range 30 (`EscortObjective.cs` 166) |
| Lair meter in fifths, level-up at 99% | Skull step p/20 (`ChampionSpawn.cs` 663); level-up test p >= 99 (657) |
| Lair cap that falls with rank | 250 minus 40 per sub-level, sub-levels at 4, 8, 12 (`ChampionSpawn.cs` 764, 846-847) |
| Lair expiry and drop-back | 30 minutes (183); drop one level below one fifth (918-922) |

Spawn data (aggregated over every JSON under `Distribution/Data/Spawns`, merged across the `shared`, `uoml` and `post-uoml` sets, not de-duplicated): felucca 2122 spawner records, population caps summing to 25000; trammel 2182 records, caps 25917; ilshenar 451 records, caps 2021; tokuno 490 records, caps 2458; malas 207 records, caps 1564; termur 160 records, caps 1534. Median home range is 10 to 30 tiles by map. These are caps in data, not measured densities.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (gate, cooldown, spawn, instant aggro, decay timer), but it changes the two defects named in section 6: the trigger fills to the cap instead of spawning one, and the decay re-arms while a player stays inside. It omits the spawn-tile search, pet and hidden-player checks, the group-wave flag, the message, and the escort and lair logic. Numbers are inputs, not donor values.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Spawner {
  count: number;          // population cap for this encounter
  alive: number;          // members currently in the world
  cooldownUntil: number;  // ms timestamp before which no new trigger spawns
  instant: boolean;       // true: spawned members aggro the triggering player at once
}

interface Encounter {
  spawner: Spawner;
  decayAt: number;        // ms timestamp when an empty encounter may despawn
  decayDelay: number;     // ms of grace after the last check-in
  playersInside: number;  // players currently inside the encounter radius
}

// One step into the trigger radius. Fill to the cap in one go (fix: donor spawns one per trigger).
function onTrigger(
  e: Encounter,
  now: number,
  cooldownMs: number,
  spawnOne: () => void,
  aggroTrigger: () => void,
): void {
  const s = e.spawner;
  if (s.alive >= s.count) return;        // fix: gate on not-full, not on empty
  if (now < s.cooldownUntil) return;
  while (s.alive < s.count) {
    spawnOne();
    s.alive++;
  }
  s.cooldownUntil = now + cooldownMs;
  if (s.instant) aggroTrigger();
  e.decayAt = now + e.decayDelay;
}

// Decay check. An occupied encounter re-arms instead of despawning (fix: donor deletes on the timer alone).
function onDecayCheck(e: Encounter, now: number, despawnAll: () => void): void {
  if (now < e.decayAt) return;
  if (e.playersInside > 0) {
    e.decayAt = now + e.decayDelay;
    return;
  }
  despawnAll();
}
```

Typecheck: the block above, with `export {}` added, passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0).

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new, the pull and trigger step): the ambush trigger (proximity step-in, instant aggro) is parity row 4 (fight loop: aggro, chase, leash). The spawn cap, cooldown and despawn-on-empty grace are row 23 (zone population) and live in `origins/server/world-spawns.ts`, not in a fight file. The fight side only receives "combatant set".
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only; shape, not code).
- Brief rule served: 1 (one engine: the trigger and the fight are server-side; the client only plays the prisoner call, the altar effect and the spawn message); 2 (zones as data: each encounter is a data row).

## 6. Gaps and risks

Defects (the idea stays; each is listed with its fix):

- **D1 Camp decay ignores occupancy.** `BaseCamp.RefreshDecay` sets a timer that calls `Delete` (88) with no check for players inside. Enter and exit refresh only on boundary crossings (135). A player who stands inside a healer, mage or banker camp (no decay override, so 30 minutes) for longer than that without crossing the edge is standing in a camp that is deleted under them; on delete, the vendor mobs (not prisoners) are deleted too (158). Fix: re-arm the timer while anyone is inside (sketch, `onDecayCheck`). Not run.
- **D2 Proximity spawner ignores its count.** `OnMovement` calls `Spawn()` once (109) and only when `IsEmpty` (103). `Spawn` returns early when full (855). So a proximity spawner with a count above one holds a single live member at a time; the rest never spawn. Fix: gate on not-full and fill to count (sketch, `onTrigger`). Likely defect, not run. The donor fixture uses count 1 (`SpawnerFixtureCapture.cs` 34), which may be why it has not shown.
- **D3 ML escort death leaves the escort bound.** `EscortObjective.OnPlayerDeath` calls `Instance.Cancel()` (270). `BaseObjective.OnQuestCancelled` is empty (81), and `EscortObjective` does not override it, so the ML release never runs on death. The release is `EndFollow`, which clears the master (202) and starts the delete timer (206); it runs on arrival (157) and on abandon (239), not on death. In the ML path `GetEscorter` also returns the master with no range or death check (548). So the escort can keep following a dead master. Fix: call the abandon release (EndFollow) from the death handler. Read in code, not run.
- **D4 Grace differs by path.** The abandon grace is 1 minute with ML on and 2 minutes with it off (`BaseEscortable.cs` 28). Two code paths, two rules. Not a bug as such, but a tuning trap.
- **Checked, not defects:** the 5-minute field camp lifetime is deliberate ("Don't refresh decay timer", `BrigandCamp.cs` 123). The "Turn off the timer!" comment in `BaseSpawner.Respawn` (30) is accurate because `DoTimer` starts the timer only when not full.

Design limits seen:

- A four-brigand camp exceeds the Frankendom cap of three attackers. Keep the roster at four for the camp, but limit engagement to three active at once.
- The ambush spawns on one fixed offset with no alternative tile; if that tile is blocked it waits for the next check and does nothing else.
- Lair refill has no per-slice budget: `Respawn` loops until the cap (766-790), so a cold start can fill up to 250 in one slice. Frankendom needs a per-tick NPC budget (row 18 / post-K item 3).

Not read: `Projects/Server` (core); `Engines/Spawners/SectorSpawnCache.cs` (376 lines) and `RegionSpawner.cs`; `SpawnerEntry.cs` beyond line 162; `ChampionSpawn.cs` outside the cited ranges; 108 of 109 spawn JSON files (only `Reagents.json` structure plus aggregate counts); the other ML quest definitions beyond TownEscorts; the guard `Orders` class beyond the enum. Client half: none in the box (README says game data is user-supplied). Paired donor in box: none named in the audit, not searched.

Half read: server (Projects/UOContent encounter code, cited ranges) and data (Reagents.json structure and aggregates). Client: not in the box.

### Feel notes (what the player sees and feels, on a 375-wide phone)

- **Camp.** A fire or spit and open crates in a clearing; four bandits drift within a few tiles of it; a bound NPC who calls out a line when you step in. The field camps fade after five minutes whether or not you stay, so they read as events rather than fixtures.
- **Ambush.** A quiet walk, then one hostile on the tile beside you already on you. No warning band in the donor; the look test below tests whether a warning ring helps.
- **Lair.** A central altar whose skull meter fills in fifths as you kill. At full, a sound and a light burst at the altar, the level steps up. If nobody reaches a fifth before the timer runs out, the lair steps back one level.
- **Escort.** An NPC walks at escort pace beside you. If you outpace it past thirty tiles, it waits, then gives up after a minute and says so in chat.

Why it is striking, against the criteria: the silhouette of fire, prisoner and crates reads at 375 wide; the signature behaviour is the prisoner's call on approach; the signature effect is the altar sound and light on a level-up; and it could be ours at 20 to 30 percent resemblance (a bound messenger, a ring-marked camp, an altar meter).

### The rule behind it

Encounter = trigger + roster + lifetime. The trigger is a radius or a step-in with a cooldown window. The roster is a fixed composition (four roamers leashed to six tiles, one bound NPC, a prop centre). The lifetime is either a fixed clock from creation (field camps), a clock that restarts on each entry (base camps), or a progress meter that resets on a timer (lair). Numbers as designer-tunable data fields:

| name | unit | donor_value_or_null |
|---|---|---|
| trigger_radius_tiles | tiles | null |
| roster_roam_radius_tiles | tiles | null |
| prisoner_offset_tiles | tiles | null |
| lifetime_s_fixed or lifetime_s_refresh | s | null |
| cooldown_min_s, cooldown_max_s | s | null |
| cap_count | count | null |
| meter_step_pct | % | null |
| expire_s | s | null |
| escort_check_s, escort_abandon_s, escort_cooldown_s | s | null |

Donor values are null because the donor is GPL-3.0 and the numbers are its tuning, not ours to copy.

### 5-minute look test (Dom, on the phone)

Build three things in one zone and look at them on a 375-wide screen:

1. A camp: three roamers within six tiles of a fire-and-crate centre, a bound NPC two tiles off centre who calls out when you step in, and a visible ring that shows the five-minute lifetime. Judge: is the camp readable at a glance, and does the ring read as "this is leaving" rather than as a bug.
2. An ambush: a ring twelve tiles around a point; step in and one enemy appears beside you already aggressive. Judge: surprise, or a spawn pop. Then add a half-second warning flash and judge again.
3. A lair altar: two minutes of kills with a five-part skull meter and a sound and light at full. Judge: does the level-up beat read at 375 wide.

### Licence and IP

- Code: GPL-3.0. Adapt the shape only, clean-room; the sketch was written from the described mechanism.
- Content: the mobile names, town names and item names are the donor's and are not used here. The roster is a category ("a bandit band", "a bound messenger", "a fire camp"), not an instance.
- Keep: a fixed composition around one prop, a boundary-crossing trigger, a grace clock that the player can see, a meter that fills in fifths. Change: our own names and palette; the roster capped at three in engagement; occupancy-aware decay (D1); fill-to-count spawns (D2); escort release on death (D3).
- No legal conclusions.

### Frankendom mapping

- 700 zones as data: each encounter is a row (roster ids from the 100 Pit characters, trigger radius, lifetime, cap, cooldown). No zone code.
- Many-vs-one: the donor's four roamers become a roster of four with three active (MAX_ATTACKERS = 3). The hate or target choice stays in the engine (row 4).
- Server-verified: triggers, caps, kills and the escort state are server events; the client plays the prisoner call, the altar effect and the spawn message from those events.
- Keep: the single trigger, the fixed composition, the fifths meter. Change: occupancy-aware decay, fill-to-count spawns, escort release on death, no free wander inside a fight.
