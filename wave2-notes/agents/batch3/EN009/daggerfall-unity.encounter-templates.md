# daggerfall-unity (encounter-templates, EN009)

Donor: /mnt/frankendom-donors/daggerfall-unity (VPS, read-only). Fan reimplementation client of Daggerfall (single player, no server half). Depth: full for the encounter picker, the spawn cadence, the placement, the alert state, the quest spawn grammar and the guard response. Half read: client code (Assets/Scripts) and the quest scripts as text (Assets/StreamingAssets/Quests, 265 files). The Tables folder (Quests-Foes and the rest) was not read in this pass. Not in the box: the DOS data pack (ARENA2 files, creature sprites and sounds). Licence: code MIT, see section 6.

## 1. What the player sees and feels

Most of the time on a road or in the wilds, nothing happens. Then, at a random moment, a small group of foes appears just outside the edge of the view and walks in, so the first sight is a foe coming into frame rather than one popping up in front. The foes are chosen from a list tied to the place (dungeon type, climate, town at night) and to the player's level, so a low-level walker mostly meets the weak end of the list and a high-level one meets the top six. Resting in a dungeon after a fight is the other pressure: a rest is cut off the moment an encounter fires, and the rest is only dangerous while the enemies are still "alert". After a crime in town, the guards come out of the crowd: a guard NPC is switched off and a guard takes its place, or a citizen behind the player may turn into one (about 1 in 4 per citizen).

## 2. Why it works, is striking, and could be ours

- Readable at 375 wide: the spawn starts outside the view cone, so the group enters from the edge of the phone frame. Not verifiable here: the sprites are in the data pack, which is not in the box (not read).
- One signature behaviour: spawn outside the view, with a minimum distance and a separation from walls. The out-of-view start is the trick.
- One signature sound or effect: the guard swapping in for a guard NPC (PlayerEntity.cs line 671). The donor comment (line 658) says classic also disables the citizen, but the code disables guard NPCs only. Sound clips not read.
- Could be made ours at 20 to 30 percent resemblance: yes. The encounter picker (a level band with a fat tail), the out-of-view ring, the alert timer and the quest "every N, M times, P percent" grammar are shapes, not art.

## 3. The rule behind it

Three rules do the work. All numbers are donor values from code, shown with the place they are read from.

Rule A, the picker (RandomEncounters.cs lines 1334 to 1526). Dice100 roll r from 1 to 100.
- r 1 to 80: window [level minus 3, level plus 3]. If the low edge is below 0, the window snaps to [0, 5]. If the high edge is above 19, it snaps to [14, 19].
- r 81 to 95: window [0, level plus 1].
- r 96 to 100: window [0, 19], or [0, level plus 2] when level is 5 or less.
- Then one foe is picked uniformly from the window. The list has 20 entries (the donor comment says they run from low to high level).
The list is per place: 45 live tables of 20 entries (indices 0 to 44): dungeon types 0 to 19 (19 is underwater), 18 climate tables (indices 20 to 37: six climates, each day outside town, night outside town, night in town), and building tables 39 to 44. Index 38 is unused. An 11-entry Cemetery table is commented out (lines 580 to 599), so it is ignored.

Rule B, the cadence (PlayerEntity.cs lines 547 to 620, FormulaHelper.cs lines 1765 to 1813, WorldTime.cs line 32). A roll happens once per elapsed game minute, but only in 12 of every 144 game minutes (the test is (Minutes / 12) % 12 == 0). The world clock runs at 12 game seconds per real second (WorldTime.cs line 32). So one game minute is 5 real seconds, and a 144-minute cycle is 12 real minutes with one 60-second active window.
- Outdoors by day (game 06:00 to 18:00): roll 1 in 36.
- Outdoors by night, and in town at night: roll 1 in 24. Town by day: no roll at all.
- Dungeon: only while resting, and only while the alert is on. The roll is 1 in 36 then; otherwise it never fires (FormulaHelper.cs lines 1804 to 1813).
- A spawn ends the catch-up loop for that frame (PlayerEntity.cs line 491), so at most one spawn per update.

Rule C, the alert (EnemySenses.cs 534-535, DaggerfallUI.cs 655, EnemyDeath.cs 135-136, PlayerEntity.cs 382-383). The alert is raised while an enemy that targets the player can see him. It is cleared when the enemy that was targeting him dies. It times out after 8 game hours (480 game minutes, about 40 real minutes). The alert is the only state that turns dungeon resting into spawns.

