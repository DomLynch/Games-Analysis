# Design catalogue: afritz1-OpenTESArena (DC004)

Root on VPS: /mnt/frankendom-donors/afritz1-OpenTESArena/ (paths below are relative to it).
Rule for every brief: recreate as a clearly distinct original, never a copy. Inspiration is mood and mechanism only, about 20-30 percent resemblance.

## Which half was read
- **Client/engine half (read):** OpenTESArena/src/ (Entities, Items, Stats, Combat, Voxels, Assets) and data/ (shaders, meshes, ui, exe string files listed only).
- **Data pack half (not read):** the original Arena game data and executable. Not in the box: the README (line 120) says the user extracts it from their own copy. The loader is ExeData (OpenTESArena/src/Assets/ExeData.h), and I read only its field declarations, not the values.
- Server half: none in this repo (single engine).

Note: the names, stats, loot and tier values for creatures, classes, weapons and armour come from the exe at runtime. Those values are NOT in the box, so every creature and item name below is a declared slot, not a read value. Data first: the tables cited are ExeData.h structs.

## Licence (as the files say)
- Code: MIT (LICENSE.txt line 1).
- Assets: no separate asset licence (README line 9 says no game assets are distributed).
- Rights holder: fan clean-room reimplementation (README line 9). Original game data is user-supplied.
- Class for us: code class A (inspiration and reuse of code ideas per the MIT terms as the file says). Original creature, item and class data: class D, inspiration only and category-level.

## Counts (declared in source; values not read)
- creatures: 24 slots (23 named plus a final boss), OpenTESArena/src/Assets/ExeData.h:164 and OpenTESArena/src/Entities/ArenaEntityUtils.h:59-60.
- classes: 18 original classes in 3 categories of 6 (CharacterClassLibrary.cpp:25 and :31; CharacterClassDefinition.h:13-15).
- races: 8 playable (CharacterRaceLibrary.cpp:11 uses PROVINCE_COUNT minus 1, CityDataFile.h:47 is 9).
- weapons: 18 weapon names plus 14 enchantment names (ExeData.h:313 and :321).
- gear: 3 armour families (plate, chain, leather), 11 pieces each including shields (ExeData.h:285-301), and 8 material tiers (ExeData.h:272).
- zones: 10 interior archetypes (ArenaTypes.h:64-75), 3 climates (:161), 3 chasm types (:143), 8 weather types (:170), 10 voxel types including none (:127).

## 1. Creatures and beasts
- Families are not in the code; the exe names 23 creatures. The code gives the mechanics per creature (ExeData.h:159-190): level, HP min and max, base XP plus max HP times an XP multiplier (ExeData.h:167), damage min and max, a magic-effect value, a scale in 1/256ths, a Y offset, a corpse flag, a blood effect index, disease chance, 8 attributes, loot chance.
- Escalation with level: level is one field per creature (ExeData.h:165). The values are in the exe, NOT read. Shape only.
- Special groups in code: an undead list of 7 IDs (ExeData.h:183); 4 disease-giving IDs and disease lists (ExeData.h:180-181); 2 ghost-flagged creatures at index 11 and 14 (ArenaAnimUtils.cpp:865-868).
- Boss pattern: the final boss has its own display name, separate from the list (CreatureDefinitionLibrary.cpp:19), and its loot chance is set to 0 with a todo (CreatureDefinitionLibrary.cpp, final-boss branch).
- Animation: each creature has a directional animation filename with a 1-to-6 angle slot (ExeData.h:189; ArenaAnimUtils.cpp:185-188).

### Top 8 creature briefs (category level, not instance looks)
1. **Undead retinue** (label: undead band). Why: a group flag makes a whole family of enemies behave alike. Keep: the shared undead group. Change: our own undead palette and silhouette, not a copy of any sprite. Ref: OpenTESArena/src/Assets/ExeData.h:183.
2. **Ghost pair** (label: veil wisp). Why: two ghost-flagged enemies, a translucent category. Keep: the ghost flag as a rule. Change: our own shape and a cold-blue haze, not the original sprite. Ref: OpenTESArena/src/Entities/ArenaAnimUtils.cpp:867.
3. **Corpseless beast** (label: vanishing beast). Why: a per-creature corpse flag and a blood-effect index give an instant vanish-or-splatter read. Keep: the no-corpse flag and a per-creature blood effect. Change: our own vanish effect (dust motes, not blood). Ref: OpenTESArena/src/Assets/ExeData.h:176.
4. **Scaled giant** (label: scaled brute). Why: each creature has its own scale in 1/256ths, so size varies without new models. Keep: data-driven scale and Y offset. Change: our own proportions with a fixed height ladder. Ref: OpenTESArena/src/Assets/ExeData.h:173-174 (scale and Y offset fields).
5. **Disease carrier** (label: plague carrier). Why: a per-creature disease chance and disease lists turn a hit into a status. Keep: the chance-per-creature mechanic. Change: our own status icon and a green fume, not the original. Ref: OpenTESArena/src/Assets/ExeData.h:177-181.
6. **Final boss with own name** (label: lone warden). Why: the boss is outside the list, with its own name and no normal loot. Keep: the separate boss slot and no loot table. Change: our own staged fight and a phase cue. Ref: OpenTESArena/src/Entities/CreatureDefinitionLibrary.cpp:19 and the final-boss branch.
7. **Directional-sprite beast** (label: six-angle hunter). Why: one creature shown from 6 angles with a file per angle. Keep: angle-relative animation slots. Change: our own 3D rig with turn blend, not sprite sheets. Ref: OpenTESArena/src/Entities/ArenaAnimUtils.cpp:185-188 and ExeData.h:189.
8. **Attribute-shaped enemy** (label: attribute brute). Why: 8 attributes per creature, scored out of 255 where 255 means 100. Keep: the 8-attribute vector per creature. Change: our own names and a 0-to-10 scale for phone readability. Ref: OpenTESArena/src/Assets/ExeData.h:178 (creatureAttributes).

