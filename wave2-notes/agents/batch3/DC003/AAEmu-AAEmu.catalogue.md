# Design catalogue: AAEmu-AAEmu (DC003, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/AAEmu-AAEmu/
Asset audit read first: /private/tmp/p2/wave2-haiku/batch3/AU002/AAEmu-AAEmu.assets.md
Donor class for inspiration: C for the game data (no licence line on the data files). The two icons that carry attribution are B, but they are not used here. Per the brief, inspiration stays CATEGORY-LEVEL.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Roughly 20-30 percent resemblance, in mood only. Each brief names the trait KEPT and the trait CHANGED. This is design inspiration, not a legal opinion.

## Which half was read
- Server half: read. AAEmu.Game code enums (Models/Game/...), AAEmu.Game/Data (Creatures.xml, Doodads.xml, CharTemplates.json, Worlds/*, Portal/*, Path/*), Configurations/*.json, SQL/patches/compact/*.sql (npc group rows), Docs/wiki/Classes.md.
- Matching data half (client pack, game_pak, compact.sqlite3 templates): NOT in the box. AAEmu.Game/ClientData holds only readme.txt. Creature stats, levels, models, weapon and gear item rows, and visual data are therefore NOT in this box. Nothing below claims them.

## Data tables used (names and structure, not loaders)
- AAEmu.Game/Data/Creatures.xml: 13,382 Creature rows, each Id plus Name only. No stats, levels or tiers in this file.
- AAEmu.Game/Data/Doodads.xml: 7,124 Creature rows (same root and format), names only.
- AAEmu.Game/Data/CharTemplates.json: 4 start-town templates (races).
- AAEmu.Game/Data/Worlds/*/npc_spawns.json, doodad_spawns.json, slave_spawns.json, gimmick_spawns.json, transfer_spawns.json: spawn tables per world.
- AAEmu.Game/Data/battlefields.json: 2 battlefield entries with two corps spawn points each.
- SQL/patches/compact/2026-01-23-npc_groups.sql: 158 npc_groups rows. 2026-01-23-npc_group_members.sql: 571 member rows, with leader flag and formation offsets and tension.
- Code enums (verified in this pass): Models/Game/Char/Race.cs, Models/Game/Items/ItemGrade.cs, Models/Game/NPChar/NpcKindType.cs, Models/Game/NPChar/NpcGradeType.cs, Models/Game/Slaves/SlaveKind.cs, Models/Game/World/Zones/Climate.cs, Models/Game/World/Zones/ZoneConflictType.cs, Models/Game/Items/EquipmentItemSlot.cs, Models/Game/Char/WeaponWieldKind.cs, Models/Game/Items/ArmorType.cs, Models/Game/Char/ActabilityType.cs.

## Counts (basis in brackets)
- creatures: 13,382 Creature rows; 10,205 unique names [Creatures.xml, my grep].
- classes: 10 class names listed in the wiki (Archery, Auramancy, Battlerage, Defense, Occultism, Shadowplay, Songcraft, Sorcery, Vitalism, Witchcraft) plus 8 races in Race.cs. Only 10 names appear in the wiki; no class enum exists in code. Most class entries in the wiki say TODO.
- weapons: 0 item rows in the box. Wield kinds: 3 (One-handed, Two-handed, Dual-wielded) in WeaponWieldKind.cs.
- gear_sets: 3 armour-family 4-piece buff constants (Cloth4P, Leather4P, Plate4P) used in Models/Game/Units/Unit.cs. 0 set rows in the box.
- zones: 18 world folders in AAEmu.Game/Data/Worlds/ [directory listing].

## 1. Creatures and beasts
Creature families (name-word counts in Creatures.xml, case-insensitive substring, English names only; counts are NOT tiers):
- elemental 146; orc 81; bear 106; wolf 67; golem 74; spirit 41; goblin 42; harpy 42; spider 40; boar 30; skeleton 31; dragon 25; ogre 22; scorpion 22; treant 15; demon 13; hydra 5; gigas 4; beast 8; undead 2; drake 2; serpent 2; ghoul 1; lich 1; devil 1. Source: AAEmu.Game/Data/Creatures.xml.
- Kind enum (NpcKindType.cs): Human, Beast, Undead, Devil, Spirit, Dragon, SiegeWeapon, Ship, Horse, Carriage, Fantastic, Machine, Unknown (13 values).
- Grade enum (NpcGradeType.cs), the escalation ladder: Weak, Normal, Strong, Elite, BossA, BossB, BossC, BossS (8 values).
- Mapping of kind and grade to each creature is NOT in the box (it lives in the matching data half). So escalation with level is NOT read.
- Boss and elite pattern in code: AI v2 parameter families (Models/Game/AI/v2/Params/): Almighty, Archer, BigMonster, Flytrap, WildBoar. Phase names in code comments: PHASE_DRAGON_GROUND and PHASE_DRAGON_HOVERING. Skill lists have PhaseType, UseType (USE_SEQUENCE or USE_RANDOM), Dice, HealthRangeMin (Params/Almighty/AiSkillList.cs).
- Slave (vehicle) kinds (SlaveKind.cs): 11 values including Leviathan (11), Tank, Machine, Fishboat and MerchantShip.

Top 8 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance). Silhouette and sound are NOT read for any of these (no model or sound files in the box); the picks rest on behaviour only.

