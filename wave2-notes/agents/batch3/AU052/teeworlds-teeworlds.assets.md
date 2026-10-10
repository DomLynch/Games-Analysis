# teeworlds-teeworlds (asset audit, AU052)

Donor folder: /mnt/frankendom-donors/teeworlds-teeworlds (VPS only, read-only)
Half read: DATA half (datasrc/) and the data-describing scripts (datasrc/content.py, datatypes.py, network.py, names only for the last two). Code halves are both in the box: src/game/client and src/game/server (names seen, not read in this pass). Paired half: src/game/server is the matching server code in the same tree.

## Licences (what the files say)
- Code: license.txt opens "Copyright (C) 2007-2024 Magnus Auvinen". It grants use for any purpose, including commercial, and alteration and redistribution, with three conditions: do not misrepresent origin (attribution appreciated but not required), mark altered source as altered, keep the notice. The file asks users to contact the authors for anything the licence does not permit.
- Code third-party: license.txt "IMPORTANT NOTE" says src/engine/external holds stripped libraries with their own licences, "Mostly BSD or zlib/libpng license but check the individual libraries". Not read per library.
- Asset: license.txt line 21 to 22: "All content under 'data' and 'datasrc' except the font (which has its own license) is released under CC-BY-SA 3.0 (http://creativecommons.org/licenses/by-sa/3.0/)." There is no data/ folder in the box, only datasrc/.
- Fonts: datasrc/fonts/LICENSE opens with DejaVu notices (Bitstream Vera terms; DejaVu changes stated as public domain). datasrc/fonts/VERSION lists DejaVuSans 2.33 and SourceHanSans 2.001. No separate licence file for SourceHanSans was seen in fonts/ (one LICENSE file only). Unclear for the Source Han font: class C.
- Submodules named in .gitmodules: datasrc/languages (teeworlds-translation) and datasrc/maps (teeworlds-maps). Both directories are EMPTY in the box, so their content and licences are not present. Not read.

## Rights-holder status (repo files only)
Original open-source game. license.txt names the copyright holder (Magnus Auvinen, 2007-2024) and lists asset contributors by handle under "Authors". No clean-room, fan-project or leaked-data statement. Asset authors are not reproduced here.

