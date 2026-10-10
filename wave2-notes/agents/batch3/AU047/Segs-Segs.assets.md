# Segs-Segs (asset audit, cell AU047)

Donor: /mnt/frankendom-donors/Segs-Segs (read on VPS, read-only)
Which half: server. This is the SEGS server (C++ under Servers/, Common/, Components/, plus Lua zone and encounter data under Data/scripts and SQL under Data/mysql). I read the licence, README, Data/SCHEMA.md header, and the encounter and spawn Lua (Data/scripts/Encounter_Manager.lua, spawners.lua, Universal_Spawns.lua). The C++ MapServer side (Servers/MapServer/MapInstance.cpp) calls into spawners.lua; not read. The paired client half in this batch is Segs-Segs-Client (launcher and HUD art only).

## Licences (as the files say)
- Code: LICENSE.md line 1 "BSD 3-Clause License", line 3 "Copyright (c) 2006-2020, SEGS Project". README.md line 11 says the project is "open source (under the terms of the BSD License)".
- Utilities/Distribution/License.txt: "Software License Agreement (BSD License)", copyright 2006-2018, SEGS Project (read head only).
- Fonts (Utilities/EditorComponents/Resources/fonts): Cantarell has a licence file stating SIL OFL 1.1 (font_license.txt line 4). DejaVu Sans licence file says DejaVu changes are public domain and glyphs are Bitstream Vera (line 1 onwards). CuppaJoe: the file says the owner's site shows no licence, and "we'll assume it's the SIL Open Font License" (font_license.txt lines 1-2). That is the repo's own assumption, so class C. Hussar Nova (OFL 1.1 with a Reserved Font Name), M+ 1c (M+ FONTS PROJECT 2002-2012), TexGyreCursor (GUST Font License) have their own licence files. SF Laundromatic ships a file named shyfoundry_freeware_eula.pdf (a freeware EULA, not opened).
- SEGSAdmin/License.txt begins with an OpenSSL licence section (read head only).
- Third-party licences in 3rd_party/ (glm copying.txt, EASTL, jcon-cpp, cereal) are separate; not read beyond listing.

## Rights-holder status (repo files only)
Code: SEGS Project (BSD). Game content (Data/scripts zone, encounter and spawn tables; SQL schema): the repo names a "CoH client" in its docs and says it interfaces with "popular super hero themed MMORPG clients". The repo does not state who owns the game content or the data. Status: unknown; class C.

## Asset inventory (counts from find)
- Server tree by extension: 690 h, 397 cpp, 227 lua, 195 hpp, 115 inl, 99 txt, 43 md, 30 ttf, 24 xml, 22 svg, 19 ui, 14 png, 13 otf, 12 html, 7 sql.
- Fonts: 30 ttf and 13 otf in Utilities/ (EditorComponents/Resources/fonts: Cantarell, CuppaJoe, DejaVu Sans, Hussar Nova, M+ 1c, SF Laundromatic (8 ttf), TexGyreCursor; MapViewer/Data/Fonts (Anonymous Pro, BlueHighway, others); SEGSAdmin dejavusanscondensed.ttf).
- Zone and encounter data: Data/scripts holds 32 entries: per-map folders (City_00_01 to City_05_01, Trial_01_01 to Trial_05_01, Hazard_01_01 to Hazard_05_01, each with about 11 files: contacts.lua, entities.lua, ES_Library_Objects.lua, hideAndSeek.lua, locations.lua, and more), plus global.lua, Global_Persistents.lua, Global_NPC_Extras.lua, Encounter_Manager.lua (301 lines), spawners.lua (214 lines), Universal_Spawns.lua (121 lines), ES_OL_Functions.lua, motd.smlx. Lua count in the server: 227 files.
- Database schema: Data/mysql/segs_game_mysql_create.sql and segs_mysql_create.sql (not opened). Data/SCHEMA.md line 11 says scripts hold "Contacts, Spawns, Missions, Zone configurations" and the database holds supergroups and character stats.
- Images and svg in the server: 14 png, 22 svg, 19 ui (listing only; not opened).

## Class per group
- Server C++ and Lua code (repo): A (BSD 3-Clause; keep the notice).
- Fonts with OFL or public-domain-change files (Cantarell, DejaVu Sans): B or A per file (OFL conditions; DejaVu licence text read in part).
- CuppaJoe fonts: C (licence assumed by the repo, not stated).
- SF Laundromatic: C (EULA PDF not opened).
- Zone, encounter, spawn and contact data in Data/scripts: C (content of a commercial MMO client, owner not stated).
- SQL schema: A (BSD repo) but not opened.
- Overall best_class: B (Cantarell OFL and DejaVu files). The code is BSD (A) but is not counted as an asset here. The zone and spawn data is C. For Frankendom: use the mechanics (state machine, probability slots, persistence rule) and write our own zone data.

## Data first (where names, looks and numbers live)
- Zone and spawn tables are Lua data: per-map folders in Data/scripts (contacts, entities, locations, ES_Library_Objects). Universal spawn definitions in Universal_Spawns.lua map a marker slot name to a spawn definition name (for example UNI_PoliceDroneGuards_V01 at line 6 maps a slot to a police-type drone guard).
- Encounter state and probabilities: Encounter_Manager.lua fields at lines 24-32 (status, probability base 80, adjustment, panic duration, panic initiators).
- Spawn tick: spawners.lua functions spinPersists (line 6), RandomSpawn (line 127), DespawnMapEncounters (line 208).
- The matching names/looks for creatures and costumes are in the client data (not in this box) and in the C++ server (not read).