1. Label: Two-stance sky boss. Why: a boss that changes phase (ground, then hover) by skill list and health gate. Keep: phase switch by health; skill pipe per phase. Change: the flight body; use our own phase names and a different silhouette. Ref: AAEmu.Game/Models/Game/AI/v2/Params/Almighty/AiSkillList.cs; AlmightyNpcAiParams.cs.
2. Label: Charging beast. Why: a short burst charge as its signature move. Keep: a single spurt skill with its own file. Change: species and body shape. Ref: AAEmu.Game/Models/Game/AI/v2/Params/WildBoar/WildBoarAiSpurtSkill.cs; WildBoarAiParams.cs.
3. Label: Snapping plant trap. Why: stationary, with melee and ranged skill lists kept apart. Keep: stationary, two skill lists. Change: plant body; make it a mimic or a statue. Ref: AAEmu.Game/Models/Game/AI/v2/Params/Flytrap/FlytrapCombatSkill.cs; FlytrapAiParams.cs.
4. Label: Tidal sea-beast mount. Why: a sea creature exists as a vehicle kind (Leviathan). Keep: sea-only vehicle slot. Change: body, fins and theme. Ref: AAEmu.Game/Models/Game/Slaves/SlaveKind.cs (Leviathan = 11); Data/Worlds/main_world/slave_spawns.json (5 entries).
5. Label: Room-by-room gate boss. Why: spawn file is grouped by room and comments tag each room boss and its event hooks. Keep: room order; gated boss in the last room. Change: layout and enemy set. Ref: AAEmu.Game/Data/Worlds/instance_nachashgar/npc_spawns.json (99 NPC entries).
6. Label: Leader-and-formation pack. Why: each group has one leader flag and per-member formation offsets with a tension value. Keep: leader flag plus offsets. Change: the formation shape (ring, wedge). Ref: SQL/patches/compact/2026-01-23-npc_group_members.sql (571 rows); 2026-01-23-npc_groups.sql (158 rows).
7. Label: Ranged roamer and holder pair. Why: each archer type ships in roaming and hold-position forms. Keep: roam versus hold split. Change: weapon and theme. Ref: AAEmu.Game/Models/Game/AI/v2/AiCharacters/ArcherRoamingAiCharacter.cs; ArcherHoldPositionAiCharacter.cs.
8. Label: Big roamer with hold mode. Why: same roam-or-hold split as the archer, for a large body. Keep: two AI characters per type. Change: body scale and skill set. Ref: AAEmu.Game/Models/Game/AI/v2/AiCharacters/BigMonsterRoamingAiCharacter.cs; BigMonsterHoldPositionAiCharacter.cs.

## 2. Classes, races, factions
- Races (Race.cs, 8 values): Nuian, Fairy, Dwarf, Elf, Hariharan, Ferre, Returned, Warborn. Start towns in Data/CharTemplates.json for 4 of them (Nuian, Elf, Hariharan, Ferre).
- Classes (Docs/wiki/Classes.md, status doc, NOT in code):
  - Sorcery: role, a ranged spellcaster. Signature: fire, frost and lightning spells (Fireball, Freezing Arrow, Chain Lightning, Meteor). Most spells are marked broken in the wiki. Progression: not documented.
  - Archery, Auramancy, Battlerage, Defense, Occultism, Shadowplay, Songcraft, Vitalism, Witchcraft: TODO in the wiki. Role, mechanic and progression are NOT read. Note: code has a Musical equipment slot (EquipmentItemSlot.cs, value 18), which is a hook for a music-based class but says nothing about one.
- Professions (ActabilityType.cs, 34 entries incl. None): Alchemy, Cooking, Farming, Fishing, Mining, Tailoring, Weaponry, Carpentry and 8 languages and dialects, plus Commerce, Artistry and Exploration. Progression limit is per ExpertLimit.cs (fields only; values not read).
- Factions: no faction enum read. Zone conflict states are in section 5.

## 3. Weapons
- Families: NOT in the box (no item rows). Weapon families: []
- Wield kinds (WeaponWieldKind.cs): One-handed, Two-handed, Dual-wielded.
- Weapon slots (EquipmentItemSlot.cs): Mainhand (15), Offhand (16), Ranged (17), Musical (18).
- Tiers: via ItemGrade (see section 4). Visual distinctness of tiers: NOT read.
- Top 5: none. No weapon data in the box to pick from. Not invented.

