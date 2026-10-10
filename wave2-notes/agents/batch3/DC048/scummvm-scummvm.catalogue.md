# scummvm-scummvm (design catalogue, DC048)

Donor: /mnt/frankendom-donors/scummvm-scummvm (read on the VPS, read-only).
Licence (as the files say): code is GNU GPL v3 or later (COPYING; source headers, e.g. engines/scumm/scumm.cpp line 9). README.md has no licence section. Game data taken from original executables (see AU047) has no licence stated in the box and is treated as class C. Ultima IV creature, armour and weapon tables under devtools/create_ultima/files/ultima4/conf are of that kind. I am not making a legal claim.
Rule: shape only for GPL code (clean-room). For class C game-derived data, inspiration is CATEGORY-LEVEL only (for example "a plated beetle boss"), never an instance-level look or name.

Halves read: CODE half (engines/dm enums and headers; engines/ultima/ultima4/game aura.h and moongate.cpp; engines/mm/xeen enums; engines/mm/mm1/data loader and enums) and DATA half for one engine: devtools/create_ultima/files/ultima4/conf XML tables (creatures, armours, weapons, maps). The binary data packs (dists/engine-data: ultima.dat, mm.dat, and others) are in the box and NOT opened. The MM1 monster table that the MM1 loader reads (monsters.txt) is not in the box; only its loader was read. Creature sheets for DM are in the data packs (not read).

Checked: 34 scummvm receipts in receipts.tsv (scummvm rows), all pass verify_receipts.py (file total 94 with the Ryzom rows). Confidence: high for enum values and the Ultima IV tables; medium for DM behaviour (only enums, not the logic files).

## 1. Creatures and beasts

Dungeon Master engine (engines/dm/group.h lines 40-67): 27 creature types, ids 0 to 26 (giant scorpion first, grey lord last). Families visible from the enum: insect and vermin (scorpion, giant wasp, magenta worm), slimes and rats, eyes, golems and rockpiles, undead (mummy, skeleton, ghost, black flame), animated armour (id 18), elementals (water), demons, and a top tier of red dragon and three "lord" types (chaos, order, grey). Creature cells are a group that occupies several cells (AU047; group.h lines 93-139 not re-read here).

Ultima IV creature table (conf/creatures.xml): 60 creature entries: 2 horse entries (lines 9-10), town class NPCs (8, comment line 12), town creatures (8), water creatures (5), forces of nature (2, flagged wontattack, 255 HP), main creatures (28, lines 44-71), non-standard entries (7, line 73 onward). Attribute vocabulary across the file: encounterSize (35 entries), leader (27 entries, a group leader), ranged (21), resists (10), movement (10), ambushes (8), swims (6), flies (5), undead (4), nochest (4), divides (a split-on-hit flag, present on at least 2 entries).

Escalation: Ultima IV escalates through HP and an experience band in the file (HP from 32 to 255; experience band 3 to 16). Boss pattern: the largest flyers come in small encounter groups (encounterSize 1 to 4). DM: lord types at the top of the enum; no boss logic read.

Idle vocabulary: not read in DM (the animation tables are in the data pack). Ultima IV idle is not in the tables.

### Top 8 striking creature ideas

