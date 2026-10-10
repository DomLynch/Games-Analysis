# TurningWheel-Barony (encounter-templates, EN004)

Donor: /mnt/frankendom-donors/TurningWheel-Barony (VPS, read-only)
Licence: BSD 2-Clause for the code (LICENSE.txt line 3, copyright line 5, Turning Wheel LLC). Game art, sound and level data are not in the box.
Halves: one codebase. Server-authority branches (guarded by `multiplayer != CLIENT`) and client message/sound calls sit in the same files. I read the server-side placement and encounter logic and the client message/sound calls next to it. The level data pack is NOT in the box, so no map layouts and no per-level counts were read. No paired donor exists in the box.
Depth: full for the encounter logic I read (placement, trap, pursuit, summon trap, sleep, mimic, formation). Thin for level data.

## 1. What the player sees and feels

On a 375-wide phone the level starts quiet. Traps announce themselves by sound before anything is seen: "You hear a trap trigger in the distance." and a nearer tier for close triggers (lang/en.txt lines 3870-3871). On some levels a pursuit clock runs that the player cannot see. At 30 seconds before arrival, a one-in-five roll decides whether a group of nine "ZAP Brigade" humans appears at the level's start point with a warning sound (maps.cpp and monster_minotaur.cpp, see section 3). If it appears, a hint says so. At arrival a heavy hint line ("BEWARE!" / "The Minotaur has arrived!") and a sound fire together, the boss appears at the level's start point (where the player began; it is behind the player only if they have walked on), and three seconds later a second line and a sting close the beat.

Sleepers are the idle vocabulary. A gnome has a one-in-eight chance to spawn asleep for about 36 to 72 seconds; an imp a one-in-four chance, asleep for about 36 to 108 seconds (units assumed to be ticks, see gaps). Bats spawn in a resting state. A mimic spawns as an inert object and only comes alive when touched, then paths to the touching player.

Where the donor has the rest: death and respawn are not presented in code I read (a design note about a "kill zone" exists, ideas only). Loot reveal is outside this topic. Walk density: each level places traps (count below) and forced monsters from header bytes. Actual counts per level sit in the level data, which is not in the box. Readability at 375 wide: not read (HUD and camera are client-only and not in this topic).

## 2. Why it works, or why it is striking

- Readable beat: the pursuit has one visible tell (the warning) and a fixed lead time (30 s). The player gets a planning window instead of a surprise. Silhouette: a large boss that enters from the start point. Signature behaviour: it comes from behind, then paths to the player. Signature sounds: a warning sound at the warning, a different arrival sound, and a deeper-level sting.
- First-time moment: the mimic logs its first awakening once (monster_mimic.cpp line 1104-1106, achievement-style event). A small "first time" beat, cheap to copy.
- Two-tier distance text for trap triggers: a far line and a near line. The sound is the same event at two volumes; the text tells the player where to look.
- Could be made ours at 20-30 percent resemblance: yes. Keep the timer, the warning, the start-point arrival and the single sting. Change the group size (nine is too many for our cap), the boss shape, the names and the sounds.

## 3. The rule behind it

Order of operations on a minotaur level (monster_minotaur.cpp, actMinotaurTimer, lines 688-822; tick = 50 per second, input.cpp line 5):

1. A timer entity is created on the player-start entity when the first player is placed on a minotaur level (maps.cpp lines 7198-7200; the start-entity placement itself was not read).
2. Each tick the timer counts up (MINOTAURTIMER_LIFE).
3. At arrival minus 30 s (line 694), a one-tick roll `rng % 5 == 0` (line 695) decides a warning. If it hits, nine humans are summoned at the timer position (line 699). The code intends the first to lead the rest, but the leader variable is declared inside the loop (line 701), so it is 0 on every pass and each human becomes its own leader; the follower branch (lines 712-714) never runs. As written this is nine unlinked humans. A warning sound plays (line 722) and a hint is sent to each player (lang/en.txt lines 1601-1606 hold the hint titles).
4. At arrival time (line 737) the minotaur is summoned once at the timer position, a sound plays for each player and an arrival hint line is sent. The active tick is latched (line 764).
5. Three seconds after the active tick (line 768) the second line plays and the timer removes itself (line 819).
6. Arrival time is 150 seconds, or 210 seconds on levels below 5, from 10 to 14 and from 25 up (monster_minotaur.cpp lines 680-683).

