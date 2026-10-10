# flareteam-flare-engine (onboarding-first-5, cell OB004)

Donor/Licence: engine at /mnt/frankendom-donors/flareteam-flare-engine (code GPL v3, COPYING). Paired data pack read for the opening: /mnt/frankendom-donors/flareteam-flare-game (art and data CC-BY-SA 3.0 blanket; audio not named, class C). Code is clean-room shape only. Data is category-level only, no quest text, names or lore carried over.

Checked: engine src/GameStateTitle.cpp, GameStateNew.cpp, Avatar.cpp (level-up), GameStatePlay.cpp (checkNotifications), EventManager.cpp and MapRenderer.cpp (trigger activation); engine mods/default/menus/gamenew.txt, engine/death_penalty.txt, engine/combat_text.txt, cutscenes/intro.txt. Paired flare-game: maps/spawn.txt, maps/arrival.txt, maps/river_trail.txt, maps/perdition_harbor.txt, npcs/tutorial.txt, npcs/florin.txt, npcs/udana.txt, cutscenes/backstory.txt, quests/0000_empyrean.txt (read in full), engine/classes.txt, engine/xp_table.txt, enemies/lvl1_zombie_rotting.txt, enemies/lvl1_zombie_raised.txt (header and speed lines). Confidence high on the order of the opening from code and data. Not run in a game, so trigger order and winnability are inferred.

## 1. What the player sees and feels (first 90 seconds, 375 wide)

Start the game with no save and Play skips the load screen and goes straight to a New Game card: a portrait, a name box, three class cards (Brute, Scout, Adept) with a one-line description each, a Randomize button and a permadeath checkbox. Then the hero stands on Arrival, an isometric grassland with four looping ambient sounds (wind, birds, owl, raven). A backstory of eight caption cards plays on load; each card carries pause=-1, read here as wait for input (not checked in the cutscene code). Then a skeleton holding a note, who cannot be moved past, gives a seven-line tour: bars top-left, minimap top-right, action bar at the bottom, the four menus, and the move and attack keys. The first real enemies are three single level-1 zombies on River Trail, spaced far apart.

## 2. Why it works / is striking

- Readable at 375: one speaker, one portrait, one task per line; the tutor is a dead body with a note, so the teacher is in the world, not a box.
- One signature behaviour: the movement lock during the tour (allow_movement=false) makes the player read the HUD before walking.
- One signature sound: the level-up sound plays after the Congratulations log line.
- Quest text names the next place and person ("ask Florin"), so the next goal is always visible in one sentence.
- Could be ours at 20-30 percent: a diegetic tutor on a corpse, and a shop whose stock changes at set levels.

## 3. The rule behind it

Order of the opening (code and data):
1. Title: language and mouse-move dialogs are created only while their setup flags are unset (src/GameStateTitle.cpp:155 and :193).
2. Play with no saves: GameStateNew directly (src/GameStateTitle.cpp:310-313).
3. New card: name box max 20 characters (src/GameStateNew.cpp:85). Permadeath checkbox is forced and disabled if the mod forces permadeath (src/GameStateNew.cpp:88-90).
4. flare-game maps/spawn.txt is a 1x1 dummy map that intermaps to maps/arrival.txt at 20,20 (spawn.txt:13).
5. arrival.txt: backstory cutscene is an on_load event at 17,17 (arrival.txt:176-178). Its eight captions each carry pause=-1 (read as wait for input, not checked).
6. Tutor: on_trigger rectangle 19,19 size 2x2 (arrival.txt:156), requires_not_status emp_arrival, set_status on fire, shakycam=2s (arrival.txt:162). The hero starts on 20,20, which is inside this rectangle. The engine executes on_trigger events while the hero is inside (src/MapRenderer.cpp ~1217), so it can fire on the first frame. Order against the cutscene not verified.
7. Tutor NPC: npcs/tutorial.txt, allow_movement=false (line 10), seven her= lines (line 11 is the welcome line; line 16 names the move and attack keys with ${INPUT_...} placeholders).
8. River Trail: three enemy blocks, category=zombie, level=1, at 4,21, 46,5 and 54,7 (river_trail.txt:286-298). The engine picks a random member of the category (src/EnemyGroupManager.cpp getRandomEnemy). Members read: lvl1_zombie_rotting and lvl1_zombie_raised, both speed=3 and chance_pursue=10.
9. Level-up (src/Avatar.cpp:522-535): log line "Congratulations, you have reached level %d!" (line 526). If the level gives attribute points, a second log line tells the player to use the Character Menu (line 528), and the Character button is flagged for attention (src/GameStatePlay.cpp:665-667). Sound plays last.
10. Hub, Perdition Harbor: a stash at 24,17 (perdition_harbor.txt, tooltip "Stash"). Two vendors, Florin (apothecary, npcs/florin.txt) and Udana (metalworker, npcs/udana.txt). Stock is gated by status and level: on_load events set emp_perdition_trader1/2/3 at levels 5, 9 and 13 (perdition_harbor.txt:284-309), each unlocking a stock block. The waypoint is found by walking a 6x6 area (perdition_harbor.txt:266-269), with a one-line message.
11. Quest 0000 "Return to Empyrean" is a chain of 16 quest-text blocks, each gated by requires_status and requires_not_status on story flags (quests/0000_empyrean.txt). The campaign has 60 quest-text blocks across 13 quest files. Each step says where to go and whom to ask.
12. Death penalty (engine default, no override in the campaign): 50 percent of currency lost, enable=true (mods/default/engine/death_penalty.txt:2 and :8). Currency-only, no XP loss by default.

