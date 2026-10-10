# Asset audit: dol-leodagan-DaocClientLib (AU016)

Path on VPS (read-only): /mnt/frankendom-donors/dol-leodagan-DaocClientLib/

## Licence (what the files say)
- Code licence: MIT. LICENSE line 1 "The MIT License (MIT)", copyright "Copyright (c) 2015 dol-leodagan" (LICENSE:3). Source files repeat the MIT header, e.g. DaocClientLib/Tree/TreeReplacementMap.cs:4.
- Asset licence: none stated. The repo contains no Dark Age of Camelot (DAoC) data. README.md:2 says it is a "C# .NET Library for handling Dark Age of Camelot Client resources". README.md:4 says it is "meant to be linked in any project that needs to access Dark Age of Camelot Client resources". The resources come from the user's own DAoC install (README.md:16 example path "C:\Dark Age of Camelot").
- Third-party in tree: Dependencies/SharpNav.dll and SharpNav.XML (binary and XML docs; licence not stated in the tree, not opened). DaocClientLib.Demo/GwenSkin.png (UI skin for the demo; licence not stated; gwen-donet submodule is empty in this tree so its licence cannot be checked here). .gitmodules lists niflib.net and gwen-donet; both folders are empty here (not checked out).

## Asset inventory
- Non-code content in the repo is minimal:
  - DaocClientLib.Demo/GwenSkin.png (1 PNG, demo UI skin, size not measured).
  - DaocClientLib.Test/Properties/testpcxressources.resx (35 KB, 465 lines). A resource template; the bitmap and icon entries are placeholders ("[base64 mime encoded serialized .NET Framework object]", testpcxressources.resx:23), not real art.
  - Dependencies/SharpNav.dll (185 KB) and SharpNav.XML (330 KB): third-party binaries and docs.
  - Test fixtures named in code (e.g. validmpktest.mpk, truncatedmpktest.mpk, treemap.mpk, zones.dat) are referenced by DaocClientLib.Test but not present in the tree; no .mpk or .pcx file is in the repo.
- Code the library parses (formats named in code, not read in full): PCX images (PCXDecoder.cs), MPK archives (TinyMPK.cs, TinyMPKFile.cs), Gamebryo-style NIF meshes (Zone/NifGeometry.cs:32-34), zone data (Zone/ZoneData.cs, ZoneDataList.cs), river and dungeon water (Zone/RiverGeometry.cs, DungeonWaterGeometry.cs), trees (Tree/TreeData.cs, TreeReplacementMap.cs), craft recipes (Craft/CraftDataRecipe.cs, CraftListData.cs, CraftDataIngredient.cs), and terrain height (Zone/TerrainHeightCalculator.cs).
- Renderers (DaocClientLib.Drawing): ZoneRenderer, TerrainRenderer, CityRenderer, DungeonRenderer.
- Audio, fonts, models, maps, sprites: none in the repo (no .wav, .mp3, .ogg, .ttf, .fbx, .nif, .mpk, .pcx found by extension).

| group | path | count_hint | licence | class | note |
|---|---|---|---|---|---|
| DAoC game resources (MPK, PCX, NIF, zone data) | user's DAoC install; parsed by code only | n/a | none stated; from user's own install | C (not present) | Parsed at runtime only; nothing shipped |
| Demo UI skin | DaocClientLib.Demo/GwenSkin.png | 1 PNG | not stated | C | Not opened; provenance and licence unknown |
| Resource template | DaocClientLib.Test/Properties/testpcxressources.resx | 1 file, 465 lines | project MIT (code file), not art | D | Placeholder entries only |
| Third-party DLL and XML | Dependencies/SharpNav.dll, SharpNav.XML | 2 files | not stated in tree | C | Binary; not opened |
| Empty submodules | niflib.net/, gwen-donet/ | 2 folders | not checked out | n/a | Cannot check here |

## Rights-holder status (repo files only)
- Client-side tool for Dark Age of Camelot resources (README.md:2). The library needs the user's own DAoC install (README.md:4, README.md:16). The repo does not name the DAoC rights holder, and the files do not say who owns the data. Treat the DAoC data as proprietary-origin (class C), with the owner not stated in the repo.
- The library's own code is MIT by the author dol-leodagan (LICENSE:3).

## best_class
C. The only non-code art is a demo UI skin of unstated licence. Everything else is D (no usable non-code content). The DAoC resources are not in the repo.

## INSPIRATION (own words, code-level techniques only)
- Placed props as instances: the dungeon renderer adds each NIF geometry as an instanced mesh with a world matrix computed from its placement (DaocClientLib.Drawing/DungeonRenderer.cs:55). Our version: one mesh per prop type, one transform per placement.
- Hand-tuned overrides on procedural placement: a tree replacement map lists per-tree offsets so trees that match the data are moved to a fixed position (Tree/TreeReplacementMap.cs:35). Useful when a generated forest needs a few hand fixes.
- Rivers and lava as one typed band: the river record stores banks, an id, a name, a type (river or lava) and a texture (Zone/RiverGeometry.cs:34-52). A single data shape can serve water, lava and other liquids with different looks.
- Terrain height separate from visuals: a height calculator lives apart from the zone renderers (Zone/TerrainHeightCalculator.cs, Drawing/TerrainRenderer.cs). Keep collision and grounding on their own data path.
- Crafting as a recipe with an ingredient list: a recipe record carries a collection of ingredients (Craft/CraftDataRecipe.cs:33-72). A simple shape for our own crafting screens and icons.
- Zone jump points as data: zone transitions are their own records (Zone/ZoneJump.cs, JumpPoint.cs). Keep portal and zone-line data out of the scene.
- Demo skin as a single PNG: a demo UI uses one skin image (GwenSkin.png). Shows how little art a demo UI needs.

## Briefs
- label: Lava river band (own label)
  why: a glowing lava channel with stone banks reads as danger at a distance and follows a path
  keep: banked band defined as data with a liquid type field; one shape for water and lava
  change: our own bank stones with cracked crust; ember glow and heat shimmer instead of water texture; different width profile
  ref: DaocClientLib/Zone/RiverGeometry.cs:34-52
- label: Hand-tuned tree offsets (own label)
  why: a procedural forest keeps a few trees exactly where a designer needs them
  keep: override list keyed by tree, with an offset applied on match
  change: our own override format (per-cell offsets, not per-tree); a tree-type swap as well as offset
  ref: DaocClientLib/Tree/TreeReplacementMap.cs:35
- label: Instanced dungeon props (own label)
  why: many repeated props (pillars, braziers) draw cheaply with per-placement transforms
  keep: one mesh, many transforms
  change: our own prop designs; per-prop tint variation
  ref: DaocClientLib.Drawing/DungeonRenderer.cs:55
- label: Craft recipe card (own label)
  why: a recipe with a visible ingredient list reads at a glance
  keep: recipe record with an ingredient collection
  change: our own ingredient icons and a result preview; grouping by station
  ref: DaocClientLib/Craft/CraftDataRecipe.cs:33-72

## Cross-link to our cell topics
- zones: zone renderers, terrain height, zone jumps (DaocClientLib/Zone, DaocClientLib.Drawing).
- water and lava: RiverGeometry type field (Zone/RiverGeometry.cs:52).
- loot and craft: craft recipe and ingredient records (Craft/).
- hud-ui: demo skin only (DaocClientLib.Demo/GwenSkin.png).
- animation, vfx, camera, sound: none in the repo.
