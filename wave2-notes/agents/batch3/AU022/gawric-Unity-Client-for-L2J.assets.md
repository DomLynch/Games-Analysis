# ASSET AUDIT: gawric-Unity-Client-for-L2J (AU022)

Donor root: /mnt/frankendom-donors/gawric-Unity-Client-for-L2J/ (VPS, read-only). Receipts: receipts.tsv.

## Summary
- Code licence: Apache License 2.0 (LICENSE:2 and :191).
- Asset licence: no licence file covers the art. The armour docs say the armour textures and meshes are imported from Lineage 2 Interlude (l2-unity/docs/convert-armor/README.md:3). Author additions are described with no licence line (README.md:14, :59). Plugin licences: FMOD EULA, NuGet and Newtonsoft MIT; the other plugin folders have no licence file in the tree.
- Rights status (from files): fork of a Lineage 2 Java client branch (README.md:3). Uses original Lineage 2 Interlude data for armour, which the files treat as the game's own assets.
- Best class: C for every asset group. Inspiration only; the author's own additions are unclear.

## Which half was read
- Client half (Unity project): top-level, Assets/ directory counts, Docs, the convert-armor doc, the plugin licence files and the README read. Assets/Scripts C# listed only.
- Server half: the L2J server (Acis or Mobius, README.md:31) is not in the box. Not read.
- Matching data half: StreamingAssets/Data/Meta tables listed and line-counted (DATA FIRST).

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Animations and skeletal meshes | l2-unity/Assets/Resources/Data/Animations/ | 5,869 | C |
| Static meshes | Data/StaticMeshes/ | 1,848 | C |
| System textures and materials | Data/SysTextures/ | 23,875 (9,846 png and tga) | C |
| Textures | Data/Textures/ | 6,449 | C |
| UI (UI Toolkit) | Data/UI/ | 4,261 | C |
| Effects and shaders | Data/Effects/ 893, Data/Shaders/ 421 | 1,314 | C |
| Maps and clock | Data/Maps/ 309, Data/Clock/ 26, StreamingAssets/Data/Maps/ 9 | 344 | C |
| Scenes and prefabs | Assets/Resources/Scenes/ 30, Prefab/ 64 | 94 | C |
| FMOD sound banks | StreamingAssets/*.bank | 110 files, 111 MB | C |
| FMOD source audio | l2-unity-fmod/Assets/* | 606 wav, 76 ogg | C |
| Data tables | StreamingAssets/Data/Meta/ | 89 (23 txt, 8 csv, 7 bin) | C |
| Plugins | Assets/Plugins/* | about 300+ files | C |
| Docs (text) | README.md, Docs/, l2-unity/docs/ | about 20 md | C |

Whole Assets/ tree: 24,514 meta, 12,532 png, 3,830 mat, 1,534 fbx, 1,473 cs, 1,285 prefab, 885 anim, 690 tga, 357 txt.

## Licence detail
- LICENSE:2 `Version 2.0, January 2004` and LICENSE:191 `Licensed under the Apache License, Version 2.0` (receipts).
- FMOD: l2-unity/Assets/Plugins/FMOD/LICENSE.TXT:1 `FMOD END USER LICENCE AGREEMENT` (receipt). Not summarised further.
- NuGet/Newtonsoft: LICENSE.md:1 `The MIT License (MIT)` (receipt).
- NuGet folder LICENSE:3 `Copyright (c) 2018 Patrick McCarthy` (receipt).
- No licence file in Atmospheric Height Fog, Simple Water Shader, URP-WaterShaders, ProBuilder Data or BouncyCastle.

## Provenance (what the files say)
- l2-unity/docs/convert-armor/README.md:3 `how we import Lineage 2 Interlude` (receipt). It describes importing armour textures and skeletal meshes into the Unity client.
- l2-unity/docs/convert-armor/README.md:5 `matched handmade FBX` (receipt). The test piece is checked against a hand-made FBX.
- README.md:14 `400 новых текстур и мешей` and README.md:59 `Добавлено 150 новых моделей` (receipts): the author's additions. No licence line for them.
- README.md:3 `Это отдельная ветка созданная на основе исходной` (receipt): fork of a shnok-based source.
- Provenance for the sound banks, maps, UI and other textures is not stated in any file read.

## Inspiration (own words; category-level for class C)
1. Skill effect library: each skill is a shader plus a particle config, with a property catalogue.
2. Batched name tags in one draw call (README.md:19, receipt).
3. Four-state animation layer (README.md:10, receipt).
4. Armour import with a reference check (vertex count, bounds, bone count; convert-armor/README.md:5 and :216).
5. Reproducible particle spawns (SpawnParticleSnapshot_RngLog_Guide.md, listed).
6. Modular armour per body region per race (README.md:59).

## Briefs (4, category-level)
1. Modular race armour set by body region. Keep: separate region parts that swap on equip. Change: our own proportions, ornament and palette. Ref: l2-unity/Assets/Resources/Data/Animations/Dwarf/FDwarf/Models/ (category only).
2. Staggered radial skill splash. Keep: per-particle random start delay, fade-in, hold, fade-out. Change: our own burst shape and colour scale. Ref: l2-unity/L2_Shader_Property_Catalog.md.
3. Dwarf stocky walk set. Keep: shorter, wider body and a distinct rhythm (to check by eye). Change: our own proportions, gait and armour. Ref: Dwarf/FDwarf/Models/ (FDwarf_m000_l.fbx and siblings). The gait itself was not read.
4. Batched name tag strip. Keep: one draw call and readable text. Change: our own plate shape, font and anchor. Ref: README.md:19.

Dom's rule applies to every brief: recreate as a clearly distinct original, never a copy. Each change list names the trait changed.

## Cross-link to our cell topics
- hud-ui: Data/UI (4,261), Docs/Ui.md and Docs/Ui_Interface.md (not opened).
- vfx: Data/Effects (893), Data/Shaders (421).
- animation: Data/Animations (5,869).
- sound: FMOD banks (StreamingAssets) and l2-unity-fmod/Assets.
- loot and item names: Data/Meta tables (ItemName, ItemStatData, Weapongrp).
- zones: Data/Maps (309) and StreamingAssets/Data/Maps (9).
- spawns: Npc_deco_effects.csv (listed).
- camera: none read.

## Not verified
- Assets/Scripts C# (listed only).
- The L2J server half (not in box).
- Binary textures, meshes, FBX, TGA and PNG (counted, not opened).
- FMOD banks and source audio (counted, not opened).
- Unity YAML scenes and prefabs (listed).
- Docs/Ui.md, Docs/Ui_Interface.md (named only).
- The video links in README.md.
