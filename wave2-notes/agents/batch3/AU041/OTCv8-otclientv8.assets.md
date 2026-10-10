# OTCv8-otclientv8 (assets, AU041)

Donor: OTCv8-otclientv8 (VPS: /mnt/frankendom-donors/OTCv8-otclientv8/)
Code licence: MIT. LICENSE:1 "OTClientV8 is made available under the MIT License"; copyright lines 3-4 cover OTClient 2010-2017 and OTClientV8 2018-2023.
Asset licence: NOT STATED. The MIT text is the only licence file. I found no licence or copyright line in data/ (grep over data/ for licence, copyright, tibia, cipsoft found only locale and font-name hits). The layout and style files carry no licence line either.
Rights-holder status: the README names the game the client was made for: Tibia (README.md:4, link to tibia.com). The files do not say who owns the art or fonts. Unknown. The font is named cipsoftFont (data/fonts/cipsoftFont.otfont:2); the files do not state the owner of that name.
Best class: C for all art, fonts and sound (licence not stated; game-linked art). D for the Tibia sprite and data files: they are NOT in the box (README.md:92 says the user adds them to data/things; the directory is absent here, checked by listing data/).
Half read: client half only (data/, layouts/, styles, modules/ Lua, mods/). This donor is a client; the game-server half is not in this folder. I did not search elsewhere in the box for a paired server (not checked).

## 1. Licence files (what they say)
- LICENSE:1 MIT for the software; LICENSE:3-4 copyright lines for OTClient and OTClientV8.
- README.md:4: "It has been created as alternative client for game called" Tibia (named in the README; no licence for the game art).
- README.md:92: "Also remember to add your sprite and data file to data/things". The sprite and data pack is supplied by the user.
- data/locales/en.lua:10: "translations are not needed because everything is already in english" (English only; de, pl, es, pt, sv locale files exist, not read).
- layouts/README.md:1: "Layouts overwrite files from" data/ (a layout replaces a file of the same path).

## 2. Asset inventory (real paths; counts from find, sizes from IHDR)
| Group | Path | Count / size | Licence (as the file says) | Class |
|---|---|---|---|---|
| Game icons | data/images/game/ (npcicons, emblems, skulls, viplist, states, and more) | 181 PNG; npc icons 18 x 18 px | not stated | C |
| Status-effect icons | data/images/game/states/ | 17 PNG, 18 x 18 px (names: poisoned, bleeding, burning, freezing, haste, slowed, drowning, drunk, hungry and others) | not stated | C (category-level idea only) |
| UI kit | data/images/ui/ | 57 PNG (window, button variants, scrollbars, combobox, spinbox, rarity_frames.png 160 x 32, rarity_white.png 32 x 32, rarity_blue.png 32 x 32, discord.png, android.png) | not stated | C |
| Top bar buttons | data/images/topbuttons/ | 32 PNG | not stated | C |
| Other images | data/images/ bars (2), flags (6), optionstab (6), crosshair (2), shaders (5), background.png (1024 x 719), loading.png (128 x 128), clienticon.png | 24 PNG | not stated | C |
| Cursors | data/cursors/ | 5 PNG and cursors.otml | not stated | C |
| Sound cues | data/sounds/ | 8 OGG: alarm, Creature_Detected, Player_Detected, Player_Attack, Private_Message, Low_Health, Low_Mana, magnum | not stated | C |
| Fonts | data/fonts/ | 11 .otfont plus PNG sheets: cipsoftFont (8 px high, 8 x 8 glyph size, cipsoftFont.otfont:4-5), verdana 9/11 px variants, terminus 10/14 px, small 9 px, sans bold 16 px | not stated (names suggest Verdana and Terminus; not verified from files) | C |
| Shaders | data/shaders/ (8 .frag) and data/images/shaders (5 PNG) | 8 fragment shaders | not stated | C |
| UI definitions | data/styles/ (34 entries, .otui); layouts/retro (114 files), layouts/mobile (6 files: a README and 5 styles) | 34 + 120 files | not stated | C (no licence line) |
| Locales | data/locales/ (en, de, es, pl, pt, sv .lua) | 6 files; en is English-only (en.lua:10) | not stated | C (other locales not read) |
| Lua modules | modules/ (about 58 module folders by listing, 315 .lua files, about 74,378 lines in total) | code | MIT (code) | A for code (not art) |
| Mods | mods/game_healthbars/ | 2 files (healthbars.otmod, healthbars.lua) | MIT (code) | A for code |
| Sprite and data pack | data/things/ (the Tibia sprite and data pack) | ABSENT in the box (README.md:92) | n/a | D (not supplied) |
| Binaries | root: otclient_dx.exe, otclient_gl.exe, otclient_linux, otclient_mac, otclientv8.apk, d3dcompiler_47.dll, libEGL.dll, libGLESv2.dll | 8 files, 0.1 MB to 22.5 MB | MIT (client, LICENSE:1) | not read |