Ambient and death/respawn: four looping environment sounds on Arrival at fixed tiles (arrival.txt wind 0,0; bird 27,14; owl 11,9; raven 10,27). Death and respawn presentation: not read beyond the penalty numbers above.

Mapping of the three numbers that matter for pacing:
- XP to level 2 is 256, level 3 is 768 (engine/xp_table.txt, from the campaign copy).
- Combat text lives 1 s with a 400 ms fade, speed 1 (mods/default/engine/combat_text.txt).
- In the hub events read (perdition_harbor.txt), services are a stash tooltip and two vendors. No bank event was found in this map. Other hubs not read.

## 4. For Frankendom

Shape match: a Flare map is a text file with events; a zone is that record. Quest steps are status flags, which map to one ledger. Vendor stock keyed to level and to a status is a data row, so 700 zones can carry it without code.

Keep:
- Diegetic tutor on one spot, one speaker, movement locked for the tour.
- Stock that changes at set levels (5, 9, 13), announced in the hub.
- Quest text that names the next place and the person to ask.
- Three spaced level-1 enemies as the first fight, one at a time.
- Ambient loops placed as events, not code.

Change:
- Cut the eight-card cutscene to two cards with a tap-to-skip, or move it after the first kill. A phone player should swing before reading.
- Move the permadeath checkbox off the creation card. Ask it later, or make it a setting.
- Cut the seven-line tour to three lines, and name touch controls, not keys.
- Server-verified: the kill and the XP award come from the server (parity rows 18 and 23). The client only shows the log line and the sound.
- Camera: the shakycam is a client cue (row 11) and must not change the kill.

## 5. 5-minute look test (Dom, on a phone)

Build a four-screen first run on the phone: title, one card (three classes, Randomize, name, no permadeath), arrival with two cards and a tap-to-skip, then a three-line tutor. Time two things: seconds until the first swing, and taps before the first kill. Compare with the donor route on the same phone: eight cards, seven lines. Pass: first swing under 30 seconds with no more than three lines read.

## 6. Licence/IP

Engine code is GPL v3 (COPYING). Use the shape only: a tutor on a body, a level-gated stock row, a status-gated quest line. The campaign data is CC-BY-SA 3.0 as a blanket statement, with audio not named (class C). Keep inspiration at category level. No quest text, character names, backstory captions or lore carried over. No legal conclusions.

## 7. Gaps

- Not run in a game. Trigger order (tutor vs cutscene) and winnability of the zombie fight are inferred from data.
- Level-1 hero stats not read, so the fight difficulty is not computed.
- First-hit feedback: only combat text read. Hitstop and screen shake not read.
- First loot drop, first chest, level-up panel and stash UI: not read.
- Talker skip behaviour: not read.
- 64 translation .po files: counted in the engine only, not read.
- Other 12 campaign quest files: counted, not read.
- Half read: both. Engine code and default mod read; paired flare-game read for the opening only.
- Not read: idle/ambient creature behaviour, boss intro, walk density beyond the three zombies and the four ambient loops.

Best transferable idea: a first-run tutor that is a dead body with a note, a movement lock for seven lines, and the first fight placed as three spaced level-1 enemies.