## 2. Classes, races and factions
- Classes (18, 3 categories of 6): the categories are mage, thief and warrior (CharacterClassDefinition.h:13-15).
  - Role: mage = spell points by intelligence multiplier; thief = thieving divisors; warrior = armour and weapons (CharacterClassLibrary.cpp:20-23 lists the fields).
  - Progression shape: health dice, initial experience cap, and preferred attributes per class.
  - Gear access: four armour-permission levels, from all three armour types down to none (CharacterClassLibrary.cpp:42-57).
- Races (8 playable): one race swims at normal speed with a high stamina drain, another climbs 4 times faster (CharacterRaceLibrary.cpp:22-31). Race is a movement trait, not a combat class.
- Factions: not catalogued (city and province data are in the data pack, not read).

## 3. Weapons
- Families: 18 weapon names from a staff up to a long bow (comment at ExeData.h:313), 14 enchantment names (ExeData.h:321). Each weapon has quality, base price, weight, damage min and max, and handedness (ExeData.h:314-318).
- Special properties: enchantment names (ExeData.h:321). Values not read.
- Visual distinctness: not in the code; per-weapon art is in the data pack.

### Top 5 weapon briefs (category level)
1. **Staff-type caster** (label: rune staff). Why: a long reach weapon silhouette readable at 375 wide. Keep: long shaft with a single focus. Change: our own tip glow. Ref: OpenTESArena/src/Assets/ExeData.h:313.
2. **Enchanted blade** (label: ember blade). Why: enchantment layer is a separate list, so one blade can carry many looks. Keep: enchantment as a separate layer. Change: our own glow colours. Ref: OpenTESArena/src/Assets/ExeData.h:321.
3. **Two-handed heavy** (label: greatmaul). Why: handedness is a field, so heavy and light weapons are data, not code. Keep: handedness field. Change: our own weight animation. Ref: OpenTESArena/src/Assets/ExeData.h:318.
4. **Long bow** (label: long bow). Why: ranged silhouette, the top of the range list. Keep: ranged slot at the end of the list. Change: our own limb shape. Ref: OpenTESArena/src/Assets/ExeData.h:313.
5. **Price-scaled arms** (label: tiered arms). Why: material bonus and price multiplier tie looks to value. Keep: value tied to material. Change: our own metal ladder (see gear). Ref: OpenTESArena/src/Assets/ExeData.h:273-275.

## 4. Armour and gear
- Sets: 3 armour families, each 11 pieces including shields: plate, chain and leather (ExeData.h:285-300). Plate needs a material (ArenaTypes.h:29-35 comment).
- Material tiers: 8 material names, each with a rating bonus, a chance, and a price multiplier in quarters (ExeData.h:272-275). The exact names are in the exe, not read.
- Condition tiers: new, used and other states (ExeData.h:278).
- How the game shows tiers: the item name carries the material prefix (ItemDefinition.h:41 comment says "<Material> amulet, belt, etc."). Look: text, not model.
- Metallic, gold or crystal looks: not in the code (art is in the data pack).

### Top 5 gear briefs
1. **Three-family armour** (label: triple-kit set). Why: one slot list per family, 11 pieces, readable at a glance. Keep: the three-family ladder and the shared slot count. Change: our own silhouette per family. Ref: OpenTESArena/src/Assets/ExeData.h:285-300.
2. **Material ladder** (label: eight-step metal). Why: 8 steps with bonus and price, so a metal ladder is data. Keep: data-driven ladder of 8. Change: our own metal names and a gold-plate top step. Ref: OpenTESArena/src/Assets/ExeData.h:272-275.
3. **Material-prefixed names** (label: tagged gear). Why: the material is in the name, so tiers read in a list. Keep: a material prefix on every name. Change: our own naming scheme. Ref: OpenTESArena/src/Items/ItemDefinition.h:41.
4. **Shield with its own armour class list** (label: tower guard). Why: shields have their own armour class table. Keep: separate shield armour table. Change: our own shield shape per tier. Ref: OpenTESArena/src/Assets/ExeData.h:304.
5. **Condition ladder** (label: worn gear). Why: condition is a named state that changes odds. Keep: named condition steps. Change: our own wear visuals (scratches, glow fade). Ref: OpenTESArena/src/Assets/ExeData.h:278.

