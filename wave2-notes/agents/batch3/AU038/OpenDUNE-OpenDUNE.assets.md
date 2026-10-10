# OpenDUNE-OpenDUNE (asset audit, AU038)

Donor: /mnt/frankendom-donors/OpenDUNE-OpenDUNE (VPS, read-only)
Class: C overall. The repo ships no game art, sound, music or text. The original data pack is the user's to supply.

## Licences (as the files say)
- Code: GNU GPL v2.0. COPYING:2 ('Version 2, June 1991'); README.txt:8 ('OpenDUNE is licensed under the GNU General Public License version 2.0').
- Assets: none in the repo. README.txt:64 tells the user to copy the original Dune II 1.07 data files (including dune2.exe) into data/. No licence line for the original data is in the repo files.
- Icons in os/: no licence line; the repo GPL covers them by default in the files' own terms, which do not say who drew them.

## Which half was read
- Code half: src/ read in part, including the table files src/table/*.c and strings.h. Table files are data written as C arrays.
- Data pack: absent. The loader reads it at runtime from a PAK (src/file.c comment at line 49; src/string.c String_Load at line 110).
- Server half: none (single-player engine). No paired donor in the box.

## Asset inventory
- Absent: sprites, sounds, music, maps, text (all in the user's original pack).
- Present as code: 16 table files in src/table (unitinfo.c, structureinfo.c, houseinfo.c, landscapeinfo.c, explosion.c, animation.c, sound.c, widget and window tables, team and action tables, and others). Brace lines: unitinfo.c about 108, structureinfo.c 149, explosion.c 292, animation.c 359 (counts of brace lines, not entries).
- String IDs: src/table/strings.h, enum of 536 entries (STR_ATTACK at line 8). The text is in the pack.
- Icons: 3 png, 2 icns, 2 ico under os/.

## Rights-holder status
Original company named: Westwood Studios (developer) and Virgin Entertainment (release), README.txt:4. The repo does not name the current rights holder. Uses original game data (user-supplied).

## Data first: what the tables hold
- Unit rows: name ids, a sprite file name (unitinfo.c:20 'carryall.wsa'), flags (shadow, factory, conquerable, can be picked up, no death message), and a default AI action list (unitinfo.c:12).
- Effects: explosion scripts are command lists (explosion.c:9 set sprite; :10 set timeout; :11 bloom; stop).
- Animation: an eight-by-eight table of facing and step, with commands such as set overlay tile and pause (animation.c:7, :10).
- Strings: stable enum IDs, text from the pack (strings.h:8; string.c:110).

## Inspiration (own words, category level, class C)
- Effect as a short command list (sprite, short wait, bloom, stop). Maps to parity row 10 and row 8.
- Eight-facing clip table where each step is a command, some timed pauses. Maps to parity row 7 (creature clips).
- Unit flags as data fields (can be carried, quiet death, shadow). Keep these as data.
- Default AI action list per creature type, walked in order.
- Stable string IDs with per-language packs. Maps to our locale keys.
- Enhancement list as a defect ledger (enhancement.txt:3): each entry is a problem and its fix. Same shape as our donor-defect notes: keep the idea, list the defect and the fix.

## Briefs (recreate as clearly distinct originals, never copies)
1. Lift-and-carry hauler. Keep: lifts another unit; a shadow; a can-be-lifted flag. Change: ray-shaped bird-like body with an under-glow; the load is a crate or a fallen ally. Ref: src/table/unitinfo.c (lines 14-20).
2. Bloom burst impact. Keep: short command list (sprite, short timeout, bloom, stop). Change: shard ring with sharp flash; colour per damage type. Ref: src/table/explosion.c (lines 8-14).
3. Eight-facing walk table. Keep: eight facings, steps as commands, timed pauses. Change: twelve facings and leg-pair steps for a multi-legged body. Ref: src/table/animation.c (lines 7-10).

## Cross-link
- Row 7 (creature clips): eight-facing command table.
- Row 8 (blood, decals) and row 10 (hit impact): command-list effects.
- Row 18 and loot: none found in the table files read.
- Sound-music and hud-ui: sound.c and widget tables exist; not read beyond names.

## Not verified
Original data pack (absent). Most table rows beyond the cited lines. String IDs (counted, not all read). String loader body. enhancement.txt beyond the head. Icons not opened.
