# Gap check QU (quests, dialogue and NPC routines)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: groups QU001-003 and QD001-021; 8 donors appear in two groups and share one row, giving 58 rows.

## Summary for Dom
1. Frankendom already has the quest and talk core, built and tested but not yet in the game page: a forward-only quest journal (origins/quests/journal.ts), NPC talk lines filtered by conditions (origins/talk/talk.ts), and two server endpoints, quest_advance and talk_pick (origins/server/handlers.ts:68). Rewards are paid once, in one database batch with a version check (origins/server/story.ts:84-96). The NPC schedule is data only: the file format and its "covers the whole day" check exist (origins/contracts/world.ts:114-175), but nothing reads a schedule at run time.
2. Counts: REUSE 14, ADD 22 (8 of those also reuse something we have), SKIP 22 (58 rows). Most donor quest ideas are things we already do (one writer, once-only rewards, step pointer, condition list).
3. Real holes: (a) no objectives or counters (kill 5, bring 3) and no quest timers; (b) no NPC schedule or idle-route runtime; (c) no bark or rumour picker; (d) quest flags are never written (origins/quests/README.md "Not done"); (e) loot and faction rewards are refused with 501 (origins/server/story.ts:78-83), and the server never feeds "encounter cleared" or faction standing into conditions (origins/server/story.ts:68-75), so those condition kinds are always false today; (f) no talk screen.
4. Top 3 additions: G1 objectives and timers on quest stages, fed only by server-verified kills; G3 NPC schedule lookup and idle route from the world clock; G6 finish the reward claim (loot and standing writes, bag-full veto before any write, wire the cleared and standing facts). G2 daily board, G4 barks, G5 flag writer and G7 talk screen follow.
5. Licence note: most quest donors are copyleft (GPL, CC-BY-SA for Cataclysm, MPL for Unciv, Sustainable Use for both Fallout ports, restricted for jynew). Shape and ideas only; this file carries no donor numbers. MIT/BSD/Apache donors (OpenGothic, Daggerfall Unity, Yarn Spinner, inkjs, LostCity, 2004Scape, TESArena, L2Dn, evennia, openbor, Funkin, L2Solo, Microverse, claudecraft, otclient) could be adapted but no row needs it.

## What we have today (shared by all rows)
- Quest journal: origins/quests/journal.ts. `advance` (line 40-60): starts only at the start stage behind the career gate; moves only along a transition whose conditions hold; finished and failed are final (status check, line 55); asking for the current stage is a no-op replay (line 54). Pays stage rewards once ever and returns a progression event.
- Quest data: origins/contracts/story.ts. Stages with kind progress/finish/fail, transitions with conditions (line 23-31), `QuestState.rewarded` per stage (line 269), one condition evaluator `holdsCondition` (line 122-137) used by quests and talk. No objective, counter, timer, deadline, repeat or chain field.
- Talk: origins/talk/talk.ts. Lines have text, reply, priority, once, when, effects; sorted by priority with stable ties (line 80); once-lines hidden after being said, keyed by NPC and line (line 83-84, 105); effects quest, set-flag, end.
- Server: origins/server/quest-advance.ts and talk-pick.ts. The client names only quest/stage/choice or npc/line; the server rebuilds the journal from its own snapshot and commits quest row, once-lock event, CP award and career row in one batch with `expected_version` (origins/server/story.ts:84-105).
- Server-verified kill: origins/server/encounter-verify.ts:76-78 returns won only when the replayed fight ends in a kill. Nothing yet turns that into quest progress.
- NPC schedule: `Routine` type and the whole-day validator (origins/contracts/world.ts:114, 145-175, test at origins/contracts/world.test.ts:128). One world clock is ruled in docs/specs/origins/one-shard.md section 1 (NPCs deterministic from the clock); no code consumes it.
- Creature wander and leash are mob-row data (origins/mobs/row.ts:17-19), for hostile camps, not townsfolk.
- Specs already written from donors: docs/specs/origins/{openmw-quest-journal,modernuo-quests,openmw-dialogue-conditions,gothic-dialogue,gothic-routines}.md.
- Nothing for: objectives, timers, daily board, barks, rumours, flag writes, talk UI (origins/talk/README.md "Not done"), `src/` imports none of this.

