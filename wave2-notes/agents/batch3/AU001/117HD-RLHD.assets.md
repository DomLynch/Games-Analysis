# 117HD-RLHD: asset audit (AU001)

Read from the VPS tree only (read-only). Nothing downloaded or run; no image opened. Texture sizes and colour types from PNG headers.

## Licences (as the files say)
- Code: `LICENSE` line 1 "BSD 2-Clause License", line 3 "Copyright (c) 2021, 117". The licence text itself covers the repo, with a NOTE at line 29: the repo "contains third-party assets not covered by the license above", pointing to `src/main/resources/rs117/hd/scene/textures/000_licenses.txt`. (Note: the donor path in the brief is `src/main/rs117.hd/...`; the real path is `src/main/resources/rs117/hd/scene/textures/`.)
- Texture licences: `000_licenses.txt` (130 lines) lists per-texture sources. Lines 1-130 in summary:
  - CC0 1.0 (AmbientCG, 3dtextures.me, TextureCan, cc0-textures, Katsugi, leenor_net caustics, Jin-Jiyunsun leaves and bark): stated as CC0 per entry.
  - Pexels (WOOD_GRAIN_2, line 31): "require no attribution" as the file says.
  - Unsplash (sand, line 7): cites the Unsplash licence link.
  - BSD-2-Clause (ROCK_1 at line 14, ROCK_2 at line 16, WOOD_GRAIN by j-meds): stated as BSD-2-Clause. STONE (line 25): sourced from a web blog, darkened, no licence named in the file.
  - Custom: SirFancyBacon generated maps (HD_WOOD_PLANK_1, line 88): "Texture is licensed to the 117HD project and any future forks". GROUND_WEB textures (line 104): CC0 as stated.
  - "Infernal cape texture by deathlezz, used with permission" (line 1). Permission only, no licence text.
  - "Some textures copyright (c) 2021 117." (line 11).
  - Jagex-derived list (lines 116-130): "derivative works based on intellectual property owned by Jagex Ltd", "used under the Jagex Fan Content Policy and are explicitly excluded from the BSD-2-Clause license", "Jagex reserves the right to revoke permission ... at any time." Names listed on lines 121-130 under that paragraph: HD_BRICK family, MARBLE_4 family, WINTER and AUTUMN leaves families, LEAVES_SIDE_ALT, FORTIS_ROADS, HD_IRON_BARS, HD_ROOF_BRICK_TILE, HD_SAND_BRICK, HD_STONE_PATTERN family. The file does not label each name separately; the list reads as falling under the Jagex paragraph.
- No licence file for `schemas/`, `*.glsl` or Java sources beyond the repo-wide BSD-2-Clause.

## Rights-holder status (repo files only)
- Plugin code: author "117" (2021 copyright, `runelite-plugin.properties` author=117).
- Textures: mixed. Some by 117, some by named CC0 or permissive sources, some by named individuals with permission, and a set the file says is Jagex-owned derivative work under the Jagex fan policy.
- The file says Jagex may revoke permission for its listed assets at any time. Status for those: "fan content under Jagex policy, revocable" per the file.

## Asset inventory (counts from find)
- `src/main/resources/rs117/hd/scene/textures/`: 195 files: 100 PNG, 94 JPG, 1 TXT (licence list). Pattern: colour map `name.jpg/png`, normal map `name_n.png`, heightmap `name_d.png` (the `_D` suffix is a heightmap per the licence entry for WOOD_GRAIN_3_D: "combined with hightmap"). Sizes checked: `abyssal_2_d.png` 256x256 indexed; `abyssal_d.png` 256x256 greyscale (height-like); `abyssal_2_n.png` 256x256 RGB (normal-like).
- Texture families present: abyssal, autumn leaves (orange/red/yellow top and side), bark, brick paths, burlap, carpet, caustics map, grass, gravel, grunge, hay, HD roofs and shingles, iron bars, lava 1-3, magma 1-2, marble 1-4, metal 1-2, rock 1-7, rope, sand 1-5, snow, stone, fur, leaves, webs, wood planks.
- Flow maps: `caustics_map.jpg`, `lava_flow_map.png`.
- `src/main/resources/rs117/hd/`: 68 GLSL shader files (code, BSD-2 by repo licence), `scene/*.json` data (model_overrides, areas, gamevals, lights, sky_presets, water_types, tile_overrides, materials, ground_materials, environments).
- `schemas/`: 10 JSON schema files.
- `icon.png` in repo root: 48x72 PNG.
- No 3D models (no .obj, .gltf, .fbx, .dae). No audio. No map files. No fonts. No dialogue or lore text.

