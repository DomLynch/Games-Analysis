# ax-grymyr-l2dn-server: design catalogue (DC006)

Donor: /mnt/frankendom-donors/ax-grymyr-l2dn-server (VPS, read-only). Asset audit read first: AU005/ax-grymyr-l2dn-server.assets.md. No image, audio, model or map file exists in the box for art, so visuals are class D here.

Class: C for data and text, D for art. Licence notices conflict and the repo states it is an unofficial emulator of a commercial game, so this donor is treated as UNCLEAR. Inspiration therefore stays at CATEGORY level only (for example "a mounted beast form"), never instance-level looks. Names of bosses, races and places are not reused. Dom's rule: recreate as a clearly distinct original, never a copy. Keep and change are stated per item. Not legal advice.

## Halves read
- READ, server half: L2Dn/L2Dn.GameServer/DataPack (XML data, stats/npcs, stats/items, stats/armorsets, stats/transformations, stats/chars, stats/augmentation, ensoul, ElementalSpiritData.xml, CursedWeapons.xml, zones, instances), L2Dn/L2Dn.GameServer.Enums (Race.cs, ZoneType.cs, ZoneShape.cs, CharacterClass.cs), and L2Dn/L2Dn.GameServer.Scripts/AI/Areas (partial: Cemetery.cs, BeeHive.cs, LairOfAntharasPytan.cs, FieldOfMassacre.cs).
- Client half: not in the box. The top-level L2Dn tree shows no client folder; the audit says icons come from a user-supplied client path that is not shipped. Not searched further.
- Not read: auth server, DB projects, protocol, dashboard, most Scripts/Quests (one quest file), most C# code, most NPC dialogue bodies, Tools/ beyond the audit.

## Counts (what the files say)
- Creatures: 2594 NPC templates with type Monster (2336), RaidBoss (249) or GrandBoss (9), counted from stats/npcs XML by the type attribute. Not de-duplicated by id.
- Classes: 99 entries in stats/chars/classList.xml (parentClassId links form a tree). CharacterClass.cs has 50 enum values. Not split into base and subclass.
- Weapons: 2340 items with type Weapon (stats/items, 312 files). Includes items marked as not available.
- Gear sets: 51 set entries in stats/armorsets/Sets.xml.
- Zones: 2768 zone entries in zones/ (42 entries in that folder, counted by ls).

## 1. Creatures / beasts (families and tiers)
- Monster levels by 10-level band (from stats/npcs level attribute): 0-9 about 127, 10-19 about 239, 20-29 about 240, 30-39 about 269, 40-49 about 232, 50-59 about 181, 60-69 about 167, 70-79 about 488, 80-89 about 393. Peaks at 70-89 read as the late-game band.
- RaidBoss levels 20 to 90 (249 templates, 26 to 49 per 10-level band from 20 up to 89). Example file: stats/npcs/25000-25099.xml.
- GrandBoss: 9 templates, levels 40 to 84. Example file: stats/npcs/29000-29099.xml.
- Race enum (L2Dn.GameServer.Enums/Race.cs) lists monster families as categories: animal, beast, bug, construct, demonic, divine, dragon, elemental, fairy, giant, humanoid, plant, siege, undead, plus playable races.
- Keyword hits in NPC names (approximate, substring match, for family sizing only): lizard-type about 69, orc-type about 139, spirit about 42, wolf about 33, bear about 34, skeleton about 30, ghost about 30, golem about 22, spider about 19, zombie about 17, cat about 17, beetle about 16, dragon about 15, drake about 11, tree about 11. Dragon and drake names occur in stats/npcs/13500-13599.xml, 20100-20199.xml and 20600-20699.xml. Keyword counts are not per-family totals.
- Escalation: families step by level band and by the boss ladder (RaidBoss, GrandBoss). Pets: 810 Pet-type NPC tags in stats/npcs; the audit counts 53 pet data files in stats/pets.
- Boss pattern: a multi-tier ladder (RaidBoss, then GrandBoss) with an on-kill follow-up in several area scripts (see top creatures).

