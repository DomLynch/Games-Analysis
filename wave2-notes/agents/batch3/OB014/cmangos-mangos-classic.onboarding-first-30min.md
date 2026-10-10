# cmangos-mangos-classic (onboarding-first-30min, OB014)

Donor/Licence: cmangos-mangos-classic. Code GPL-2.0 (LICENSE; README line 65, per AU010). Game content: COPYRIGHT.md names World of Warcraft content as Blizzard's copyright and trademark, and says the project is not affiliated with Blizzard (AU010). Class C for content. Shape only: no values, names or text carried over.

Checked: src/game/Globals/ObjectMgr.cpp (playercreateinfo and playercreateinfo_item loads, GetBaseXP), src/game/Entities/Player.cpp (Create 747-840, starting items 908-911, GiveXP 2668, GiveLevel 2707-2721, CheckAreaExploreAndOutdoor 6148-6255, SendExplorationExperience 16453), src/game/Entities/CharacterHandler.cpp (tutorial opcodes 1087-1118), src/game/Server/WorldSession.h and .cpp (tutorial bits 352-363, 860, 1117-1183), src/game/World/World.cpp (start level, start money, explore rate), sql/base/mangos.sql (playercreateinfo and its companion tables, item_template, creature_template, quest_template schema), sql/base/characters.sql (character_tutorial schema), sql/archive/0.5/1282_playercreateinfo_item.sql.

Confidence: high on the server-side mechanisms and table shapes. Low on any first-30-minute content, because the content rows are not in this tree.

Half read: server, plus the data tables present in sql/base. Client: not in tree. Data halves not present: quest_template rows, creature spawn and NPC rows, trainer and gossip content beyond 17 gossip_menu_option rows, starting-kit rows for the current schema.

Depth: thin.

## 1. What the player sees and feels
A new character is placed at one fixed spot per race (six start zones across eight races). The character starts at the configured start level and money (defaults in code: level 1, 0 copper). Once-only client hints are stored as 256 bits per account, so the same tip is not shown twice. Each new area walked into gives a small XP award, once per area, and the server sends the client the area id and the award in one packet (client display not in tree). A level-up sends a packet with the stat gains for the client to present (client display not in tree). The hints themselves, the starting kit, the first quest and the first fight are not in this tree.

## 2. Why it works / is striking (criteria)
- Readable at 375 wide: not testable from server code.
- One signature behaviour: a reward for walking into each area once, scaled by how far the character is above or below the area's level. This is the hook for minutes 5-30 that needs no quest.
- One signature sound or effect: not in tree (client).
- Could be ours at 20-30 percent: "first visit to each zone pays a scaled XP award and a toast; over-levelled visits pay less; under-levelled visits get a floor".

## 3. The rule behind it (numbers as data)
- Start location: 40 rows in sql/base/mangos.sql (INSERT at line 8039, rows 8040-8079), one per (race, class). Eight races, six zones (IDs 1, 12, 14, 85, 141, 215). Every class within a race shares one position in every row. The class dimension does no work in this table.
- Create: the start level comes from the StartPlayerLevel setting, default 1 (World.cpp:551). Start money from StartPlayerMoney, default 0 (World.cpp:553). Player::Create sets map, position and orientation from the row (Player.cpp:779-780).
- Starting kit: loaded from playercreateinfo_item (ObjectMgr.cpp:3157), then stored into the best free slots (Player.cpp:910-911). No insert rows for playercreateinfo_item in the current tree; an archived 0.5-era insert with about 336 tuples exists at sql/archive/0.5/1282_playercreateinfo_item.sql line 4. I did not check that old schema against the current one, so I do not use it.
- Starting abilities: playercreateinfo_spell (1496 rows), playercreateinfo_action (217 rows, action bar), playercreateinfo_skills (77 rows), all in sql/base/mangos.sql.
- One-time hints: eight 32-bit words per account, 256 bits (WorldSession.h:860). Loaded by account (WorldSession.cpp:1122). Set one bit per request (CharacterHandler.cpp:1100), clear-all sets every word to all ones, reset-all sets all zeros (CharacterHandler.cpp:1107-1118). Stored in character_tutorial (sql/base/characters.sql:613).
- Exploration XP (once per area): the area's bit in the explored-zones field is checked (Player.cpp:6211) and set (Player.cpp:6213). Only areas with an area level above zero pay XP (Player.cpp:6220). Let d = character level minus area level (Player.cpp:6231):
  - d below -5: XP = base XP at (character level + 5) times the explore rate (Player.cpp:6235).
  - d above 5: percent = 100 minus 5 times (d minus 5), clamped to 0-100 (Player.cpp:6239); XP = base XP at area level times percent / 100 times the rate (Player.cpp:6245).
  - otherwise: XP = base XP at area level times the rate.
  - At the level cap the packet is sent with 0 XP (Player.cpp:6227). XP goes through GiveXP (Player.cpp:6252), and the client gets the area id and XP in one packet (Player.cpp:16455).
  - Explore rate: Rate.XP.Explore, default 1.0 (World.cpp:424).
