# edubart-otclient: asset audit (AU017)

Donor root: /mnt/frankendom-donors/edubart-otclient/ (VPS, read-only)

## Licences (as the files say)
- Code: MIT. LICENSE line 1 'OTClient is made available under the MIT License'; the copyright line names OTClient (2010-2020). README.md line 83 repeats it.
- Assets: no separate asset licence file. The only statement is the repo-wide MIT notice. Font names (verdana-*, terminus-*) carry no statement. startup.ogg carries metadata 'Attribution 3.0' with a jamendo URL and an artist name.
- Tibia sprite and data (spr/dat) are not in the repo. README line 20 says the user downloads them into data/things/VERSION/.

## Rights-holder status
- Game art: unknown. The files do not name the owner of the Tibia data. No fan, clean-room or leak statement in the files read.
- Code: copyright holder is named as the OTClient contributors (LICENSE).

## Halves
- Read: the client half (data/ assets, data/styles, data/fonts, data/particles, data/cursors, data/locales file list and sizes; modules/ and init.lua by name).
- Server half: the box has a folder named otland-forgottenserver. README line 12 names the forgottenserver as the server to build. That folder was not read.
- Other client forks in the box (not read): opentibiabr-otclient, mattyx14-TheForgottenTibiaClient, OTCv8-otclientv8.
- Data pack (spr/dat): not in repo, so the pack half is not read.

## Data tables (data first)
- data/locales/*.lua: six UI string tables (de, en, es, pl, pt, sv). Read by size only.
- data/styles/*.otui: 25 style tables, the skin of every window and widget. Read partly (10-windows.otui).
- data/particles/particles.otps: effect table (read).
- data/fonts/*.otfont: six bitmap-font metric tables (one read: verdana-11px-rounded).
- data/cursors/cursors.otml: cursor table (read).
- No CSV, SQL or XML tables found in the repo.

## Asset inventory
- UI PNGs under data/images/: about 207 PNG in data/ in total. Sizes read: ui/arrow_horizontal.png 24x63; game/minimap/cross.png 16x16; ui/window.png 18,088 bytes.
- Status icons (17 in data/images/game/states/), creature-type icons (2), spell sheets (2), minimap flags (13 flags plus cross), flag PNGs for locales (6).
- Fonts: 6 .otfont plus 9 PNG glyph atlases.
- Sound: data/sounds/startup.ogg, 1,657,437 bytes, Ogg Vorbis.
- Particles: particle.png 1,503 B.
- Cursors: 4 PNG of 198-266 bytes.
- No 3D models, no maps, no quest or item text.

## Cross-link to our cell topics
- hud-ui: the 9-slice window and style files are the main reference.
- vfx: the cooldown particle definition.
- sound: startup.ogg is only a start-up track; no in-game sound set in the repo.
- zones, spawns, loot, camera, animation: no assets in the repo. Modules (game_minimap, game_things, game_battle) are the code side and were not read.

## Inspiration (own words)
- Thick-topped 9-slice panel: title rail 27 px against 6 px sides. data/styles/10-windows.otui; data/images/ui/window.png.
- Radial particle burst with an inward pull and a clear-to-orange ramp. data/particles/particles.otps.
- Row of about seventeen state icons. data/images/game/states/.
- Own and other summon icon pair. data/images/game/creaturetype/.
- Bitmap font in a fixed 16 px cell with tight spacing, with a separate metrics file. data/fonts/verdana-11px-rounded.otfont.
- Cursor set with a named hot-spot per use. data/cursors/cursors.otml.
- Minimap marker family (flags) on a 16 px grid. data/images/game/minimap/.

## Briefs
See edubart-otclient.assets.json, key "briefs" (4 briefs). Each names the trait kept and changed.

## Not read
See the not_read list in the JSON.

## Binary metadata note
- Font and Ogg metadata lines were read with grep -a on binary files. They are not in receipts.tsv because the verifier cannot decode binary lines.
