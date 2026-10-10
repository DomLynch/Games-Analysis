# diasurgical-DevilutionX (design catalogue, DC018)

Donor tree: /mnt/frankendom-donors/diasurgical-DevilutionX/ (read over ssh only; nothing copied, nothing run).
Asset audit used first: AU015 (`/private/tmp/p2/wave2-haiku/batch3/AU015/diasurgical-DevilutionX.assets.md`). Not repeated here.
Half read: data pack (assets/txtdata tables, assets/levels and arena .dun names, mods/hf manifest) plus engine code (Source/monster.cpp, items.cpp, items.h, player.cpp, levels/, engine/light_tables.cpp, engine/palette.cpp, diablo.cpp). The multiplayer/server path (dvlnet) was not read. No paired donor in the box. OpenDiablo2-OpenDiablo2 is a separate reimplementation of the same franchise, not a paired half, and was not read.
Licence note: Sustainable Use License 1.0, non-commercial only (LICENSE.md line 1); assets fall under it by location (README.md line 82); Blizzard copyright notice (README.md line 86). Origin of the in-tree art is not stated (AU015). Dom's rule applies: recreate as clearly distinct originals, never a copy. Art and names stay category-level for us; mechanics and table shapes are the useful part.
Receipts: `receipts.tsv` in this folder (verified with verify_receipts.py).
Counts below are from awk/python over the tables (counted, not estimated).

## Counts
- creatures: 112 base rows in `assets/txtdata/monsters/monstdat.tsv` (lines 2-113), in 24 AI families. Plus 100 unique rows in `unique_monstdat.tsv` over 27 AI tags. The in-game monster class column has 3 buckets (Demon 62, Animal 29, Undead 21 base rows); it does not match the AI families (see section 1).
- classes: 6 rows in `assets/txtdata/classes/classdat.tsv` (warrior, rogue, sorcerer, monk, bard, barbarian), each with attributes, animations, sounds, sprites and 9 starting-loadout rows.
- weapons: 48 base weapon rows in `assets/txtdata/items/itemdat.tsv`, in 5 families.
- gear_sets: 0. No set-bonus system found (searched Source for set-bonus names; the only hits were unrelated). The 35 armour base rows in 5 groups are counted as gear tiers below.
- zones: 7 dungeon types (`Source/levels/gendung_defs.hpp` lines 16-22), plus 3 arena set-piece maps (`assets/arena/`), 2 level set-pieces (`assets/levels/l1data/sklkngt.dun`, `assets/levels/l2data/bonechat.dun`) and the town map. Hellfire mod adds 2 maps (`mods/hf/nlevels/l5data/`).
- Loot tables: 83 prefixes (`item_prefixes.tsv`), 95 suffixes (`item_suffixes.tsv`), 90 unique items (`unique_itemdat.tsv`).
- Other tables: 36 spells (`spells/spelldat.tsv`), 24 quests (`quests/questdat.tsv`), 338 in-game text rows (`text/textdat.tsv`), 814 sound-effect rows (`sound/effects.tsv`, no audio files in the tree), 26 .po locales plus a .pot with about 2,189 msgid lines (`Translations/`), Experience table with 50 levels (`assets/txtdata/Experience.tsv`).

## 1. Creatures and beasts
Families by AI tag (own labels; the tag is the code enum in `Source/tables/monstdat.h` line 22 onward). Row counts and levels read from monstdat.tsv:

