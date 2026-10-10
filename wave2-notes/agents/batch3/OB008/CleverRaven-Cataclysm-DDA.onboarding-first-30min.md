# CleverRaven-Cataclysm-DDA (onboarding-first-30min, cell OB008)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/` | Licence: CC BY-SA 3.0 Unported for code and content (`LICENSE.txt` line 1; project-wide per AU010); some bundled code under other licences per AU010 (README line 65) | C++ engine, JSON data, the tutorial world as a mod (`data/mods/dda_tutorial/`) | Decision: adapt (idea) | Verdict: STRONG for the tutorial lesson mechanism; the main game's first 30 minutes is thin (no scripted onboarding) | Best transferable idea: each teaching popup fires once, on the first action that matches it, from a per-lesson seen flag, inside a separate opt-in training room that includes a zero-risk training dummy.

Checked: Read `src/gamemode_tutorial.cpp` in full (384 lines: init, per-turn triggers, post-action triggers, `add_message`). Read `src/gamemode_tutorial.h` (enum, by grep for names). Read `src/main_menu.cpp` lines 813-860 (tutorial menu option, separate world). Read `data/mods/dda_tutorial/snippets.json`: all 35 lesson snippets parsed with python on the VPS for id and word count (no files written); its first 30 lines read as text. Read `data/mods/dda_tutorial/monsters.json` (the dummy, whole file), `mapgen.json` lines 1-12 and 90-115, `specials.json`, and grep of `traps.json`. Read `data/json/scenarios.json` (grep plus the evacuee, squatter and sheltered entries), `data/json/start_locations.json` (grep of the two shelter entries), `data/json/starting_missions.json` (all 31 ids, the find-rifle and hunter entries in full), `data/json/professions.json` (grep count and line 8006), `data/json/npcs/other/TALK_shelter_survivors.json` (77 lines, the first-meeting and intro topics), `data/json/npcs/npc.json` line 175 (the shelter survivor record), `src/scenario.h` line 164. Confidence: high on the tutorial code path (read in full) and on the dummy and snippet data; medium on the main game's first 30 minutes (only scenario, start-location, personal-goal and NPC-dialogue data read; no spawn or first-zombie code read).

## Onboarding items (1)-(9)

**(1) First 90 seconds.** Main game: the player picks a scenario from a list, each with a short paragraph (`data/json/scenarios.json` line 7: the evacuee start, "survived the initial wave of panic, and achieved relative safety in an evac shelter"). A profession comes next, then the character appears in an evacuation shelter (`start_locations.json` line 10, `sloc_shelter_safe`, a shelter with the basic palette). No intro popup, no forced tutorial. The grep of `newcharacter.cpp` and `main_menu.cpp` for welcome or intro text found nothing that fires on a new game; the first screen is the map. Opt-in tutorial: from the main menu a separate world is made (`src/main_menu.cpp` line 852). That world sets the calendar to a fixed date (`gamemode_tutorial.cpp` line 139), forces 20 C, resets hunger, pain and sleep to zero, and sets full health (`init`, lines 133-170).

**(2) First fight and first hit.** Tutorial: the first hit is against a training dummy placed in a room (`dda_tutorial/mapgen.json` line 100, `mon_dummy_tutorial`). The dummy has 50 HP, no melee damage (`monsters.json` line 17), is immobile (line 21), and leaves no corpse (line 20). So the first swing is risk-free and the player can see the hit land. The lesson for the first hit exists as a snippet (about 33 words), but the code never calls `add_message` for it: the name appears only in the enum-to-string switch (`gamemode_tutorial.cpp` line 97). That gap is worth avoiding, not copying. Tutorial skill: the player starts with level 5 in gun, melee and throwing (`init`, line 180), so early practice is not punishing. Main game: no first fight is scripted in the scenario or start-location data (not read: the first zombie placement and overmap spawns). Hit feedback in the main game is a message log (not read in code).

