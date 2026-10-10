# xoreos-xoreos (asset audit, AU058)

Donor: /mnt/frankendom-donors/xoreos-xoreos (VPS, read-only). Half read: ENGINE (src/common, src/aurora, src/engines sampled). There is no separate data pack in the box. The matching data half is the user's own game archives, which the engine reads (not in the box).

## 1. Licences (as the files say)
- Code: GPL-3.0-or-later. COPYING is the GPL version 3 text (line 1 "GNU GENERAL PUBLIC LICENSE"). README line 5: "licensed under the terms of the [GNU General Public License" and "version 3 (or later)". dists/debian/copyright "Files: *" says License: GPL-3.0-or-later (receipts).
- Font inside src/common/systemfonts.cpp: header comment says "Distributed under the terms of the Bitstream Vera license." (line 33) and "DejaVu changes are in public domain. Glyphs imported from Arev fonts are" (line 35). The packaging copyright names it "Files: src/common/systemfonts.cpp", "Copyright: 2003 Bitstream, Inc." and "2006 Tavmjong Bah", "License: Bitstream, Arev" (lines 296-299).
- Licence texts in doc/: LICENSE.Bitstream (conditions: notices must be kept; modified fonts must be renamed without "Bitstream" or "Vera"; a font may not be sold by itself, only in a larger package) and LICENSE.Arev, LICENSE.LGPLv2.1, LICENSE.GPLv2.
- Icon dists/win32/xoreos.ico: dists/debian/copyright lines 26-29 "Files: dists/win32/xoreos.ico" then "License: CC-BY-SA-3.0". Copyright lines name Alex Bevilacqua (2013) and Sven Hesse (2013).
- Icon dists/macosx/xoreos.icns: no licence entry found in dists/debian/copyright (grep for icns returned nothing).

## 2. Asset inventory (real paths)
- Embedded font: src/common/systemfonts.cpp, one byte array kDejaVuSansMonoBold (line 38) running to about line 20760. About 20.7k lines of hex bytes, DejaVu Sans Mono Bold 2.35 per the comment. Binary content not opened.
- Icons: dists/win32/xoreos.ico and dists/macosx/xoreos.icns (binary, not opened).
- doc/xoreos.conf.example (text config), doc/doxygen/README (text).
- Font licence texts in doc/ (above).
- No game data, no textures, models, audio, maps, scripts or dialogue are in the box. Code is about 2,000 .cpp/.h/.hpp/.inl files (counted by extension, including external/ libraries).
- Data tables in code (data first): src/aurora/gff4fields.h (GFF field IDs, grep counts about 2,494 numeric assignments; not counted by hand, e.g. kGFF4SavegameStorySoFarEventList at line 2390), src/aurora/language_strings.h (kLanguageNames, line 30, 13 language names), src/aurora/2dafile.h (2DA format), src/aurora/talktable_tlk.cpp (TLK talk-table format, cites BioWare's specs in its comment at line 25).
- Half read: engine. Matching data half: game archives the user supplies (keyfile, biffile, erffile, rimfile are in src/aurora; names only, not read).

## 3. Rights-holder status
Per the files: an open source reimplementation of BioWare's Aurora engine (README lines 4-5). The code copyright is held by the "xoreos Team" (dists/debian/copyright line 6). The font copyright holders are Bitstream, Inc. (2003) and Tavmjong Bah (2006) per the packaging file. Game ownership: not stated in the box; no game data is shipped.

## 4. Classes per group
- B: src/common/systemfonts.cpp embedded font (Bitstream Vera licence text with conditions: keep notices, rename when modified, no sale alone).
- B: dists/win32/xoreos.ico (CC-BY-SA-3.0 per packaging file; share-alike).
- C: dists/macosx/xoreos.icns (no licence line found).
- B: doc text and code under GPL-3.0-or-later (copyleft applies to the repo text).
- D: game data (not in box).
- best_class: B.

## 5. Inspiration (category level; no creature or item art in the box)
- A built-in fallback font compiled into the binary (systemfonts.cpp line 38). Debug and fallback text always draws, even with no font file on disk. Our version would be a pixel face we design ourselves.
- Data-first format tables: 2DA (2dafile.h line 22), TLK talk tables (talktable_tlk.cpp line 25), GFF field IDs (gff4fields.h line 2390). Names and stats as rows read by one loader for every game. Use: our catalogue fields as data rows.
- One language-name table (language_strings.h line 30) drives the language list and string lookup.
- Per-area minimap: an image chosen by area name, shown or hidden (src/engines/sonic/areaminimap.cpp lines 44 and 62; the file is 90 lines and the body was not read).
- Core-plus-front-ends: a shared aurora/ and common/ core under per-game folders (engines/kotorbase, sonic, witcher, jade, nwn and others). Matches our one-engine ruling: one runtime, zones as data.
- The donor's README says no normal gameplay is implemented yet (README line 36). Little gameplay to copy.

## 6. Inspiration briefs
1. Per-zone minimap card. Why: an image keyed by zone name, shown or hidden on request; the simplest minimap. Keep: one image per zone, loaded by name, a show and hide toggle. Change: fog-of-war reveal drawn from zone geometry, a touch-first corner toggle; our map is generated at runtime, not shipped art. Recreate from scratch. Ref: src/engines/sonic/areaminimap.cpp lines 44 and 62.
2. Built-in debug font. Why: text never fails to draw. Keep: a font compiled into the build for debug and fallback text. Change: our own pixel face designed from scratch, not a Bitstream or DejaVu derivative. Ref: src/common/systemfonts.cpp line 38.
Only two briefs: the donor has no creature, item, armour, zone or effect content in the box, so no further briefs are honest.

## 7. Cross-link to our cell topics
- hud-ui: minimap card and fallback font (above).
- Other topics (camera, zones, spawns, loot, vfx, animation, sound): no content in this donor. The engine code for those was not read.

## Not read
- The embedded font bytes and both icon binaries (binary, not opened).
- src/aurora archive loaders (keyfile, biffile, erffile, rimfile) and the per-game engine bodies (names only).
- Doxygen, tests, external/ libraries, dists/ packaging beyond the copyright file.
- Half: engine read; the user's game archives are not in the box.
