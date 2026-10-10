# blinkdog-ShadowbaneCacheExporter (design catalogue, DC009)

Donor: /mnt/frankendom-donors/blinkdog-ShadowbaneCacheExporter/ (Java exporter, 19 .java files, pom.xml, README.md, LICENSE; no game data in the repo)
Licence (as the files say): code is GNU GPL v3 (LICENSE:2 "Version 3, 29 June 2007"; README.md:468-469 "version 3 of the License, or any later version"); copyright 2016 Patrick Meade (src/main/java/com/pmeade/shadowbane/CacheArchive.java:3). The Shadowbane cache data has no licence in the repo; rights status unknown. Clean-room, shape only. Not a legal opinion.
Half read: the EXPORTER, i.e. the reader for the offline Shadowbane .cache archives (the data half). The .cache files themselves are NOT in the box, and no other donor in the box holds Shadowbane data. No server half in the box.
Dom's rule: recreate as a clearly distinct original, never a copy. Keep the mechanism shape; change names, sizes and art.

## Counts
- creatures: 0. Creature data sits in cache types that the README marks 0% or not started (Motion, Skeleton, Visual, CObjects). Nothing decoded.
- classes: 0. No race or class tables decoded (Palette, Render at 0%).
- weapons: 0. Not decoded.
- gear_sets: 0. Not decoded.
- zones: 105 terrain map layouts (table entries, not named zones). Named zones: 0. Dungeon.cache is 0% (README.md:47) and CZone.cache is 0% (README.md:46).

## 1. Creatures / beasts
None decoded. README.md lists the creature-related caches (CObjects, Motion, Skeleton, Visual) as not started or 0%. The Mesh.cache export works (README.md:48, 100%) but the README says the mesh data is not fully understood, and the exporter writes geometry only, with no creature names or tiers.

## 2. Classes / races / factions
None decoded.

## 3. Weapons
None decoded.

## 4. Armour / gear
None decoded.

## 5. Zones / dungeons
What exists is a terrain layout table, not zone content.
- The table is a hand-written array named MAPS of 105 TerrainMapSpec entries (src/main/java/com/pmeade/shadowbane/terrain/TerrainAlphaCache.java:45 to :151). Each entry is a start index, a width, a height and an ordering. Sizes: 18 at 14x14, 64 at 16x16, 15 at 8x8, 4 at 3x3, 4 at 1x1. All entries use COLUMN_MAJOR (no ROW_MAJOR in that file).
- Each map is a grid of ground-alpha tiles. Each tile is a 128x128 greyscale image (src/main/java/com/pmeade/shadowbane/terrain/TerrainAlphaResource.java:33 and :39).
- Dungeon archetypes, biome names and hazards: none in this repo. Dungeon.cache at 0% (README.md:47).
- Hazards: none.

Biome list: none named. The terrain maps are footprints, not biomes.

## 6. Item and effect looks worth recreating
- L1 Mask-blended ground. Each terrain tile is one greyscale alpha image (TerrainAlphaResource.java:33; grey image type at TerrainAlphaCache.java:206). The exporter writes the mask only. The blend itself lives in the game client, which is not in this repo, so the blend shader is NOT read. The idea is: one neutral mask per tile can drive two or more ground layers, which gives many biome edges from few textures.
- L2 Texture row order. The README says the texture image is stored upside down, first pixel at the bottom (README.md:415). A pipeline check, not a look: confirm our imports are not flipped.
- L3 Text-form meshes. The mesh export writes Blender Python scripts, not binary (README.md:24 "[Blender Python] (24387)"). Idea: keep a human-readable mesh form for diffs and review, in a standard text format (glTF JSON) rather than a script.
- No glow, aura, metal or gold look code exists in this repo (no shader or material code; Textures and Sound only export PNG and WAV).

## Top 5 striking (zones; fewer than 5 real candidates exist)
1. Mask-blended ground grid (L1). A 16x16 grid of greyscale tiles, where one mask set gives many ground edges. Keep: a greyscale mask per tile driving layered textures. Change: our tile size, our own mask shapes, a palette per zone.
   Ref: TerrainAlphaCache.java:45; TerrainAlphaResource.java:33.
2. Footprint size ladder. The same table holds 1x1, 3x3, 8x8, 14x14 and 16x16 layouts (TerrainAlphaCache.java:121 for 1x1, :142 for 3x3, :124 for 8x8, :149 for 14x14, :150 for 16x16). Keep: one zone-size ladder from camp to region. Change: our own sizes and names.
3. Contiguous packing. Maps pack into one index range, one after another (TerrainAlphaCache.java:121-125 show 1x1 and 8x8 blocks back to back). Keep: a compact index per map. Change: named zones, and a load-time check for overlapping index ranges.
4. Optional find off the main route (README.md:59 "Interesting exports"). The README says some resources hold notes and pictures not seen in play. Keep the shape: an optional item off the quest path that rewards exploring. Change: our own text and art only, placed by zone designers. The donor's content is not reproduced here.
Only four candidates exist. There is no fifth: the ordering (COLUMN_MAJOR) is uniform across all entries, so it is not a design lever.

## Inspiration for Frankendom
1. Layered ground by mask (zone art). Keep: one greyscale mask per tile over two or more ground textures. Change: our tile size, our masks, a zone palette.
2. Zone as a grid spec (zone data). Keep: a zone is width x height tiles with a start index and an ordering. Change: named zones, a size ladder (1x1 camp, 8x8 field, 16x16 region), and a load-time overlap check.
3. Hidden keepsake (zone content). Keep: an optional find off the main route with a short note or a picture. Change: our own text and art, placed by designers, never tied to the quest.
4. Readable pack (pipeline). Keep: explicit vertex and triangle lists in an editable file. Change: glTF JSON with our naming and LOD fields.
5. Bundled archive with directory (pipeline). Keep: one archive with a directory of offset, size and stored size, and a stored-as-is rule when compression does not help (CacheArchive.java:90 and :107). Change: our own format and index.

Engine: none of these change the fight loop or the spawn logic. Items 1-3 are zone art and zone data; the blend itself is client art. Items 4-5 are pipeline only.
Brief rule served: a distinct original; kept are the mechanism shapes, changed are names, sizes, art and text.

## Not read or not verified
- All .cache files (not in the box; the repo ships none). Counts (13 caches, 24387 meshes, 20912 terrain masks, 9680 textures, 1086 sounds) are README text only; not verified against data.
- Exporter output of any kind (none in the repo).
- Java bodies except the terrain table, the archive reader lines cited, the MeshResource and TerrainAlphaResource class comments, and the TerrainMapSpec constructor.
- The blend shader in the client (not in the repo).
- pom.xml (not read here; AU007 has its own partial read).
- README links to a download mirror and store listings (not followed).
- The README "Interesting exports" content (not read beyond its section heading and the line 59 pointer).
