# Eve-of-Darkness-dark-forge (catalogue, cell DC025)

Donor tree: /mnt/frankendom-donors/Eve-of-Darkness-dark-forge (read-only, VPS).
Licence and rights: no LICENSE, COPYING or licence header; Cargo.toml has no license key. Status not stated. Not a legal opinion.
Halves: the donor is a single Rust tool tree, not a game. No server or client game half, and no data pack, in the box.

## What I checked
- Listed the tree with a narrow ls and find (dark_forge/, mpak/ only).
- Counted lines of the Rust sources with wc (about 339 lines across the source files).
- Ran one keyword grep over dark_forge and mpak for monster, weapon, armour, dungeon, zone, creature, sword and dragon. No hits.
- I did not open the Rust source bodies in this pass. Their content is taken from the asset audit AU020 (the tool reads a proprietary game-client archive format; it is a reader, not game data).

## Verdict
No catalogue content. The donor is an archive reader for a game-client format, with one archive sample (mpak/samples/csv001.mpk) that I did not decompress.

## 1. Creatures / beasts
None. Count: 0.

## 2. Classes / races / factions
None.

## 3. Weapons
None.

## 4. Armour / gear
None.

## 5. Zones / dungeons
None.

## 6. Item and effect looks
None. The audit found no art, audio, fonts, maps or dialogue text in the tree.

## 7. Inspiration for Frankendom
None from game content. The archive-layout idea (one file with a named directory table, per-entry compression, and a list subcommand that checks one entry without unpacking everything) is asset-pipeline tooling, not a catalogue topic. It is recorded in AU020 and not repeated here.

## Not read
- The Rust source bodies (only the grep and line counts above).
- Compressed contents of mpak/samples/csv001.mpk (not decompressed, by design).
- Cargo.lock files.