Top 8 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance):
1. Label (own): Kill-site avenger. Why: when a monster falls, a timed avenger spawns at that spot and hunts the killer or the killer's pet. Keep: the kill-site spawn and the timed hunt. Change: the look, the trigger rule, and the timer. Ref: L2Dn/L2Dn.GameServer.Scripts/AI/Areas/Cemetery.cs (OnKill, addSpawn with 300000 ms, addAttackPlayerDesire); same pattern at AI/Areas/LairOfAntharasPytan.cs (l.29) and AI/Areas/FieldOfMassacre.cs (l.43).
2. Label (own): Companion-reactive hive. Why: hitting a companion triggers a random buff on it, and killing a hive monster spawns a counter-monster that goes after the killer. Keep: the swarm answers the player's companion. Change: the spawn theme and the buff set. Ref: AI/Areas/BeeHive.cs (OnAttack, l.45-59; OnKill, l.63-109).
3. Label (own): Cursed relic. Why: a relic that gains a stage-kill ladder, drops on the carrier's death, and disappears after a timer. Keep: the stage-kill ladder and the timed disappearance. Change: the item, the drop rule, the relic look. Ref: L2Dn/L2Dn.GameServer/DataPack/CursedWeapons.xml (fields stageKills, durationLost, dropRate, disapearChance, duration; 2 items).
4. Label (own): Mounted beast form. Why: a whole-body transform into a riding beast with its own action list. Keep: full-body mount form. Change: our own mount silhouette and controls. Ref: L2Dn/L2Dn.GameServer/DataPack/stats/transformations/00157.xml (type RIDING_MODE; 29 transformation files).
5. Label (own): Absorb-to-evolve spirit. Why: an elemental companion grows by absorbing items. Keep: item-fed evolution steps. Change: our own element set and naming. Ref: L2Dn/L2Dn.GameServer/DataPack/ElementalSpiritData.xml (24 spirit entries, 32 itemToEvolve, 20 absorbItem).
6. Label (own): Grand-boss tier. Why: a rare top rung above a large raid-boss ladder. Keep: rare, gated top rung. Change: our own phase design (not read here; data only). Ref: L2Dn/L2Dn.GameServer/DataPack/stats/npcs/29000-29099.xml.
7. Label (own): Dragon-kin family. Why: a winged-reptile family with its own tiers (keyword hits only, approximate). Keep: the winged reptile silhouette. Change: anatomy and sound. Ref: L2Dn/L2Dn.GameServer/DataPack/stats/npcs/20100-20199.xml and 13500-13599.xml (keyword match; check by hand).
8. Label (own): Raid-boss ladder. Why: a long run of raid bosses from level 20 to 90 gives a steady escalation. Keep: steady ladder by level band. Change: the boss list and their gates. Ref: L2Dn/L2Dn.GameServer/DataPack/stats/npcs/25000-25099.xml (RaidBoss, 249 templates in all).

## 2. Classes / races / factions
- Classes: 99 class entries (stats/chars/classList.xml) with parentClassId links. Progression is base class, then promoted class, then a transfer tree. Example link: a base fighter then a promoted warrior (classId 0 then 1).
- Races (Race.cs): playable races plus monster families (see creatures). Category-level only here.
- Factions and zone types (ZoneType.cs): town, peace, siege, fort, castle, clan hall, Olympiad stadium, water, swamp, damage, effect, respawn, tax, territory war, timed hunting, arena, boss, jail, and others.
- Progression shape: class tree by parent link; race fixed at character creation (not read in code).

## 3. Weapons
- Families by weapon_type (stats/items XML): blunt (587), sword (552), dual (315), dagger (220), pole (183), bow (153), dual fist (105), fist (59), rapier (57), ancient sword (55), plus a few more types not counted (crossbow, flag, dual dagger, fishing rod, and others).
- Tiers: crystal grade D (843), C (769), B (549), A (756), S (66), none (144). Material tiers also appear (see gear).
- Special properties: elemental attributes (ElementalAttributeData.xml) and imbue; set bonuses via armour sets (below).
- Visual distinctness of tiers: not in the box (no art).

