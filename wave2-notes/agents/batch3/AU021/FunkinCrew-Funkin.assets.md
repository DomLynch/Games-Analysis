# FunkinCrew-Funkin (Friday Night Funkin')

Donor root: /mnt/frankendom-donors/FunkinCrew-Funkin/

## Licences (as the files say)
- Code: Apache 2.0. LICENSE.md line 3: "The Friday Night Funkin' source code is licensed under the Apache 2.0 license". docs/style-guide.md line 41: no per-file code licence headers.
- Assets: not in the box. .gitmodules: art and assets are submodules (FunkinCrew/Funkin.art and FunkinCrew/Funkin.assets). Both folders are empty here. LICENSE.md line 8 points to a separate funkin-assets licence (not fetched).
- docs/COMPILING.md line 13: downloading Content is described as "proprietary and protected by national and international copyright and trademark laws". Class C (proprietary per the file, inspiration only).
- Trademark: LICENSE.md line 6 says "Friday Night Funkin'" and its logo are trademarks of The Funkin' Crew Inc.

## Rights holder
- Original project for the code: "Copyright 2020-2024 The Funkin' Crew Inc." (LICENSE.md). README.md line 3 says it was built for Ludum Dare 47 with HaxeFlixel. README.md line 39 says credits are in-game or in the upstream credits.json.

## Asset inventory
- Game art, animation, stages, characters, music and charts: upstream submodules, absent from this box. Count: 0.
- Documentation images (third-party): docs/readme_images/FNF_logo.png (512,994 bytes), Menu.png (554,421 bytes), Title_Card.gif (2,070,965 bytes). docs/readme_images/credits.txt line 1 says they come from fridaynightfunkin.wiki.gg (line 3 names FNF_logo.png). No licence stated. Class D.
- Example mod: example_mods/introMod/ (data/introText.txt, _polymod_icon.png, _polymod_meta.json with "license": "Apache-2.0", line 11; README.md). Class A for the Apache-marked mod files.
- Example mod image: example_mods/testing123/images/newgrounds_logo.png (362x350 by IHDR). Third-party logo, no licence in box. Class D.
- Config: astc-compression-data.json (line 4 "quality": "medium"; input ./assets) and organize_astc_data.sh. Settings, no pixel data. Class C.
- Credits data schema: source/funkin/ui/credits/CreditsData.hx (roles with header, body lines and appendBackers).

## Halves
- Read: the Haxe client (source/, 527 .hx files), partly by reading heads of NoteSplash.hx, Countdown.hx, CreditsData.hx, ResultState.hx imports.
- Server half: none in the box (single-player rhythm game). Content half: upstream, absent.

## Inspiration (own words)
- Note hits use one pooled splash sprite with direction variants and a small frame-rate variance (source/funkin/play/notes/NoteSplash.hx line 10, splashFramerate = 24).
- Pre-song countdown swaps graphic and sound by note style (Countdown.hx line 23 example: a pixel variant in one week).
- Results screen mixes a sticker-style transition, bitmap score font, gradient and scrolling backdrop (ResultState.hx imports).
- Credits are data: roles with headers and an appendBackers option (CreditsData.hx line 4).
- Characters are data-driven (source/funkin/data/character/CharacterData.hx).
- Style can switch per note style (source/funkin/play/notes/notestyle/NoteStyle.hx).

## Briefs (Dom's rule: recreate as a clearly distinct original, never a copy)
- Pooled hit burst. Keep: pooled sprite reuse, direction variants, frame-rate jitter. Change: shard or ring burst, different palette. Ref: NoteSplash.hx.
- Ready-set cue. Keep: three steps before start, per-style swap. Change: slam or rotating card, one-word cue, different sound family. Ref: Countdown.hx.
- Sticker results transition. Keep: stamp-like transition, bitmap score font, scrolling backdrop. Change: paper-cut or torn-edge transition, vertical backdrop. Ref: ResultState.hx; source/funkin/ui/transition/stickers/StickerSubState.hx.
- Backer roll credits. Keep: role blocks, backers appended from data. Change: sideways or film-strip scroll, different block order. Ref: CreditsData.hx; source/funkin/ui/credits/CreditsState.hx.

## Cross-link to our cell topics
- HUD and UI: results, countdown, credits states.
- Sound: countdown sound suffix (sound art upstream, absent).
- Animation: splash frame-rate jitter.
- Camera, zones, spawns, loot: no assets in the box.

## Not read
- art/ and assets/ (empty submodules; upstream not fetched).
- source/ beyond the cited lines; build tooling; docs/ beyond the licence note; example mod text beyond its name.
- credits.json (upstream, not in box).