| Own label | AI tag | Rows (monstdat lines) | Availability | Depth window (minDunLvl-maxDunLvl) | Monster level (level column) | Class bucket |
|---|---|---|---|---|---|---|
| Shambler | Zombie | 4 (2-5) | Always | 1-5 | 1-6 | Undead |
| Bone blade line | SkeletonMelee | 23 (10-102) | 8 Always, 4 Retail, 11 Never | 1-22 | 1-30 | Undead 12, Demon 5, Animal 6 |
| Bone archer | SkeletonRanged | 4 (22-25) | Always | 2-6 | 3-9 | Undead |
| Bone king (single) | SkeletonKing | 1 (52) | Never | 4 | 9 | Undead |
| Scurrying scavenger | Scavenger | 4 (18-21) | Always | 1-6 | 2-8 | Animal |
| Fallen pack | Fallen | 8 (6-17) | Always | 1-5 | 1-7 | Animal |
| Hopping bat | Bat | 4 (40-43) | Always | 2-8 | 3-13 | Animal 3, Demon 1 |
| Ambush hider | Sneak | 4 (31-34) | Retail | 2-10 | 5-13 | Demon |
| Horned rusher | Rhino | 4 (66-69) | Retail | 7-12 | 13-19 | Animal |
| Goat pair | GoatMelee, GoatRanged | 8 (36-39, 44-47) | Retail | 4-9 | 8-14 | Demon |
| Fat brute | Fat | 4 (54-57) | Retail | 5-12 | 10-20 | Demon |
| Acid spitter | Acid | 4 (48-51) | Retail | 6-14 | 11-25 | Animal |
| Winged guardian | Gargoyle | 4 (83-86) | Retail | 5-12 | 9-23 | Demon |
| Magma caster | Magma | 4 (62-65) | Retail | 8-11 | 13-18 | Demon |
| Fire-man | FireMan | 4 (74-77) | Never | 21-24 | 16-22 | Demon |
| Storm caster | Storm | 8 (70-81) | 4 Never, 4 Retail | 8-24 | 12-24 | Demon |
| Flame hulk | Mega | 4 (87-90) | Retail | 10-15 | 20-26 | Demon |
| Weave-sprinter | Snake | 4 (91-94) | Retail | 11-16 | 21-27 | Demon |
| Charm caster | Succubus | 4 (103-106) | Retail | 12-16 | 24-30 | Demon |
| Fade-kite caster | Counselor | 5 (107-113, interleaved) | 4 Retail, 1 Never | 13-21 | 25-30 | Demon |
| Single bosses | Butcher (53), Golem (111), final boss (112) | 1 each | Never | 1, 1, 26 | 1, 12, 30 | Demon |

The depth window (minDunLvl and maxDunLvl, read by IsMonsterAvailable at monster.cpp 3154-3162) is what decides where a monster can appear. The monster level column is a separate power value that spans each family's tiers (not checked row by row for monotonic order).

Escalation: most families have exactly 4 rows, one per intelligence value 0 to 3 (the intelligence column is the tier index: 0 is the weakest). Stats rise with the tier: for example the Shambler family goes from 7 to 40 max HP and 5 to 22 max damage across its 4 rows, and the Winged guardian goes from 60 to 150 max HP. Storm (8 rows) has two rows per tier; Fallen (8 rows) has uneven counts per tier (2, 1, 3, 2). Monsters also get a palette remap per variant: 66 distinct remap files are used by the 70 rows that name one; 42 rows use the base palette (monstdat.tsv column 5).

