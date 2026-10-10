# 0ad-0ad: asset audit (AU001)

Read from the VPS tree only (read-only). Nothing downloaded or run; no image opened. Counts from `find`, sizes from `du`, texture sizes from PNG IHDR headers.

## Licences (as the files say)
- Code: root LICENSE.txt line 4 says the engine and data are free and open source with attribution to Wildfire Games. Line 18 maps `binaries/data/` to GPL version 2 (or later); line 64 maps `source/` to the same GPL version 2 (or later). Line 22 maps `binaries/data/mods/*/art` and `*/audio` to CC BY-SA 3.0.
- Other parts: `binaries/system/dbghelp.dll` is marked Proprietary (LICENSE.txt line 39). `libraries/` is "Various", see its own LICENSE.txt. `source/lib` MIT; fxaa.fs BSD; cas.fs MIT; `build/premake` BSD/MIT.
- Assets, per folder:
  - `binaries/data/mods/public/art/LICENSE.txt` line 1-3: Copyright (C) 2009 Wildfire Games; CC BY-SA 3.0. Line 21 says some textures in `textures/` are derived from CGTextures materials and are "special permission" CC BY-SA. The file also says the CGTextures originals stay CGTextures property.
  - `binaries/data/mods/public/audio/LICENSE.txt` line 1: same Wildfire Games CC BY-SA 3.0 wording.
  - `binaries/data/mods/mod/art/LICENSE.txt` line 1: Copyright (C) 2014 Wildfire Games; CC BY-SA 3.0 (mod folder).
  - `binaries/data/mods/public/maps/random/LICENSE.txt`: JSON and JS files are GPL-2+ (line 1). NASA Blue Marble topography: "public domain" (line 3). OpenStreetMap heightmaps: ODbL and CC BY-SA (line 16).
  - Fonts in `binaries/data/tools/fontbuilder/fonts/`: DejaVu (Bitstream Vera; line 1 of DejaVu-LICENSE.txt), FreeFont (own licence file, not read beyond its title), GUST font licence, LibBiolinum (GPL, LibBiolinum-LICENSE.txt line 5). Each font has its own licence file.
  - `binaries/data/mods/public/gui/userreport/Terms_and_Conditions.txt` and `mod/gui/modio/Disclaimer.txt`: terms of online services. Not assets; do not reuse.
- Attribution required by the art file: link to the CC BY-SA 3.0 text, "Wildfire Games" as original author, and link to wildfiregames.com.

## Rights-holder status (repo files only)
- Art, audio and textures: Wildfire Games (copyright lines 2009 and 2014). Open-source project files, not a commercial game's data. Some textures derived from CGTextures (third party, stated in the art licence).
- Maps: NASA Blue Marble (public domain as stated), OpenStreetMap-derived heightmaps (ODbL and CC BY-SA as stated).
- No leak or decompile is claimed in the repo. Unknown beyond the file statements.

## Asset inventory
- `binaries/data/mods/public/art/`:
  - `meshes/`: 4067 COLLADA `.dae` files, 610 MB (props, buildings, units, terrain props). No mesh poly counts checked.
  - `animation/`: 1194 `.dae` animation files, 1.2 GB.
  - `actors/`: 5387 XML actor definitions (campaigns, fauna, flora, fungi, geology, props, special, structures, temp, units; units split by civ: athenians, britons, carthaginians, celts, gauls, ...).
  - `textures/`: 8334 files, 3.6 GB. 7040 PNG and 1176 DDS. Skins include skeletal/ptol (e.g. `cuirass_gold_01.png`, 256x256 RGBA, colour type 6) and gaia, props, campaigns. Pixel sizes checked on the ptol skin set only (256x256 for four sampled files).
  - `materials/`: 33 XML material/shader setups (player colour, specular map, normal map, alpha, wind, water, waterfall).
  - `variants/`: 1150 XML variant sets (shields, weapons, etc.), 4.8 MB. Example: `shields/sele_pelte_01_gold.xml` (gold pelte shield variant pointing to a gold base texture and a spec texture).
  - `particles/`: 66 XML particle effects (coin, coin_high, dust, smoke, blowing sand, blowing snow, cloud, bigflame).
  - `terrains/`: 715 files, 3 MB (biome-mediterranean etc.; mixed types, not checked).
  - `skeletons/`: 78 skeleton files; `icons/`: 1 file.