## Class per group
- Textures from CC0 sources (named AmbientCG, 3dtextures, TextureCan, cc0-textures, Katsugi, leenor_net caustics, Jin-Jiyunsun): class A (per the file's CC0 statement).
- Textures from Pexels (no attribution required, per the file) and Unsplash (cited licence link): class A with credit link for Unsplash.
- BSD-2-Clause derived textures (ROCK_1/ROCK_2 and WOOD_GRAIN by j-meds, where the file states BSD-2-Clause): class B (notice retention per BSD text). STONE (line 25, obtained from a web source, darkened, no licence named): class C, unclear.
- Custom/permission textures (SirFancyBacon, "licensed to the 117HD project and any future forks"; Infernal cape "used with permission"; "Some textures copyright 117"): class C (scope or permission limited; not a standard licence).
- Jagex-derived textures (lines 116-130): class C. The file states they are excluded from BSD-2 and revocable. Do not reuse; recreate from scratch if the look is wanted.
- Code and shaders: BSD-2-Clause (repo licence). Not an asset; out of scope here.
- Models, audio, maps, fonts, text: none in repo (class D).

## Inspiration (own words, no copied text)
- Texture sets are colour, normal and height triples (`name.jpg`, `name_n.png`, `name_d.png`); the height map is greyscale (`abyssal_d.png` colour type 0). A three-map PBR-style set per material gives parallax and bump depth for ground and walls.
- Flow maps drive animated lava and caustics (`lava_flow_map.png`, `caustics_map.jpg`): a flow texture scrolled over a base is a cheap animated lava or water look.
- Leaf variants come as a colour family (orange, red, yellow tops and sides) plus "diseased" and "willow" variants: one leaf template, several palettes and wear states.
- Organic cave floors use the abyssal set (`abyssal_2_*`): a tiled organic pattern with normal and height maps is a clear alternative to rock tile floors.
- A dedicated `lights.json` and `daylight_cycle` package and `sky_presets.json`: a light list and sky presets per environment are a clear, data-driven lighting pattern.
- Water types are data-driven (`water_types.json`) and each zone gets its own water and sky presets: a per-zone water and sky data file lets one shader serve many zones.
- Fur (`fur.jpg`, `fur_n.png`) is a short-hair texture with normal map for creature hides; a shell or fur layer on a base mesh is a common way to get fur (technique only).

## Inspiration briefs
See `117HD-RLHD.assets.json` (`briefs`).

## Cross-link to our cell topics
- camera: none in the textures; `lights.json` and sky presets relate to scene mood.
- zones: `environments.json`, `areas.json`, `ground_materials.json`, `water_types.json` drive per-zone look.
- loot: none.
- spawns: `model_overrides.json` (per-model overrides, not read).
- hud-ui: none.
- vfx: caustics, lava flow maps, shadow and sky shaders.
- animation: none.
- sound: none.

## Not read
- No image viewed. Texture notes come from file names, sizes and colour types only.
- Individual JSON data files (materials, areas, lights, gamevals, model_overrides) not opened beyond names.
- GLSL and Java sources not read beyond file counts.
- `gamevals.json` not read (it contains game-ID data; treat as code/data, not art).
- Jagex-derived texture contents not opened (and must not be used).
