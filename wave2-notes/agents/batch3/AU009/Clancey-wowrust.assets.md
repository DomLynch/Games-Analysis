# Clancey-wowrust: asset audit (AU009)

Scope: VPS tree /mnt/frankendom-donors/Clancey-wowrust/. Read-only. Not legal advice; this records what the files say.

## Licences (as the files say)
- Code: none stated. README ends "Private project. Not for distribution." (line 156). No LICENSE file in the tree. Root Cargo.toml has no licence line.
- Assets: none stated. The repo holds no game data. README line 34 says the user supplies "18 MPQ archives (~17GB)" from a WoW 3.3.5a install.

## Rights-holder status (repo files only)
unknown. Private project per README; no copyright holder named. The code handles Blizzard_ addon names (crates/wow-ui/src/lib.rs line 551) and MPQ FrameXML paths (line 617), which point at original game data the user supplies.

## Asset inventory
- No images, audio, models (M2, WMO), textures (BLP), terrain (ADT), maps or DBC files are in the repo. Extension counts: rs 102, toml 19, sh 7, md 7, lua 4, wgsl 2, toc 1.
- Shaders: crates/wow-render/shaders/text.wgsl and ui.wgsl (about 0.9 KB each). Text and UI quads.
- Lua: Interface/AddOns/TestAddon/TestAddon.lua and .toc, plus two SavedVariables Lua files under WTF/. The author's own SavedVariables test.
- Config: config/default.toml, config/keybinds.toml.
- Docs: README, PLAN.md (23 KB), IMPLEMENTATION_PLAN.md, crates/wow-formats/README_DBC_SKY.md, and crate READMEs.
- Game data: none in repo. README line 34 and the env table (WOWRUST_DATA_PATH) point at the user's install.

## Classes by group
- Shaders: C (no licence; code, not art).
- Lua test addon and SavedVariables: C (no licence; test code).
- Config: D.
- Game data: D (not in repo).
- best_class: D. No usable non-code content in the repo.

## Inspiration (own words)
- Sky from lookup bands: each zone points at colour bands (top, middle, horizon) and fog, indexed by time of day (README_DBC_SKY.md; README line 89). Our version: our own band table per biome; fog equal to horizon colour.
- Ground from four layers and paint masks: four texture layers blended by per-chunk alpha maps, with five LOD steps (PLAN.md line 139). Our version: our own biome materials, hand-painted masks, noise on blend edges.
- Water as a translucent pass: alpha-blended planes after opaque geometry (README line 93). Our version: our own tint and wave normals on the same sort order.
- Trails for motion: billboarded, additive particles plus ribbons (README line 95). Our version: original trail shapes and per-element colour ramps.
- Text and UI on one small shader pair: glyph atlas via text.wgsl, textured quads via ui.wgsl (text.wgsl line 1).
- Addon-style UI: addons listed by a TOC, scripts run in a Lua VM, system addons in a protected group (crates/wow-ui/src/lib.rs line 551). Our HUD could keep a protected core set of panels.

## Inspiration briefs
1. Dusk sky dome. Why: one gradient sets a zone's mood; horizon-matched fog hides the seam. Keep: colour band per time; fog from horizon; sun disc from clock. Change: our biome palette; a moon in another place; painted clouds. Ref: crates/wow-formats/README_DBC_SKY.md; README.md line 89.
2. Layered painted ground. Why: paint masks over four layers read as ground, not tiles. Keep: mask per chunk; four layers; LOD steps. Change: our materials; hand-painted masks; noise breakup. Ref: PLAN.md line 139.
3. Ribbon trail effect. Why: shows the motion of a swing or spell. Keep: additive trail; billboarded; fading tail. Change: our colour ramp; jagged edge; tail length per ability. Ref: README.md line 95.

## Cross-link
- zones: terrain splatting and sky lookup (PLAN.md; README_DBC_SKY.md).
- vfx: particles and ribbons (README line 95).
- animation: M2 skeletal animation is described; no model files in the repo.
- hud-ui: addon-style UI, glyph atlas text.
- sound: marked not started (README table); no audio files.
- spawns, loot, camera: no assets in the repo.

## Not read or not verified
- crates/wow-ui/src/lib.rs: only grep hits read.
- PLAN.md and IMPLEMENTATION_PLAN.md: only quoted lines read.
- README_DBC_SKY.md: title and first section only.
- .rs sources, Cargo.lock, scripts/*.sh, rust-toolchain.toml: not read.
- No binaries exist in the repo, so none were opened.
