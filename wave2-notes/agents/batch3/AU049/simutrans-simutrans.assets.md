# simutrans-simutrans (asset audit, cell AU049)

Donor: /mnt/frankendom-donors/simutrans-simutrans (VPS). Simutrans, an open-source transport simulator. This tree is the SOURCE distribution. The game graphics paksets are NOT in it.
Read: LICENSE.txt (head and licence grep), README.md (section 1 and section 4 licence), simutrans/license.txt (full asset-scope statement), simutrans/copyright.txt (head and key lines), simutrans/license_squirrel.txt (head), themes.src/standard/standard.dat (header), themes.src/pak192comic/pak192comic.tab and theme.dat (licence and author lines), themes.src/build_themes.sh (header), themes.src/pak64german/files/sim-symbols.dat (copyright lines only), simutrans/text/en.tab (head and line count), simutrans/font and music listings, simutrans/script count, asset-type census of the whole tree.
Half read: DATA and UI assets (themes, fonts, music, translations, scripts). Code (C++ 419 .cc, 450 .h) was not read beyond licence statements. The paired graphics half (paksets, pak64 or pak128 style) is NOT in the box: README.md line 182 says paksets "have their own license, but no one is included alongside this code".

## Licence (what the files say)
- Code licence: Artistic License version 1.0. README.md line 180: "Simutrans is licensed under the Artistic License version 1.0." LICENSE.txt contains the Artistic License text (from line 36). build_themes.sh line 4: "This file is part of the Simutrans project under the Artistic License."
- Asset scope statement, simutrans/license.txt: line 6 says the source is provided under the artistic license, and lines 10-13 say this "includes" the documentation, images and .dat files in the source distribution, the midi files and the fonts, except m+10r.bdf, which "is taken from the M+ font project" (licence not in the box).
- CONFLICT: simutrans/copyright.txt line 6 says "Simutrans may not be sold or modified in any way without" written permission from the author. That is a stronger condition than the Artistic licence the other file names for the same images, music and fonts. Per the ambiguity rule this is class C for those groups.
- Squirrel scripting library: simutrans/license_squirrel.txt, line 1 "Copyright (c) 2003-2022 Alberto Demichelis", and line 3 begins the standard "Permission is hereby granted, free of charge" text (MIT-style text as written in the file).
- Themes: themes.src/pak192comic/pak192comic.tab line 4: "These are under CC-BY-SA 3.0!" This is the only explicit asset licence in the tree.
- Third-party libraries (simutrans/license.txt lines 17-32): listed with their own licence URLs (libFLAC, libbz2, libfluidsynth, libfreetype, libglib, libpng, libogg, libvorbis, libzstd and others). Not asset content.

## Rights-holder status (repo files only)
"original author plus open-source team": simutrans/license.txt line 2 "(c) 1997-2004 Hj. Malthaner", line 3 "(c) since 2005 The Simutrans Team". copyright.txt line 1 "Simutrans is copyright (C) 1997-2004 by Hj. Malthaner." Theme authors named in the files: prissi (standard.dat header line 3; pak192comic theme.dat line 3 "Author: prissi, modified by Leartin"), FrankP (pak64german sim-symbols.dat line 126 "copyright=FrankP"). Paksets: third party, not in the box.

## Asset inventory (paths under the donor root; counts from find/ls)
1. Paksets (vehicle, building, tile graphics): NOT in this tree. README.md line 182 says they are separate and carry their own licence. Class D for this donor (nothing present for these).
2. Theme source: themes.src (9 entries: aero, flat, highcontrast, highcontrast-large, modern, pak192comic, pak64german, standard, build_themes.sh). PNG window-skin parts (for example standard/button.png, scrollbar.png, listbox.png, divider.png) plus .dat and .tab definitions. pak192comic is CC-BY-SA 3.0 (class B). standard and pak64german: class C (see conflict above; pak64german has only a copyright line).
3. Compiled themes: simutrans/themes (26 entries: .tab definitions and .pak binaries such as classic.pak, flat.pak, highcontrast.pak, modern.pak, menu.pak192comic.pak). The menu.pak192comic.pak name matches the CC-BY-SA source by name only; not verified that it is built from it. Class B by name for that file; C for the rest.
4. Music: simutrans/music, 55 .mid files (titles such as the main theme, B theme, boring afternoon, busy day at the depot, transport chaos, the journey home, stucked convoy, Last trip). Class C (CONFLICT rule).
5. Fonts: simutrans/font (cyr.bdf, Prop-Latin1.bdf, Prop-Latin2.bdf). m+10r.bdf is named in license.txt line 11 but is not in the box. Class C.
6. Translations and UI strings: simutrans/text, 63 entries (one .tab per language, plus language folders such as cn and cs). en.tab has 1687 lines. Translation source named in license.txt line 9: translator.simutrans.com. Class C.
7. Squirrel scripts: simutrans/script, 24 .nut files (ai_base, scenario_base, script_base, tool_base, hm_toolkit_v3, new_scenario_template and others). These are scripts; their own licence is not stated per file. Not classed as art (code).
8. Sound effects: 0 .wav, 0 .ogg and 0 .mp3 files in the whole tree. Sound effects are not in this source tree.
9. Documentation: documentation/ folder (for example about-the-code.txt, coding_styles.txt, simutrans-palette.pal, NeuePalette.png, ReservedColors.png). Palette files named but not opened; the palette is a colour-table asset with its own reserved colours (names only).
10. Other PNG: 137 PNG files in the whole tree, 134 of them under themes.src (skin parts). Not opened individually.

