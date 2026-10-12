# Gap check WE (world events: scheduled and ambient events, invasions, roaming bosses, event clocks)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 20 (WE001 to WE010, two donors each), grouped by theme below.

## Summary for Dom
1. Frankendom has the rules and the data for world events but no scheduler and no banner. The boss machine is built (origins/boss/boss.ts), the rift scheduler is a data row (origins/region1/content.ts:299) with no code that rolls it, and the world clock is a spec (living-world.md section 10.3) that nothing runs yet.
2. Counts (20 table rows): REUSE 1, REUSE plus a small add 2, ADD 14, SKIP 3. The 20 notes fold into 5 builds (G1 to G5 below).
3. Biggest finding: the donors mostly show what NOT to do. Several fire a broadcast every poll, leak a lock, or announce nothing. Our spec already says warn 10 minutes ahead; the donor lesson is "fire once, keyed by event id, end time sent by the server".
4. Top 3 additions: (a) G1 one event ledger row per event, fire-once and server end-time, drives the banner and the countdown; (b) G2 the world clock as one pure function (day, dusk, night, moon) plus calendar windows computed on ask; (c) G3 zone event flag that gates a spawn row and an NPC talk line together.
5. Licence note: only 2004Scape, L2DN, Evennia and Daggerfall Unity code are MIT or BSD. EQEmu, ACE, TrinityCore, AAEmu (conflicting), AzerothCore, CMaNGOS, ModernUO, rAthena, OpenDAoC, 2003scape, Core3, l1j, Veloren and OpenMW are copyleft; the SWG client has no licence file; Cataclysm is CC BY-SA. This file carries shapes only, no donor numbers. Every number comes from living-world.md section 8 and 10.3 or our own tests.

## What we have today (shared by all rows)
- World boss machine: origins/boss/boss.ts. Stages dormant, gathering, boss, defeated (line 41); actions wake, foe-killed, damage, abandon, reset (53-58); cases at 79, 90, 93, 99. Reset is refused until `restartSeconds` after the defeat (93-96). Time is the server's `at`, never a clock (header, line 8-9). Key per kill `<hash>:<defeat #>:<pc>` makes a retried settlement a no-op (header).
- Rift records: kind rift-scheduler with perDayMin/Max, minGapSeconds, warnSeconds 600, openSeconds 1800, siteCooldownSeconds, lootRollsPerWeek (origins/region1/content.ts:299-301), parsed at origins/region1/load.ts:347. The rift boss and guardian rows are at content.ts:109-111 (Lambton worm; rift spawn). I found no function that rolls the day's rifts (grep for rollRifts: none).
- Zone data: spawns.respawnSeconds and a boss anchor (origins/world/schema.ts:76-78); ambience preset, weather, sound and dayNightSpeed, "look and sound only, never rules" (schema.ts:80-86). Seeded zone generator (origins/world/generate.ts:1-4).
- Many-vs-one director: origins/crowd/crowd.ts:1-6 (one token, the rest circle and wait). Its pack cap is a preview number (maxEnemies in CROWD), not the 3-attacker rule.
- Hunters and alerts: origins/feuds/feuds.ts:44-48 (notoriety decay 100 a day, HUNTED band), ALERT_SPREAD_PERMILLE at :76.
- Look presets by zone: origins/preview/look.ts:32 (frontier-night); the page announces the zone with an `origins:zone` event (origins/preview/main.ts:289-294). Fight-time night effect only: src/nightfall-fx.ts and src/nightfall-timing.ts (a boss special, not a world clock). Weather particle kinds: src/arena-themes.ts:20.
- Spec only (no code found): world clock `worldTimeAt` (living-world.md section 10.3; only a type comment at origins/patrons/patrons.ts:297), rift scheduler and banner (section 8.1-8.2), seasons of 13 weeks (section 9), war goals declared 24 h ahead (section 4.4), history book (section 6).

