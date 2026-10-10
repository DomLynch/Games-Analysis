# ModernUO (world-events, cell WE004)

Donor: `/mnt/frankendom-donors/ModernUO` (VPS, read only) | Licence: GPL-3.0 for the code (`LICENSE` line 1 "Copyright 2019-2020 ModernUO Development Team (Kamron Batman)", GPL v3 text on line 4; `CannedEvilTimer.cs` header says GPL v3 or later). No asset licence; no content licence stated. Category: C# server engine (Champion spawn, Harrower, event scheduler).

Verdict: STRONG (order of operations and numbers read in the code). Decision: adapt (idea), with the defects below fixed in the sketch.

Checked: `Projects/UOContent/Engines/CannedEvil/ChampionSpawn.cs` (fields 32-155, constructor 170-200, kill tiers 296-310, start and stop 355-440, slice, advance and spawn 512-720, respawn and sub-level 764-860, expire 905-940, expire creatures 1150-1160, region light and proximity 1340-1425), `ChampionSpawnInfo.cs` (1-130), `CannedEvilTimer.cs` (whole file, 109 lines), `Engines/Events/EventScheduler.cs` (whole file), `Engines/Events/BaseScheduledEvent.cs` (whole file), `Engines/Events/CommonRecurrencePatterns.cs` (96-132), `Mobiles/Special/Harrower.cs` (15-50, 60-220, 230-240, 300-370, 480-620), `Engines/CannedEvil/ChampionSkullPlatform.cs` (60-100), `Engines/CannedEvil/ChampionSkullBrazier.cs` (60-120). Candidate files opened: 14. Grep for callers of `YearlyAt`: none outside its definition (`Engines/Events/EventScheduler.cs` 74); the test project only calls `ScheduleEvent`. Confidence high on the ladder, the rotation and the Harrower phases. Not read in full: `ChampionSpawnRegion` light numbers are the donor's own "guesstimate" (comment at 1379), so I did not treat them as tuned values.

Half read: server (engine code). The data half for this topic is the champion type table in code (`ChampionSpawnInfo.cs`); the JSON spawn data in `Distribution/Data/Spawns` was not used here. No client half in the box. Paired donor in the box: not searched.

## 1. What the player sees and feels

A champion altar sits in a marked spawn region. Creatures spawn around it and each kill fills a bar. Every twenty percent a white skull appears on the platform with a sound and a small burst of light, so the bar reads as a row of skulls. At the top of the bar the level rises: the altar sounds and flashes, the creature mix steps up at fixed level bands, and the region gets darker as the level climbs (the code raises the region's light value with level; in UO's scale a higher value is darker; I read the code, not the client). If nobody gets a skull before the thirty-minute window ends, the level drops by one step, so a failed attempt is visible as a step back. At the final level the champion itself walks out. The Harrower is a summoned boss: six braziers each take the matching skull, a gate opens, and the boss fights in a first form until its health runs out. It then says a line, its health refills to a much larger pool, nine tentacles rise in a ring, and every few seconds a nearby player is pulled to the boss's side. When it finally dies, gold spills over a wide square in piles that land at random times up to ten seconds apart.

## 2. Why it works, or is striking

- Readable beat at 375 wide: the skull row fills in fixed twenty-percent steps, one step per kill burst. The eye can count it.
- One signature behaviour: the failed window drops the level by one step, so a missed attempt is a visible setback rather than a silent reset.
- One signature sound or effect: a sound and a location burst for each new white skull; the altar chime for a level up.
- Could be ours at 20 to 30 percent: a step ladder with a fail-down rule, a summoned boss that changes phase at death, a gold spill with random pile timing.

## 3. The rule behind it

Order of operations (ChampionSpawn.cs):