Minotaur levels: a level flag is rolled at 50 percent on certain depth positions (maps.cpp lines 1327-1331: depth below 25 with region position 2 or 3; deeper with 2 or 4). The region length constant was not read. The block headed by the comment "daedalus shrine" (line 3959) runs for the second placement on minotaur levels. It picks a spot in a quadrant opposite the exit (line 3969 comment "generate in different quadrant than exit") and places a ladder-class entity there (newEntity 11 with the ladder behaviour, line 4090). The comment says shrine; the code places a ladder. Recorded as a mismatch.

Level population (maps.cpp, placement block lines 3870-3892 and 4535-4568):
- Candidate cells: 30 plus rand(0..9) by default (line 3884). If the header sets an entity range, the count is min plus rand over the range, with the minimum forced to at least 2 (lines 3875-3879).
- Forced monsters: when the header sets monster bytes, forced = min plus rand over the range (line 3892). Forced monsters are placed first, then forced loot, then decorations.
- A forced slot becomes an NPC with one-in-ten chance after depth 1 (line 4548). The NPC is a human, or past depth 15 usually an automaton (the branch just after line 4548). Human NPCs get a tier from depth: (depth / 5) * 3 plus rand(0..3) (line 4568).
- Traps: count = min(clamp(depth, 1, 5) plus rand(0..4), free cells); halved on The Mines (lines 3449-3458). Hell uses min(15, free cells) (line 3461).
- Monster type per cell comes from a biome table by map name, each a rolled case list (monsterCurve, maps.cpp line 291). The list is code, not data.

Summon trap (actsummontrap.cpp, actSummonTrap, lines 44-277):
- Trigger: a player or ally within a radius and in line of sight (line 44 and the line trace). Or a signal (skill 28).
- Cadence: on first trigger, fires at once (line 82 sets the next fire to interval times 50 ticks).
- Per cycle: `count` monsters at the trap (line 144). Monster type is fixed (skill 0 above zero), scaled to depth by monsterCurve (skill 0), or re-rolled each cycle from a pool that skips a set of types (skill -1).
- Each spawn is set to path to the trigger (line 195), gets the miniboss flag off (line 186), and is told not to sleep.
- Failure: a percent roll breaks the trap (line 247). Cycles count down and the trap ends at zero.

Sleep on spawn (gnome line 213-216; imp lines 62-65): one-in-N chance unless the spawn has the no-sleep attribute, asleep for a fixed base plus random tick count.

Formation (actmonster.cpp updateFormation, lines 1045-1135; monster.hpp lines 1409-1427):
- The leader's formation is recomputed at most once per second (line 1054).
- Follower slots form a wedge behind the leader: first two side slots at row 0, then rows behind with three slots on even rows and two on odd rows. Offsets are as written (units not checked).
- A monster with a leader calls the formation update each second on its own tick (line 4869 call). The monster-update branch inserts it into the leader's melee list (line 1064). Ranged units are only added on the player-leader path.

Data fields (designer-tunable; donor values are allowed because the code is BSD):

| name | unit | donor value |
|---|---|---|
| pursuit_arrive_s | s | 150 (210 on listed levels) |
| pursuit_warn_lead_s | s | 30 |
| pursuit_warn_1_in | roll | 5 |
| pursuit_warn_group | count | 9 |
| pursuit_tail_s | s | 3 |
| tick_rate | ticks/s | 50 |
| summon_interval_s | s | designer (skill 2) |
| summon_count | count | designer (skill 1) |
| summon_cycles | count | designer (skill 3) |
| summon_fail_pct | % | designer (skill 5) |
| gnome_sleep_1_in | roll | 8 |
| gnome_sleep_ticks | ticks | 1800 + rand(0..1799) |
| imp_sleep_1_in | roll | 4 |
| imp_sleep_ticks | ticks | 1800 + rand(0..3599) |
| trap_base_depth_cap | depth | 5 |
| trap_jitter | count | rand(0..4) |
| level_candidate_base | cells | 30 + rand(0..9) |
| npc_forced_1_in | roll | 10 (depth above 1) |
| formation_update_s | s | 1 |

## 4. For Frankendom

