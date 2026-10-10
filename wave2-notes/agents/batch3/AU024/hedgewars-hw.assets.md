# hedgewars-hw (Hedgewars): asset audit (AU024)

Donor path (VPS, read-only): /mnt/frankendom-donors/hedgewars-hw/

**Half read:** data pack (share/hedgewars/Data/). Matching halves in the box, not read beyond names: engine (hedgewars/*.pas, Pascal) and server (gameServer/*.hs, Haskell), plus frontends (QTfrontend, qmlfrontend, frontend-qt6).

## Licences (what the files say)
- Code: COPYING line 1 "GNU GENERAL PUBLIC LICENSE", version 2. README line 136: "distributed under the terms of the GNU General Public Licence version 2".
- Images and sounds: README line 137: "images and sounds are distributed under the terms of the GNU Free Documentation" (version 1.2 per the same paragraph).
- Theme READMEs: Themes/Cave/README line 3 and Themes/Olympics/README line 3: "Distributed under the terms of the GNU FDL licence." (no version given).
- CREDITS line 7: "IF NO LICENSE IS SPECIFIED, THE LICENSE IS THE SAME AS MENTIONED IN README.md." CREDITS line 6: "IF NOT OTHERWISE SPECIFIED, ALL OTHER CONTENT IS PROPERTY OF Andrey Korotaev".
- CREDITS "LICENSE REFERENCES" (line 126-127): CC-BY 3.0 and CC-0 links. FRONTEND IMAGES (line 69): "Tango Project and Wuzzy -> audio, home (CC0)" and similar CC0 lines.
- Fonts: Fonts_LICENSE.txt line 1 (DejaVu: Bitstream Vera licence, changes in public domain) and line 2 (Droid: Apache licence).
- Music: Music/credits.txt gives an author per track; no licence per track in those files. CREDITS cites CC-BY 3.0 in general.
- Sound effects: CREDITS SOUND EFFECTS section cites freesound.org pages (for example line 82). Per-file licence is not stated in what I read.
- Locale files: Locale/*.ts contain the string "GNU GPL v2" as translatable text (hedgewars_de.ts line 28), not a licence statement for the file.

## Rights-holder status
Open source. README line 140: "Copyright 2004-2018 Andrey Korotaev <...> and others." Individual asset authors are credited in CREDITS (hats, graves, frontend images, sound effects) and in each theme's credits.txt. The files describe the content as original work by named authors; no leak or proprietary-data source is named.

## Asset inventory (find counts)
- Graphics/Hats: 340 files (PNG). Example: Graphics/Hats/AkuAku.png (64 x 512 px from PNG header).
- Graphics/Flags: 294 PNG (example: afghanistan.png 22 x 15 px).
- Graphics/Hedgehog: 75 files (weapon and ammo icons, amBazooka.png 64 x 64 px).
- Graphics/Graves: 47 PNG (example: Badger.png 32 x 256 px).
- Graphics/Missions: 84; Graphics/AmmoMenu: 9; Graphics/SuddenDeath: 6.
- Themes: 35 entries, 34 with theme.cfg, 949 files in total (sky and water colours, border, music, cloud count, object placement lists, sudden-death variants of art, animated splash sheets such as Themes/Hell/Splash.png 160 x 500 and Splash.sifz).
- Maps: 337 files, 52 map.png (example Maps/Bamboo/map.png 2048 x 1024), each with map.cfg, preview PNGs and credits.txt.
- Forts: 90 files (icon and preview PNG). Tiles: 28. misc: 8. Fonts: 3 (DejaVu, Droid).
- Sounds: 1003 files (ogg). Music: 29 files (ogg and opus; one credits.txt).
- Names: 124 files (hedgehog and team name lists as .txt, with .cfg files that link a hat to a name list; Names/README.md describes the format).
- Locale: 119 translation .ts files. Scripts: 61 (Lua, incl. Scripts/Multiplayer). Missions: 88 (Campaign 47). Shaders: 5.
- Compressed sprite definitions (.sifz): 13 files. Not opened.

## Classes per group
- Graphics/Hedgehog, Graves, Hats, Flags, Missions, AmmoMenu, SuddenDeath: B (README FDL 1.2 as the default for images; per-author credits in CREDITS).
- Frontend images listed as CC0 in CREDITS (lines 66-72): A (CC0 per CREDITS line 69). File paths not checked.
- Themes and Maps: B (theme READMEs say GNU FDL; map and theme art follows the README default).
- Fonts: A (DejaVu/Bitstream Vera notice; Droid under Apache). Keep the notice.
- Music: C for per-track licence (author per track, licence not stated per track in the files read; CREDITS cites CC-BY 3.0 generally).
- Sound effects: C until per-file licences are checked (freesound.org pages are cited, licence not in the files read).
- Lua scripts and missions: B (GPL v2 as code).
- Names lists: C (no licence stated for the name files).
- Locale .ts: C (no licence stated for translation files).
- Overall best_class: B, with CC0 and CC-BY-labelled items as A.

## Data first
- Themes: Themes/*/theme.cfg (tables of colours, object positions and music names). Maps: Maps/*/map.cfg and map.png. Names: Names/*.cfg and *.txt. Scripts: Scripts/Multiplayer/*.hwp (mode definitions, not opened).

## Inspiration (own words; this donor is B, so detail can be higher than a C donor)
- Sudden death as a palette swap: theme.cfg has separate sd-* keys for water, music and the sudden-death art (Themes/Hell/theme.cfg lines 4-10; Themes/Hell/SDWater.svg, SDClouds.svg, SDDroplet.png). When the timer runs out the whole zone reskins. Keep the phase swap; use our own hue and sound cue.
- Theme as a data folder: a theme is one folder with a config file (sky, border, water top and bottom, opacity, music, cloud count, placed plants). Keep the data-driven zone skin; change our palette and object list.
- Splash as a tall sheet: Themes/Hell/Splash.png (160 x 500) gives impact frames in one strip. Keep the tall narrow strip; change the shape and colour.
- Hat overlays on a 64-pixel grid: Graphics/Hats/AkuAku.png (64 x 512) stacks head-gear frames in one strip. Keep one overlay per head slot on a fixed grid; change the silhouettes and ornament.
- Grave markers as tall narrow strips: Graphics/Graves/Badger.png (32 x 256). A fallen unit keeps a marker in the world. Keep the narrow tall marker; change the design.
- Scripted modes over a normal map: Scripts/Multiplayer/Racer.hwp, Construction_Mode.hwp and Continental_supplies.hwp. A mode is a script that changes the objectives on the same map. Keep the idea; write our own objectives and rewards.
- Themed name lists per costume: Names/README.md describes a hat config that picks a name list, then a name within it. Keep the per-costume name pools; write our own.

## Briefs (recreate as clearly distinct originals, never a copy)
See the briefs array in the JSON. Five briefs: sudden-death palette swap, fallen-unit marker strip, head overlay strip, scripted mode trio, tall splash sheet.

## Cross-link to our cell topics
- zones: Themes/*/theme.cfg and Maps/*/map.cfg.
- hud-ui: Graphics/AmmoMenu (9 files), Fonts (3).
- vfx: Graphics/SuddenDeath, Themes/*/Splash.sifz, BulletHit.sifz, BigExplosion.png (in Graphics).
- animation: sprite strips (Hats, Graves, Hedgehog) and .sifz sprite definitions.
- sound: Sounds (1003 ogg), Music (29 tracks, per-track credits).
- loot, spawns, camera: no direct asset; Missions and Scripts hold the rules.
