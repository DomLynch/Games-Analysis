# ASSET AUDIT: gemrb-gemrb (AU022)

Donor root: /mnt/frankendom-donors/gemrb-gemrb/ (VPS, read-only). Receipts: receipts.tsv.

## Summary
- Code licence: GPL-2.0-or-later (COPYING:2 GPL v2 text; REUSE.toml:22). Grep counts 308 GPL-2.0-or-later SPDX headers in gemrb/core.
- Asset licence: mixed by path. Engine art, data tables and artwork are GPL-2.0-or-later (REUSE.toml:9, :17, :22). demo/** is CC-BY-SA-4.0 by wildcard (REUSE.toml:39-41), with per-file overrides under CC0-1.0, CC-BY-3.0, CC-BY-4.0, CC-BY-SA-3.0 and OFL-1.1-RFN. Demo music is in conflict (see below).
- Rights status (from files): community reimplementation of the Infinity Engine (README.md:12). Original game data is not in the donor and must be installed by the user (README.md:17, :20). Demo credits are per file in REUSE.toml and an OpenGameArt collection (demo/README.md:49).
- Best class: A for the CC0 and CC-BY subset (usable with the attribution the files name). Overall the donor is B (share-alike wildcard and GPL data), with C for the music and the two binary demo files.

## Which half was read
- Engine half (gemrb/core C++, GUIScripts Python): listed and counted; no file opened beyond the SPDX grep.
- Data-pack half (demo/ plus gemrb/unhardcoded and gemrb/override): the licence map (REUSE.toml) read in full; the demo/README.md read; a few data files read by first lines (classes.2da, action.ids).
- Original game data: not in the donor folder. Top-level and gemrb/ listings show none. The README says the user must install it (README.md:17, :20).

## Licence map (what the files say)
| Path | Licence | Source line | Class |
|---|---|---|---|
| gemrb/unhardcoded/**, gemrb/override/**, artwork/** | GPL-2.0-or-later | REUSE.toml:9, :17, :22 | B |
| demo/** (wildcard) | CC-BY-SA-4.0 | REUSE.toml:39-41 | B |
| demo/override/ar0100.png, loading.bam, swirl.bam, winopen/winclose.ogg, btnpress.ogg, MOS2000.PVRZ | CC0-1.0 | REUSE.toml:52-54, :108-110, :143-150, :157-160 | A |
| demo/override/ston**.png, stonbag.png, stonquiv.png, worldmap.png, backpack.bam, fs_dirt**.ogg, spell_02.ogg, portr1**.png | CC-BY-3.0 | REUSE.toml:74, :87-95, :98-100, :123-135, :153-155 | A (attribution) |
| demo/override/ruby**.png | CC-BY-4.0 | REUSE.toml:103-105 | A (attribution) |
| demo/override/cursor**.png, grndloot.bam, contgrnd.bam, AMB_D18.ogg | CC-BY-SA-3.0 | REUSE.toml:82-84, :113-115, :138-140 | B |
| demo/override/CHMB1**.bam | CC-BY-SA-4.0 | REUSE.toml:57-59 | B |
| demo/override/Eadui.ttf, Lato-Bold.ttf | OFL-1.1-RFN | REUSE.toml:62-69 | B |
| demo/music/*.mus | conflict (wildcard CC-BY-SA-4.0 vs named composer) | REUSE.toml:39-41; demo/README.md:52 | C |
| demo/dialog.tlk, demo/chitin.key | CC-BY-SA-4.0 by wildcard only, origin not stated | REUSE.toml:39-41 | C |

Counts: gemrb/unhardcoded per game 89 to 473 files; artwork 10 files; demo 77 png, 36 2da, 24 ogg, 21 bam, 8 ids, 7 PVRZ and others (demo/README and find output).

## Inspiration (own words)
1. Layered area backdrop: ar0100.png (1600x1152) with separate ar0100.wed/.tis/.mos/.are files, so art and passability are split.
2. Equipment icon family at 30x30 (ston**.png): one frame and one silhouette per slot.
3. Gem as a hero item: ruby128.png, ruby32.bam, ruby.itm.
4. Context pointer set: 48 cursor files at 33x33 (cursor00.png to cursor47.png). Per-state meaning not read.
5. Ground loot container: grndloot.bam and contgrnd.bam.
6. Footstep pool: fs_dirta.ogg to fs_dirti.ogg picked at random.
7. Data-first tables (classes.2da, itemtype.2da, action.ids, avatars.2da, .cre and .itm files) carry names and rules.

## Briefs (5)
1. Walled town backdrop with a passability layer. Keep: pre-rendered backdrop with a separate walk-or-block layer, one ambient loop per zone. Change: a new layout grid, our own architecture and palette (about 20-30 percent resemblance). Ref: demo/override/ar0100.png, ar0100.wed, ar0100.tis, AMB_D18.ogg.
2. Stone-set slot icon family. Keep: one 30x30 frame for all slots, one silhouette per slot. Change: our own silhouettes, motifs and rim treatment. Ref: demo/override/stonhelm.png, stonboot.png, stonring.png.
3. Faceted gem hero icon. Keep: one bright highlight as the signature, a large master plus a small version. Change: new cut, facet count, colour and setting. Ref: demo/override/ruby128.png, demo/override/ruby.itm.
4. Ground sack loot container. Keep: low sack on the ground as a lootable marker. Change: new tie or clasp, our own material and settle motion. Ref: demo/override/grndloot.bam, contgrnd.bam.
5. Nine-variant dirt footstep pool. Keep: a pool of short variants picked at random. Change: our own surface sounds, pitch range and clip length. Ref: demo/override/fs_dirt**.ogg (REUSE.toml:153-155).

Dom's rule applies to every brief: recreate as a clearly distinct original, never a copy. The change lists name what we alter.

## Cross-link to our cell topics
- zones: ar0100 backdrop and area data.
- loot: grndloot, contgrnd, ruby, stone icons.
- hud-ui: cursor set, win and btn bams, Eadui and Lato fonts.
- vfx: firescis.BAM and FOGOWAR.BAM listed, not opened.
- animation: bam sequences listed.
- sound: fs_dirt footsteps, AMB_D18 ambient, winopen and winclose.
- spawns: protagon.cre, rabbit.cre, riddler.cre read by name only.
- camera: none checked.

## Not verified
- gemrb/core C++ and GUIScripts Python (no file opened beyond the SPDX count).
- Most data tables (only classes.2da and action.ids first lines read).
- Binary BAM, PVRZ, BMP and TIS files (listed, not opened).
- dialog.tlk and chitin.key contents.
- Demo music contents.
- The separate gemrb-assets repo named in demo/README.md (not in box; not fetched).
- The original Infinity Engine game data (not in donor).
