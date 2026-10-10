# NetHack-NetHack (asset audit, AU036)

Donor: /mnt/frankendom-donors/NetHack-NetHack (VPS, read-only). Half read: the game data and art half (dat/, win/share/, sound/wav/) plus the licence files. The engine half (src/, include/, sys/, util/) was not read beyond the file names; the file list was taken, nothing inside was opened.

## Licence (what the files say)
- Code: NetHack General Public License. Source: dat/license:1 "NETHACK GENERAL PUBLIC LICENSE". Its paragraph 2b (dat/license:55) requires that a distributed derivative be "licensed at no charge to all third parties on terms identical" to the licence. Paragraph 3b (dat/license:75) allows the source-pointer route only for "noncommercial distribution". The licence's own summary (dat/license:90) says a modified copy must "remain freely available".
- Copyright lines: dat/data.base:3 "Copyright (c) 1994, 1995, 1996 by the NetHack Development Team"; dat/license:2 (header) "Copyright 1989 M. Stephenson". Per-file: dat/minefill.lua:2 "Copyright (c) 1989-95 by Jean-Christophe Collet".
- Art (tiles): win/share/tile.doc:6 says "The original tiles were provided by Warwick Allison." Per-tile credits: 26 lines across monsters.txt, objects.txt and other.txt name "Kestrel Gregorich-Trevor" (e.g. win/share/monsters.txt:53). No separate licence line exists in win/share/*.txt. The only licence file is dat/license, so whether it covers the tile art is not stated.
- Sound clips (sound/wav/attributions.txt): 14 clips with a stated licence line, 9 with CC0 (attributions.txt:9 "http://creativecommons.org/publicdomain/zero/1.0/") and 5 with CC-BY 4.0 (attributions.txt:21 "https://creativecommons.org/licenses/by/4.0/"). The CC-BY ones require attribution.
- Old instrument samples (sound/wav/*.uu, the "sound_*" files): sound/wav/README:36-37 says they "came from Rolands S-750 sample library" and "should be no copyright on them". No licence file covers them.

Rights-holder status (from files only): community open-source project. Copyright lines name the NetHack Development Team and individuals. Not a commercial game. Original game data is in the repo, so this is not a proprietary donor.

## Asset inventory
| Group | Path | Count / size | Licence | Class |
|---|---|---|---|---|
| Monster tiles, 16x16 pixel art as text with a palette header | win/share/monsters.txt | 789 "# tile" entries, 271 KB | not stated per file (NGPL file is the only licence) | C |
| Object tiles | win/share/objects.txt | 483 entries, 166 KB | not stated per file | C |
| Dungeon/other tiles | win/share/other.txt | 243 entries, 83 KB | not stated per file | C |
| Decal overlays | win/share/decals.txt | 3 entries | not stated per file | C |
| Palette and tile-format note | win/share/tile.doc | 6 KB text | n/a | n/a |
| Splash image (XPM) | win/share/nhsplash.xpm | 196x111, 256 colours (nhsplash.xpm:4) | not stated | C |
| Icons and app art (binary/uuencoded, not read) | win/share/nhicns.uu, sys/windows/vs/Images/*.png (52 PNG files, counted) | not read | not stated | C |
| Sound clips, modern (CC0/CC-BY) | sound/wav/se_squeak_*.uu, sa2_xplevelup, sa2_xpleveldown (see attributions.txt) | 14 attributed clips | CC0 (9) and CC-BY 4.0 (5), per attributions.txt | A (with attribution for CC-BY) |
| Sound clips, old instrument set | sound/wav/sound_*.uu (Magic_Harp, Bugle, Magic_Flute, others) | 47 files (one per instrument per note, e.g. sound_Magic_Harp_C.uu) | README says "no copyright" but no licence file | C |
| Level maps and fills (Lua) | dat/*.lua | 131 files (castle, medusa, knox, mines fill, quest levels) | NGPL (code file) | C |
| Quest dialogue | dat/quest.lua | 132 KB | NGPL | C (text; not reproduced) |
| Flavour text | dat/rumors.tru (390 lines), dat/rumors.fal (397), dat/epitaph.txt (401), dat/oracles.txt (105), dat/bogusmon.txt (562) | text | NGPL | C (not reproduced) |
| Help and tutorial text | dat/help, dat/cmdhelp, dat/opthelp, dat/history, dat/tribute (383 KB, not read) | text | NGPL | C |
| Monster/object data table | dat/data.base (291 KB) | text lookup table, header at data.base:1-5 | NGPL | C |

Not read: win/share/nhicns.uu, sys/windows/vs/Images/*.png, sound/wav/*.uu (contents), dat/tribute, dat/quest.lua (contents), dat/data.base (beyond its header). No binary file was opened beyond its header.

## Data first (names and looks)
- Monster and object looks live in the tile text tables win/share/monsters.txt (789 tiles), win/share/objects.txt (483) and win/share/other.txt (243). Each tile is a 16-row character grid with a palette header (lines above monsters.txt:33) and a "# tile N (name)" label (monsters.txt:33).
- Monster and object names and stats are in the data table dat/data.base (header at data.base:1-5), not in the tile files.

## Verdict per group
- Tiles (monsters, objects, other, decals): class C. The licence is not stated per file, and the only licence file (NGPL) has share-alike-style terms (dat/license:55). Use inspiration only, recreate from scratch.
- Sounds, CC0 and CC-BY clips: class A. Usable with the attribution the file gives. Frankendom would need to keep attributions.txt entries for the CC-BY clips.
- Old instrument samples: class C, unclear.
- Level and text content: class C (code-licence NGPL, copyleft-like terms). Inspiration at category level only.
- Nothing in this donor is class D; the level and text content are usable as ideas.

## Inspiration (own words)
- The tiles are 16x16 pixel art written as text grids over a small palette. Dark outlines and a readable silhouette carry each creature. A creature's read at 16 pixels is the test (win/share/monsters.txt:33).
- Sex/size variants are one silhouette with a size and body-shape change, not a new design (monsters.txt:53-54 comment). Cheap variety for us.
- A generic "strange object" tile (objects.txt:33) is a fallback so unknown loot never renders blank.
- Decals are small overlays merged on top of a base tile at draw time (decals.txt:2). Good for status rings and rim states on a sprite.
- The creak-tuned sound family (se_squeak_*): short found-sound clips, each pitched to a note so a few clips make a tune. Cheap cue and ambient palette.
- Mines fill: one generator call with smoothing, joining and walls (dat/minefill.lua:17), then a spawn list (minefill.lua:37-40). A zone-as-data pattern.
- Flavour text lives in plain text tables (rumours, epitaphs, oracles) drawn at random. A cheap flavour system for hub or loot messages.

## Briefs
Recreate each as a clearly distinct original. Never a copy. Keep the trait named, change the trait named.
1. Segmented crawler (ours). Why: low wide silhouette with a segmented body reads at tile size. Keep: wide low silhouette, dark keyline on every tile, two-tone body. Change: cool blue-grey chitin palette, a crested head, a glowing seam instead of a plain abdomen. Ref: win/share/monsters.txt:33.
2. Fallback loot tile (ours). Why: unknown loot never renders blank. Keep: a generic fallback family under specific items. Change: a sack with a rarity-coloured rim instead of a blank sheet. Ref: win/share/objects.txt:33.
3. Status rim overlay (ours). Why: state drawn over a base sprite, not a separate sprite. Keep: overlay-on-base composition. Change: a ring or rim, not a pictogram. Ref: win/share/decals.txt:2.
4. Tuned creak cue (ours). Why: short found-sound clips pitched to notes make a tune from few files. Keep: pitch-tuned clip family for cues. Change: our own recorded or synthesised material, not these clips. Ref: sound/wav/attributions.txt:5 (se_squeak_C).
5. Mines-style cave fill (ours). Why: one call that smooths, joins and walls a cave. Keep: smoothing plus joined regions plus walls from one call. Change: our zone spawn table, different wall and ore look. Ref: dat/minefill.lua:17.

## Cross-link to our cells
- camera: no camera assets here.
- zones: dat/minefill.lua and dat/*.lua level maps (see brief 5).
- spawns: dat/minefill.lua:37-40 spawn list.
- loot: objects.txt tile family (brief 2).
- hud-ui: decals.txt (brief 3).
- vfx: decals are the closest; no effect sprites were read.
- sound: sound/wav clips (brief 4).
- animation: no frame sets read; tile files are single frames.
