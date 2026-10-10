# uglyoldbob-l1j-client (design catalogue, DC056)

Donor: `/mnt/frankendom-donors/uglyoldbob-l1j-client` (read over ssh on the VPS, read-only).
Licence: code is GPL-3.0 (COPYING line 1, LG-R21). Game data is not in the repo: the client loads files from a separate Lineage install (`src/config.cpp`, per AU054). Asset audit class C (AU054).
Halves read: CLIENT half (`src/`, `rust/src/`) and the DATA index only (`src/resources/known.h`, which names the text-pack tables). The data tables themselves (text packs, zone rows, class tables) are not in the box. SERVER half: not in the box (no server directory). Paired donor in the box: none.

Rule for every item below (Dom, 2026-10-11): recreate as a clearly distinct original, never a copy. Inspiration is at category level only (class C donor). We use our own class names, our own action names and our own numbers. Lineage class and item names are not used.

## Important limits
- No creature rows, monster sprite ids, item rows, zone rows or set rows are in the box. Creature families, weapon tiers and zone counts are not claimed.
- `sprite_table.txt` (two identical-size copies) is an index of sprite numbers. It is not decoded.

## 1. Creatures and beasts
- Not read. Monster sprite ids and creature families are not identifiable from the client code in the box.
- The code only lists player character sprite configurations (`src/drawmode/draw_maint_sprites.cpp` lines 179-182: sprite ids 0, 1, 61, 138 for royal, knight and elf configurations; LG-R22).
- Boss pattern: not read.

Top 8 striking: none verified for creatures. Honest gap.

## 2. Classes, races and factions
- Classes: 7 entries in the client enum `src/globals.h` lines 127-133 (LG-R01, LG-R02):
  1. Royal (id 0)
  2. Knight (id 1)
  3. Elf (id 2)
  4. Wizard (id 3)
  5. Dark Elf (id 4)
  6. Dragon Knight (id 5; LG-R03)
  7. Illusionist (id 6)
- Per-class stat values: a switch in `src/global.cpp` with one branch per class (Dragon Knight branch at line 63, LG-R04). The enclosing function name is not read.
- Class-keyed level-up lines: one table per class (`src/resources/known.h` lines 5-11, e.g. `lvupdknight-e.tbl` at line 6, LG-R13).
- Class-keyed character-creation texts: `known.h` lines 20-31 (one per class variant, used at character creation).
- Engineer and thief tables are marked unused in `known.h` lines 23-24 (not counted as classes).
- Races: none in the client (classes only). Factions: not read.
- Progression shape: stat seed at creation, level-up line per class. Talent or skill trees: not read.

## 3. Weapons (animation groups, not item rows)
- Weapon stance groups in `src/drawmode/draw_maint_sprites.cpp` `action_table` (declared line 194, LG-R05). Each group is walk, attack, hit, stand.
  - No weapon (walk, attack, hit, stand).
  - Sword (LG-R06, line 196).
  - Weapon 2 group: comment says axe for the royal class and claws for the dark elf class (line 198, LG-R09). Mapping is from the comment only.
  - Weapon 3 group: comment says bow and arrow for royal, crossbow for dark elf (line 201, LG-R10).
  - Weapon 4 group: comment says poleaxe for royal (line 203).
  - Dagger (LG-R07, line 207).
  - Long sword.
  - Edoryu (a named blade type in the code).
  - Claws (LG-R08, line 210).
  - An uncertain group marked with question marks (lines 205-206).
- Eight named weapon types plus the empty-hand group. Nine stance groups in total.
- Special properties, elemental effects, set bonuses: none in the client code. The weapon case in the sprite table reader is a stub (`src/sdl_user.cpp` line 436, LG-R17).
- Tiers and visual tier ladder: none in the box.
- Top 5 striking weapon groups (animation idea, not item idea):
  1. Dagger stance: a four-action set (walk, attack, hit, stand). Keep: the four-action stance per weapon. Change: our weapon names and timing.
  2. Claws stance: keep the separate claws group. Change: our creature-like claws.
  3. Bow stance (weapon 3): keep a separate bow group for ranged poses. Change: our bow shape and timing.
  4. Poleaxe stance (weapon 4): keep a two-hand heavy group. Change: ours.
  5. Sword stance: keep the baseline sword group. Change: ours.