Signature behaviours (read in monster.cpp):
- Weave-sprinter: walks a six-step sway pattern (`pattern[6] = {1,1,0,-1,-1,0}`). When the player is exactly 2 tiles away with a clear line it starts a charge (the lunge test is `distanceToEnemy < 3` inside the `>= 2` branch; SnakeAi 2669-2723, pattern at 2671).
- Hopping bat: after its attack it retreats one step back, then one side step; a variant fires a charging missile from 5 or more tiles (BatAi 2432-2479; the variant check is at 2453).
- Fallen pack: a rally. On the last frame of its stand animation, with a 1-in-4 roll, it heals itself and sets every Fallen within a radius of `2*int+4` tiles to attack for `30*int+105` ticks (FallenAi 2314-2373; rally lines 2334-2357). Fear aura in M_FallenFear (monster.cpp 4450).
- Winged guardian: below half HP it switches to retreat, and when it is far enough away (distance at least `int+2`) it heals (GargoyleAi 2480-2508; lines 2496 and 2501).
- Ambush hider: fades out at range and fades back in when the player comes close; attacks when adjacent (SneakAi 2526-2577; the distance rule is `5 - intelligence`, line 2532).
- Flame hulk: keeps mid-range and throws a flame special; melee flame at close range (MegaAi 2818-2878).
- Storm caster: keeps its distance and casts a lightning control missile (AiRangedAvoidance 2013-2068; the lightning missile is at monster.cpp 1966).
- Fade-kite caster: when adjacent and below half HP it retreats and fades out, then fades in again; at range it casts one of 4 missile types indexed by tier (CounselorAi 2724-2785; the index is at 2757).
- Final boss: ranged avoidance with an extra 40 damage per special (monster.cpp 2023). Single boss rows have availability Never.

Top 8 striking (labels are my own):
1. "Weave-sprinter" (Snake family). Why: a readable S-shape silhouette at 375 wide, one signature behaviour (sway, then lunge at 2 tiles). Keep: the six-step sway and the lunge trigger. Change: body shape, colour and the telegraph (add a visible rear-up before the lunge).
2. "Rally drummer" (Fallen family). Why: a caller that changes other enemies' goals, so a fight escalates. Keep: the rally radius scaling with tier and the timed attack goal. Change: trigger it from a banner or totem, not only a self-heal roll, and show a visible rally ring.
3. "Fade-kite warlock" (Counselor family). Why: a clear cycle of retreat, vanish and return that a player can learn. Keep: retreat under half HP, then fade back in, and a missile type picked by tier. Change: the fade visual and a short wind-up before each vanish.
4. "Winged guardian" (Gargoyle family). Why: an enemy that retreats and heals, which makes the player chase it. Keep: retreat until a range threshold, then heal. Change: heal from a relic or a nearby pool, not a free self-heal.
5. "Ambush hider" (Sneak family). Why: fade-in and fade-out at fixed distances is a strong sound and silhouette tell. Keep: the distance rule (`5 - tier`). Change: fade colour and the tell sound (sound files are not in the tree, so not judged).
6. "Storm caster" (Storm family, 8 rows). Why: a distance-keeping caster that creates space in a fight. Keep: keep-distance plus a lightning control missile. Change: remove the always-true walk branch (defect, section 6) and add a telegraph.
7. "Flame hulk" (Mega family). Why: a big ranged area threat with a melee fallback. Keep: the ranged special at mid range and the melee fallback. Change: flame colour and a ground warning.
8. "Final boss" (monstdat line 112, single row). Why: 1666 max HP, 60 max damage, knockback flag, and a special damage constant in code. Keep: a ranged-avoidance boss with a special. Change: the boss is a single row; use a phase structure we design.

## 2. Classes and factions
Six classes in classdat.tsv (generic names only: warrior, rogue, sorcerer, monk, bard, barbarian). Signature mechanics from `classFlags` in attributes.tsv, with code:
- Warrior: CriticalStrike. Critical chance equals the character level in percent, and a critical doubles damage (player.cpp 574-577 and 742-745).
- Barbarian: CriticalStrike, IronSkin, NaturalResistance. IronSkin adds `level/4` to armour (items.cpp 2600-2601). NaturalResistance adds `level` to magic, fire and lightning resistance (items.cpp 2611-2615).
- Rogue: TrapSense. Trapped chests and doors are labelled in the info box (objects.cpp 4908-4909).
- Bard: DualWield. A one-handed sword or mace may go in the free hand when the other is one-handed too (inv.cpp 220-226).
- Sorcerer: no class flag. Highest magic cap (250) and magic to-hit 70 at start.
- Monk: no class flag. Highest healing multiplier for Heal Other (3) in attributes.tsv.
Progression shape: each class has base and max stats, life and mana gained per level, and a 50-row XP table (Experience.tsv). Class attributes are in `assets/txtdata/classes/<class>/attributes.tsv`.
Factions: none as data. Monster classes are three buckets (Demon, Animal, Undead) used by resistances and by the Undead tag. Not read: any faction or reputation system.

