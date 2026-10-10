# daeken-OpenEQ: asset audit (AU013)

Source: /mnt/frankendom-donors/daeken-OpenEQ (read-only, VPS). Summary is a record of what the files say, not a legal opinion.

## Halves
- Client half: read (crates/openeq*, Rust, Bevy and wgpu).
- Server half: NOT READ. No EQEmu server source is in the listing. Only server patches (tools/eqemu-patches/*.patch) are present, and they were not read beyond their names.
- Data-pack half: the user's own EverQuest install. Not in the box and not read.

## Licences (as the files state them)
- Code: `MIT OR Apache-2.0`, set in the workspace `Cargo.toml` (line 14) and inherited by every crate. There is no LICENSE or COPYING file in the tree.
- Assets: no asset licence. README line 331: "No original client assets are distributed here."
- Rights holder: unclear. The client reads the user's own EverQuest install (README line 4). Some files are derived from reverse engineering of the original client DLL. No game copyright holder is named in the repo.

## Asset inventory
- Shipped game art, models, audio, maps: none. A scan by extension found no png, dds, wav, glb, mid or ttf files.
- Shaders (code): `crates/openeq-render/src/shaders/*.wgsl`, 14 files. Code licence applies.
- Zone atmosphere table: `crates/openeq-assets/data/peq-zone-environment.txt`, 68 KB text. Header cites a third-party EQEmu database dump. No licence line. Class C.
- Sky colour sample table: `crates/openeq-assets/src/environment/native_color_map_samples.txt`, 9 KB. Derived from the original DLL. Class C.
- Binary blobs: `native_witness.bin` (38 KB) and `native_controls.bin` (10 KB). Not opened. Class C.
- Texture names in docs: `Di_ent_metal01_c.dds` and similar. Names only, no bytes. Class D.

## Classes by group
- A: WGSL shaders and server tool code (under the code licence).
- C: zone data table, sky sample table, binary blobs.
- D: nothing shipped as art or audio.
- best_class: D.

## Rights status
Unclear and original-data dependent. The repo is a client that needs the user's own original data. It does not ship that data.

## Inspiration (own words)
- Two-layer lava: one atlas sampled twice with two scroll offsets, blended. `crates/openeq-render/src/shaders/lava.wgsl`.
- Waterfall curtain: colour and opacity scroll independently from one texture, with an alpha cutoff. `docs/EQG_WATERFALL_RENDERING.md`.
- Detail tint layer: a second colour texture on its own UV scale, multiplied over the base. `docs/EQG_TER_LAYERED_COLOR.md`.
- Fixture-only animation: a lamp rotates on one axis while its mount stays still. `docs/WLD_LAMP_ANIMATION.md`.
- Spell anchoring: effects use skeleton hand sockets, with a camera-relative fallback in first person. `docs/SPELL_EFFECT_RENDERING.md`.
- Time-of-day ambient light from a colour table sampled at fixed times. `docs/SKY_LIGHT_COLOR_INPUTS.md`.
- Per-zone fog and clip data in one flat table. `crates/openeq-assets/data/peq-zone-environment.txt` (header).
- State-based HUD art (normal, pressed, hovered, disabled) with clipped gauge fills. `crates/openeq-ui/README.md`.

## Briefs
- Molten pool: two offset layers, our own crust pattern, cooler violet tint.
- Falling sheet: independent scroll on colour and opacity, a wider top, frayed base and foam strip.
- Hanging lantern: a fixed mount with a chain swing instead of a spin, warm ember light, brass cage.
- Casting hand glow: socket anchoring with a camera-relative first-person fallback, school colours, curling arc.

## Cross-link to our cells
- Camera: no asset content. Camera rules are in the code.
- Zones: the fog and clip table is a useful data layout (no content to take).
- Spawns and loot: none.
- hud-ui: state-art pattern for bars and frames.
- vfx: lava, waterfall and spell anchoring are good technique references.
- animation: the lamp rotation and the socket rule.
- sound: none shipped. The XMI music plan (`docs/XMI_PLAN.md`) describes parsing original music containers, with no music included.

## Not read
Binary blobs; body of the two data tables (header only); docs other than the cited ones (titles and first lines only); other shaders; Cargo.lock; tools bodies; third-party dependency licences (not in the tree).
