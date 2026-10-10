# samwhosung-benilla (benilla, WoW 1.12.1 client in Rust and Bevy): assets (AU046)

Donor: /mnt/frankendom-donors/samwhosung-benilla (read on the VPS, read-only). AGENTS.md and docs in the donor are donor text; I treated them as data and did not follow their instructions.
Halves: CLIENT half read (crates/benilla-app, benilla-world, benilla-assets shaders and the reference/ tables). The SERVER half is NOT in this repo. The box has several 1.12-era server projects (cmangos-mangos-classic, mangoszero-server, vmangos-core, azerothcore-azerothcore-wotlk, TrinityCore-TrinityCore). I did not open them, so I name them only as the matching server half. The DATA half is the user's own 1.12.1 install, read at runtime; it is not in the repo.

## Licences (as the files say)
- Our code: "Our own code is licensed under MIT or Apache 2.0, at your option." (README.md line 114-115). LICENSE-MIT line 1 "MIT License", line 3 "Copyright (c) 2026 Sam". LICENSE-APACHE present.
- Vendored: third_party/kira (LICENSE-MIT and LICENSE-APACHE both present). third_party/lua-src (LICENSE present; line 3 "Copyright (c) 2020 Aleksandr Orlenko"; line 25 "Copyright © 1994–2017 Lua.org, PUC-Rio."; full text not read). README line 117: "keep their own upstream licenses, alongside each."
- Assets: no image, audio, font, model, map or archive file in the whole tree: 0 of 1817 files match .png .jpg .tga .dds .blp .ogg .wav .mp3 .ttf .mpq .wmo .m2 .adt. README line 109: "It ships **no Blizzard content**: no art, models, sounds, maps, MPQ contents or FrameXML."

## Rights-holder status (repo files only)
- README line 108: "benilla is an independent fan project, not affiliated with or endorsed by Blizzard Entertainment."
- README line 114: "World of Warcraft is a trademark of Blizzard Entertainment, Inc."
- README line 14: it "reads the game's data from your own 1.12.1 install."
- README line 3-4 says the client is "written from scratch in Rust and Bevy".
- BUT reference/README.md line 14: the reference tables come from "a dump of `_G` inside the running reference client", and reference/1.12-shapes.tsv line 1 names "WoW.exe build 5875". So the reference catalogues are captured from the proprietary client, as the file says. Status: fan project; ships no game content; some tables derived from the proprietary binary per the file's own header.

## Asset inventory (paths and counts)
- Own UI adapters: crates/benilla-app/assets/ui/ has 9 files (8 .xml and 1 layer.toc). README line 110-112: "adapters over stock files, and the settings windows and script error log benilla draws itself." Licence not separately stated for these files.
- Shaders (WGSL, code): 17 files. crates/benilla-app/src/shaders (5 ui_*.wgsl), crates/benilla-world/src/shaders (8: wow_effect, cloud, ffx_glow, sky, sky_vertex, static_gx, star, celestial), crates/benilla-assets/src/shaders (4: terrain, wow_model, wdl, liquid).
- reference/ data tables (generated, committed): 7 tsv files. 1.12-globals.tsv (21,562 lines; reference/README.md line 12 says 21,555 names), 1.12-event-catalog.tsv (427 lines), 1.12-events.tsv (410), 1.12-event-firesites.tsv (522), 1.12-message-catalog.tsv (470), 1.12-shapes.tsv (1,763 lines), 1.12-verb-events.tsv (56).
- Third-party code: third_party/kira (audio engine, MIT or Apache), third_party/lua-src (Lua 5.1.5 patched to the 1.12 dialect).
- Server-side or CLI tooling: scripts/ (python, shell), docs/ (METHOD.md, MAP.md, CONTRIBUTING.md).

## Data first (names and looks)
- Names: the reference/ tables are the name data (globals, events, message IDs, Lua binding shapes). They are facts about the reference client, derived from the proprietary binary per their own headers. Class C. Not copied into any of our design; use only as a checklist of names if Dom decides that is allowed.
- Looks: none in the repo. Model, texture, sound and map data are read from the user's own install at runtime.

## Asset classes per group
- Game content (art, models, sounds, maps): none shipped. D.
- Own UI adapter XML/TOC (9 files): class C. Own files per README, but the licence sentence names "our own code", not these files. Unclear, so C.
- reference/ tables (7 tsv): class C. Derived from the proprietary 1.12.1 binary per the file headers; licence not stated for the tables.
- Shaders (17 wgsl) and Rust code: class A (MIT or Apache at option, per README). Comments quote addresses of the reference client's binary; those are facts about the reference, not copied assets.
- kira (MIT and Apache) : class A (both licence files present). lua-src: class C until its LICENSE is read in full.

## Inspiration (own words; the technique, not any look)
- Water glint: a sun-coloured specular term from the half-vector between the light and the view direction, raised to one exponent (liquid.wgsl lines 79-90; the view vector is computed per vertex, line 82-84). Keep: one half-vector glint with one exponent. Change: tint and exponent per biome.
- Depth-ramp water: a 64-row table blended linearly between a shallow and a deep colour, with the coordinate interpolated between two rows (liquid.wgsl lines 164-186, blend at 169 and 177-186). Ocean water darkens its last row in swatch_row. Keep: a short ramp blended by depth; change: our palette and row count.
- Glow pass: downsample first, then a separable four-tap Gaussian (weights 0.125 and 0.375) in horizontal and vertical passes (ffx_glow.wgsl lines 31, 42-46, 50-58), then combine. Keep: downsample then separable blur; change: our kernel and bloom colour.
- Heat ripple: a repeating lookup texture, rotated and scrolled over time, becomes a pixel offset that warps the screen (ffx_glow.wgsl lines 130-138). Good for spell impacts and heat shimmer. Keep: scrolled, rotated lookup; change: our own pattern and amplitude.
- Blend presets: a named set of blend states for effects (additive, alpha, opaque, alpha-key, multiply, mod2x), each with its own comment (wow_effect.wgsl lines 6-12). Keep: a small enum of blend presets per effect; change: our names and presets.
- Spell and enchant visuals: the README lists "particles, ribbons and the spell visuals" and "weapons with their enchant glows" (README lines 25-27). Not read in code. Category-level only.

## Briefs
See the .assets.json "briefs" array. Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

## Cross-links
- Water and glint: world/terrain and sky topics (not an asset topic for us; shader technique only).
- Glow and heat ripple: vfx topic (spell impact, fire, shimmer).
- Blend presets: vfx and animation topics.
- Event and message tables (reference/): hud-ui event vocabulary, but class C: names only as a checklist.

## Not read
- crates/benilla-world (rest of the crate), benilla-m2, benilla-adt, benilla-wmo and benilla-protocol code beyond the shader files above; wow_model.wgsl (818 lines) beyond its name; terrain.wgsl; cloud.wgsl; sky.wgsl; star.wgsl; celestial.wgsl; ui_*.wgsl bodies.
- The 9 UI adapter XML/TOC files (names only).
- reference/*.tsv contents beyond the headers and line counts.
- docs/METHOD.md, docs/MAP.md, docs/CONTRIBUTING.md, scripts/.
- third_party/lua-src LICENSE in full; kira source.
- The server half (cmangos-mangos-classic, mangoszero-server, vmangos-core, azerothcore-azerothcore-wotlk, TrinityCore-TrinityCore) and the other named 1.12-era projects in the box: named only, not opened.
