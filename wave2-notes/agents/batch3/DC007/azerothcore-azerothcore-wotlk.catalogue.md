# azerothcore-azerothcore-wotlk: design catalogue (DC007, batch3)

Donor path (VPS, read-only): /mnt/frankendom-donors/azerothcore-azerothcore-wotlk
Asset audit used first: /private/tmp/p2/wave2-haiku/batch3/AU005/azerothcore-azerothcore-wotlk.assets.md (class C overall, D for all art).

## Which half was read
- **Data half (read):** `data/sql/base/db_world/*.sql` (world database dumps). Creature, item, set, instance, weather and gameobject rows were parsed in full.
- **Server-code half (read only for enums):** `src/server/shared/SharedDefines.h` (races, classes, creature type, family, elite rank, item quality, gameobject types) and `src/server/game/Entities/Item/ItemTemplate.h` (item class and subclass enums).
- **Client half (not in box):** no art, models or sounds. The `*_dbc.sql` files are schema only (0 data rows: map_dbc, areatable_dbc, itemdisplayinfo_dbc, creaturedisplayinfo_dbc, spellvisual_dbc, chrclasses_dbc, chrraces_dbc, creaturefamily_dbc, itemset_dbc, light_dbc). The matching client half is the WoWdot donor in this batch (see its catalogue), which reads the same data layouts but ships no rows either.
- **Scripts (not read):** boss AI scripts named in `ScriptName` columns (e.g. `boss_*`, `instance_*`) live under `src/server/scripts`; only their names were seen in the data.

Restricted-note check: no `_RESTRICTED-NOTE.txt` found at the donor root. Class C rule applies anyway (game-derived data, no asset licence), so inspiration below stays category-level.

## Counts (data rows, checked on the VPS)
| Table | Rows | Note |
|---|---|---|
| creature_template | 29,947 | 644 rows have TEST / DEPRECATED / [PH] / NOT USED in the name (flagged, not removed) |
| creature_template_model | 40,213 | 29,947 creatures; 5,588 have 2 to 4 model rows |
| creature_template_spell | 9,556 | 4,697 creatures; spell names unresolved (see below) |
| creature_classlevelstats | 400 | 4 stat archetypes (unit_class 1, 2, 4, 8), levels 1 to 100 |
| item_template | 46,096 | weapons (class 2) 6,651; armour (class 4) 23,578; 1,091 TEST / DEPRECATED style names |
| item_set_names | 2,481 | 475 set ids are actually used by items |
| instance_template | 85 | 74 with a script name |
| gameobject_template | 21,581 | types: 5 generic 5,298; 3 chest 1,347; 10 goober 1,111; 6 trap 624; 31 dungeon difficulty 205 |
| instance_encounters | 612 | boss kill-credit rows |
| game_weather | 35 | per-zone rain, snow, storm chance for each season |

## 1. Creatures and beasts

### Families and types (enum names from SharedDefines.h)
- **Creature type** (`creature_template.type`, enum at SharedDefines.h line 2620): humanoid 16,544; not specified 3,746; beast 2,769; undead 2,527; elemental 1,000; demon 962; dragonkin 785; mechanical 587; non-combat pet 276; totem 261; giant 236; critter 220; none 26; gas cloud 8.
- **Elite rank** (`rank`, enum at SharedDefines.h line 2962): normal 21,538; elite 6,913; rare elite 186; boss tier (enum name WORLDBOSS, value 3) 962; rare 328; unknown 20.
- **Beast family** (`family`, enum at SharedDefines.h line 2642), counts across all rows: wolf 167; cat 140; spider 126; bear 79; raptor 69; bird of prey 64; carrion bird 57; crocolisk 45; scorpid 41; crab 40; wind serpent 38; boar 36; worm 35; hyena 35; bat 33; turtle 33; tallstrider 23; gorilla 23; silithid 21; chimaera 20; warp stalker 20; dragonhawk 18; ravager 18; wasp 17; serpent 15; moth 15; nether ray 15; sporebat 13; devilsaur 10; core hound 10; rhino 9; spirit beast 5; plus a few 1 to 6 rows. Family 0 (none) covers 28,637 rows.
- **Unit class** (`unit_class`): stat archetype. Warrior-type 23,917; paladin-type 4,345; mage-type 1,578; rogue-type 107. This is the field that picks a row in creature_classlevelstats.