## Mechanism (what the Lua does, in order)
1. Each zone holds a pool of encounter managers (MapEncPool). Each manager has a status: sleeping, running idle, running active, running panic, running despawn (Encounter_Manager.lua:13-18, 79-91).
2. RandomSpawn (encounter type): reseed the RNG, call InitiateKillPersists (comment: ensure 100 percent probability spawns occur), then for each of N rolls pick one manager at random and spawn it only if it is idle or sleeping (spawners.lua:127-150). No retry on busy slots.
3. Spawn: refuse if the total probability (base plus adjustment) is zero or less (Encounter_Manager.lua:148); pick a squad count at random up to the definition's maximum (line 162); pick a critter from the list at random (line 200).
4. Despawn: only if forced or if the total probability is below 100 (line 225). Removes all tracked critters at once and returns to idle at once (lines 222-241). No grace timer.
5. Persistent 100-percent encounters survive a normal despawn, because of step 4.
6. Civilians and cars: a random marker from the map's list, a random offset, a random rotation, then spawn (spawners.lua, Civilians and Cars branches inside RandomSpawn).

## Defects (keep the idea, fix the defect)
- RNG reseeded on every call from a seconds value (Encounter_Manager.lua:140; spawners.lua:128). Fix: seed once at boot and use the engine RNG per roll.
- Panic is a state with a declared 90-second duration and an initiators list (Encounter_Manager.lua:29-30), but the panic branch has only a comment "Start the panic timer" (line 89) and PanicDuration is not read anywhere in Data/. Fix: implement the timer, clear it on despawn, and keep the initiator list.
- Encounter pick is one random roll per slot with no retry (spawners.lua:143-150). Fix: draw from the eligible list (idle or sleeping) so the count is not lost.
- Civilian spawns may overlap at one point (spawners.lua:155). Fix: reserve a position per marker.
- Despawn without a grace timer (Encounter_Manager.lua:222-241). Fix: add a grace time before despawn when empty (Lead ruling, row 23).

## Inspiration (own words; Lua code under BSD, so adapting is allowed with the notice)
- A small encounter state machine with sleeping, idle, active, panic and despawn states, and a flag for "is active" (Encounter_Manager.lua:13-18, 79-91). Fits zone population (row 23).
- Each encounter slot has a spawn probability with a base and an adjustment, clamped to 0 to 100 (Encounter_Manager.lua:31-32, 119-127). Good shape for zone data fields: cap, chance, respawn, grace, coverage.
- 100-percent encounters are anchors: they are never despawned in a normal pass (Encounter_Manager.lua:225). A useful rule for quest or boss anchors.
- Content and state split: scripts hold zones, spawns, contacts and missions; the database holds player state and supergroups (Data/SCHEMA.md:11-13). Fits "one character, one ledger".
- Universal definitions that many maps reuse by name, mapped from a marker slot to a spawn definition (Universal_Spawns.lua:5-9). Good for shared enemy types across zones.
- Panic as a timed state with a list of initiators (Encounter_Manager.lua:29-30, 88-90): an aggro-driven scatter for a group. Idea kept; timer to build.
- Civilian and car spawns placed at a marker with a random offset and rotation (spawners.lua RandomSpawn branches). Ambient life at the walk-density level.

## Inspiration briefs
1. Panic scatter (creature group). Why it works: a group that is attacked breaks away for a set time, then returns, which makes a fight read as a reaction. Keep: panic as a timed state tied to the group; a list of who started it. Change: a short, tighter scatter with our own gait and a sound cue; the return rule tied to our threat list, not the duration. Ref: Data/scripts/Encounter_Manager.lua:16, 29-30, 88-90.
2. Probability slot (zone encounter). Why it works: one slot holds a squad with a spawn chance, and a 100 percent slot stays put as an anchor. Keep: a chance field and an anchor flag per slot. Change: our fields (cap, chance, respawn s, grace s, coverage) and our naming; anchors become boss stands. Ref: Data/scripts/Encounter_Manager.lua:31-32, 225.
3. Tray with empty-state plates (HUD). Why it works: each slot has a plate that shows empty, and an icon layer goes on top when filled; reads at a glance. Keep: separate empty plate and icon overlay per slot. Change: our slot count, palette and a bigger touch target at 375 wide. Ref: AssetSource/Ingame/UI/HUD/Tray_Inspirations_Empty.svg and Tray_Inspirations_Icon_Empty.svg (see the client donor).

Rule (Dom): recreate each as a clearly distinct original, never a copy; traits kept and changed are listed above.

## Cross-link to our topics
- spawns/encounters (row 23): the probability slot, the state machine, the anchor rule, the despawn grace gap. Fight loop (row 4): panic as a state. HUD (row 14): tray slots (client donor). Loot and camera: none in the box. Sound: none in the server. Animation: not in the box. Zones: Data/scripts folders per map (data first).

## Not read
- The C++ server (Servers/, Common/, Components/, Projects/) except what the Lua calls imply; Servers/MapServer/MapInstance.cpp not read.
- Data/scripts: City_*, Trial_*, Hazard_* map folders (listed only); ES_Library_Objects.lua; contacts.lua; entities.lua (listed only).
- Data/mysql/*.sql (listed only); Data/SCHEMA.md beyond line 13.
- All fonts (binary), all png, svg, ui, xml files (listed only).
- Encounter_Manager.lua lines not cited above; spawners.lua Cars and Civilians branches read only in part.
- 3rd_party licence texts beyond the list.
