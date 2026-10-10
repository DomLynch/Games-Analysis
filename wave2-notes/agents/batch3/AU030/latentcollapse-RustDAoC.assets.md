# latentcollapse-RustDAoC (asset audit, AU030)

Donor: /mnt/frankendom-donors/latentcollapse-RustDAoC/
Half read: client side (headers and selected bodies), data tables, shader headers. Server half (CamelotCore, README line 50) is not in this box.

## Licence (as the files say)
- Code: GPL-3.0-or-later. Cargo.toml line 16; LICENSE is the GNU GPL v3 text; README line 88.
- Assets: README line 7 'This repository does not contain retail assets'; README line 76 retail assets kept out.
- Retail-derived data: data/client_tables/key_names.tsv line 1 'EXTRACTED FROM game1127.dll's string table'. Golden and diagnostic PNGs (5) and a 68,752-byte login capture have no licence line. Unclear, class C.

## Rights-holder status (conflicting, flag it)
README line 74: protocol derived from packet captures from a legally obtained client, public behaviour and DOLSharp. README line 76: no code recovered by decompiling the retail client. But key_names.tsv line 1 says the names come from the retail DLL string table, and the golden PNGs are not described. The retail rights owner is not named in the repo.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Rust source | crates/*/src/*.rs | 256 | B (GPL code; clean-room shape only for us) |
| WGSL shaders | crates/caer-render/src/*.wgsl | 10 | B |
| Engineering data tables | data/terrain_flatten.tsv; data/fixture_rotations.tsv; data/client_tables/*.tsv | ~870 lines in 8 files | B; client_tables C |
| PNG goldens and diagnostics | crates/caer-render/tests/ | 5 | C (not opened) |
| Login capture | crates/caer-world/tests/fixtures/rustdaoc_login_20260714.bin | 68,752 bytes | C (not opened) |
| Lua addons | crates/caer-script/addons/ | 2 main.lua | B |
| Harness fixtures | crates/caer-harness/tests/fixtures/ | 4 json | B |

Best class: B (GPL code). No usable non-code asset is shipped.

## Inspiration (own words)
- Palette fold: posed bones are streamed once and a compute pass folds each part's inverse-bind into one palette (palette_fold.wgsl lines 1-3). Caveat: uniform scale only (lines 6-8).
- Three-table creature resolution: model id to catalogue row to shape, with a separate skin (monsters.rs lines 1-19).
- Translucent water drawn last with depth writes off (water.wgsl lines 1-2).
- Soft additive billboards as effects, labelled as placeholder (particle_billboard.wgsl lines 1-2).
- Dungeon as a palette of pieces plus placement rows, empty zone = zero rows (dungeon.rs lines 1-12).
- Terrain flatten patches with falloff (terrain_flatten.tsv line 1).
- Deterministic state boundary between world and renderer, UI, audio (README line 50).

## Briefs (recreate as clearly distinct originals, never a copy)
- Dungeon piece palette and placement rows: keep palette and rows and the zero-rows check; change to ring arenas with our pieces and a hit radius per placement. Ref dungeon.rs lines 1-12.
- Translucent blood pool: keep drawn-last and depth-write-off; change to a darker rim, a ripple from the hit point, and a 6 s fade. Ref water.wgsl lines 1-2.
- Soft spark for hit impact: keep camera-facing additive quad; change to a shard-shaped two-frame ember flash on the impact frame. Ref particle_billboard.wgsl lines 1-2.
- One creature shape, many skins: keep the shape and skin split; change so each family keeps its silhouette cue (horns or crest). Ref monsters.rs lines 1-19.
- Terrain flatten patch: keep radius, target height and falloff rows; change to our own falloff with a flat duel core. Ref terrain_flatten.tsv lines 1-2 (coordinates not copied).

## Cross-link
- VFX: billboards, water (yes). Animation: palette fold skinning (yes). Zones: dungeon chunks, flatten patches, coverage (yes). Camera and HUD: uiquad.wgsl and HUD golden not read; README line 46 says camera and UI must match players. Sound: README line 22 'Basic audio routing' only. Spawns and loot: src names in caer-world not read.

## Not read
Most .rs bodies (caer-protocol fully, caer-world, caer-render, caer-client, caer-script, caer-harness); WGSL bodies beyond headers; the 5 PNGs; the login .bin; client_tables beyond headers; Cargo.lock; the CamelotCore server.
