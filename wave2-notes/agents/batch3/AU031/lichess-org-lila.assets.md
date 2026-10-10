# lichess-org-lila (asset audit, cell AU031)

Donor: /mnt/frankendom-donors/lichess-org-lila (VPS, read-only)
Code licence: AGPL-3.0 (LICENSE; COPYING.md lines 9-12)
Asset licence: mixed, per COPYING.md tables. Default for unlisted files is lila AGPL (COPYING.md lines 3-4). Listed exceptions range from CC0 and MIT through CC BY, CC BY-SA, GPL, and CC BY-NC-SA. Several rows are non-free. Details in the JSON.
Rights holder status: open-source project; COPYING.md line 4 says "copyright (c) 2012-2026 the lila authors". Third-party authors credited per row. No leak or decompile statement.
Best class: A (only for the CC0, MIT and CC BY groups, with credit). Most of the art and sound is B or C. Per-group classes are in the JSON.

Checked: COPYING.md, LICENSE, README.md (licence section), public/ tree (counts from find and du), translation/source counts, ui/storm, ui/racer, ui/lib/src/puz/combo.ts, modules/rating/src/main/Glicko.scala, modules/puzzle/src/main/PuzzleStreak.scala. Confidence high on the licence rows (read verbatim). Confidence high on the storm and combo code. Medium on the sound folder list (ls and find only).

## Halves read
- Client: ui/storm (ctrl.ts, config.ts), ui/lib/src/puz/combo.ts, ui/racer/src/boost.ts.
- Server: modules/rating/src/main/Glicko.scala (lines 1-40), modules/puzzle/src/main/PuzzleStreak.scala (lines 1-20).
- Data: translation/source/*.xml (counts only), COPYING.md tables, public/sound and public/piece file names.
- Matching other half in the box: lichess-org-mobile (client app that talks to this server).

## Asset groups (summary; full rows in the JSON)
1. Piece sets: public/piece/, 43 folders. Mixed licences. CC0 (rhosgfx), MIT (fantasy, spatial, celtic), CC BY 4.0 (Firi, kiwen-suwi, totoy, papercut), GPL and AGPL sets, and many CC BY-NC-SA sets.
2. Sound: public/sound/, 536 files (mp3 and ogg). Ten folders plus two top-level Silence files. futuristic, nes, piano, sfx are AGPLv3+ by Enigmahack (COPYING.md lines 71-74). lisp is CC BY-NC-SA 4.0 (line 75). The rest are not named; lines 101 treat "the other sounds" under the non-free heading with no licence. Class C for those. COPYING.md spells the path public/sounds (plural); the tree uses public/sound (singular). Recorded as found.
3. Images: public/images/, 555 files, about 25 MB. Mixed. Board is AGPL. Staunton and trophy are MIT. Practice and puzzle icons are CC BY 3.0 (game-icons.net). Horsey emoji is CC BY-NC-SA 4.0. "The other artwork" line 102 has no named licence. Class C for that.
4. Fonts: public/font/. Apache 2.0, OFL, GPLv2+ and mixed icon font (COPYING.md lines 26-30). Not opened.
5. Video: public/video/, info-*.webm clips, no COPYING row. Class C.
6. String tables: translation/source/*.xml, 44 files, 3059 "<string" occurrences. puzzleTheme.xml is CC0 (line 82). Others default AGPL. This is the DATA half for names and labels.
7. Bot and NNUE data: READMEs only. Class D.

## Inspiration (own words; no donor text copied)
- Puzzle Storm combo ladder: a short threshold table, a time bonus on each crossing, reset on a miss, and a time penalty on a miss (ui/storm/src/config.ts; ui/storm/src/ctrl.ts lines 117-137; ui/lib/src/puz/combo.ts lines 37-47). The table is data. Keep the reset and the table; change the reward to a guard or stamina refill.
- Racer boost flag: a one-second "just scored" state checked against the current time (ui/racer/src/boost.ts lines 15-26). Use it for a parry or combo flare, with no timer object.
- Rating as an interval: display minus and plus two deviations; only rank when deviation is under a cap (modules/rating/src/main/Glicko.scala lines 15-31). Keep the interval display for a hidden stat readout.
- Sound pack layout: futuristic/ and robot/ share a core cue set (Berserk, Capture, Check, Checkmate, CountDown0-10) and add their own extras. Good template for our packs.
- Numbered countdown files (CountDown0 to CountDown10) per pack, so a countdown needs no code change per theme.
- Pixel-grid and letter-glyph piece sets: silhouettes built from a grid or one glyph still read at small size. A readability test at 375 wide, not a look to copy.

## Briefs (4)
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. Trait kept and trait changed are named in each brief.
1. Storm-style combo ladder with stamina refill (ref ui/storm/src/config.ts). Keep: threshold table as data, reward on crossing, reset on a miss. Change: reward is guard or stamina, not clock; tier colour from our ramp.
2. Numbered countdown tick pack (ref public/sound/futuristic/CountDown0.mp3 to CountDown10.mp3). Keep: one file per second, same names per pack. Change: our voice and timbre.
3. Pixel-grid unit silhouette test (ref public/piece/pixel/, AGPLv3+, reference only). Keep: single-colour silhouette with one accent. Change: our proportions and two-tone palette.
4. Short "just scored" flash (ref ui/racer/src/boost.ts). Keep: per-entity timestamp checked against now. Change: a parry or combo flare on the attacker.

## Cross-link
- Camera and HUD: board thumbnails and practice icons (public/images) are the nearest HUD and skin-picker references. Not read individually.
- Sound: pack layout above. The public/sound listing has no folder named music or ambience; instrument/ (celesta, clav, swells) and piano/ may hold musical clips (not read), so music beds are unverified.
- Progression: rating interval (Glicko) and streak-based puzzle counts (PuzzleStreak).
- Spawns and loot: none in this donor's assets.

## Not verified / not read
- AGENTS.md: treated as data, not followed, not read in full.
- No audio, image, font or video content was opened. Only names, counts and sizes.
- modules/* beyond rating and puzzle; ui/* beyond storm, racer and the combo file.
- translation/source XML content beyond counts and the one licence row.
- public/lifat gallery and NNUE table beyond the README header.
