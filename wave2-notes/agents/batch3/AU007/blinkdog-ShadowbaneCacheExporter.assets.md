# blinkdog-ShadowbaneCacheExporter: asset audit (AU007)

- Code licence: GNU GPL v3 (LICENSE full text; README licence section and source headers say version 3 or any later version; copyright 2016 Patrick Meade)
- Asset licence: None in repo: no game data is shipped. The exporter reads the user's own Shadowbane .cache files; the repo states no licence for that data.
- Rights-holder status (from repo files only): unknown: README names Ubisoft as the distributor of the free client; the repo does not state who owns the cache data
- Best class: D

## Asset groups

| kind | path | count hint | licence | class | note |
|---|---|---|---|---|---|
| repo files | README.md, LICENSE, pom.xml, src/main/java (19 .java files) | 23 files in repo | GPL v3 (code) | D | no art, audio, model or text data shipped |
| mesh export (not in repo) | Mesh.cache | 24387 per README | not stated | C | README: exported as Blender Python scripts; mesh format not fully understood; not read |
| sound export (not in repo) | Sound.cache | 1086 wav per README | not stated | C | README: WAVE files; not read |
| texture export (not in repo) | Textures.cache | 9680 png per README | not stated | C | README: png files, stored upside down; not read |
| terrain alpha masks (not in repo) | TerrainAlpha.cache | 20912 png per README; 128x128 greyscale per source | not stated | C | blend masks; not read |
| other caches (not in repo) | CObjects, CZone, Dungeon, Motion, Palette, Render, Skeleton, Tile, Visual .cache | not counted | not stated | C | README status 0% or partial; file names only; not read |
| easter-egg content (not in repo) | referenced in README (Interesting exports section) | not counted | not stated | C | README says messages and photographs exist in the data; not read, not reproduced |

## Inspiration (own words)

- Terrain blended by mask: each terrain tile is a small greyscale mask (128 by 128) that decides how ground layers mix. Recreate with a few original ground textures plus our own painted or noise masks per tile, which gives many biome edges from few textures.
- Meshes as readable text: the exporter rebuilds vertices and triangles from a script that Blender can run. The same idea works for us: keep a human-readable mesh form (for example glTF JSON) so diffs and reviews are possible.
- Texture row order: the README notes the stored image is upside down, bottom row first. Worth a check on any import step so our textures and UVs do not come in flipped.
- Hidden keepsakes: the README describes messages and photographs inside the data that never showed in normal play. Idea: a few optional notes or photos placed off the main route in our zones, with all text and art written by us.
- Bundled archives: a small number of large archives, each with a directory header and then data, hold well over 100,000 resources. Idea: group our assets into a few bundles with an index so load and streaming stay simple.

## Inspiration briefs

1. **Mask-blended ground (originals only)**
   - why it works: one neutral mask per tile turns a few ground textures into many biome edges
   - traits worth keeping: greyscale mask per tile driving two or more layered textures; masks as separate art
   - traits to change: larger tile size; our own mask shapes (painted or noise); a palette per zone
   - reference: /mnt/frankendom-donors/blinkdog-ShadowbaneCacheExporter/src/main/java/com/pmeade/shadowbane/terrain/TerrainAlphaResource.java
2. **Readable mesh pack**
   - why it works: text-form meshes are easy to diff, review and repair by hand
   - traits worth keeping: explicit vertex list and triangle list in an editable file
   - traits to change: use glTF rather than a Blender script; add our own naming and LOD fields
   - reference: /mnt/frankendom-donors/blinkdog-ShadowbaneCacheExporter/src/main/java/com/pmeade/shadowbane/mesh/MeshResource.java
3. **Hidden keepsake**
   - why it works: a small found object off the main route rewards exploration without changing the quest path
   - traits worth keeping: optional item with a short note or photo, placed away from the route
   - traits to change: our own text and art; different item shapes; placed by zone designers
   - reference: /mnt/frankendom-donors/blinkdog-ShadowbaneCacheExporter/README.md (section Interesting exports, line 60)

## Not read or not verified

- All .cache files (not in repo; the repo has none)
- Exported output of any kind (none in repo); counts are README text only
- Java sources except the licence headers and the class comments of MeshResource and TerrainAlphaResource
- pom.xml beyond the first 40 lines
- README links to a download mirror and to store listings (not followed)
- No creature, zone, item or armour content exists in this repo, so no creature or armour briefs were possible
