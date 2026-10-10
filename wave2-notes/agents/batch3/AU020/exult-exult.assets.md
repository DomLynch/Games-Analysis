# Asset audit: exult-exult (AU020)

Donor tree: /mnt/frankendom-donors/exult-exult (read-only, VPS, about 1,950 files).

## Licence (what the files say)
- Code: GNU GPL v2. COPYING is the GPL v2 text, and README.md's badge reads "[![License: GPL v2][gpl-badge]][gpl-url]" (receipt 3).
- Game data: README.md says a user must own the games: "You need to own "Ultima VII: The Black Gate"" (receipt 4), and names Ultima VII as "(copyright 1993)" (receipt 5). The repo does not ship the original game data. A filename search for the original DOS data names (MAINSHP, STATIC, U7CHUNKS, and uppercase .FLX/.DAT) found none.
- Shipped data/ and content/ files: no single licence. Per-folder notes only:
  - data/README: sound effects "contributed by Joseph Morris" (receipt 7). No terms.
  - data/credits.txt: MIDI tracks used with the author's permission (receipt 8); digital SFX packs credited (receipt 9). No terms.
  - docs/art.txt: custom paperdoll art, with artists per item (receipts 10 and 11). No terms.
  - content/sifixes/Readme.txt: SI Fixes "is now licensed under the GNU General Public License" (receipt 12). This is the patch's licence, not a statement for its art.
  - content/README: the folder is "for publicly available subplot patches" (receipt 13).
- Overall asset licence: unclear, so class C.

## Rights-holder status
Fan engine project (Exult Team, per AUTHORS and data/credits.txt). It needs Ultima VII, which the repo names but does not ship. Shipped replacement art and audio have credited authors but no licence text. Mixed status.

## Asset inventory (counts from ls and find; sizes not measured)
- Replacement UI and font shapes: data/fonts/ (serif, small black, tiny black and white, wood-runic, metal-runic, gold-runic, and SI-only ophidian sets; data/fonts/Readme.txt says these replace shapes in the original files, receipt 14). Plus data/*.shp such as hp_bar.shp, checkmark_background.shp, sb_backpack.shp, sb_food.shp. About 484 .shp across data/ and content/.
- Custom item and paperdoll art: data/bg/*.shp (for example caddellite_helmet.shp, firesword.shp, death_scythe.shp) and docs/art.txt, which lists shape numbers and artists per item and NPC.
- Sound: 24 .wav files (data/bg/intro_*.wav, others). File names suggest intro clips: static bursts, a monitor slap, a shot, a moongate sound, guardian sounds. Not listened to.
- Music: 3 MIDI files (data/marketpl.mid, data/meditown.mid, data/mtgm.mid).
- Game-data containers and tables: data/ has 118 .shp, 7 .flc, 6 .vga, 5 .dat, 4 .flx; content/ has 366 .shp, 32 .dat, 12 .pal, 212 .uc (usecode). Whether each file is original game data or Exult-made is not stated in the repo.
- Text: 27 .txt in data/ (UI strings in several languages, quotes.txt, credits.txt), 22 .txt in content/.
- Images: docs/images (24 png, 2 gif, 1 svg), ios/Media.xcassets (3 png).

## Class by group
- Replacement UI and fonts: C (no licence, authorship per file not stated).
- Custom item and paperdoll art: C (credited artists, no terms).
- Sound effects: C (one contributor, no terms).
- MIDI music: C (permission only, no terms).
- Data containers and tables: C (origin not stated).
- Text: C.
- content/ patches: C (mixed, README only).
- Docs images and app icons: C.
- Best class for the donor: C. Nothing is class A or B, and the engine itself is GPL v2 code.

## Inspiration (own words)
- Material font family: one glyph set in several treatments (wood, metal, gold, and a serpent-themed variant). For our HUD titles, use one set of our own letterforms and three palettes, each with a dark rim and one bright top-edge highlight. Fonts: data/fonts/1_wood_runic.shp, 3_metal_runic.shp, 6_gold_runic.shp, 10_gold_ophidian.shp (receipt 15 cites the last).
- Paperdoll layering: equipped items are separate shape layers that follow body frames, so an item swaps without redrawing the character. For our armour, one layer per slot with anchor points, and each item keeps its palette.
- Status-bar icon band: one small pictogram per function on a fixed grid (for example data/sb_backpack.shp, data/sb_food.shp, data/hp_bar.shp). For our HUD, one icon grammar and one pixel grid.
- Retro intro texture: short static bursts and a monitor sound over quiet gaps (per names only). Recreate with our own noise bursts, a low hum and stings.
- Small UI pieces: checkmark background, slider, scrollbar and hp bar as separate small shapes. For our menus, one shared kit at fixed sizes, not one large image per screen.
- Localisation as keyed text: one text file per language with keys, plus a quotes file. Copy the structure, not the strings.

## Briefs
1. Engraved title font set. Why: one glyph set in three material looks reads as a carved title. Keep: one glyph set re-coloured per material; material-named titles; a serif and a plain sans pair. Change: our own letterforms; faction palettes; a wear pattern. Ref: data/fonts/Readme.txt and the runic shp files (not viewed).
2. Slot-layered armour. Why: each item is a layer keyed to the body frame. Keep: one layer per slot with anchor frames; per-item palette; frame-indexed facing. Change: our own proportions; our own slot names and order; a clear silhouette per tier. Ref: docs/art.txt; data/bg/caddellite_helmet.shp (not viewed).
3. Broken-monitor intro sound. Why: static bursts over silence read as a broken screen. Keep: short noise bursts over a hum; single stings in gaps; one hard hit to close a beat. Change: original sound design; a different theme; our own mix. Ref: data/bg/intro_sb_static1.wav and data/bg/intro_mt_static1.wav (names only, not listened to).
4. Pictogram status band. Why: one icon per function on one grid reads at a glance. Keep: one icon per function; a fixed small grid; simple pictograms. Change: our own pictogram language; larger icons for key stats; our own function list. Ref: data/sb_backpack.shp; data/sb_food.shp; data/hp_bar.shp (not viewed).

## Cross-link to our cell topics
- hud-ui: data/ UI shapes and fonts (strongest link). Copy the piece-kit and material-font ideas.
- sound: data/ intro and SFX .wav files. Licence-unclear; inspiration only.
- loot and camera: data/bg item shapes and the paperdoll art (not viewed).
- spawns, zones, vfx, animation: no assets in this donor beyond the item and UI shapes. Animation frame data is in the .shp files (not read).

## Not read
- Binary contents of .shp, .flx, .dat, .vga, .wav and .mid (names, counts and sizes only; no palettes, frames or audio read).
- docs/images, ios/Media.xcassets images.
- data/credits.txt beyond the lines cited.
- content/*/ subfolders beyond the README lines cited.
- src/, tools/ and other code trees (not assets).
