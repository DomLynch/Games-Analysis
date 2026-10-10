# freeciv-freeciv

Donor root: /mnt/frankendom-donors/freeciv-freeciv/

## Licences (as the files say)
- Code: GPL v2. COPYING line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 2, June 1991". README.md states "Free and Open Source".
- Assets: no single blanket asset licence. Per group:
  - data/graphics/logo+splash/README (line 4): author "hereby places" the work under GPL (text says "I hearby place my work under the GPL"); the globe image derives from a NASA public domain image (line 5).
  - data/graphics/cimpletoon/CREDITS (line 1): "Some of the models were borrowed ... Original model were in public domain." Named authors listed (e.g. line 4 "Joni Vvaris for low poly ak-47"). Only the named models are stated PD.
  - data/flags/credits (line 1) points to data/misc/flags.spec, whose credits say "Many Public Domain flags from" several sources (line 11). Per-flag credits; not all read.
  - Font licence texts exist as COPYING.DejaVu, COPYING.fireflysung, COPYING.sazanami, COPYING.UnDotum beside the fonts in data/themes/gui-sdl2 and gui-sdl3 (not read).
  - data/stdsounds and data/stdmusic: no licence text in the folders.
- Class: C overall (unclear). Logo group is B (GPL). Named cimpletoon models are A.

## Rights holder
- Community open-source project. Authors credited per file (James Blewitt for the logo files). AUTHORS points to a people page (not fetched). No company owner stated.

## Asset inventory
- Tilesets: about 20 entries (amplio2, isophex, trident, isotrident, hex2t, hexemplio, toonhex, alio, cimpletoon.tilespec and others). Spec sizes by grep: amplio2/activities.spec dx 28, dy 24; animals.spec dx 64, dy 48; bases.spec dx 96, dy 72.
- 3D source: about 76 .blend files in data/graphics; the iso render setup is data/graphics/Elefant-Cimpletoon-Renderers/IsoRender64x48.blend; data/graphics/cimpletoon/elefant_art/ holds Panther, Sherman, SAM, Biplane .blend files.
- UI theme sprites: data/themes/gui-sdl2, gui-sdl3, gtk3.22, gtk4, gui-qt (theme_buttons.png, icons.png, tech_tree.png, theme_boxs.png, intro.png) and fonts DejaVuSans.ttf, fireflysung.ttf, sazanami-gothic.ttf.
- Sounds: data/stdsounds/ 21 OGG (LrgExpl.ogg, SmlExpl.ogg, MgHeavy.ogg, Splash.ogg, fanfare.ogg and others). Music: data/stdmusic/CullamBruce-Lockhart--Dawning_Fanfare.ogg (1 file; author in file name only).
- Photos: 37 JPG or JPEG files across data/graphics (wonders/, buildings/, tech/), with photo-like names (e.g. wonders/eiffel_tower.jpg; buildings/Tibet_Potala_Palace.JPG). Licence not stated. Class D (do not reuse).
- Text data (data first): data/civ2civ3/*.ruleset and data/alien/*.ruleset. Alien unit names from data/alien/units.ruleset: Biomass (line 1151), Spitter (1078), Rex (830), Crusher (759), Turtle Defender (899); Heavy Spitter also in the list. Unit classes: Earthly, Native, Sea, Amphibious, Antigravity, Burrowing, Missile. The alien tileset graphic for these units was not located in the box.
- Scenarios: data/scenarios/ (14 entries, not opened).

## Halves
- Read: the data pack (data/) licences and alien ruleset names.
- Other half in the box: client/ and server/ C source (not read).

## Inspiration (own words)
- Group creatures by movement class (burrowing, glide, swim) so silhouettes read differently.
- Biomass and Spitter suggest a living-mass native unit and a ranged organic spitter (units.ruleset:1151 and :1078).
- Rex, Crusher and Turtle Defender are named by role: big body, heavy front, shell defence (lines 830, 759, 899). Use the role, not the look.
- Layered blast sounds by size (LrgExpl.ogg and SmlExpl.ogg) share one family.
- Fixed iso camera renders from 3D models give consistent sprites (IsoRender64x48.blend).
- Three board grids (square, iso, hex) exist; pick one per zone type.

## Briefs (Dom's rule: recreate as a clearly distinct original, never a copy)
- Shell-back defender (units.ruleset:899). Keep: low wide silhouette, armoured dome. Change: plated armadillo or bivalve form, spines, cool palette.
- Throat-sac spitter (units.ruleset:1078). Keep: inflate-then-fire telegraph, ranged shot. Change: spore or seed burst, different body plan.
- Front-loaded crusher (units.ruleset:759). Keep: heavy front mass, slow advance. Change: tracked or wheeled chassis, clamp instead of plate.
- Layered blast sounds (data/stdsounds/LrgExpl.ogg; SmlExpl.ogg). Keep: small and large from one family. Change: our own recordings, metallic ring tail.

## Cross-link to our cell topics
- Zones and terrain: tileset grid choices (hex, iso, square).
- Spawns and units: alien ruleset roles (units.ruleset).
- Sound: stdsounds layering.
- HUD and UI: theme sprite sheets.

## Not read
- Binary PNG, JPG, SVG, BLEND, XCF, OGG contents.
- client/ and server/ C source.
- Ruleset Lua scripts (parser.lua, script.lua); data/helpdata.txt beyond a grep; data/misc/flags.spec beyond its first credits lines.
- Font COPYING.* texts (names only).
