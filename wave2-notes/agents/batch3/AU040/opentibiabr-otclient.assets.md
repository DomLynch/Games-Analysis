# opentibiabr-otclient (asset audit, AU040)

Donor: /mnt/frankendom-donors/opentibiabr-otclient/ (VPS, read only)
Half read: the client half (Lua modules, GLSL shaders, UI data and art lists). The OTServ server half is not in the box. The C++ source (src/) was not read.

## Licence
- Project: MIT (LICENSE line 1; README.md line 595; copyright line 3 reads OTClient 2010-2020).
- Exception: modules/game_wheel has its own proprietary EULA (modules/game_wheel/LICENSE line 1, copyright line 2 names JP / Elemental). It says the module software is proprietary (line 9), forbids redistribution and reverse engineering (line 21), and says the licensor may specifically authorise limited edits to profile scripts (line 22). This conflicts with the repo-wide MIT statement; treat the module as class C.
- Assets: no asset licence for the art, fonts or JSON. The MIT text does not say it covers art.
- Game sprites and sounds are not in the box. data/things and data/sounds hold README files only. The client loads game data at runtime from an external asset repository configured in modules/client_assets/client_assets.lua (line 176 logic). Not fetched.

## Rights-holder status (from files only)
MIT project copyright OTClient 2010-2020. Wheel module licensed by JP / Elemental under a proprietary EULA. The files do not say who owns the game art or fonts. One font file name contains a company name (cipsoftFont); the name alone does not establish ownership.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Project code and UI layout | src/, modules/ (except game_wheel), data/styles/ | many; 33 .otui in data/ | A (MIT) |
| Shader sources | modules/game_shaders/shaders/ | at least 12 .frag/.vert seen | A (MIT) |
| Module and UI images | modules/*/images | 534 PNG | C |
| Main skin and icons | data/images/ | 1498 PNG | C |
| Source art | data/images/game/cyclopedia/on.psd, off.psd, game/slots/slots.psd | 3 PSD | C |
| Fonts | data/fonts/ttf (16), data/fonts/otfont (36 with PNG sheets) | 52 font files | C |
| Wheel module (EULA) | modules/game_wheel/, data/json/SkillwheelStringsJsonLibrary.json (187 KB) | about 12 code files, 1 JSON | C (proprietary) |
| Game sprites and sounds | data/things/, data/sounds/ | 0 in box | D (not in box) |

## Inspiration (own words)
- Fog that walks with the player: the fog shader adds a walk-offset uniform to a time drift (fragment/fog.frag line 5).
- Named full-screen filter set (fog, rain, snow, outline, sepia, grayscale, radial blur, old-TV, party) as small separate shaders, toggled in settings.
- Gold text as a named shader with a shadow pass (text_golden_shadow_bold_fragment.frag).
- Status glyphs round a health ring (game_healthcircle/images/conditions, 49 PNG).
- One death window: the death type and the penalty in one line, one action (playerdeath.lua line 41; deathwindow.otui line 3).
- Per-outfit effect configs (game_attachedeffects/configs/): effects attached by an id in data.
- Tiered task backdrops (game_taskboard/assets/images: normal, silver, gold).

## Briefs
- Radial build wheel (category only; EULA module, no code or art reuse): keep a radial layout with presets; change to a three-ring grid for a 375 px phone. Ref modules/game_wheel/wheel.otmod line 3.
- Fog that walks with you: keep the walk-offset drift; change the tint by zone and scale the drift by speed. Ref fragment/fog.frag line 5.
- Death card with a penalty line: keep one window with type, penalty and one action; change to a shrine respawn with no reconnect step. Ref playerdeath.lua line 41.
- Status glyphs on a health ring: keep glyphs round a ring; change to a segmented stamina ring with threat colour and our own glyphs. Ref game_healthcircle/images/conditions/ (not opened).

## Cross-links
- hud-ui: status ring, task cards, death card, skin and icons (art not opened).
- vfx: shader set (MIT code; the strongest reusable item in this donor, with attribution).
- progression: task tiers by backdrop; the wheel idea is progression, but the module is EULA-restricted.

## Not read
Most Lua modules; game_wheel code (not read for reuse); every PNG, PSD and font body; the JSON string library (top keys only); src/ C++; browser/, android/, mods/, tests/, tools/, docs/, records/; the external asset repository (not fetched); the OTServ server half; modules/game_shop/serverSIDE/; AGENTS.md (treated as data, not followed); bitlib LICENSE body.