1. Splitting slime swarm (Ultima IV table). Why: encounter of 15, ambushes, and a divides flag, so each hit can create a new body. Readable at 375 wide as a moving crowd. Keep: split-on-hit, ambush from a tile. Change: our split rule (not a copy), our crowd shape and sound. Ref: /mnt/frankendom-donors/scummvm-scummvm/devtools/create_ultima/files/ultima4/conf/creatures.xml line 48.
2. Fire-field phantom (Ultima IV table). Why: divides, has a leader, can move onto other creatures and the party, resists fire, and fires a random ranged tile. Keep: a hazard-body that walks across other bodies. Change: our fire look; our leader rule. Ref: creatures.xml line 80.
3. Leader-bound undead band (Ultima IV table). Why: undead, leader-bound, ambushes, resists sleep. A band that follows one leader reads as one threat. Keep: leader-follower band; undead tag. Change: our band size and our resist type. Ref: creatures.xml line 57.
4. Four-flyer dragon encounter (Ultima IV table). Why: flies, ranged, encounterSize 4, high experience band. Four flyers at once is a many-vs-one test. Keep: small flying group with ranged attacks. Change: our flyers and our range numbers. Ref: creatures.xml line 70 (id 51).
5. Walking armour (DM). Why: a whole armour set as a creature, one silhouette that reads as a knight. Keep: armour-as-body; change: our armour shapes and colours. Ref: /mnt/frankendom-donors/scummvm-scummvm/engines/dm/group.h line 59.
6. Wizard eye (DM). Why: a floating eye type; flyers read as a distinct family at 375 wide. Keep: floating-eye silhouette idea; change: our eye art, our attack. Ref: engines/dm/group.h line 44.
7. Lord tier at the top of the DM enum (chaos, order, grey lord). Why: three named lord types at the end of the list suggest a top tier with a shared visual language. Keep: a three-type top tier; change: our tier names and looks (we do not copy). Ref: engines/dm/group.h lines 64-67 (grey lord at line 67).
8. Stone golem (DM). Why: a heavy slow body, the classic golem silhouette, readable at distance. Keep: slow heavy body; change: our stone look and rhythm. Ref: /mnt/frankendom-donors/scummvm-scummvm/engines/dm/group.h line 50 (enum id 9).

## 2. Classes, races and roles

| Set | Entries | Ref |
|---|---|---|
| Xeen races | 5 (human, elf, dwarf, gnome, half-orc) | engines/mm/xeen/character.h line 52 |
| Xeen classes | 10 (knight, paladin, archer, cleric, sorcerer, robber, ninja, barbarian, druid, ranger) | engines/mm/xeen/character.h line 56 |
| MM1 classes | 6 (knight, paladin, archer, cleric, sorcerer, robber) | engines/mm/mm1/data/character.h line 38 |
| MM1 races | 5 (human, elf, dwarf, gnome, half-orc) | engines/mm/mm1/data/character.h (enum Race, line 42) |
| MM1 alignments | 3 (good, neutral, evil) | engines/mm/mm1/data/character.h (enum Alignment, line 46) |
| DM champion schools | 4 (fighter, ninja, priest, wizard) | engines/dm/champion.h line 227 |
| DM champion action skills | 16 (swing, thrust, club, parry, steal, fight, throw, shoot, identify, heal, influence, defend, fire, air, earth, water) | engines/dm/champion.h lines 227-246 |
| Ultima IV town classes | 8 (mage, bard, fighter, druid, tinker, paladin, ranger, shepherd) as class NPCs | creatures.xml lines 12-20 |

Progression shapes: Xeen and MM1 are character-level systems (not read in depth). DM champion skills are practised skills in four schools plus action skills. Ultima IV classes gate armour and weapons (see section 4).

Attributes in Xeen: 10 attribute categories (might, intellect, personality, speed, accuracy, luck, hit points, spell points, armour class, thievery) in engines/mm/xeen/item.h lines 44-49.

## 3. Weapons

Dungeon Master weapon classes (engines/dm/dungeonman.h lines 84-100): swing (class 0), throw bands (dagger and axes class 2; bow ammunition 10; sling ammunition 11; poison dart 12), bow shoot band (16 to 31), sling shoot band (32 to 47), magic and special from 112 upward (line 99). Five bands in total.

Ultima IV weapons (conf/weapons.xml): 16 entries. Flags that make them different: range (melee 1 to ranged 10), losewhenranged (a thrown weapon is consumed; line 13), choosedistance and lose (an item lobbed to a chosen distance), returns (a returning throw; line 43), magic (magic tier), absolute range with object-piercing (a reach weapon). Damage rises from 8 to 255 across the list. Class constraints: 30 constraint tags gate weapons by class.

Xeen item categories: weapon, armour, accessory, misc (engines/mm/xeen/item.h lines 39-43). Enchant types: element, attribute bonus, material, usable (lines 55-59). Six elements: fire, electricity, cold, acid and poison, energy, magic (item.h lines 50-54).

