# STJr-SRB2 (asset audit, AU050)

Donor: `/mnt/frankendom-donors/STJr-SRB2` (VPS, read only)
Code licence: GNU GPL version 2 (LICENSE line 2; assets/README.txt line 9 says the source is GPL-2).
Asset licence: no separate asset licence file. `assets/LICENSE.txt` is the GPL-2 text. `assets/README.txt` line 39 says design and content is copyright 1998-2025 by Sonic Team Jr. Line 41 says original material is copyrighted by its owners. The game data packs are not in the box.
Rights holder status: Sonic Team Jr. for design and content (README line 22 and assets/README.txt line 41 disclaim SEGA IP). The engine header in `src/sounds.c` names id Software, DooM Legacy and Sonic Team Junior. README line 8 says it is a modified version of Doom Legacy. Not a clean-room claim.
Best class: C for the content (not in box, or STJr design and content). B for anything copied from the GPL source (code tables, locale strings). Shape only from the source, as clean-room.

Which half: I read the engine half (src: monster and state tables, sound table, HUD names, asset loading). The data half (the game packs) is absent. I checked by extension (pk3, wad, dta, lmp, mus, soc, lua): none present. The paired half is not in the box.

## Asset inventory

| group | path | count hint | class |
|---|---|---|---|
| game data packs | not in box (named in `assets/CMakeLists.txt` line 28) | 0 found | C (not in box) |
| logo and banner | `srb2.png` (about 25 KB), `srb2banner.png` (about 157 KB), `android/res/drawable-*` | 2 root PNG, Android icons | C |
| monster and state tables | `src/info.c` (22167 lines), `src/info.h` | 662 MT_ enum, 2656 S_ enum, about 402 SPR_ enum | B (GPL-2 data-as-code) |
| sound table with captions | `src/sounds.c`, `src/sounds.h`, `src/s_sound.c` | 736 sound entries | B |
| locale strings | `src/locale/en.po`, `src/locale/srb2.pot` | about 822 msgid | B |
| third-party test media | `libs/SDL2/test/sample.wav`, `*.bmp`, `libs/libpng-src/*.png` | 1 WAV, 57 BMP, about 200 PNG | C (not game content) |
| maps, levels, scripts | none in box (0 `.lua`, 0 `.soc`) | 0 | D |

## Inspiration

- A monster is one row of fields: spawn state, see state, pain chance, death state, sound slots, speed, size in fixed point, mass, damage, and a flags word (`src/info.c` 4206-4232). A clean catalogue shape for row 21.
- Animation is a state chain: frame, tick count, action, next state (`src/info.c` 848-854). Idle holds five ticks; chase steps every three ticks across six frames.
- Death is a short flicker chain that repeats a fixed count and then hands over to one shared explosion state (`src/info.c` 1077; same end state at 1106 and 3885). Every kill reads the same way in a crowd.
- A one-hit enemy is flagged enemy, special and shootable, with low speed (`src/info.c` 4209, 4222, 4229). Crowds come from many fragile bodies.
- Each sound has a caption column; an empty caption shows the sound id; a closed-caption cvar turns them on (`src/sounds.c` 36, 41, 182; `src/s_sound.c` 88). The accessibility rule to copy.
- One table file per family (monsters, states, sounds) with one enum each (`src/info.h` 1196, 4429).

## Briefs (recreate as clearly distinct originals; never copy)

- **One-hit walker with a look-and-chase loop.** Keep: one hit point; six-frame chase loop at three ticks; shared death puff. Change: low wide crawling silhouette with a glowing seam, ember trail on death, our palette and tick timing. Ref: `src/info.c` 4206-4232, 848-854.
- **Flicker-then-puff death.** Keep: short fixed repeat, then one shared end state. Change: our VFX palette, hold for hit-stop, repeat count as zone data. Ref: `src/info.c` 1077, 1106, 3885.
- **Every combat cue has a caption.** Keep: caption column, empty falls back to the id, one on/off setting. Change: plain action words (parry, heavy hit, guard break), shown at the bottom edge of the HUD. Ref: `src/sounds.c` 36, 41, 182; `src/s_sound.c` 88.
- **Many one-hit bodies flagged shootable.** Keep: one hit point, enemy/special/shootable flags, low speed. Change: one or two hit bodies with a different guard rule and a short wind-up tell. Ref: `src/info.c` 4209, 4229.
- **Fixed-tick state chain.** Keep: frame, ticks, action, next state in one row. Change: driven by our 60 Hz fight tick, a flagged guard-window frame, table kept as zone data. Ref: `src/info.c` 848-854; `src/info.h` 1196.

## Cross-link to our topics

- Sound and captions (sound-music, hud-ui accessibility): the caption column is the usable part.
- Spawns and encounters: the monster row fields and the one-hit fodder pattern.
- VFX and death: the flicker-then-puff chain.
- Animation: the state chain and tick counts.
- Camera, loot, zones: not read in this pass.

## Not read

Game data packs (not in box; extension check only); `src/*.c` bodies beyond cited ranges (`g_game.c`, `p_mobj.c`, `f_finale.c`, `deh_tables.c`); Lua runtime bodies; logo and Android images (not opened); `libs/` third-party trees (232 MB, counts only); the rest of `assets/LICENSE-3RD-PARTY.txt`; music definitions (none found by grep for `mus_` in sounds.c).