- Level-up: GiveXP loops while the XP pool exceeds the next threshold, calling GiveLevel (Player.cpp:2668-2696). GiveLevel sends the level-up packet (Player.cpp:2721).
- Base XP lookup: ObjectMgr::GetBaseXP returns 0 for a level missing from the table (ObjectMgr.cpp:7229-7233).

Data fields (donor value null: GPL donor, so no donor values are recorded):
- start_level | level | null
- start_money | copper | null
- start_location_row | (race, class) -> map, zone, x, y, z, orientation | null
- explore_rate | multiplier | null
- explore_over_threshold | levels | null
- explore_over_step | percent per level | null
- explore_floor_offset | levels | null
- tutorial_flag_bits | bits per account | null

## 4. For Frankendom
- Discovery XP: keep the once-per-zone bit in the one ledger and the level-difference scaling. Each of our 700 zone rows carries its zone level. The XP award is server-verified; the toast is client presentation (per the rulings).
- Floor for under-levelled visits: keep it, but as a named data field (explore_floor_offset). Its intent is not written down in the donor, so confirm with Dom before we copy it.
- Start location: the race-to-zone table shape is useful. Frankendom's opening is the gladiator-ring fight, so the start table picks the ring and the hub, not a tutorial zone. The class column is redundant in the donor; leave it out unless a class needs its own spawn.
- One-time hints: the 256-bit flag array per account is a cheap way to show each tip once. Keep as a bit array in the one ledger.
- Level-up: keep one server packet with the stat gains. The client decides the banner and sound.
- Change: the donor's percent path divides before applying the rate (see below), and it reads its floor from the player's own level rather than the area's.

Defects, with fixes (idea kept, defect fixed in the sketch):
1. Player.cpp:6245 applies integer division (/ 100) before the float rate. Fix: compute base times percent times rate in float, divide by 100.0f once, then floor.
2. Player.cpp:6235 uses the player's level plus 5 for the far-below branch, not the area level. Fix: keep the branch, name the offset as the data field explore_floor_offset, and mark the intent as unconfirmed.
3. Player.cpp:6211-6213 sets the explored bit before the area-level check, so an area with area level 0 is marked explored but never pays. Not a defect as far as I can see; note only.

## 5. Five-minute look test (Dom, phone)
Build a 60-second phone walk through six fog zones. Each first entry shows a two-second toast with a number. Three runs: (a) flat award; (b) the donor's curve (full, reduced for over-levelled visits, floor for under-levelled visits); (c) the donor's curve with the integer step fixed. Dom picks the run where he wants to walk to the next zone, and says whether the toast number is worth seeing.

## 6. Licence and IP
Code GPL-2.0: clean-room, shape only. Content: Blizzard-owned per the repo's COPYRIGHT.md; the origin of the SQL dumps is not stated (AU010 Class C). Inspiration is category level only: "a once-per-zone discovery award scaled by level gap" and "a one-time hint bit array". Our names, values and text. No legal conclusions.

## 7. Onboarding map (first 30 minutes)
1. First 90 seconds: fixed start per race (playercreateinfo rows). Opening text and first screen: not in tree.
2. First fight, first kill, first hit feedback: not in tree. creature_template holds one row (sql/base/mangos.sql:1335). quest_template has a schema but no rows (line 10145).
3. First reward and level: discovery XP for each new area (Player.cpp:6211-6253); level-up packet (Player.cpp:2721). Starting kit rows not in the current tree.
4. First hub and services: not in tree. Start-zone trainer and bank data are not in the current rows. gossip_menu_option has 17 rows (not read).
5. First meaningful choice: race and class (40 start rows). The spell, action and skill sets for each are data (1496, 217, 77 rows).
6. Pull-forward at minute 5, 10, 30: discovery XP is a reward for walking. No quest chain, rival or rumour in the tree.
7. Tutorial style: none forced. One-time hints are bits the client sets (client content not in tree). Text length: not in tree.
8. Drop-off risks: the discovery award shrinks for over-levelled visits, so a high-level player gets little from starter zones (intentional by design). The percent truncation (defect 1) makes small awards round down.
9. Could be ours at 20-30 percent: the discovery toast and the scaled award. Look test: section 5.

## Also reported where the donor has it
- Idle and ambient behaviours: not in tree.
- Death and respawn presentation: not read in this pass.
- Loot reveal ceremony: not in tree.
- Walk density: the discovery award is a walk reward; the density of areas per walk is not in tree.
- Readability at 375 wide: not testable from this tree.

## Gaps (not read / not in tree)
- Client (not in tree). Quest and creature content (not in tree). The starting kit for the current schema (not in tree; archived 0.5 insert not checked). AreaTable (area levels and names) is not in tree: the explore rule reads area_level from it, so the values are not checked. Warden, font, screenshot binaries not opened. Death and respawn code not read.
- Half read: server, plus sql/base data (counts below).
- Counts (sql/base/mangos.sql, rows read by line count; the warden and archive files are not counted): playercreateinfo 40; playercreateinfo_spell 1496; playercreateinfo_action 217; playercreateinfo_skills 77; item_template 74; creature_template 1; quest_template 0; mangos_string 884 (IDs 1-1703, sparse); player_xp_for_level 59; player_levelstats 2400; player_classlevelstats 540; gossip_menu_option 17.
- Receipts: receipts.tsv in this folder (verified with verify_receipts.py).