1. Start (355-370): roll the maximum level as 16 plus a random 0 to 2 (363); start a one-second slice timer (366); set the expiry clock (380).
2. Kill target by level band (298-308): 256 kills for the first band, 128 from level four, 64 from level eight, 32 from twelve, 16 from sixteen.
3. Slice (512 onward): each slice counts the dead creatures as kills, awards credit, and computes the percentage of target reached. At 99 percent or more it advances (657-659). Below 99 percent it places floor(percent / 20) white skulls (the skull steps).
4. Advance (674-688): if the level is below the rolled maximum, reset kills, raise the level, clear the skulls and reset the expiry clock (676). At the maximum, spawn the champion.
5. Expire (905-940): reset kills; if no white skull was placed, drop one level (stop at zero when not always-active); otherwise clear the skulls and hold. The expiry clock is then reset (937). The comment at 918 reads "They didn't even get 20%, go back a level".
6. Respawn (764-800): fill to a cap of 250 minus 40 per sub-level, with a minion pair chosen by sub-level (845-853); try 20 random spots in the spawn area (828).
7. Stop: a 6-hour cooldown before proximity can start it again (415); idle creatures are deleted ten minutes after stop if the spawn is neither active nor ready (418, 1152).
8. Daily rotation (`CannedEvilTimer.cs`): once a minute, if the day has rolled over, the timer picks one random idle spawn per group and marks it ready (94-105). The queue admits idle or zero-level spawns (83). The code says the count "Needs configuration" (27).
9. Proximity start (region enter, 1413-1421): fifteen unique addresses inside the region trigger a broadcast line (153) and a five-minute restart.
10. Harrower (summon and phases): the summon needs all six braziers validated (`ChampionSkullPlatform.cs` 89; `ChampionSkullBrazier.cs` 78 refuses when one is alive). One Harrower at a time (105). Health is 30000 in the first form and 65000 after morph (114). Death is intercepted in the first form (305) and calls `Morph` (145-180): the true form line (164), nine tentacles in a ring of nine angles (34-50, 207), each placed by searching outward from radius ten (179).
11. Teleport-pull (`Harrower.cs` 507-600): every five seconds (507), a 25 percent roll (528), the first matching player in range (534) is moved onto one of the eight neighbouring tiles of the boss when one is free, otherwise onto the boss's own tile; both turn to face each other and the boss takes the player as its combatant (598).
12. True-form death (305-370): award titles to players with rights (317), give power scrolls (323), spread gold over a square of radius sixteen, each pile on its own timer of up to ten seconds (329-337, 608), kill the tentacles (357), remove the gate (362).
13. Scheduler (`EventScheduler.cs`): a one-second timer on a priority queue of next-occurrence times (143); each event reschedules itself after it runs (`BaseScheduledEvent.cs` 63). The monthly pattern requires the same day number (`CommonRecurrencePatterns.cs` 123).

Data fields (designer-tunable; donor values not copied because the code is GPL-3.0 and the content source is not stated):

| name | unit | donor_value_or_null |
|---|---|---|
| champion.kill_tiers | kills by level band | null |
| champion.skull_step_pct | percent | null |
| champion.advance_pct | percent | null |
| champion.max_level_roll | levels, range | null |
| champion.expire_min | minutes | null |
| champion.restart_min | minutes | null |
| champion.spawn_cap_base, champion.cap_drop_per_sublevel | creatures | null |
| champion.idle_clear_min | minutes | null |
| champion.proximity_people, champion.proximity_cooldown_h | count, hours | null |
| schedule.rotation_per_day | count per group | null |
| harrower.hp_phase1, harrower.hp_phase2 | HP | null |
| harrower.tentacles, harrower.tentacle_ring_radius | count, tiles | null |
| harrower.pull_period_s, harrower.pull_chance_pct, harrower.pull_range_tiles | seconds, percent, tiles | null |
| harrower.gold_spill_radius, harrower.gold_pile_delay_max_s | tiles, seconds | null |

Counts (read directly): 9 active champion types in `ChampionSpawnInfo.cs` (rows 43-102), with 4 rows commented out (109-130); 15 Harrower spawn locations (`Harrower.cs` m_Entries); 9 tentacle angles (34-47); 19 files in `Engines/CannedEvil` (find count).