Top 5 striking:
1. Elemental imbue on an item. Why: per-item element with a level. Keep: element per item plus level. Change: our own element set. Ref: L2Dn/L2Dn.GameServer/DataPack/ElementalAttributeData.xml; code idea at L2Dn/L2Dn.GameServer.Db/DbItemElemental.cs (path checked, not opened).
2. Dual-weapon family (weapon_type DUAL, 315 items). Why: two-hand paired weapons read well. Keep: paired weapons. Change: look and combat rule.
3. Polearm reach family (weapon_type POLE, 183 items). Why: long reach silhouette at 375 wide. Keep: long reach. Change: the shape.
4. Rapier thrust family (weapon_type RAPIER, 57 items). Why: thin silhouette and fast thrust. Keep: thin, fast shape. Change: look.
5. Cursed relic (also in creatures). Keep: relic that drops and vanishes. Change: item and drop rule. Ref: L2Dn/L2Dn.GameServer/DataPack/CursedWeapons.xml.

## 4. Armour / gear
- Sets: 51 entries in stats/armorsets/Sets.xml. Each set lists required items and a granted skill with a minimumPieces count (2 or 3 in the sample). Set bonus is a skill granted at a piece count.
- Armour types (stats/items): heavy (271), light (177), magic (162), sigil (37), none (9, shields). Counts are item-tag matches.
- Materials (stats/items material attribute, attribute matches): paper, fish, liquid, wood, leather, cloth, bronze, silver, steel, fine steel, mithril, a rare top metal (142), gold (994), crystal (776). Gold and crystal are the shiny tiers in the data; looks are not in the box.
- Crystal grade (crystal_type) is the main tier signal: D, C, B, A, S (S 66). Enchant levels via EnchantItemOptions and EnchantItemGroups.
- Augmentation: stats/augmentation/options (named stat-modifier options; Variations.xml). Ensoul: stats/ensoul (ensoulOptions.xml, ensoulStones.xml).
- How the game shows tiers: via grade letter and enchant level (data). Client visuals not in the box.

Top 5 striking:
1. Rune-etched gear tier from augmentation options (stats/augmentation/options/00000-00099.xml). Why: tier comes from stat options, shown as a seam. Keep: option-based tier. Change: our own seam shader; no visuals ship here.
2. Gold-plated material tier (material GOLD, 994 items). Keep: gold reads as the premium material. Change: our metal and palette.
3. Crystal grade ladder D to S (crystal_type). Keep: letter-grade ladder. Change: our naming and glow ramp.
4. Set bonus at minimum pieces (stats/armorsets/Sets.xml). Keep: a set that grants a skill at a piece count. Change: the set theme.
5. Ensoul stone slot (stats/ensoul/ensoulStones.xml). Keep: a socketed stone that adds options. Change: our stone look.

## 5. Zones and dungeons
- Zone shapes (zones/documentation.txt): cuboid from 2 points, polygon from 3 or more points, cylinder from 1 point plus a radius. Enum: ZoneShape.cs (Cuboid, Cylinder, NPoly).
- Zone types (ZoneType.cs): arena, boss, castle, clan hall, cleft, condition, damage, derby track, effect, fishing, fort, headquarters, jail, landing, mother tree, no-drop, no-landing, no-restart, no-PvP, no-store, no-summon friend, NPC territory, Olympiad stadium, peace, residence hall teleport, residence teleport, respawn, script, siege, siegable hall, swamp, tax, territory war, town, water, Sayune, undying, teleport, timed hunting.
- Zone data (zones/): 2768 entries in 42 files; shapes NPoly (2278) and Cuboid (479); type values include ConditionZone (1070), WaterZone (425), EffectZone (218), RespawnZone (147), PeaceZone (136), ScriptZone (133), TaxZone (122), plus a second type attribute with values such as chaotic (527), banish (156) and other (532). Meaning of those second values not decoded.
- Instances (instances/): 9 named instance XML files, plus Olympiad and custom folders. Examples: instances/MonsterArena.xml, instances/SanctumOfLilith.xml, instances/GoldbergsRoom.xml.
- Residences (residences/): castles and clanHalls folders.
- Timed hunting zones: stats in TimedHuntingZoneData.xml.

