# l1j-en-classic (world-fiction, WF007)

Donor: l1j-en-classic, a Java server emulator for Lineage 1 (English). Donor tree on the VPS at /mnt/frankendom-donors/l1j-en-classic/, read over read-only ssh.
Half read: DATA (db/l1jdb_m10.sql tables, data/ text files, data/xml/NpcActions/Quest.xml and Teleporter.xml). Server code read only for the NPC chat packet and chat table loader (src/l1j/server/server/serverpackets/S_NpcChatPacket.java, src/l1j/server/server/datatables/NpcChatTable.java). The matching client half is absent from the box by design (AU029). Client-side string ids and HTML pages are referenced here but not in the box.
Licence: code and data under GPL-2.0 (COPYING; README.md line 115). Game content is class C (no rights-holder statement; README line 84 says clean room). Category-level inspiration only.

## 1. What the player sees and feels
Walking into a Lineage-style town, the first thing that tells you where you are is a name built from a place plus a function: a dungeon named by region and floor (the area table has a "<Place> Dungeon <n>F" pattern), a tower, a castle, a town. NPCs carry one flat name, and the hostile ones wear a corruption word in front of a base creature. A "Cursed", "Contaminated" or "Polluted" Orc or Dark Elf reads at a glance as the same family, one step darker. Signs stand at crossings, and notice boards and a ranking board sit in the towns. Quest-givers talk in a set order across a level-gated ladder, so a player meets a small cast of named NPCs in a fixed order and each step is one short exchange.

## 2. Why it works / is striking
- Readable at 375 wide: a short name with one prefix word, the tier readable from the first word. The name field is 60 characters at most in the table, so the phone label has to be short.
- One signature behaviour: a corruption prefix that also carries onto the drop. The drop list names an item with the same prefix (for example a "Polluted" fire item dropped by a "Polluted Great Spirit of Fire" row), so the tier is felt twice: on the creature and on the loot.
- One signature sound or effect: none in this half (no client audio or effect data in the box). Not read as a sound cue.
- Could be made ours at 20-30 percent resemblance: yes. The prefix ladder and the element family ("Great Spirit of <element>") are generic structures; the names and quest text are not ours to reuse.

## 3. The rule behind it
Naming grammar (all counts from grep on db/l1jdb_m10.sql, not de-duplicated):
- npc table: 2,747 INSERT rows; 2,733 have a non-blank name. Implementation types: L1Monster 1,285; L1Merchant 635; L1Npc 216; L1Housekeeper 129; L1Guard 116; L1Teleporter 109; L1FieldObject 95; L1Dwarf 37; L1Board 9; L1Signboard 6; L1Tower 6; L1Guardian 6.
- Corruption tier prefixes on one base family: names starting "Cursed" 59 rows (a Dark Elf family), "Contaminated" 22 rows (13 base names, for example an Orc base), "Polluted" 20 rows (a six-element Great Spirit family: Darkness, Earth, Fire, Light, Water, Wind, plus Orc, Elf, Human and other bases). Receipts: db/l1jdb_m10.sql line 20735 (Contaminated Orc), line 20736 (Contaminated Orc Archer), line 21387 (Cursed Dark Elf Knight), line 12464 (drop named Polluted Fire).
- Placeholder names: the token "Unknown" occurs 161 times across npc name fields, and lower-case "unknown" is used on more rows. Treat as an unnamed-slot convention.
- Elemental family: one base ("Great Spirit") and a six-element suffix; the polluted tier is the same base with a prefix (line 10980 base drop, line 12462-12464 polluted drops).
- Tower names: "Guardian Tower" and "Guard Tower: <name>" (six L1Tower rows): a role then a colon then a proper name.
- Area names (area table, 565 INSERT rows, 355 distinct names): "Talking Island Dungeon 1F" style floor suffixes (36 names match a dungeon-floor pattern), "Tower" as a repeated word (about 100 mapids rows), town-name prefixes ("Aden", "Giran", "Heine" with dozens of rows each).
- Signage: 6 "Sign Post" rows (L1Signboard), each with a client string id, not text (db/l1jdb_m10.sql line 23219). Message boards: 9 L1Board rows, 7 named "Message Board", one "Ranking Board", one "Unknown". The seeded board table is empty (0 rows); the board_auction table has 53 seed rows (counted only, not opened).
- Faction map: 10 town rows (town table, line 63610 to 63619) and 8 castle rows (castle table, line 3608, names mostly place names, war_time dated 2008 in the seed rows). Six of the ten town rows carry a second name field (a leader-style handle); four are null. Treat the handle field as data, not copy.
- Guard names are the faction map: 116 L1Guard rows, with names like "<Town> Guard", "<Castle> Castle Guard", "<Town> Mercenary Squad" (Kent, Aden, Windawood, Giran, Gerard, Heine, Dwarf, Orcish). Receipts: line 3608 (Kent Castle row) for the castle list.