Damage types: Xeen has 19 (physical, magical, fire, electrical, cold, poison, energy, sleep, finger of death, holy word, mass distortion, undead, beastmaster, dragon sleep, golem stopper, hypnotize, insect spray, poison volley, magic arrow; combat.h lines 38-46). Special attacks: 23 values including none, from magic through stone (combat.h lines 47-53): a status list of afflictions such as paralyze, confuse, drain, curse, stone.

### Top 5 striking weapon ideas

1. Returning throw weapon (Ultima IV, magic tier; weapons.xml line 43). Keep: a thrown item that comes back. Change: our return arc and sound.
2. Consumed-on-throw dagger (weapons.xml line 13): a thrown item that is lost. Keep: one-shot throw. Change: our item and its cost.
3. Reach weapon that hits through objects (weapons.xml, absolute range with attackthroughobjects). Keep: reach through an obstacle. Change: our reach length and look.
4. DM throw and shoot bands (dungeonman.h lines 84-100): a class-range ladder from swing to magic. Keep: class ranges as tiers. Change: our tier numbers.
5. Xeen special attacks as statuses (combat.h lines 47-53): a readable status set (stone, paralyze, confuse). Keep: afflictions as named statuses with icons. Change: our status set and names.

## 4. Armour and gear

Ultima IV armour ladder (conf/armors.xml): 8 tiers. Defence rises from 96 (line 11) to 248 (line 37). Class constraints gate the middle and upper tiers: the 144 tier is closed to mage; the 160 and 176 tiers open to fighter, tinker and paladin; the 192 tier to fighter and paladin; the 208 tier to paladin only; the 248 tier has no constraint (armors.xml lines 13-38).

DM armour types (dungeonman.h lines 179-185): wooden shield, armet (helmet), torso plate, leg plate, foot plate. Five types.

Xeen: 4 item categories (see section 3). Gear tiers in Xeen are not read beyond the enum.

### Top 5 striking gear ideas

1. Ultima IV armour ladder with class gating (armors.xml lines 11-37). Keep: a tier ladder where some classes cannot wear the middle tiers. Change: our tier numbers, our gating rule.
2. DM plate set in parts: torso, leg and foot plate plus armet (dungeonman.h lines 179-185). Keep: a plate set as separate slots. Change: our plate shapes.
3. DM wooden shield versus plate (same enum). Keep: a light off-hand against heavy plate. Change: our shield.
4. Xeen material and element enchants (item.h lines 50-59). Keep: an enchant type that changes an item's look (element and material). Change: our glow colours (not copies).
5. Ultima IV top-of-ladder piece at defence 248, with no class constraint (armors.xml line 37). Keep: one open top piece as the goal. Change: our name, numbers and look.

## 5. Zones and dungeons

Ultima IV map kinds (conf/maps.xml): 57 map entries: 1 world, 17 city, 23 combat arenas, 8 dungeons, 8 shrines. The city entries carry sub-types: castle (5), town (7), village (4), ruins (1) (lines 74 onward). Dungeons are 8 by 8, with 8 levels each (line 242). 31 map entries (combat and shrine maps, by count) are 11 wide.

Dungeon Master tile types (engines/dm/dungeonman.h lines 47-62): wall, corridor, pit, stairs, door, teleporter, fake wall (7 square types, values 0 to 6, fake wall at line 56), plus side and front aspects of doors and stairs.

Dungeon Master sensors (dungeonman.h lines 133-160): 9 floor-sensor types (party, creature, object, group generator, stairs, possession, version checker) and 18 wall-sensor types (ornament click, click with a specific object, AND and OR gates, countdown walls, single and double projectile launchers, object exchanger, end game), plus a champion portrait code (127). The countdown wall is id 6 (line 149). Puzzles are sensor graphs.

Moongate (engines/ultima/ultima4/game/moongate.cpp lines 39-72): a gate is keyed to a phase of each of two moons. Stepping on the gate for one moon's phase takes you to the gate for the other moon's phase (line 61). Entry to a shrine opens when both phases are 4 (line 72).

Freescape (engines/freescape): 3D areas with render depth layers and per-area condition code (area.h, freescape.h). Area and game data read in part only.

### Top 5 striking zone ideas

