# OpenDAoC-OpenDAoC-Core (world-events, WE005)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core` (VPS, read-only) | Licence: GNU GPL v3 per `LICENSE` and `README.md:41`; the root `gpl.txt` is GPL v2 text and the source header says "version 2 or any later version", so the box does not settle which applies. Treated as clean-room, shape only. Game content: no art or audio in the box; game data rights unknown (AU038, class C).

Checked: Read in full: `scripts/mobs/AlbionMobs/UnnaturalStorm.cs` (257 lines), `scripts/mobs/TimeDependentSpawnNpc.cs` (60), `ECS-Services/RolloverSchedulerService.cs` (213). Read by range: `gameutils/ZoneBonusRotator.cs` (704 lines; 1-460 read, 601-613 and 651-663 read, the rest not read), `SimpleScheduler.cs` (1-240; 241-333 not read), `scripts/namedmobs/Fomor/Myrddraxis.cs` (1606 lines; 460-620 read, 924 seen in grep only), `Krackenschtein.cs` (40-60 and 78-90), `ECS-Components/NpcMovementComponent.cs` (55, 287-309), `serverproperty/ServerProperties.cs` (613-614, 1177-1220), `gameutils/Util.cs` (19-56), `world/Region.cs` (489-496, 1252-1275), `world/WorldMgr.cs` (478-493), `world/DayNightCycleTimer.cs` (106). Candidates opened: 14 files, plus grep-only hits in `BuffMerchantEvent.cs` and `GuildEvents.cs`. Confidence: high for the storm and the rotator (read whole, numbers verified); medium for the rollover and the boss head logic (read the relevant ranges). Receipts: 62 OD rows in `receipts.tsv`; the verifier reported 100 of 100 passing across both donors.

Half read: server (`GameServer/`). The client half is not in the box. The seed rows (`Zones.xml`, `Regions.xml`) were not opened in this pass (AU038 lists them).

## 1. What the player sees and feels

At dusk, the zone gets one line of text for everyone in it: an intense supernatural storm breaks over a named expanse. Four or five dark cloud bodies hang over a fixed patch of ground, each flashing a spell effect every three seconds for players nearby. The first time a player comes within the storm's aggro range (2500 units), a second, area-only line says the storm rumbles and lightning lashes the ground, and a lightning bolt is cast on the current target on a short recast (recast value 3; unit not checked). At dawn the zone gets another line that the storm breaks up with the morning light, but only if nobody is fighting it. On a 375-wide phone the read is a slow, dark sky event with two text beats (start and first contact), a fixed danger zone to step out of, and no hard timer to watch.

## 2. Why it works, or is striking

- Readable at 375 wide: a fixed patch of ground, a cloud silhouette repeated four or five times, and the danger is in one place.
- One signature behaviour: the storm will not leave while it is being fought. The dawn dismissal waits for the fight to end (`UnnaturalStorm.cs:230`).
- One signature effect: a flash on every cloud every three seconds (`UnnaturalStorm.cs:43-46`, `:32`), plus the two text lines. Sound is client-side and was not in the box.
- Could be made ours at 20-30 percent resemblance: a weather event on a schedule with a few decoy clouds and a two-beat announcement.

## 3. The rule behind it

Order of operations (as the code runs):

1. The controller (an `APlayerVicinityBrain`, base class not read) thinks every 1000 ms (`:205`). It reads the game clock hour and minute (`:213-215`).
2. Day, 7 <= hour < 18 (`:216`): it clears the once-per-night flag (`:221`) and tries to dismiss the storm. Dismiss is refused while the storm brain has aggro (`:230`). A dismissal sends the zone line (`:233`), removes the adds and the storm (`:235`).
3. Night, hour < 7, or hour > 18, or 18:30 onward (`:217`), and not spawned yet this night (`:224`): spawn one storm at the controller's own position (`:241-254`).
4. On creation: zone line (`:70`), then 4 or 5 adds placed at random offsets from the storm (`:101`, `:107-109`). Adds are PEACE with aggro level 0 (`:123`, `:125`). The storm itself is CANTTARGET and flying (`:58`).
5. Storm brain: aggro level 100 and aggro range 2500 (`:154-155`), think 1500 ms (`:156`). On first aggro, an area line (`:167`). While it has a target and is not casting, it casts a lightning bolt each think (`:170-171`); damage 200 (`:186`), recast value 3 (`:182`), range 2500 (`:189`).
6. Storm death: adds removed and the zone line (`:76-80`).

Designer-tunable data fields (donor values shown as evidence only; not copied):

| name | unit | donor value | donor_value_or_null |
|---|---|---|---|
| dusk_start | game clock | 18:30 (storm) / 18:00 (region) | null |
| dawn_end | game clock | 07:00 (storm) / 06:00 (region) | null |
| controller_think_ms | ms | 1000 | null |
| storm_aggro_range | units | 2500 | null |
| storm_think_ms | ms | 1500 | null |
| lightning_damage | hp | 200 | null |
| lightning_recast | donor spell unit | 3 | null |
| storm_level_min, storm_level_max | level | 65, 70 (inclusive) | null |
| decoy_count_min, decoy_count_max | count | 4, 5 | null |
| decoy_offset_x, decoy_offset_y, decoy_offset_z | units | +/-1000, -1000 to +800, +/-400 | null |
| decoy_level_min, decoy_level_max | level | 40, 42 | null |
| pulse_ms | ms | 3000 | null |
| zone_line_start, zone_line_end, zone_line_engage | text id | three lines | null |

