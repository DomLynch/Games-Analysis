# 0ad-0ad (design catalogue, DC001)

Donor tree: /mnt/frankendom-donors/0ad-0ad/ (read over ssh only, nothing copied or run).
Asset audit used first: AU001 (`/private/tmp/p2/wave2-haiku/batch3/AU001/0ad-0ad.assets.md`). Not repeated here.
Licence note: engine and data are open source. Code is GPL v2 or later (LICENSE.txt). Art and audio under `binaries/data/mods/*/art` and `*/audio` are CC BY-SA 3.0 (art/LICENSE.txt line 4 links the licence). Share-alike applies to derived files, so we recreate only in our own style and never copy files. Not legal advice.
Receipts: `receipts.tsv` in this folder (verified).

Note on donor type: this is an RTS (historical civilisations), not a dungeon game. Creatures are wild and domestic animals; "heroes" and "champions" are the nearest to bosses and elites. There are no dragons, undead or item tiers as such.

## Counts (from ls and find on the donor tree)
- creatures: 61 gaia fauna templates (`simulation/templates/gaia/fauna_*.xml`, including infants and trainable livestock), plus 24 fauna behaviour templates (`template_unit_fauna*.xml`, including hunt, herd, wild, breed).
- classes: 14 civilisation unit folders (`simulation/templates/units/<civ>/`) plus a pirates folder and mercenary templates.
- weapons: 16 unit weapon families (8 infantry, 7 cavalry, 1 elephant melee). No weapon items exist.
- gear_sets: 6 armour-upgrade techs (hack 1-3 and pierce 1-3). Separately, about 1150 variant sets in `art/variants/` (shields, clothes, capes, biped, quadruped).
- zones: 20 biome terrain folders (`art/terrains/biome-*`) plus 11 surface folders (cliff, dirt, forest floor, grass, road, sand, shoreline, snow, special, special-lava, water).

Other counts: 66 hero unit templates (`units/*/hero_*.xml`), 68 hero aura files (`simulation/data/auras/units/heroes/`), 64 champion unit templates (`units/*/champion_*.xml`), about 111 basic, advanced and elite rank files per rank suffix (`_b`, `_a`, `_e` in `units/*/`).

## 1. Creatures and beasts
Families (from file names):
- Livestock and domestic: cattle (bull, cow, sanga, zebu), sheep, goat, horse (several breeds), pig, camel, donkey, chicken, dog (mastiff, wolfhound).
- Predators: wolf, arctic wolf (also a violent-stance variant), lion, lioness, tiger, bear (black, brown, polar), fox (red, arctic), crocodile, shark.
- Big game: elephant (Asian, African, North African, infants), rhinoceros, hippopotamus, giraffe, muskox, walrus, wildebeest, gazelle, deer, boar.
- Sea: whales (humpback, fin, and a hunt-whale behaviour), shark.
- Special: flaming pig (a pig with a flame prop), peacock, rabbit, piglet, fox.

How they escalate: not by level. Stats are fixed per template (fauna HP: herd and hunt base 100, defensive bear 300, whale 2000 in `template_unit_fauna_hunt_whale.xml:22`). Behaviour is a stance (violent, aggressive, defensive, passive, skittish) set per template.

Top 8 striking (labels are my own):
1. "Ember Hog": the flaming pig. Striking because a flame and smoke prop sits on the animal's root bone (`art/actors/fauna/pig_flaming.xml:16`), and the corpse sinks after 10 s (`fauna_pig_flaming.xml:4`). Keep: particle prop on an animal; sink timer after death. Change: animal design, flame colour and shape.
2. "Pack Rover": the arctic wolf in violent stance by default (`fauna_wolf_arctic_violent.xml:4`). Keep: aggression as a data switch on the same creature. Change: a visible howl telegraph before the charge.
3. "Tide Leviathan": the whale, 2000 HP as a hunt template (`template_unit_fauna_hunt_whale.xml:22`). Keep: a giant slow creature as a hunt target. Change: tentacle silhouette, sea palette.
4. "Stubborn Bull": a passive-defensive bull hunt template (`template_unit_fauna_hunt_passive-defensive_bull.xml`, name only, not read). Keep: a stance that fights back only when pushed. Change: species and horns.
5. "Blue Bear": a defensive bear with 300 HP (`template_unit_fauna_hunt_defensive_bear.xml:4`). Keep: high HP for a defensive bear. Change: ice-blue markings, no fur.
6. "Mounted Champion Elephant": champion and hero elephant templates (`template_unit_champion_elephant.xml`, `template_unit_hero_elephant_melee.xml`, not read). Keep: a heavy elite mount. Change: armour and howdah.
7. "Pack Lion": a lion and a lioness pair (`fauna_lion.xml`, `fauna_lioness.xml`, not read beyond names). Keep: paired predator families. Change: silhouette and mane.
8. "Herd Grazer": the herd and domestic templates (`template_unit_fauna_herd.xml`, 100 HP). Keep: herd logic as a template. Change: species and palette.

