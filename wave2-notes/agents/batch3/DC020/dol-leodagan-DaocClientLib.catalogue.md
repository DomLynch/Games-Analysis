# dol-leodagan-DaocClientLib (catalogue, DC020)

Donor root (VPS, read-only): /mnt/frankendom-donors/dol-leodagan-DaocClientLib/
Base paths: DaocClientLib/, DaocClientLib.Drawing/, DaocClientLib.Demo/, DaocClientLib.Test/ are relative to the donor root.
Licence: MIT (LICENSE line 1, "The MIT License (MIT)", copyright dol-leodagan 2015). Source files repeat the MIT header. Code may be adapted; keep the notice. Dark Age of Camelot (DAoC) data is NOT in the repo; the README says the library reads the user's own install (README.md lines 4 and 16). DAoC data is proprietary-origin, class C. Looks stay category-level. Rule: recreate as a clearly distinct original, never a copy.

Which half was read:
- Client-side library code (DaocClientLib/ parser and zone geometry; DaocClientLib.Drawing/ renderers; a small part of DaocClientLib.Demo/). Read by line.
- Data half: NOT in the box. The library parses MPK, PCX, NIF and zone data at runtime from the user's DAoC install. No .mpk, .pcx, .nif or zone data file is in the repo (checked by extension). The paired data half is the user's own install, which is not on this box.

## Counts (code and tables)
- creatures: 0. No creature or NPC record type was found. A case-insensitive grep for mob, creature, monster and npc matched one file, with no creature data type.
- classes: 0. No class or race list in the repo.
- weapons: 0. No weapon records in the repo.
- gear_sets: 0. No armour sets in the repo. Craft recipes exist as code (see section 4) but no recipe data is shipped.
- zones: 4 zone types in code (enum ZoneType: Terrain, City, Dungeon, SkyCity). Zero zone records in the box.

## 1. Creatures and beasts
None in the repo. There are no creature families, tiers, or boss patterns to catalogue. The one related area is the zone object roles in the demo (section 6).

## 2. Classes, races, factions
None in the repo. The craft recipe carries Realm and Profession as plain strings (Craft/CraftDataRecipe.cs lines 52 and 56), but no list of realms or professions is shipped.

## 3. Weapons
None in the repo.

## 4. Armour and gear (craft recipes as code)
- Craft/CraftDataRecipe.cs: a recipe record with ID, Name, BaseMaterialName, Realm, Profession, SkillLevel (line 60), ItemLevel (line 64), MaterialLevel (line 68), and an ingredient collection (line 72). Two tier axes are separate fields: ItemLevel and MaterialLevel.
- Craft/CraftDataIngredient.cs: Count (line 47), SubRecipe (line 51). A sub-recipe lets one ingredient be another recipe (line 77 formats the nested name).
- Craft/CraftListData.cs and CraftFileUtils.cs: not read.

Top 5 striking ideas (own words; no gear data in repo):
1. Two tier axes, item level and material level, kept apart (CraftDataRecipe.cs lines 64 and 68).
2. Nested sub-recipes (CraftDataIngredient.cs lines 51 and 77).
3. A recipe card that shows the ingredient count per line (CraftDataIngredient.cs line 47 and FullNameCount at line 68).
4. Grouping by profession and realm as plain strings (CraftDataRecipe.cs lines 52 and 56).
5. Gear tier as a material level, not a single number.

## 5. Zones and dungeons
- Zone types (Zone/ZoneGeometry.cs enum at line 38): Terrain, City, Dungeon, SkyCity. Zone type is read from data, then used to pick a renderer (Drawing/ZoneRendererChooser.cs lines 48 and 55-61): Terrain goes to TerrainRenderer (line 56), City to CityRenderer (line 58), and Dungeon plus SkyCity to DungeonRenderer (line 61).
- Rivers and lava (Zone/RiverGeometry.cs): one river record with banks (line 41), a name, a type field documented as RIVER or LAVA (line 52 comment, line 54 field), a multitexture (line 62), flow (short) and height (line 70). One shape serves water and lava.
- Zone jumps: Zone/ZoneJump.cs (class at line 34) and Zone/JumpPoint.cs (not read). Zone links are data records, not scene objects.
- Terrain height: Zone/TerrainHeightCalculator.cs (class at line 34), kept apart from the terrain renderer (Drawing/TerrainRenderer.cs, not read).
- Trees: Tree/TreeData.cs (class at line 34) and Tree/TreeReplacementMap.cs (class at line 37). The map has a cluster store and a single-tree store (see section 6 and the defect below).
- Dungeon water: Zone/DungeonWaterGeometry.cs: listed only, not read.