## 4. Armour and gear
- Tier ladder (ItemGrade.cs, 12 values, low to high): Crude, Basic, Grand, Rare, Arcane, Heroic, Unique, Celestial, Divine, Epic, Legendary, Mythic.
- Armour type (ArmorType.cs): Cloth, Leather, Metal, PetArmor, Etc.
- Set bonus rule (Models/Game/Units/Unit.cs, around line 1290 to 1330): 4-piece buff by armour type (Cloth4P, Leather4P, Plate4P). A second grade buff applies when 4 or more pieces are Arcane or above. Its level is taken from the summed item levels and the lowest grade among those pieces. Keep in mind: the constant 0.40670554 is marked in code as hand-calculated.
- Set structure: Models/Game/Items/Templates/ItemSet.cs and EquipItemSetBonus.cs (NumPieces, BuffId, ItemProcId). Set rows are NOT in the box.
- Cosmetic slots (EquipmentItemSlot.cs): Face (19), Hair (20), Glasses (21), Tail (23), Beard (25), Backpack (26), Cosplay (27). Visual toggles in Models/Game/Char/CharacterVisualOptions.cs: Helmet, BackHoldable, Cosplay, CosplayBackpack.
- Material tiers: NOT in the box. Client shows tiers; no metal, crystal or gold look data read.

Top 5 striking:
1. Arcane-gated four-piece bonus. Why: a tier gate (Arcane and up) that changes what a set does. Keep: the gate and lowest-grade rule. Change: the thresholds and names. Ref: AAEmu.Game/Models/Game/Units/Unit.cs.
2. Twelve-step grade ladder. Why: one clear ladder from Crude to Mythic, the widest tier spread in the box. Keep: ordering, a tier per step. Change: names and colours. Ref: AAEmu.Game/Models/Game/Items/ItemGrade.cs.
3. Three armour-family set buffs. Why: each armour family gets a 4-piece buff (Cloth, Leather, Plate). Keep: one buff per family. Change: the buff effects. Ref: AAEmu.Game/Models/Game/Units/Unit.cs (BuffConstants names).
4. Layered cosmetic slots. Why: several cosmetic slots (face, hair, glasses, tail, beard, backpack, cosplay) can sit over real gear. Keep: a separate cosmetic layer. Change: the slot list. Ref: AAEmu.Game/Models/Game/Items/EquipmentItemSlot.cs.
5. Enchant outcome ladder. Why: five outcomes (Break, Downgrade, Fail, Success, GreatSuccess) instead of a yes or no. Keep: a downgrade outcome that is not a break. Change: odds and names. Ref: AAEmu.Game/Models/Game/Skills/Effects/SpecialEffects/GradeEnchant.cs.

## 5. Zones and dungeons
- Worlds (18 folders): main_world (largest, 26,273 NPC entries and 42,656 doodad entries), arche_mall_world, racing_test_world, and 15 instances: instance_burntcastle_armory, instance_cradle_of_destruction, instance_cuttingwind_deadmine, instance_hadir_farm, instance_howling_abyss, instance_howling_abyss_2, instance_immortal_isle, instance_immortal_isle_easy, instance_library, instance_nachashgar, instance_nachashgar_easy, instance_prologue, instance_sal_temple, instance_training_camp, instance_training_camp_1on1. Counts from npc_spawns.json, UnitId entries.
- Climate enum (Climate.cs): Temperate, Tropical, Arctic, Arid, Auroria (plus Any and None).
- Zone conflict states (ZoneConflictType.cs, 8 values): Peace, Tension, Dispute, Unrest, Danger, Crisis, Conflict, War.
- Battlefields: 2 entries (battlefields.json), each with two corps spawn points.
- Dungeon archetypes seen in data: a long multi-room instance with a gate boss (nachashgar), a two-part instance (howling_abyss and _2, with slave spawns), a library-style instance (instance_library, 2,277 NPC entries), a short training instance (training_camp and _1on1, 14 NPC entries each), a mine-style instance by name only (cuttingwind_deadmine; layout not read).
- Hazards: NOT documented in the data read. Conflict states (section above) are the closest.
- Correction to AU002 (see below): instance_nachashgar_easy has EMPTY spawn files, and instance_immortal_isle_easy has spawn files byte-identical to instance_immortal_isle.

