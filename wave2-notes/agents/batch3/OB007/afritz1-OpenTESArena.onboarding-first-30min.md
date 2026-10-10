# afritz1-OpenTESArena (onboarding-first-30min, cell OB007)

Donor/Licence: MIT code (LICENSE.txt line 1, "The MIT License (MIT)"). No separate asset licence; README says no game assets are distributed. The original Arena data and executable are user-supplied and are not in the box, so content is category-level only.
Checked: read the start-up and New Game flow (Interface/IntroUiMVC.cpp, MainMenuUiMVC.cpp, CinematicUiState.cpp, ImageUiState.cpp, CharacterCreationUiMVC.cpp, ChooseAttributesUiState.cpp, CinematicLibrary.cpp, TextCinematicDefinition.cpp), the post-death and exhaustion pop-ups (GameWorldUiMVC.cpp, PauseMenuUiMVC.cpp), the start-dungeon exit (World/MapLogic.cpp), level-up (Game/GameState.cpp, Player/CharacterLevelUpState.h), rumours (Interface/GameWorldUiState.cpp), travel and splash (ProvinceMapUiMVC.cpp, ProvinceMapUiState.cpp, WorldMapUiMVC.cpp, MainQuestSplashUiMVC.cpp), logbook, options/options-default.txt, and the exe string table keys (data/exe/aExeStrings.txt). Confidence high on the flow and its order. Not confirmed: the start-dungeon layout, its monsters and the town content (all in data not in the box).

Verdict: STRONG for the onboarding flow (intro, creation, pop-up feedback, ceremony, exit to a home province). PARTIAL for the first fight (no staging code found; the content is in a map file not in the box).

Best transferable idea: every skippable opening card is timed as data and a single press skips the whole sequence, so a player can reach control in seconds while the story still exists for those who wait.

## 1. What the player sees and feels (phone 375 wide, from the code paths)

With the intro option on (the default in options/options-default.txt, line 102), a cold start shows a book cinematic, then a title card and a quote card of 5 s each, then an opening scroll, then three story cards of 13, 13 and 10 s before the main menu. That is at least 46 s of passive viewing before the menu, plus two cinematic lengths read from texture metadata that is not in the box. New Game is shorter but heavier: an opening scroll, then nine intro cards of 5 s each (45 s) with no input needed, then six creation screens that the player must drive. Only after a dream-text cinematic with spoken pages (voice clips named by template key and page) does the game world open, with the camera facing west so the first frame is not a wall. Any performed input skips a cinematic (CinematicUiState.cpp:165). The first thing the player controls is the start dungeon, with no tutorial text found in the code.

Death (and fatal exhaustion) is framed the same way: a dream text card (the "good" variant is used on death) and then a return to the main menu.

## 2. Why it works, and where it is striking

- Readable at 375 (inferred, not measured): the cards are full-screen art with one short block of text, and the dream card uses a tinted font colour for each variant (CinematicLibrary.cpp:8-9).
- One signature behaviour: any press skips the whole sequence (onSkipInputAction), so the cost of the story is only paid by players who wait.
- One signature sound: the level-up fanfare (Fanfare1, GameState.cpp:1687) before the stat pop-up.
- The loss framing is a story beat, not a stat reset; it is the most transferable part for a fast duel game.
- Could be ours at 20-30 percent resemblance: a short 3-card opening with tap-to-skip, a dream-like card on a loss, and a level-up that waits for the area to clear.

## 3. The rule behind it (order of operations and numbers)

Order, New Game path:
1. Opening scroll cinematic (duration from texture metadata, not in box).
2. Nine intro cards, each 5.0 s (MainMenuUiMVC.cpp:507-515).
3. Class screen (ChooseClassCreation); Select opens the class list (CharacterCreationUiMVC.cpp:1084-1087).
4. Remaining creation screens (race, gender, name, attributes), player-driven. Six creation screen files exist: ChooseClassCreation, ChooseClass, ChooseRace, ChooseGender, ChooseName, ChooseAttributes. The order of the middle four was not fully read.
5. Player created, then the dream cinematic (template key 1400, ChooseAttributesUiState.cpp:876-916), then the game world (CharacterCreationUiMVC.cpp:1182).

