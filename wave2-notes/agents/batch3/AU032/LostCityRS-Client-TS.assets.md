# LostCityRS-Client-TS (asset audit, AU032)

Donor/Licence: code MIT (Lost City, 2023-2026). Asset licence: none in the repo. Best class: D for content (none in the box); the UI copy in Client.ts is class C.

Half read: client half (this folder), read in part. Server half: LostCityRS-Engine-TS is in the box and read in part. Data pack (Content repository): NOT in the box.

## 1. Licence files

- `LICENSE` (MIT): line 1 "MIT License", line 3 "Copyright (c) 2023-2026 Lost City". The licence text is the standard MIT grant.
- `README.md`: names the build as "Lost City - September 7, 2004" (line 2) and says the project is MIT licensed.
- `src/3rdparty/audio.js`: header "MIT license" (line 2), an iOS audio-context fix credited to Blake Kus (line 1).
- `.gitmodules` lists three submodules: tinymidipcm, bzip2-wasm and emsdk. In the box the emsdk and tinymidipcm folders are empty, and bzip2-wasm is not present. Nothing from those was read.

## 2. Asset inventory

- Art, models, sounds, maps, fonts: none in the folder. Runtime art comes from the cache (not in the box). The fire code refers to rune sprites that are loaded at runtime (`src/client/TitleFlames.ts`, `runes` list), but none ship here.
- Folder shape: 95 files, mostly .ts. src/client (10 files), src/dash3d (32), src/config (10), src/io (12), src/graphics (8), src/sound (4), src/mapview (2), src/3rdparty (2 plus a folder).
- Config type classes exist for NPCs, objects, locations, sequences, spot animations, identity kits and variables (src/config). Their data files are not in the box.

## 3. Rights-holder status (from the files only)

- Lost City holds the MIT copyright line (LICENSE line 3).
- The Engine-TS README says this client is "a human-driven port of the original code to modern browsers" (`LostCityRS-Engine-TS/README.md` line 41).
- The UI copy names RuneScape in literal strings (src/client/Client.ts line 1505 calls a centred title call with literal text). The original owner is not named in this folder.
- Treat the copy and any content as restricted. The code is MIT as stated.

## 4. Class per group

| Group | Path | Licence per file | Class |
|---|---|---|---|
| Game art, models, sound | runtime cache, not in box | not in box | D |
| UI copy literals | src/client/Client.ts | repo MIT; copy names RuneScape | C |
| audio helper | src/3rdparty/audio.js | MIT (header) | A |
| MIDI player | src/3rdparty/tinymidipcm.js, tinymidipcm/ (.mjs, .wasm) | not stated in box | C |
| Empty submodules | 3rdparty/emsdk, 3rdparty/tinymidipcm, bzip2-wasm | not in box | D |

## 5. Inspiration (own words; the look is not copied)

- Title-screen ember fire (`src/client/TitleFlames.ts`). Each frame seeds random hot pixels in the bottom rows (updateFlames). Every cell then takes the average of its four neighbours (line 162). A cooling map, at one fifth of its size, is subtracted from each cell (line 175). The cooling map is regenerated from a randomly picked rune sprite each time its cycle wraps (line 169). The look is a burn-through logo. Frankendom: a title or pit-entrance ember with our own sigil as the burn-through pattern.
- Palette ramp: the fire palette is four 64-step bands, from dark through red and yellow to white (line 53 is one band). A 256-entry table reads as heat at a glance.
- Breathing palette (lines 194 and 195, `doBlend`): two alternative palettes are cross-faded with counters that count down by four per update. A new pulse starts only when both counters are zero, on one of two random values out of 2000 per update. Use for rune glow or zone light.
- Wind as three summed sines feeding the top line of the fire (line 184). A cheap sway for banners, capes or flames.
- Touch keyboard press feedback (`src/client/MobileKeyboard.ts`): four modes (`KeyboardMode`, line 59) and a timed press box (animate fields, lines 174 and 175). Relevant to the touch UX fold-in: a press flash that expires by itself.
- Animation transitions as named policies (`src/config/SeqType.ts` lines 6 to 16): PreanimMove (DELAYMOVE, DELAYANIM, MERGE), PostanimMove (DELAYMOVE, ABORTANIM, MERGE), RestartMode (RESET, RESETLOOP). Each hand-off between an animation and a move has a stated rule. Relevant to parity rows 6 and 7.
- Zoomable world map (`src/mapview/MapView.ts`): zoom defaults to 4 (line 126), the view is centred on a focus point and divided by the zoom, and an overview box with border colours sits in a corner. Relevant to the minimap and world map fold-in.

Best transferable idea: a four-neighbour fire with a cooling map and a named animation-to-move policy give a title effect and a combat-timing rule with no art.

## 6. Briefs (rule: recreate as a clearly distinct original, never a copy; the test is a readable silhouette at 375 px, one signature behaviour, one signature sound or effect, and about 20 to 30 percent resemblance at most)

1. **Ember title fire (burn-through seal)**. Why: four-neighbour diffusion with a cooling map reads as heat at title size and needs one seal as art. Keep: four-neighbour averaging, a cooling map drawn from a sprite, a 256-entry ramp. Change: our burn-through pattern is our sigil; the ramp runs cold blue to white; an ember-rate control. Ref: `src/client/TitleFlames.ts` lines 53, 162, 169, 175.
2. **Breathing rune glow**. Why: a rare palette pulse keeps an idle screen alive at no motion cost. Keep: two palettes cross-faded by counters, a rare random trigger. Change: our hue pair, a slow sine in place of the counters, the pulse drives a rune rather than the fire. Ref: `src/client/TitleFlames.ts` lines 194 and 195.
3. **Strike wind-up and recovery policy**. Why: named rules for how an animation hands off to a move make attacks feel deliberate. Keep: the three-way choice per transition (delay the move, delay the animation, merge) and an abort option. Change: our names and our own choice list, for example cancel on hit or cancel on dodge. Ref: `src/config/SeqType.ts` lines 6 to 16.
4. **Press flash on touch controls**. Why: a timed press flash confirms input without a text label. Keep: a timed press shape that expires by itself, modes that switch the layout. Change: our attack-button layout and thumb reach, a ring flash instead of a box, no keyboard copy. Ref: `src/client/MobileKeyboard.ts` line 59 and lines 174 and 175.
5. **Zoomable map with overview box**. Why: zoom with a corner overview gives orientation at a glance on a phone. Keep: zoom as a number with a sensible default, the overview box in a corner. Change: our map style and pins, a default zoom set for our zone size. Ref: `src/mapview/MapView.ts` line 126.

## 7. Cross-link to our cell topics

- hud-ui: touch keyboard press flash and the zoomable map (above).
- vfx: the fire effect is a title effect, not a combat one; the cooling-map technique transfers.
- animation: SeqType transitions (above), parity rows 6 and 7.
- sound: none in this folder beyond the third-party audio helper.
- camera, zones, spawns, loot: not in this folder. The server half (LostCityRS-Engine-TS) carries the zone and spawn rules.

## 8. Not read

- Runtime cache and art (not in the box).
- Most of src/client, src/dash3d and src/io (only the cited files were opened).
- src/3rdparty/tinymidipcm.js and the .wasm (listed, not opened).
- bundle.ts and identifier.js (listed, not opened).
- Submodule folders (empty in the box).
- Data pack (Content repository): absent from the box.
