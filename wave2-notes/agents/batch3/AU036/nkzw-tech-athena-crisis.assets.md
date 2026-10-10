# nkzw-tech-athena-crisis (asset audit, AU036)

Donor: /mnt/frankendom-donors/nkzw-tech-athena-crisis (VPS, read-only). Halves: this donor is the client and shared-logic half of a proprietary game. The server half is not open source (README.md:89 "Backend implementations such as user management, databases, APIs ... are not open source"). The data pack (art, music, story, character text) is not in the repo (README.md:111 "Assets are not part of this codebase"). Read here: licence files, README asset policy, art/ wrapper code, athena/info/ type and name tables (partial), offline/ shell, ui/ font stack and placeholder audio names.

## Licence (what the files say)
- Code: MIT, "Copyright (c) 2024 Nakazawa Tech KK" (LICENSE.md:3, :5). The MIT scope is stated: LICENSE.md:29 "The MIT License applies to the source code and associated documentation of this software only."
- Art, sound, branding, game content: "subject to separate licensing terms" (LICENSE.md:29), with a contact address for a licence fee.
- README.md:11 "The single-player campaign, multiplayer, art, music, and content are not open source."
- README.md:115 "any content such as art, music, story, characters and their descriptions are not open source and are the intellectual property of Nakazawa Tech KK."
- README.md:115 also says a commercial project "must replace all content with your own".

Asset licence: proprietary, per the files. No open-licence text (CC, OFL, etc.) is present for art, sound, fonts or keyart.
Rights-holder status (from repo files): original company (Nakazawa Tech KK), commercial game with an open core. Not a fan project, not a leak (the files say the content is the company's IP).

## Asset inventory (what is actually in the box)
| Group | Path | Count / size | Licence | Class |
|---|---|---|---|---|
| Art sprite pipeline (code only, no sprite files) | art/*.tsx (Sprites, VariantConfiguration, BiomeVariants, AssetInfo) | 5 tsx + types | MIT (code) | n/a |
| Remote art host | art/AssetInfo.tsx:1 (AssetDomain constant) | URL only; images not in repo | proprietary | C |
| Fonts | offline/fonts/AthenaNova.woff2 (17 KB), PressStart2P.woff2 (29 KB), MadouFutoMaru.woff2 (400 KB) | 3 files | not stated in repo | C |
| Key art | offline/keyart.jpg (670 KB) | 1 image | proprietary (README.md:130 uses it as Keyart) | C (branding; do not reuse) |
| Shell images | offline/Background.png (131 B), offline/apple-touch-icon.png (3 KB), ui/assets/Background.png | 3 images | not stated | C |
| Placeholder-named audio | ui/Empty.ogg (4 KB), ui/Empty.aac (587 B) | 2 files; content not opened | not stated | C |
| Test renders (image snapshots) | tests/__tests__/__image_snapshots__/*.png | 58 PNG files (count only; not opened) | derived from game art, not stated | C |
| Logo-named SVGs | infra/assets/*.svg (null, polar, crowdin, hetzner) | 4 SVG; not opened | not stated | not assessed (appear to be service logos by name only) |

Not read: all PNG and JPG pixel content; the 58 snapshot images; the fonts beyond file names and sizes.

## Data first (names and looks)
- Unit name pools by gender: athena/info/UnitNames.tsx:8 (`const names = {`), :9 (`female: [`). Name lists exist there; not reproduced.
- Unit definitions and types: athena/info/Unit.tsx (4,032 lines). Read only the type and enum declarations: AttackType at :57, UnitAnimationSprite at :63, AttackStance at :70, Ability at :23.
- Sprite variant names: athena/info/SpriteVariants.tsx (1-line union start at :1; list not read in full).
- Attack effect sprites: athena/info/AttackSprite.tsx:1 (union type).
- Sound and song names: athena/info/Music.tsx:1 (SoundName union), :88 (SongName union), file 105 lines.
- Decorators (small map props): athena/info/Decorator.tsx:55 (DecoratorInfo class), :523 getDecorator.
- Palette maps per biome: art/BiomeVariants.tsx:5 (Map from Biome to a HEX-to-HEX map). Colour values not recorded here (class C, rule).

## Verdict per group
- Every group is class C (proprietary, not open-licensed). Inspiration only, category level, recreate from scratch.
- Code pattern (MIT): the palette-swap architecture and the stance and effect registries are code. MIT allows adapting the code. Class B-style note: our use of the code should keep the MIT notice. Recorded as code, not as an asset.
- Nothing usable as an asset for us. No class A or B group.

## Inspiration (own words, category level, no exact looks)
- One sprite set, many looks: sprites are re-coloured at runtime per faction and per biome from a source-to-target colour map (art/VariantConfiguration.tsx:7; art/BiomeVariants.tsx:5). A way to get many factions from one art set.
- The runtime swap is gated: art/Sprites.tsx:24 returns true when the build is not production or the browser is offline. A dev-time check for art changes.
- A water-swap flag lets water tiles change colour separately from land (art/VariantConfiguration.tsx: waterSwap field in the config type).
- Attacks have a stance tag (long, short, once) that changes how the strike plays (athena/info/Unit.tsx:70). Ranged and melee read apart; a one-shot flourish is a separate tag.
- Each attack kind has its own effect sprite type (athena/info/AttackSprite.tsx:1). Clear feedback per attack.
- Typed registries for sounds and songs (athena/info/Music.tsx:1, :88) so cue names are checked at build.
- Names generated from per-gender pools (athena/info/UnitNames.tsx:8-9) with a random helper imported at the top of the file (UnitNames.tsx:1). Cheap naming for many units.
- Fonts chosen by locale (ui/CSS.tsx:9 for one font stack, :12 for a Japanese stack). Per-language font fallback.

## Briefs (category level only; recreate as clearly distinct originals; never a copy)
1. Stance-tagged strike (ours). Why: a melee and a ranged strike read apart at 375 px wide. Keep: three stance tags that change how a strike plays (trait kept). Change: our own tags and timing; add a one-shot 'finisher' tag with a different wind-up (trait changed). Ref: athena/info/Unit.tsx:70.
2. Faction re-skin from one set (ours). Why: many factions from one art set saves art time. Keep: source-to-target colour map per faction (trait kept). Change: our own ramps and an edge rim light instead of a flat swap (trait changed). Ref: art/VariantConfiguration.tsx:7.
3. Attack effect registry (ours). Why: one named effect per attack kind gives instant feedback. Keep: a typed effect per attack kind. Change: our own effect shapes and sound pairing. Ref: athena/info/AttackSprite.tsx:1.
4. Typed cue registry (ours). Why: a typed list of cue names catches typos at build. Keep: a typed sound list. Change: our own cue names and grouping. Ref: athena/info/Music.tsx:1.
5. Gendered name pools (ours). Why: a short list per gender gives fast variety. Keep: per-gender pools with a seeded pick. Change: our own pools and a different generator shape. Ref: athena/info/UnitNames.tsx:8.

## Cross-link to our cells
- camera: none in repo (no camera code read).
- zones: art/BiomeVariants.tsx (biome palette only); no zone layouts read.
- spawns: none read.
- loot: decorators (athena/info/Decorator.tsx:55) only.
- hud-ui: ui/CSS.tsx font stack (brief on fonts above is not a brief; see verdicts).
- vfx: athena/info/AttackSprite.tsx:1 (brief 3).
- animation: athena/info/Unit.tsx:63 animation sprite type, :70 stance (brief 1).
- sound: athena/info/Music.tsx (brief 4); ui/Empty.ogg is a placeholder-named file; content not opened.