## 4. For Frankendom

- 700 zones as data: each zone holds a champion or boss row (kill tier list, skull step, expiry, spawn cap, rotation group). The ladder is a zone data row, not code.
- 100 Pit characters reused across zones: a champion row names a minion pair and a boss character id; the same characters serve many zones with different tiers. This matches the donor's sub-level minion pairs.
- Many-vs-one: the donor's cap of 250 creatures is far above what reads at 375 wide and above our three-attacker rule. Keep the ladder and the skull steps; cap the spawn at a small number of attackers (three) in the fight, and let the ladder count kills, not creatures.
- Server-verified: the kill count, the skull steps, the level, the expiry clock and the daily pick are all server state; the client plays the skull burst, the chime and the darkening.
- Keep: the twenty-percent skull row; the fail-down step; the summon that needs every brazier; the phase flip at death; the gold spill with random pile delays; one boss at a time.
- Change: the proximity gate counts unique IP addresses (1413). Use session counts instead; IP addresses are personal data and the donor's rule is not needed. The teleport-pull takes the first player in range (534), not the nearest; change to the nearest and telegraph the pull (one-second warning), so it is never a silent yank. The daily pick uses a plain random roll; in our ledger it needs a recorded seed (seed discipline).

## 5. A five-minute look test, and where it lands

Lands in: `origins/server/world-spawns.ts`, parity row 23 (zone population: spawn cap, respawn timer, despawn on empty with a grace timer). The Harrower phase flip is a death-and-respawn presentation: `src/fight/` death handling, parity row 17.

Look test for Dom on his phone: build two 30-second clips. Clip one: a five-step skull row filling in twenty-percent steps, one sound per step, and the region dimming one step per level, against no dimming; then an expiry that drops one step. Clip two: a boss at zero health that refills to a larger bar with a one-line "true form" caption, nine tentacles pop in a ring, and one player is pulled in with a one-second warning, against an instant pull. Dom judges which reads on 375 wide and whether the step-back feels fair.

Reuse tag: rewrite-from-idea (GPL-3.0 code: clean-room shape only; no values copied).
Brief rule served: zones as data; server-verified kills and events; client shows presentation only.

Sketch (typechecked on the VPS with `tsc --strict`, file `/tmp/we004_modernuo_champion.ts`):

simplified: the sketch keeps the donor order (kill, percentage, skull steps at 20, advance at 99, max-level spawn, expiry that drops one level only when no skull was placed, daily pick). It fixes the YearlyAt defect by using the yearly rule. It drops the spawn cap and the minion pairs, the region light, the proximity gate, the Harrower phases and the gold spill, and it takes the random rolls from the caller. The kill tiers use the donor's level-4 boundary; the sub-level boundary is still one level lower in the donor (see section 7).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Numbers are designer-tunable data fields (kill tiers, skull step, advance percent, max spawn).

export {};

export interface LadderTier { min_level: number; kills: number; }   // data field, unit kills

// Kill target per ladder level (donor MaxKills tiers: 256 / 128 / 64 / 32 / 16).
export const KILL_TIERS: LadderTier[] = [
  { min_level: 0, kills: 256 },
  { min_level: 4, kills: 128 },
  { min_level: 8, kills: 64 },
  { min_level: 12, kills: 32 },
  { min_level: 16, kills: 16 },
];

export function killsToAdvance(level: number): number {
  let target = KILL_TIERS[0].kills;
  for (const t of KILL_TIERS) if (level >= t.min_level) target = t.kills;
  return target;
}

export interface Ladder { level: number; max_level: number; kills: number; }