Zone rotation (ZoneBonusRotator.cs): a second system with a different rule. The PvE set rotates every 7200 s (`:74`) and the RvR realm every 2700 s (`:73`). Each PvE cycle, each realm flips a 50 percent coin (`:325`) between two pairings: a high-level classic zone with a low-level SI zone, or a low-level classic zone with a high-level SI zone. Each RvR cycle picks a realm 1 to 3 (`:284`) and rerolls while it equals the current one (`:285`). Bonuses set per zone: XP 50 PvE (`:98`), XP 100 RvR (`:99`), RP 20 (`:100`), BP 25 (`:101`). Zone lists: 4 RvR zones per realm (`:21-23`), 5 or 4 or 5 low-level classic zones (`:26-28`), 7 or 8 or 8 high-level zones (`:31-33`).

Calendar scheduler (RolloverSchedulerService.cs): hourly, daily, weekly and monthly intervals (`:24-33`). Each has a DB record of the last fire. The tick (`:96-105`) fires only when now has reached the next due time (`:100`); the next due time is then computed from the moment of firing (`:173`), so missed intervals collapse into one fire rather than a backlog. Subscribers: hourly house rent (`HouseRentService.cs:19`), daily gravestones (`GravestoneService.cs:21`), and periodic quest resets per interval (`PeriodicQuestService.cs:56`).

Epic boss respawn (Fomor): respawn is a server property in minutes times 60000 (`Krackenschtein.cs:83`). Property defaults: normal epic 60 (`ServerProperties.cs:1189`), SI epic (`:1184` field), quest epic 30 (field `:1196`), NPC minimum 5 (`:1177` attribute). Myrddraxis: the heads are separate NPCs with respawn -1 (`:190`, `:201`, and the others), re-created by the boss when missing, once per leash cycle (`Myrddraxis.cs:491`, latch set at `:555`, cleared at `:560` when it has a target). Leash: if no player is near (`:472`), the boss returns to spawn, is healed to full (`:476`), and clears its cast flags. Phase thresholds: stun at 80, 60, 40, 20 percent (`:621` and following); point-blank area casts at 75, 50, 25 (`:647-659`). Random attack timer 35 to 45 s (`:563`, `:568`).

Roam (NpcMovementComponent.cs): a mob may roam only if ALLOW_ROAM is on, its roaming range is above zero and it is not on a path (`:55`). A roam target is a random radius within the range (`:306`) offset from its spawn point (`:308`). Cooldown between roams is 5 to 40 s (`ServerProperties.cs:1214`, `:1220`). This is a leash around the spawn, not a roaming boss.

Day and night roster (TimeDependentSpawnNpc.cs): DaySpawn is visible when the region is not night (`:33`); NightSpawn when it is (`:43`). The brain refreshes visibility only when the mob is not in combat (`:54`). Region night is hour >= 18 or < 6 (`world/Region.cs:496`). The game clock wraps at one day (`DayNightCycleTimer.cs:106`).

Epic difficulty: `SET_DIFFICULTY_ON_EPIC_ENCOUNTERS` (`ServerProperties.cs:614`); its doc says 0 means auto-adaptive and other values are a percent of the starting difficulty (`:613`). The adaptive branch was not read.

## 4. For Frankendom

- Zones as data: the storm is a zone flag with an hour window, decoy count and offsets, lightning numbers, and three text ids. The rotation is a list of zone ids per tier plus two pairings. Both are zone data on one runtime.
- Server-verified: the storm's on/off state, the engage event and the dawn decision are server state. The client only shows the two text lines, the flashes, the sound.
- Many-vs-one: the decoy clouds are PEACE with aggro 0, so they are decoration. They do not count against MAX_ATTACKERS = 3. The lightning is one caster on one target. Keep the decoys non-attacking, or count them.
- Engage is a state change: the first contact flips one flag and sends the area line once (`onEngage` in the sketch). That matches "engage is a state change".
- Keep: the dusk-to-dawn schedule as data; one storm per zone; the dawn rule "do not dismiss a fight"; the two-beat announcement (zone at start, area at first contact).
- Change: (a) the second-storm defect (section 3, D1); (b) the two night clocks (D2); (c) the rotator's in-memory state (D3). Defect fixes are in the sketch.

Defects (keep the idea, fix the defect):