### Escalation with level (creature_classlevelstats.sql)
- Warrior-type base health (column basehp0): level 1 = 42; level 10 = 198; level 20 = 484; level 40 = 1,524; level 60 = 3,052; level 70 = 4,050; level 80 = 5,342 (line 369 for level 80; line 53 for level 1).
- Mage-type base mana: level 1 = 120; level 80 = 8,814 (line 372).
- Base damage (damage_base) runs from about 0.13 at level 1 to 47.2 at level 80 (warrior-type).
- Level ceiling in rows: most creatures top out at max level 80 (3,267 rows), then 70 (2,900) and 60 (1,931).

### Boss pattern (HealthModifier and DamageModifier are per-row multipliers, not stats)
- Boss tier (rank 3), max HealthModifier per type: dragonkin 10,000 (entry 31333), undead 7,397 (entry 39168), mechanical 23,809 (entry 30527, a training dummy, excluded from picks), humanoid 2,401 (entry 30838), giant 2,329 (entry 32846), elemental 2,500 (entry 33070), demon 1,900 (entry 35269), beast 1,300 (entry 35449).
- Median HealthModifier for dragonkin boss rows is 500; for undead boss rows 675. Medians, not single outliers, are the better design guide.
- Difficulty clones: about 2,393 creature names end in a difficulty suffix (1) to (8), mostly (1) (1,698), (2) (347) and (3) (345). Regex count, approximate.
- Sibling links: 1,804 creatures point at up to 3 difficulty siblings (`difficulty_entry_1..3`).

### Top 8 striking creatures (labels are ours; entries cited by ID and line)
1. **Winged sovereign with a stacked health pool.** Entry 31333, `creature_template.sql` line 24954, dragonkin boss tier, level 83, HealthModifier 10,000 (highest dragonkin boss-tier value; the training-dummy row at 23,809 is excluded). Why: a fight-length boss rather than a big-hit boss. Keep: the boss-tier rank and a long, phased fight. Change: do not copy any dragon design; express health through phases, not one raw multiplier.
2. **Quartet of crypt wardens.** Entries 15082 to 15085, lines 9376 to 9379, undead boss tier, level 63, HealthModifier 100 to 110, DamageModifier 15 to 22.5. Why: four linked bosses that share one encounter. Keep: group encounter of four distinct silhouettes. Change: give each warden a different element and aura, and let kill order change the fight.
3. **Stone sentinel and its hard variant.** Entry 31125 (line 24754) links via `difficulty_entry_1` to entry 31722 (line 25339). Health 165 becomes 715, damage 36.8 becomes 70.24, same display id 26967 (`creature_template_model.sql` lines 32604 and 33414). Why: the cleanest example of tiers by stat step on a shared silhouette. Keep: shared model, roughly 2x health and 2x damage on the hard tier. Change: the hard tier shows its difference (cracks, glow, a crown) and gains a phase, instead of only bigger numbers.
4. **Undead tyrant at the top of the undead damage range.** Entry 39168, line 29702, undead boss tier, HealthModifier 7,397, DamageModifier 492.9 (highest undead boss-tier damage). Why: a damage ceiling you must read. Keep: a long telegraph before each heavy hit. Change: cap damage through a readable windup, not a number on a sheet.
5. **Icy beast-lord variant.** Entry 35449, line 27986, beast boss tier, HealthModifier 1,300, DamageModifier 161.8 (highest beast boss-tier damage). Why: the beast family's biggest hitter, with a family-level silhouette. Keep: beast family big-hit boss. Change: different biome, palette and attack shape.
6. **Oversized humanoid commander.** Entry 33628, line 26903; scale 3 in `creature_template_model.sql` line 35743 (display id 22209). Level 83, HealthModifier 1,000. Why: a 3x scale humanoid reads well at 375 wide. Keep: a readable 3x silhouette and a rank-3 pace. Change: no banner, no named-hero look; use a shield-wall aura.
7. **Molten colossus.** Entry 11502, line 7800, elemental boss tier, level 63, HealthModifier 330, DamageModifier 13. Four spell ids are linked in `creature_template_spell.sql` (20566, 19773, 19780, 20565) but their names are not in the box (spell_dbc has only 4,491 rows). Why: slow heavy elemental pacing. Keep: slow, telegraphed heavy hits. Change: lava-crack glow lines instead of flat lava; different spell set.
8. **Demon warlord with the highest demon boss-tier damage.** Entry 24882, line 18875, demon boss tier, level 73, DamageModifier 111 (highest demon boss-tier damage). Why: a demon that hits hard and fast. Keep: a damage-first demon boss. Change: replace the demon look with an original armoured silhouette; keep the damage pattern, not the design.

