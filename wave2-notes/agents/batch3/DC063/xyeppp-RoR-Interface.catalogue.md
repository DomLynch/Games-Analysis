# xyeppp-RoR-Interface (design catalogue, cell DC063)

Donor: /mnt/frankendom-donors/xyeppp-RoR-Interface/ (VPS only, read-only; the audit counted 11206 files)
Half read: the client UI half only. Read: interface/default (death, screen-flash and loot windows, window list), interface/interfacecore/tome (CSV headers and row counts; the bestiary, armoury, sigil, title and achievement tables), and one NO_DEHASH XML file for layout. The server half is not in the box (README.md line 2 says this is the UI source; the top level holds only interface/, NO_DEHASH/ and README.md). No paired donor for the server half exists in this box.
Licence: none stated. There is no LICENSE file and the README has no licence line. Module headers credit the publisher (ea_mainmenuwindow module header, author line). Asset class C. Category level only: no creature names, no lore text, no coordinates, no exact art. Recreate as clearly distinct originals, never copies.
Rule for every idea below: recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT and the trait CHANGED.

Counts (line counts from the files, awk for the distributions; none of these is a receipt):
- Creature rows: 162 (bestiary/species.csv, header excluded). 34 distinct subtypes used out of 35 subtype rows. 7 type rows.
- Realm groups: 3 values (310 rows, 38 / 140 / 132).
- Classes: 24 career columns (oldworldarmory/armor_set_entries.csv header; career_column_entries.csv has 24 rows).
- Gear sets: 38 armour sets with tiers (tier counts 5, 6, 5 and 22 for tiers 1 to 4).
- Weapons: 0 in the box that were read. No weapon table was found in the tome folders.
- Zones: 0 counted. The zone and quest XML (6 files in NO_DEHASH/xml) was not read beyond one file for layout.

## 1. Creatures and beasts

Tables (data first):
- bestiary/species.csv: one row per creature. Columns: ID, subtype, portrait image, armour-class number, then up to ten type/id pairs. Row shape and first row: line 1 header, line 2 data (receipt).
- bestiary/subtypes.csv: 35 rows, each a subtype that points to a type and a portrait. These are the creature families.
- bestiary/types.csv: 7 type rows with ids only. The names are not in the box.
- bestiary/realms.csv: 310 rows, each a creature id with one of three realm values.

Families (category words only, from the first ten of 35 subtype image names read; not exhaustive; no names copied): spirit-kin, beast-kin, daemonic, giant-kind, elf-kin and dragon-class. 34 subtypes are in use.

Tier signal: the armour-class column (species.csv column 4) spans 0 to 644. Its values cluster in three bands, roughly 0 to 138, 250 to 273 and 620 to 644 (awk count, not receipted). This is the only tier-like number in the box. Reading it as three threat tiers is an inference, not a checked fact.

Escalation with level, boss pattern, abilities and HP: not in the box. The ability text and stat values are in tables or strings not present here. Honest: the top 8 cannot be filled from stats.

Top striking (only three can be filled from the box):
1. Three-band toughness scale. Why: a readable three-step threat tier on a card at 375 wide. Keep: three bands of threat. Change: show as a threat ring with three steps, not a number. Ref: /mnt/frankendom-donors/xyeppp-RoR-Interface/interface/interfacecore/tome/bestiary/species.csv line 2 (row shape).
2. Subtype family grouping. Why: each creature sits in a subtype that points to a type and a portrait, so the card is built from the row. Keep: family-first grouping. Change: a silhouette tile per family, one colour per family. Ref: bestiary/subtypes.csv line 1 (header) and the rows.
3. Three-way realm split. Why: three realm groups with uneven sizes (38, 140, 132). Keep: a three-way split that is not even. Change: our own names and a different sign per side. Ref: bestiary/realms.csv line 1 (header).

## 2. Classes, races and factions

