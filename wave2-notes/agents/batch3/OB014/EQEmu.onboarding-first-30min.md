# EQEmu (onboarding-first-30min, OB014)

Donor/Licence: EQEmu. Code GPL-3.0 (LICENSE.md line 3, per AU018). Game content is an emulator of a commercial MMO; the SQL content has unclear status (Class C in AU018). Shape only: no values, names or text carried over.

Checked: world/worlddb.cpp (login tutorial flag, GetStartZone, SoF/Titanium start fallbacks), world/client.cpp (tutorial entry at 891-911, create-time override at 1835-1842), common/ruletypes.h, common/eq_constants.h, common/shareddb.cpp (SetStartingItems 431-520), zone/exp.cpp (XP and level-up, 600-630, 806, 916-917), zone/client_packet.cpp (6359), zone/client_process.cpp (1665-1700), common/dynamic_zone_base.h/.cpp, utils/sql/svn/2024_required_update.sql. Confidence high on the server rules and table shapes. Low on anything content-facing, because the content is not in the tree.

Half read: server, plus the one starter data table that is in the tree (char_create_combinations). Client: not in the tree (client_files holds only CMake, export and import). Tutorial zone scripts, start_zones rows, starting_items rows and spawn data are not in the donor tree (0 INSERT statements for start_zones or starting_items under utils/; the server reads them from a content database this box does not hold).

Depth: thin.

## 1. What the player sees and feels
On the character screen, a new character at level 10 or below gets an optional Tutorial button. Pressing it sends the character to a separate zone (zone 189, labelled in code as "The Mines of Gloomingdeep") instead of the normal start. The tutorial zone itself is safe from fall damage. Trainers greet the player with one of four random lines, and the first XP gain shows a level-up message, optionally with the raw XP numbers. Nothing in this tree shows the tutorial's text, first fight or first loot; those live in quest scripts and the client.

## 2. Why it works / is striking (criteria)
- Readable at 375 wide: not testable from server code (client not in tree).
- One signature behaviour: an optional intro that is offered once, at the start, and closes at a level (MaxLevelForTutorial, default 10). The player chooses it; it is not forced.
- One signature sound or effect: not in tree.
- Could be ours at 20-30 percent: "an optional intro zone on the character screen that closes at level 10", plus a comeback button after a long offline gap.

## 3. The rule behind it (numbers as data)
- Tutorial gate, two checks: the login flag is set when level is at or below the cap (world/worlddb.cpp:179), and entry re-checks the level from the character row (world/client.cpp:891-911). Inferred purpose: the second check guards against a stale login flag (not stated in code).
- Start location: one start_zones row per (zone or player choice, class, deity, race) gives position, heading and bind point. If no row matches, a hard-coded fallback drops the character at fixed coordinates in Crescent Reach (world/worlddb.cpp:626-630). Titanium clients send a starting-city choice, not a zone id (world/worlddb.cpp:532-534). Two parallel code paths.
- Valid creation combinations: char_create_combinations is a table of allowed (race, class, deity, allocation, start zone) tuples. 641 rows in utils/sql/svn/2024_required_update.sql from line 11. 301 of them (47 percent) point at Crescent Reach (zone 394). 21 distinct start zones, 13 races, 14 classes, 16 deities. 14 rows did not parse cleanly in my count (not checked).
- Starting kit: a starting_items table, each row with four filter lists (class, race, deity, zone) where a first entry of 0 means any, plus item, charges, six augment fields, a slot, and expansion bounds (common/shareddb.cpp:431-500; wildcard test at 466). A slot below the charm slots is auto-placed into a free slot (shareddb.cpp:515). Table rows: not in tree.
- Death protection by level: experience loss on death starts at level 10 (common/ruletypes.h:45); items stay on the corpse from level 10 only when corpse-leaving is on (ruletypes.h:47).
- Level-up: a level-gain message (zone/exp.cpp:806), a level-up script hook (exp.cpp:916-917), and a guild broadcast (exp.cpp:985). The XP message has a display rule: 0 normal, 1 raw numbers, 2 raw numbers plus percent (ruletypes.h:68; exp.cpp:620-626).
- Comeback: a return-home button appears when the last login is older than a threshold (default 21600 s, six hours) (ruletypes.h:316, 319; world/worlddb.cpp:172-176; world/client.cpp:869-871).