- D1, second storm: the day branch clears the night flag every day tick (`:221`); a storm that survives dawn because a fight is on (`:230`) is still tracked in `_storm`, and at the next dusk `SpawnStorm` runs again (`:224`, `:253`) and overwrites the reference. Result: two storms, and the first one is never dismissed. Fix: spawn only when no live storm is tracked; clear the night flag only when the storm is gone. (Sketch: `StormController.tick`.)
- D2, two night clocks: region night is 18:00 to 05:59 (`Region.cs:496`); the storm's night is 18:30 to 06:59 (`:217`). Day and night rosters and the storm disagree by 30 minutes at dusk and an hour at dawn. Fix: one `isNight` helper for both.
- D3, rotator state not saved: the donor says so itself (`ZoneBonusRotator.cs:87`). The bonus values are written to the DB (`:182-187`), but the picks live in memory. After a crash, the next start clears the default zone ids (zone 0 and friends, `:162`), so the boosted zones keep their bonus. Fix: persist the current picks; on start, clear the recorded picks first.
- D4, design question, not a defect: a fight still running at dawn keeps the storm running into the day. Decide whether a fight may run past dawn.
- Check (not a defect as read): the Myrddraxis head loop only runs when `GetNPCsInRadius` returns at least one NPC (`:497`). The boss itself is probably in that list; not verified.

## 5. Look test (5 minutes, on Dom's phone)

Target: `origins/server/world-spawns.ts` (parity row 23, zone population: schedule, spawn, despawn). If the lightning is a real attack, its fight hook would go in a proposed `src/fight/<module>.ts` (not checked against the repo in this pass).

Set the look-test flag on one test zone to a fixed dusk. Show: four clouds over one fixed patch, one zone line at start, one area line on first contact, and a lightning cue on the current target. Then turn it off. Compare with the same zone at the same spot without the storm. Dom judges at 375 wide: (a) can he find the danger patch in three seconds; (b) does the start line read as an event, not as spam; (c) does the lightning read as a threat, not as noise.

## 6. Licence and content

Code is GPL v3 (`LICENSE`, `README.md:41`) with a version conflict in the box (`gpl.txt` is v2). Clean-room only: no code, no names, no text copied. Donor names for the storm and its zone ("Unnatural Storm", the expanse's name) are not used. Our version keeps the trait "a storm that will not leave while it is being fought" and changes the rest: a rain front with a lightning cue instead of cloud bodies; our own zone and line text; our own numbers. The data fields above carry our values, not the donor's.

## 7. Gaps

- Not read: `BuffMerchantEvent.cs` (1461 lines; grep only), `GuildEvents.cs` (grep only), `WeatherManager.cs`, the `APlayerVicinityBrain` base class (so whether the controller runs with nobody near is not known), `SimpleScheduler.cs` 241-333, `ZoneBonusRotator.cs` 460-600 and 614-650 and 664-704, the adaptive epic difficulty branch, Myrddraxis beyond the head logic.
- Half read: server only. Client half not in the box. Seed data (`OpenDAoC-Database`, `Zones.xml`) not opened.
- Ambient and idle vocabulary: the storm's flash pulse is the only idle-style effect read. Death and respawn presentation: the storm's death line (`:80`); the head respawn has no presentation in the parts read. Boss intro: not found in the parts read. Readability at 375 wide: not measured; cloud size 100 (`:20`).
- RecastDelay unit is the spell system's; not checked.
- DST handling in the rollover (local clock, `:91`) not tested.

Best transferable idea: a nightly storm that starts and ends with one zone line and refuses to leave while a fight is on.

Decision: adapt (idea). Defects D1-D3 are fixed in the sketch; D4 is a design call for Dom.

Reuse tag: not checked against the Frankendom repo in this pass. Check for an existing scheduler before building a second one (the rollover pattern is the one to reuse).

Brief rule served: keep the idea, fix the defect (Dom, 2026-10-10); world events are server-verified state with client presentation.

simplified: the sketch keeps the dusk start, the dawn dismiss only when idle, and one storm at a time. It drops the engine types and the spell and placement details. It fixes D1 (no second storm while one is tracked) and D2 (one night rule for both clocks). It does not model the decoy adds or the lightning.

```ts
export {};
export interface Clock { hour: number; minute: number; }
const DUSK_MIN = 18 * 60 + 30;
const DAWN_MIN = 7 * 60;
function minutesOf(c: Clock): number { return c.hour * 60 + c.minute; }
export function isNight(c: Clock): boolean { const m = minutesOf(c); return m >= DUSK_MIN || m < DAWN_MIN; }
export function isDay(c: Clock): boolean { const m = minutesOf(c); return m >= DAWN_MIN && m < 18 * 60; }
interface Storm { alive: boolean; engaged: boolean; }
export class StormController {
  private storm: Storm | null = null;
  private spawnedThisNight = false;
  tick(c: Clock): void {
    if (this.storm !== null && !this.storm.alive) this.storm = null;
    if (isDay(c)) {
      if (this.storm !== null && !this.storm.engaged) { this.storm.alive = false; this.storm = null; }
      if (this.storm === null) this.spawnedThisNight = false;
      return;
    }
    if (isNight(c) && !this.spawnedThisNight && this.storm === null) {
      this.storm = { alive: true, engaged: false };
      this.spawnedThisNight = true;
    }
  }
  onEngage(): boolean {
    if (this.storm === null || this.storm.engaged) return false;
    this.storm.engaged = true;
    return true;
  }
}
```

Typecheck: `/tmp/we005/storm_sketch.ts` on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.
