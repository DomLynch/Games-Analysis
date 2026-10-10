# lincity-ng-lincity-ng (asset audit, cell AU031)

Donor: /mnt/frankendom-donors/lincity-ng-lincity-ng (VPS, read-only). C++ city builder (LinCity-NG) with a large data pack.
Code licence: GPL-2.0 (COPYING.txt line 1; README.md lines 133-134).
Asset licence: data is dual-licensed. COPYING-data.txt lines 1-2 name the models, svg files, images, sound and music files and the xml data files as "dual licensed under under the GPL and CC-by-sa-v2" (the file's wording, typos included). The CC BY-SA 2.0 text is in the same file (line 351). The font (data/fonts/sans.ttf) has its own licence (COPYING-fonts.txt line 1). Locale, help, opening maps are not named.
Rights holder status: open-source continuation. README.md line 130 says "Copyright (C) 1995-2026 LinCity-NG contributors". data/gui/creditslist.xml credits the original idea and code to Ian J. Peters (1995-1997) and lists later contributors. No leak or decompile statement.
Best class: B (dual GPL / CC BY-SA 2.0 for the art, sound, music and xml). C for the unclear groups (locale, help, opening maps, font terms).

Checked: COPYING.txt, COPYING-data.txt, COPYING-fonts.txt, COPYING-dll.txt (heads), README.md (licence section), data/ tree (counts), images.xml and sounds.xml (heads and counts), default.xml (full), creditslist.xml (head), render.py and render.sh (heads), PNG headers (24 bytes read with od), src/lincity-ng/Sound.cpp (music loading and playback, lines 190-235 and 395-469). Confidence high on the licence text and the music code. Medium on counts.

## Halves read
- Data pack: music theme XML, tile and sound registration XML (heads and counts), render pipeline scripts, credits XML.
- Code: src/lincity-ng/Sound.cpp (music theme and track playback).
- Simulation: src/lincity/ listed by file names only. Not read.
- Matching half: none needed; the simulation (src/lincity), client (src/lincity-ng) and data are all in the box.

## Asset groups
1. Models and render pipeline: data/models/ (156 files, about 115 MB; 60 .blend, pngs, 42 jpg textures in models/textures/, render scripts). Class B. .blend files binary, not opened.
2. Tile sprites: data/images/tiles/ (348 entries; images.xml has 382 image lines). Class B. Two PNG headers read: blacksmith0.png 262 x 193, green.png 128 x 70.
3. GUI and menu art and layout: data/images/gui/, data/images/mainmenu/, data/gui/ (27 xml). Class B.
4. Sound effects: data/sounds/ (138 wav; sounds.xml has 141 sound lines including commented ones). Class B.
5. Music: data/music/default/ (3 ogg tracks plus default.xml with tech-level bands). Class B.
6. Locale: data/locale/ (18 .po; de.po has 413 msgid entries). Not named. Class C.
7. Help and help templates: data/help/ (1006 files, about 4.2 MB, per-language folders) and data/help_templates/ (164). Not named. Class C.
8. Opening maps and bitmap font: data/opening/ (22 files; scn.gz maps and a .fnt/.raw font). Not named. Class C.
9. Font: data/fonts/sans.ttf (DejaVu Sans with Bitstream Vera licence text). Terms not read. Class C.

## Inspiration (own words)
- Pre-rendered tiles from 3D: one .blend per building, a script renders it through an orthographic camera at a fixed tilt and rotation, and a shell loop writes tiles (data/models/render/render.py line 20; render.sh line 6). Keep one source per building and one render setup; change to our rig, tilt and palette.
- Anchored tall sprites: tile sizes vary and each image has an anchor in images.xml (green.png at x 64, y 70). Keep anchors so tall props sit on the grid.
- Music by progression band: each track has a lowest and highest band; a track out of band hands over to the next (default.xml line 7; Sound.cpp lines 442-454). Keep the bands as data; change the driver to fight tier or zone danger.
- Numbered sound variants: several files per event (Blacksmith1-3, Farm1-3, Health1-5, Fire1-3). Keep 3-5 variants per hit; use pitch and timbre changes of our own.
- Hazard as one model plus three sounds: fire has a model (fire.blend) and Fire1-3 sounds. Keep the pattern; change the look to an arena fire pit.
- Load rules by kind: images attach to the latest resource ID in a group, sounds to all earlier IDs (images.xml line 3; sounds.xml line 3). A loader detail; keep a clear rule per kind.

## Defects noted (keep the idea, fix the defect)
- Sound.cpp lines 222-223: highest-tech-level 0 is a sentinel for no limit, so a real top band of 0 cannot be written. Fix: explicit flag or a value that cannot be real.
- Sound.cpp lines 447-454 with changeTrack (lines 395-420): playMusic and changeTrack call each other when no track matches the band. Read from the code, not run. The default theme has a catch-all first track, so it is not hit there. Fix: stop after one full pass and keep the last good track or silence.

## Briefs (3)
Dom's rule: recreate as a clearly distinct original, never a copy. Kept and changed traits are named.
1. Workshop prop, wide base and tall roof (ref data/images/tiles/blacksmith0.png). Keep: wide base, tall silhouette, base anchor. Change: our own roof, materials and palette.
2. Hazard fire pit with three sound variants (ref data/models/fire.blend, binary; data/sounds/Fire1.wav to Fire3.wav). Keep: one model, three variants, loop while active. Change: our flame shape and our hum.
3. Tiered music by fight intensity (ref data/music/default/default.xml line 7; Sound.cpp lines 442-454). Keep: bands per track, next track by band. Change: band driver is fight tier or zone danger; tracks are ours.

## Cross-link
- HUD: data/gui minimap.xml, minimapswitchbuttons.xml, speedpanel.xml, buttonpanel.xml are layout data (names only).
- Sound: variants, music bands, hazard sounds above.
- Spawns and loot: building and resource data are in the simulation half, not read.
- Death and respawn, boss staging: none in the assets.

## Not verified / not read
- .blend and map files (binary); PNG and JPG content beyond header sizes of three tiles.
- All audio content; locale and help text (counts only).
- Font licence terms beyond COPYING-fonts.txt line 1.
- src/lincity/ source; src/lincity-ng/ beyond Sound.cpp; data/gui xml beyond creditslist.xml.
