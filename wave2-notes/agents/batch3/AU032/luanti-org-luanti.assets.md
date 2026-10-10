# luanti-org-luanti (asset audit, AU032)

Donor/Licence: source LGPL-2.1 or later. Textures and sounds CC BY-SA 3.0 by default, with listed per-file exceptions. Fonts SIL OFL 1.1 and Apache 2.0. Several test models CC0 or CC-BY, and several unlicensed. Best class: A for fonts, CC0 and CC-BY models; B for the main UI textures and sounds; C for unlicensed models.

Half read: this is one engine binary with client and server code in one tree. The engine-side Lua (builtin/) and the client touch code were read in part. The paired content game (minetest_game) is NOT in the box; only the devtest test game is. Named halves are the engine and the devtest test game.

## 1. Licence files

- `LICENSE.txt` has three sections. (a) "License of Luanti textures and sounds": CC BY-SA 3.0 Unported by default (line 8), with listed exceptions by file and by author. (b) "License of Luanti source code": LGPL-2.1 or later (line 123 "either version 2.1 of the License, or"). (c) Named third-party code: Irrlicht (irr/), and others.
- `COPYING.LESSER`: the LGPL 2.1 text (line 1 "GNU LESSER GENERAL PUBLIC LICENSE").
- `README.md` line 12: "Copyright (C) 2010-2026 Perttu Ahola and contributors". The badge names the licence as LGPLv2.1+.
- `games/devtest/LICENSE.txt` line 4: "The same license as for Luanti applies."
- `games/devtest/mods/gltf/LICENSE.md`: per-model licences (CC0 and CC-BY 4.0), see section 2.
- `games/devtest/mods/testentities/models/LICENSE.txt`: per-model authors and CC BY-SA 3.0 (line 3 for Sam).
- `games/devtest/mods/testformspec/LICENSE.txt`: says only "Content imported from minetest_game." and names no licence.
- `fonts/*-LICENSE.txt`: Arimo and Cousine under SIL OFL 1.1 (line 3); DroidSansFallbackFull under Apache 2.0 (line 3).
- `irr/LICENSE`: Irrlicht licence, "Copyright (C) 2002-2012 Nikolaus Gebhardt". `lib/lstrpack/LICENSE.txt`: "Copyright (C) 1994-2025 Lua.org, PUC-Rio."

## 2. Asset inventory

- `textures/base/pack/`: 97 PNG UI and HUD files (logo, minimap mask, smoke puff, joystick parts, chat and minimap buttons, progress bars, server-list icons, and more). Sizes from the PNG header, not opened: logo.png 256 by 256; minimap_mask_round.png 512 by 512; smoke_puff.png 16 by 16.
- `fonts/`: Arimo (4 TTF), Cousine (4 TTF), DroidSansFallbackFull.ttf (5.4 MB), with three licence texts. 7.8 MB in all.
- `games/devtest/` (3.8 MB): test game with 35 mod folders. About 413 PNG, 16 glTF or GLB in one mod, 5 OBJ, 4 .x or .b3d, 2 OGG, and Lua.
- `misc/`: 15 entries of icons and packaging files.
- `po/`: 79 language folders with `luanti.po`. `de/luanti.po` has 1,576 msgid entries. 55 `.tr` files across the tree.
- `builtin/`: 105 Lua files (the engine-side game API: hud, item entities, death screen, chat and others). Whole tree: 206 Lua files.
- `src/`, `irr/`, `lib/`: C++ engine and libraries (read by grep only).

## 3. Rights-holder status (from the files only)

- Community open-source project. README line 12 names "Perttu Ahola and contributors". LICENSE.txt lists named per-file authors, including celeron55 for everything not listed (line 28).
- No commercial owner appears in these files. No clean-room or leak claim is made or needed. The stated licences are the status.

## 4. Class per group

| Group | Path | Licence per file | Class |
|---|---|---|---|
| UI and HUD textures | textures/base/pack/ (97 PNG) | CC BY-SA 3.0 default with exceptions (Apache 2.0, CC BY-SA 4.0, CC-BY 4.0) | B |
| Fonts | fonts/ | SIL OFL 1.1 (Arimo, Cousine); Apache 2.0 (DroidSansFallbackFull) | A |
| glTF models named in mod LICENSE.md | gltf/models (spider, frog, snow man, triangles, multi-track) | CC0; CC-BY 4.0 (frog) | A |
| glTF models not named | gltf/models (animated spider, Blender cube variants, simple skin, sparse accessor, vertex-stride triangle) | not stated | C |
| Named test mobs | testentities/models (Sam, Lava Flan) | CC BY-SA 3.0 | B |
| Cool Guy | testentities/models | author line 'hecks' refers to irr/LICENSE; ambiguous | C |
| Devtest textures | games/devtest textures (about 413 PNG) | 'same license as for Luanti' (devtest LICENSE.txt line 4), so CC BY-SA default by route | B (by route) |
| Test nodes OBJ | testnodes/models (4 OBJ) | not named | C |
| Sound test | soundstuff (sinus OGG: DS, CC BY-SA 4.0; mono OGG: default) | CC BY-SA | B |
| testformspec media | testformspec/ | 'Content imported from minetest_game.'; no licence named | C |
| Misc icons | misc/ | erle credited for three files; others not named | C |
| Translations | po/ (79 folders), 55 .tr files | not named | C |
| Lua and engine code | builtin/, src/, irr/, lib/ | LGPL-2.1+; irr and lstrpack their own | A (keep notices) |