// One kill. A skull per 20 percent of the target; 99 percent or more advances the level.
// At max level the champion itself spawns (advanced = true, champion = true).
export function onKill(s: Ladder): { skulls: number; advanced: boolean; champion: boolean } {
  s.kills += 1;
  const pct = Math.floor((s.kills / killsToAdvance(s.level)) * 100);
  if (pct >= 99) {
    s.kills = 0;
    if (s.level < s.max_level) { s.level += 1; return { skulls: 0, advanced: true, champion: false }; }
    return { skulls: 0, advanced: true, champion: true };
  }
  return { skulls: Math.floor(pct / 20), advanced: false, champion: false };
}

// Expiry timer: no skull at all means the level drops by one; otherwise the skulls clear and the level holds.
export function onExpire(s: Ladder, whiteSkulls: number): Ladder {
  const next: Ladder = { ...s, kills: 0 };
  if (whiteSkulls === 0 && next.level > 0) next.level -= 1;
  return next;
}

// Daily rotation: one idle spawn is made ready per group per day (donor picks at random).
export function pickDailyReady<T>(idle: T[], roll: number): T | undefined {
  if (idle.length === 0) return undefined;
  return idle[Math.min(idle.length - 1, Math.floor(roll * idle.length))];
}

// Fix for the donor's YearlyAt defect: a yearly rule is "same day of month, every 12 months".
export const YEARLY_RULE = { day_of_month: -1, interval_months: 12 } as const;
```

## 6. Licence and content status

- Code: GPL-3.0 (`LICENSE`; the header in `CannedEvilTimer.cs` says "or later"). Clean-room shape only. No code or constant is copied; the sketch is written from the described order.
- Content: the champion, Harrower, skull and brazier concepts and the names belong to a commercial game's content, and the repo states no content licence. Inspiration stays category-level: "a summoned phase boss that resets at its first death", "a step ladder with a fail-down rule", "a gold spill with random pile delays". No names, lines or values are reproduced. No legal conclusion is drawn.

## 7. Gaps and defects

Defects found (keep the idea, fix the defect):

1. Yearly scheduling passes the monthly pattern. `Engines/Events/EventScheduler.cs` 74-75: `YearlyAt` calls `GetMonthlyRecurrence(startOn.Day)`, so a yearly event would repeat monthly. The correct rule exists at line 37 (`Yearly => new MonthlyRecurrencePattern(-1, 12)`). No caller outside the definition was found, so it is latent. Fix: use the yearly rule (in the sketch as `YEARLY_RULE`).
2. Tier boundary off by one level. The kill tier of 128 applies from level 4 (`ChampionSpawn.cs` 307, `>= 4`), but the sub-level function puts level 4 in the first band (`return level <= Level1 ? 0`, line 853, with `Level1 => 4` at 845). So level 4 has the second kill tier and the first minion pair. Minor. Fix: align both to one boundary, such as "level 4 starts the next band" for both.
3. Not a defect, but a design gap: the rotation count is hard-coded and marked "Needs configuration" (`CannedEvilTimer.cs` 27). Fix: make it a zone data field.

Gaps:

- Not read: `ChampionSpawnRegion` light numbers are the donor's own guesstimate (1379 comment); the `Level` setter's skull placement at Level 16 cap; `ChampionTitleSystem`, `GenChamps.cs` (placement of spawns at world start); `DungeonChampionSpawn.cs` and `LLChampionSpawn.cs` beyond the rotation hook; the Harrower's ring placement math (offsets are cosine and sine of nine angles, not checked against the grid); the shared gold-pile code; `Projects/Server` and the spawner persistence.
- Half read: server engine only. Data half (champion table in code, the JSON spawn files) not used. No client half in the box.
- Frankendom has no champion ladder yet; adding it needs a Lead call on whether the ladder belongs in zone data or the boss table.
- Best transferable idea: a boss becomes a step ladder of visible skull steps that fail one step down on a missed window, and a summoned boss flips to a larger second bar at death instead of dying.

## Receipts

Receipts are in `/private/tmp/p2/wave2-haiku/batch3/WE004/receipts.tsv` under note `modernuo`. The verifier reports all 99 rows ok across both notes.
