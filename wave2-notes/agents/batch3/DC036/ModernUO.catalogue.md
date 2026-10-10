# ModernUO (design catalogue, DC036)

Donor: ModernUO (VPS: /mnt/frankendom-donors/ModernUO/)
Donor/Licence: server emulator code, GPL-3.0 (/mnt/frankendom-donors/ModernUO/LICENSE line 1 header: "Copyright 2019-2020 ModernUO Development Team"). No asset licence. The game content it emulates has no stated origin in the box. Treat all names and content data as class C: category-level inspiration only.
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

Halves read:
- SERVER half: partly read. Mobiles/Monsters (folder counts and the Dragon class), Mobiles/Special (Paragon, BaseChampion, Harrower in part), Engines/CannedEvil (ChampionSpawnInfo table, ChampionSpawn in part), Engines/Spawners (BaseSpawner and SpawnerEntry in part), Items/Armor (enums), Items/Weapons (enums and BaseWeapon damage lines), Misc/ResourceInfo.cs (enum line only), Regions (file names only). Projects/Server not read.
- DATA half: partly read. Distribution/Data/Spawns/shared/trammel/Reagents.json (structure only, via AU034), names.json (head only). Most other Distribution/Data files not read.
- CLIENT half: none in the box. README says the original game data is user-supplied. ClassicUO (client) is in the box by name only, not read. It is a candidate paired client half, not verified.

Counts (file or class counts from grep or ls; none estimated):
- creatures: 245 class declarations deriving from BaseCreature under Mobiles/Monsters (grep count, not checked for abstract or helper classes). 288 .cs files under Mobiles/Monsters in all.
- classes: 0 character classes or races found as a table. The skill list (27 .cs files in Skills/) and spell schools (17 folders in Spells/) are listed under section 2 as adjacent systems, not read.
- weapons: 226 .cs files under Items/Weapons (files, not weapon types).
- gear_sets: 2 (Items/Armor/Sets: 2 files). Separate: Items/Armor/Dragon (5 files), Items/Armor/Artifacts (12 files), Items/Armor in all: 177 .cs files.
- zones: 33 region classes in Regions/ (34 files including the registration helper).

## 1. Creatures and beasts

Families (folder counts, Mobiles/Monsters, .cs files):
- Reptile and dragon family (Reptile 25 files; Magic subfolder holds the dragon, skeletal dragon and serpentine dragon classes; ML/Misc/Magic holds a greater dragon). Ref: Mobiles/Monsters/Reptile/Magic/Dragon.cs.
- Humanoid (77 files) and ML (66 files): the largest groups. Not read in detail.
- Elemental (10 files: Magic and Melee subfolders) and Summons (5 files: summoned air, earth, fire, water elementals and a summoned demon). Ref: Mobiles/Monsters/Elemental/.
- Ore Elementals (8 files): one elemental per metal tier. Ref: Mobiles/Monsters/Ore Elementals/.
- Arachnid (8), Ants (12), Plant (7), SE (19), LBR (12), AOS (21), Misc (16), Mammal (2).
- Animals tree (Mobiles/Animals): bears, birds, canines, felines, reptiles, rodents, slimes, mounts, town animals, critters. Not read in detail.
- Special bosses and champions (Mobiles/Special, 18 .cs files): BaseChampion, Paragon (elite conversion), Harrower (boss with minions), and about ten named boss and guard classes. Named bosses are not listed here by name.