## 5. Zones and dungeons
- Interior archetypes (10): crypt, dungeon, equipment store, house, mages guild, noble house, palace, tavern, temple, tower (ArenaTypes.h:64-75).
- Climates (3): temperate, desert, mountain (ArenaTypes.h:161-165).
- Voxel types (10 with none): wall, floor, ceiling, raised, diagonal, transparent wall, edge, chasm, door (ArenaTypes.h:127-141).
- Hazards: chasm types dry, wet and lava (ArenaTypes.h:143-148). Lava is damaging and emissive (VoxelChasmDefinition.cpp:140-141). Wet chasms allow swimming (VoxelChasmDefinition.cpp:139).
- Weather: 8 types, with thunderstorm windows in some (ArenaTypes.h:170-180).

### Top 5 zone briefs
1. **Ember chasm** (label: ember rift). Why: a lava pit that is both damaging and glowing, one rule. Keep: damage and glow tied to one flag. Change: our own ember palette and heat shimmer. Ref: OpenTESArena/src/Voxels/VoxelChasmDefinition.cpp:140-141.
2. **Wet chasm with animated water** (label: tidal pit). Why: animated screen-space texture plus swim rule. Keep: swim allowed in wet pits. Change: our own water surface. Ref: VoxelChasmDefinition.cpp:139 and :149-152.
3. **Crypt** (label: barrow). Why: the crypt archetype pairs with the undead band. Keep: crypt as its own interior type. Change: our own layout. Ref: OpenTESArena/src/Assets/ArenaTypes.h:66.
4. **Tower** (label: spire). Why: the tower is the last interior type. Keep: a tall interior. Change: our own vertical layout. Ref: OpenTESArena/src/Assets/ArenaTypes.h:75.
5. **Thunderstorm window** (label: storm front). Why: a weather type with a thunderstorm roll. Keep: a timed storm window. Change: our own moving front. Ref: OpenTESArena/src/Assets/ArenaTypes.h:170-180.

## 6. Item and effect looks worth recreating
- Palette-indexed torchlit wall: index-to-shade lookup, index 0 transparent. Technique: a light table per light level. Ref: data/shaders/AlphaTestedWithPaletteIndexLookup.frag:12.
- Screen-space animation pass driven by one percent uniform. Technique: a shared time value in a fragment shader. Ref: data/shaders/OpaqueScreenSpaceAnimation.frag:12-15.
- Light binning for many lights. Technique: a compute pass that bins light per screen tile. Ref: data/shaders/LightBinning.comp:15 (comment on frustum directions).
- Glowing chasm (lava): emissive flag set from the damaging flag. Ref: OpenTESArena/src/Voxels/VoxelChasmDefinition.cpp:141.
- Dry chasm: one solid palette colour, no animation. Ref: VoxelChasmDefinition.cpp:147.
- Mirror pass for water: a horizon-mirror shader pair (names only, bodies not read). Ref: data/shaders/AlphaTestedWithHorizonMirrorFirstPass.frag.

## 7. Inspiration for Frankendom (originals, 5-10)
1. **Ember rift** (lava chasm). Idea: a floor pit that is damaging and self-lit. Keep: one flag drives damage and glow. Change: our own ember palette and rim, and a heat-haze shader.
2. **Veil wisp** (ghost-flagged enemy). Idea: a translucent foe that a rule marks as ghostly. Keep: the ghost flag as a rule. Change: our own shape and cold haze.
3. **Vanishing beast**. Idea: a creature with no corpse that leaves dust motes, not blood. Keep: the no-corpse flag. Change: our own dust effect.
4. **Tiered metal ladder**. Idea: 8 material steps, each with a bonus and price. Keep: data-driven ladder. Change: our own metal names and a gold-plated top step.
5. **Three-family kit**. Idea: plate, chain and leather with 11 pieces each. Keep: three families and a shared slot count. Change: our own silhouettes and no copied pieces.
6. **Lone warden** (boss). Idea: a boss with its own name and no loot table. Keep: separate boss slot. Change: our own staged fight.
7. **Storm front**. Idea: a timed storm window that moves. Keep: timed window. Change: a moving weather front, phone-readable.
8. **Palette-shade torchlight**. Idea: a per-light-level palette lookup. Keep: index-to-shade lookup. Change: a cool palette and our own shade curve.

## Licence note
As the files say: code MIT (LICENSE.txt line 1); no game assets distributed (README line 9); user supplies original game data (README line 120). No separate asset licence found. Not a legal conclusion.

## Not read
- The exe-backed values (creature names, levels, HP, damage, loot, item names and prices): the data pack is not in the box.
- data/exe/aExeStrings.txt and acdExeStrings.txt (449 lines each): counted only, not opened.
- Shader bodies beyond the quoted lines; the horizon-mirror shader bodies.
- Entities/ArenaEntityUtils.cpp (1416 lines) beyond the names used here.
- Items/ItemLibrary.cpp (339 lines), Combat/CombatLogic.cpp, Spells/SpellDefinition.h.
- Samples folder images; Preview PNG; icon files.