- Careers: 24 career columns, read from the header of armor_set_entries.csv (career 1 to career N) and career_column_entries.csv (24 rows of column to career index). Career names were not read in the box (the numbers are the only values read).
- Races: none read.
- Factions: the three realm groups (section 1).
- Progression shape (system-level, not class-level): titles, achievements and sigils.
  - Titles: 1320 rows in titles/entries.csv across 9 category values. The largest category holds 597 rows.
  - Achievements: 2502 rows in achievements/entry.csv, with 122 subtype rows and 14 type rows.
  - Sigils: 7 sigil entries, 60 fragment rows (fragment table), 32 fragment task rows.

## 3. Weapons

None read. The weapon table, if it exists, is not in the tome folders that were listed. The search was limited to those folders and the windows named in section 6, not across all 11206 files. Honest: 0 weapon families and 0 top 5.

## 4. Armour and gear

Armour and gear are the richest part of the box that was read.
- Armour sets: 38 sets in oldworldarmory/armor_set_tier_entries.csv (tiers 1 to 4). Tier 4 holds 22 of the 38 sets. Each set is an item id to set id row (205 rows) with career flags across 24 career columns.
- Material tiers: the box does not name materials (no metal, gold or crystal in the table read). Tier is the only material-like signal. The look of each tier is in art not read.
- Sigils: 7 sigil entries (sigils/sigil_entries.csv: id, display index, ability id, slice). The first seven rows all point to one ability id (12975), so every sigil tier in the table reads the same ability. Check whether intended.
- Fragments: 60 fragment rows. The number of tasks per fragment is 0 (5 rows), 1 (10 rows), 3 (23 rows), 4 (17 rows) or 5 (5 rows). The task table has 32 rows with a task number of 4 (15), 5 (15) or 6 (2).

Top 5 striking:
1. Dominant top tier. Tier 4 holds 22 of 38 sets. Keep: one tier that most sets belong to, so the top is common and rare pieces are the set pieces. Change: a crest only on top-tier pieces so the tier reads at 375 wide.
2. Sigil fragment ladder. Fragments with 0 to 5 tasks feed sigils. Keep: a collection that fills a slot piece by piece. Change: a ring of pips, one per task, shown on the fragment card.
3. Career-gated sets. Set rows carry flags for each career column, so a set can be locked to some careers. Keep: set-to-career flags. Change: show eligible careers as silhouettes on the set card.
4. One ability across seven sigil tiers (table observation, see section 4). Keep: the tiered sigil idea. Change: each tier gets its own ability and a clear step-up sound. This is a defect candidate, not confirmed in game.
5. Task counts of 4 to 6 per fragment task (fragment_tasks table). Keep: a fixed short task count. Change: pips on a ring that fill with a short tick sound.

## 5. Zones and dungeons

Not read. The zone and public-quest XML is in NO_DEHASH/xml (6 files); one file was read for layout only and the field values were not recorded. No biome list, no dungeon archetype and no hazard list was read. Top 5: none.

## 6. Item and effect looks worth recreating

Death and respawn card (ea_deathwindow/source/deathwindow.lua):
- On death the window takes an auto-respawn time (line 83) and shows nothing if no respawn location is set (lines 85 to 88). The timer is set at line 91.
- Update counts the timer down (line 47), shows minutes and seconds (lines 54 to 55), and closes the window when the timer is at or below zero (lines 51 to 52). Closing does not respawn by itself; the respawn is a separate action.
- The killer name line is set and hidden while the window is open (line 122 onward).

Hit flash (ea_screenflashwindow/source/screenflashwindow.lua):
- Duration 1.5 seconds, alpha from 0 to 1, a pop-and-ease animation (lines 11 to 16, 93 to 96).
- The window is on or off by a reference count, so several windows can ask for it (lines 59 to 70).
- It starts when the player's hit points drop (lines 102 to 109).
- Defect, as read and not run in game: the countdown in OnUpdate is commented out (lines 43 to 50). curFlashTimer is set when a flash starts (line 98) and no live code decrements it (curFlashTimer appears only in this file). StartFlash returns at line 86 while the timer is above zero. As read, after the first flash no later hit-point drop starts another. Fix: restore the countdown in OnUpdate (or clear the timer on the animation end).

