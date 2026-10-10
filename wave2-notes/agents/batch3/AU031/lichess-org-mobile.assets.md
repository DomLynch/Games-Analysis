# lichess-org-mobile (asset audit, cell AU031)

Donor: /mnt/frankendom-donors/lichess-org-mobile (VPS, read-only). Flutter/Dart client.
Code licence: GPL-3.0 or later (LICENSE line 1; COPYING.md lines 12-15).
Asset licence: default GPL-3.0+ for any file not in the COPYING.md table. Named exceptions: Fontawesome (OFL 1.1, line 29), learn pieces (GPLv2+, line 30), learn webp (CC BY 3.0, line 31). Unnamed sounds conflict with lila's CC BY-NC-SA row for lisp sounds (see below).
Rights holder status: open-source app; "copyright (c) 2022-2023 Lichess Mobile contributors" (COPYING.md line 6). No leak or decompile statement.
Best class: B (GPL share-alike by default), with A for the CC BY 3.0 learn icons and the OFL font. lisp sounds are class C (conflict).

Checked: LICENSE head, COPYING.md (full), assets/ tree (find and ls; counts from find), sound_service.dart (lines 15-40, 120-145), move_feedback.dart (lines 1-48), storm_controller.dart (lines 100-122), JSON heads. Confidence high on the COPYING rows and the three code files. Medium on counts. AGENTS.md read as data only and not used.

## Halves read
- Client: lib/src/service/sound_service.dart, lib/src/service/move_feedback.dart, lib/src/model/puzzle/storm_controller.dart.
- Data: assets/ (names, counts, JSON heads).
- Server: not in this donor. The matching server is lichess-org-lila in the box (its licence rows and storm and rating code were read in that donor's audit).

## Asset groups
1. Sounds: assets/sounds/{lisp,nes,sfx,futuristic,piano,standard}/, 42 mp3 and 42 aifc (2.7 MB). Default GPL. lisp/ is class C because lila's COPYING.md line 75 names the same lisp sounds CC BY-NC-SA 4.0 and this repo does not.
2. Fonts: assets/fonts/, four ttf. Only Fontawesome is named (OFL 1.1). Other three are class C until their origin is checked.
3. Board thumbnails: assets/board-thumbnails/, 25 jpg (wood, marble, metal, leather, canvas, newspaper and others). Default GPL. Not opened.
4. Learn and practice art: assets/images/learn/. learn/pieces GPLv2+ (line 30). learn/*.webp CC BY 3.0 (line 31). Class A for the CC BY 3.0 set with credit.
5. Other images: assets/images/ (280 webp in total across folders; maia, fide-fed flags, stockfish, logos). Default GPL. Not opened.
6. Data: assets/endgames.json (list of named FEN positions with ECO), practice.json (sections of studies), positions.json (opening move tree), chess_openings.db (1.1 MB binary, not opened). Default GPL for the JSON; class C for the db.

## Inspiration (own words)
- Layered move feedback: one function maps the event type to a tier. A plain move is a light tap, a check is a medium tap, and a capture goes to the capture sound (move_feedback.dart lines 14-35). Keep the one-function mapping. Our tiers: hit light, parry medium, finisher heavy.
- Three channels for a miss: error cue, heavy haptic and a time penalty in one branch (storm_controller.dart lines 111-114). Keep the three together. Change the cost to guard loss and a stagger.
- Sound fallback per cue: theme folder first, standard folder second (sound_service.dart lines 128-139). Keep it so a sparse pack still plays every cue. Our base pack is the hit and block set.
- Base-pack-only cues: rare cues (learn cues) exist only in the standard folder (sound_service.dart line 34). Use the same idea for finisher and death stingers.
- One haptics switch over every tier (move_feedback.dart line 17). Keep for accessibility.
- Material swatch chips for a surface picker (assets/board-thumbnails/). Keep the grid; use our own materials.

## Briefs (3)
Dom's rule: recreate as a clearly distinct original, never a copy. Kept and changed traits are named.
1. Three-channel wrong-move punishment (ref storm_controller.dart lines 111-114). Keep: cue, heavy haptic and cost together. Change: cost is guard loss and a stagger; the cue is our own guard-break sound.
2. Tiered touch tap (ref move_feedback.dart lines 14-24). Keep: single map from event to tap tier. Change: tiers are hit, parry, finisher; strengths are ours.
3. Material swatch picker (ref assets/board-thumbnails/marble.jpg, reference only). Keep: square swatch grid with a selected ring. Change: our own materials (sand, ash, ice, moss) and palette.

## Cross-link
- HUD and touch: haptic switch and tap tiers above.
- Sound and music: fallback chain and base-pack cues. No music folder in assets/ (not verified beyond listing).
- Progression and loot: none in the assets; the storm code is the only mechanic read.
- Spawns: none.

## Not verified / not read
- AGENTS.md (read as data, not followed); CLAUDE.md is a one-line pointer to it.
- chess_openings.db (binary, existence and size only); all audio and image content; fonts' terms.
- lib/* beyond the three files; test/; pubspec.yaml.