## Data first (tables and scripts)
- datasrc/content.py (686 lines): the central data table. 185 sprite entries (`Sprite("name", set, x, y, w, h)`), about 29 numbered sound sets, the animation sequences ("base" and "ninja_swing"), six weapon specs, pickup list, and sprite-sheet grids. Cite this file for names and looks, not the loader.
- datasrc/datatypes.py (401 lines) and datasrc/network.py (484 lines): data type and network message definitions (names only, not read).
- skins/*.json: per-skin part table (body, marking, hands, feet, eyes, with filename and tint settings). Example skins/piggy.json.

## Asset inventory (sizes from folder listing; PNG sizes from header read)
| kind | path | count hint | licence | class |
|---|---|---|---|---|
| tee skin bodies | datasrc/skins/body/*.png | 16 PNG, 256x256 each (standard.png checked) | CC-BY-SA 3.0 (folder) | B |
| skin parts and JSON | datasrc/skins/ (feet, markings, eyes, etc.) | 122 files: 82 PNG, 40 JSON | CC-BY-SA 3.0 | B |
| main game sheet | datasrc/game.png | 1024x512, grid 32x16 (32 px cells) | CC-BY-SA 3.0 | B |
| particle sheet | datasrc/particles.png | 512x512, grid 8x8 | CC-BY-SA 3.0 | B |
| emoticon sheet | datasrc/emoticons.png | 512x512, grid 4x4 | CC-BY-SA 3.0 | B |
| dead tee | datasrc/deadtee.png | 64x64 | CC-BY-SA 3.0 | B |
| parallax and doodad layers | datasrc/mapres/*.png | 32 PNG, mostly 1024 px (desert_main.png 1024x1024) | CC-BY-SA 3.0 | B |
| UI | datasrc/ui/ | 46 files: 40 PNG, 6 .map; ui/themes has 11 entries (six theme maps: day and night for heavens, jungle, winter) | CC-BY-SA 3.0 | B |
| sounds | datasrc/audio/ | 131 WavPack .wv, about 3.1 MB; one music file (music_menu.wv) | CC-BY-SA 3.0 | B |
| country flags | datasrc/countryflags/ | 251 PNG and index.json | CC-BY-SA 3.0 (folder); flag origin not stated in files | B |
| editor art | datasrc/editor/ | 10 files: 4 PNG, 6 JSON | CC-BY-SA 3.0 | B |
| fonts | datasrc/fonts/ | DejaVuSans.ttf and SourceHanSans.ttc, about 21 MB | own licence (see above) | C |
| maps | datasrc/maps/ | empty (submodule) | not present | D |
| languages | datasrc/languages/ | empty (submodule) | not present | D |
| data table script | datasrc/content.py, datatypes.py, network.py | 3 files | code licence (permissive notice, attribution) | A |

## Sound families (names as the file names show)
Weapon sounds with numbered variants (2 to 3 each): ninja attack and hit, hammer swing and hit, grenade launch and explode, no-ammo click. Foley: footsteps, double jump, body splat, body impact, landing. Voice: pain, spawn, cry, ninja. Hook: loop, attach ground, attach player, no-attach. Pickups: armour, ninja, hearts. The numbered suffix (-01 to -03) gives random variants per event.

## Best class: B
CC-BY-SA 3.0 art, sounds, UI and skins. Fonts and submodule data are C or absent.

## Inspiration (own words, category-level for art; techniques and looks named)
- Parts-based character: a tee is a stack of parts (body, markings, decoration, hands, feet, eyes, hats), each with its own sprite grid and tint settings. The skin JSON gives each part a sprite name and a custom-colour flag with a hue, saturation and lightness triple (skins/piggy.json lines 3 to 11). Recreate as: greyscale base parts tinted per part; our armour plates tinted from a metal ramp.
- Recolour in the settings menu: a hue-saturation-lightness picker is drawn by CMenus::RenderHSLPicker (src/game/client/components/menus_settings.cpp line 65). Idea: one picker per part with a live preview on the hero rig.
- Three-frame weapon muzzle: the ninja weapon has three muzzle sprites (content.py lines 410 to 412) used in turn. Idea: a short three-frame flash for each attack, not a single flash.
- Keyframe slash: the ninja swing is six keyframes on normalised time with angles, a fast snap through the middle and rest at both ends (content.py lines 618 to 624). Idea: a windup that snaps and settles, readable at 375 wide.
- Chain as repeated link: the hook is one chain sprite and one head sprite (content.py lines 407 and 408). Idea: a tether drawn from a repeated link sprite along the line.
- Energy bar from three sprites: the ninja bar is built from a left cap, fill and right cap, in full and empty variants (content.py lines 426 to 429). Idea: a stamina bar built from caps and fill, tinted per state, for the hud-ui topic.
- Splat as a small sprite left behind: a splat particle (content.py line 348, part_splat01) and a 64 px dead-tee sprite (datasrc/deadtee.png). Idea: a dim, non-gory mark left at death for row 17 and row 8.
- Sound variants: most events have 2 to 3 numbered variant files (content.py lines 188 and 206). Whether the runtime picks them at random was not read. Idea: a variant pool per event so the same hit is not heard twice in a row.

## Briefs
label: Ninja slash arc
why: a short windup and a snap that settles gives one readable motion, which fits a fast duel at 375 px.
keep: six-keyframe attack with a windup, fast snap through the middle and rest at both ends (content.py lines 618 to 624); three sound variants per attack (line 188); three-frame muzzle (lines 410 to 412).
change: a two-part curved blade with a glow trail, not a single arc; sounds from our own foley set; the muzzle is a rune burst.
ref: datasrc/content.py lines 618 to 624 (animation), 188 (sound variants), 410 to 412 (muzzle sprites)
Rule: recreate as a clearly distinct original, never a copy. Kept: windup-snap-rest and three frames. Changed: blade form, trail, sound source, burst shape.

label: Rune tether
why: a tether made of repeated links is readable from across a fight and says where a pull comes from.
keep: one link sprite repeated along the line; a separate head sprite at the end (content.py lines 407 and 408).
change: a braided rune rope with a glowing head ring, not a plain chain; the head shows the target's team colour.
ref: datasrc/content.py lines 407 to 408 (hook_chain, hook_head)
Rule: recreate as a clearly distinct original, never a copy. Kept: repeated link and separate head. Changed: rope form, head shape, colour logic.

label: Parts-tinted fighter
why: a character made of tinted parts can be recoloured per player with a few numbers.
keep: body, marking, hands, feet and eyes as separate parts, each with its own tint (skins/piggy.json lines 3 to 11).
change: parts are armour plates tinted from a metal ramp, not hue and saturation triples; the eyes are a visor slit with a team glow.
ref: datasrc/skins/piggy.json (lines 3 to 11); datasrc/skins/body/standard.png
Rule: recreate as a clearly distinct original, never a copy. Kept: per-part tint. Changed: tint method, eyes, armour look.

label: Segmented energy bar
why: a bar built from caps and a fill is cheap to draw and easy to read at a glance.
keep: left cap, fill and right cap sprites, with full and empty variants (content.py lines 426 to 429).
change: segmented gauge in our hud colours, not a pill bar; the fill pulses when the bar is full.
ref: datasrc/content.py lines 426 to 429 (ninja_bar sprites); datasrc/game.png
Rule: recreate as a clearly distinct original, never a copy.

## Cross-links
- Camera: none (no camera data in the datasrc half).
- Zones: mapres parallax layers (32 PNG) and ui/themes maps show zone backdrops; the playable maps are in the empty datasrc/maps submodule, so zone layouts are not readable here.
- Spawns and walk density: none in this half; pickups list is in content.py.
- Loot: the pickup list in content.py (Pickup entry for ninja, line 287) with pickup sprites for armour, hammer, laser and ninja (content.py lines 415 to 421 area). Drop ceremony and rarity look are not in this half.
- HUD: ninja bar, icon sheets (ui/icons, part of the 40 UI PNG), console, sound icons.
- VFX: particle sheet (8x8 grid) and splat sprite.
- Animation: ninja swing and base animation sequences.
- Sound: numbered variant sets; one music file only (music_menu.wv), so in-game music is not in the box.

## Not read
- Code halves (src/game/client, src/game/server) beyond the RenderHSLPicker name line.
- datatypes.py and network.py bodies.
- Individual sprite PNG contents (headers only for a few).
- ui/themes .map files and editor/ JSON.
- Font files (sizes only).
- maps and languages submodules (absent).