Not read: any PNG or OGG content (names and sizes only); the .frag shaders; the layout contents beyond the file counts; locales other than en; the 58 module bodies beyond the death and cooldown modules; mods/game_healthbars/healthbars.lua body.

## 3. Rights-holder status (repo files only)
- Client code: MIT, OTClient and OTClientV8 copyright lines (LICENSE:3-4).
- Art, fonts and sounds: no owner stated in the files. The README names Tibia as the target game; the sprite pack that the game needs is absent and supplied by the user (README.md:92).
- Overall: unknown for all non-code content.

## 4. Class by group
- A: none of the non-code content (no permissive licence line on any art file). Code under MIT is A for code only.
- B: none.
- C: game icons, status icons, UI kit, top bar, cursors, sound cues, fonts, shaders, locales, styles and layouts (licence not stated for the asset files).
- D: the sprite and data pack (absent; the user must supply it).
- Best class: C (no usable non-code asset with a clear licence in this box).

## 5. Inspiration (category level; C-class content stays category-level)
- Three-tier death screen (modules/game_playerdeath/playerdeath.lua:3-7, 51-65): the death is one of three kinds (regular, unfair, blessed), each with its own text and window size. The text shows 100 minus the penalty value (playerdeath.lua:57). Keep: tiered death type plus the cost shown in numbers. Change: our own tiers and our own text.
- Two-choice death window (playerdeath.lua:70-85): one button re-enters the world, the other leaves safely; Enter and Escape are bound to them (playerdeath.lua:81-82). Idea: respawn or leave safe as the two options, with the keys shown on the buttons.
- Death message guard (playerdeath.lua:35-40): the "You are dead" line is skipped when the centre label is visible (playerdeath.lua:37). Idea: a single death message source so two notices do not stack.
- Cooldown sweep per icon (modules/game_cooldown/cooldown.lua:149-162): the fill advances by 10000 divided by the duration on each step, and each step is scheduled 100 ms later (cooldown.lua:155-158). Idea: a radial or linear fill on each skill icon, with a shared bar per spell group (cooldown.lua:203-224).
- Status icon set: 17 state icons at 18 x 18 (data/images/game/states/). Idea: a small badge per status effect, readable at 375 px, each with its own silhouette.
- Rarity frames as a strip: data/images/ui/rarity_frames.png is 160 x 32 px, with white and blue 32 x 32 pieces alongside (IHDR). Idea: a rarity frame strip of five 32 px cells (cell size not verified in code) and a colour per rarity.
- Named combat cues: eight OGG cues, with names for low health, low mana, attacks and detection (data/sounds/). Idea: each cue is an event name in data, so the sound map is editable.
- Layout overrides (layouts/README.md:1): a layout replaces files of the same path, with a mobile set of 6 files and a retro set of 114. Idea: a touch layout that overrides only what it needs.

Defects noticed in the code (keep the idea, fix the defect):
- Group cooldown (cooldown.lua:213-214): progressRect.icon = icon runs before the check "if progressRect then". If the bar is missing, the first line errors. Fix: move the assignment inside the if block.
- Fixed 100 ms tick (cooldown.lua:155-158): the bar moves in 100 ms steps whatever the duration, so short cooldowns look jumpy. Fix: step by frame time and clamp to 100.

## 6. Inspiration briefs
See the JSON file, key "briefs" (4 briefs). Each brief recreates a clearly distinct original, never a copy. Art and sound are not copied; only the structure and the mechanism are kept.

## 7. Cross-link to our cell topics
- death and respawn (row 17): playerdeath.lua, tiered death types, penalty shown, two-button window.
- HUD and cooldowns (row 14): cooldown.lua group bars; state icons; top bar.
- loot (row 18): rarity frame strip (rarity_frames.png).
- touch UX and accessibility (hud-ui): layouts/mobile override set.
- sound-music (event cues): data/sounds cue names (Low_Health, Low_Mana, Player_Attack, alarm).
- server half: not in this folder, not checked elsewhere in the box.

## Not read
- Any image or sound content; shader bodies; full layouts; other locale files; 58 module bodies except death and cooldown; healthbars.lua; binaries.