## Gap table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| QU001 openmw | Journal lines appended once, quest forward-only | journal.ts:40-60, README "Where the rules came from" | Duplicate-index and restart-by-name defects already avoided | REUSE | origins/quests/journal.ts |
| QU001+QD005 OpenGothic | Topics: condition, told-once, priority tier; daily routine windows | talk.ts:80-84 (priority, once); Routine data world.ts:114 | Important/auto tier not taken; routine lookup unbuilt (G3) | REUSE talk; ADD routine (G3) | new origins/world/routine.ts |
| QU001+QD011 Daggerfall Unity | Rumour pool with expiry; quest timers and task triggers | Nothing | Rumours (G4); timers (G1) | ADD | G4 / G1 |
| QU002+QD007 Yarn Spinner | Parked VM; least-viewed, most-specific line variant | talk.ts is stateless pick; no variants | VM not needed (server picks, client answers); variant pick fits barks | SKIP VM; ADD pick (G4) | G4 |
| QU002+QD013 evennia | Quest = step machine; no advance after end | journal.ts:55 final states | Cleanup of counters only matters once G1 exists | REUSE | journal.ts |
| QU002+QD015 inkjs | Option hidden once read; seeded shuffle; fallback | talk.ts:84 hides once-lines | Seeded per-character stream for barks; auto-fallback not needed | REUSE once; ADD seed rule to G4 | G4 |
| QU003+QD004 LostCity | NPC idle route with dwell and leash | Mob leash/roam only (mobs/row.ts:17-19) | No townsfolk route runtime | ADD (G3) | new origins/world/routine.ts |
| QU003+QD004 ModernUO | Instance, objective list, two-phase claim | journal.ts, atomic batch story.ts:84-105; no objectives, claim has no bag veto | Objectives (G1); claim veto (G6) | ADD | G1, G6 |
| QU003+QD010 AzerothCore | Counters capped at need; timed quest; giver marker | Nothing | Counters, timer, fails-on-death flag (G1); giver marker is a derived view | ADD | G1 |
| QD001 0ad | Ordered steps, each listens to own events | Stages and transitions journal.ts:56-60 | Event-listening objectives = G1 | REUSE stages; ADD events (G1) | G1 |
| QD001 2004Scape | One stage number per quest, recount totals | QuestState.stage, rewarded | Same shape | REUSE | journal.ts |
| QD001 Card Forge | Typed objective stages, two-pass update | Nothing typed | Objective kinds (kill, collect, visit) | ADD (G1) | G1 |
| QD002 Cataclysm | Goal kind, deadline, pay on report-back | Report-back = talk line effect (talk.ts effects) | Deadline missing | REUSE report-back; ADD deadline (G1) | G1 |
| QD002 OpenBOR | Dialogue overlay holds other timers | Server stateless, no overlay | UI only; server world does not pause | SKIP (world is server-run); page UI in G7 | G7 |
| QD002 DOLSharp | Step pointer, checks before any write | journal.ts, questBatch refuses before writing (story.ts:78-83) | Bag/XP check for loot (G6) | REUSE | story.ts |
| QD003 EQEmu | Gate objectives by step, once-only task reward | Transition conditions, `rewarded` | Parallel open objectives = G1 | REUSE once-pay; ADD parallel (G1) | G1 |
| QD003 Funkin | First press finishes typing, second advances | Not built | Talk screen: tap-safe line reveal | ADD (G7) | new src/ file (UI) |
| QD003 Microverse | Daily board dropped, sorted, topped up | Nothing | Repeatable offers | ADD (G2) | new origins/quests/board.ts |
| QD004 ModernUO | Claim: every objective can veto, write all or none | One batch with expected_version (story.ts:93-94) | Veto on loot placement | ADD veto (G6) | story.ts |
| QD005 OpenDiablo2 | Done-but-reveal-owed state | Journal text appended on reach | Client animation only | SKIP (reveal is UI, server owns state) | n/a |
| QD005 OpenRA | One writer, idempotent complete/fail | journal.ts:54 replay; quest_advance is the only writer | Same | REUSE | journal.ts |
| QD006 OpenRCT2 | Outcome in one field, settled once | status + rewarded once | Same | REUSE | journal.ts |
| QD006 OpenTTD | Parked question keyed by id, one answer | talk_pick is one request/response | No parked state needed | SKIP | n/a |
| QD006 OpenXcom | Finish = no waves left; kill delays next wave | Nothing for waves | Wave missions are encounter work | SKIP | n/a |
| QD008 TESArena | Met-bit gates first greeting line bank | `once` line + talk flag (talk.ts:83-84) | Same effect with data | REUSE | talk.ts |
| QD008 Fallout 1 | Dialogue node = function; empty ends talk | Lines + `end` effect | Code-style nodes not wanted | SKIP | n/a |
| QD008 Fallout 2 | Notify from the one ledger write | quest_advance returns stage/status/cp (quest-advance.ts:26) | Client toast only | SKIP (UI reads reply) | n/a |
| QD009 Angband | Kill-count quest row opens a gate | Nothing | Kill objective (G1); gate = encounter-cleared fact unwired | ADD | G1, G6 |
| QD009 L2Dn | Forward jump leaves gaps; rollback clears | Forward-only, final (journal.ts:55) | Conflicts with the append-only ruling | SKIP | n/a |
| QD010 Beyond All Reason | Zone script by id; defend fails on tagged death | Nothing | Zones are data rows, not scripts | SKIP | n/a |
| QD010 crawl | Bark by stacked context prefixes, chance per tick | Nothing | Bark rows (G4) | ADD | G4 |
| QD011 dhewm3 | Parked script, one wake condition | Server steps are request-driven | Not needed | SKIP | n/a |
| QD012 KeeperFX | Nested step latch, one-shot reward trigger | Stage rewarded once | Same | REUSE | journal.ts |
| QD012 C&C Remastered | Win waits for blockers and grace timer | Nothing | Zone outcome, not quest | SKIP | n/a |
| QD012 Endless Sky | Counters in one ledger; AND of checks | QuestState + holdsCondition | Objective counters (G1) | REUSE ledger; ADD counters (G1) | G1 |
| QD013 exult | Flag setter also writes one journal line | Flags never written (quests/README.md) | The flag writer (G5) | ADD | G5 |
| QD013 flare | One ledger and one AND-list for all | holdsCondition story.ts:122 | Same | REUSE | story.ts |
| QD014 pinball | Objective stage ladder, delayed reward | Stage ladder in story.ts | Same | SKIP | n/a |
| QD014 freeciv | Claim-once world-first achievements | Nothing | World-first fits the history book, not quests | SKIP (revisit with living-world.md) | n/a |
| QD014 freeorion | Ordered reward rows, one claim, depleted swap | Loot is take-one by ruling | Loot lane, not quests | SKIP | n/a |
| QD015 gemrb | Log keyed by text, solved group collapses | Stage-keyed journal | Conflicts with append-only | SKIP | n/a |
| QD015 hedgewars | Goal list met/not yet/impossible; non-goals lose | Nothing | All/any goals and fail goals (G1) | ADD | G1 |
| QD016 ioq3 | Highest-priority rule, then line off cooldown | Nothing | Bark rule + cooldown (G4) | ADD | G4 |
| QD016 jynew | Per-trigger step pointer in flat ledger | QuestState per quest | Same | REUSE | journal.ts |
| QD016 pokemonAutoChess | Three-slot board recomputed, not stored | Nothing | Board derived from id + completed count (G2) | ADD | G2 |
| QD017 l1j | Step number; NPC lines gated on step | talk.ts `quest-at` condition (story.ts:127) | Same | REUSE | talk.ts |
| QD017 claudecraft | Zone done when all its errands turned in | Nothing | Derived zone-complete from journal | ADD (G2) | G2 |
| QD017 lichess | Timed beat sequence, wrong move shown | Nothing | Tutorial gimmick | SKIP | n/a |
| QD018 lincity | Streak counters per criterion | Nothing | Sustain goals unneeded | SKIP | n/a |
| QD018 otclient | Client mirror, server pushes, client sends selection | Nothing client-side | Journal panel reads server rows | ADD (G7) | new src/ file |
| QD018 forgottenserver | Keyword tree cursor with backtrack | Flat choice list | Not our model | SKIP | n/a |
| QD019 L2Solo | Hand-in as one compare-and-swap transaction | Batch + expected_version (story.ts:93-94) | Same | REUSE | story.ts |
| QD019 vcmi | Next quest offered after reward finishes | Eligibility by `quest-at` (talk.ts conditions) | Same | REUSE | talk.ts |
| QD019 Veloren | Reward escrow at offer, settle once | Nothing | Player-posted bounties belong to trading lane | SKIP | n/a |
| QD020 wesnoth | Boss last-breath wins when minions gone | Nothing | Encounter work | SKIP | n/a |
| QD020 widelands | Quest steps as polled gates on game time | Request-driven | Polling not needed | SKIP | n/a |
| QD020 xu4 | Stage ladder, three misses, reward buckets | Nothing | Not our shape | SKIP | n/a |
| QD021 Unciv | Records per assignee; remove first, then credit | rewarded once-lock (story.ts:84-96) | Same | REUSE | story.ts |