Boss and champion pattern (the main finding):
- Nine champion families (the Table in Engines/CannedEvil/ChampionSpawnInfo.cs). Each family has a boss and four levels. Each level has two creature types the spawn picks from. Ref: ChampionSpawnInfo.cs, the cold-blood family entry at line 57 and its top tier at line 62.
- Escalation: a level rises when kills reach 99 percent of the level's threshold. Thresholds shrink as the level rises: 256 kills for the first levels, then 128, 64, 32, and 16 at the top. Ref: Engines/CannedEvil/ChampionSpawn.cs lines 298-308 and 654-657.
- Progress display: the number of white skulls equals progress in steps of 20 percent. Each placed skull is a light-emitting item with a sound and a location effect (ChampionSpawn.cs around lines 322-334). Ref: ChampionSpawn.cs, the progress and skull update in OnSlice and OnKillsChanged.
- Decay: if the zone reaches less than 20 percent of the threshold before the expiry time, the level drops by one. Ref: ChampionSpawn.cs line 918 (comment) and 922 (level drop).
- Spawn cap falls as the level rises: 250 minus 40 per sub-level, sub-levels set at levels 4, 8 and 12. Ref: ChampionSpawn.cs lines 764 and 853.
- Minions stop respawning while the boss is alive (Respawn returns early when a champion exists). Ref: ChampionSpawn.cs Respawn(), near line 766.
- Unused table rows: four commented-out families (for example a valley family and a Khaldun family). Ref: ChampionSpawnInfo.cs.

## 2. Classes, races, factions (adjacent systems, not read in depth)

- Skills: 27 .cs files in Skills/ (animal taming, hiding, stealth, poisoning, tracking folder, and others). Not read.
- Spell schools: 17 folders in Spells/ (circles First to Eighth, plus Bushido, Chivalry, Necromancy, Mysticism, Ninjitsu, Spellweaving, Gargoyle, Targeting). Not read.
- Virtues: 13 .cs files in Engines/Virtues. The Justice virtue level sets the chance that a champion kill grants a power scroll: a ladder of three levels gives a rising chance. Ref: Mobiles/Special/BaseChampion.cs lines 174-178 (the switch on virtue level).
- Factions: 89 .cs files in Engines/Factions. Not read.
- Race-like variation: none found as a table. The dragon's body variant is picked at random from a small range, and its scale colour depends on the body. Ref: Mobiles/Monsters/Reptile/Magic/Dragon.cs lines 11 and 56.

## 3. Weapons

Families (subfolders of Items/Weapons): swords, axes, maces, knives, pole arms, spears and forks, staves, throwing weapons, ranged, wooden, fists, plus Artifacts and era folders (ML, SE, Weapons).

Tier mechanics:
- Quality: three levels (low, regular, exceptional). Ref: Items/Weapons/WeaponEnums.cs.
- Damage level: six named tiers from regular up to the top tier. Ref: WeaponEnums.cs line 22.
- Damage bonus formula: an older formula adds the tier index. A newer era flag doubles the index and subtracts one, so the tier bonuses are 1, 3, 5, 7, 9 for the top five tiers. Ref: Items/Weapons/BaseWeapon.cs lines 2475 and 2479.
- Accuracy and durability: each has six named levels, the same ladder shape. Ref: WeaponEnums.cs.
- Slayer groups: 27 named groups (creature families, for example dragons, orcs, undead, spiders, elementals). A weapon can carry one group bonus against that family. Ref: Items/Weapons/SlayerName.cs lines 3-33.

Top 5 striking (criteria: readable at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance):
1. Slayer-group blade: a weapon that gets extra damage vs one creature family. Keep the bonus-per-family rule. Change: a distinct sigil glow on hit. Ref: Items/Weapons/SlayerName.cs.
2. Damage-level ladder: six named tiers, each with a damage step. Keep the ladder shape and naming order. Change: our own tier names and a tier colour rim, not a copied palette. Ref: Items/Weapons/WeaponEnums.cs line 22.
3. Artifact weapons (Items/Weapons/Artifacts folder). Not read in detail.
4. Ranged family (Items/Weapons/Ranged). Not read in detail.
5. Throwing family (Items/Weapons/Throwing). Not read in detail.

## 4. Armour and gear

