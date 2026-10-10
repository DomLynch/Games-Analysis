# Asset audit: Eve-of-Darkness-dark-forge (AU020)

Donor tree: /mnt/frankendom-donors/Eve-of-Darkness-dark-forge (read-only, VPS).

## Licence (what the files say)
- Code: no LICENSE, COPYING or licence header in the tree. Cargo.toml has no license key. Status: not stated.
- Assets: none stated. The only non-code file is one archive sample.
- Name check: the folder is called "Eve-of-Darkness", but mpak/src/main.rs says the tool is for "the Dark Age of Camelot game client" (mpak/src/main.rs:6). The repo does not say what the folder name refers to.

## Rights-holder status
Unknown. The repo names a game client format and says it is "a proprietary compression format" (mpak/src/main.rs:7). It names no owner and no licence.

## Asset inventory
- 14 files in total: Rust sources (dark_forge/src/lib.rs, dark_forge/src/mpk/mpak.rs, mpk/mod.rs, file_info.rs, mpak/src/main.rs), Cargo manifests and locks, .gitignore files.
- One sample: mpak/samples/csv001.mpk, 19,840 bytes. The header (read with od) starts with the MPAK magic, and the entries have zlib-style headers. Not decompressed.
- No 2D sprites, 3D models, audio, fonts, maps or dialogue text in the tree.

## Class by group
- MPAK game-archive sample: C (game-client file, no licence, do not use).
- Art, audio, maps, text: none found, D.
- Best class for the donor: D.

## Inspiration (own words)
- Pack layout: one archive holding many named entries, a directory table with name and offset, and per-entry compression. A reference for our own pack format idea. The code is ours to write.
- Command-line shape: one archive argument plus list and stream subcommands, so an asset can be checked without unpacking the whole pack. Worth copying for our asset tools.
- Two crates: the reader is a library and the CLI depends on it, so other tools can reuse it.
- There is nothing visual here to recreate. Do not use the sample as a look reference.

## Briefs
None. This donor has no creatures, items, armour, zones or effects, so no brief is written.

## Cross-link to our cell topics
- Asset pipeline and tooling (not one of the listed topics): the only useful part of this donor.
- camera, zones, spawns, loot, hud-ui, vfx, animation, sound: no assets here.

## Not read
- Compressed contents of the sample archive.
- dark_forge/src/mpk/file_info.rs (not opened).
- mpak.rs and main.rs: first few hundred bytes only.
- Cargo.lock files.