## Classes per group
- Paksets: D (absent from this box).
- pak192comic theme source (and its compiled menu.pak192comic.pak by name): B (CC-BY-SA 3.0; conditions: attribution and share-alike of derived skins, as the file states). Recreate skins from scratch, do not copy.
- Other theme source and compiled themes: C (conflicting statements).
- Music, fonts, documentation images, midi and bdf files: C (license.txt says Artistic; copyright.txt forbids modification and sale without permission).
- Translations: C.
- Scripts: not classed (code).

## Inspiration (own words, category level; no copied text)
- A skin rule in the data: a leading marker on the image name decides whether that panel scales (header comment in standard.dat, line 5). Fixed chrome stays crisp; panels stretch. Useful for our touch UI at 375 wide: decide scaling per element by name, not by hand.
- Each skin ships a "-large" twin with the same names (highcontrast-large, flat-skin-large, classic-large, modern-large, pak64german large folders). Accessibility by a parallel large set, not one layout that breaks. Refs: simutrans/themes/high-contrast-large.tab; themes.src/highcontrast-large.
- A theme is a .tab definition compiled into a .pak binary: data first, the build step ships it (themes.src/build_themes.sh). Clean split between source and shipped asset.
- Per-language font selected by a key in the language table (PROP_FONT_FILE on en.tab lines 2-3 names the bdf font). A language can change its font without code. Ref: simutrans/text/en.tab lines 2-3.
- Music named by mood and role (main theme, B theme, boring afternoon, busy day at the depot, transport chaos). A small set of role cues covers the whole game state. Ref: simutrans/music/01-Simutrans-Main-Theme.mid, 05-Boring-afternoon.mid, 07-Transport-chaos.mid (titles read from file names; content not played).
- Scenarios as small scripts on a shared base (scenario_base.nut, script_base.nut, new_scenario_template.nut), so a mission is a script that extends a base. Ref: simutrans/script/ (names read; content not read).
- Alternate skins over one layout (comic, high contrast, flat, aero): one layout, many looks. Refs: themes.src/pak192comic (look not reused; licence B), simutrans/themes/*.tab.

## Inspiration briefs (recreate as clearly distinct originals; never copy)
Looks of the paksets were NOT read (not in the box). Briefs use the UI and music data only.
1. Big-print panel (label: "Large-type skin"). why: a parallel large set keeps every layout intact when type and touch targets grow. keep: the same element names in a large twin; a per-element scaling marker. change: our own palette and corner ornament; scaling by a touch-size rule, not a fixed x2. Recreate as a distinct original. Ref: /mnt/frankendom-donors/simutrans-simutrans/simutrans/themes/high-contrast-large.tab
2. Comic outline skin (label: "Ink-outline skin"). why: a bold outline makes small panels readable on a phone. keep: heavy outline on panels. change: CC-BY-SA source, so do NOT reuse its art; build our own outline style from scratch with a different accent colour and no speech-bubble shapes. Ref: /mnt/frankendom-donors/simutrans-simutrans/themes.src/pak192comic/pak192comic.tab line 4 (licence B; inspiration only).
3. Congestion cue (label: "Jam sting"). why: an uptempo cue for traffic jams tells the player something is wrong without a text box. keep: one cue per problem state, fast tempo. change: our own cue for a three-attacker pressure state, a metallic tick rather than a brass line. Ref: /mnt/frankendom-donors/simutrans-simutrans/simutrans/music/07-Transport-chaos.mid (title read; content not played).
4. Idle bed (label: "Quiet ground loop"). why: a slow idle loop tells the player nothing is happening and lets the player rest. keep: a slow tempo for idle zones. change: a biome-keyed ambient bed with a crossfade at borders, not a melody. Ref: /mnt/frankendom-donors/simutrans-simutrans/simutrans/music/05-Boring-afternoon.mid (title read; content not played).
5. Scenario on a base (label: "Mission script on a base"). why: missions as small scripts on a shared base class keep the mission logic short. keep: a base script plus per-mission scripts. change: our zone data as JSON, missions as data with an optional hook, no scripting language. Ref: /mnt/frankendom-donors/simutrans-simutrans/simutrans/script/scenario_base.nut (name read; content not read).

## Cross-link
- hud-ui: skin scaling marker and large twin sets (standard.dat line 5; themes/*-large.tab); per-language font selection (en.tab).
- sound-music: role cues by mood (music/*.mid); no sound effects in this tree.
- progression and missions: scenario scripts (script/).
- spawns and encounters: not in this donor's data.
- loot: not in this donor's data.

## Not read
- Paksets: absent from this tree.
- The 55 .mid files: titles only, content not played.
- The .bdf fonts: names only.
- The .png skin parts and the compiled .pak files: names only.
- The 24 .nut scripts: names only.
- en.tab beyond the first lines and the line count; the other 62 language entries.
- The documentation folder.
- C++ code (licence statement read only); the m+10r.bdf font (not in the box).