Choose-one loot (ea_lootwindow/source/chooseonelootwindow.lua):
- Hovering a row shows the item inspect (line 60 onward, mouse-over index at line 69).
- Selecting a row (line 89) and accepting it (line 98) are separate steps. The accept handler was read only at its entry.
- No pick sound was seen (sound files were not searched for exhaustively).

Windows that the HUD is built from (names only, from the window folders in interface/default; not opened): action bars, cast timer, mouse-over target, objective trackers, overhead map, world map, zone control, public-quest loot, and a layout editor. The audit (AU059) listed these; they exist in the folder list.

Art and sound: 9895 DDS textures and 122 TGA files, 182 bestiary images, 15 TTF fonts, none opened. No sound files seen in the AU059 inventory. Animation vocabulary: not read.

Top 5 looks:
1. Respawn-choice death card. Keep: respawn options on death, an auto-respawn timer and a live killer line. Change: three abstract respawn choices with no place names, and a timer ring.
2. Rim flash in a threat colour. Keep: a flash driven by hit-point drops and an off switch. Change: a rim vignette in a threat colour instead of a full-screen tint, with the countdown fixed (see section 6 defect).
3. Take-one loot row. Keep: hover or tap to inspect, then take one. Change: three cards in a row at 375 wide with a rarity bar and a lid-lift ceremony.
4. Bestiary silhouette card. Keep: a creature as a data row and a card built from that row. Change: three traits, a silhouette tile and a threat band in place of numbers.
5. Live killer line. Keep: the killer name updates while the death card is open. Change: a short last-hit line with a sting, no name shown to others.

## 7. Inspiration for Frankendom (originals, all recreated as distinct originals, never copies)

1. Respawn Choice Card (death and respawn, row 17). Keep: respawn choice and an auto-respawn timer on death. Change: three abstract choices and a timer ring; the loss stays readable at 375 wide. Ref: deathwindow.lua lines 83, 91.
2. Rim Flash with a Working Timer (combat feedback, rows 10 and 14). Keep: a flash on a hit-point drop with an off switch. Change: a rim vignette, and a countdown that actually ends so the second hit still flashes. Ref: screenflashwindow.lua lines 45 to 46, 86, 98, 105.
3. Take-One Loot Row (loot ceremony, row 18). Keep: hover to inspect, then take one. Change: three cards with a rarity bar and a sound per rarity. Ref: chooseonelootwindow.lua lines 60, 98.
4. Bestiary Silhouette Card (catalogue fields, row 21). Keep: each creature is one data row and its card is built from the row. Change: a silhouette tile and a three-step threat ring instead of numbers. Ref: species.csv line 2.
5. Sigil Pip Ladder (gear crafting, row 15 dressing). Keep: fragments with a set task count fill a slot. Change: a pip ring per task and a different ability on every tier (not the shared one in the table). Ref: sigil_entries.csv line 2; fragment_tasks.csv.

## 8. Licence note

None stated. No LICENSE file. The README gives no licence. Publisher-authored UI per the module headers. The NO_DEHASH export has no stated provenance. Class C.

## Not read

- The server half (not in the box).
- All DDS, TGA, TTF and PNG files: names and counts only.
- Most Lua and XML: only the death, screen-flash and loot handlers were read. ea_pqlootwindow, the map and zone windows and the cast timer were not opened.
- Tome text (lore, manual, card, armoury and history CSV bodies): headers and row counts only. Protected text, not reproduced.
- The NO_DEHASH export: one XML file read for layout; five other XML files and the two TXT files not read.
- The bestiary ability, HP and damage values: not in the box.
- ror_mapextension.csv and credits CSVs: listed only.
- Sound and music: no sound files were seen in the AU059 inventory; not searched exhaustively.
