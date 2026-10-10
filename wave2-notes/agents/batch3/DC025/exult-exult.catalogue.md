# exult-exult (catalogue, cell DC025)

Donor tree: /mnt/frankendom-donors/exult-exult (read-only, VPS, about 1,950 files).
Licence and rights: code is GPL v2 (COPYING). The original Ultima VII data is NOT in the box (AU020 audit). Shipped art, audio and MIDI carry credits but no licence terms. Asset class C. Not a legal opinion.
Halves: I read the ENGINE/CLIENT half (combat.cc, actors.cc, monsters.cc, effects.cc, shapes/shapeinf/*.cc, docs/*items.txt, data/ string table). The SERVER half is server/ (9 files: server.cc, servemsg.cc, objserial.cc and others): listed only, not read. The DATA PACK half (monster.dat, weapons.dat, armor.dat, MONSTERS.DAT, U7CHUNKS, map data) is NOT in the box. Those loaders are read; their numbers are not. No paired data-pack donor exists in the box.
Grep caveat: the search term "ettin" matches "settings" in gumps/ and exult.cc, so every "ettin" hit is excluded.

Rule for every idea below: recreate as a clearly distinct original, never a copy (about 20-30 percent resemblance in mood only). Each item names the trait KEPT and the trait CHANGED.

## 1. Creatures and beasts

Creature families (names are the donor's item/actor labels from docs, not stat data):
- Winged stone warriors (gargoyle-type): worker, warrior, noble, plus a flying variant and a wingless variant (docs/bgitems.txt:476, :275, :474, :227; docs/siitems.txt:481, :884).
- Dragons: baby ice dragon, ice dragon, dragon, skeletal dragon (docs/siitems.txt:799, :878, :979, :461). This is an age ladder plus an undead variant.
- Slime blob (engine class Slime_actor, monsters.cc:49; created for shape 529 at monsters.cc:243-244).
- Mixed ambush group in a patch cutscene: troll, gargoyle, cyclops (content/bgkeyring/src/quests/keyring/cutscenes/mage_and_goons.uc).
- Other names seen only as grep hits in docs and patch scripts (liche, giant spider, daemon). Not counted as families.

Escalation with level: not read. Monster_info holds fixed per-shape values (shapes/shapeinf/monstinf.cc, Monster_info::read from line 45). The engine randomises initial stats (monsters.cc:250). I did not find a level-scaling table in the lines read.

Counts (grep line hits, NOT distinct creatures, NOT verified): docs/bgitems.txt 27 lines matched a creature-word grep; docs/siitems.txt 28 lines. monster.dat is absent, so no creature record count.

Top 8 most striking (label is mine; every ref is a file path with line):
1. Splitting jelly. Why: a blob that divides when struck and joins up with its neighbours visually. Keep: split on a non-vulnerable hit with a 50 percent roll (actors.cc:3007-3010), neighbour-aware frames (monsters.cc:565-605), a bleed trail on move (monsters.cc:618-640). Change: cap total splits per encounter (no cap seen in the lines read); add a size tier so the split is readable. Ref: monsters.cc:49, :565, :618; actors.cc:3007-3010.
2. Winged stone warrior ladder. Why: worker, warrior and noble read as tiers of one family, and the flying variant adds a second axis. Keep: role-tier ladder and a flying variant. Change: our silhouette, names and palette. Ref: docs/bgitems.txt:476, :275, :474, :227.
3. Dragon age ladder with undead variant. Why: baby to adult to elder reads at a glance, and the skeletal form adds a second look. Keep: baby, adult, elder steps plus one undead variant. Change: our element (not ice), our wing shape. Ref: docs/siitems.txt:799, :878, :979, :461.
4. Teleporting caster. Why: one escape move per creature, gated by a flag. Keep: teleport only when the flag is set (combat.cc:272-277, 297-343). Change: our telegraph and cooldown. Ref: combat.cc:272, :297.
5. Summoner. Why: one signature move that adds enemies to the fight. Keep: summon gated by flag (combat.cc:279-285, :344-357). Change: our summon count, our spawn cap (row 23 rules). Ref: combat.cc:279, :344.
6. Invisible stalker. Why: starts unseen and is found by see-invisible NPCs. Keep: start-invisible flag with a higher XP weight (shapes/shapeinf/monstinf.cc, get_base_xp_value), a become-invisible move (combat.cc:286-296, :358-370). Change: our reveal rule and tell (a shimmer). Ref: combat.cc:358; shapes/shapeinf/monstinf.cc.
7. Mixed ambush group. Why: three families in one scripted ambush. Keep: a mixed group as one encounter. Change: our families and our order of arrival. Ref: content/bgkeyring/src/quests/keyring/cutscenes/mage_and_goons.uc.
8. Per-creature trait card. Why: a small set of true/false traits per creature (sleep-safe, charm-safe, curse-safe, poison-safe, cannot-die, splits, can-summon, can-teleport, can-be-invisible, plus an attack mode). Keep: booleans per creature, a short list. Change: our trait names, a cap of three traits per creature for readability. Ref: shapes/shapeinf/monstinf.cc:45 (Monster_info::read).

## 2. Classes, races and factions

Read: none of the PC class or race tables (schedule.cc, actor classes not read). What is in the box:
- Attack modes (AI temperament, not class): weakest, strongest, nearest, protect (combat.cc:482-535, find_foe at :688), random and last-attacked also exist (combat.cc:567, :597).
- Protect mode: pick an attacker that threatens a protected party member (combat.cc:641).
- Alignment: a 2-bit field in the monster record (monstinf.cc, byte 5) and a hostility test is_enemy (combat.cc:378). Values not mapped.
- Party roles: not read.

Progression shape: not read for classes. Monster progression is none (fixed per shape).

## 3. Weapons

Families and tiers (from the loader Weapon_info::read in shapes/shapeinf/weaponinf.cc, from line 101, and weaponinf.h):
- Melee, poor throw, good throw, missile-firing (weaponinf.h uses field).
- Power flags: sleep, paralyse, charm, poison, curse, no-damage (weaponinf.cc, get_base_strength at :63-95).
- Behaviour flags: lucky, explodes, returns, autohit, no-blocking, delete-when-depleted, needs-target.
- Damage type: a 4-bit field.
- Strength is a point budget: each power adds a weight, lucky and non-normal damage add a little, autohit doubles it (weaponinf.cc:63-95). The source says these weights are "utter guesses" (weaponinf.cc:64). XP value formula at weaponinf.cc:169.

Visual distinction of tiers: not read (art lives in data/bg/*.shp and the sprite pack, not viewed).

Top 5 striking:
1. Returning throw axe. Keep: thrown weapon that comes back (weaponinf.h:85 comment names a boomerang and a magic axe). Change: our flight arc and catch animation. Ref: shapes/shapeinf/weaponinf.h:85.
2. Blast throwable. Keep: explosive is a ranged-only item, a melee explosive gets a large penalty (weaponinf.cc:63-70). Change: our blast radius and our penalty value. Ref: shapes/shapeinf/weaponinf.cc:63-70.
3. Sure-hit blade. Keep: autohit skips the to-hit roll (combat.cc:1363-1368) but doubles the strength budget (weaponinf.cc:92). Change: a visible cost, not a doubling. Ref: combat.cc:1363; weaponinf.cc:92.
4. Fire blade and magic blade (names only). Keep: an elemental blade tier. Change: our element, our glow. Ref: docs/bgitems.txt:552 (fire sword), :548 (magic sword).
5. Slayer sword (name only). Keep: a named weapon tied to one creature family. Change: our family tag and our bonus; no slayer data read. Ref: docs/siitems.txt:536 (dragonslayer sword).

## 4. Armour and gear

Sets and material ladder (names from docs item tables):
- Body ladder, in order: leather armour, scale armour, chain armour, plate armour (docs/bgitems.txt:570, :571, :572, :574; same ladder in docs/siitems.txt:570, :571, :572, :574).
- Leggings ladder: leather, chain, plate (docs/siitems.txt:575, :576, :577).
- Helms: great helm, crested helm, magic helm (docs/bgitems.txt:542, :543, :384); chain coif, leather helm (docs/siitems.txt:540, :1431).
- Shields: wooden, kite, spiked, magic (docs/bgitems.txt:573, :610, :579, :664).
- Named full sets: Serpent Armour (docs/siitems.txt:639), suit of armour (docs/siitems.txt:551).
- Armour strength: a protection value and a bitmask of immunities (shapes/shapeinf/armorinf.cc, Armor_info::read from line 46). Immunity doubles the strength estimate (Armor_info::get_base_strength, near the top of the same file, marked "utter guesses" in its comment).

How the game shows tiers: not read (paperdoll layering is in shape files; see audit AU020 and docs/art.txt).

Material looks (names only, nothing viewed): gold bar (docs/siitems.txt:647), metal (docs/siitems.txt:669), Dream Crystal (docs/siitems.txt:728), crystal rose (docs/siitems.txt:1383).

Top 5 striking:
1. Four-step body ladder (leather, scale, chain, plate). Keep: one slot, four material steps with a clear silhouette step each. Change: our metals and our silhouettes. Ref: docs/bgitems.txt:570-574.
2. Serpent Armour (single named set). Keep: one named set that stands above the ladder. Change: our name and look. Ref: docs/siitems.txt:639.
3. Glowing sphere (item look). Keep: a self-lit item in an inventory slot. Change: our glow colour and pulse. Ref: docs/siitems.txt:966.
4. Glowing cube. Keep: same idea, a second form. Change: our shape. Ref: docs/siitems.txt:1338.
5. Crystal rose. Keep: a crystal-material decorative item. Change: our crystal rule. Ref: docs/siitems.txt:1383.

## 5. Zones and dungeons

Biome and terrain names (shape-name table; not zone data): carpet, sidewalk, grass (several variants: sandy, rocky), cavefloor, sand, swamp, ford, muddy bank, dirt, cobblestone, planking, stone floor, tile, water, void, ether, ethereal void (docs/bgitems.txt:1-60; ethereal void at :49, swamp at :23, muddy bank at :30, ether at :12, void at :13).
Dungeon archetypes: NOT read (map data U7MAP and chunk files are not in the box; the map file formats are described in docs/u7tech.txt:69 and :271).
Hazards and weather (engine effects, all real code): fog with sparkle rain (effects.cc:1611-1620), lightning (effects.cc:1473), storm and snowstorm (effects.cc:1524, :1556), earthquake shake (effects.cc:1829), fire field with a fixed tick life (effects.cc:1908), clouds (effects.cc:1785-1807).
Counts: terrain names counted by eye, not by grep, so no count given.

Top 5 striking:
1. Ethereal void (floor). Keep: a floor type that is walkable but reads as nothing. Change: our rule for what it does. Ref: docs/bgitems.txt:49.
2. Swamp with muddy bank. Keep: a wet edge tile type next to the swamp. Change: our palette and our depth. Ref: docs/bgitems.txt:23, :30.
3. Fog with sparkle rain. Keep: fog as a palette shift plus a sparkle particle layer. Change: density and colour. Ref: effects.cc:1611-1620.
4. Earthquake shake. Keep: a timed camera shake as a hazard beat. Change: our duration and cue. Ref: effects.cc:1829.
5. Fire field with a fixed tick life. Keep: a hazard that removes itself after a set number of ticks. Change: our tick rate and spread rule. Ref: effects.cc:1908.

## 6. Item and effect looks worth recreating

- Frame-mask merging for a blob: each blob reads its four neighbours and sets bits in its frame index, so edges join (monsters.cc:565-605). Technique: 4-bit neighbour mask, random low bit for variety. Ref: monsters.cc:565.
- Bleed trail on move: 1 in 6 chance a blood decal drops on the old tile, using a fixed frame range (monsters.cc:629-640). Technique: probabilistic trail. Ref: monsters.cc:618.
- Sparkle rain over fog: a particle class built on a shape (effects.cc:1254 Particle, :1620 Rain_effect<Sparkle>). Technique: second particle layer over a palette shift. Ref: effects.cc:1611-1620.
- Lightning flash: a weather-class effect (effects.cc:1473). Technique: timed flash. Ref: effects.cc:1473.
- Explosion as a sprite sequence (effects.cc:500). Technique: frame sequence. Ref: effects.cc:500.
- Material title font: one glyph set in wood, metal, gold and a serpent variant (data/fonts/Readme.txt:16; data/fonts/1_wood_runic.shp, 3_metal_runic.shp, 6_gold_runic.shp, 10_gold_ophidian.shp; names only, not viewed).
- Paperdoll layers: one shape layer per slot, following body frames (docs/art.txt; data/bg/caddellite_helmet.shp; names only).
- Status-bar pictogram band: one icon per function on a fixed grid (data/sb_backpack.shp, data/sb_food.shp, data/hp_bar.shp; names only).
- Idle and ambient vocabulary: not read (no creature idle animation read). Death and respawn: Monster_actor::die at monsters.cc:517 calls the base death; base not read. Boss intro and finisher staging: none found in lines read. Readability at 375 wide: not measured.

## 7. Inspiration for Frankendom (originals; not copies)

1. Splitting jelly budget. Idea: a jelly that splits on hit, with a fight-wide cap and a visible size tier. Keep: split-on-hit, neighbour-aware blob frames, bleed trail. Change: cap per fight (ties to row 23 spawn caps), our size tiers, our sound.
2. Winged stone family. Idea: worker, warrior, noble tiers and a flying variant, one silhouette per tier. Keep: role-tier ladder and flying variant. Change: our names, our wing shape, our palette.
3. Ice-to-elder drake ladder with an undead form. Idea: baby, adult, elder and one skeletal variant. Keep: age ladder and undead variant. Change: our element and our wing shape.
4. Creature trait card. Idea: three traits per creature from a fixed list (cannot-die, splits, summons, teleports, invisible, plus a bias). Keep: boolean traits per creature. Change: our trait names and a cap of three.
5. Weapon power budget. Idea: a point budget for each power; autohit and explosive are flags with costs. Keep: budget per power, autohit doubles nothing. Change: our numbers (the source calls its own weights guesses), tuned in our data.
6. Returning throw axe. Idea: a thrown axe with a return flight and four use tiers (melee, poor throw, good throw, missile). Keep: return flight and the use tiers. Change: our arc and catch.
7. Fog with sparkle rain. Idea: a fog zone with a sparkle layer over a palette shift, for one biome. Keep: palette shift plus particle layer. Change: colour and density.
8. Engraved title font. Idea: one glyph set in three material looks for HUD titles, each with a dark rim and one bright top highlight. Keep: one glyph set, three materials. Change: our letterforms and our palettes.

## Not read
- server/ half (9 files), data-pack loaders' numbers (no data files in box).
- schedule.cc, actor class and race tables, sound and music cue code (audio/), NPC schedules.
- combat.cc target loops in full (only the mode switch and two helpers), effects.cc in full, monsters.cc create and equip paths in full.
- docs/u7tech.txt beyond the table-of-contents lines.
- docs/bgitems.txt and docs/siitems.txt beyond the lines cited (grep hits only).
- data/exultmsg.txt string table: 1141 lines, about 909 non-comment keyed lines (grep count, not a full read). Grammar: keyed lines of the form hex-key colon message. Quoted nothing.
- Binary .shp, .flx, .dat, .vga, .wav, .mid contents (names and counts only; audit AU020).
