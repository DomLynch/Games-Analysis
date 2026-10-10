# TurningWheel-Barony (asset audit, AU053)

Donor: /mnt/frankendom-donors/TurningWheel-Barony
Halves: one codebase (src/ plus lang/). No separate server half in the box. The game's binary data pack (art, sound, models) is NOT in the repo.

## Licence (as the files say)
- Code: BSD 2-Clause. LICENSE.txt line 3 "licensed under the BSD 2-Clause License:", copyright line 5 "Copyright (c) 2013-2020, Turning Wheel LLC".
- Third-party libraries: their own licence texts in the root (LICENSE.curl.txt, LICENSE.freetype.txt, LICENSE.libtheoraplayer.txt, LICENSE.libtheora.txt, LICENSE.nativefiledialog.txt, LICENSE.opus.txt, LICENSE.physfs.txt, LICENSE.SDL2_ttf.txt, LICENSE.zlib.txt). Not read.
- Game assets: not in repo. README.md line 13 "you still need a purchased copy of Barony to play this." INSTALL.md line 62 points to a separate assets folder.

## Rights-holder status
Code: Turning Wheel LLC (LICENSE.txt line 5). Game assets: holder not named in the repo files. No fan project or leak note in the files.

## Best class: A (for the text and code the repo ships under BSD 2-Clause). Game art and sound: D (absent). Several icons, dev PNGs and the font: C.

## Asset inventory
- lang/en.txt: 7,274 lines, about 5,753 numbered entries. Grammar: a number, a space, the string, ended by '#'-style comment lines (line 2). Class A (BSD, keep the notice).
- lang/item_names.json: 2,738 lines. Items keyed by name with identified and unidentified names (lines 5-6). Class A.
- lang/compendium_lang/: 11 JSON files (achievements, codex, items, magic, monsters, world, plus lang_* twins), about 7,561 lines. Class A.
- lang/en.ttf: font, licence not stated in files read. Class C.
- cippie-devstuff/: about 25 developer design notes (text) plus 7 PNG mockups and screenshots. Notes: class A but ideas only (README.txt says 'as is', 'NOT a guarantee'). PNGs: class C, look only.
- Icons: Barony_Icon256x256.png, BaronyEditor_Icon256x256.png, barony.ico/.icns, editor.ico/.icns, game.ico. Class C (brand).
- gamecontrollerdb.txt (41 KB) and four name lists (npcnames, playernames). Class A.
- Game art, sprites, models, sounds, music: absent from the repo. Class D.

## Inspiration (own words)
- Monster stat roll: default per type, then max HP gets a random amount up to its range, current HP rolls from its own range when the ranges differ, and if they match the current HP follows the max roll. Clamp to max last (entity.cpp lines 20127-20157; defaults at stat_shared.cpp line 159). Row 7 and row 18 variance.
- Two-name items: generic name until identified, real name after use (item_names.json lines 5-6). Loot reveal with a colour and sound stinger.
- Spell failure ladder: the less a spell is known, the more it fails (cippie types of spell failure.txt line 10). Types: mana overdraw costs health, fizzle, self-explosion, summoned threat (lines 14-17). Row 13.
- Death opt-out arena: after death, a hard arena for a second life or permanent loss (kill zone.txt line 1). Row 17.
- Pit tackle: a creature leaps and tackles when the player is levitating over a pit (minotaur.txt line 1). Row 7 with a player-state trigger.
- Numbered string tables, one entry per line, comments with '#'. Locale-ready. Row 20 and 21.

## Briefs
1. Pit Tackler (own label). Keep: trigger on the player's state, leap ends in a tackle, readable wind-up. Change: bull-shaped brute with a glowing neck ring, our own bridge or ledge trigger, shadow telegraph instead of a jump arc. Ref: cippie-devstuff/minotaur.txt line 1.
2. Unlabelled Relic (own label). Keep: generic name until identified, real name after use. Change: colour and sound reveal, a shape hint not a word, our own item families. Ref: lang/item_names.json lines 5-6.
3. Second Chance Arena (own label). Keep: death leads to a visible choice (hard arena for a chance back, or permanent loss). Change: a timed duel against one champion from our roster, a shrine and light instead of the donor's wording, a visible token. Ref: cippie-devstuff/kill zone.txt line 1.

Recreate as clearly distinct originals, never a copy. Keep the mechanism; change the look, names and ids.

## Cross-link
- Row 7 and 18 (creature and loot): stat roll and two-name items.
- Row 13 (specials): failure ladder.
- Row 17 (death and respawn): second-chance arena.
- Zones: pit and ledge trigger.
- hud-ui, camera, animation, sound: none read or none in box.

## Not read
- Game art and sound (absent).
- lang/compendium_lang contents beyond line counts; item table beyond the first item.
- entity.cpp and stat_shared.cpp beyond the cited ranges.
- Third-party licence texts beyond the list; gamecontrollerdb.txt upstream notice.
- PNG mockups (not opened); cippie notes other than the four cited.
- en.ttf licence.