Order, level-up ceremony (GameState.cpp:1649-1706):
1. If any enemy is near the player's eye position (anyEnemiesNearby), the function returns early and nothing happens. Whether it is retried on a later tick was not read; the effect is that the ceremony waits for a clear area.
2. Loop: while experience reaches the cap for the current level, level up. Per level, bonus points are 4 to 6 (CharacterLevelUpState.h:9-10) plus a health gain from endurance and a class die.
3. Fanfare, then a pop-up with the level-up string. Health is applied only when the pop-up closes (line 1696).
4. Then the level-up screen opens.

Order, exit from the start dungeon (MapLogic.cpp:698-728): leaving by the top-floor up voxel of the start dungeon calls handleStartDungeonLevelUpVoxelEnter, which clears the key inventory and places the player in a random one of 32 locations of the province matching the race (a todo in code says this should not assume 32).

Order, exhaustion (GameWorldUiMVC.cpp:1718-1748): a pop-up. If swimming, or outdoors at night, it is fatal (death dream). Otherwise the player rests one in-game hour, heals, and the clock advances.

Data fields (designer-tunable; donor value given because the code is MIT):
- intro_title_card_seconds | s | 5.0 (IntroUiMVC.h:22)
- intro_quote_card_seconds | s | 5.0 (IntroUiMVC.h:26)
- startup_story_card_seconds | s | 13.0, 13.0, 10.0 (IntroUiMVC.cpp:100)
- new_game_intro_card_seconds | s | 5.0 x 9 (MainMenuUiMVC.cpp:507-512)
- cinematic_skip_on_any_input | bool | true (CinematicUiState.cpp:165-171)
- level_up_bonus_points_min | points | 4 (CharacterLevelUpState.h:9)
- level_up_bonus_points_max | points | 6 (CharacterLevelUpState.h:10)
- level_up_wait_for_clear | bool | true (GameState.cpp:1656)
- start_exit_location_roll | count | 32 (MapLogic.cpp:172)
- rumour_filler_chance | probability | 0.5 (GameWorldUiState.cpp:3527-3532, fixed filler key 159 versus random key 185)
- exhaustion_fatal_outdoor_night | bool | true (GameWorldUiMVC.cpp:1728)

## 4. For Frankendom

- The ring fight stays first; the Arena lesson is the opening, not the order. Replace the 46 s passive opening with a 3-card opening at 5 s each, tap-to-skip, under 10 s total. Keep the card timings as zone or settings data.
- Death or loss: keep the dream-card framing (row 17, death and respawn) but do not clear the session. Ruling: one character, one ledger. The card is presentation only; the server keeps the state.
- Start-zone exit: keep "race picks a home region" but make it a data choice in the zone table, seeded (seed discipline), not a random roll. Ruling: zones are data on one runtime.
- Level-up: keep the three-beat ceremony (wait for clear, fanfare, pop-up, then the stat screen). The server emits the level-up event; the client presents it (row 18, loot roll and XP award; post-K item 3).
- Rumours: keep a fixed filler line beside random ones, so the fallback is never a dead end. Rumour pools are zone data.
- Travel: keep "predict before you commit" (days, arrival date) for any multi-zone walk.
- Spawn and encounter pacing: the start-zone population is row 23 (spawn caps, despawn grace). The first fight is an engine encounter with a data preset, not a separate tutorial path (ruling: one engine, src/fight is the whole fight).
- What to change: the Arena start has no staged first fight that I could find; ours should choose the first fight preset from zone data so it is winnable by data, not by a special case in code.

## 5. Five-minute look test (Dom, phone)