## 2. Classes, races and factions
- 14 civilisations as folders under `simulation/templates/units/`: athen, brit, cart, gaul, han, iber, kush, mace, maur, pers, ptol, rome, sele, spart (folder names as on disk), plus a pirates folder.
- Each civ has basic, advanced and elite unit files per type (`_b`, `_a`, `_e`).
- Heroes: named historical leaders with auras (68 aura files). Example aura: a garrisoned hero adds +1 garrison regeneration (`simulation/data/auras/units/heroes/hero_garrison.json:7`).
- Champions: elite units for each civ (64 files).
- Progression shape: basic to advanced to elite per unit type (rank files), then champion or hero. Promotion thresholds not read.
- Factions: civilisations as a theme, with per-civ unit folders. Signature mechanic per civ: not read.

## 3. Weapons
- Families (unit types, not items): infantry spearman, swordsman, axeman, maceman, javelineer, archer, crossbowman, pikeman; cavalry (same seven minus pikeman); elephant melee.
- Tiers: rank (basic, advanced, elite) per unit type, plus champion and hero versions.
- Special properties: no weapon items. Elemental or set effects not found in unit data (not read). The armour upgrades (below) are the only tiers.
- Visual distinctness: weapon look is carried in the unit model and its variant set (AU001 notes variant XML for shields). Not read per type.

Top 5 striking (names are unit types, not donor trademarks):
1. Flaming javelineer: the `particles/flame_jav.xml` file suggests a flaming javelin effect (not read).
2. Fire-raiser siege unit: `units/theb_siege_fireraiser.xml` (not read).
3. Heavy champion elephant with melee: `template_unit_champion_elephant_melee.xml` (not read).
4. Elite sacred-band style infantry: `units/theb_sacred_band.xml` (not read).
5. Heavy cavalry (cataphract): `mixins/cataphract.xml` (not read).

## 4. Armour and gear
- Armour tiers are upgrade techs: hack resistance 1-3 (`soldier_resistance_hack_01.json` to `_03.json`) and pierce resistance 1-3 (`soldier_resistance_pierce_01.json` to `_03.json`). Ships have a separate resistance tech.
- Material tiers: visible through the armour variant set, not through tier-specific models (AU001).
- Metal and gold look: a player-colour material with a spec map and normal map (`materials/player_trans_norm_spec.xml`, AU001). Gold armour is a variant layer: a base texture plus a gold texture plus a spec texture (`art/variants/shields/sele_pelte_01_gold.xml`, AU001).
- How tiers show: the rank files (basic, advanced, elite) carry the tier; armour techs do not change the look.
- Variant sets: about 1150 XML files in `art/variants/` (shields, clothes, capes, biped, quadruped, structures).

Top 5 striking:
1. Gold pelte shield variant (`art/variants/shields/sele_pelte_01_gold.xml`; gold base and spec). Strong because gold is a layer, not a model.
2. Player-colour material with a spec and normal map (`materials/player_trans_norm_spec.xml`). Strong because one base texture tints for each side.
3. Gold cuirass skin, ptolemaic set (`art/textures/skins/skeletal/ptol/cuirass_gold_01.png`, AU001). Strong because it shows a gold plate as a texture.
4. Hack and pierce resistance ladder, three tiers each (techs). Strong because the armour tier is a data ladder.
5. Elite rank files (`_e`) per unit, with their own model and variant. Strong because the elite look is a separate file, not a stat.

