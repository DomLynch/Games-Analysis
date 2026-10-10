# kcopelandmgmt-Shadowbane (asset audit, reader AU028)

Donor/Licence line: code MIT (LICENSE lines 9-11, plain MIT text, no extra clause in this copy). Assets: none in the box. Best class D.

Checked: top level (LICENSE, README.md, .gitignore, src/), file count by type (827 files: 824 .java, README.md, LICENSE, .gitignore; 0 .sql, 0 data files), src/engine/gameManager/LootManager.java (init lines 49-68 and the roll functions lines 69-300 read or grep-read), src/engine/powers/DamageShield.java, src/engine/mobileAI/Threads/MobRespawnThread.java (lines 36-58), src/engine/mobileAI/MobAI.java (CheckForAggro lines 703-760), src/engine/loot/GenTableEntry.java, src/engine/loot/ItemTableEntry.java (rollTable). Receipts: 89 rows across the four donors, all pass verify_receipts.

## Halves
- Server half: READ (src/engine/). This is a Java server emulator; game logic, loot, AI and respawn are here.
- Client half: NOT IN THE BOX. The tree has only src/discord (a chat bot) and src/engine (server). No client, no art, no sound.
- Data half: the game records (loot tables, mob base data, powers, items) are loaded from a database through DbManager.LootQueries (LootManager.java line 53 and the three lines after). No SQL dump or data file is in the box, so the data half is NOT IN THE BOX; I did not look outside the tree.

## Licences (as the files say)
- LICENSE line 9: MIT License; line 11: Permission is hereby granted, free of charge, to any person obtaining a copy. The header in lines 1-7 names the 'Magicbane Emulator Project 2013 - 2022'.
- README line 29: Project is released under an MIT license. README line 13: the project is an emulator for the Ubisoft MMO Shadowbane. README line 5: 'The Community written Shadowbane emulator'.
- Rights holder: Magicbane Team (LICENSE header). The files say the original game is a Ubisoft MMO (README line 13); they do not state who holds the original game rights: unknown.

## Asset inventory
- None. No art, audio, maps, fonts or text tables are in the tree. The only non-code files are README.md, LICENSE and .gitignore.
- Text that is present: code comments and strings only. For example the server-wide chat announcement for rare drops in GenerateMobLoot (LootManager.java lines 69-97; not quoted here).

## Class per group
- Non-code content: none. Best class D.
- Code (MIT): usable with the MIT notice kept. Code is not an asset group, but the MIT notice is the only condition.

## Data first (name and loot tables)
The loot tables are the four maps in LootManager (_genTables, _itemTables, _modTables, _modTypeTables) loaded from the database at LootManager.java lines 53-56, with the row classes in src/engine/loot/ (GenTableEntry.java lines 1-45 read; ItemTableEntry rollTable read via grep). Those rows are the data; their contents are not in the box.

## Inspiration (own words; the code is MIT and may be adapted with the notice kept; mechanism shape only)
- Three-stage loot pick: a d100 roll chooses a row of a gen table, that row names an item table, a d320 roll (or a level-scaled roll for mobs) chooses the item, then prefix and suffix mod tables each run their own d100 and d320 roll (LootManager.java lines 138-200; prefix and suffix functions from line 202 and 234). Idea: an item is a base plus two independent modifier draws. Change the mod families and names.
- Level-scaled roll window (TableRoll, LootManager.java lines 266-286): the window's bottom rises with the mob's level (line 276), the level is capped at 65 (line 268), and the window tops out at 319 (lines 273-274). Idea: higher-level mobs roll better items on a sliding window. Change the curve and the cap.
- Hot-zone second roll per booty set: RunBootySet (lines 98-136) makes the normal roll, then one extra roll on the next table ID in a hot zone, only once per booty set (line 125). Idea: one bonus bite per encounter in risky zones. Change: an explicit bonus-table field, not a +1 convention.
- Respawn gate per zone: MobRespawnThread (lines 36-58) gives each zone a queue and respawns at most one mob per zone per 100 ms (line 42, line 51). Idea: a rate limit per zone, so a wiped zone cannot flood. Change the gate length and add the zone cap (row 23).
- Race-filtered aggro: CheckForAggro (MobAI.java lines 703-760) skips player races on a mob's not-enemy list (line 738 comment; check at about line 740), requires the race to be on the enemy list if one is set, then checks range (line 748). Idea: a per-mob faction filter. Change to our faction model; keep it inside the engine (hate list ruling).
- Gold drop: GenerateGoldDrop (LootManager.java lines 289-302, grep-read) makes a d100 chance check against dropChance, then a random amount between two bounds. Idea: chance first, then amount, as two data numbers per table row.

## Defect found (keep the idea, fix the defect)
- Hot-zone roll overflow: TableRoll (LootManager.java lines 266-286). At level 60 and above in a hot zone the lower bound (line 276, 4.469 x level minus 3.469) plus the level (line 282) goes past the 319 cap (lines 273-274), so nextInt(min, max + 1) gets origin at or above bound. Java's Random nextInt throws IllegalArgumentException in that case (Java API behaviour, not run). This is derived from the arithmetic; I did not execute the code. Fix: clamp min to max before the roll and keep the hot-zone shift bounded.
- Hot-zone table convention: line 125 uses genTable + 1 as the bonus table. Fix: store the bonus table ID in data.

## Briefs
See the .assets.json briefs array (five briefs: hot-zone bonus, mod-stacked item, zone respawn gate, level-window drop, race-filtered aggro). Creatures are not in the box, so creature briefs are none. Dom rule: a distinct original, never a copy.

## Cross-link (cell topics)
- loot: rows 18 (loot roll) and the drop ceremony: the code has the mechanism, no art or sound.
- spawns: respawn gate (row 23).
- AI: aggro filter (row 2 and row 4).

## Not read
- Most of the 824 .java files: only the loot, respawn, aggro, and damage-shield files named above were opened.
- CombatManager.java (1,441 lines), MobAI.java beyond CheckForAggro, PowersManager.java, NPCManager.java (grep-read only), discord/ folder.
- Database content (none in the box).