Rule D, the placement (FoeSpawner.cs lines 122 to 197). Pick a ray from the player at the camera's view angle plus 0 to 4 degrees, on a random side (FoeSpawner.cs line 145; the same expression is written out again in CreateFoe.cs line 276). If the ray hits a wall, back off by 1.25 units divided by the cosine of the wall normal (separation), plus up to 2 units of slack, and require the hit to be at least the minimum distance away. If it does not hit, pick a point along the ray between the min and max distance. Probe down up to 4 units for a floor. Then test an empty sphere of radius 0.65 at 1.25 units above the floor point. If any test fails, try again next frame, with no cap on attempts. Minimum distances: 10 units for town and outdoor, 8 for dungeon rest (which uses a random angle and no line-of-sight check, PlayerEntity.cs line 610), a default of 5 for interior and town quest foes (CreateFoe.cs PlaceFoeFreely default), 8 to 25 for quest foes in the wild (CreateFoe.cs line 256).

Rule E, the quest grammar (CreateFoe.cs line 47 and onward; 265 quest scripts in Assets/StreamingAssets/Quests). The form is `create foe <symbol> every N minutes M times with P% success`, with an `indefinitely` form and a `send` form. Interval is N times 60 game seconds (line 77). The first spawn is phase-randomised inside the interval (line 115). Each interval one P percent roll decides (line 137); a failed roll uses up the interval but not one of the M. Only one group is in flight at a time. The `send` form stays pending until the player is inside a town rect (line 191). Counts in the quest folder: 235 `create foe ... every` lines, 10 with `every 0 minutes`, 6 `send` forms.

Rule F, the guard response (PlayerEntity.cs lines 500 to 691). Low legal standing (below -10) rolls 5 percent per game minute and calls the non-immediate path (line 500), which only spawns guards once an NPC sees the player (branch at line 691, read only in part). After a crime the immediate path runs: it takes guard NPCs within 77.5 units (line 665), switches each one off and spawns a guard in its place (line 671); it also takes a non-guard citizen at least 105.5 degrees off the player's facing with a 1 in 4 roll (lines 675 to 676); if none of that gives a guard, it spawns 2 to 5 guards in a foe spawner at 12.8 to 51.2 units (line 687). Indoors (shop, tavern, residence) a burst of 2 to 5 guards appears at the lowest outer door (line 635). A new guard spawn is allowed while the active count is 5 or fewer (line 623).

Quest-scripted encounter shapes (not code, data text):
- Ambush: M0B21Y19.txt line 232, `create foe _enemy_ every 0 minutes 4 times with 100% success` (four foes at once). A designer comment at line 235 says the spawn was sped up because it was "very slow for an ambush". A second sequence at line 247 uses every 3 minutes, five times.
- Escort: M0B00Y16.txt lines 219 to 231. The escorted NPC gets a HUD portrait (line 219), the portrait is dropped on completion (line 228), repute +15 on delivery (line 229), -10 on refusal (line 223), and a completion flag is set (line 231). Time-limited by a `_qtime_` flag.
- Lair: a place with a fixed foe, named in dialogue. The lair word appears in 15 quest files (dialogue, not structure). One quest says the monster moves on once its lair is known (R0C10Y05.txt line 65; dialogue text not quoted).
- Camp: the donor has no camp encounter. Rest is a window that is aborted by an encounter event (DaggerfallRestWindow.cs line 795).

Data fields (MIT code, so donor values may be shown; all are designer-tunable):

| name | unit | donor value |
|---|---|---|
| world_clock_scale | game s per real s | 12 (WorldTime.cs line 32) |
| roll_window_game_min | game min per cycle, active | 12 of 144 (PlayerEntity.cs line 559) |
| roll_outdoor_day | 1 in N | 36 (FormulaHelper.cs line 1784) |
| roll_outdoor_night_or_town_night | 1 in N | 24 (FormulaHelper.cs line 1771) |
| roll_dungeon_rest_alert | 1 in N | 36 (FormulaHelper.cs line 1810) |
| alert_decay | game min | 480 (PlayerEntity.cs line 382) |
| spawn_min_dist_town_outdoor | units | 10 (PlayerEntity.cs line 551) |
| spawn_min_dist_dungeon | units | 8 (PlayerEntity.cs line 550) |
| spawn_max_dist | units | 20 (FoeSpawner.cs default) |
| view_angle_jitter | degrees | 0 to 4 (FoeSpawner.cs line 145) |
| separation | units | 1.25 (FoeSpawner.cs line 122) |
| floor_probe | units | 4 (FoeSpawner.cs line 123) |
| open_space_sphere | units | 0.65 (FoeSpawner.cs) |
| level_band_half_width | levels | 3 (RandomEncounters.cs line 1500) |
| low_tail_roll_max | roll | 95 (RandomEncounters.cs line 1477) |
| low_level_tail_top | levels above player | 2 when level is 5 or less (line 1500 onward) |
| city_guard_cap | guards | 5 (PlayerEntity.cs line 623) |
| indoor_guard_burst | guards | 2 to 5 (PlayerEntity.cs line 635) |
| guard_legal_threshold | legal rep | -10 (PlayerEntity.cs line 500) |
| guard_roll | percent per game min | 5 (PlayerEntity.cs line 500) |
| citizen_pick_radius | units | 77.5 (PlayerEntity.cs line 665) |
| quest_interval | game min | N from script (CreateFoe.cs line 77) |

