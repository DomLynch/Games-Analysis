# Asset audit: djhenry-eqoxide (AU016)

Path on VPS (read-only): /mnt/frankendom-donors/djhenry-eqoxide/

## Licence (what the files say)
- Code licence: none stated. There is no LICENSE, COPYING or NOTICE file at repo root or in a shallow tree walk (depth 3), and no licence field in Cargo.toml or the crate Cargo.toml files that were grepped.
- Asset licence: none stated in the repo. The repo ships no game art. README and docs say content comes from the user's own EQ install and an external asset server (see below).

## Asset inventory
- The repo holds about 275 files, 11 MB in total (du). Non-code content is limited to:
  - tests/fixtures/manifest-v1.json and manifest-reader2.json (809 bytes each, small JSON manifests with blake3 hashes, fixture/demo set).
  - WGSL shaders, 11 files in crates/eqoxide-renderer/src/shaders/ (zone, zone_instanced, character, character_skinned, billboard, sky, weather, shadow, shadow_masked_instanced, nav_debug, skin_probe). These are code, not art. Line counts 34 to 139.
  - tests/synthetic_scenes/mod.rs (code).
- Real EQ art is NOT in the repo. The renderer reads EQ .s3d archives from the user's own install (config.yaml: assets_path ~/eq_assets/EQ_Files; docs/character-models.md names ~/eq_assets/everquest_rof2 and global{race}{gender}_chr.s3d archives; gpu.rs:49 names gequip*.s3d for held weapons). Converted .glb outputs are gitignored (docs/character-models.md:33).
- Derived assets (models, textures, string table, maps) are fetched from a separate eqoxide_asset_server over HTTP into an XDG cache (README.md:32). That server is not in this repo.

| group | path | count_hint | licence | class | note |
|---|---|---|---|---|---|
| EQ character/zone/equipment art | not in repo; user install ~/eq_assets | n/a | none stated; source is the user's own EQ client data | C | Original game data; the repo states its use, not its licence |
| Derived GLB models/textures/maps | external eqoxide_asset_server (not in repo) | n/a | none stated | C | Not read; server not in this donor tree |
| Shaders (WGSL) | crates/eqoxide-renderer/src/shaders/*.wgsl | 11 files, 34-139 lines | none stated | D | Code, not art; technique reference only |
| Test manifests | tests/fixtures/manifest-v1.json, manifest-reader2.json | 2 files, 809 bytes each | none stated | D | Test data only |

## Rights-holder status (repo files only)
- Not named. README.md:15 says the client "targets **EQEmu servers only**" and is "not for, and does not work with, official EverQuest servers". Docs say the art is verified against the "original Titanium game client" (docs/equipment-textures-findings.md:4). So: uses original game data from the user's own install, which the file states is proprietary-origin content; the copyright owner is not named in the files. Treat as proprietary (class C).

## best_class
C for everything art-related (inspiration only). No group in the repo is class A or B. Class D for the non-code files that do exist.

## INSPIRATION (own words)
- Additive glow surfaces: the asset pipeline tags fire/glow materials with an additive flag, and the renderer blends them with pure add so black texels vanish. Recreate with an additive pass for torches, forges and magic. Ref: crates/eqoxide-assets/src/lib.rs:22 (material extras) and crates/eqoxide-renderer/src/pipeline.rs (additive comment near line 507).
- Animated surfaces: a material carries a millisecond interval and a list of frame images (eqAnim), read at lib.rs:37. Good for flicker, water and portal shimmer without shader code. Ref: crates/eqoxide-assets/src/lib.rs:37.
- Foliage cutout: masked alpha test at half alpha (MASK_ALPHA_CUTOFF_U8 = 128) plus a fallback that keys out the corner colour when a bake forgot to. The lesson for us: make the background-key step explicit in our texture pipeline and check it. Ref: crates/eqoxide-assets/src/lib.rs:55-67 and :92.
- Armour as region variants: material names encode region code, material and variant number (HOM CH 00 01 style). Equipment is drawn as several disjoint pieces that together form the full body, not as overlapping alternates. Ref: docs/equipment-textures-findings.md (GLB primitive structure and material name sections).
- Held weapons are separate models loaded per item and drawn at a hand bone rather than baked into the body. Ref: crates/eqoxide-renderer/src/gpu.rs:49.
- Re-grounding per clip: a skinned humanoid is scaled to a target height and re-centred and re-grounded from the current animation clip bounds, not the bind pose. Useful for NPCs with different idle and attack poses. Ref: docs/character-models.md, section "Normalization: scale + position".
- Height by race table: relative race sizes come from the game's own height rule (README feature table, "Correct relative race sizes"). Use our own table when we design size classes.

## Briefs
- label: Torch and forge glow (own label)
  why: a warm pulse that reads as light without a real light source; additive so dark pixels disappear
  keep: additive glow layer; short flicker cycle of 3-4 frames; soft edge falloff
  change: our own palette ramp (cooler ember tone), different frame count, a light-cast halo instead of a flat sprite
  ref: crates/eqoxide-assets/src/lib.rs:22 and :37
- label: Half-alpha foliage card (own label)
  why: masked leaves read as cut-out silhouettes with cheap overdraw
  keep: alpha-test cutout at 0.5; corner-key background removal at bake time
  change: our leaf shape language, two-colour ramp per tree, wind sway on the top only
  ref: crates/eqoxide-assets/src/lib.rs:55-67
- label: Region-variant armour kit (own label)
  why: armour built from disjoint region pieces with variant numbers lets one body take many looks
  keep: region + material + variant naming; full body covered by pieces that do not overlap
  change: our own trim and ornament per set; different shoulder and gauntlet silhouettes; metal pieces with a gold-plate ramp of our own
  ref: docs/equipment-textures-findings.md (GLB primitive structure, material name section)
- label: Per-clip grounded humanoid (own label)
  why: feet stay planted through very different attack and idle poses
  keep: recentre and ground per clip; target height per archetype
  change: our rig proportions, different head and limb ratio, our own clip set
  ref: docs/character-models.md (Normalization section)
- label: Additive fire veil (own label)
  why: a large soft glow mesh over a fire pit or spell that adds colour without hard edges
  keep: additive blend, animated frame list
  change: our own shape (a rising plume rather than a flat fan), two-tone colour
  ref: crates/eqoxide-renderer/src/pipeline.rs (additive comment near line 507)

## Cross-link to our cell topics
- vfx: additive glow and frame-list animation are directly relevant (lib.rs:22, :37).
- hud-ui: not read in this donor (src/hud.rs only grepped).
- animation: skinning and per-clip grounding (docs/character-models.md).
- loot and spawns: equipment region naming (docs/equipment-textures-findings.md).
- camera and zones: zone terrain axis mapping (docs/zone-rendering.md, Terrain section) is code-level only; no art in repo.
- sound: no audio files found in repo (no wav, mp3, ogg).
