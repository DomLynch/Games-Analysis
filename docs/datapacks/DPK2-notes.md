# DPK2 notes (batch 3, search only, nothing downloaded)

Scope: searched only inside /mnt/frankendom-donors on the VPS, with ls, cat, grep and find -maxdepth 3 on single donor folders. No clone, curl, wget or download. Donor CLAUDE.md and AGENTS.md files were read as data and their instructions were not followed. The _secrets folder was not opened.

FunkinCrew-Funkin: assets/ and art/ are empty submodule folders (.gitmodules lines 1-7 name the two repos). README lines 9-12 name the free demo and store builds, not the asset pack. docs/COMPILING.md line 13 says the assets are proprietary and points to the Funkin.assets LICENSE.md. Recommend ask-Dom-to-approve-download for the submodule clone, not a fetch by me.

Gethe-wow-ui-source: _RESTRICTED-NOTE.txt line 1 says Blizzard proprietary, no licence, study shape only. The Interface/AddOns folder (348 entries) is in the box but is restricted. README lines 5-7 only link to other branches of the same repo. Recommend restricted-skip.

afritz1-OpenTESArena: README line 9 says no game assets are distributed. The data/ folder holds engine-made shaders, meshes, ui and audio only, so the original Arena files are missing. README lines 59-60 name Steam, GOG and a Bethesda setup zip as the sources; the README gives no free-release statement. The eawpats music patches (README line 67) are the project's own release. Recommend ask-Dom-to-approve-download.

alexbatalov-fallout1-ce: no master.dat, critter.dat or data folder is in the donor. README line 9 says you must own the game, with GOG and Steam as the stores. README line 17 says the Windows install is the base for data. No free source is named. Recommend ask-Dom-to-approve-download, and only if Dom owns a copy.

alexbatalov-fallout2-ce: same gap as fallout1. README line 11 names GOG, Epic and Steam and says you must own the game. README line 87 says the data lives in an install folder. The sibling fallout1-ce is engine only, so it does not fill the gap. Recommend ask-Dom-to-approve-download.

amilich-isometric-city: the data is in the box. public/assets holds buildings, ages, coaster and sprite sheets (about 150 MB by ls total), and public/games and example-states are also present. LICENSE line 1 is MIT. Recommend use-in-box.

ax-grymyr-l2dn-server: the XML static data is in the box (L2Dn/L2Dn.GameServer.StaticData.Xml). README line 20 leaves the datapack and geodata unchecked. The sibling pmbstyle-L2Solo/data (66 MB) is C4 (README title), and cuteshaun-lineage2-api/data/generated/interlude (39 MB, README line 40) is Interlude. L2Dn targets protocol 447 (README line 24), and Documentation/Clients.md line 9 puts C4 at 656 while lines 76 and 95 tie 447 to other rows. So neither sibling dataset matches this donor's chronicle. The geodata zip at https://l2solo.com/files/geodata.zip (pmbstyle-L2Solo README line 187) is a sibling project's host, not a publisher. Recommend ask-Dom-to-approve-download. LICENSE.txt line 1 is MIT.

azerothcore-azerothcore-wotlk: data/sql is SQL only. var/extractors/{Cameras,dbc,maps,mmaps,vmaps} each hold only .gitkeep, so no client-derived maps or dbc are in the box. The changelog (doc/changelog/previous-versions/v3.x.md line 975) mentions a client data downloader but gives no URL. The data comes from a proprietary 3.3.5a client and no legal free source is named. Recommend restricted-skip.

bearlikelion-WoWdot: README lines 16-17 say the project ships no Blizzard data and reads the player's own MPQs. translations/handoff.md line 19 says the same for fonts and strings. README line 73 names Kelsidavis-WoWee and samwhosung-benilla as related projects, which I did not open. No legal free source is named. Recommend restricted-skip.

bernatvadell-muonline: Client.Main/Data holds only 3 code and json files (24 KB), so the MU models, maps and textures are not in the box. README lines 118-125 name the Webzen-hosted MU Red 1.20.61 Full Data zip, which is publisher-hosted, and line 53 names a Season 6 patch on Google Drive from an unknown uploader. The sibling sven-n-MuMain README lines 64-71 says its data is a separate data-<id> release and is not in the box. Recommend ask-Dom-to-approve-download for the Webzen zip only; the Drive patch should be treated as a third-party host.

boardgameio-boardgame.io: an engine library with no game data to fetch. examples/ holds react-native, react-web and snippets only. README lines 100-102 say MIT. Recommend use-in-box.

brendenbowers-SWGEmuClient: README line 4 says the donor needs .tre files from a retail client. Content/SWGEmu holds one converted DataTable plus Levels, Materials, Props and UI, with no .tre in the donor. The SWG-Source-dsrc, SWG-Source-swg-main, SWG-Source-src and SWG-Source-client-tools folders are leaked official source and are restricted (SWG-Source-dsrc/_RESTRICTED-NOTE.txt line 1), so I did not use them. swgemu-Core3 README lines 21-23 and t-harper-swg-client-ts README lines 217-229 also need .tre files. No legal free source is named. Recommend restricted-skip.

crawl-crawl: the data is in the box. crawl-ref/source/dat is 25 MB (des, dlua, descript, database, mons, species) and rltiles is 52 MB. INSTALL.md lines 462-467 list the data files the game needs, and all are present. README line 96 says GPLv2+. Recommend use-in-box.

daeken-OpenEQ: README lines 330-331 say no original client assets are distributed. A narrow find at depth 3 found no .s3d, .eqg or .wld files in the donor. README line 45 needs an EverQuest install via --dir. EQEmu/client_files holds only export and import tool sources. Recommend restricted-skip because no legal free source is named.

daggerfall-unity: Assets/Game holds only Addons/ and Mods/ scripts, with no DOS Daggerfall archives. README lines 24-26 say a free DOS Daggerfall copy is on Steam and name the Steam link. The donor calls it free but says nothing about the publisher's terms. Recommend ask-Dom-to-approve-download, since it needs a Steam account.

daochook-daochook: config/pointers holds client address pointers and config/boot holds an example ini, with no client data. README line 44 names client 1.127e [1409]. README line 55 gives the EA copyright and line 59 says it targets private servers only. README line 69 gives the AGPL-3.0 licence. No legal free client source is named. Recommend restricted-skip.

darkanrs-client: _RESTRICTED-NOTE.txt line 1 says Jagex-derived, study only. client.jar (2.9 MB, README line 3 says build 727) and lib/clientlibs.jar are the only data-like files, with no cache archives seen. Recommend restricted-skip.