## 4. For Frankendom

Shape of a template: one zone data row with shape (ambush, camp, patrol, lair, escort), a member count capped at 3 (MAX_ATTACKERS), a level band (rule A), a cadence (rule B, expressed as a roll window and a 1-in-N chance tuned per zone), and a heat value (rule C).

Ownership: the cadence, caps and despawn are server-side and belong to parity row 23 (zone population), in origins/server/world-spawns.ts. The group's aggro, target choice and leash belong to row 4 (fight loop) in src/fight/ (a new module, encounter-template.ts, that calls the existing hate list). The server tick carries the cadence: server tick: fixed step, input intake, per-tick NPC budget (row 18). The client only presents: the edge-of-frame entry is a client animation of a spawn the server has already placed.

Keep: the level band 80/15/5 with the tail; the out-of-view start; the alert that decays on a timer and drops when the targeter dies; the quest grammar as zone data (N, M, P, send-on-return); the escort as a portrait and two repute outcomes; the guard that takes the place of a guard NPC in the crowd.

Change:
- Donor placement retries every frame with no cap. Our fix: cap tries at 40 (as in the Arena donor) and then skip the spawn, emitting the encounter event once.
- Donor FOV angle is Camera.fieldOfView, which Unity documents as the vertical angle (Unity API, not from the donor). On a portrait 375-wide phone the horizontal view is the narrow axis. Our fix: derive the horizontal half-angle from the aspect ratio and use that for the out-of-view ring.
- Donor duplicates the placement method (FoeSpawner.cs and CreateFoe.cs). Our fix: one placement helper.
- Donor cadence is sparse for walking: about one outdoor encounter per 30 to 40 real minutes (computed below). Our target, about one encounter per 20 seconds of walking, is far denser, so set the cadence as zone data and tune by look test, not by copying the donor rate.
- Donor group size is 2 to 5 indoors and up to 5 active guards. Ours is 3.
- Donor enemy lists are classic game content. Ours: our 12 families and 100 Pit characters, reused across zones.

Expected rates (computed from rules B and the default clock, assuming continuous play in one state, real time):
- Outdoors by day: 5 active windows per real hour, each 1 minus (35/36) to the 12th, about 0.29 chance. About 1.4 spawns per real hour.
- Outdoors by night, or in town at night: 1 minus (23/24) to the 12th, about 0.40 per window. About 2.0 per real hour.
- Dungeon while resting and alerted: about 1.4 per real hour of rest.
- The alert lasts 480 game minutes, which is about 40 real minutes.
These are expected values from the code, not measurements.

## 5. A 5-minute look test Dom can judge on his phone

Build one scene flag, not a release row: three presets on the existing scene, each run for one minute of walking.
- A: spawn 8 to 20 units away (Unity units, about metres) inside the view cone.
- B: spawn in an out-of-view ring with the horizontal angle from the phone aspect (the fix above), the same distance.
- C: B with 1 to 3 members (rolled), against a fixed 3.
Dom judges: is the first sight of B a surprise or a pop; can he read a 3-member group as one threat at 375 wide; does C feel like a patrol or a mob; and how many encounters he sees per minute of walking at each preset. Target file for the eventual build: src/fight/encounter-template.ts (row 4). The look test does not touch the release rows.

## 6. Licence and content status

Code: MIT. Root LICENSE line 1 is "MIT License" and line 3 gives "Copyright (c) 2009-2023 Daggerfall Workshop". Assets/Licenses/Daggerfall Unity.txt names a different holder and range (Gavin Clayton, 2014 to 2022, MIT) (as recorded in AU013; not re-read here).
Content: quest scripts, dialogue and the encounter tables are game-like text and data (class C per AU013). The tables are transcribed from the classic executable (RandomEncounters.cs line 22). Do not copy the enemy lists or any dialogue. We take the shape only: a level band, a list per place, a cadence and a grammar. Recreate with our own tables and names. No legal conclusion.

## 7. Gaps

Not read: the DOS data pack (not in the box); creature sprites, idle sets and sounds (EnemyBasics.cs stats, not in this pass); the full EnemySenses logic (only the alert lines); the DaggerfallUI.cs context around line 652; the quest parser beyond CreateFoe.cs; death and respawn presentation; loot reveal; the rest window's timing and loiter path; the ship and swimming gates (PlayerEntity.cs around lines 486 to 500, read only in part); the non-immediate guard branch from line 691 onward. Half read: client code and quest text. Server half: not applicable (single player). Paired donor for the same topic in this batch: afritz1-OpenTESArena (see its note); they are not two halves of one game.
Donor's own TODO at PlayerEntity.cs line 609 ("not sure how enemy type is chosen here") is unverified; ChooseRandomEnemy does handle dungeon type, so the TODO may be stale. Not tested.