## 3. Weapons
Five families from `itemdat.tsv` (base rows): sword 16 (one-handed 14, two-handed 2), bow 9, staff 8, mace 8, axe 7. Tiers by `minMonsterLevel`: sword 1-17, bow 1-19, staff 1-12, mace 1-10, axe 2-12. Damage ranges rise with tier: sword min 1-10 and max 4-20 across rows; axe max 10-30 (two-handed). Durability columns run from 8 to 100 for swords.
Special properties come from affix powers, not from the base row:
- Elemental: fire and lightning damage prefixes (FIREDAM and LIGHTDAM, one row each); fire and lightning arrow suffixes (3 rows each).
- Other suffixes: thorns (1), knockback (1), life and mana steal (2 each), fast attack (4), fast block (1). Prefixes include a charges entry (2 rows, staffs).
- Uniques (90 rows) can override base damage and durability (SETDAM and SETDUR, used by 31 unique rows) (items.cpp 955-959).
Visual tiers: each base row has its own inventory graphic (`cursorGraphic` column). The graphic files were not opened.

Top 5 striking (affix-level, not unique names):
1. Element as a prefix (FIREDAM, LIGHTDAM). Why: a readable element on a weapon. Keep: element as a prefix row. Change: our element set, palette and hit sound.
2. Arrow effect suffixes (FIRE_ARROWS, LIGHT_ARROWS). Why: the projectile itself changes look. Keep: suffix changes the projectile. Change: effect and trail.
3. Charges on staffs (CHARGES prefix). Why: a limited-use tool. Keep: a limited-use special. Change: visual state of the charges.
4. Two-handed axe ladder (max damage 10-30 across rows). Why: a clear heavy silhouette. Keep: a long damage ladder. Change: head shape.
5. Unique damage override (SETDAM). Why: one base shape can carry a special range. Keep: override by unique row. Change: our numbers and shape.

## 4. Armour and gear
35 armour base rows in 5 groups (itemdat.tsv, class Armor):
- Heavy: 6 rows, armour 0-75, durability 40-100, levels 0-25.
- Medium: 5 rows, armour 0-35, durability 40-65, levels 0-17.
- Light: 8 rows, armour 1-17, durability 6-45, levels 1-9.
- Helm: 9 rows, armour 0-18, durability 15-60, levels 0-20.
- Shield: 7 rows, armour 1-20, durability 16-60, levels 1-23 (one-handed).
No material tiers as names; tiers are the level and armour ladders above.
How the game shows tiers: magic items get a blue name, unique items a gold-white name (items.h 432-442). Magic items get a prefix (FlipCoin(4): 1 in 4) and a suffix (!FlipCoin(3): 2 in 3); if neither is picked, one is forced (items.cpp 1181-1190). Unless the caller already asked for it, two-thirds of rolls restrict affixes to those flagged `useful` (items.cpp 1191; the flag is read from the `useful` column, tables/itemdat.cpp 700; filter at items.cpp 1078). Armour appearance on the player comes from palette remap files in `assets/plrgfx/warrior/whu/` (three .trn files, per AU015; not opened).

Top 5 striking:
1. Heavy-armour ladder (armour up to 75). Why: a readable bulk silhouette. Keep: the big ladder. Change: plate design.
2. Shield with a 16-60 durability ladder. Why: the shield is the most visible item in the off hand. Keep: durability ladder. Change: shape and colour.
3. Helm ladder of 9 rows. Why: head armour reads at 375 wide. Keep: a plain ladder. Change: silhouette.
4. Unique item gold name (gold-white name). Why: rarity is shown by name colour alone. Keep: name colour as rarity. Change: our palette and a second cue (icon glow).
5. Affix alignment lock (a prefix fixes the good or evil side, and the suffix must match it; `GOE` filter in SelectAffix, items.cpp 1063-1080). Why: a clear rule a player can learn. Keep: the lock. Change: our weights.