- `binaries/data/mods/public/audio/`: 1098 OGG music and sound files, 274 MB, 361 XML audio definitions. Subfolders: actor (human, mounted, ship, gate, fauna, singlesteps), voice (global, greek, latin, napatan, persian, ...; 183 OGG under audio/voice in all subfolders), ambient (building, weather, dayscape, water), resource.
- `binaries/data/mods/public/maps/`: 590 map files: 149 `.pmp` (map files), 154 XML, 274 JSON/JS, 12 PNG. Subfolders: random, scenarios, scripts, skirmishes, tutorials.
- `binaries/data/mods/public/gui/`: UI XML and JS pages (credits, lobby, gamesetup, manual, options). Credits page: `gui/credits/credits.xml` (38 lines, not read in full).
- `binaries/data/mods/public/l10n/`, `binaries/data/mods/public/` text: translation files (.po), not read.
- `binaries/data/tools/fontbuilder/fonts/`: 18 font files (DejaVu, FreeFont, GUST, LibBiolinum, TeX Gyre Pagella). Fonts are tool inputs.

## Class per group
- Art (textures, meshes, animation, actors, materials, variants, particles, terrain): class B. CC BY-SA 3.0 (attribution and share-alike stated in art LICENSE.txt). CGTextures-derived textures: same CC BY-SA line but the file says the originals keep CGTextures' terms. Treat as B with a note.
- Audio (music, sound, voice): class B. CC BY-SA 3.0 (audio LICENSE.txt).
- Maps: NASA topography class A (public domain as stated). OSM heightmaps class B (ODbL/CC BY-SA). The JSON/JS map scripts class GPL-2+ (code class).
- Fonts: class C. Each font has its own licence file; only the DejaVu and LibBiolinum lines were read. Confirm each before use.
- Terms and Conditions, Disclaimer: class D (not usable).
- dbghelp.dll: proprietary, not an asset; class D.

## Inspiration (own words, no copied text)
- Player-colour is a material switch (`materials/player_trans_norm_spec.xml`: USE_PLAYERCOLOR, a spec map and a normal map). One base texture plus a spec and normal map gives a tintable, shiny armour look. The same three-texture setup can be recreated with our own shader.
- Gold armour is a variant layer: a base texture plus a gold texture plus a spec texture (`variants/shields/sele_pelte_01_gold.xml`, `skins/skeletal/ptol/cuirass_gold_01.png`). A gold look is a palette and spec change, not a new model.
- Coin pickups and loot shimmer are small particle XML files (`particles/coin.xml`, `coin_high.xml`): low-count sprite bursts with a high-count variant for big drops.
- Dust, sand, snow and smoke are reusable particle presets (dust storm, blowing sand, blowing snow, smoke large/med/small), so one preset set covers weather and destruction.
- Civilisation-based unit folders (per-civ actors and textures) keep one unit template with per-civ variants. A variant layer per faction is cheaper than full models.
- Music and voice sit in per-biome folders (audio/ambient/weather, dayscape, water); ambient layers by weather and time of day are a clear pattern.
- Maps use real-world heightmaps (NASA and OSM-derived). For our own zones, a heightmap-driven terrain generator can give terrain shape from a source image we own.

## Inspiration briefs
See `0ad-0ad.assets.json` (`briefs`).

## Cross-link to our cell topics
- camera: none directly; maps/heightmaps may help terrain framing.
- zones: `terrains/` biome files and `maps/` scenarios.
- spawns: `actors/` XML templates per civ and fauna.
- loot: `particles/coin*.xml`.
- hud-ui: `gui/` XML pages.
- vfx: `particles/` (dust, smoke, sand, snow, cloud, fire).
- animation: `animation/` 1.2 GB of DAE; `skeletons/` 78 files.
- sound: `audio/` (actor, voice, ambient, resource).

## Not read
- No image opened. Gold and skin notes are from file names and XML only.
- No DAE mesh opened (poly counts unknown). Animation DAE not opened.
- Audio files not opened. Voice lines not checked.
- Actor XML not read beyond the names listed.
- gui/credits/credits.xml not read beyond the line count.
- FreeFont and GUST font licences not read beyond headers.
- Map files (.pmp, .json) not read.
