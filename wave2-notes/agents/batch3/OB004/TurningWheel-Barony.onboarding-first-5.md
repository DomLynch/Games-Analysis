# TurningWheel-Barony (onboarding-first-5, cell OB004)

Donor/Licence: /mnt/frankendom-donors/TurningWheel-Barony. Code is BSD 2-Clause (LICENSE.txt:1-6, Turning Wheel LLC). The README says a purchased copy of the game is needed to play it (README.md:13). The game data (maps, data/story/intro.json, data/tutorial_strings.json, art, music, monsters' map placement) is not in this box: there are no data/, maps/, images/ or music/ folders. Data is therefore unlicensed in this box: category-level inspiration only.

Half read: the client and game code (src/, 172 files, one codebase that holds both client and networked play, so no server/client split) plus the English string table lang/en.txt (about 5,750 lines start with a number). Data half absent from the box; the level and story files are named by code and by the manifest in src/files.cpp, but not read.

Checked: src/game.cpp (boot intro stage, quickstart, doNewGame call sites, tutorial completion prompt), src/menu.cpp (doNewGame), src/ui/MainMenu.cpp (story screen, first-time prompt, character cards, class list), src/mod_tools.cpp (tutorial mode data, first-time prompt window), src/charclass.cpp (initClass loadouts), src/game.hpp (class enum), src/maps.cpp (startfloor), src/files.cpp (manifest of tutorial and hub maps), lang/en.txt (tutorial and story strings, by line). Not read in depth: monster_*.cpp, shops.cpp, ui/GameUI.cpp, hit and shake code beyond one helper.

Confidence: high on order and gating of the boot, story and first-run prompt. Low on the first fight, because monster placement lives in the absent map data.

## 1. What the player sees and feels (first 90 seconds, 375 wide)

Boot shows an intro stage, then one of two main-menu backdrops is chosen by a random roll (game.cpp:7581-7594). Unless the skip flag or a quick-start class is set, a story screen runs: typewritten text over images, each text box followed by a pause, and a Back button that must be pressed three times to skip (MainMenu.cpp:3471-3478). After the title press, the main menu appears and the first-time prompt is asked once: "Barony is a challenging game. Would you like to play a tutorial?" with Yes and No. Yes opens the Hall of Trials at tutorial1. No shows a note that tutorials are in the Play Game menu (MainMenu.cpp:23652-23690). Then character cards: a class button opens a list of classes with a details card that rates each stat with colour words, and colour-tags each class by content pack (MainMenu.cpp:16651-16700, 13743-13780). The code path then starts a new game on the hub map hamlet (startfloor 0; not run), with a fixed starter kit, and the first weapon already in hotbar slot 0 (charclass.cpp:731-759 for barbarian).

## 2. Why it works / is striking

- The offer is one question with a clear yes and no, asked once. It keeps the player in control of the first 90 seconds.
- A trial ladder: ten trials, each a map, and a completion line that counts the rest ("9 more trials are available"). It is a visible next goal at minute 10 to 20 (lang/en.txt:5829).
- The starter kit puts the first weapon in hotbar slot 0 (charclass.cpp:759), so the first attack needs no menu.
- The class card's stat colour words make 26 classes readable on a card, without reading a table.
- Signature sound and effect: not read in the code half for this topic.
- Could be ours at 20-30 percent: a trial ladder of ten short challenges that ramp from one enemy to more, with the count shown on a card.

## 3. The rule behind it

The order of the first run (code):
1. Boot intro stage, then menu backdrop roll (game.cpp:7581-7594).
2. Story screen, unless skipintro is set or a quick-start class is set (game.cpp:7599-7601). The story file is data/story/intro.json (MainMenu.cpp:26092, 26100), not in the box.
3. Story text rules: a caret advances the image; a hash adds a pause; an asterisk and digit change the box size (MainMenu.cpp:3327-3330). Default box size is 2 lines (MainMenu.cpp:3394). Each full box sets a pause of fpsLimit times 5 (MainMenu.cpp:3670, 3709). The frame cap is not read, so the pause in seconds is not computed.
4. Skip: the Back button starts labelled "Skip story" (string 5026) and its label changes to "Confirm (1)" (5027) and "Confirm (2)" (5028) on the first and second presses. The third press ends the story (MainMenu.cpp:3471-3480).
5. First-time prompt: shown when the settings document has the flag set. A fresh document sets it true (mod_tools.cpp:268). The prompt is binary: Yes opens the Hall of Trials, No opens a note (MainMenu.cpp:23652-23690). The flag is cleared when a new game or the hall starts (MainMenu.cpp:26235-26237, 26255-26257).
6. Dead code in the same feature: GameModeManager_t::Tutorial_t::FirstTimePrompt_t::createPrompt() and drawDialogue() both return on their first line, and the window body is commented out (mod_tools.cpp:375-440). The live offer is the binary prompt in MainMenu.cpp.
7. Hall of Trials: a tutorial game mode (mod_tools.cpp:73 startTutorial). Trial list read from data/tutorial_strings.json, each entry a file, a title and a description (mod_tools.cpp:153-200). The file manifest lists ten trial maps, tutorial1 to tutorial10 (src/files.cpp:1787-1796), not in the box. The hub blurb promises ten challenges (lang/en.txt:5478).
8. Completion: in tutorial mode the first completion shows a prompt (game.cpp:2313-2317), not a level message. Regular levels show a progression message on change (game.cpp:2317-2330 range, Language 710 or 711).
9. Class pick: 26 class values (game.hpp:137-162, CLASS_BARBARIAN to CLASS_PALADIN). The list shown is filtered by content-pack validity (MainMenu.cpp:13543-13552). Class descriptions come from ClassDescriptions::data; the loader was not located in the half read.
10. Starter kit: one branch per class in initClass (charclass.cpp:693 on; 40 class checks in the file). Barbarian: a worn ring of strength, then an iron axe placed in hotbar slot 0 (charclass.cpp:731-759). Loadouts are hand-coded C, not data.
11. Start map: doNewGame sets currentlevel to startfloor (menu.cpp:8700), and startfloor is 0 (maps.cpp:32). The start hub is hamlet, listed in the manifest (files.cpp:538, 11,319,079 bytes), not in the box.
12. First fight: not read. The first monsters are in map data. Monster code (monster_*.cpp) read only by name.

Ambient, death and respawn, loot ceremony, walk density: not read in this half (no map or monster data). Readability at 375 wide: the code uses fixed card sizes (446 px list card, 664 px details card, characterCardClassMenu at MainMenu.cpp:16651) and no phone layout was read; the 375 check is not made.

## 4. For Frankendom

Shape match: ten trials are ten zone records with a title, a description and a map file. That is the 700-zones-as-data shape, scaled down. The trial ladder can also be the first-run progression for a Pit character: each trial adds one attacker, up to MAX_ATTACKERS = 3.

Keep:
- A single yes-or-no first-run offer, asked once, with a note for the No path.
- A trial hub with a count ("N more") shown after each win.
- The first weapon already in slot 0 of the bar.
- Stat ratings on the class card as coloured words, not a table.
- Class list filtered by what the player can use.

Change:
- Remove the dead FirstTimePrompt window code (mod_tools.cpp:375-440). Keep one offer path. Fix: the MainMenu prompt is the single offer; the dead body is deleted.
- Move class loadouts from C (charclass.cpp) to data rows: class, starter items, hotbar slot. Kills and XP still come from the server (parity rows 18 and 23).
- Story: skip with one press on phone, not three. Keep the caret and pause tokens as a data format.
- Trial ladder ramps attackers 1, 2, 3 across trials 1 to 10 (MAX_ATTACKERS = 3). Trial 1 is one enemy, so the first fight is one-on-one.
- Client-only: the story, camera, HUD and sounds. The trial result is server-verified (row 19 fight record).

## 5. 5-minute look test (Dom, on a phone)

Build the first-run offer on a 375-wide screen: one question, Yes and No, then a trial card "Trial 1 of 10" with one enemy and a count line after the win. Time to the first swing and to the first card. Compare with the donor: a three-press story skip and a 26-class card. Pass: the first trial starts within 60 seconds of launch, one tap to skip the story.

## 6. Licence/IP

Code BSD 2-Clause: code may be adapted with the notice kept (LICENSE.txt). The data pack is not in the box and the README requires a purchased copy, so story text, trial text, class descriptions, maps and art are not licensed to us. Use category-level only: a ten-trial ladder, a yes-or-no offer, a count card. No story text, class names beyond the enum, or level names carried over. No legal conclusions.

## 7. Gaps

- Data half absent: story JSON, tutorial strings JSON, trial maps, hamlet, monsters' placement, class descriptions. Named by code and manifest only.
- First fight, first kill, first loot, first level-up: not read.
- Hit feedback: one limb-shake helper read (actmonster.cpp:10935), no hitstop or screen shake read.
- Frame cap and fpsLimit not read, so the 5-second pause is not confirmed in seconds.
- Shops (shops.cpp, monster_shopkeeper.cpp): names only.
- Services (bank, shop, trainer) and their introduction in hamlet: not read (map data absent).
- Half read: code and English strings. Data half absent.

Best transferable idea: a ten-trial hub with a visible "N more" count after each win, with the first trial as one enemy and the ramp to three attackers across the ladder.