Data fields (donor value null: GPL donor, so no donor values are recorded):
- tutorial_max_level | level | null
- tutorial_zone_id | zone id | null
- death_exp_loss_min_level | level | null
- death_item_loss_min_level | level | null
- return_home_offline_threshold | seconds | null
- exp_value_display | 0/1/2 | null
- start_location_row | (race, class, deity, zone) -> x, y, z, heading, bind | null
- starting_kit_row | filters (class, race, deity, zone; 0 = any), item, charges, slot | null

## 4. For Frankendom
- Start location: one row per (race, class, deity) pointing at one of our 700 zone rows, plus one fallback row. Keep the table. Change: no hard-coded coordinates in code, and one resolver for every client (the donor has two paths).
- Starting kit: keep the 0-means-any filter. It is the same grant path as loot, so the grant is server-verified and appears in the one ledger.
- Tutorial: keep the optional, level-gated intro, but as a zone row among the 700 with a first-run flag, not a separate runtime. Change: our opening is the gladiator-ring fight, so the intro is a skip-or-play choice on the character screen, not a second world.
- Death floor: keep the level-gated floor on death penalties as one data field (death_exp_loss_min_level).
- Level-up: the server emits one event with levels gained (the donor does this as a script hook). The client decides the celebration (camera, banner, sound), per the rulings.
- Comeback: keep the return-home threshold as a data field. It is a pull-forward at hour six, not minute 30.

## 5. Five-minute look test (Dom, phone)
Build a three-card prototype at 375 wide: (a) character screen with an optional intro toggle that greys out after level 10; (b) a start hub where a trainer greets with one of four lines; (c) a first kill that shows a level-up banner with XP hidden (display 0) and with XP shown (display 1). Dom judges which the first 30 seconds need, and whether the greyed-out toggle makes him want to level to 10 before it closes.

## 6. Licence and IP
Code GPL-3.0: clean-room. Shape only, not code. Content: game-derived with unclear status (AU018 Class C). Inspiration is category level only: "an optional intro zone that closes at a level" and "a comeback button after a long offline gap". Our names, values and text. No legal conclusions.

## 7. Onboarding map (first 30 minutes)
1. First 90 seconds: character screen with the optional intro; no in-zone text in tree (not read: client, scripts).
2. First fight / kill / hit feedback: not in tree. The tutorial zone has no fall damage (zone/client_packet.cpp:6359); nothing else about winnability is in the server code read.
3. First reward and level: starting kit (table rows not in tree); level-up message and hook (exp.cpp:806, 916-917); XP display rule (ruletypes.h:68).
4. First hub and services: start zone by race/class (table rows not in tree; fallback in code). Trainer greetings: four random string IDs (zone/client_process.cpp:1668; IDs 1204-1207). Bank and shop introduction: not in tree.
5. First meaningful choice: class, race and deity from char_create_combinations (641 rows). The choice of starting zone is data, not logic.
6. Pull-forward at minute 5, 10, 30: a closing door (tutorial cap at level 10, ruletypes.h:317); comeback button at six hours offline. No rumour, rival or visible next goal in tree.
7. Tutorial style: optional, not forced; skippable by not pressing it; text length not in tree.
8. Drop-off risks: avoided: no XP loss on death below level 10. Present: two parallel start-location code paths and a hard-coded fallback (worlddb.cpp:626-630).
9. Could be ours at 20-30 percent: the optional intro on the character screen and the level-10 closing door. Look test: section 5.

## Also reported where the donor has it
- Idle and ambient behaviours: not in tree.
- Death and respawn presentation: server rules only (section 3); client presentation not in tree.
- Loot reveal ceremony: not in tree.
- Walk density: not in tree.
- Readability at 375 wide: not testable from this tree.

## Gaps (not read / not in tree)
- Client (not in tree). Tutorial scripts and NPC text (not in tree). start_zones and starting_items rows (not in tree). Client string tables (greeting IDs referenced; string text not in tree). Zone spawns, first-quest data, bank/shop intro (not in tree).
- 14 rows of char_create_combinations did not parse cleanly (not checked).
- Half read: server, plus char_create_combinations and rule_values from the SQL under utils/. Receipts: receipts.tsv in this folder (verified with verify_receipts.py).