## 5. Zones and dungeons
Seven dungeon types (`Source/levels/gendung_defs.hpp` lines 16-22): town, cathedral, catacombs, caves, hell, nest, crypt. Generator files by name: drlg_l1 (cathedral), drlg_l2 (catacombs), drlg_l3 (caves; nest has its own branch at drlg_l3.cpp 1496), drlg_l4 (hell), crypt.cpp. The type-to-file mapping was not traced in full. Themes: `levels/themes.cpp` InitThemes (line 826) picks theme rooms; a cathedral picks one of four special themes at random (lines 844-852).
Hazards: trap holes (two `traphole` object rows in objdat.tsv), hell blood-wall lighting (engine/light_tables.cpp, the hell branch), and per-zone palette cycling (see section 6).
Population (read in monster.cpp): monsters per level = walkable tiles in the 80x80 core divided by 30, plus half again in multiplayer (lines 3713-3715); groups are single on depth 1 or on a coin flip (line 3730), 2-3 on depth 2 and on crypt levels, 3-5 otherwise (lines 3733-3735). Groups are placed by `PlaceGroup` (line 308). A monster is available if its availability is not Never and the depth is inside its min and max (IsMonsterAvailable, line 3154-3162).

Top 5 striking:
1. Hell with blood walls and colour rotation (light tables and the rotate on hell levels; diablo.cpp 3523-3524). Why: the whole zone breathes with one call. Keep: rotate the lighting table on the hell zone. Change: our colours.
2. Crypt with pulsing lava and glow (palette.cpp 370-371: "Cycle the lava every other frame, and glow every frame"). Why: a long loop (240 frames) at no extra sprite cost. Keep: the two cycles at different rates. Change: our loop length.
3. Caves with water-like palette cycle (palette.cpp 365, `CycleColors(1, 31)`). Why: a cheap ambience. Keep: a palette cycle for caves. Change: colours and rate.
4. Church arena set-piece (`assets/arena/church.dun`, named from the file only; not opened). Why: a set-piece room is a known focal point (AU015 idea). Keep: a clear focal room. Change: layout and lighting.
5. Nest: monsters carry a light radius of 9 tiles, against 3 elsewhere (missiles.cpp 1338). Why: a lit monster is readable in a dark zone. Keep: a per-zone light radius. Change: radius values and the zone.

## 6. Item and effect looks worth recreating
- Palette remap per variant: one body or sprite set recoloured for variants (monstdat trnFile column, 66 remaps; AU015 for armour). Ref: `assets/txtdata/monsters/monstdat.tsv` column 5.
- Palette cycling per zone: caves cycle colours 1-31 on each cycle call; hell rotates the lighting table; nest and crypt have their own updates (diablo.cpp 3514-3525; palette.cpp 363-367, 373-380; `palette_update_hive` not read). Ref: `Source/diablo.cpp`, `Source/engine/palette.cpp`, `Source/lighting.cpp` (lighting_color_cycling at line 477).
- Light tables: 16 shade tables, each 256 entries; the last is pitch black (engine/light_tables.cpp 20-48). Ref: `Source/engine/light_tables.cpp`.
- Rarity colour: blue for magic, gold-white for unique, white for normal (items.h 432-442).
- Monster light radius: 3, or 9 on nest levels (missiles.cpp 1338).
- Unique boss presentation: the info box shows a unique in gold-white and prints its history (control_infobox.cpp 422-424). 8 unique rows carry a talk line (unique_monstdat.tsv column 20). Ref: `Source/control/control_infobox.cpp`.
- Talking bosses stand still while speech plays and skip repeats while the clip is playing (MonsterTalk, monster.cpp 1427-1431).