**(3) First reward, first loot, first unlock.** Main game loot at the shelter: 14 item groups of shelter lockers, cabinets, sinks and supply closets, each with a fresh and a used variant (`itemgroups/SUS/evac_shelter.json`, line 3 for the first locker). Tutorial: each first pickup, by type, gets its own popup: armour, weapon, food, tool, gun and ammo are six different lessons, each once (`gamemode_tutorial.cpp` `post_action` `ACTION_PICKUP`). No XP level shown. Personal goals (below) pay out morale, not loot. Celebration: none; the lesson is text.

**(4) First hub and services.** The shelter survivor is the hub. The first conversation introduces trade and jobs in the same menu: "Care to trade?" (`TALK_shelter_survivors.json` line 53) starts a trade, and "Any jobs you need done?" (line 61) appears only when the player has no assigned mission and no list of many (line 62). So the jobs option does not stack. Services arrive one per conversation, not as a tour.

**(5) First meaningful choice.** The scenario choice, which sets the starting difficulty budget. Scenario entries carry a points field (evacuee at 0, squatter at -1, sheltered at -3, per `scenarios.json`), and a swap is refused when the player cannot afford the points (`src/scenario.h` line 164). The profession is a second choice, and 26 of 219 professions carry personal missions (`professions.json` line 8006). The NPC choice: "Why don't you come with me?" is a persuade check (`TALK_shelter_survivors.json`, not receipted).

**(6) Pull-forward hooks.** Minute 0: a personal goal from the profession, for example find a new rifle (`starting_missions.json` line 203; difficulty 3; morale bonus that decays over 8 hours). Minute 5 to 10: the actions that trigger lessons (open a door, pick up, wear, drink, pain, stairs). The shelter's jobs appear once the player has no assigned mission. Minute 30: the lesson set is finished, and the main game has no further visible goal in the data read. Minute mapping is estimated, not timed.

**(7) Tutorial style.** Show-don't-tell, lesson by lesson, optional. Each lesson is a popup that fires when the matching action or state happens, once per lesson (`gamemode_tutorial.cpp` lines 375-383: the seen flag is checked, set, then the popup opens with `PF_ON_TOP`). The intro lesson says popups close with a key (`snippets.json` line 9). Text length: 35 snippets, about 2,285 words in total; the typical lesson is 35-90 words; the longest is about 148 words (`LESSON_RESTORE_STAMINA`, `snippets.json` line 140). That is long for a phone. Skippable: yes, each popup closes on a key; the tutorial is a separate world, so the main game is never interrupted.

**(8) Drop-off risks it avoids or has.** Avoids: the tutorial world is opt-in and separate, so a veteran is not stopped; the first hit cannot hurt the player. Avoids: a lesson fires only on the action that matches it, so there are no pre-emptive popups. Risks: a lesson with a snippet and no trigger (`LESSON_HIT_MONSTER`); the main game has no onboarding, so a new player meets the first danger with no framing; about 2,300 words of popup text in the tutorial alone; the save warning in the tutorial (`pre_action`) is one more popup.

**(9) Could be ours at 20-30% resemblance, plus the look test.** Keep the once-per-lesson seen flag, the dummy first hit, the first-pickup-by-type line, and the first-meeting branch (a flag that changes a cold greeting to a calm one after one answer). See the look test below.

## Half read and counts

Half read: client-side code for the tutorial world (`src/gamemode_tutorial.cpp` in full, menu entry) plus the data half (`data/mods/dda_tutorial/` snippets, monsters, mapgen; `data/json/` scenarios, start locations, starting missions, professions, NPC dialogue). The server half is not read; this is a single-player game (no server half in the code read).

Counts (python on the VPS, no files written): scenarios 61; start locations 101; starting missions 31 (all mission definitions, origin `ORIGIN_GAME_START` in the two read); professions 219 (26 with a `missions` list); tutorial lesson snippets 35 (about 2,285 words); distinct `add_message` lesson calls in the tutorial code 33; dreams 110 (count only, not read); shelter item groups 14 (count only). Receipts cover the lines cited.

## THE RULE BEHIND IT