Build one 375-wide flow: three opening cards at 5 s with tap-to-skip anywhere, then one class-style choice with three large buttons (random, pick, skip to fight). Make every button work. Dom taps through twice: once letting it run, once skipping. Record seconds from launch to first control. Target: under 10 s when skipped, and the choice must read at a glance. Compare against the current 46-plus-second intro.

## 6. Licence and IP

MIT code: the code can be adapted with attribution, and the constants (card seconds, bonus range, skip rule) are shape values, not copyright. The Arena content (dream text, voice clips, the start dungeon, creature names and stats, the intro art) is original game data, user-supplied, and not in the box. Inspiration for anything content-facing stays category-level (for example, a dream card on loss), recreated as our own art and words. Recreate the card timing and skip rule; change the art, the words, the stats and the level-up numbers to our own. No legal conclusion.

## 7. Gaps

- Not read: texture metadata for the book and scroll cinematics (durations unknown); the dream text pages and voice clips; the start-dungeon map file (StartDungeonMifName, data/exe/aExeStrings.txt line 246, value not in the box); town content; creature stats and spawn tables; the middle creation screens' order.
- Not in the box: all string values (the exe string table holds only key=offset pairs, 397 keys in 24 sections; the Services section holds 74 keys for tavern, temple, mages guild, equipment and citizen modals).
- Generate button: onGenerateButtonSelected is empty (CharacterCreationUiMVC.cpp:1079-1082, todo for a questions screen). The class-questions intro is loaded from the exe (ExeData.cpp:396) but no code path reads it, so the "Generate" choice is a dead end in this repo. Keep the idea (a few questions to suggest a class), fix: wire the button to the questions screen before shipping. Decision: adapt (idea), defect fixed in our build.
- Bad death dream (template key 1403) is defined (CinematicLibrary.cpp:27) but no caller was found. Treated as an unused asset.
- Level-up thresholds: the level loop uses the cap getter (GameState.cpp:1662); its values are not in the box.
- Half read: client (engine source plus the exe string key table). The data pack (original Arena files) is not in the box and is the other half. There is no server half in this repo (single engine).

## Onboarding detail (per the focus brief)

(1) First 90 seconds: see section 1. (2) First fight and first hit: not staged in the code I read; the start-dungeon monsters are in the map file (not read). (3) First reward and level: corpse loot and key pick-up both use a status pop-up that calls back into the next step (GameWorldUiMVC.cpp:1529-1562); level-up ceremony in section 3. (4) First hub: after the start dungeon the player lands in a random location in the home province; services (tavern rooms and rest, temple cures, mages guild, equipment buy/sell/repair/steal, citizens for rumours) open as modal menus when entered. Introduced one at a time by walking into buildings is my inference from the modal structure (town data not read). (5) First meaningful choice: the class choice (Select versus Generate, the latter a dead button); then the race, gender, name and attribute screens. (6) Pull-forward at 5, 10 and 30 minutes: the logbook starts empty (LogbookUiMVC.cpp:8); the first travel shows days and arrival date before commit (ProvinceMapUiMVC.cpp:225, 263); a main quest location travel raises a per-province splash (WorldMapUiMVC.cpp:602, MainQuestSplashUiMVC.cpp:15, eight splash entries in ExeData.h:751); NPC rumours. (7) Tutorial style: none in code. Show-don't-tell by cinematics and modal text. Skippable (any input). Text length is in the string table (not read). (8) Drop-off risks: a long passive opening (46 s or more); six creation screens before any play; the Generate dead end; a fatal night exhaustion can cut the first session short. Avoided: intro can be turned off; every cinematic skips; the loss is a story beat, not a punishment screen. (9) Could be ours at 20-30 percent resemblance: a 3-card tap-to-skip opening, a class choice with a working quick path, and a level-up ceremony that waits for a clear area.

Reuse tag: idea only (no code reused).
Brief rule served: onboarding-first-30min; keep the idea, fix the defect (Generate dead end).