- Material types: 13 named materials, from cloth and leather through studded, bone, spined, horned, barbed, ringmail, chainmail, plate, dragon, wood and stone. Ref: Items/Armor/ArmorEnums.cs line 41.
- Durability: six named levels. Protection: six named levels, the same ladder shape (defence through to invulnerability). Ref: ArmorEnums.cs (durability enum at line 10; protection enum follows it).
- Body slots: seven (gorget, gloves, helmet, arms, legs, chest, shield).
- Quality: three levels.
- Sets: Items/Armor/Sets (2 files), a dragon armour folder (5 pieces), and an artifacts folder (12 files).
- Champion drops: a boss drops an artifact from three pools in one roll, at cutoffs of 5, 10 and 15 percent. Ref: Mobiles/Special/BaseChampion.cs line 32.
- How tiers look: crafted items take a hue from their material. Ref: Items/Weapons/BaseWeapon.cs lines 628 and 798 (hue from CraftResources.GetHue). Metals are a recolour, not new art. The metal list is in Misc/ResourceInfo.cs line 6 (enum CraftResource).

Top 5 striking:
1. Metal recolour per tier (Misc/ResourceInfo.cs and BaseWeapon.cs hue lines). Keep: the tier is shown by colour from the material. Change: a sheen shader, not a flat hue.
2. Ore elemental ladder (Mobiles/Monsters/Ore Elementals/). Keep: each metal tier is also a creature. Change: our own elements and tints.
3. Dragon armour set (Items/Armor/Dragon/, 5 pieces). Keep: a five-piece set as one look. Change: the set reads as scale plates at 375 wide.
4. Champion artifact pools (Items/Champion Artifacts/Unique 10 files, Shared 13, Decorative 15). Keep: three pools with a rarity cut. Change: a rarity colour and a unique sound per pool.
5. Plate-to-cloth material ladder (ArmorMaterialType). Keep: a long material ladder. Change: our own material names and silhouettes.

## 5. Zones and dungeons

