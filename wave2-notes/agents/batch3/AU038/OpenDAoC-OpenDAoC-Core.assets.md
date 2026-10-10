# OpenDAoC-OpenDAoC-Core (asset audit, AU038)

Donor: /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core (VPS, read-only)
Class: C overall. There is no art or audio to take. The data tables and creature scripts are C-class (origin not stated).

## Licences (as the files say)
- Code: GNU GPL v3 per LICENSE and README.md:41. Conflict: root gpl.txt is GPL v2 text (gpl.txt:2) and the standard source header is "either version 2 ... or (at your option) any later version" (gplheader.txt:6). Files do not resolve which one applies.
- Assets: no separate asset licence file. No licence file names an owner for the game data. Data files inherit the repo GPL by default.

## Which half was read
- Server half read: GameServer, CoreServer, CoreBase, CoreDatabase, Pathing.
- Client half (DAoC game files): not in the box.
- Data pack: the companion repo OpenDAoC-Database v1.65 (named in README.md) is not in the box. Zone, region and startup XML are the seed rows that come with the server (dbupdater/insert).
- No paired donor in this box.

## Asset inventory (what is and is not there)
- Absent: 2D sprites, tilesets, 3D models, textures, music, sound, fonts, map art, UI art. Extension scan found 2 png (favicons in the Swagger docs), 12 gif (web-admin tiles), 1 ico, plus XML, xlsx, txt, cs and one .nav file.
- Data tables (the most useful part): GameServer/scripts/dbupdater/insert/Zones.xml (473 zone rows), Regions.xml (region rows), StartupLocation.xml (136 start points). Zone rows have a grid box, water level and realm fields; a region row has diving and housing flags (Zones.xml:10, :13; Regions.xml:11, :12).
- Text: GameServer/language/EN (75 files, 5,929 lines; quest files 24, 482 lines). About 234 txt files across seven locales. Key shape: dotted keys in folders per locale; placeholder slots {0} to {3} (GameNPC.txt:4). Nothing quoted.
- Creature and quest content: GameServer/scripts/namedmobs (199), mobs (62), quests (91). Stats and rules are in code.
- Binary and not opened: realmabilities_atlasOF xlsx (3), Pathing/Detour/Test/zone078.nav (602 KB), swagger bundles, icon.ico.

## Rights-holder status
Unknown for the game data. README.md:6 says the project emulates Dark Age of Camelot servers and was originally a fork of DOLSharp. No file names who owns DAoC's data.

## Inspiration (own words, no copied text)
- Zone as one data row (grid box, water line, realm and reward fields). Keep it as data; it fits "zones are data" and parity row 23.
- Day/night roster swap: one brain, two rosters, a visibility check on the zone clock (TimeDependentSpawnNpc.cs:33, :43).
- Pulse aura on a jittered 6 to 20 s timer, one visual pulse to everyone in range (ShiveringPresence.cs:55-61).
- Distance-gated boss: hits from outside a ring do nothing (Krackenschtein.cs:44-54). The ring telegraph is the part to keep; the fight becomes positioning.
- Damage-type stance: physical and elemental damage resist differently (Krackenschtein.cs:21). Show the split with icon colour.
- Boss respawn read from a server property, not a constant (Krackenschtein.cs:83; GameNPC.cs:2909).
- Message template with numbered slots for name, adjective and article, per locale (GameNPC.txt:4). Use for the inspect line.
- Boss as override class: one generic boss brain plus a table of hook overrides per boss.

## Briefs (recreate as clearly distinct originals, never copies)
1. Ring-guarded colossus. Keep: hits from outside a ring do nothing, ring painted on the ground, slow armoured body. Change: pillars block the line of hit instead of a ring clamp; serpent coil body; ash and rust palette. Ref: Krackenschtein.cs:44-54.
2. Pale shiver aura. Keep: one visual pulse to all nearby, jittered gap. Change: rising hum and frost ring in violet; pulse tied to stance. Ref: ShiveringPresence.cs:55-61.
3. Dusk roster. Keep: one brain, two rosters, a zone-clock check. Change: the clock is tide or weather; the two rosters have different silhouettes. Ref: TimeDependentSpawnNpc.cs:27-43.
4. Drowned shelf zone. Keep: water level as zone data; diving flag per region. Change: tidal water that moves; coral shelves; no reward multiplier from water. Ref: Zones.xml:10; Regions.xml:12.

## Cross-link
- Row 23 (zone population): respawn interval as a server property, day/night roster swap, zone rows with grid fields.
- Idle and ambient vocabulary: the shiver aura pulse is the only idle-style effect seen (not read beyond that file).
- Hud-ui, sound, vfx, animation: no assets in this box. Spell effect is an id number, not art.
- Death and respawn presentation, boss intro, readability at 375 wide: not read.

## Not verified
Zones.xml and Regions.xml beyond the head; all 199 named-mob files (3 read); locale text (keys only); xlsx and nav binaries; swagger bundle licences.
