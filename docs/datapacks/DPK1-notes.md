# DPK1 notes (search only, nothing downloaded)

Paths are on the VPS under /mnt/frankendom-donors. "Restricted-skip" follows Dom's rule: where the only route is the owner's paid game install, a mirror, or a dump, I did not search further. Dom can override any row.

**2003scape-rsc-c.** Data is already in the box at `cache/` (jag and mem archives, textures17.jag, models36.jag, about 2.3 MB). The donor README says to distribute with `./cache` (README.md 67, 78, 107, 131). The cache origin is not stated, so licence is unclear. Recommend use-in-box.

**2009scape-rt4-client.** No cache or data folder in the box. `_RESTRICTED-NOTE.txt` line 1 marks the client RESTRICTED (Jagex-derived, study shape only). The only named data repo is LostCityRS/Content (LostCityRS-Engine-TS/README.md 10, 27), and the box copy of the engine data is config and raw only. Recommend restricted-skip.

**AAEmu-AAEmu.** The box has partial data: AAEmu.Game/Data (Creatures.xml, Doodads.xml, Worlds/) and SQL/aaemu_game.sql (30 KB). The required static data is compact.sqlite3, which is not in the box. Docs/wiki/Dependencies-and-Downloads.md (Game data and client dependencies) names only MEGA and Google Drive mirrors of compact.sqlite3 and the patched ArcheAge 1.2 client, so these are mirrors of game data and a patched client. Recommend restricted-skip.

**ACEmulator-ACE.** Database/Base/WorldBase.sql and ShardBase.sql contain CREATE TABLE schema only (0 INSERT rows), so the world content is not in the box. The donor names the ACE-World-16PY-Patches release (README.md 8). The README disclaimer says educational and non-commercial use only (README.md 19), and no data licence is stated. Recommend ask-Dom-to-approve-download.

**Anuken-Mindustry.** Full data is in the box at core/assets (maps, sprites, sounds, music, fonts) plus core/assets-raw. The repo is GPL-3 (LICENSE line 1-2). Recommend use-in-box.

**BifrostTitan-DAoC-Client-Lib.** No MPK, PCX or NIF client data is in the box. The tests use inline fixtures (craft_recipes_tests.cpp, make_craft_fixture). The README says it reads the client directory (README.md 3-5), and no legal source is named. The only sample is Eve-of-Darkness-dark-forge/mpak/samples/csv001.mpk (19,840 bytes). Recommend restricted-skip.

**BifrostTitan-daoc-niflib.** No .nif files are in the box; only tests/ exists. The README (line 14) describes the parser, and the sibling dol-leodagan-DaocClientLib/niflib.net is source code without NIF data. The data needs the owner's DAoC client, with no legal source named. Recommend restricted-skip.

**Blizzard-s2client-api.** Partial: maps/Example/MarineMicro.SC2Map (26 KB), maps/Test and one ladder map at about 9.6 MB. The protocol/ and contrib/* submodules are empty folders. The README (lines 85-92) points to the s2client-proto downloads page for more maps and replays, which is Blizzard's published source. Map licence is not stated in the donor. Recommend ask-Dom-to-approve-download.

**Card-Forge-forge.** Card scripts and game data are in the box at forge-gui/res (cardsfolder 134 MB, editions, languages, sound, music, fonts). There is no pics/ folder, so card art is missing. The README (lines 26, 34) says assets auto-download on first launch, and the code is GPL-3.0 (line 97). Card art licence is not stated. Recommend use-in-box for the scripts; ask Dom before any art download.

**Chorizite-Chorizite.** No Asheron's Call .dat files are in the box. Chorizite.Core/acclient.map (678 KB) is symbol text and Dats/ holds reader code only. The Mag-nus-acclient-AI-RE README says acclient.exe is not included and is user-provided (top section). No legal data source is named. Recommend restricted-skip.

**Clancey-WowUnreal.** Partial: Content/ has 521 UE asset and map files, but no MPQ or DBC. The README says the user must supply their own WoW 3.3.5a Data MPQ folder (lines 235-242) and the project has no Blizzard assets. Sibling Gethe-wow-ui-source is RESTRICTED (_RESTRICTED-NOTE.txt line 1). Recommend restricted-skip.

**Clancey-wowrust.** No MPQ data in the box. config/default.toml and README.md (34, 44, 59) point to a user's WoW 3.3.5a install, which the donor says has 18 MPQ archives of about 17 GB. No free source is named. Recommend restricted-skip.

**ClassicUO.** No .mul or .uop files are in the box (checked to depth 4). The README says the code is BSD-4 and does not distribute game assets, and that the user must legally obtain the UO Classic client (README.md 68). No source is named. The sibling xrip-uo-client reads .mul files but targets only the UO Demo shard (README.md 27). Recommend restricted-skip.

**CleverRaven-Cataclysm-DDA.** Data is in the box: data/ (mods, json, sound, title) and gfx/ASCIITileset plus gfx/Larwick_Overmap. Content is CC-BY-SA 3.0 (README.md 64), and code licences vary (line 65). Recommend use-in-box.

**CombatPathingRevolution.** No Skyrim game files are in the box and no Skyrim donor exists. The mod needs Skyrim SE and SKSE, and the Address Library is a Nexus mod (README.md 25), which is not game data. The game is a paid Bethesda title. Code is MIT (README.md 54-56). Recommend restricted-skip.

**Danjb1-rsc-remastered.** Data is in the box at rsc-client/res/data (Items, NPCs, Objects, Landscape.zip, Sprites.zip, audio/, about 2 MB). `_RESTRICTED-NOTE.txt` line 1 marks it RESTRICTED (no licence, study only). docs/links.md also names a "RuneScape Classic Dump", which is a dump and was not followed. Recommend restricted-skip.

**Elem8100-MapleNecrocer.** No .wz files are in the box. Reference/ holds only .NET DLLs. The README (lines 1-10) says it reads MapleStory WZ files, which come from a paid client with no legal source named. Sibling ryantpayton-MapleStory-Client has no .wz at depth 3. Recommend restricted-skip.

**FWGS-xash3d-fwgs.** No valve/ game data is in the box. README.md line 34 and 37 say to copy valve/ from a purchased Half-Life (Steam, line 34), and line 49 limits issue reports to legally acquired copies. Sibling ValveSoftware-halflife has only game/dmc and game/ricochet .fgd files. Recommend restricted-skip.
