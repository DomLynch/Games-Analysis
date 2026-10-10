# Design catalogue: ACEmulator-ACE (DC003, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/ACEmulator-ACE/
Asset audit read first: /private/tmp/p2/wave2-haiku/batch3/AU002/ACEmulator-ACE.assets.md
Donor class for inspiration: C. Code is AGPLv3 and the assets carry no licence line. Client data (DAT files) is not in the repo. Per the brief, inspiration stays CATEGORY-LEVEL (for example "a plated construct boss", never an instance-level look).

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Roughly 20-30 percent resemblance, in mood only. Each brief names the trait KEPT and the trait CHANGED. This is design inspiration, not a legal opinion.

## Which half was read
- Server and content-definition half: read in part. Source/ACE.Entity/Enum/*.cs (enums for creature types, materials, armour, equipment sets, heritage groups, skills, properties), Database/Base/*.sql (schema only), Database/Updates/Shard fix file names and one header.
- Matching other half (world database content, client DAT files): NOT in the box. Database/Base/WorldBase.sql and ShardBase.sql contain CREATE TABLE statements only (54 and 40 tables) and zero INSERT rows. So weenie (creature and item) rows, landblocks and encounters have no content in this box. The DAT loader (Source/ACE.DatLoader) was not read.

## Data tables used (names, not loaders)
- Source/ACE.Entity/Enum/CreatureType.cs: 102 creature type entries.
- Source/ACE.Entity/Enum/MaterialType.cs: 78 material entries (including Unknown).
- Source/ACE.Entity/Enum/ArmorType.cs: None, Cloth, Leather, StuddedLeather, Scalemail, Chainmail, Metal (7 with None).
- Source/ACE.Entity/Enum/EquipmentSet.cs: 141 set entries (including Invalid and test entries).
- Source/ACE.Entity/Enum/HeritageGroup.cs: 13 heritage groups (plus Invalid).
- Source/ACE.Entity/Enum/Skill.cs: 39 entries by line count, including retired ones (the file's own comment says they must not be removed).
- Source/ACE.Entity/Enum/Properties/PropertyInt.cs and PropertyFloat.cs: weapon aura, luminance, shade and translucency properties.
- Database/Updates/Shard: 33 fix files, dated, one item or spell each (names listed below). Database/Updates/World: 1 file. Database/Optional/Shard: 2 files. Database/Archive: 81 files in 3 dated folders (names only).

## Counts (basis in brackets)
- creatures: 102 creature type entries [CreatureType.cs]. No creature rows in the box.
- classes: 13 heritage groups [HeritageGroup.cs]. ACE has no class enum; heritage is the race-like grouping.
- weapons: 0 weapon rows in the box. Named weapon and shield fix files: 7 (see section 3).
- gear_sets: 141 equipment set entries [EquipmentSet.cs]; these are set and cloak entries, not set rows with bonuses. 0 set-bonus rows in the box.
- zones: 0 landblock or encounter rows in the box (tables exist in Database/Base/WorldBase.sql).

## 1. Creatures and beasts
Families (names from CreatureType.cs, grouped by me, category level only):
- Elemental quartet: FireElemental, LightningElemental, AcidElemental, FrostElemental (plus a generic Elemental entry).
- Undead line: Undead, Skeleton, Mumiyah, Ghost, Apparition, DarkSarcophagus.
- Plated construct line: Golem, Statue, Doll, Marionette, Device, Scarecrow, Wall, Idol, Crystal.
- Armoured beast line: Armoredillo, Auroch, Tusker, Ursuin, Grievver.
- Swarm line: Mite, PhyntosWasp, Swarm.
- Water line: ShallowsShark, Reedshark.
- Critter variant family: Rabbit, Bunny, BleachedRabbit, NastyRabbit, GrimacingRabbit.
- Sprite line: Wisp, Fae.
- Also present but not grouped here: Olthoi-family types, Virindi, Empyrean and others (102 types in total).
- Tiers and escalation: NOT in the box (creature stats live in weenie rows, which are absent). Boss pattern: NOT read.
- Half: enum read (server side). Matching creature rows: absent.

Top 8 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance). Silhouette and sound are NOT read for any of these; picks rest on the family name and count only.

1. Label: Elemental quartet. Why: four elements as four sibling types of one family, an easy readable set. Keep: one family, four element variants. Change: our own four elements and palette. Ref: Source/ACE.Entity/Enum/CreatureType.cs (FireElemental, LightningElemental, AcidElemental, FrostElemental).
2. Label: Plated construct line. Why: nine construct-type names (golem, statue, doll, marionette, scarecrow and similar) read as one "animated object" family. Keep: animated-object theme. Change: materials, silhouette and sound. Ref: Source/ACE.Entity/Enum/CreatureType.cs.
3. Label: Undead line. Why: six undead-type names give a deep, ranked-looking family. Keep: a family spanning a sarcophagus through a ghost-type. Change: names and look. Ref: Source/ACE.Entity/Enum/CreatureType.cs (Undead, Skeleton, Mumiyah, Ghost, Apparition, DarkSarcophagus).
4. Label: Armoured beast line. Why: five armoured beasts, each a different shell, one family. Keep: shelled beast family. Change: shell design. Ref: Source/ACE.Entity/Enum/CreatureType.cs (Armoredillo, Auroch, Tusker, Ursuin, Grievver).
5. Label: Swarm line. Why: a swarm family (mites and wasps) suits crowds at 375 wide. Keep: swarm plus one large variant. Change: species. Ref: Source/ACE.Entity/Enum/CreatureType.cs (Mite, PhyntosWasp, Swarm).
6. Label: Critter variant family. Why: one critter in five variants (plain, bleached, nasty, grimacing, bunny). Keep: a single base with variant tags. Change: the critter and the variant names. Ref: Source/ACE.Entity/Enum/CreatureType.cs (Rabbit, Bunny, BleachedRabbit, NastyRabbit, GrimacingRabbit).
7. Label: Water pair. Why: two water hunters (shark and reedshark) give a shore-and-shallows contrast. Keep: a shallows-only pair. Change: body and sound. Ref: Source/ACE.Entity/Enum/CreatureType.cs (ShallowsShark, Reedshark).
8. Label: Sprite line. Why: two sprite types (wisp and fae) for a light-based ambient creature. Keep: a light-sprite family. Change: the glow colour and form. Ref: Source/ACE.Entity/Enum/CreatureType.cs (Wisp, Fae).

## 2. Classes, races, factions
- Heritage groups (HeritageGroup.cs, 13): Aluvian, Gharundim, Sho, Viamontian, Shadowbound, Gearknight, Tumerok, Lugian, Empyrean, Penumbraen, Undead, Olthoi, OlthoiAcid.
- Role, signature mechanic and progression per heritage: NOT in the box (stats are in absent data).
- Skills (Skill.cs, 39 lines): skill list is ordered by file comment; retired entries are kept. Progression rules: NOT read.
- Factions: no faction enum read.

## 3. Weapons
- Families (from fix file names in Database/Updates/Shard; item rows absent):
  - Dagger: Stormwood Dagger (Database/Updates/Shard/2021-12-19-00-Fix-Stormwood-Dagger.sql).
  - Bows: Black Cloud Bow (Database/Updates/Shard/2022-05-14-01-Fix-Black-Cloud-Bow.sql); Rynthid Tentacle Bow (Database/Updates/Shard/2021-06-17-00-Fix-Rynthid-Tentacle-Bow-WeenieType.sql).
  - Silveran red-rune weapons: a family (Database/Updates/Shard/2022-01-14-00-Update-Red-Rune-Silveran-Weapons.sql).
  - Shield: Shield of Perfect Light (Database/Updates/Shard/2022-01-14-01-Update-Shield-of-Perfect-Light.sql).
  - Orb: Nether Society Orb (Database/Updates/Shard/2022-05-14-03-Fix-Nether-Society-Orb.sql).
  - Purified weapons (wield requirement fix, Database/Updates/Shard/2023-07-14-00-Fix-Purified-Weapons-Wield-Requirement.sql).
- Special properties: weapon aura properties in PropertyInt.cs (WeaponAuraDamage 360, WeaponAuraSpeed 361) and PropertyFloat.cs (WeaponAuraOffense 168, WeaponAuraDefense 169, WeaponAuraElemental 170, WeaponAuraManaConv 171).
- Weapon tiers and visual distinctness: NOT read.
- Top 5 striking:
  1. Weapon aura family. Why: four or more aura stats (offense, defense, elemental, mana conversion) can sit on one weapon, a clear glow-as-stat idea. Keep: one aura per weapon, numeric family. Change: aura names and visual. Ref: Source/ACE.Entity/Enum/Properties/PropertyFloat.cs.
  2. Silveran red-rune family. Why: a whole weapon family tied to one rune motif. Keep: one motif across a family. Change: motif and palette. Ref: Database/Updates/Shard/2022-01-14-00-Update-Red-Rune-Silveran-Weapons.sql.
  3. Black Cloud Bow. Why: a bow named after weather, a clear silhouette name. Keep: weather name, bow form. Change: motif. Ref: Database/Updates/Shard/2022-05-14-01-Fix-Black-Cloud-Bow.sql.
  4. Shield of Perfect Light. Why: a light-themed shield, a readable shape at 375 wide. Keep: light motif. Change: shape. Ref: Database/Updates/Shard/2022-01-14-01-Update-Shield-of-Perfect-Light.sql.
  5. Nether Society Orb. Why: an orb-form focus with a society tie. Keep: orb focus. Change: society name and element. Ref: Database/Updates/Shard/2022-05-14-03-Fix-Nether-Society-Orb.sql.

## 4. Armour and gear
- Material tiers (MaterialType.cs, 78 entries): textiles (Cloth, Linen, Satin, Silk, Velvet, Wool), gems (about 40 names, for example Ruby, Sapphire, Emerald, Diamond, Opal), hides (Leather, ArmoredilloHide, GromnieHide, ReedSharkHide), metals (Brass, Bronze, Copper, Gold, Iron, Pyreal, Silver, Steel), stones (Alabaster, Granite, Marble, Obsidian, Sandstone, Serpentine, Stone), woods (Ebony, Mahogany, Oak, Pine, Teak, Wood), plus Ivory and Ceramic and Porcelain.
- Armour types (ArmorType.cs): Cloth, Leather, StuddedLeather, Scalemail, Chainmail, Metal.
- Equipment sets (EquipmentSet.cs, 141 entries). Families by name count:
  - Aetheria (5): Defense, Destruction, Fury, Growth, Vigor.
  - Cloak sets (41): one cloak per skill (for example Alchemy, Healing, Spear, Staff, Shield).
  - Shroud-style combinatorial family: three bases (ShroudedSoul, DarkenedMind, CloudedSpirit) x four elemental adjectives (Stinging, Sparking, Smoldering, Shivering) x three tiers (Minor 12, Major 12, Blackfire 12). Total 36 combined set entries.
  - Olthoi (5), Paragon (3), Ninja (2), Society (armour, bands and lockets), Reinforced, Interlocking, Flameproof, Acidproof, Coldproof, Lightningproof.
- Set bonus rows (EquipItemSet): NOT in the box.
- Gold and silver looks: metals are material entries (Gold, Silver, Pyreal). Visual look per material: NOT read (client side).
- Top 5 striking:
  1. Shroud-style combinatorial family. Why: 36 set entries from three bases, four elemental adjectives and three tiers. A clean grid to design from. Keep: base x element x tier grid. Change: all names and the element set. Ref: Source/ACE.Entity/Enum/EquipmentSet.cs.
  2. Aetheria quintet. Why: five named set parts in one family (defense, destruction, fury, growth, vigor). Keep: five-way family with a named role each. Change: names and roles. Ref: Source/ACE.Entity/Enum/EquipmentSet.cs.
  3. Golden Flame aegis fix. Why: one signature stat (magic absorb) on one named item, a memorable single-stat identity. Keep: one signature stat. Change: the stat and the motif. Ref: Database/Updates/Shard/2022-05-14-04-Fix-Aegis-of-the-Golden-Flame.sql (header read: PropertyFloat.AbsorbMagicDamage on item 35982).
  4. Hide-and-metal material split. Why: materials split into hide, metal, stone and wood families, a clear readable material ladder. Keep: family-based material split. Change: materials. Ref: Source/ACE.Entity/Enum/MaterialType.cs.
  5. Cloak per skill. Why: one cloak per skill, a cosmetic-plus-stat reward. Keep: one item per skill. Change: the skill list and the look. Ref: Source/ACE.Entity/Enum/EquipmentSet.cs (Cloak* entries).

## 5. Zones and dungeons
- Zone content: NOT in the box (no landblock or encounter rows). Schema names only: Database/Base/WorldBase.sql has tables landblock_instance, landblock_instance_link, encounter, points_of_interest.
- Biomes, dungeon archetypes, hazards: NOT read. Zone list: []
- Top 5: none. Not invented.

## 6. Item and effect looks worth recreating
- Weapon aura (numeric properties). Technique: a stat family on the weapon. Ref: Source/ACE.Entity/Enum/Properties/PropertyFloat.cs.
- Shade and translucency (float properties Shade 12, Shade2 84, Shade3 85, Shade4 86, Translucency 76). Names only: what they do visually is NOT read. Ref: Source/ACE.Entity/Enum/Properties/PropertyFloat.cs.
- Luminance award (PropertyInt LuminanceAward 332) as a progress currency: NOT a visual, listed for the progression idea. Ref: Source/ACE.Entity/Enum/Properties/PropertyInt.cs.
- Glow, aura and shader effects in the client: NOT read.

## 7. Inspiration for Frankendom
1. Name: Elemental quartet. Idea: four sibling elemental creatures that share one body plan and differ by element. Keep: one family, four variants. Change: our element set, palette and sound.
2. Name: Animated-object line. Idea: a family of constructs (statue, doll, scarecrow-type) with one shared "wakes up" move. Keep: animated-object theme. Change: materials and silhouette.
3. Name: Grid set. Idea: a 36-entry set grid of three bases, four elemental adjectives and three tiers. Keep: base x element x tier grid. Change: all names, the element set and the bonus per cell.
4. Name: Weapon aura. Idea: a weapon that carries one aura stat drawn from a small family (offense, defense, elemental). Keep: one aura per weapon. Change: the aura names and the glow.
5. Name: Critter variants. Idea: one critter in five variants (plain, bleached, nasty, grimacing, bunny) for a seasonal or event spawn. Keep: one base, variant tags. Change: the critter and the variant names.
6. Name: Rune silver family. Idea: a weapon family tied to one rune motif with a silver-and-red palette. Keep: one motif across a family. Change: motif and palette.
7. Name: Shore-and-shallows pair. Idea: a shallows-only hunter and a reed-dwelling hunter. Keep: a water-only pair. Change: body, sound and behaviour.
8. Name: Single-stat aegis. Idea: a named armour piece whose identity is one signature absorb stat. Keep: one signature stat. Change: the stat and the motif.

## Not read / not verified
- World database content, creature and item rows, landblocks, encounters: not in the box (schema only).
- Client DAT files (client_portal.dat, client_highres.dat, portal.dat) and the DAT loader: not in the box or not read.
- Silhouettes, palettes and sounds of any creature or item: not read. Icons (ace-retro-icon.png, ace-retro-icon2.png, ace_retro_icon_2.ico) not viewed.
- Shard fix bodies: only the Golden Flame header read. The rest are named by file name.
- Database/Archive (81 files): names only, not read.
- starterGear.json: not read in this pass (the audit read its first lines).
- Source/ACE.Server and ACE.Entity code beyond the enum files: not read (grep only).
- The 107 .txt files and changelog.md: not read.
- The spell fix named Hieroglyph of Healing Mastery: name only (2023-09-02-00-Update-Spell-Hieroglyph-of-Healing-Mastery.sql), not opened.
- Restricted note: none in this donor.
- No DMCA or leaked mirror hunting. Release download links in README.md were not followed.

## Licence note (as the files say; quoted lines are from AU002 and were not re-read in this pass)
- LICENSE is GNU AGPL v3. Source/lib/README.md line 1 (per AU002): the included ACE DLL files are AGPLv3 licensed.
- Source/lib/Lifestoned.DataModel.dll: MIT per Source/lib/README.md line 9 (per AU002); licence file reads "Copyright (c) 2018 Scribble" (per AU002).
- README.md line 19 (per AU002): "educational and non-commercial purposes only", game client use "for interoperability with the emulated server".
- README.md line 20 (per AU002): "Asheron's Call was a registered trademark of Turbine, Inc. and WB Games Inc which has since expired." Recorded as the file says; no legal reading given.
- Assets: no asset licence statement anywhere in the repo. Icons and SQL content carry no licence line. Client data is not in the repo.
