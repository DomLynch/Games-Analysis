# MelvinGr-ProjectFaolan (asset audit, AU034)

Donor: MelvinGr-ProjectFaolan (VPS: /mnt/frankendom-donors/MelvinGr-ProjectFaolan/)
Code licence: none stated (no LICENSE/COPYING file; a grep of text files for licen/copyright found no licence text).
Asset licence: none stated; the box has no art, audio or map folders.
Halves read: SERVER half (Faolan/, Faolan.Core/ data entities and enums). CLIENT half: not in the box (no Age of Conan client files). DATA half: Faolan.Files/projectfaolan.db and Faolan/faolan.db are binary SQLite files, NOT read; the only data read is the entity classes and enums.
Paired donor in the box: not searched.

## Licence and rights (from the files)
- README.md line 1: the project is marked "NOT UNDER DEVELOPMENT". Line 3 says it is an Age of Conan server protocol emulator (C#, MySQL/SQLite).
- Rights-holder status: unknown from repo files. The README names a game but says nothing about who holds rights to it.
- Faolan.Files/Archive/ holds four archives: Faolan-Assembla.zip, Faolan-GoogleCode.zip, Faolan-Pre-Assembla.rar, Faolan-Private-Assembla.zip. Their listings show old source-tree paths (trunk/, projects/, .svn). The file names say "Private" and "Pre". Provenance is not stated in the repo. Not opened, not extracted. Class C (unclear).

## Asset inventory
- Faolan.Files/logo.png: 1 PNG, 2277 bytes. No licence stated. Class C. Not opened.
- Faolan.Files/projectfaolan.db (50176 bytes) and Faolan/faolan.db: SQLite. Not opened. Class C (unclear contents).
- Faolan/Resources/bigboy.txt: one line of hex bytes (0x.. pairs), looks like a captured packet byte dump, not art. Read only the first 300 bytes. Class D.
- Faolan/Migrations: 3 files (one migration and its designer file, one model snapshot). Schema code, not content. Not read beyond names.
- Faolan.Core/Enums: 13 enum files. Enums/Class.cs holds 12 class names with byte codes (AoC-style class names). Game-specific names: do not reuse. Class C for the names.
- Art, 2D sprites, 3D models, audio, fonts, maps: none in the box. Class D.

## Data tables (data first)
- Faolan.Core/Data/Npc.cs (28 lines): NPC record with Name, Action, Level, Fraction (a faction id), Health, Stamina, Mana, GetExp, MapId, plus nav properties to Body and Equipment.
- Faolan.Core/Data/Spell.cs (17 lines): Spell record with Name, CastTime, EffectSpell, Level, ManaCost, MaxDamage, MinDamage.
- Faolan.Core/Data/Item.cs (12 lines): item record (not read in detail).
- Faolan/faolan.json: server config (ports 7002, 7010, 7011, 7013; dev and prod DB paths; WelcomeString).
- The gameplay tables are inside the binary DB, which was not read.

## Inspiration (own words)
- A spell is one flat record: cast time, mana cost, min and max damage, level, and a link to an effect. Keep the flat record shape for a data-driven skill table; our spells need a telegraph window too. Read: Faolan.Core/Data/Spell.cs lines 10-15.
- NPCs carry a single integer faction (Fraction) next to health, stamina, mana and exp reward. A single faction id is a cheap way to group enemies for a many-on-one hate list. Read: Faolan.Core/Data/Npc.cs lines 14-18.
- The class kit is one byte-typed enum with twelve entries. A small enum per archetype is a clean way to keep kits as data. Names are game-specific; keep the shape only.
- A hex-byte packet dump (Faolan/Resources/bigboy.txt) is a replay-fixture idea: recorded wire bytes as test input for a fight-record replay (parity row 19). Read only the first 300 bytes.
- Separate dev and production database paths in one JSON config. Small, but it keeps local and live data apart.

## Briefs
No visual content. These are data-level briefs (no creature, armour or zone art to describe).
1. Label: "Flat spell record". Why: one row per skill makes a kit easy to tune. Keep: flat record with cast time, cost and min/max damage. Change: recreate as a distinct original: our spells reference fight-engine ids and carry a telegraph window instead of a plain cast time. Ref: Faolan.Core/Data/Spell.cs:10-15.
2. Label: "Faction tag on each enemy". Why: one integer groups enemies for shared aggro. Keep: an integer faction on each NPC row. Change: recreate as a distinct original: our tags are hate-list groups with a leash rule, not a plain number. Ref: Faolan.Core/Data/Npc.cs:14.
3. Label: "Archetype enum". Why: a compact list of archetypes keeps kits data-driven. Keep: a byte-typed list of archetype codes. Change: recreate as a distinct original: our kits are combinations of three tags, with our own names. Ref: Faolan.Core/Enums/Class.cs:3.

## Cross-link
- Spells and NPC records map to combat (row 3 guard and row 13 specials), but this donor has no combat code read yet.
- Packet dump idea maps to row 19 (fight record and replay).
- No art, audio or maps for camera, zones, spawns, loot, hud-ui, vfx, animation or sound.

## Not read
- All binary files: projectfaolan.db, faolan.db, logo.png, and the four archives (listings only).
- Faolan.Core/Network (7 files), GameServer (13 files), and the rest of the 75 .cs files (not opened).
- CLAUDE.md and AGENTS.md: none present in this donor.
