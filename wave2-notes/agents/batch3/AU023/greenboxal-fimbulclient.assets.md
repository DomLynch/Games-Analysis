# greenboxal-fimbulclient - asset audit (AU023)

Source tree (VPS, read only): /mnt/frankendom-donors/greenboxal-fimbulclient/
Half read: the client half (src/testclient, src/libragnarok, src/ya3de headers and selected files, data/data/shaders, data/data/ui scripts and styles, CMakeLists.txt, README.md, .gitmodules). The server half is not in the box: README.md line 4 points to a rAthena forum topic, and no server code is present. The game data half (maps, models, textures) is not in the box.

## Licence (what the files say)
- Code: GNU GPL, version 3 or later, stated in the per-file headers. Example: src/libragnarok/Ragnarok/Graphics/RsmModel.h line 5 "the Free Software Foundation, either version 3 of the License, or". Same wording in src/ya3de/YA3DE/PackEnd.h line 5. The header of RsmModel.h line 1 says "This file is part of FimbulwinterClient." No top-level LICENSE or COPYING file is in the tree.
- jQuery 1.8.2 (data/data/ui/js/jquery-1.8.2.js line 9): "Released under the MIT license".
- jQuery UI 1.9.1 (data/data/ui/js/jquery-ui-1.9.1.custom.js line 4): copyright jQuery Foundation, Licensed MIT.
- jQuery UI CSS "Delta" theme (data/data/ui/styles/Delta/jquery-ui.css line 5): "Dual licensed under the MIT or GPL Version 2 licenses."
- Modernizr 2.0.6 (data/data/ui/js/modernizr-2.0.6.min.js line 1): "MIT & BSD".
- The theme images (Delta and Metro folders) have no licence line of their own. The Delta CSS line above is the only licence statement near them. Treated as unclear.
- The GLSL shader files (data/data/shaders/*.glsl) show no licence header in the lines read (first 80 lines of model.glsl and ground.glsl). Covered by the repo-wide GPL headers only by location, not by a line in the file.
- Third-party SOIL is a git submodule (.gitmodules line 3) with an empty folder in the donor (3rdparty/SOIL has no files). Its licence cannot be read here.

## Rights-holder status (from repo files only)
unknown for the game content. README.md lines 4 and 6 point to a rAthena forum topic and a GitHub wiki. The files do not name an owner of the game data. The client code is GPLv3-or-later per headers. No data is shipped, so game-art rights do not arise in this box.

## Asset inventory
| group | path | count | licence | class | note |
|---|---|---|---|---|---|
| jQuery UI theme images (Delta) | data/data/ui/styles/Delta/images/*.png | 20 PNG | no line on the images; Delta CSS dual MIT or GPL v2 | C | Icon sheets at 256x240 in several accent colours, glass gradient strips (1x400, 1x100, 40x100), slider handles, close icons. Pixel content not opened. |
| jQuery UI theme images (Metro) | data/data/ui/styles/Metro/images/*.png | 5 PNG | no line on the images | C | Icon sheets (file names end in _0). Metro CSS not read. |
| UI CSS theme | data/data/ui/styles/Delta/jquery-ui.css | 1 | dual MIT or GPL v2 (line 5) | B | The user picks one licence. GPL v2 branch is a share-alike condition. |
| UI script libraries | data/data/ui/js/jquery-1.8.2.js; jquery-ui-1.9.1.custom.js (+ min); modernizr-2.0.6.min.js | 3 | MIT; MIT and BSD | A | Third-party libraries, code. Attribution in header. |
| UI page | data/data/ui/login.html; data/data/ui/js/rocketmvvm.js | 2 | not stated in lines read | n/a | Not read. |
| GLSL shaders | data/data/shaders/model.glsl, ground.glsl, uitexture.glsl | 3 | GPL headers by location only | n/a | Code. Recipes described in the inspiration section. |
| game maps (.rsw) | not in tree; loader: src/libragnarok/Ragnarok/Graphics/World.cpp line 53; name from config: src/testclient/TestGameMode.cpp line 56 | 0 | n/a | D | The code loads a map file named by a config key with a default, from the data folder. No map file in the box. |
| game models (RSM) | not in tree; RsmModel.h/.cpp in src/libragnarok/Ragnarok/Graphics/ | 0 | n/a | D | Loader code only. |
| game textures, GRF archives, sprites | not in tree | 0 | n/a | D | Not present. |
| code | src/ (about 130 files: .h, .cpp, .c, CMake), 3rdparty/ (empty SOIL folder) | about 143 files total in the donor | GPLv3 or later (headers) | n/a | Code. |

## Data first
- Zone file: src/testclient/TestGameMode.cpp line 56 loads a world by name (config key with the default name) from the data folder. A zone is one named file.
- Map loader: src/libragnarok/Ragnarok/Graphics/World.cpp line 53 LoadFromRsw.
- Shader inputs: data/data/shaders/ground.glsl line 19 (lightmap sampler) and the light uniforms below it, model.glsl lines 55 to 59 (alpha and lighting).
- UI theme: data/data/ui/styles/Delta/ (CSS and images) and data/data/ui/styles/Metro/ (images).

## Inspiration (category level; game data absent and UI art licence unclear)
- Ground surface lighting: the surface colour is multiplied by a per-vertex colour, a baked lightmap is added, the result is masked by the lightmap's alpha, then multiplied by a directional diffuse term plus flat ambient (ground.glsl lines 75 to 80). A good recipe for baked-plus-dynamic light on our zones.
- Prop lighting: one directional light, flat ambient, and an alpha test that discards empty texels (model.glsl lines 55 to 59). A simple lit-prop model that is cheap on phones.
- Two texture coordinate sets: one for the surface texture, one for the lightmap (ground.glsl TexCoord0 and TexCoord1). Lets a decal or a wear layer use its own UVs.
- Zones are single named files chosen by a config key with a default name. A simple data-first zone switch for our own zone list.
- UI icon sheets are one sheet per accent colour, each 256 by 240 px by file name (Delta images folder); @2x variants exist for the close icon and slider handles. One icon sheet per faction colour would keep the HUD consistent.
- Glass-style panel: a semi-transparent gradient strip used as the fill of a panel (Delta images, glass 1x400 strips). A panel fill we can tint per zone.

## Briefs (category level only)
See greenboxal-fimbulclient.assets.json key "briefs". Rule for all briefs: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed.

## Cross-link to our cell topics
- camera and zones: named zone files (TestGameMode.cpp line 56, World.cpp line 53); baked lightmap idea (ground.glsl).
- vfx and animation: no effects or animation content in this box.
- hud-ui: Delta and Metro theme images; icon sheet layout.
- spawns, loot, sound: no content in this box.

## Not read
- data/data/ui/login.html, data/data/ui/js/rocketmvvm.js (names only).
- Pixel content of all 25 PNG files (names and folder counts only).
- Metro jquery-ui CSS (names only).
- Most of src/libragnarok and src/ya3de (headers and grep hits only).
- 3rdparty/SOIL: empty in the donor (submodule not checked out).
- Server half and game data half: not in the box.