## 4. Armour and gear
- Layered dress on one body: each sprite record carries a clothing count and a clothing id list (`rust/src/sprites.rs` lines 22-23, LG-R20). One silhouette can show many outfits.
- No gear tiers, no set bonuses, no rarity in the client code. Item descriptions are a text table (`known.h` line 48, `ItemDesc-e.tbl`; not read as data).
- Top 5 striking (gear idea only): not verified. The layering idea is the only one kept.

## 5. Zones and dungeons
- Zone rectangle rows: a zone is a text id, a map id and a start and end box (`src/resources/known.h` line 75, zone.tbl; LG-R14). The rows are not in the box.
- Zone names and colours: `zone2-e.tbl`, `zone2.tbl`, `zone3.tbl` (known.h lines 62-65; LG-R15). Names not read.
- Two village tables with the same data, names only with colour prefixes: `telBook0.tbl` and `telBook1.tbl` (known.h lines 57-58).
- Dungeon archetypes, biomes and hazards: not read.
- Top 5 striking zones: only the rectangle-row idea is verified. Keep: zones as data rows with bounds. Change: ours carry spawn caps and biome fields (row 23 ruling).

## 6. Item and effect looks worth recreating
- Frame-cued sound: each action frame carries a sprite id, a sub-sprite id, a sub-frame, a length and an audio id (`rust/src/sprites.rs` lines 8-14, LG-R18). The sound lands on a frame, not in code.
- Action slots: 72 action slots per sprite (`rust/src/sprites.rs` line 17, LG-R19). Each slot is a list of frames.
- Layered gear: a clothing list on the sprite (lines 22-23, LG-R20).
- Ambient and emote vocabulary: "Taunt", "Wave at somebody", "Yay victory", "Stand", "Fishing", "Picking up item", "Using wand", "Casting spell" (`draw_maint_sprites.cpp` lines 196-212, LG-R11). This is the idle and emote set we can use as a reference for what a character does when nothing happens.
- Death presentation: a "Dying" action slot exists in the sword group row (line 196, LG-R12). How and when it plays is not read.
- Eight facing directions for the sprite (heading table, `draw_maint_sprites.cpp` lines 185-193, LG-R23).

## 7. Inspiration for Frankendom (originals, our names)
1. Frame-cued swing. Idea: the impact sound lands on the frame where the blade meets the target. Keep: a sound cue on a specific frame; a per-action slot. Change: our action names and timing in seconds, not numbered slots.
2. Layered gear on one body. Idea: a clothing list on one base body, so one silhouette reads as many outfits at 375 wide. Keep: base body plus a gear list. Change: our armour as rig plates, not sprite swaps.
3. Weapon stance sets. Idea: each weapon family carries its own walk, attack, hit and stand group. Keep: a stance set per family. Change: our families and timings.
4. Class-keyed level-up line. Idea: a short line per class at each level makes the moment personal. Keep: keyed by class. Change: our own voice and wording.
5. Zone as a rectangle row. Idea: name, map and bounds in one row keep zones as data. Keep: rectangle rows. Change: ours carry spawn caps and biome fields.
6. Ambient emote set. Idea: a small emote set (taunt, victory, wave) used as idle vocabulary. Keep: the idea of a short emote set. Change: our own emotes.

## Not read
- Server half (not in the box).
- Data tables: text packs, zone.tbl rows, class tables, spell tables, item tables. Only the names in known.h were read.
- `sprite_table.txt` body (not decoded). Sprite and tile pack contents.
- The three zip files, the `powerpc/` mirror beyond file types, `update/` (names only), the encryption code bodies.
- Rust mode files beyond `sprites.rs` and `stringtable.rs` (AU054 read `stringtable.rs`; not re-read here).
- The action table body beyond the lines cited.
- Sound files and music (loaded by number from the game install; `src/resources/music.cpp` line 72 per AU054).
