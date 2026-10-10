# OpenDiablo2-OpenDiablo2 (asset audit, AU038)

Donor: /mnt/frankendom-donors/OpenDiablo2-OpenDiablo2 (VPS, read-only)
Class: C overall. The repo ships no game art or audio. It is an engine that needs the user's own copy of a commercial game.

## Licences (as the files say)
- Code: GNU GPL v3 (LICENSE:2; README.md:14 badge 'License: GPL v3').
- Assets: no asset licence. README.md:29 says the project does not ship the assets or content needed to play Diablo 2, and the user must own a copy.

## Which half was read
- Single client engine (Go). d2core, d2common read in part; d2game in part.
- Data pack: the user's MPQ, not in the box. The loader names the tables (d2common/d2resource/resource_paths.go:318 skills.txt; :451 monstats.txt; :452 monstats2.txt).
- Server half: none in this repo. README.md names the successor repo AbyssEngine, which is not in the box. No paired donor here.

## Asset inventory
- Game art, sound, music, fonts from the game: absent (user supplies).
- In the box: 2 large binary test fixtures AnimData.d2 and BadData.d2 (570 KB each, in d2animdata/testdata; origin not stated; first 48 bytes dumped only), 1 tiny D.mpq test (891 bytes), 6 small test txt, 1 stray rh.exe (5.4 MB Windows binary at root; not read, not run; purpose not stated).
- Images: 3 logo and discord images at root; about 20 docs screenshots and one gif (show the commercial game's screens); docs/diablo.woff (18 KB font, no licence line).
- Code that reads the proprietary formats: d2fileformats (DC6, DT1, DS1, DCC, PL2, COF, animdata, txt, tbl, font, MPQ). The README credits the DT1 format spec to Paul SIRAMY (README.md:79).

## Rights-holder status
Uses original game data. The user supplies the commercial game; the repo ships none of it. Logo credited to Jose Pardilla (README.md:78).

## Inspiration (own words)
- Edge-placed hub with a generated field outward from it (act1_overworld.go:53-79).
- Preset map piece placed like a stamp by position (d2mapstamp/stamp.go:20).
- Free-space check: no floor tile on the area, inside bounds (map_generator.go:47-57; floors only in the lines read).
- Layered gear over one directional body, composed per frame (dcc_direction_frame.go:57-70). Maps to parity row 15.
- Item stat rules as small text expressions with ternary and unary operators (d2calculation/d2parser/operations.go:48).

## Briefs (recreate as clearly distinct originals, never copies)
1. Edge-hub field: keep the hub on one edge and the field outward from it; change to a cliff ledge or sky island, a spiral field, and fog for the border. Ref act1_overworld.go:53-79.
2. Gear-layer hero: keep body and gear as layers composed per frame and a 64-facing lookup; change to a fixed layer stack per slot tuned for the 375 px camera. Ref dcc_direction_frame.go:57-70.
3. Formula item: keep a small expression per item; change to our catalogue's stat names, shown as a plain line. Ref operations.go:48.

## Cross-link
- Row 15 (gear dressing): layered composition per frame.
- Row 23 (zone population): preset placement and free-space check for spawn points.
- Hud-ui, sound, vfx: code exists (d2render, d2audio, d2gui) but was not read; no assets in box.

## Not verified
All game data tables (absent). AnimData.d2 and BadData.d2 were not parsed. rh.exe not read. Images and the font not opened. Map wilderness tile types and lexer and parser bodies not read.
