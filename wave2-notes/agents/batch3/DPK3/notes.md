# DPK3 notes (search only, nothing downloaded)

**deregtd-AC2D.** Source-only AC2D test client; no README in folder, and no .dat files in it. Turbine dat reading is in cTurbineFile.h/.cpp (file list). Retail dat must come from the user's own AC install (dereth-network-dereth/empyrean/SETUP.md:27). Sibling ACEmulator-ACE has only schema (Database/Base/WorldBase.sql), no world data.

**dereth-network-dereth.** README.md:15-16 says no retail data files ship. Needed: client_portal.dat and related (empyrean/SETUP.md:27), plus ACE-World SQL fetched from ACE-World-16PY-Patches (SETUP.md:29, 59-68, 83: about 150 MB each). The SQL is a dump-derived pack, so Dom decides. fixtures/ holds packet captures only.

**dhewm-dhewm3.** README.md:48-49 says no game data in the tree. base/ has only default.cfg and gamepad cfgs (16K). Needs Doom 3 pak000-pak008 (README.md:135-136), bought on Steam (README.md:57). No free source named in the donor docs.

**djhenry-eqoxide.** README.md:3, 6 say it relies on eqoxide_asset_server for content, and README.md:15 says it targets EQEmu only. S3D archives come from the EQ client (docs/character-models.md:9). The asset server serves EQ-derived assets, so it is restricted. EQEmu holds server data (utils/sql/peq-dump, utils/defaults/Maps), which is not S3D.

**dkfans-keeperfx.** Partial: KeeperFX levels, campaigns and config are in box (levels/ 924K, campgns/ 1.9M). Original DK data files are absent. README.md:18-19 says a copy of the original files is required as proof of ownership, and README.md:42-45 names GOG and Steam as sources (both paid). Dom's own copy only.

**dol-leodagan-DaocClientLib.** README.md:16, 22 read client data from C:\Dark Age of Camelot, so no data is in the tree. Siblings are engine or server code (BifrostTitan-DAoC-Client-Lib, OpenDAoC-OpenDAoC-Core, Dawn-of-Light-DOLSharp). OpenDAoC-OpenDAoC-Core/README.md:35 names OpenDAoC-Database v1.65, which is server DB, not client data.

**drgomesp-midgarts.** assets/grf holds only synthetic test GRFs (not-grf, custom, corrupted, with-files, incorrect-version), no data.grf. README.md:106 reads GRF_FILE_PATH from .env. Doddler-RagnarokRebuildTcp/README.md:5 says it has no RO assets, and README.md:18 says extract data.grf from an original client. No public source named.

**edubart-otclient.** README.md:20 says the user downloads spr/dat and puts them in data/things/VERSION/. data/ (5.4M) has no .spr or .dat. opentibiabr-otclient and mattyx14-TheForgottenTibiaClient also have no spr/dat in data/things. README.md:15-18 gives only a Windows builds link.

**elberacasa-Lineage2Elbera.** No .unr, .utx or .dat in the folder. README.md:27 says no client is installed for players. progress.md and README.md:55-63 cite "original map bytes" checks, but the source of those bytes is not named. Sibling realratchet-Lineage2JS/README.md:27 claims the client "was always free" (unverified).

**electronicarts-CnC_Remastered_Collection.** README.md:16 says you must own the game (EA App or Steam). The folder is source only (REDALERT/, TIBERIANDAWN/, editor). No C&C data donor in the box. Dom's own copy only.

**eq-p99-tools-eq-client.** README.md:4-6 loads data from a user-supplied EverQuest install and says the repo does not redistribute assets. README.md:135 names the Titanium client for P99 and EQEmu. Sibling EQEmu holds server content, not EQ archives.

**exult-exult.** Partial: data/ (14M, exult0.pal, flx.in, *.mid, midisfx.flx) and content/ (6.9M, bg, si, demo, islefaq) are present. README.md:142 says you must own Ultima VII, and README.md:179 and section 12 name the GOG installer. README.md:40-45 is the audio pack download (ask Dom). Exult docs: https://exult.info/docs.html.

**flareteam-flare-game.** Yes: this folder is the data pack (mods 637M, art_src 687M, tiled 47M). README.md:21 says art and data are CC-BY-SA 3.0, README.md:23-29 gives the OFL font licences, and README.md:43 names flarerpg.org/download. Use in box, with CC-BY-SA attribution and share-alike.

**gawric-Unity-Client-for-L2J.** Assets are already in box (l2-unity/Assets 2.4G, l2-unity-fmod/Assets 102M). README.md names no provenance, and the sibling shnok-l2-unity (4.1G) is the same kind of content. The size and realratchet's note point to retail Lineage 2 assets. Provenance is unverified, so I marked it restricted-skip pending a Dom ruling. No L2J server data is in box.

**gemrb-gemrb.** Partial: the included trivial demo is in demo/ (chitin.key, dialog.tlk, override/, sounds/). README.md:17-22 says full BG or IWD data must be installed. REUSE.toml:38-49 gives the demo licences (CC-BY-SA-4.0 and GPL-2.0-or-later). Recommend use-in-box for the demo only.

**gesior-otwebclient.** README.md:10-12 says it needs a websocket proxy and has only alpha features. img/ holds bg.jpg and bg2.jpg only, no Tibia spr/dat. Siblings opentibiabr-otclient and mattyx14-TheForgottenTibiaClient also have no spr/dat, and otland-forgottenserver is server data.

**guilhermelhr-unityro.** Unity project in box (UnityClient/Assets, 43M addressables). README.md:76 says point config.txt at a GRF from the user's client, so no GRF is in box. RemoteConfigs/RemoteConfigs.json names a live login server IP; I did not contact it. Sibling Doddler-RagnarokRebuildTcp has its own 270M assets and README.md:5 says no RO assets.