The rule is one-shot, action-matched teaching: (a) the tutorial keeps a per-lesson seen map; (b) each game step asks "is this lesson for what just happened?" (per turn for state such as stairs, dark, pain; after each action for open, close, pick up, wear, act; the first time only); (c) if not seen, mark it seen and open the popup (`gamemode_tutorial.cpp` 375-383). The second rule: the first hostile contact is a dummy that cannot move, deal damage or die into a corpse, so the first hit is safe and visible. The third: the player starts with skill 5 in the three combat skills in the tutorial, so the first hit is not also a skill check. Designer-tunable data fields, each null (CC BY-SA donor, so no donor values carried over):

| name | unit | donor value |
|---|---|---|
| lesson_once_flag (per lesson id) | bool | null |
| lesson_text_max_words | words | null |
| dummy_hp | hit points | null |
| dummy_melee_damage | damage | null |
| starting_skill_level_training | level | null |
| personal_goal_morale_bonus | morale points | null |
| personal_goal_duration | hours | null |

## FOR FRANKENDOM

- First hit (parity row 10, hit impact and hitstop): a training dummy in the Pit with zero damage and immobile, with one popup on the first hit. Target file: `src/fight/<module>.ts` (module name not verified; the Frankendom repo was not in my brief). Row 20 (catalogue as runtime source) is where the dummy record would live.
- First loot by type (row 18, loot roll and XP award): one line on the first armour, weapon, food and gun, once each.
- Death and first loss (row 17): not read in this pass; no donor claim made.
- Town hub (not a parity row): the first-meeting flag and the jobs option that hides while a job is active fit the town dialogue; no row 1-22 fits, so flag to Lead.
- Zone population (row 23): the personal goal is a per-character goal, not a zone rule; not mapped to a spawn cap.
- Keep: the once-per-lesson seen flag, the dummy first hit, action-matched popups, the opt-in training room, the first-meeting flag. Change: 25 words per popup for 375 wide; every lesson must have a trigger (the dummy hit lesson is a gap); no 148-word popups.
- Server-verified: the seen flags and any reward for a lesson are server state; the client plays the popup. Frankendom's one ledger holds the personal goal's reward.

## 5-MINUTE LOOK TEST (phone, 375 wide)

On the existing Pit, add a dummy record (50 hit points, zero damage, immobile, no corpse) and a popup of 25 words on the first hit only. Dom taps the dummy five times: does a one-line tip appear once, at the first hit, and then never again? Second beat: pick up three items of three types (armour, weapon, food); each type gets one line, once. Compare with the same Pit fight with no dummy. Pass if Dom says the first hit was safe and clear within 10 seconds, and that no popup repeats.

## LICENCE / IP

CC BY-SA 3.0 Unported for code and content (`LICENSE.txt` line 1; AU010). Share-alike applies to copied material; so nothing is copied. Only category ideas are taken: a training dummy, once-only action popups, a first-meeting flag. Our own lesson wording, dummy name, numbers and dialogue go in. Kept: the once-per-lesson rule and the zero-risk first hit. Changed: all text, names, numbers and character lines. No legal conclusion.

## GAPS

Not read: `src/gamemode.cpp`, `src/scenario.cpp`, `src/newcharacter.cpp` (grep only), `src/mission_start.cpp`, the first-zombie and overmap spawn code, the death and game-over path, the shelter palette `shelter_basic` and the `shelter` overmap files, `traps.json` bodies (ids only), `mapgen.json` rooms other than lines 1-12 and 90-115, `dreams.json` text (count only), `scores.json`, the remaining 59 scenarios and 99 start locations (not read), 29 of 31 starting-mission bodies (ids only), the other TALK topics in `TALK_shelter_survivors.json` beyond the first-meeting and intro ones. Half read: client code and data for the tutorial; the main-game start is data only. Walk density, idle animation and readability at 375 wide: not applicable to a terminal game as read; the tileset is in AU010 only.

## Receipts

`/private/tmp/p2/wave2-haiku/batch3/OB008/receipts.tsv` (CD rows): verified with `verify_receipts.py`, all passing.
