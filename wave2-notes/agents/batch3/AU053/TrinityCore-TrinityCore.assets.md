# TrinityCore-TrinityCore (asset audit, AU053)

Donor: /mnt/frankendom-donors/TrinityCore-TrinityCore
Halves: this is the SERVER half (src/server). Data half is sql/ (schema and rows); the client data half is not in the box within depth 4. Read: ThreatManager.cpp (core), ThreatManager.h line 86, SpawnData.h, sql/base/dev/world_database.sql line 961.

## Licence (as the files say)
- Code: GPL 2.0 (COPYING line 1; README.md line 82). AUTHORS lines 4-6: all code GPL 2.0 except third-party libraries, which keep their own licences.
- Assets: none separate. sql/ falls under the same repo statement.

## Rights-holder status
Unknown from repo files. TrinityCore project contributors (AUTHORS). README does not mention Blizzard or any game name (grep). The files do not say whose game data the sql rows describe.

## Asset inventory
- sql/ (about 20,299 files): schema and rows for auth, characters, world and hotfixes. Schema is code-like (GPL). Row contents are game-derived with no stated origin: class C. creature_template defined at world_database.sql line 961.
- dep/: third-party libraries, licences per library (not read). Class C.
- Art, models, audio, fonts, client DBC/DB2: none within depth 4. Class D (for this repo).

## Best class: C
Code is GPL 2.0 (shape only if we do not want copyleft). Row data origin is unstated.

## Inspiration (own words)
- Threat in one ordered pass: spell gate, modifiers, redirect share, combat check, add or create entry, victim update (ThreatManager.cpp lines 382-476). Row 4 hate-list step.
- Threat by school is multiplied by the defender's school modifiers (lines 677-714; normal school at 696). The closest thing here to threat scaling with protection. Recreate with our own schools.
- Entries go offline when the target cannot be seen, attacked or fought (ShouldBeOffline lines 99-109). Row 4 leash and aggro.
- Suppression is separate from offline: immune, confused or stunned targets are suppressed; taunt is never suppressed (lines 110-121, check at 112).
- Victim re-evaluated on a one-second timer (Update lines 215-231; THREAT_UPDATE_INTERVAL = 1000u at ThreatManager.h line 86), immediate update when a new entry appears. Server tick budget (post-K item 3).
- Spawn rows carry respawn seconds and a pool id; spawn groups carry dynamic-rate and despawn-on-condition-failure flags (SpawnData.h lines 53-61, 133-142). Row 23.

## Briefs
1. Hate Ward (own label). Keep: threat multiplied by the defender's school state. Change: armour stance or shield tier, colour band on the defender, our numbers. Ref: ThreatManager.cpp lines 677-714.
2. Ambush Pocket (own label). Keep: spawn group as one unit, despawn on condition failure, rate that moves with activity. Change: our names, our zone-trigger gates, rate curve as zone data. Ref: SpawnData.h lines 53-61 and 133-142.

Recreate as clearly distinct originals, never a copy. Keep the mechanism; change the look, names and ids.

## Cross-link
- Row 4 (aggro, chase, leash): threat ordering and offline rules.
- Row 23 (zone population): pool id, respawn seconds, despawn on condition failure.
- Row 18 (server tick): one-second victim timer.
- camera, vfx, animation, sound: none in box.

## Not read
- sql row contents (creature, spawn, text).
- dep/ licence files; entry count.
- ThreatManager.h beyond line 86; UpdateOffline body beyond the online-state line (70).
- Runtime consumers of SpawnData (only the struct file).
