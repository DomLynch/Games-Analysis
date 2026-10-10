# NetHack-NetHack (design catalogue, DC037)

Donor: /mnt/frankendom-donors/NetHack-NetHack (VPS, read-only). Source is NetHack 5.0 (development branch, include/monsters.h header).
Licence (files say): NetHack General Public License (dat/license:1 "NETHACK GENERAL PUBLIC LICENSE"). Its paragraph 2b (dat/license:55) requires that a distributed derivative be licensed at no charge on identical terms (per AU036). Tile art (win/share/*.txt) has no per-file licence; win/share/tile.doc:6 credits Warwick Allison for the original tiles. Sound clips: 9 CC0 and 5 CC-BY 4.0 with attribution (sound/wav/attributions.txt lines 9 and 21). Old instrument samples are unlicensed in the repo (sound/wav/README lines 36-37). Class: code C (copyleft-like), tiles C, CC0 and CC-BY sounds A with attribution.
Rule for every brief below: recreate as a clearly distinct original, never a copy. Clean-room: shape and mechanism only, no code or text copied.

Which half I read: the DATA half (include/monsters.h, include/objects.h, include/artilist.h, include/hack.h, include/trap.h, dat/*.lua names and fill files, win/share tile headers as per AU036) AND the ENGINE half for the mechanisms cited here (include/monst.h macros, src/dungeon.c level_difficulty, src/allmain.c spawn roll, src/artifact.c glow and light code, src/role.c role and race headers, src/u_init.c skill caps, include/skills.h). Same repo, so no separate paired half. Combat, monster AI, shop, prayer and death code were NOT read.

## Counts (grep this run unless marked AU036)
- Monster entries: 394 MON entries in include/monsters.h (includes player-role and quest-leader monsters). Grouped by symbol class: 58 symbol classes. Largest: human-type 68 (includes roles and quest leaders), demon 28, dragon 24, dog 16, golem 11, giant 11, zombie 10, orc 9.
- Roles: 13 (include/hack.h line 769). Races: 5 (include/hack.h line 774; role.c race table starts line 581). Rank titles: 9 in the first role's entry (role.c line 31 onward; checked for that one role).
- Weapons: 59 WEAPON entries (include/objects.h). Armour: 17 ARMOR entries. Dragon-scale items: 22 DRGN_ARMR lines (11 mail; 11 scale lines, of which the shimmering scales are deferred). Rings: 28. Amulets: 11. Tools: 35.
- Artifacts: 35 (include/artilist.h).
- Trap kinds: 24 on-map kinds plus a trapped chest that is part of an object (include/trap.h line 91 comment "part of object; not on map").
- Level files: dat/*.lua 131 (AU036). Quest level sets per role (prefixes seen: Arc, Bar, Cav, Hea, Kni, Mon, Pri, Ran, Rog, Sam, Tou; others not listed in this read).

## 1. Creatures (families and tiers)
Escalation mechanism (read): a random monster is drawn from a level window. Minimum = level difficulty divided by 6; maximum = (level difficulty + character level) divided by 2 (include/monst.h lines 273-274). Level difficulty = depth of the level, with special cases for the endgame and for carrying the amulet (src/dungeon.c lines 2038-2047). So a monster's tier rises with depth and with the player's own level.

Families and tiers (labels mine; NetHack's own names are not reused in the labels):
- Material-ladder golem: 11 golems from straw (level 3) to iron (level 18), each leaving no corpse (include/monsters.h lines 2509-2510 straw, 2530-2531 gold at level 5, 2586-2587 iron at level 18).
- Colour-coded dragon family: 11 baby dragons (level 12) and 11 adult dragons (level 15), plus a Chromatic Dragon (level 16) and Ixoth (level 15). Baby dragons roar on the sound category (line 1345). Colour names the resistance (section 4).
- Lich ladder: lich, demilich, master lich (level 17, lines 1880-1881), arch-lich (level 25, lines 1889-1890). Four rungs, each one a new tier.
- Vortex set: six vortices from fog (level 3) through dust, ice, energy, steam to fire (level 8; fire vortex line 1101).
- Mimic ladder: small (level 7, line 670-671), large (level 8), giant (level 9): creatures that disguise as items.
- Angel ladder: couatl (8), Aleax (10), Angel (14), ki-rin (16), Archon (19; line 1254).
- Demon princes: named demon lords at levels 50 to 106 (for example line 3055 with level 50). Out of normal band; reached through special levels (dat/*.lua).
- Vampire tiers: vampire (10), vampire mage (20), Vlad the Impaler (28; line 2313).
- Mummy and zombie by race: mummies and zombies come as kobold, gnome, orc, dwarf, elf, human, ettin and giant versions with rising levels.

Top 8 most striking (readable silhouette at 375 wide, one signature behaviour, one signature sound or effect):
1. Material-ladder golem. Why: each golem is a named material, so the ladder teaches itself; gold sits in the middle tier. Keep: a material name per rung, no corpse. Change: our ladder uses zone materials; the gold golem gets a gilt shimmer, not a flat yellow. Ref: include/monsters.h lines 2509-2510, 2530-2531, 2586-2587.
2. Colour-coded dragon. Why: colour names the resistance, so a player reads the threat by colour. Keep: colour equals resistance; baby and adult split at level 12 and 15. Change: our six elements with a head crest, not the same colour set. Ref: include/objects.h lines 502-510 (dragon scale mail); include/monsters.h lines 1341-1345 and 1367 (baby) and 1432-1433 (adult).
3. Lich ladder. Why: four rungs with clear level jumps (11, 14, 17, 25). Keep: four rungs. Change: each rung a different crown silhouette. Ref: include/monsters.h lines 1864 (lich), 1880-1881 (master lich), 1889-1890 (arch-lich).
4. Vortex set. Why: six vortex types escalate from mist to fire; one fire-topped rung. Keep: the escalation from fog to fire. Change: our vortex is a column with a spiral, not a cloud. Ref: include/monsters.h line 1101 (fire vortex).
5. Mimic ladder. Why: a disguise that scales by size (small, large, giant). Keep: disguise as an item, scaled by size. Change: disguise as a loot shrine, not a chest. Ref: include/monsters.h lines 670-671 (small mimic).
6. Angel ladder. Why: a lawful minion line with a staged jump to a large winged form. Keep: the staged minion ladder. Change: a different wing silhouette. Ref: include/monsters.h line 1254 (Archon).
7. Demon princes at level 50 and up. Why: a boss tier that exists only beyond the normal band. Keep: out-of-band boss behind a zone key. Change: our key is a zone item, not a level number. Ref: include/monsters.h line 3055 (level 50 entry).
8. Vampire tiers (10, 20, 28). Why: a three-rung vampire ladder with a named top. Keep: three rungs. Change: the top rung is a new silhouette. Ref: include/monsters.h line 2313 (Vlad the Impaler).

## 2. Classes, races and factions
- 13 roles, 5 races (include/hack.h line 774; role.c race entries seen at lines 586 human, 607 elf, 667 orc; the other two races not read).
- Progression shape: the first role's entry has nine rank titles across experience levels (role.c line 31 onward; the other roles not checked). Starting stats and per-level growth are in the same role entry (role.c lines 31-60 for the first role).
- Signature mechanic per role: weapon skill caps. Skill levels run unskilled, basic, skilled, expert, master, grand master; the last two are for martial arts only (include/skills.h lines 92-103, grand master at line 103). Per-role caps are in src/u_init.c tables (Skill_A starts at line 257; first entry line 260 shows an expert cap). Only the first table was read.
- Factions: the Mines, Sokoban, the Quest, Fort Ludios and Gehennom are dungeon branches, not factions (dat/dungeon.lua names, section 5).

## 3. Weapons
- Families: 59 weapon entries (include/objects.h), grouped by material and by race-named variant: plain iron, elven (wood), dwarvish (iron), orcish (black iron), silver (silver material; line 186 silver spear). Silver weapons' damage bonus is in the engine (not read).
- Tier visuals: each item is given a material and a colour in the data; for most weapons the colour follows the material (iron to the metal colour, wood to the wood colour, silver to the silver colour) and orcish weapons are black, so tiers read by material and colour (include/objects.h lines 177 elven spear, 186 silver spear, 278 katana).
- Special properties: artifacts (35; section 6) and a few weapon-level flags in artilist.h.

Top 5 striking weapons:
1. Silver weapons. Why: a single material swap (silver instead of iron) reads as a tier and a flavour. Keep: silver as its own material family. Change: silver is a shimmer shader, not a flat colour. Ref: include/objects.h line 186 (silver spear).
2. Elven runed blades. Why: a wood-material family that is visibly lighter. Keep: wood as a tier. Change: our wood is a sheath with runes, not a blade colour. Ref: include/objects.h line 177 (elven spear).
3. Katana (samurai sword). Why: a long single-hand blade with its own role. Keep: long single-hand blade. Change: our katana has a curved guard. Ref: include/objects.h line 278.
4. Glow weapons (Sting, Orcrist, Grimtooth). Why: a weapon that tells the player when enemies are near (section 6). Keep: the warn glow. Change: distance-weighted (fix from the donor's own comment). Ref: include/artilist.h lines 134-140 (Orcrist, Sting), 123-126 (Grimtooth).
5. Vorpal Blade. Why: a beheading property on a plain sword. Keep: a rare beheading flag. Change: our beheading is a short animation cue, not a kill. Ref: include/artilist.h line 191.

## 4. Armour and gear
- Armour tiers by material (include/objects.h, 17 ARMOR entries): leather, studded leather, ring, scale, chain, splint, banded, plate (iron, line 556), crystal plate (glass, white; line 559), bronze plate (copper; line 562), and mithril coats (dwarvish line 571, elven line 574) which are light (weight 150 against 450 for plate; the weight field in the same macro).
- Dragon scale mail (22 DRGN_ARMR lines in include/objects.h: 11 mail lines from line 502, and 11 scale lines from line 530; the shimmering scales sit in a DEFERRED #if 0 block at lines 536-537, so 10 scale colours are active): each colour is a resistance (gray, silver, shimmering, red, white, orange, black, blue, green, yellow, gold). The gold dragon scale mail is a light source (comment at line 504; line 505 entry).
- Rings (28) and amulets (11): each has an appearance that is a material or gem name, and a colour that follows the material (include/objects.h line 810 teleport control is gold; line 743 gain strength is granite).
- Metallic and gold looks: the data pairs a material with a colour per item (gold items use the gold colour, for example the teleport control ring and the gold dragon scale mail). Gold and mithril are tier signals in the data, not a shader.

Top 5 striking gear:
1. Gold dragon scale mail. Why: the one armour that is a light source. Keep: light source as a property of a gold item. Change: our light is a rim glow on the wearer. Ref: include/objects.h lines 504-505.
2. Crystal plate mail. Why: a white glass armour that is heavy and high-tier. Keep: a glass material tier. Change: a faceted crystal look with a sheen. Ref: include/objects.h line 559.
3. Mithril coats. Why: a light armour that is named by race (dwarf, elf). Keep: light and race-named. Change: our coat is one set with two race tints. Ref: include/objects.h lines 571 and 574.
4. Gem-appearance rings. Why: magic items look like gems and metals until identified. Keep: appearance hides the effect. Change: our appearance is a glow pattern, not a gem name. Ref: include/objects.h lines 743 and 810.
5. Bronze plate mail. Why: a copper-tier armour between iron and gold. Keep: an intermediate metal tier. Change: our bronze is a verdigris patina. Ref: include/objects.h line 562.

## 5. Zones and dungeons
Branches (dat/dungeon.lua): Dungeons of Doom (line 8), Gnomish Mines (line 16; filler dat/minefill.lua via lvlfill at line 176; towns minetn-1..7; ends minend-1..3), Sokoban (line 21; four floors, each with two layout files), The Quest (line 27; per-role sets), Fort Ludios (line 34; knox), Gehennom (lines 40 and 89; filler dat/hellfill.lua via lvlfill at line 94; valley, juiblex, orcus, asmodeus, baalz, wizard tower levels, sanctum), Vlad's Tower (tower1-3), The Elemental Planes (line 46 and 285; astral, water, fire, air, earth), and The Tutorial (line 319).
Special levels in the Dungeons: rogue-style tribute level, oracle, big room (13 variants, bigrm-1..13), Medusa (4 variants), Castle (dat/castle.lua).
Hazards: 24 on-map trap kinds (include/trap.h, for example arrow, dart, bear trap, landmine, rolling boulder, sleeping gas, fire, pits, trapdoor, teleport, level teleport, magic portal, web, statue, magic, anti-magic, polymorph, trapped door).

Top 5 striking zones:
1. Gehennom filler (dat/hellfill.lua lines 29-40). Why: each fill level shuffles a monster class list and then places a fixed mix. Keep: shuffled theme class per level, fixed count. Change: our theme is the biome tag. Ref: dat/hellfill.lua line 30 (class list) and line 31 (shuffle).
2. Gnomish Mines fill (dat/minefill.lua; see AU036 for smoothing and walls). Why: one call makes a joined cave. Keep: smoothing plus joined regions. Change: our ore and wall look. Ref: dat/dungeon.lua line 176.
3. Sokoban puzzle branch (dat/dungeon.lua line 21; four floors soko1 to soko4, each with two layout files such as soko1-1 and soko1-2). Why: a puzzle branch as a zone type. Keep: puzzle zone that is a branch. Change: our puzzle is a shrine bridge. Ref: dat/dungeon.lua lines 21-24 and 226-243 (level sets).
4. Elemental planes (dat/dungeon.lua lines 46 and 285-314). Why: four elemental zones plus an astral zone. Keep: one zone per element. Change: our elemental zones are biome palettes, not separate planes. Ref: dat/dungeon.lua lines 285-314.
5. Gehennom spawn spine (dat/dungeon.lua lines 89-150). Why: a long descent with named boss levels. Keep: boss level at each step. Change: our bosses are in a zone chain with a key. Ref: dat/dungeon.lua lines 104-150.

## 6. Item and effect looks worth recreating
- Artifact glow: the artifact's colour is data (include/artilist.h line 140 Sting colour; line 136 Orcrist colour; line 126 Grimtooth colour). The glow colour is read from that data (src/artifact.c lines 2427-2430).
- Glow strength tiers by enemy count: 0, then 1 to 4, then 5 to 12, then over 12, mapped to four verbs (quiver, flicker, glimmer, gleam) (src/artifact.c lines 2436-2447). A message is printed only when the tier changes, and a blind fallback word is used (lines 2464-2482 region).
- Light artifact: artifact_light (src/artifact.c line 2264) makes the Sunsword a light source when wielded (line 2274).
- Gold dragon scale mail light (include/objects.h line 504 comment).
- Tile art: 16-by-16 text-grid tiles with a palette header (AU036; win/share/monsters.txt, objects.txt line 33 "# tile 0 (strange object)" as the fallback tile, decals.txt for overlays).
- Sound: a roar category on the baby dragon (include/monsters.h line 1345); CC0 and CC-BY clips (AU036; sound/wav/attributions.txt lines 9 and 21).

## 7. Mechanism notes (keep the idea, fix the defect)
- Glow strength counts enemies (src/artifact.c line 2447) while the donor's own comment (lines 2444-2446) says it should also depend on proximity. Idea kept: four tiers, change-only message. Fix: weight each enemy by distance.
- Spawn roll per turn: a random monster is made with chance 1 in 70, 1 in 50 below the Castle depth, or 1 in 25 after the demigod event (src/allmain.c lines 158-161). There is no per-zone cap or grace timer in this roll. Fix (ours): a zone cap and a despawn grace timer (row 23).

## Fold-ins by topic
- spawns and encounters: per-turn spawn roll above; Gehennom fill places 8 monsters per fill level from the shuffled class (dat/hellfill.lua lines 29-40). Walk density: NOT READ.
- loot: gem and metal appearances; artifacts; dragon scale colours (sections 4 and 6). Drop ceremony and phone inspect flow: NOT READ.
- progression: skill ladder and rank titles (section 2). Death penalty: NOT READ.
- sound-music: roar cue on baby dragons; sound clips per AU036. Layering, stingers and per-biome beds: NOT READ.
- hud-ui: warn glow message on tier change (section 6). Minimap and touch UX: NOT READ.
- idle animation, death and respawn presentation, boss staging and readability at 375 wide: NOT READ (tiles are single frames per AU036).

## 8. Inspiration for Frankendom (originals, clearly distinct, 20-30 percent mood only)
Rule: recreate as a clearly distinct original, never a copy. KEEP names the trait kept; CHANGE names the trait changed.

1. Material Ladder Golems. Idea: a golem family where the material name is the rung, with a middle gilt rung and no corpse. KEEP: material ladder, no corpse. CHANGE: zone materials for our rungs; gilt shimmer shader instead of flat yellow.
2. Resistance-Coloured Drakes. Idea: a dragon family where colour names the resistance and baby and adult split at a level band. KEEP: colour equals resistance; baby and adult split. CHANGE: our six elements with a head crest.
3. Four-Rung Lich. Idea: an undead ladder of four rungs with clear level jumps. KEEP: four rungs. CHANGE: a crown silhouette per rung.
4. Escalating Vortex Column. Idea: six vortex types from mist to fire with a fire-topped rung. KEEP: escalation from mist to fire. CHANGE: a column with a spiral, not a cloud.
5. Shrine Mimic Ladder. Idea: disguise creatures that scale by size and copy a loot shrine. KEEP: disguise scaled by size. CHANGE: shrine disguise, not a chest.
6. Warn Glow Weapon. Idea: a weapon whose glow tier follows enemies in range, with a message only on a tier change. KEEP: four tiers, change-only message. CHANGE: distance-weighted count (the donor's own stated gap).
7. Shuffled Theme Fill. Idea: each fill level shuffles a theme class list and places a fixed mix. KEEP: shuffled theme, fixed count. CHANGE: theme equals the biome tag.
8. Level-Band Spawn Window. Idea: monsters drawn from a band from depth divided by six up to (depth plus character level) divided by two. KEEP: the band shape. CHANGE: our depth index and our level curve.

## licence_note
NetHack General Public License (dat/license:1). Code and level scripts are NGPL (copyleft-like terms, dat/license:55). Tile art has no per-file licence. CC0 and CC-BY sounds are attributed in sound/wav/attributions.txt. Class: code and tiles C; CC0 and CC-BY sounds A with attribution.

## Not read
- Combat (mhitu.c, uhitm.c), monster AI (monmove.c, dog.c), shops, prayer, death and end-game code.
- Full src/role.c beyond the first role and the race entry lines; src/u_init.c beyond the first skill table.
- win/share/*.txt tile bodies (counts from AU036 only); sys/windows images; sound/wav clip contents; dat/quest.lua; dat/tribute; dat/data.base beyond its header.
- dat/medusa-*.lua, dat/juiblex.lua, dat/castle.lua, dat/knox.lua, dat/minefill.lua and dat/hellfill.lua beyond the lines cited.
- Silver damage bonus and weapon.c; the glow colour code beyond lines 2427-2482 (lines 2483 onward not read).