## Gap table
| Donor note(s) | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| EQEmu | Scheduler polls; broadcast, reload, hot-zone window types | boss `at` seconds only; no scheduler | Nothing ticks events. Donor trap: a window with no end repeats each poll | ADD (G1), keep strict "missed = skipped" | New file origins/events/schedule.ts (does not exist); presence tick is origins/presence/ticks.ts (stats only) |
| EQEmu | Hot zone raises kill XP while flagged | no XP events | Rules-changing event | SKIP: no ruling allows an XP event; ambience never sets rules (schema.ts:80) | n/a |
| EQEmu, ACE | Counter or flag flips: spawn and NPC line | spawn rows (schema.ts:76-78); talk conditions (origins/talk/talk.ts:85) read character flags only | No zone-level flag that both a spawn row and a talk line read | ADD (G3) | origins/world/schema.ts new `events` group; condition kind in origins/contracts/story.ts (I did not open it) |
| ACE | Lazy window check on ask, no timer per event | none | Cheap rule to carry: compute "is it live" on demand | ADD (G1) | G1 |
| TrinityCore, cmangos, Veloren (calendar) | Holiday windows computed by date, not typed | season spec only (living-world.md section 9) | No calendar function | ADD (G2) | new origins/events/clock.ts |
| TrinityCore | Hourly burst of sparks and cheers | no ambient burst system | Presentation: one timed burst list per zone event | ADD small (G1 presentation row) | origins/preview/main.ts after the banner exists |
| SWG client | Server absolute time, client extrapolates, re-anchor | dayNightSpeed field (schema.ts:86) only | No server clock value sent; no sky follows it | ADD (G2) | G2; sky stays client-only, events decided on server |
| Daggerfall Unity | Enemy type chosen by place and time of day | zone creature rows are fixed per zone | No dusk/night variant table | ADD later (G2 add-on: night variant row per zone) | origins/world/schema.ts density/spawns |
| OpenMW | One respawn stamp per zone decides the whole zone | respawnSeconds per zone (schema.ts:76-78) | Server keeps no per-zone last-respawn stamp | REUSE the field; add the stamp (G3) | origins/server/store.ts (not opened) |
| ModernUO, OpenDAoC | Kill bar to boss to stop; storm won't leave mid-fight | boss.ts stages (:41), reset after cooldown (:93-96) | Machine exists; no "do not dismiss while fighting" rule, no failed-window step-down | REUSE the machine; ADD the dismiss rule (G4) | origins/boss/boss.ts abandon case :90 (caller rule) |
| rAthena | Tomb names the killer and time after a pause | defeat emits kills and loot only | No record of who/when | ADD (G5, ties to history book) | history book (living-world.md section 6), new file |
| rAthena, l1j, L2DN | Boss clock everyone can read; weekly slot | `since` and restartSeconds exist in state (boss.ts:48) | Not shown to players | ADD (G1 display) | G1 |
| l1j | Hourly random aura, then bosses beside a random player | rift sites at random, 60 m from towns (spec 8.1) | Placement is by site rows, not near a player | SKIP the near-player placement (griefing risk, spec 8.4 says site and time are random) | n/a |
| AzerothCore | Siege: sky turns, camps with bars, herald | rift spec has guardians; no camp nodes | No multi-node zone event | ADD later (G3 extension) | G3 |
| 2004Scape, 2003scape | Four-beat escalation clock; server owns number | none | Send end time, not a counting value | ADD (G1) | G1 |
| Evennia | Silence timer closes a branch; warn first | none | Donor has no warning; ours must have one | ADD warning rule (G1) | G1 |
| Core3, Veloren | Patrol calls backup squad of at most three | crowd.ts director | Squad cap 3 matches our rule; trigger missing | REUSE crowd.ts, ADD trigger (G4) | origins/crowd/crowd.ts |
| Cataclysm | Noise pulls groups; hunter always knows you | feuds hunters (feuds.ts:48 HUNTED) | No noise pull; hunter escalation per death | ADD small (G4), cap per-kill reduction | origins/feuds/feuds.ts |
| L2DN | Kill roll swaps the corpse for an ambush | none | Per-kill ambush row | ADD (G4) | origins/mobs (kits.ts, not opened) |
| AAEmu, L2DN (score) | Queue battlefield; shared event score | war goals spec (living-world.md section 4.5) | Team battlefields are not in the duel product | SKIP queue; shared score REUSES the war-goal spec | n/a |

## Merged additions (one build each)
- G1 Event ledger and banner (EQEmu, ACE, rAthena, l1j, 2004Scape, 2003scape, Evennia, TrinityCore). One server row per event id with explicit start and end (no zero-means-now), written once so a restart cannot double-announce. The server sends an end time; the client counts down and redraws. Warn line before any timed close. A window missed is skipped, not replayed. Banner, not a chat line, at 375 wide. Lands in new origins/events/ plus origins/preview/main.ts (event hook at the `origins:zone` pattern, :293).
- G2 World clock and calendar (SWG client, cmangos, Veloren, TrinityCore, Daggerfall Unity). `worldTimeAt(serverMs)` as the spec states (living-world.md section 10.3), calendar windows computed on ask with no stored state, per-zone phase offset. Sky is client-only; spawns never depend on the sky.
- G3 Zone event flag (EQEmu, ACE, OpenMW, AzerothCore). One flag gates a spawn row and an NPC line; a per-zone respawn stamp instead of a timer per creature; one-tick debounce keyed by event id.
- G4 Pressure events inside the many-vs-one rules (ModernUO, OpenDAoC, Core3, Cataclysm, L2DN). Do not dismiss a live fight; backup squads capped at 3 attackers; noise pull is time-decayed and never shortens; reinforcement is a server event.
- G5 Boss record line (rAthena). Defeat writes a history-book line (killer, time); the player reads it, never writes free text (living-world.md line 72).

## Could not verify
- Whether origins/server/store.ts or handlers.ts holds any event state: not opened.
- The `holdsCondition` kinds in origins/contracts/story.ts: not opened; only referenced through talk.ts.
- Donor licence for AAEmu: conflicting inside the repo, treated as copyleft.
- Client banner or light-column code for rifts: none seen in origins/preview; I only grepped, did not read all preview files.
