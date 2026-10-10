# keldaanCommunity-pokemonAutoChess (asset audit, reader AU028)

Donor/Licence line: code GNU GPL v3 (LICENSE line 2, 'Version 3, 29 June 2007'). Assets: no asset licence file in the box; the README and policy say all rights to The Pokemon Company. Best class C (inspiration only; category-level briefs).

Checked: README.md (lines 5, 22, 136-137), policy.md (line 14), LICENSE, the top-level and app/ listings, public/src/assets/ folder counts and sample PNG headers (read with python3 on the VPS, header bytes only), app/models/precomputed/ (pokemons-data.csv header, credits.json line 1, file list), app/core/attacking-state.ts (full file, 146 lines), app/core/pokemon-state.ts (around lines 1115-1140 and 35-140), app/core/simulation.ts (update, lines 1310-1352), public/dist/client/locales/ (folders and en/translation.json key count). Receipts: 89 rows across the four donors, all pass verify_receipts.

## Halves
- Server half: READ in part. app/ (Colyseus room server, core/ simulation and state machine, models/, services/). Rooms and matchmaking were listed, not read.
- Client half: READ as inventory. app/public/src/ (pages/ with 40-plus components, assets/, i18n.ts). Components not read.
- Data half: READ. app/models/precomputed/pokemons-data.csv (1,176 lines including header; columns Index, Name, Category, Tier, Additional pick, Type 1-4, HP, Attack, Speed, Defense, Special Defense, Attack Range, Max PP, Ability, Family, Duo, Regional, Nb stages, Variant), app/types/delays.json (1,186 entries, per-species frame counts d and t, key count only), app/models/precomputed/credits.json (per-species artist credit records; the handles inside are personal identifiers and are not reproduced here).
- Paired half: both halves are in the box (app/ is server; app/public/src is client).

## Licences (as the files say)
- LICENSE: GNU GPL v3.
- README line 5: All rights to The Pokemon Company. Pokemon Auto Chess can stop at any time, whenever The Pokemon Company wants.
- policy.md line 14: Pokemon Auto Chess is an open-source, non-profit fan project ... All rights to The Pokemon Company.
- README line 22: Download the music files and pack all the game assets (the music is fetched by a script; no music file is in the box).
- edit/assetpack/assetpack-cli-fork/LICENSE and edit/assetpack/plugin-texture-packer-fork/LICENSE: MIT License, PixiJS 2022 (tool code, not game art).
- Result: the code is GPL v3; the art is the Pokemon Company's per the files; no separate licence for the art, sounds or translations.

## Rights holder (from files only)
Fan project (policy.md line 14). The files name The Pokemon Company as the holder of rights (README line 5, policy.md line 14). The art credits in credits.json and the portrait folders name individual contributors; the files do not state a licence for their work.