Shape mapping:
- 700 zones as data: a zone carries its encounter templates as rows, a pursuit (clock, warning roll, arrival point = zone entrance), a summon trap (interval, count, cycles, fail percent), and sleepers (roll and tick range). The server decides the clock, the roll and the spawn. The client shows the countdown, the warning sound and the banner.
- Many-vs-one (MAX_ATTACKERS = 3): nine summons break the cap. Keep the group as a warning, put at most three into attack slots, and queue the rest behind them (row 23 spawn caps).
- 100 Pit characters across zones: the human tier by depth is a scale variable on one character. The summon trap's random pool is a per-zone list of Pit characters, not the whole roster.
- Parity rows touched: 23 (zone population: spawn caps, respawn, despawn, the pursuit's group cap); 18 (server tick: fixed step, per-tick budget for the pursuit clock); 17 (death and respawn); 4 (aggro, chase, leash: the pursuit's path state); 7 (creature actor: the sleep and inert states); 12 (combat sound cues: the warning and arrival sounds).

Keep:
- The visible countdown with a one-in-N warning, the start-point arrival that comes from behind, and the single sting after arrival.
- Traps that announce themselves by sound at two distances.
- The formation wedge, which fits three attackers.

Change:
- Nine summons become three in attack slots plus a queue.
- The summon trap's random pool becomes a per-zone list.
- The monster table by map name is code (maps.cpp biome switch). Move the weights into zone data.

Defects found (keep the idea, fix the defect):
0. The brigade leader is declared inside the summon loop (monster_minotaur.cpp line 701), so every summoned human is its own leader and the follower branch never runs (lines 705-714). Decision: adapt (idea: a squad that arrives with the warning). Fix: declare the leader id before the loop, first summon sets it, the rest are linked to it, and the squad is capped to three attack slots.
1. The warning is a single-tick equality test on the timer counter (monster_minotaur.cpp line 694) with one 20 percent roll (line 695). If the tick is missed or the roll misses, there is no warning and no retry. Decision: adapt (idea). Fix: a one-second window with a latched "warned" flag, rolled once per window.
2. The sleep timer unit is assumed to be ticks. The decrement site was not read. Fix: state the unit in the data row and test the duration on a clock in the sketch.
3. Summon-trap random pool skips a fixed list of types, which is brittle when the roster grows. Fix: an explicit per-zone list.

Look test (5 minutes, on a phone, 375 wide):
Build a 150-second pursuit clock in one test zone. A small countdown ring sits at the corner. At 120 seconds a one-in-five roll decides whether three tokens appear at the zone entrance with a warning sound. At 150 seconds one creature enters from the entrance, then a second line and sting follow three seconds later. Dom compares two versions: always warn, and one-in-five warn. He judges whether the entrance arrival reads as a threat from behind and whether the warning reads as a choice or as a missed signal.

## 5. Licence and IP

- Code: BSD 2-Clause (LICENSE.txt line 3). Code may be adapted with the copyright notice kept (Turning Wheel LLC, line 5).
- Game art and sound: absent from the box. Not used.
- lang/en.txt: repo text under the BSD code licence. I quote nothing beyond short titles.
- cippie-devstuff: developer notes. README.txt line 8 says they are "NOT a guarantee" and are ideas only. The pit-tackle and kill-zone notes are idea sources, not code.
- Recreate as distinct originals: keep the mechanism (timed pursuit, one-in-N warning, arrival behind the player, single sting). Change the boss shape, the names, the sounds, the group size and the numbers. No legal conclusion is drawn.

## 6. Gaps

Not read:
- Level data pack (maps, art, sound): absent from the box. Actual per-level counts are unknown.
- Map header byte meanings beyond the four-byte layout (maps.cpp lines 3845-3868).
- The region length constant (LENGTH_OF_LEVEL_REGION).
- The player-start entity placement (the timer's host).
- EFFECTS_TIMERS decrement site (units assumed ticks).
- Gnome and imp wake conditions.
- Bat rest wake logic.
- Compendium event definitions.
- The outer loop header of the placement walk (maps.cpp around 4400-4530): the candidate visit order is not stated.
- Loot reveal, death presentation, HUD, camera.
- Half read: server logic and client calls in one codebase; data pack not in box. No paired donor.

Count check: AU053 (asset audit) says lang/en.txt has about 5,753 numbered entries. My count of lines starting with a number is 5,729 in a 7,274-line file (multi-line entries account for some of the rest). Not resolved; flagged.

Best transferable idea: a pursuit clock with a visible one-in-N warning and an arrival behind the player, capped to three attackers.