Top 5 striking zone ideas (own words):
1. Typed liquid band with banks: one data shape for water and lava (RiverGeometry.cs lines 41-70).
2. Zone type picks the renderer (ZoneRendererChooser.cs lines 48, 55-61). Data decides presentation.
3. Dungeon as instanced props with a world matrix per placement (DungeonRenderer.cs lines 48, 78).
4. Tree override map: cluster lookup first, then a single-tree lookup, then nothing (TreeReplacementMap.cs lines 56-68).
5. Terrain height kept apart from visuals (TerrainHeightCalculator.cs line 34).

## 6. Looks and techniques worth recreating (code level, reference files)
- Instanced dungeon props: DaocClientLib.Drawing/DungeonRenderer.cs line 78 adds one instance per geometry with its world matrix. Technique: one mesh, many transforms.
- Lava band look: the look lives in the texture field of the river record (Zone/RiverGeometry.cs; the texture property was not read in full).
- Placeholder agent silhouette: DaocClientLib.Demo/AgentCylinder.cs line 39 builds a plain cylinder from a radius and height and a segment count (vertex lines 91 and 103). Technique: a procedural placeholder that reads from a distance until art lands.
- World object roles: DaocClientLib.Demo/ZoneObjModel.cs lines 44-48: three roles, Pickee, Collidee and Visible. Technique: each world object is either clickable, solid, or only drawn.
- Demo UI skin: DaocClientLib.Demo/GwenSkin.png, one image; provenance and licence not stated; not opened.

## 7. Inspiration for Frankendom (originals, not copies)
1. Lava river band. Name: Ember Channel. Idea: a banked band defined as data with a liquid-type field. Keep: one shape for water and lava; banks as data. Change: our own bank stones with cracked crust; ember glow and heat shimmer instead of a water texture; a different width profile.
2. Hand-tuned tree offsets. Name: Set-Piece Trees. Idea: a procedural forest keeps a few trees where a designer needs them, through an override list. Keep: cluster-then-single lookup order. Change: per-cell offsets and a tree-type swap as well as an offset.
3. Instanced dungeon props. Name: Pillar Hall. Idea: many repeated props drawn with one mesh and per-placement transforms. Keep: one mesh, many transforms. Change: our own prop designs and a per-prop tint.
4. Zone type picks renderer. Name: Gate Renderer Map. Idea: a zone type in data selects the presentation class. Keep: data decides presentation. Change: our own zone types (arena, gate, ruin, sky platform).
5. Recipe with sub-recipes. Name: Nested Craft Card. Idea: an ingredient can be another recipe, shown as one line. Keep: nested sub-recipes. Change: station grouping and a result preview.
6. Three world-object roles. Name: Pick, Block, Show. Idea: every world object is clickable, solid, or visual-only. Keep: three roles. Change: our names and our hit rules for the fight camera.
7. Placeholder silhouette. Name: Capsule Stand-in. Idea: a procedural stand-in shape for an agent until art lands. Keep: a plain procedural shape with radius and height. Change: a capsule with a head mark, not a cylinder.

## Defect noticed (keep the idea, fix the defect)
- DaocClientLib.Drawing/DungeonRenderer.cs lines 63-78. For each geometry, every matched tree offset is multiplied into the same matrix (lines 72-74: "nifMatrix = translate;" on each pass), and then one instance is added once (line 78). A cluster of N trees therefore draws one copy with all N offsets summed, not N copies. Read only; not run. Fix: emit one instance per matched tree, each being the base world matrix times that tree's offset. Decision: adapt the idea, with this defect fixed in the sketch.

## Not read
- Craft/CraftListData.cs, Craft/CraftFileUtils.cs (listed only).
- TinyMPK.cs, TinyMPKFile.cs, PCXDecoder.cs (format parsers): not read in full; the formats are named in code only.
- Zone/NifGeometry.cs, Zone/ZoneData.cs, Zone/ZoneDataList.cs, Zone/DungeonWaterGeometry.cs, Zone/JumpPoint.cs: listed only.
- Zone/ZoneGeometry.cs body beyond the enum and constants, Zone/TerrainHeightCalculator.cs body: not read.
- Drawing/TerrainRenderer.cs, Drawing/CityRenderer.cs, Drawing/ClientMesh.cs: not read.
- DaocClientLib.Demo/ (DemoWindow*.cs, Camera.cs, GwenTextWriter.cs): not read.
- DaocClientLib.Test/: listed only. The test resource file is described as a placeholder in audit AU016 (not re-checked here).
- Dependencies/SharpNav.dll and SharpNav.XML: binary and docs, not opened.
- niflib.net/ and gwen-donet/ submodules: empty in this tree.
