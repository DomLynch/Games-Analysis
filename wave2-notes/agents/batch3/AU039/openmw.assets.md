# openmw (asset audit, class B, cell AU039)

Donor: /mnt/frankendom-donors/openmw
Code licence: GPLv3 (README.md:9; LICENSE:1 is the GPL v3 text). Separate licence files for cmake scripts and an extern video player (not read).
Asset licence: mixed, as the files say. DejaVuLGCSansMono.ttf is "custom" (README.md:16, DejaVuFontLicense.txt:1). DemonicLetters.ttf and MysticCards.ttf are SIL Open Font License with a Reserved Font Name (README.md:17-18; DemonicLettersFontLicense.txt:2; MysticCardsFontLicense.txt:2). Textures, MyGUI layouts and Lua scripts have no licence file of their own.
Rights-holder status: OpenMW open-source engine project. It requires the user to own Morrowind (README.md:4). Morrowind publisher named as Bethesda Softworks (README.md:4). Font copyright holders named in their licence files (OpenMW Team, Georg Duffner, Bitstream, Isak Larborn).
Half read: the asset and script half (files/data, files/data-mw, files/data/mygui, fonts, shaders by name). The Morrowind data half is not in the box (find for .esm, .esp, .bsa, .nif: none). The record readers and combat code (components/, apps/) were not read.

## Inventory
| Group | Path | Count | Class | Note |
|---|---|---|---|---|
| Morrowind data | not in box | 0 | C | User supplies. |
| Fonts | files/data/fonts/ | 3 TTF | B (two OFL, one custom C) | Licence texts ship with fonts. |
| Textures | files/data/textures/ | 37 DDS, 14 PNG across files/ | C | No own licence; repo GPL by default. Controller glyphs, menu scroll glyphs, map palette, water normal map (names only). |
| MyGUI layouts and skins | files/data/mygui/ | 88 files | B | GPL-covered XML UI. |
| Lua scripts | files/data/scripts/omw/, files/data-mw/scripts/, files/data/openmw_aux/ | 65 files | B (code) | Camera, input, mechanics, ui folders. |
| Post effects | files/data/shaders/*.omwfx | 4 named files | B | adjustments, bloomlinear, debug, internal_distortion. Names only. |
| Audio, models, maps | none | 0 | D | Not in box. |

## Data first
- The content tables (creatures, items, dialogue, zones) are Morrowind ESM records, not in the box. The reader code is in components/ and was not read.
- The UI text and labels live in files/lang and files/data/l10n (not read). Layout XML names the widgets (files/data/mygui/openmw_controllerbuttons.layout:16-17).

## Inspiration
- Head bob from smoothed speed: cosine arc sampler and a per-frame weight (head_bobbing.lua:25, :30, :33). Use as a low-amplitude exploration bob, off in fights (camera row 11).
- Controller glyphs as two families (PlayStation-style and Steam-style), placed as image widgets per button (openmw_controllerbuttons.layout:16-17). Pattern for touch and gamepad prompts with our own shapes.
- Two display fonts for flavour text: one demonic-letter face, one card-style face. Titles only.
- A separate normal-map texture for water ripples (files/data/textures/omw/water_nm.png; name only, not opened).
- Named post-effect files (adjustments, bloom, distortion, debug) as the colour-grade pattern for row 16.
- Layout and skin split in MyGUI (layouts for structure, skin XML for look) so a high-contrast skin swaps without touching layouts (hud-ui).
- Lua scripts split by concern (camera, input, mechanics, ui): one file per concern, so the camera and HUD do not own rules.

## Inspiration briefs
1. **Rippling marsh water.** Keep: normal-map texture for ripples on a flat plane; a moving normal; sun glint. Change: our own normal map; depth-based shoreline tint; slower swell in combat zones. Ref: files/data/textures/omw/water_nm.png (name only).
2. **Gentle walking sway.** Keep: cosine-based arc for the bob; smoothed speed input; a per-frame weight. Change: our own amplitude and period; zero bob in the fight camera; per-zone strength in data. Ref: files/data/scripts/omw/camera/head_bobbing.lua:25, :30, :33.
3. **Dark-title font for zone names.** Keep: one display face for titles only; a card-style face for item names; no body text in either. Change: our own face or a clearly licensed free face; licence text kept with it; no reserved font name on a modified copy. Ref: files/data/fonts/DemonicLetters.ttf, MysticCards.ttf; licence conditions at DemonicLettersFontLicense.txt:2 and MysticCardsFontLicense.txt:2.

Recreate every idea as a clearly distinct original. Never copy the donor's look.

## Cross-link
- Camera: head_bobbing.lua is the one camera script read; third_person.lua and first_person_auto_switch.lua are names only.
- Sound: no audio in the box; sound-music fold-in has nothing to take from assets.
- HUD: MyGUI layouts (hud, inventory, dialogue, controller buttons) are the hud-ui reference; skins and bodies not read.
- VFX and colour: omwfx names; shader bodies not read.
- Spawns, loot, animation: not in box, not read.

## Not read or not in box
See the not_read list in openmw.assets.json. Main gaps: Morrowind data (absent), C++ record readers and combat code, texture contents, shader bodies.
