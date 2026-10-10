# nmeylan-nostalro-client (asset audit, AU036)

Donor: /mnt/frankendom-donors/nmeylan-nostalro-client (VPS, read-only). Halves: this is the client half of a fan client for a proprietary MMO. The server half is a separate repository (docs/internal/architecture.md:15 "Two crates come from the server repository"; README.md:179 "server repository"); it is not in this box. The game data archive is supplied by the user (README.md:43-48), so the data pack is not in this box either. Read: licence, README asset sections and sprite notes, Features.md, the renderer font folder and its OFL file, the shader file names, the name-table and fixture heads, companion AI doc heading and config head, rendering and projection doc headings.

## Licence (what the files say)
- Code: Apache License, Version 2.0 (LICENSE.md:1-2; http://www.apache.org/licenses/ at LICENSE.md:3).
- Assets: "This repository does not and will not provide any game assets" (README.md:7). No game assets are in the repo.
- Fonts in lib/renderer/src/fonts: SIL Open Font License 1.1 per the OFL-LICENSE.txt file (line 1 "This Font Software is licensed under the SIL Open Font License,"; line 8 "SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007"). The copyright statement for the font files is not in that file; the OFL text itself was not read in full.
- Game-derived tables (name tables and test fixtures): no licence statement in the repo. Their origin is the game's own resource files (README.md:56 "The GRF archive holds everything the renderer reads"; "read resources by their Korean names", README.md:56).
- Shaders: part of the code, Apache-2.0 (no separate licence in lib/renderer/src/shaders).
- Rights-holder status (from repo files only): fan client. README.md:5 says it "reuses many parts of rust-ro". docs/internal/packets.md:13 names Gravity clients; docs/configuration.md:376 names the game as "Ragnarok Online". The repo does not state who owns the game data archive. Not clean-room by the repo's own description (rust-ro reuse).

## Asset inventory
| Group | Path | Count / size | Licence | Class |
|---|---|---|---|---|
| UI and display fonts | lib/renderer/src/fonts/NotoSans-Regular.ttf (2.0 MB), NotoSans-Bold.ttf (631 KB), NotoSansKR-Regular.otf (1.5 MB) | 3 files | OFL 1.1 (OFL-LICENSE.txt:1, :8) | B (OFL conditions; licence file kept with fonts) |
| Font licence | lib/renderer/src/fonts/OFL-LICENSE.txt | 4.3 KB | n/a | n/a |
| Shader source (visual code) | lib/renderer/src/shaders/*.wgsl | 16 files (sprite, terrain, water, model, model_animated, gr2_model, ui, effect_* x6, screen_distortion, ground_proxy, grid_selector) | Apache-2.0 (code) | A (code, Apache notice kept) |
| Name table (game names, in code) | lib/formats/src/builtin_name_table.rs | 3,688 lines of id-name pairs (table constant at :1) | code Apache; names are game content, not stated | C |
| Name table, Korean names | lib/formats/src/builtin_accessory_table.rs | 1,224 lines (constant at :1) | code Apache; names not stated | C |
| Resource-name map | lib/formats/src/res_name_table.rs | 123 lines | code Apache | n/a (code) |
| Test fixtures (game-derived tables) | lib/formats/tests/fixtures/: accessoryid.lua, accname.lua, acid_lua50.lub, acid_lua51.lub, aname_lua50.lub, aname_lua51.lub, idnum2itemresnametable.txt (264 KB), jname_lua51.lub, npcid_lua50.lub, npcid_lua51.lub| about 1 MB in 10 files | not stated | C |
| Companion AI config | companion_ai.json | 320 lines | Apache-2.0 (repo; project config) | A (config, not game content) |
| Game data archive | data/data.grf | not in repo (README.md:43-48, user-supplied) | not in repo | D |
| Background music and guild emblems | data/BGM, data/emblem (config defaults, README.md:100-101) | not in repo; no .mp3/.wav/.ogg in the repo | not in repo | D |
| Docs and feature list | Features.md, docs/*.md | text | Apache-2.0 (code repo) | n/a |

No sprite, map, model, effect or sound file is in the repo.

## Data first (names and looks)
- Class and item name tables: lib/formats/src/builtin_name_table.rs:1 (BUILTIN_NAME_TABLE, id-name pairs). The first entries are class names; the full list was not read.
- Accessory names (Korean): lib/formats/src/builtin_accessory_table.rs:1 (BUILTIN_ACCESSORY_TABLE).
- Resource name lookup: lib/formats/src/res_name_table.rs (123 lines; not read in detail).
- Look data: the sprite, effect and model data formats are described by parsers in lib/formats/src (spr.rs, act.rs, str_effect.rs, rsw.rs, gnd.rs, gat.rs); these read the user's GRF, not repo content.
- Companion behaviour tuning: companion_ai.json (per-companion fields such as aggro and tank limits; numbers not recorded here).

## Verdict per group
- Fonts (OFL): class B. Usable with the OFL conditions (keep the licence file with the font; read the full OFL text before use). These are the only non-code assets Frankendom could use as is, and they are general UI fonts, not game art.
- Shaders: class A as code under Apache-2.0 (notice kept). These are code, and can be adapted as code.
- Game-derived name tables and fixtures: class C. Licence not stated; treat as proprietary game content.
- Game archive, music, emblems: class D (not in repo).
- Best class across groups: B (the fonts).

## Inspiration (own words, category level; game content stays category-level per rule)
- Sampling choice for pixel sprites: nearest texel, hard pixels, no dark rim. The author names the trade-off: aliasing when a sprite is drawn smaller than its source (README.md:137-141).
- Sprite projection: the sprite is placed on the grid cell, its depth is taken from the anchor, and it faces a frame. Three named steps (docs/internal/sprite-projection.md:64 "## Cell to world", :79 "## Depth at the anchor", :147 "## Facing frame").
- Two effect kinds: a sprite-sheet particle effect and a multi-layer texture effect with blend and loop (Features.md:33-34).
- Casting feedback as ring families: a ring at cast start, cast circles for a channel, with a separate family per skill group (Features.md:37-39). Category only.
- A companion runs a small state machine once per engine tick (docs/internal/companion-ai.md:27), tuned by per-companion fields such as aggro by HP and a cap on how many enemies it tanks (companion_ai.json:3, :16).
- The map data places ambient effects: torch, smoke, bubble, fog (Features.md:20). Props carry effects.
- A screen-space distortion effect is used for a "hallucination" state (Features.md:22; shader file lib/renderer/src/shaders/screen_distortion.wgsl).
- Day and night cycle is a light-tint fade on the world (Features.md:17).
- Render order is sorted in batches and has separate transparent and effect passes (docs/internal/rendering.md:92, :155).

## Briefs (category level only where the donor content is proprietary; recreate as clearly distinct originals; never a copy)
1. Hard-pixel sprite with a built-in rim (ours). Why: nearest sampling keeps pixel art crisp, but the silhouette loses its edge at small sizes. Keep: hard pixels with nearest sampling (trait kept). Change: add a palette-matched 1 px rim so the silhouette reads at 375 px (trait changed). Ref: README.md:137-141.
2. Companion with a tank cap (ours). Why: a pet that stops tanking after N enemies keeps fights readable. Keep: a tick-driven state machine per companion with a cap on tanked enemies (trait kept). Change: our own state names and a signature shout that marks a lure (trait changed). Ref: docs/internal/companion-ai.md:27; companion_ai.json:16 (numbers not copied).
3. Map prop ambience (ours). Why: props make the zone feel alive for free. Keep: map data places small ambient effects (trait kept). Change: our own prop set and effect timing (trait changed). Ref: Features.md:20.
4. Screen distortion on a hit (ours). Why: a short warp reads as impact at a glance. Keep: screen-space distortion as a signal (trait kept). Change: our own wave shape, fired only on a critical hit (trait changed). Ref: lib/renderer/src/shaders/screen_distortion.wgsl; Features.md:22.
5. Cast ring family (ours). Why: rings at cast start tell the player the attack is coming. Keep: a start ring plus a separate channel circle (trait kept). Change: our own geometry and colours (trait changed). Ref: Features.md:38-39.

## Cross-link to our cells
- camera: sprite projection and depth (docs/internal/sprite-projection.md); no camera code read beyond the doc heading.
- zones: map props (Features.md:20) and day/night (Features.md:17).
- spawns: companion AI (brief 2) only; spawn tables not read.
- loot: none read.
- hud-ui: minimap and world map are listed in Features.md:25-26; not read.
- vfx: effect families (Features.md:33-48; briefs 4 and 5).
- animation: sprite and model animation (Features.md:21, 24).
- sound: no audio in repo (sound toggles only, README.md:106).