## 7. Inspiration for Frankendom (originals, not copies)
1. "Coil Stalker": a weave-then-lunge pursuer. Keep: the sway-then-lunge with a range trigger. Change: a zigzag with pauses, our silhouette and a wind-up tell.
2. "Rally Drummer": a caller that rallies allies inside a radius scaled by tier. Keep: the radius scaling and the timed attack goal. Change: triggered by a banner object; visible ring.
3. "Fade-kite Warlock": retreat under half HP, fade out, fade back in, pick a missile by tier. Keep: the cycle and tier-picked missile. Change: visuals and a longer wind-up.
4. "Zone Director" (Frankendom row 23): population from walkable area divided by a constant, group size by depth, a leashed boss escort within 3 tiles. Keep: the counts and leash. Change: fix the group walk (section 6 defect), add despawn on empty with a grace timer and respawn timers, which this donor does not have.
5. "Zone Glow": per-zone palette cycling at different rates (hell rotate, crypt two-rate, caves colour band). Keep: the cheap ambience. Change: colours and rates.
6. "Alignment-locked affixes": prefix 1 in 4, suffix 2 in 3, two-thirds of rolls restricted to useful affixes, and a good or evil lock between prefix and suffix. Keep: the lock. Change: weights and names.
7. "Level-scaled crit": critical chance equal to character level percent, doubling damage. Keep: scaling with level. Change: cap it (for example 20 percent) and tie it to a class trait.

## Defects seen in code (keep the idea, fix the defect)
- monster.cpp 341: the group walk moves `yp` by `Displacement(...).deltaX`, not `deltaY`, so the group walks along diagonals and axis lines only (reasoned from the code, not run). The comment above it names the intended fix. Fix: use `.deltaY`.
- monster.cpp 2052-2053: in AiRangedAvoidance the roll is `GenerateRnd(100)` (0-99) but the threshold is `1000 * (intelligence + 5)`, so the branch always fires. The intended scale is unknown (maybe 10 x). Fix: scale the threshold to the roll, then tune by hand.
- player.cpp 574-577 and 742-745: the two critical blocks sit in different functions; the order against the item percent bonus is not traced here. Fix: one shared helper.
- monster.cpp 1448: `app_fatal` if a talk line fires with an unexpected quest state (a quest-boss branch); a crash path, not a logic error. Fix: log and return.
- monster.cpp 3730-3736: the scatter loop repeats until the count is met; if `PlaceGroup` places nothing, the loop may not end (suspected, not run). Fix: a retry cap.

## Cross-links
- spawns and encounters: section 5 population (row 23 of the parity list).
- AI brain and fight loop: section 1 and the defects.
- loot: section 4 affix rules.
- hud-ui: panels and buttons are in AU015; no layout read.
- sound-music: 814 sound rows (`assets/txtdata/sound/effects.tsv`), no audio files in tree; not judged.

## Not verified
- All art (CLX, TRN, DUN, PAL, PNG) beyond names and counts (AU015).
- Walk density in terms of "what appears every 20 seconds": not measured; object placement by level type read only through InitObjects (objects.cpp 3812-3880).
- ProcessMonsters (monster.cpp 4257) and death and corpse code (MonsterDeath 1498, dead.cpp): not read.
- Themes beyond InitThemes; drlg_l1 to l4 generators; crypt.cpp; palette_update_hive: not read.
- Hellfire mod bodies (mods/hf txtdata): listed, not read.
- Readability at 375 wide, touch UX (controls/), loot drop ceremony and inspect flow: not read or not measured.
- Death and respawn presentation: not read.
- Exact meaning of the `Stream` flag in effects.tsv: not read.
- Monster AI helpers beyond the functions cited (AiAvoidance, ZombieAi, SkeletonAi and the quest-boss AI functions): not read in full.
- Unique rows: aggregated columns only; names not reproduced.