Rumour and sign text:
- npcchat table: 41 rows. All 41 chat ids are client string references ($ ids) and none are literal text (receipt line 24492). Flags: is_shout 13, is_world_chat 0, is_repeat 6. So ambient NPC lines are timed shouts or repeats, not sentences in the box.
- For normal chat (type 0), the packet prefixes the NPC name to the string (src/l1j/server/server/serverpackets/S_NpcChatPacket.java line 41), so the line reads as "<name>: <line>" to the player. Other chat types (shout, world chat) use other prefixes (lines 48-54, read in passing).
- Announcements (5 lines) and the in-game news line (1 line) are server setup text, not world fiction. badnames.txt (73 lines) is a name filter, not read line by line.

Zone telling a story in three lines: not found as three lines of prose in the box. The nearest is the quest ladder: Quest.xml has 58 comment headers in the form "Lv<level> <Quest> / <Giver>". The Level15 Royal ladder runs in three beats: the first giver sets step 1 (Quest.xml line 9), the second giver sets step 2 (line 21), and the End is set on the last beat (lines 11 and 23). The four level ladders (Level15, Level30, Level45, Level50) and story chains (shadows, kamyla, desire, lizard) show a three-to-five step arc per ladder. The Teleporter.xml file has 467 Teleport elements behind 482 Action elements; this is a route map, not prose.

## 4. For Frankendom
- 700 zones as data: zone names come from one grammar (place + function + floor suffix for vertical dungeons), so a zone is data, not a new hand-written name each time. Keep the floor suffix for the Pit-like vertical spaces.
- 100 Pit characters reused across zones: the corruption prefix ladder (base family + tier word + element) gives the same creature family a readable tier in each zone. Keep the tier word; change the words (our own), and tie the prefix to the recolour tier and the loot tier, so one data field drives three things.
- Many-vs-one: an NPC group named by its faction ("<Town> Guard") maps to a hate list on the engine side; the name is presentation, the faction is the rule.
- Server-verified events: the castle war_time rows are a scheduled event (world-events, timed-event). The NPC shouts are timed and repeating (npcchat interval and repeat fields), which is a data field for ambient lines, not logic.
- Keep: prefix tier on the creature and on the drop; short names for the phone label; the guard-by-town faction map; one shout per NPC on a timer.
- Change: the corruption words (use our own), the element list (ours), the castle-war schedule (use our world's cadence), and everything client-side (no string ids; write text in our data).

## 5. Five-minute look test
Build a zone entrance card and a corruption ladder card for three creatures in one family (tier 0, 1, 2). Dom looks on a phone at 375 wide: does the tier read from the first word of the name, does the drop name carry the same tier, and does the zone name read as place plus function in under two seconds. Compare against the current Pit label. Pass if the tier word is readable from the name alone and the drop name matches it.

## 6. Licence and IP
Code and data: GPL-2.0 (COPYING line 1; README.md line 115). Game content (names, quest text, drop names, castle names): no rights-holder is named and the README says the project is a clean-room server for a named target client (README line 84). Treat all game-derived names and text as class C. Inspiration stays category-level: "a corruption prefix ladder on a creature family" is fine; copying a family name or a quest step is not. Recreate with our own words, name the kept trait (tier word on creature and drop) and the changed trait (our words, our element set).

## 7. Gaps and half read
- Half read: data (db tables, data text, Quest.xml, Teleporter.xml). Server code read only for the chat packet and chat table loader. Client half absent by design.
- Not read: the full Teleporter.xml body (only the counts and comment labels), the full Quest.xml bodies beyond the Level15 chain and headers, board_auction rows (count only), mail and letter (seed rows not checked), badnames.txt contents (count only), idstate.dat (binary), db/archive and db/optional folders, the ShowHtml client page ids (client-side, absent from the box).
- Not in this half: death and respawn presentation, loot reveal ceremony, idle animation vocabulary, walk density (spawnlist tables not read for this topic), readability of sign text (client-side text not in the box).
- Counts from grep and python tallies over the SQL inserts; they are row counts, not de-duplicated, and the name-token counts are token occurrences.