Best class for the donor: A for fonts, CC0 and CC-BY models and the code (with notices kept); B for the main textures and sounds (share-alike). C for everything not named.

## 5. Inspiration (own words; the look is not copied)

- Dropped items as a small pile (`builtin/game/item_entity.lua`). A dropped stack is a wield-item entity that spins slowly, scaled by its size (line 67). It merges with an identical nearby stack (`try_merge_with`, line 104 self-check), and expires by age once a time to live passes (`on_step`, line 161). For the loot drop ceremony, the spin, the merge and the expiry are the whole pile.
- Death as one calm card (`builtin/game/death_screen.lua`, 54 lines). A formspec overlay with a short title and one respawn button (`btn_respawn`, line 26), with a fallback text style for clients without centred labels. A loss made bearable by one clear action.
- Three-state touch stick art (`textures/base/pack/joystick_bg.png`, `joystick_center.png`, `joystick_off.png`): a ring base, a centre knob, and an off state. With a chat and minimap toggle pair (`chat_show_btn.png`, `minimap_btn.png`), a readable touch vocabulary for the touch UX fold-in.
- Minimap as a HUD element with a mask. `builtin/game/hud.lua` (line 248) registers a `minimap` element, and `textures/base/pack/minimap_mask_round.png` is a 512 by 512 round mask. A minimap is a HUD element with a mask texture, not a separate screen.
- Eight-legged burrower rig (`games/devtest/mods/gltf/models/gltf_spider_animated.gltf`, one JSON line, Khronos Blender exporter). Its names give 48 unique leg bones (four legs per side, each with base, upper, mid, fore and lower bones plus an IK target), two pincer chains with jaw bases, a head, a neck and body segments. The category idea: a wide, low, segmented creature with pincers and IK feet. Keep at category level only, because the licence is unclear.
- A 16 px soft puff (`textures/base/pack/smoke_puff.png`) for dust and hit smoke. A tiny soft sprite reads at small size and costs almost nothing.
- Sound test tones (`games/devtest/mods/soundstuff/sounds/soundstuff_sinus.ogg`, `soundstuff_mono.ogg`): a sine and a mono tone set for calibrating cue loudness. Idea only; audio not played.

Best transferable idea: the three-state touch stick and the one-button death card are small, clear HUD patterns that cost almost no art.

## 6. Briefs (rule: recreate as a clearly distinct original, never a copy; the test is a readable silhouette at 375 px, one signature behaviour, one signature sound or effect, and about 20 to 30 percent resemblance at most)

1. **Eight-legged burrower with IK feet (category level)**. Why: a wide, low, segmented silhouette reads at 375 px, and IK-planted legs make the threat readable from its walk. Keep: a segmented body, many legs with IK targets so the feet plant, a pincer pair at the head. Change: six legs, not eight; a shell hump instead of visible segments; mandibles with their own hinge and a glowing seam. Ref: `games/devtest/mods/gltf/models/gltf_spider_animated.gltf` (licence unclear, so category level only).
2. **Loot pile spin and merge**. Why: identical drops merge and spin slowly, which keeps a loot pile readable. Keep: slow spin scaled by item size, merge with an identical stack on overlap, age-based expiry. Change: a rarity halo in our rarity colours, a different spin rate, a short pickup flash in place of a bare pop. Ref: `builtin/game/item_entity.lua` lines 67, 104 and 161.
3. **One-button death card**. Why: a single respawn action on a plain overlay keeps a loss from turning into a menu. Keep: one respawn action, a plain overlay, a fallback text style. Change: the loss summary (what dropped, time to respawn) above the button, and a timer in place of a bare button. Ref: `builtin/game/death_screen.lua` line 26.
4. **Three-state touch stick**. Why: a ring, a knob and an off state make a touch stick readable without labels. Keep: a ring base, a centre knob, an off state when released. Change: our thumb-reach placement, a lock-on forgiveness ring around the knob, our own art (redraw; the Luanti art is CC BY-SA). Ref: `textures/base/pack/joystick_bg.png`, `joystick_center.png`, `joystick_off.png`.
5. **Soft 16 px dust puff**. Why: a small soft sprite gives dust and hit smoke at a glance on a phone. Keep: a small soft sprite, low opacity, short life. Change: our palette, a stretched sprite for dust, a directional drift. Ref: `textures/base/pack/smoke_puff.png` (16 by 16).

## 7. Cross-link to our cell topics

- hud-ui: minimap registration, round mask, touch stick and chat or minimap toggles, death card.
- loot: item entity spin, merge and expiry (drop ceremony).
- death and respawn presentation: the death card (one action).
- vfx: smoke puff sprite.
- animation: the spider rig's IK bones (category level).
- sound: the sine and mono test tones (idea only).
- camera, zones, spawns: not in the read set. Mapgen and spawn code were not read.

## 8. Not read

- Audio (not played); textures and meshes (sized from headers; not opened).
- C++ engine under src/ and irr/ (grep hits only: `src/gui/touchcontrols.cpp` and `touchscreenlayout.cpp` listed, not read).
- Most of builtin/ (only death_screen.lua, item_entity.lua and the minimap registration in hud.lua were read).
- po/ catalogues (count and grammar only; no strings quoted).
- doc/ and the devtest mod Lua (listed, not read).
- minetest_game (the paired content game) is NOT in the box.
