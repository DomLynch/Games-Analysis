# alexbatalov-fallout2-ce (onboarding-first-30min, cell OB007)

Donor/Licence: Sustainable Use License 1.0 (LICENSE.md line 1), which limits use to internal business, non-commercial or personal use. Not MIT, so this is clean-room, shape only. No code is adapted, and no donor numbers are used as values. The original game data (master.dat, critter.dat, patch000.dat and the data folder) is user-supplied and not in the box.
Checked: read the start-up and New Game path (src/main.cc, src/mainmenu.cc), the premade and custom character selector (src/character_selector.cc), the movie table and lookup (src/game_movie.cc, src/game_movie.h), the world-map random encounter roll and spotting (src/worldmap.cc around lines 3385 to 3522, table at 570 to 611), experience and level-up (src/stat.cc lines 662 to 775), the kill XP award (src/combat.cc around 2862 to 2880), and the sfall timer config (src/sfall_config.cc lines 56 to 59). Files only listed by name, not opened: src/automap.cc, src/pipboy.cc, src/endgame.cc. Several reads were grep hits plus short line ranges rather than full files. The town, the first map and the first fight are not reachable in the engine source (they live in the data pack).

Verdict: STRONG for the spot-before-engage encounter rule (src/worldmap.cc). PARTIAL for onboarding overall: the opening is engine code only, and the first map, first fight and first hub are in the data pack (not in box).

Best transferable idea: a random encounter is first rolled as a chance on each step, then a separate skill-based roll decides whether the player spots it first (with a yes or no choice to engage or avoid) or walks into it unwarned, and spotting pays a small XP reward.

## 1. What the player sees and feels (phone 375 wide, from the code paths)

Launch plays an IP logo movie, then an intro movie, then a credits movie before the menu, unless a skip flag is set (src/main.cc lines 84 to 91). The menu's intro entry replays the intro and credits (lines 105 to 109). New Game opens a character selector: three premade characters (roles from the code: combat, stealth, diplomat; names not reproduced here) or the custom editor (keys C and M open the editor; C resets the player first, src/character_selector.cc lines 189 to 192). A confirmed character plays the elder movie (src/main.cc line 114) before the starting map loads (line 125; the starting map name can be overridden by config, line 119). Without the skip flag that is four movies (logo, intro, credits, elder) before the starting map; the character selector sits between the intro and the elder movie.

On the world map, each step can produce a random encounter. The player sees a blinking icon while a roll is pending (worldmap.cc line 3443). If the player spots it first, a prompt asks whether to engage or avoid. If not, the encounter simply begins. Spotting gives XP, so the first spotting is itself a small reward.

## 2. Why it works, and where it is striking

- Readable at 375: one blinking icon on the map and one yes or no prompt. Both fit a phone.
- One signature behaviour: the player gets a choice before the fight, and that choice is earned by a skill, not handed out.
- One signature sound: a level-up sound (soundPlayFile("levelup"), stat.cc line 766).
- Could be ours at 20-30 percent resemblance: a spot-before-engage prompt on the world map, with the spotting chance from a skill and a motion-scanner bonus.

## 3. The rule behind it (order of operations and numbers)

Encounter roll, per world step (worldmap.cc lines 3393 to 3499):
1. Day part from the clock: night if the hour is 1800 or later, or before 600; afternoon from 1200; otherwise morning (line 3395 onward).
2. The subtile's encounter class (none, rare, uncommon, common, frequent or forced; table at lines 604 to 611) maps to a frequency value read from config (line 1277). The values are not in the box.
3. Difficulty shifts a frequency between 1 and 99 by one fifteenth: down on easy, up on hard (lines 3403 to 3413).
4. A roll from 0 to 100. If the roll is at or above the frequency, no encounter (lines 3416 to 3418).
5. An encounter is picked from a table (wmRndEncounterPick). A special entry reveals a city on the map (line 3437).
6. In a vehicle, the frequency is reduced by a day-part modifier (40, 30 and 0 in the table at lines 570 to 574; the index order is not read) (line 3451).

Spotting roll (on foot, or in a vehicle where the frequency still exceeds the roll):
1. Outdoorsman is the best party value, plus 20 if the player owns the motion scanner (lines 3456 to 3460), capped at 95 (lines 3464 to 3466), plus the tile's encounter difficulty modifier (line 3473, data not in box).
2. Roll 1 to 100; below the spotting value means spotted (line 3475).
3. Spotted: the player gets XP of 100 minus the spotting value (lines 3478 to 3495), then a yes or no prompt (line 3512). No cancels the encounter and hides the icon. Yes starts it.
4. Not spotted: the encounter starts with no prompt (lines 3504 to 3521).
5. In a vehicle, if the reduced frequency falls to or below the roll, the encounter is always spotted (lines 3497 to 3499).

Experience and level (stat.cc): the XP table function gives 1000 times the level divided by two (rounded down) times the level for odd levels, and times the level minus one for even levels (lines 662 to 674). The level loop that actually decides the level uses a next-level helper that was not read, so the exact thresholds the player sees are not confirmed. Swift Learner adds 5 percent per rank to any XP (line 737). A level-up sets a pending level-up state (line 764), plays a sound, and adds hit points: endurance over two, plus two, plus four per Life Giver rank (lines 769 to 772). Kill XP goes through the same path (combat.cc line 2875), and a dead player earns none (line 2869).