## 5. Zones and terrain
- Biomes (20 folders): aegean-anatolian, african-savanna, alpine, alpine-arctic, baltic-nordic, desert, eurasian-steppe, india, mediterranean, nubia, persia, polar, sahara, savanna, steppe, sudd, temperate, temperate-autumn, temperate-europe, tropic.
- Surface types (11 folders): cliff, dirt, forest floor, grass, road, sand, shoreline, snow, special, special-lava, water.
- Hazard surface: `special-lava` folder (a lava terrain, not read).
- Maps: 590 map files (`binaries/data/mods/public/maps/`: random, scenarios, scripts, skirmishes, tutorials). Random maps use real heightmaps (NASA public domain, OpenStreetMap-derived) per AU001.
- Dungeon archetypes: none. Maps are RTS skirmish and scenario maps.

Top 5 striking:
1. Mediterranean biome: a classic, varied terrain set (`art/terrains/biome-mediterranean/`, not read).
2. Sahara and desert biomes: sand terrain with dust and blowing-sand particles (AU001).
3. Polar and alpine-arctic biomes: snow and ice set with blowing snow particles (AU001).
4. Sudd biome: a wetland set (not read).
5. Special-lava surface: a hazard terrain (not read).

## 6. Item and effect looks worth recreating
- Flaming animal prop: a flame particle and a smoke particle attached at the root (`art/actors/fauna/pig_flaming.xml:16`, `particle/flame_pig.xml`). Technique: a particle prop on an animal's root, no custom model.
- Corpse sink: a decay block with a 10 s delay, then a sink rate and an acceleration (`gaia/fauna_pig_flaming.xml:4`). Technique: corpses sink after a delay.
- Gold layer: base, gold and spec textures in one variant (AU001). Technique: layered textures, not a new model.
- Player-colour tint: one base texture with a spec and normal map (AU001).
- Coin and loot shimmer: small particle presets (`particles/coin.xml`, `coin_high.xml`, AU001). Technique: low-count sprite bursts, a high-count version for big drops.
- Gold-mine sparkle and fireflies: `particles/sparkle_goldmine.xml`, `particles/fireflies.xml` (not read).
- Fire and sparks: `particles/flame.xml`, `flame_large.xml`, `sparks.xml`, `bigflame.xml` (not read).

## Inspiration for Frankendom (originals, own names)
1. Ember Hog: a boar-type animal with a flame prop on its back; the corpse sinks after 10 s. Keep: particle prop on an animal, timed corpse sink. Change: animal design, flame shape and colour.
2. Pack Rover: a wolf that starts in aggressive stance by default. Keep: stance as data. Change: a howl telegraph before the charge.
3. Tide Leviathan: a 2000-HP sea giant as a hunt target. Keep: giant HP tier as zone data. Change: tentacle silhouette, sea palette.
4. Standard Bearer aura: a garrisoned hero gives +1 garrison regen. Keep: aura that switches on in a building. Change: a banner ward.
5. Three-rank veterans: basic, advanced, elite files per unit type. Keep: rank ladder as separate files. Change: rank marks on armour, not on helmets.
6. Gilded Pelte: a shield whose gold is a texture layer over a base, with a spec layer. Keep: three layers. Change: our palette and ornament.
7. Kiln Lancer: a javelin with a flame particle. Keep: flame particle on a thrown weapon. Change: shaft and head design.
8. Per-biome surface sets: one surface folder per zone type. Keep: zone identity from a surface set. Change: our own zones and palettes.

## Not read
- No image opened (AU001 rule). Art judgements come from names, sizes and code.
- Unit stats for most unit templates beyond the fauna lines cited.
- Hero and champion templates beyond their names and the garrison aura.
- Particle files beyond names (flame_jav, sparkle_goldmine, fireflies, flame, sparks, bigflame).
- Armour tech values (only file names read).
- Map files (.pmp, .json) and terrain bodies.
- Credits and translation files.