1. Two-clock moongate (moongate.cpp lines 61, 72): a portal that works only when two independent cycles agree. Keep: two clocks; destination set by the second clock. Change: our clocks, our phase count, our visual.
2. DM AND-gate puzzle wall (dungeonman.h lines 149-150 for countdown and launcher sensors; AND/OR gate sensor in the same enum). Keep: a gate of sensors. Change: our puzzle rules and art.
3. Countdown wall (dungeonman.h line 149): a wall that opens after a timer. Keep: timer-driven wall. Change: our timer length and look.
4. Ultima IV dungeon stack (8 levels of 8 by 8; maps.xml line 242). Keep: a short vertical dungeon. Change: our level count and layout.
5. Ultima IV combat arena map (small, 11 wide; maps.xml): a fixed small arena for an encounter. Keep: small arenas for encounters. Change: our arena rules and size.

## 6. Item and effect looks worth recreating

| Label | Technique | Ref |
|---|---|---|
| Effect tiles on ranged hits (magic flash, hit flash, fire field) | per-entry tile names for hit and miss | conf/creatures.xml line 13 (rangedhittile="magic_flash"); line 70 (hit_flash) |
| Aura types (horn, jinx, negate, protection, quickness) | one aura per character, each with its own look | engines/ultima/ultima4/game/aura.h lines 35-44 |
| Projectile impact and explosion types | separate module for projectile and explosion | engines/dm/projexpl.h lines 41-43 (AU047) |
| Fire-field phantom: a hazard body that walks over others | body moves onto other bodies | conf/creatures.xml line 80 |

## 7. Inspiration for Frankendom (category-level for class C data; shape only for GPL code)

1. Splitting Gel: a body that splits into a smaller body on a hit that does not kill it. Keep: split-on-hit as an event. Change: our rule (split share, cooldown) and our look.
2. Ember Field Hazard: a hazard body that walks over other bodies and burns what it touches. Keep: body-over-body movement. Change: our fire look and our rules.
3. Leader Band: a band that follows one leader and attacks as one. Keep: leader-follower. Change: our band size and leader rules.
4. Two-Clock Gate: a portal that opens only when two zone clocks agree. Keep: two cycles. Change: our clocks, visuals and sound.
5. Class-Gated Armour Ladder: a tier ladder where some classes cannot wear middle tiers. Keep: gating by class. Change: our tiers and numbers.
6. Returning Throw: a thrown weapon that comes back. Keep: return arc. Change: our arc, sound and tier.
7. Timer Wall: a dungeon wall that opens on a timer after a trigger. Keep: timer trigger. Change: our timer and look.
8. Status Set as Icons: a fixed set of named afflictions, each with its own icon and sound. Keep: named status set. Change: our statuses and icons.

## Defects and notes (keep the idea, fix the defect)

- No confirmed defect in the parts read.
- Check: engines/mm/mm1/data/monsters.h line 49 sets GOLD_DROP to 0xfe>>1 (127), while its comment describes a shifted loot field. The mask use site was not read. fix: confirm the mask at the use site before copying the field layout.
- MM1 loader expects 195 monsters from monsters.txt (monsters.h line 33; monsters.cpp line 49). The file is not in the box, so the monster data cannot be checked here.
- Moongate shrine rule is a fixed check (both phases 4, moongate.cpp line 72). Idea kept; no defect seen.

## Not read

- engines/dm: timeline.cpp, group.cpp, champion.cpp, movesens.cpp and loadsave.cpp (only enums and the cited headers read). AU047 covered timeline and group headers.
- engines/ultima/ultima8, ultima0 and the other ultima sub-engines (not read).
- engines/mm/xeen: monster tables and the scripts (not in box); spells.cpp; locations.cpp (not read).
- engines/mm/mm1 game logic (game/*.cpp) and the monsters.txt table (not in box).
- engines/freescape game data (games/castle, dark, driller, eclipse; not read).
- dists/engine-data binary data packs (ultima.dat, mm.dat, and others): binary, not opened.
- devtools/create_ultima/files/ultima4 text, graphics and sound; ultima6 files (not read).
- gui/themes, po/ translations, LICENSES texts.
- Data packs with the matching game files (the packs were made from original executables; the originals are not in the box).