Excluded from picks: entry 30527 (line 24174), a training dummy with HealthModifier 23,809. It is not a combat creature.

### Ability notes
- Signature abilities are not readable in this box: `creature_template_spell` links 9,556 spell ids, but only 5 of them resolve to names in the shipped `spell_dbc.sql` (4,491 rows). Abilities are therefore marked not read, and the 8 picks above describe data-level traits only.

## 2. Classes, races and factions

Enum source: SharedDefines.h.

### Playable classes (enum `Classes` at line 123), 10 active
| Class | Role | Signature mechanic | Progression |
|---|---|---|---|
| Warrior | melee | not read (role from general knowledge, unverified in box) | stat archetype 1 in creature_classlevelstats |
| Paladin | melee and support | not read | archetype 2 |
| Hunter | ranged | not read (pet-linked families exist in the data) | not read |
| Rogue | melee | not read | archetype 4 |
| Priest | caster and healer | not read | not read |
| Death Knight | melee | not read | not read |
| Shaman | hybrid | not read | not read |
| Mage | caster | not read | archetype 8 (mana curve) |
| Warlock | caster and pet | not read (demon families exist in the data) | not read |
| Druid | hybrid | not read | not read |

Role column is from general knowledge, not from the box. Mechanics would need spell_dbc names, which the box does not carry.

### Races (enum `Races` at line 68), 10 playable
Human, Orc, Dwarf, Night Elf, Undead, Tauren, Gnome, Troll, Blood Elf, Draenei. Progression shape: none in box (chrraces_dbc has 0 rows).

### Factions
Not read in full. `faction` column in creature_template is numeric; the `faction_dbc` table is not in the box.

## 3. Weapons

### Families (ItemSubclassWeapon enum, ItemTemplate.h line 342), with row counts from item_template.sql (class 2)
- Dagger 802; staff 790; one-hand sword 767; one-hand mace 695; one-hand axe 490; two-hand sword 460; two-hand axe 418; wand 339; two-hand mace 371; bow 308; polearm 266; gun 253; fist 232; crossbow 158; misc 146; thrown 135; fishing pole 15; spear 3 (subclass 17); exotic 3 (subclass 11).
- Weapon quality rows: poor 2,132; common 420; uncommon 1,494; rare 1,134; epic 1,421; legendary 27; artifact 8; heirloom 15.
- Weapons with an on-hit spell (`spellid_1` set): 1,509 rows.

### Tiers and visuals
- Item level by weapon quality is not a clean ladder. Among legendary rows the top item level is 284. The table maximum (435) sits on QA test rings (entries 17886 and 40599), which are excluded from picks.
- Visual variety: 4,886 distinct weapon displayid values in the table. The displayid points at ItemDisplayInfo, whose rows are not in the box, so the look itself is unread.

### Top 5 striking weapons (ref = item_template.sql line)
1. **Great sword with one on-hit proc.** Entry 13262, line 10220, legendary-quality two-hand sword (subclass 8), item level 76, on-hit spell id 18112. Why: named unique with a single proc. Keep: unique great sword with one proc. Change: element and silhouette.
2. **Four-entry staff.** Entries 22589 (line 17975), 22630 (line 18016), 22631 (line 18017), 22632 (line 18018). Same staff name, four entries, four displayids, item level 90. Why: the cleanest per-look variant in the box (one name, four looks). Keep: one weapon, four looks. Change: pick the variant by a gameplay trait, not a class roster.
3. **Heirloom claymore.** Entry 38691, line 34079, heirloom-quality two-hand sword, item level 1, displayid 51405. Why: heirloom rows carry item level 1, which points at level scaling (scaling not read). Keep: a weapon that grows with the player. Change: growth shown by glow tiers, not a stat sheet.
4. **Top item-level two-hand axe.** Entry 49623, line 43892, legendary-quality two-hand axe (subclass 1), item level 284 (highest among legendary rows; the 435 maximum is on QA test rings), on-hit spell id 71903. Why: the top of the item-level ladder. Keep: a late-game weapon with a proc. Change: silhouette and element.
5. **Warp slicer blade.** Entry 30311, line 25699, one-hand sword, item level 175, on-hit spell id 15820. Why: a mid-tier unique with a readable proc, not a test item. Keep: unique with one proc. Change: name, element and look.

## 4. Armour and gear

