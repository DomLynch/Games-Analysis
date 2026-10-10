# daggerfall-unity: asset audit (AU013)

Source: /mnt/frankendom-donors/daggerfall-unity (read-only, VPS). A record of what the files say, not a legal opinion.

## Halves
- Client half: read (Unity project under Assets/).
- Data-pack half (DOS Daggerfall ARENA2 files): NOT in the box and NOT read. The repo's own GameFiles readme (Assets/StreamingAssets/GameFiles/readme.txt line 1) says the user places Daggerfall's data there.
- Server half: not applicable (single-player client).

## Licences (as the files state them)
- Code: MIT. Root LICENSE line 1 is "MIT License", and line 3 gives "Copyright (c) 2009-2023 Daggerfall Workshop".
- Assets/Licenses/Daggerfall Unity.txt line 3 gives "Copyright (c) 2014-2022 Gavin Clayton". That is a different holder and year range from the root file, and both are MIT. The conflict is recorded as is.
- Third-party code: MIT texts in Assets/Licenses for Daggerfall Connect, Full Serializer, INI File Parser, C# Synth Project and Unity Console. The mcs text is in mcs-ICodeCompiler.txt.
- Fonts: OpenSans is Apache 2.0 (License!.txt line 3). The TES fan font pack has a permissive sentence (Readme_TES_Fonts.txt line 42), an author of "Various" (line 7) and no licence file. That makes it ambiguous, so it is class C.
- No licence file found for: Resources art, StreamingAssets text and quests, Standard Assets (Water Basic), TextMesh Pro assets, the TimGM6mb soundfont.

## Rights status
A fan reimplementation that needs the user's own DOS Daggerfall for all game assets (README.md line 24). The repo ships no original game data. The shipped text (quest scripts, BIOG questionnaires, foe and item tables) has no licence line and looks like game text. The original rights holder is not named in the repo files. Status: mixed and partly unclear.

## Asset inventory
- Quest scripts: Assets/StreamingAssets/Quests, 265 .txt. Header line 1 shows a Windows dev path. Class C. Not reproduced.
- Character questionnaires: Assets/StreamingAssets/BIOGs, 20 files. Class C.
- Text and tables: Assets/StreamingAssets/Text (113 files, including localisation CSVs) and Tables (12 files). Class C.
- Fonts: OpenSans (5 ttf, Apache, class A); TES pack (6 ttf, class C); Other (2 ttf); TMP LiberationSans SDF asset (2.3 MB) and a 2016 TMP user guide PDF (class C); game-font SDF assets FONT0000-0004 and StreamingAssets/Fonts .FNT files (class C, origin not stated).
- Images: 193 png, 7 tga, 5 psd and 4 jpg across the project. Splash art, cursors, checkboxes, logos. Class C.
- Water: Standard Assets Environment Water (Basic) with psd gradients, normal jpg, prefabs and an fbx plane. No licence in the repo. Class C.
- Soundfont: Assets/Resources/TimGM6mb.sf2.bytes (5.97 MB). Class C. Not opened.
- Shaders (code): about 60 files. MIT. Class A as code.
- Editor catalogs: RmbBlockEditor JSON (4 MB and 0.7 MB). Class C.
- Binaries: mcs.dll (1.8 MB) with its licence text; UnityConsole is MIT. Class A for the licence statement.
- Empty or readme-only folders: Movies, Mods, GameFiles, Sound, Presets, WorldData. Class D.

## Data tables (data first)
- Assets/StreamingAssets/Tables/Quests-Foes.txt: creature id and name table, 78 lines, schema "id,*name" (line 3). Names not copied.
- Assets/StreamingAssets/Tables/Quests-Items.txt: item name table, 137 lines, schema "*name,p1,p2" (line 3).
- Assets/StreamingAssets/Tables/Spells-Entity.txt: spell table, 65 lines, schema "*name,p1,p2" (line 6).
- Other tables (Quests-Sounds, Places, Factions, Diseases, Spells, GlobalVars, StaticMessages): names only, except StaticMessages (schema line 3, header read).
- Sprite and creature art is not in the repo; the creature table lists names only.

## Classes by group
- A: OpenSans (Apache 2.0), shader code, UnityConsole and mcs licence text.
- C: TES fan fonts (ambiguous), all game-like text and tables, soundfont, unlicensed textures, Standard Assets water, TMP and game-font assets.
- D: empty or readme-only folders.
- best_class: C.

## Inspiration (own words)
- Palette snap: retro palettization and posterization shaders (Assets/Shaders/DaggerfallRetroPalettization.shader; name read, body not read). Use our own ramps per biome.
- Camera-facing sprites in 3D with batched draws (Assets/Shaders/DaggerfallBillboardBatch.shader). For cut-out people and creatures, drawn with our own sprites.
- Layered paper-doll preview (Assets/Shaders/DaggerfallPaperDoll.shader): equipped slots stacked over a base figure in a panel.
- Tile-texture-array automap (Assets/Shaders/DaggerfallAutomap.shader, DaggerfallTilemap.shader): an ink-style map that reveals as the player walks.
- Data-driven dungeon lighting (Assets/Scripts/Game/DungeonLightHandler.cs, line 23): room lights chosen from tables.
- Pixel and SDF text (Assets/Shaders/DaggerfallPixelFont.shader, DaggerfallSDFFont.shader): sharp lettering at any size for a retro title.
- Water tinted by time of day with a day and a night gradient texture (Standard Assets, Water Basic).
- Message-panel structure in quest scripts: offer, accept and complete panels. Structure only; no text reused.

## Briefs (category-level: this donor is class C)
- Snap-palette post pass: keep one screen-space pass and banded shading; change to our own palette per biome and an ordered dither.
- Cut-out crowd: keep camera-facing sprites and batched draws; change to four-direction frames at our own pixel size and a rim light.
- Stacked armour preview: keep stacked slot layers; change to our own slot order and a turn-table preview.
- Ink-reveal automap: keep a tile array and reveal as you walk; change to hand-drawn ink lines and a fog of memory.
- Room lamp rig: keep per-room lights chosen from data; change to our own torch colours and flicker.
- Every brief: recreate as a clearly distinct original, never a copy. Creature sprites are not in the box, so none of these is an instance-level look.

## Cross-link to our cells
- Camera: none in assets beyond shader names.
- Zones: dungeon light tables (code) and the zone-level texture tables.
- Spawns and loot: the foe and item tables (names only; structure is useful).
- hud-ui: the paper doll, pixel and SDF text shaders, and the message-panel structure.
- vfx: palette snap and water gradient.
- animation: none shipped.
- sound: a soundfont and no sound effects shipped. The soundfont is class C.

## Not read
Binary assets (font atlases, sf2, fbx, psd, jpg, tga, png); quest, text, BIOG and table bodies beyond the headers or first lines; shader bodies (names only); RmbBlockEditor catalogs; Editor, Packages and ProjectSettings; the DOS data-pack half (not in the box).