Data fields (designer-tunable; donor values are not used because the licence is not MIT-type):
- encounter_class_frequency | percent | null (config values not in box)
- daypart_frequency_modifier | percent, three entries | null (donor: 40, 30, 0)
- night_start_clock | clock value | null (donor: 1800)
- difficulty_frequency_shift | fraction of frequency | null (donor: one fifteenth)
- spot_skill_cap | percent | null (donor: 95)
- scanner_spot_bonus | points | null (donor: 20)
- spot_xp_formula | XP | null (donor: 100 minus spot skill)
- xp_threshold_base | XP | null (donor: 1000 times the level term)
- hp_per_level | points | null (donor: endurance over two, plus two)

Our proposal for a 375 build (not donor values): spot chance from an awareness stat plus a gear bonus; a fixed small spotting XP from zone data; night frequency higher from zone data; a daytime encounter class per tile.

## 4. For Frankendom

- The spot-before-engage rule maps to our many-vs-one case. Roll whether the 1 to 3 attackers in a zone group are spotted before contact. Spotted gives a yes or no to engage (the engage is a state change, ruling). Unspotted is an ambush with no prompt. The same engine runs both; only the pre-warning differs.
- Keep: the two-roll structure (chance per step, then a separate spotting roll). Change: the skill cap and bonuses are our stats; the XP is a fixed zone-data value, not 100 minus skill. The donor's XP rises as skill falls, which is a catch-up for weak characters; if we keep it, name it as catch-up in the data.
- Walk density (what appears about every 20 s of walking): the donor's per-step encounter class per tile and per day part is exactly walk density as data. Our zones (700 as data) carry a class per tile and per time band. Row 23 (zone population) governs spawns and despawns; this rule governs the walk-in.
- Premade archetypes (three premade roles plus a custom path) fit the first-30-minute choice. Keep: three starting roles and a custom path. Change: our art, names and stats. One character, one ledger: a premade is a starting data row, not a second save.
- Opening: the donor stacks three movies before the menu. Ours should be one short opening with skip on any input, as in the Arena note.
- Level-up: keep the hit points formula shape (endurance-based, with a perk bonus) and the pending level-up state (the choice is deferred until the player is ready). Change: the server emits the XP event; the client shows the sound and pop-up (row 18).

## 5. Five-minute look test (Dom, phone)

Build one 375-wide world-map strip with 30 steps: a moving dot, a blinking icon on rolled steps, and a prompt on spotted steps only. Two passes: a day pass and a night pass with the frequency higher. Dom walks, then says whether the prompt reads as a choice, whether the blink is visible at a glance, and whether an unspotted ambush feels fair. Compare against an always-prompt version.

## 6. Licence and IP

Sustainable Use License 1.0 (LICENSE.md line 1). Clean-room, shape only. The rule is a mechanic: a chance roll, a skill-based spotting roll, a yes or no choice, a small XP reward. The donor's numbers, names, file layout and text are not used. Recreate with our own names and our own numbers; change the movies, art and character names. No legal conclusion.

## 7. Gaps

- Not in the box: the data pack (master.dat, critter.dat, patch000.dat, data folder). So the first map, first fight, first loot, town, services, dialogue and the text of every message are not read.
- The movie files (.mve) are not in the box; their lengths are unknown. The lookup tries a localised folder first, then the default cuts folder (game_movie.cc lines 153 to 160).
- The sfall timer config (ARTIMER1 to 4 at 90, 180, 270 and 360, sfall_config.cc lines 56 to 59) is read as values only; units and meaning were not read. Treat as an unknown timed-event hook.
- Half read: client (engine source only). The paired data pack is not in the box. The sibling alexbatalov-fallout1-ce is in the box (audit AU002) but was not read here.
- Not read: the next-level helper for the XP thresholds; the level-up screen; the pending level-up consumer; the premade starting stats; the death and game-over screens (src/endgame.cc not opened).

## Onboarding detail (per the focus brief)

(1) First 90 seconds: up to three movies (logo, intro, credits) before the menu, then the character selector, then the elder movie (main.cc 84 to 125). No tutorial text found. (2) First fight and first hit: not in the engine source; the first encounter and its winnability are data in the pack. The encounter-spotting rule in section 3 is the closest first-hit mechanism. (3) First reward and level: XP from kills and from spotting; a level-up sound and a pending state (stat.cc 764 to 766). Loot and first key are not reached in engine code. (4) First hub: not reached; the starting map and services are data. (5) First meaningful choice: premade or custom at the selector; engage or avoid at a spotted encounter. (6) Pull-forward: the blinking icon and the city-reveal from a special encounter (worldmap.cc 3437, 3443). The 5, 10 and 30 minute hooks are data. (7) Tutorial style: none in code. Show-don't-tell by movies and prompts. Skip flag exists for opening movies (main.cc 84 to 91; default value not read). (8) Drop-off risks: three movies before the menu; a custom path that asks many questions. Avoided: a spotted encounter always gives a choice, and an unspotted one still plays out. (9) Could be ours at 20-30 percent resemblance: a spot-before-engage prompt on the world map, a skill that buys a warning, and a level-up with a pending choice.

Reuse tag: idea only (no code reused).
Brief rule served: onboarding-first-30min, keep the idea, licence-safe.