Top 5 striking:
1. Library instance: 2,277 NPC entries, the densest instance in the box. Ref: AAEmu.Game/Data/Worlds/instance_library/npc_spawns.json.
2. Two-part abyss: a second run of the same instance with fresh spawns (213 NPC and 220 doodad entries in part 1; 253 and 284 in part 2) and 6 slave spawns each. Ref: AAEmu.Game/Data/Worlds/instance_howling_abyss_2/.
3. Room-gated nachashgar: room order with a boss gate. Ref: AAEmu.Game/Data/Worlds/instance_nachashgar/npc_spawns.json.
4. Two-corps battlefield: symmetric corps spawns. Ref: AAEmu.Game/Data/battlefields.json.
5. Transport spawns: 70 entries in main_world/transfer_spawns.json (transport routes; the name matches TransferGameData.cs, which was not read). Ref: AAEmu.Game/Data/Worlds/main_world/transfer_spawns.json.

## 6. Item and effect looks worth recreating
- Looks (client-side visuals are NOT in the box; these are techniques read from data and code only):
  - Pack formation with leader and offsets (npc_group_members rows). Technique: per-member offset vectors around a leader. Ref: SQL/patches/compact/2026-01-23-npc_group_members.sql.
  - Two-phase boss switch (phase names in code comments). Technique: phase gate by health with a skill pipe per phase. Ref: AAEmu.Game/Models/Game/AI/v2/Params/Almighty/AiSkillList.cs.
  - Cosmetic layer over gear (cosmetic slots and visual flags). Technique: a visual flag set per character. Ref: AAEmu.Game/Models/Game/Char/CharacterVisualOptions.cs.
- Glows, auras and shaders: NOT read here. No shader or effect files in the box.

## 7. Inspiration for Frankendom
1. Name: Two-stance tide tyrant. Idea: a sea boss that swaps between a surface stance and a rising stance at health gates, each with its own skill pipe. Keep: health-gated phase switch and per-phase skill list. Change: the body (no wings), the palette and the phase names.
2. Name: Fin-mount leviathan. Idea: a sea-beast mount that only works in water. Keep: sea-only vehicle slot. Change: the body, the rune fins and the saddle.
3. Name: Gate-crypt run. Idea: a room-by-room instance where each room's boss opens the next door. Keep: room order and gate boss. Change: the layout and the enemy set.
4. Name: Twin-corps skirmish. Idea: a two-side battlefield with mirrored spawn corners. Keep: symmetry. Change: map, objective and theme.
5. Name: Standard-bearer pack. Idea: a pack that follows one leader in a shield-wall formation. Keep: leader flag and offsets. Change: formation shape and unit mix.
6. Name: Charge stone-boar. Idea: a stone-plated beast with one short charge move. Keep: a single burst charge. Change: species and silhouette.
7. Name: Mimic chest. Idea: a stationary chest that snaps at melee range and spits at range. Keep: two skill lists, stationary. Change: the body (chest, not plant).
8. Name: Arcane-gated set. Idea: a four-piece set whose second bonus unlocks only at the Arcane-and-up tier. Keep: the lowest-grade rule. Change: names, thresholds and bonus effects.

## Not read / not verified
- Client data (game_pak, compact.sqlite3 templates, models, textures, sound): not in the box. Nothing claimed about it.
- Creature levels, stats, kind and grade per creature: not in the box. Escalation with level NOT read.
- Weapon and gear item rows, set rows, material and glow looks: not in the box.
- Silhouettes and sounds for any creature: not read.
- SQL schema and content in aaemu_game.sql: only the table list was read.
- Code bodies: only the enum and parameter files named above. IndunGameData.cs, Weather/, Physics/ and the Lua scripts were not read.
- Doodads.xml: names and count only (its root element is Creatures; rows are doodad names).
- Restricted note: none in this donor (no _RESTRICTED-NOTE.txt at the tree root).
- No DMCA or leaked mirror hunting. Client download links in Docs/wiki/Client.md were not followed.

## Correction to AU002 (for Strategy)
- AU002 idea 3 says the easy instance folders "ship a second, easier folder with its own spawn files". This pass found: instance_nachashgar_easy/npc_spawns.json and doodad_spawns.json are both empty arrays (2 bytes each). instance_immortal_isle_easy/npc_spawns.json and doodad_spawns.json are byte-identical to instance_immortal_isle (cmp). So the easy-and-normal pair is NOT supported by the data. Treat AU002 idea 3 as withdrawn until re-checked.
- AU002 other claims checked here (18 world folders, two-part abyss with its own npc, doodad and slave files, Creatures.xml as name table) held.

## Licence note (as the files say)
- README.md states LGPL v3 for the project. LICENSE.GPL is the GPL v3 text. LICENSE.MIT is an MIT licence with "Copyright (c) 2019 Rain0Ash". The repo does not say which licence covers which code, so it is recorded as conflicting.
- README: "not affiliated with XLGames"; brands belong to their owners. Rights holder of the game data: not stated.
- Game data files: no licence line. Client files: not in the repo.