## Asset inventory (counts from find and ls; sample headers via python3)
- Pokemon sprites: app/public/src/assets/pokemons/ (2,385 files; about 1,190 PNG with JSON atlases; the sample file is 503 x 313 px). Class C.
- Portraits: assets/portraits/ (48,765 files; 13,553 PNG; sample 40 x 40 px). Class C.
- Ability icons: assets/abilities{tps}/ (5,566 files; 5,512 PNG; sample 40 x 48 px). Class C.
- Attack, item and status icons: assets/attacks{tps} (771), assets/item{tps} (370), assets/status{tps} (299), assets/status (27). Class C.
- Types and trading icons: assets/types and types{tps} (31 each), trading_platform{tps} (30). Class C.
- Tilesets, maps and environment: assets/tilesets (1,516 files), assets/maps (144), assets/environment (188). Class C.
- UI and misc: assets/ui (145), icons (68), titles (98), ranks (12), posters (46), theme (11), flags (8), notifications (28), unown (28), loading_hints (12), community-servers (11). Class C.
- Sound effects: assets/sounds/ (20 .ogg: buttonclick, buttonhover, finish1-8, evolutiont2, evolutiont3, joinroom, leaveroom, newroom, notification, refresh, setready, startgame, carouselunlock). Licence not stated in the box. Class C.
- Video: 5 .mp4 under public/src (location not checked). Class C.
- Music: NOT IN THE BOX. README line 22 says a script downloads it.
- Translations: public/dist/client/locales/ (14 language folders: bg, de, en, es, fr, it, ja, ko, nl, pl, pt, th, vi, zh). en/translation.json holds 355 top-level keys (count only; the strings were not read). Licence: repo GPL by default; no separate text licence found. Class C (unclear).
- Credits: app/models/precomputed/credits.json (line 1 holds per-species portrait and sprite credit records with a primary and secondary credit and a total). Also assets/pokemons/credit_names.txt and assets/portraits/*/credits.txt. Credit names are personal names and handles; not reproduced.
- Data tables: app/models/precomputed/pokemons-data.csv (the species table; cite the table) and app/types/delays.json (frame timing). Both are read as data.

## Class per group
- All Pokemon-IP art (sprites, portraits, icons, tilesets, UI, sounds): C. The files state all rights to The Pokemon Company.
- Locale strings: C (unclear).
- Code: GPL v3 (copyleft condition: B for code reuse).
- Tool forks in edit/assetpack: MIT (class A for that tool code only).

## Data first (names, looks, stats)
The species stats and the look keys are in app/models/precomputed/pokemons-data.csv (header read on line 1; the rest not opened). The loader that turns it into code (precomputed-pokemons.ts, not read) was not opened. The look keys are the folder names in assets/pokemons/ (for example 0000-0001.png and 0000-0001.json atlas pairs).

## Inspiration (category-level only; class C)
- Sticky target: keep the same target while it is alive, targettable and in range; only retarget when it is lost or out of range (attacking-state.ts line 26 comment; line 47 branch; line 62-63 retarget). Idea for row 4 (fight loop) and the many-vs-one target choice in row 2: the current target stays until it is invalid. Change: our leash and our hate list.
- Conditional finisher targeting: when a status is active, the attacker picks the lowest total of hit points and shield among candidates in range instead of the default (attacking-state.ts lines 34-44). Idea for row 13 specials: a state that changes target choice. Change the trigger, not the status name.
- Tie-break by carried item: among candidates at equal distance, prefer those holding a particular item (pokemon-state.ts line 1137, then the holder filter). Idea: keep distance first, then a data tie-break. Change to our own tie-breakers.
- Attack timing from speed and frame data: attack duration = 1000 / (0.4 + 0.007 x speed) (line 131); the hit lands at a fraction of the animation from per-species frame counts d and t (line 135, delays.json); projectile travel time from distance and speed (line 143). Idea: separate the wind-up from the cooldown, and make the hit land on the animation's impact frame. Change the curve; no per-species frame table in ours (row 6 and row 7).
- Command queue then unit update: each step runs queued commands first (simulation.ts line 1314), then each unit updates (line 1332 blue, line 1349 red), with a damage meter sampled just before each unit (lines 1319-1330). Idea for row 1 and the server tick: deferred hits are commands, the tick order is fixed. Change to our fixed step.
- Pixel-size icon vocabulary: 40 x 40 portraits and 40 x 48 ability icons (samples). Idea for row 14 (HUD) and readability at 375 wide: one small glyph per ability on a fixed grid. Change the glyph shapes.
- Per-species credit records: credits.json holds primary and secondary credits per species with a total. Idea: a credit record per asset, shipped as data. Change the format; never reproduce the personal names.

## Briefs
See the .assets.json briefs array (five category-level briefs). Dom rule: recreate as a distinct original, never a copy.

## Cross-link (cell topics)
- camera: none read.
- hud-ui: ability icon grid (portraits, abilities{tps}) and the notifications and loading_hints sets. Not opened.
- vfx: attacks{tps} and status{tps} folders (names only; contents not read).
- sound-music: 20 short effect sounds (names only). Music is not in the box.
- spawns/encounters: pve-stages.ts and expeditions.ts listed, not read.
- loot: booster.ts and shop.ts listed, not read.

## Not read
- The 1,326-line pokemon-state.ts beyond the lines named above, simulation.ts beyond lines 1310-1352, the abilities under app/core/abilities/ (only the toxic-spore file was grep-matched).
- Image contents of sprites, portraits, icons and tilesets (sizes sampled from one file per folder).
- Sound and video contents.
- The locale strings (count only).
- The client components under app/public/src/pages/ (listed, not read).
- Matchmaking, rooms, services (listed).