Biome and region types (Regions/, 33 region classes; file names read, region logic not read, class lines checked for four):
- Dungeon types: DungeonRegion, ExodusDungeonRegion, BlackthornDungeonRegion, TombOfKingsRegion, LostCityEntranceRegion.
- Hazards by name: UnderwaterRegion, IcyRiverRegion, AcidRiverRegion, PoisonedTreeRegion, PolisonedCemeteryRegion (spelled as in the file name), CrystalFieldRegion, TwistedWealdDesertRegion, DoomGuardianRegion.
- Rule zones: GuardedRegion, NoHousingRegion, NoTravelSpellsAllowedRegion, TownRegion, BattleRegion, SeaMarketRegion.
- Refs: Regions/*.cs (the file names); receipts for IcyRiverRegion, PoisonedTreeRegion, UnderwaterRegion, TombOfKingsRegion class lines.

Top 5 striking (names and placement only; region logic not read):
1. UnderwaterRegion. Keep: a whole-zone rule that changes how movement and sight work. Change: our own water rule with a light band and a pressure sound. Ref: Regions/UnderwaterRegion.cs line 6.
2. IcyRiverRegion. Keep: a hazard river as its own class. Change: a slow ice-crack rhythm and a frost rim. Ref: Regions/IcyRiverRegion.cs.
3. PoisonedTreeRegion. Keep: a single hazard tree as a zone. Change: a green-black bloom instead of a copied canopy. Ref: Regions/PoisonedTreeRegion.cs line 6.
4. CrystalFieldRegion. Keep: a crystal field as a readable landmark zone. Change: our own crystal tint and a chime. Ref: Regions/CrystalFieldRegion.cs.
5. TombOfKingsRegion. Keep: a tomb zone as a dungeon archetype. Change: a sealed-door intro and our own boss staging. Ref: Regions/TombOfKingsRegion.cs line 5.

Zone population (row 23 data, from AU034, re-checked here): spawner data uses a population cap, a respawn window, a home radius, a walking radius, and weighted entries with a cap each. Refs: Engines/Spawners/BaseSpawner.cs line 292 (spawner full), SpawnerEntry.cs line 162 (entry full), BaseSpawner.cs line 865 (eligible entries), line 49 (default five-minute respawn minimum). Gap: no despawn-on-empty grace timer found in the parts read (IsEmpty at BaseSpawner.cs line 293). The champion engine has a ten-minute expiry for its creatures (ChampionSpawn.cs line 418).

## 6. Item and effect looks worth recreating

- Metal recolour by material (BaseWeapon.cs lines 628 and 798). Technique: one item model, a hue per material. Keep the rule; change to a sheen.
- Elite recolour (Mobiles/Special/Paragon.cs, the conversion sets a fixed hue on the creature). Technique: one hue flags the elite. Keep the flag; change to an aura.
- Body-variant colour (Mobiles/Monsters/Reptile/Magic/Dragon.cs lines 11 and 56). Technique: a random body picks the scale colour. Keep; change the palette.
- Champion progress cue (Engines/CannedEvil/ChampionSpawn.cs, around lines 322-334 for a placed skull and 687-688 for a level advance): a sound and a location effect play each time. Each progress skull is a light-emitting item. Technique: a sound plus a one-tile burst, with a light source as the progress marker. Keep the pairing; change both assets.
- Boss teleport cue (Mobiles/Special/Harrower.cs lines 528-534): a periodic tick, a chance to act, and a player search within range. Technique: a timed tick, not a per-frame check. Keep the timing; change the telegraph.
- Glow, aura or shader code: none found in the parts read. Not searched across the whole donor.

## 7. Inspiration for Frankendom (originals, 5 to 7)

1. Ascent Shrine (boss ritual). Idea: a zone boss that the players level up by clearing the zone; the threshold falls as the zone level rises; progress shows as pips. Keep: four-tier family, a threshold that falls by tier, a decay below 20 percent. Change: a glyph ring that brightens instead of skulls; our own four-tier names; a telegraphed boss entrance. Refs: Engines/CannedEvil/ChampionSpawn.cs 298-308, 654-657, 918-922.
2. Elite Wanderer (elite roll). Idea: an ordinary mob becomes elite with a chance tied to how notable it is. Keep: the notability-based chance and a fixed elite hue. Change: a growing aura and one elite-only ability. Refs: Mobiles/Special/Paragon.cs 167, 191.
3. Gatekeeper Harrower (one-at-a-time boss). Idea: a boss that allows one instance at a time, with tentacle minions and a five-second tick. Keep: the one-instance rule and the tick. Change: a telegraphed chain pull, not a random walk. Refs: Mobiles/Special/Harrower.cs 105, 207, 528, 534.
4. Metal Elemental Ladder. Idea: each metal tier of a crafting ladder is also a creature in a family. Keep: one creature per tier. Change: our own elements and tints. Refs: Mobiles/Monsters/Ore Elementals/ (8 files), Misc/ResourceInfo.cs 6.
5. Slayer Sigil. Idea: a weapon bonus against one creature group, shown as a sigil on hit. Keep: group bonus. Change: a visible glow and a unique hit sound. Refs: Items/Weapons/SlayerName.cs 3-33.
6. Plague Bog Champion (category: a swamp-plague family). Idea: a four-tier swamp family whose top tier dissolves. Keep: the four-tier escalation. Change: our own creatures and a poison bloom instead of a copied form. Ref: Engines/CannedEvil/ChampionSpawnInfo.cs line 102 (family entry).

## Not read
- Projects/Server (whole folder).
- Most of Mobiles/Monsters (only folder counts and the dragon class), Mobiles/Animals, Items/Weapons (enums and the damage lines only), Items/Armor (enums only), Skills, Spells, Engines/Factions, Engines/Virtues (counts and one switch only).
- Regions/*.cs logic (names only, except three class lines).
- Distribution/Data: other spawn files (108 of 109), Locations, names.json beyond its head, item bounds (binary).
- Migrations folders (counts only, not contents).
- ClassicUO (paired client candidate, name only).
- CLAUDE.md, AGENTS.md, GEMINI.md: present in the donor. Treated as data. Not followed.