### Material tiers (ItemSubclassArmor enum, ItemTemplate.h line 388), row counts from item_template.sql (class 4)
- Misc 3,846; cloth 5,721; leather 4,519; mail 4,292; plate 4,264; shield 686; libram 72; idol 79; totem 76; sigil 23.
- Armour quality rows: poor 3,066; common 1,359; uncommon 6,398; rare 4,355; epic 8,363; legendary 3; artifact 9; heirloom 25.
- Item level by armour quality: poor 0 to 187; common 0 to 115; uncommon 1 to 182; rare 0 to 435 (the 435 rows are QA test rings); epic 1 to 284; legendary 80 to 175; artifact 1 to 60; heirloom 1.

### Sets
- 475 set ids are used by items; 2,481 set names in `item_set_names.sql` (line 39 is the first row, entry 6473).
- Set sizes (number of sets with that many member items): 5 pieces 108; 6 pieces 68; 8 pieces 62; 20 pieces 62; 3 pieces 51; 2 pieces 25.
- Name themes (substring counts, rough): dragon 79, frost 53, nether 33, shadow 20, fire 18, crystal 16, saronite 16, primal 11, netherweave 11, adamant 7, felsteel 3, khorium 3.

### How materials look (text only; no art in box)
- Material words in item names (substring counts, rough): plate 1,269; leather 566; mail 475; cloth 336; crystal 122; silver 142; gold 76; bronze 48; saronite 62; dragonscale 23; mithril 28; adamant 22; thorium 21; obsidian 18; khorium 18; felsteel 11; netherweave 11; primal 33. These tell us which material words the game uses for tiers, not how they look.
- Tier is shown by quality colour (SharedDefines.h `ItemQualities`, line 315). Colour codes deliberately not copied.

### Top 5 striking gear (ref = item_template.sql line; file-level ref where no line is given)
1. **Talisman pair.** Entries 17782 (line 13761) and 17783 (line 13762): quality-5 trinket, item level 80, both share displayid 6494. Why: two names, one look. Keep: paired items with one shared look. Change: pair by a theme, not by name.
2. **Phaseshift bulwark.** Entry 30314, `item_template.sql` line 25702 (armour, subclass shield, item level 175, displayid 40867). Why: a shield tier above the common ladder. Keep: shield as a tier marker. Change: a visible glow instead of a raw item-level jump.
3. **Set-name table as a template.** 2,481 set names in `item_set_names.sql` (first row line 39, set 6473); 475 set ids are used by items, and 108 sets have 5 member items. Why: a set is a name plus a member list, which maps to a gear-set glow rule. Keep: set bonus by piece count. Change: the set's look is a glow pattern, not a named kit.
4. **Heirloom spaulders.** Entry 42949, `item_template.sql` line 38336 (heirloom armour, item level 1, displayid 29964). Why: heirloom armour carries the same item level 1 as heirloom weapons. Keep: heirloom growth. Change: growth shown by glow, not sheet stats.
5. **One rule, many heirlooms.** The quality counts show 25 heirloom armour rows and 15 heirloom weapon rows, all with item level 1, so one scaling rule covers the family. Why: one rule, many items. Keep: a single scaling rule. Change: give each heirloom family its own glow set.

## 5. Zones and dungeons

### Dungeon archetypes (instance_template.sql, 85 maps, 74 with scripts)
- Dungeon maps with boss scripts, examples by map id (line numbers in `instance_template.sql`). Archetype labels below are inferred from the script names only, not from area data: map 309 (line 59, `instance_zulgurub`) a jungle temple archetype; map 409 (line 63, `instance_molten_core`) a molten cave archetype; map 533 (line 71, `instance_naxxramas`) an undead necropolis archetype; map 574 (line 97, `instance_utgarde_keep`) a fortified hall archetype with allowMount set.
- Encounters: 612 rows in `instance_encounters.sql`, each a boss kill credit.

### Zone types and hazards
- Biome names are not listed in the box: `areatable_dbc.sql` has 0 rows, and map_dbc has 0 rows.
- Weather per zone (`game_weather.sql`, 35 rows): rain, snow and storm chance for spring, summer, fall and winter. Example: zone row 1 (line 49) with snow chance 25 in spring and 15 in summer.
- Hazards: 624 gameobject rows are traps (type 6, `SharedDefines.h` line 1570); 1,111 are goobers (type 10, line 1574), which are interactables; 205 are dungeon difficulty switches (type 31, line 1595).

