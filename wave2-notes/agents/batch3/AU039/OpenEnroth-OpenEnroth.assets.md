# OpenEnroth-OpenEnroth (asset audit, class C, cell AU039)

Donor: /mnt/frankendom-donors/OpenEnroth-OpenEnroth
Code licence: LGPL-3.0 text with additional permissions (LICENSE).
Asset licence: none in the box. Game data is required from the user and is not here (README.md:7, README.md:39).
Rights-holder status: fan project using original game data (README.md:7). Original rights holder not named in repo files. Unknown beyond that.
Half read: the engine half (C++ loaders and headers under src/Engine). The data pack (MM7 text tables and LOD archives) is not in the box. Searched for items.txt, monsters.txt and *.lod: none found. No paired data-pack donor identified in this batch.

## Licence
- LICENSE is the LGPL-3.0 text (LICENSE:2) with additional permissions (LICENSE:12).
- No licence file names any asset folder. Images, shaders and test fixtures fall under LICENSE only by default; the file does not say so.

## Asset inventory (what is actually here)
| Group | Path | Count | Class | Note |
|---|---|---|---|---|
| Original game data | not in box | 0 | C | Needed from user (README.md:39). |
| Project icons (PNG) | resources/images/OpenEnroth.png, android mipmaps, distribution/linux | about 13 | C | Licence unclear for images. Not opened. |
| GLSL shaders | resources/shaders/ | about 21 | A (code) | Names only, not read. |
| Lua scripts | resources/scripts/ | about 13 | A (code) | Dev console tooling. |
| JSON table | resources/data/resource_mask_table.json | 1 (3156 bytes) | C | Not read. |
| Test fixtures | test/Data/ | about 439 | C | .mm7 and .json, binary saves; not opened. |
| Audio, fonts, models, maps, textures | none found | 0 | D | find for audio, font, LOD and image types returned nothing beyond icons. |

## Data first (the tables that hold names and looks)
- Loaders name the original text tables, which are not in the box: items.txt (src/Engine/Tables/ItemTable.cpp:240), rnditems.txt (ItemTable.cpp:205), stditems and spcitems (enchantments), hostile.txt (src/Engine/Tables/HostilityTable.cpp:15), mapstats.txt (src/Engine/Tables/MapTable.cpp:19), monsters.txt (src/Engine/Objects/Monsters.cpp:255), placemon.txt (Monsters.cpp:244), and an NPC data table (src/Engine/Tables/NPCTable.cpp:62).
- Column layouts are in the comment above each loader, which is the readable part we can use.

## Inspiration (category level, MM7 look not reproduced)
- Weighted loot by tier with a cached sum; gear and weapons take enchantments from separate tables (ItemTable.cpp:204-233).
- Faction hostility grid between monster groups, default friendly, one lookup for target choice (HostilityTable.cpp:14-22). Fits our hate list and MAX_ATTACKERS = 3.
- Per-map reverb preset and music track in one row (MapTable.cpp:21, :90). Zone ambience beds as data.
- Monster descriptor card: height, collision radius, to-hit radius, speed, tint, a sound id per action, one sprite name per animation state (Monsters.h:94-101). Row 7 shape.
- Pivot offsets and footprints per prop type (ChestTable.cpp:5-8) so a prop set stays aligned.
- Text-file tables with column comments (Monsters.cpp:244, :255; MapTable.cpp:19). Pattern for our catalogue as runtime source (rows 20-21).
- Shader names hint at a decal pass, a fog and lighting include and a billboard pass (names only). Decal idea for blood (row 8) is worth a look at the shader source, not copied.

## Inspiration briefs
1. **Tiered loot chest set.** Keep: one anchor and footprint per prop type; tier read from silhouette first; one placement rule. Change: our own banded iron and hasp designs, a rarity colour ring we add, our own footprint sizes. Ref: src/Engine/Tables/ChestTable.cpp:5-8. Recreate as a clearly distinct original, never a copy.
2. **Monster temperament tiers.** Keep: four temperaments as data; movement range as a named class; set per row in the table. Change: our own names and ranges tied to leash and aggro (row 4); our own numbers. Ref: src/Engine/Objects/Monsters.cpp:255 (maps just below; not line-exact).
3. **Cave zone ambience bed.** Keep: reverb and music as one row per zone; switch on border crossing. Change: our own reverb values and a bespoke drone bed; filter the bed, not the reverb. Ref: src/Engine/Tables/MapTable.cpp:21, :90.
4. **Weighted treasure roll with enchant split.** Keep: six tier weights per item; one cached sum; separate gear and weapon enchant tables. Change: our own rarity colours and drop sound per tier; a drop ceremony readable at 375 wide. Ref: src/Engine/Tables/ItemTable.cpp:204-233.

## Cross-link
- Zones and sound: MapTable.cpp rows (reverb and music per map) are the data pattern to look at for sound-music ambience beds.
- Loot: ItemTable.cpp random chance code is the best match for the loot topic.
- Spawns: placemon and monsters tables name the placement data; the counts and spawn rules were not read.
- Animation: the spriteNames per animation state in Monsters.h is the vocabulary to check; the animation code was not read.
- HUD, camera, VFX: not read (src/GUI, src/Engine/Graphics, shaders by name only).

## Not read or not in box
See the not_read list in OpenEnroth-OpenEnroth.assets.json. Main gaps: MM7 data (absent), test fixtures, shader bodies, HUD code.
