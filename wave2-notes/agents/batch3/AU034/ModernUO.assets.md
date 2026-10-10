# ModernUO (asset audit, AU034)

Donor: ModernUO (VPS: /mnt/frankendom-donors/ModernUO/)
Code licence: GPL-3.0 (LICENSE, GNU GPL v3 text; header "Copyright 2019-2020 ModernUO Development Team (Kamron Batman)").
Asset licence: no separate asset licence. The files do not state one for Distribution/Data or branding/. The repo LICENSE is the only licence statement. THIRD-PARTY-NOTICES lists dotnet (MIT), mkdocs and mkdocs-material; no notice for game data.
Halves read:
- SERVER half: Projects/UOContent/Engines/Spawners (BaseSpawner.cs, SpawnerEntry.cs, Spawner.cs) read by grep and by line ranges. Projects/Server not read.
- DATA half: Distribution/Data (folder listing, one spawn file, names.json head, file counts). Most JSON not read.
- CLIENT half: none in box. README.md line 132 says the server asks the user for the game data file locations on first run, so the original game's art, maps and sound are not in the repo.
Paired donor in the box: not searched.

## Licence and rights (from the files)
- LICENSE line 1: "Copyright 2019-2020 ModernUO Development Team (Kamron Batman)". Line 4: GPL v3 text.
- THIRD-PARTY-NOTICES line 11: "License notice for dotnet". Other headings: mkdocs (line 37) and mkdocs-material (line 66).
- Rights-holder status: the code is by the ModernUO Development Team per LICENSE. The status of the emulated game's content is unknown from the repo files. The repo does not state where the spawn and name data came from.

## Asset inventory
- Distribution/Data/Spawns/: 109 JSON spawn files in region folders: shared/felucca 30, shared/trammel 29, shared/ilshenar 14, shared/malas 8, shared/tokuno 6, uoml/ and post-uoml/ sets (trammel, malas, termur). Class C (origin of the lists not stated).
- Distribution/Data/Locations/: 6 JSON files (felucca, ilshenar, malas, termur, tokuno, trammel). Class C.
- Distribution/Data top level: 10 JSON (assemblies, categorization, expansions, map-definitions, names, npc-speeds, regions, shrink, skills, teleporters), 6 CFG (bodyTable, containers, MLQuests, pageresponse, signs, treasure), plus folders Bulk Orders, commands, Components, Decoration, Items, Professions. Class B for generic config (repo GPL), C for names and tables that are game-specific.
- Distribution/Data/names.json: 600 lines, name lists grouped by culture type (first entry type "tokuno male"). Class C. Only the head read.
- Distribution/Data/Items/ItemBounds.bin: binary. Not read. Class C.
- Projects/UOContent/Migrations: 3846 JSON files named per class and version (serialization migration records). Projects/Server/Migrations: 12 JSON. Code-level data, not content. Class B (repo). Names only.
- Projects/UOContent.Tests/.../Fixtures/*.bin: 3 binary spawner fixtures. Not read. Class B (repo).
- branding/: muo.svg, gears.svg, build-tool.svg (logos). Class B (repo). Not opened.
- Projects/Application/MUO.ico and Projects/BuildTool/build-tool.ico: icons. Class B (repo). Not opened.
- rider-settings.zip (3862 bytes): IDE settings archive. Not opened. Class D.
- Art, 2D sprites, 3D models, maps, audio, fonts: none in the box. Class D.

## Data tables (data first)
- Spawn records (Distribution/Data/Spawns/shared/trammel/Reagents.json, read in full structure): a spawner JSON object with guid, name, location, map, count (population cap), minDelay and maxDelay (respawn window), team, homeRange, walkingRange, and entries. Each entry has name, maxCount and probability. Ref lines 9, 12, 15-16. Class C.
- names.json: name lists keyed by culture type. Format: type then an array of strings. Class C. Names not copied.
- Localisation strings: no separate string table in the box beyond names.json. Projects/UOContent/Text holds one .cs file (TextDefinitionExtensions.cs), so it is not a string table.

## Inspiration (own words)
- A spawner is one data record: a population cap, a respawn delay window, a home radius, a walking radius, a team, and a list of entries, each with its own cap and weight. This is the row 23 shape in data. Ref Reagents.json lines 9-16; BaseSpawner.cs lines 49-50 (default delays five and ten minutes).
- Weighted pick among non-full entries: Spawn() sums probability over entries that are neither full nor disabled, rolls 1..sum, then walks the list subtracting weights and spawns the first hit. Ref BaseSpawner.cs lines 850-890 (lines 867 and 886).
- Two-level cap: a spawner-wide full check (BaseSpawner.cs line 292) and a per-entry full check (SpawnerEntry.cs line 162). A zone-wide cap and a per-type cap in one rule.
- Respawn rebuilds: Respawn() removes all spawns, spawns count times, then calls DoTimer(). The source comment on that call says "Turn off the timer!", which I did not resolve. Ref BaseSpawner.cs lines 406-415.
- Spawn position: random attempts inside the bounds come first (phase 1), with a max-attempts setting; a spiral scan exists behind a flag (SupportsSpiralScan, line 389). Later phases not read. Ref BaseSpawner.cs lines 442 and 457.
- Walking radius defaults to the home radius when not set. Ref BaseSpawner.cs line 302.
- Gap noted: I did not see a despawn-on-empty grace timer in the parts read. IsEmpty exists (BaseSpawner.cs line 293). Not verified beyond that.

## Briefs
Visual content: none in this donor. The briefs are for spawn-driven encounters, labelled by mechanism. Dom's rule: each brief is a clearly distinct original, never a copy.
1. Label: "Reagent grove" (forage patch). Why: a dense patch of gatherable nodes makes a walk feel rewarding. Keep: one spawner with a large population cap and a respawn window of about 11-23 minutes, with weighted entries. Change: recreate as a distinct original: elemental shrine nodes on a 2-4 minute cadence, glowing rather than leafy. Ref: Distribution/Data/Spawns/shared/trammel/Reagents.json lines 9-16.
2. Label: "Leashed patrol spawner". Why: a home radius and a wider walk radius give a clear territory without hard walls. Keep: home radius plus a walk radius that defaults to it. Change: recreate as a distinct original: the leash is a per-zone data field with a wander ring instead of square bounds. Ref: Reagents.json line 12; BaseSpawner.cs line 302.
3. Label: "Rare champion slot". Why: an entry with its own cap and a low weight gives a rare encounter inside a normal spawner. Keep: a per-entry cap and weight inside the same spawner. Change: recreate as a distinct original: a warning telegraph before it appears and its own voice. Ref: BaseSpawner.cs lines 850-890; SpawnerEntry.cs line 162.

## Cross-link
- spawns and encounters (row 23, zone population): strongest match. Spawner caps, respawn window, leash and weighted entries are the mechanism. Code is in the engine, not in the assets.
- loot: the reagent entries are a forage table. No loot tables read.
- hud-ui, vfx, sound, animation, camera: no assets in the box.

## Not read
- Distribution/Data/Spawns: 108 of 109 spawn files (only Reagents.json read, and only its structure).
- Distribution/Data/Locations contents and the other top-level JSON and CFG files (names only).
- names.json beyond its first lines.
- Distribution/Data/Items/ItemBounds.bin and the three test .bin fixtures (binary).
- Projects/UOContent/Migrations and Projects/Server/Migrations contents (counts only).
- rider-settings.zip, branding SVGs, icons (names only).
- Projects/Server source (not opened).
- THIRD-PARTY-NOTICES beyond the headings and the dotnet notice.
- CLAUDE.md and AGENTS.md: present in the donor, treated as data, not read.