### Top 5 striking zones and dungeons (ref = instance_template.sql line)
1. **Necropolis hall** (map 533, line 71): undead archetype with a scripted boss route. Keep: a clear boss route through a dead city. Change: layout, palette and enemy mix.
2. **Molten cave** (map 409, line 63): a heat-based cave with a scripted boss chain. Keep: heat-based cave. Change: no direct copy of its boss chain.
3. **Jungle temple** (map 309, line 59): a temple archetype with a boss. Keep: temple with a branching path. Change: biome and traps.
4. **Storm-chance coast** (game_weather line 50, zone 3, name not in box, spring storm chance 20): a coast where storms are a per-season odds table. Keep: per-season weather odds. Change: storms as readable hazards with a warning shimmer.
5. **Trap-lined vault** (gameobject type 6 rows, 624 total): trap-heavy vault archetype. Keep: traps around a boss room. Change: traps are visible in the fog, not hidden.

## 6. Item and effect looks worth recreating (client-side; references are data only)
- **Quality tier as readable colour rule.** Technique: quality enum and colour table, not copied. Ref: `src/server/shared/SharedDefines.h` line 315.
- **Shared display id across items.** Technique: many items point at one display id (e.g. 6494, 9834), so tiers can be built from one model plus a tint or glow. Ref: `data/sql/base/db_world/item_template.sql` lines 13761 to 13762 and the displayid column.
- **Per-look variants for one weapon name.** Technique: one name, four entries, four display ids. Ref: `item_template.sql` lines 17975 to 18018.
- **Creature model roll.** Technique: a creature picks one of up to 4 weighted models with a scale. Ref: `creature_template_model.sql` (5,588 creatures with multiple rows; example line 11325 for entry 15082 with probability 1).
- **Oversized scale.** Technique: scale 2 to 3 for a single boss silhouette. Ref: `creature_template_model.sql` line 35743 (entry 33628, scale 3).
- **Difficulty tiers via sibling entries.** Technique: a hard variant shares the model and gets a stat step plus a visual cue. Ref: `creature_template.sql` line 24754 (entry 31125) and line 25339 (entry 31722).
- Spell visual effects, auras and glows are not in the box. spellvisual_dbc has 0 rows, and item and creature display rows are DBC-only.

## 7. Inspiration for Frankendom (originals; never a copy, 20 to 30 percent mood resemblance)
Dom's rule for every item: recreate as a clearly distinct original, never a copy. Source is class C (game-derived data, no asset licence), so every idea is category-level only.

1. **Stone warden, two tiers.** A bulwark-style boss with a shared silhouette at two difficulties. Keep: the sibling link and a roughly 2x stat step. Change: the hard tier gains cracks, a glow and an extra phase; no named-character look.
2. **Crypt quartet.** Four linked undead bosses, each holding a different element aura; kill order changes the fight. Keep: four-boss group encounter. Change: elements and auras are ours; no ability copy.
3. **Ember colossus.** A slow elemental giant with glowing crack lines that brighten as it takes damage. Keep: slow telegraphed heavy hits. Change: lava is replaced by crack light; a different spell set.
4. **Oversized commander.** A 3x scale humanoid commander with a shield-wall aura that pulses on a readable beat. Keep: 3x silhouette readable at 375 wide. Change: no banner, no named hero.
5. **Gearling swarm.** A flock of small mechanical flyers that assemble into a shape. Keep: mechanical critter tier (587 mechanical rows). Change: swarm mechanic is ours.
6. **Heirloom blade that grows.** A weapon with level 1 base that gains glow tiers as the player levels. Keep: heirloom growth. Change: growth shown by light, not stat sheet; no existing item name.
7. **Storm-chance coast.** A coast whose storm odds change per season, with a shimmer warning before each storm. Keep: per-season odds. Change: storms become readable hazards.
8. **Trap-lined vault.** A vault whose traps show through fog as the player nears. Keep: trap-lined boss room. Change: traps are visible, not hidden.

## Licence note
Code: GNU GPL v2 (LICENSE, "Version 2, June 1991"). Assets: no separate asset licence in data/ or src/tools; the world SQL sits under the repo LICENSE with no per-folder notice; the content is game-derived, so the licence position is unclear (class C, per AU005). Per AU005, the repo says it is not an official Blizzard product (.github/README.md line 88); not re-checked here. Not legal advice.

## Not read
- The 309 db_world SQL files, sampled only (creature, item, instance, weather, gameobject, set, spell_dbc partial). Archive, updates and old folders not read.
- All C++ source except the enum headers; the scripts folder (boss AI); tests; modules beyond the readme.
- .github, .claude, AGENTS.md and CLAUDE.md (instruction-like files, treated as data and not followed).
- Spell names and effects for most creature spell ids (spell_dbc has 4,491 rows; 5 of 9,556 links resolve).
- Full Recast licence text.
