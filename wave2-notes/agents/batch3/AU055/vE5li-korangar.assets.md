# vE5li-korangar (asset audit, AU055)

Donor: Korangar, a Ragnarok Online client written in Rust. Half read: the CLIENT half and the bundled data pack (korangar/archive/data). The server half (rAthena) is not in the box.

## Licences (as the files say)
- Code: MIT. Root LICENSE.md line 1 "MIT License", line 3 "Copyright (c) 2023 Lucas Pütz". README badge names MIT.
- korangar-audio/LICENSE: "Copyright (c) 2025 Korangar authors" and "Copyright (c) 2021 Andrew Minnich", MIT-style text.
- Font: Noto Sans under SIL OFL 1.1 (korangar/archive/data/font/OFL.txt line 3).
- Bundled UI/marker/tile PNGs and text: no licence stated in the files read. Class C (unclear).
- Original game data (data.grf, rdata.grf): NOT in the repo. wiki/Running.md line 2 says to take them from the official kRO client. Absent from the box.

## Rights-holder status
Client for Ragnarok Online, written from scratch in Rust. The repo does not name the holder of the game. Status: unknown from repo files.

## Asset inventory (paths and counts)
- Font: korangar/archive/data/font/NotoSans.ttf (+ OFL.txt, README). Class B (OFL).
- Interface SDF icons: korangar/archive/data/texture/ arrows, eye open/closed, filled/unfilled box, trash can. 32x32 by IHDR for expanded_arrow.png. Class C.
- World markers: texture/marker_{effect,entity,light,object,particle,shadow,sound}.png, 64x64 by IHDR (marker_light.png). Loaded as SDF in korangar/src/renderer/game_interface.rs lines 106-112. Class C.
- Pathing overlays: texture/pathing_{straight,diagonal,goal}.png. Class C.
- Ground tiles: texture/tile_0.png to tile_6.png, 256x256 by IHDR, about 270 KB each. Listed in korangar/src/lib.rs lines 596-602. Class C.
- Fallback placeholders: model/missing.rsm, sprite/npc/missing.{spr,act}, texture/missing.{png,jpg,bmp,tga}. Class C.
- Text: languages/en-US.ron and de-DE.ron (RON string tables, about 70 lines each). Class C.
- Lua rules: lua-scaffolding/baby-job-lookup.lua (IS_BABY_JOB, line 7), skill-tree-tab-for-job.lua, skill-tree-tab-name.lua. Class C.
- Server list: sclientinfo.xml (EUC-KR XML, one connection entry to a remote host). Class D for us.
- Shaders: korangar/shaders/modules and passes (slang). Code under MIT. Class A as code, adapt with notice.
- Media not opened: .github logo and preview images, archive/data/icon.png, korangar-video testfile .ivf clips.

## Best class: C overall; B for the font only.

## Inspiration
- Map markers as one flat glyph per category, drawn as signed-distance icons so they stay crisp at any size.
- SDF icon pipeline (vector source, distance-field bake, 32 px interface, 64 px overlay): a good HUD and minimap-pin method.
- Directional chevrons for walk paths (straight, diagonal, goal) so a route reads without a line.
- Localisation as data: one file per language, snake_case keys with _text and _tooltip suffixes, editable live.
- Rules kept in small Lua predicates (baby-job range check) instead of branches: a good shape for progression tiers.
- Visible 'missing' placeholders for absent models and textures, so content gaps show up in play.
- Real-time lighting with drop shadows (README line 10). Shadow passes and a bindless entity picker are under korangar/shaders. Category-level only.

## Briefs (5)
1. Ground-marker glyph set. Keep one flat glyph per category; change to our pictograms and our frame.
2. Crisp SDF HUD toggle (eye and arrow pair). Keep the two-state pair at 32 px; change the silhouette and the state cue.
3. Walk-path chevrons. Keep the straight/diagonal/goal family; change the goal shape and the colour.
4. Per-tier predicate in Lua. Keep the nil-safe range check as data; change to our tier names and rules.
5. Missing-asset placeholder. Keep an obviously wrong stand-in; change to a labelled debug cube.

Dom's rule: recreate as clearly distinct originals, never copies. Kept: the glyph-per-category idea and the SDF method. Changed: shapes, palette, frame, names.

## Cross-links
- hud-ui: SDF icon pipeline and the toggle pair; minimap pins as markers.
- loot and spawns: marker glyphs per category; missing-asset placeholders for content checks.
- progression: Lua tier predicate.

## Not read
See vE5li-korangar.assets.json, not_read array (font binary, all image content, binary models, codec clips, two Lua files, de-DE.ron content, shaders in depth, server half absent).