Top 5 striking:
1. Node-built zone shapes (zones/documentation.txt). Keep: boxes, polygons and cylinders as zone volumes. Change: our debug overlay.
2. Monster arena (instances/MonsterArena.xml). Keep: an arena fight format (contents not read). Change: the wave rules and theme.
3. Undying zone and no-restart zone types (ZoneType.cs). Keep: a safe-or-not zone rule. Change: names and rules.
4. Swamp and water zone types (ZoneType.cs; WaterZone 425 entries). Keep: water and swamp as hazard zones. Change: hazard tuning.
5. Timed hunting zone (TimedHuntingZoneData.xml). Keep: a timed hunt window. Change: window and reward rule.

## 6. Looks worth recreating (data only, no art in the box)
- Mounted beast form: stats/transformations/00157.xml (whole-body mount with action list). Technique: swap the body model and control set; our own silhouette.
- Kill-site avenger: AI/Areas/Cemetery.cs. Technique: spawn at the kill spot with a timed hunt; a glow or dust trail on spawn (our own).
- Element imbue glow by level: L2Dn/L2Dn.GameServer/DataPack/ElementalAttributeData.xml and L2Dn.GameServer.Db/DbItemElemental.cs. Technique: element per item, glow strength by level (idea only).
- Augmentation seam tier: stats/augmentation/options/00000-00099.xml. Technique: tier-to-shader ramp (our own).

## Inspiration for Frankendom
Category-level only, per the class rule above.
1. Kill-site avenger: a timed hunter that appears where a foe fell and hunts its killer. Keep: kill-site spawn and timer. Change: look, trigger, timer length.
2. Companion-reactive hive: a swarm that answers a player's companion. Keep: companion triggers buffs; kill spawns a counter. Change: swarm theme and buff set.
3. Cursed relic: a wandering item with a kill ladder that vanishes on a timer. Keep: stage-kill ladder and timed vanish. Change: item, drop rule, look.
4. Mounted beast form: whole-body transform into a riding beast. Keep: full-body mount. Change: our silhouette and controls.
5. Absorb-to-evolve spirit: a companion that evolves by absorbing items. Keep: item-fed evolution. Change: element set, names.
6. Rune-seam gear tier: a tier shown as a seam, set by augmentation options. Keep: option-based tier. Change: seam shader and palette.
7. Set bonus at piece count: a set that grants a skill at 2 or 3 pieces. Keep: piece-count bonus. Change: theme and skill.
8. Node-built zone volumes: boxes, polygons and cylinders as zone volumes with a debug overlay. Keep: volume types. Change: overlay and naming.

## licence_note
Code: MIT (LICENSE.txt line 1; copyright 2024-2025 Grymyr, L2Dn Server Project). Assets: conflicting notices. admin/help/license.htm states GPL v3 or later. admin/help/license2.htm ("Datapack License") says the datapack belongs to its respective owners, free to use and modify, but not to distribute without consent. One enum source file (SystemMessageId.cs line 195) carries a copyright string from a third party. No authorisation is stated in the files. Class C for data, D for art. Inspiration kept at category level. What the files say, not a legal reading.

## not_read
- Most dialogue bodies in DataPack/html (about 2285 .htm and 48 .html files) and quest HTML: not read in full.
- Most stats XML bodies: sampled, not read in full.
- Auth server, DB projects, protocol, dashboard, tools, most C# code, the Db migrations, the bootstrap licence and the geodata map file.
- Most of L2Dn.GameServer.Scripts (only AI/Areas partial; one quest file).
- Creature stats (health, damage, speed) deliberately not recorded.
- The second zone type attribute values (chaotic, banish, other): meaning not decoded.