## Merged additions (one build each)
- G1 Objectives and timers on quest stages. Notes: ModernUO, AzerothCore, Card Forge, Cataclysm, EQEmu, Angband, hedgewars, Endless Sky, Daggerfall timers, 0ad. Rules to carry: a stage lists typed objectives (kill, collect, visit) with a mode (all or any); one credit writer on the server, fed only by server-verified results (origins/server/encounter-verify.ts:76-78), never by a client message; counts capped at the need and stop counting once done; deadline on the one server clock, survives restart; optional fails-on-death flag per stage; chain walks carry a visited set; seeded stream for any random pick. Lands in origins/contracts/story.ts (new Stage fields) plus journal.ts.
- G2 Daily board and derived views. Notes: Microverse, pokemonAutoChess, claudecraft. Rules: board recomputed from character id and completed count, not stored; drop done, top up; zone-complete is a view over the journal, never counted when a zone has no errands. New origins/quests/board.ts.
- G3 NPC routine runtime. Notes: OpenGothic, LostCity, Daggerfall Unity (open hours). Rules: pure `routineAt(character, minuteOfDay)` over the existing Routine rows; one world clock from one-shard.md section 1; entry window lookup, not a stored position; idle route as data (ordered points, dwell, leash to spawn) on a seeded per-NPC stream; reject an empty or start-equals-end row at load (world.ts:152 already does). New origins/world/routine.ts.
- G4 Bark and rumour picker. Notes: crawl, ioq3, Yarn, inkjs, Daggerfall rumours. Rules: rows are data with conditions; highest priority wins, then least recently shown, then a seeded pick; per-line cooldown in seconds as a data field; a rumour with no expiry lives until its quest ends; the server picks, the client only shows. New origins/talk/barks.ts.
- G5 Quest flag writer. Note: exult. Rules: one server setter, set once, appends one journal line; talk set-flag and quest flags use the same ledger (today they are separate: quests/README.md). Extend origins/server/story.ts.
- G6 Finish the reward claim. Notes: ModernUO, DOLSharp, EQEmu. Rules: loot and faction standing writes (refused 501 today, story.ts:78-83); check bag space before any write, all or nothing; feed `cleared` and `standingWith` into factsOf (story.ts:68-75) so those conditions can be true; loot stays take-one.
- G7 Talk and journal screen. Notes: Funkin, otclient, OpenBOR. Rules: first tap completes the line, second advances; panel reads server rows, sends only a line pick; no client-held completion. New file under src/.

## Could not verify
- Whether src/ shows any quest or talk screen: grep of src/main.ts found only an unrelated `journal` dialog element (src/main.ts:115, gear window); not opened further.
- Contents of encounter-verify.ts beyond lines 55-78; whether a kill-credit hook is planned elsewhere.
- Donor notes QD007 SCAR and ZenKit have verdict files only, no note; QD008 TESArena/Fallout and several QD notes carry no "Lands in" section, so targets above are my nearest-real-file picks.
- Licence of Microverse, Unciv and claudecraft taken from the note text, not re-checked in the donor repos.
