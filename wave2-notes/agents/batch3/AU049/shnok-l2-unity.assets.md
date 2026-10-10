# shnok-l2-unity (asset audit, cell AU049)

Donor: /mnt/frankendom-donors/shnok-l2-unity (VPS). Read: root README.md, Unity client tree under l2-unity/Assets (Resources/Data, StreamingAssets, Plugins licence files), StreamingAssets/Data/Meta data tables (headers and entry counts), StreamingAssets/Data/LineageEffects/3.json, Scripts/Datatable/ItemTable.cs (loader only), l2-unity-fmod folder layout.
Half read: CLIENT (Unity) plus the DATA PACK (StreamingAssets/Data/Meta). Server half is NOT in this box: the README links separate gameserver and loginserver repos; those were not read and are not in this donor tree.

## Licence (what the files say)
- Code licence: no LICENSE, COPYING or NOTICE file anywhere in the donor tree outside plugin folders. README.md has no licence section. Stated as: none in the repo.
- Asset licence: no asset licence file for the game content. The README says the project is "a basic playable demo of Lineage2 on Unity" and lists "Import Lineage2's world" as a feature (README line 3 and line 56).
- Third-party licence files present (these cover the plugins, not the donor's own art):
  - Plugins/Animancer/License.txt: "Animancer is governed by the Unity Asset Store EULA"; says the example scenes use "animations, models, and sprites" under public licences, with details in their folders (folders NOT read).
  - Plugins/FMOD/LICENSE.TXT: FMOD EULA (Firelight Technologies). Covers the FMOD tool and engine.
  - Plugins/NuGet/LICENSE: MIT, Copyright (c) 2018 Patrick McCarthy (package Newtonsoft.Json 13.0.3 folder has its own LICENSE.md, not read).
- ParrelSync, Beautify, Nature, StylisedWater, Simple Water Shader, URP-WaterShaders, ProBuilder, TextMesh Pro: no licence file opened (not read).

## Rights-holder status (repo files only)
"uses original game data": the README names Lineage2 as the subject and says the project imports the game's world. The repo does not name the rights holder. Data tables and asset names inside the tree are Lineage-named (see groups 1-4). Treat as proprietary game data per the repo's own statement.

## Asset inventory (counts from find/du, paths under l2-unity/Assets)
1. World maps (Resources/Data/Maps, 200 files, 882M; StreamingAssets/Data/Maps, Geodata 4 files, 13M). Per-region folders 16_24, 16_25, 17_24, 17_25 with Meta JSON/TXT (Brushes, StaticMeshActor, TerrainInfo, AmbientSounds). Class C.
2. Animations (Resources/Data/Animations, 2533 files, 1.3G): folders DarkElf, Dwarf, Elf, Fighter, Magic, LineageMonsters (16 dirs, 144 files, 48M), LineageNPCs4 (85 files), LineageWeapons (147 files), _Template. Binary FBX/anim, not opened. Class C.
3. Textures and meshes: Resources/Data/Textures (3148 files, 167M, 130 dirs), StaticMeshes (573 files, 20M), SysTextures (8654 files, 510M), UI (1080 files, 16M, uxml/uss), Effects (319 files, 22M, named effect banks like el_wind_strike_ca/fl/pr/ta and e_u004_a), Shaders (32 files). Class C. SysTextures and Effects only listed, not opened.
4. Data tables (StreamingAssets/Data/Meta, 20 files, 87M, text key=value records; the Unity loader is Scripts/Datatable, e.g. ItemTable.cs). Counts from grep/wc: Npcgrp_Classic.txt 5660 npc_begin records; NpcName_Classic-eu.txt 5661 lines; ItemName_Classic-eu.txt 11350 item_name_begin records; Armorgrp_Classic.txt 4463 item_begin records; Weapongrp_Classic.txt 1677 records; Skillgrp_Classic.txt about 34.7k skill_begin lines; SysString, SystemMsg, ActionName also present. Class C. Strings and names in these tables are proprietary game text: not quoted here.
5. Skill effect specs (StreamingAssets/Data/LineageEffects, 31 JSON files, 252K). Class C.
6. Audio: StreamingAssets banks Music.bank (11M), AmbSound.bank (6.2M), InterfaceSound.bank (656K), Master.bank (4K), Master.strings.bank. FMOD project l2-unity-fmod/Assets with folders Music, MonSound (87 entries), ChrSound, InterfaceSound, ItemSound, AmbSound, StepSound, SkillSound. README lists these as "Game sounds" (ambient, step, music, UI, NPC). Origin of the audio not stated in the repo. Class C.
7. External PBR ground textures (Resources/Data/External/Textures, 9 sets such as grass_patchy, sandy_soil, swamp_soil, icelandic_jagged_slate_rock; 90 files, 73M). Each set has a JSON (for example pjvtA0.json) with environment, averageColor, displacement fields. No licence or source key found in those JSONs (grep for licen returned nothing). Class C (unclear).
8. Plugin art (Animancer examples, Nature, Beautify, water shaders): licence per plugin folder, not read. Class C (unclear) until read.

## Classes per group
- Game data, maps, animations, textures, meshes, UI, effects, data tables, audio banks: C (proprietary/original game data per README).
- External PBR textures: C (unclear, no licence key in JSON).
- Plugin art and examples: C (unclear; the Animancer file says public licences apply to example content, details not read).
- Plugin licence texts (MIT NuGet, EULAs): not art; no reuse class assigned for assets.
- Nothing in this donor is class A or B based on the files read. Class D does not apply: the non-code content is present.

## Inspiration (own words, category level, no copied text)
- Three-phase skill effect spec per skill id: a cast effect on a hand bone, a travelling shot with a trail that can hit several targets, and an explosion list that is empty for skill 3. Data-driven, so each skill is a small record of phases, not code. Reference: /mnt/frankendom-donors/shnok-l2-unity/l2-unity/Assets/StreamingAssets/Data/LineageEffects/3.json.
- Layered hit sounds per monster: separate lists for "defense" hits (wet, normal, bone) and "damage" sounds; the list picks one per hit. Reference: StreamingAssets/Data/Meta/Npcgrp_Classic.txt line 1.
- Monster families reuse one class name across many spawn ids (for example zombie, skeleton, virud_lizardman and spider types recur in the 5660 records), so a family is one mesh set plus many stat rows. Reference: Npcgrp_Classic.txt lines 1 to 60.
- Skill records as flat rows: cast range, cast style, hit time, cool time, reuse delay, mp and hp cost, an animation key and a visual id in one line. Reference: Skillgrp_Classic.txt line 1.
- Drop data per item: drop animation type, drop radius and a drop texture or mesh key, so a loot drop has its own motion and footprint. Reference: Armorgrp_Classic.txt line 1. Matches our loot drop ceremony topic.
- Ambient sound per map region as a JSON list (16_24_AmbientSounds.json, 17_24, 17_25, 16_25) plus a separate Music.bank and AmbSound.bank: music and ambience split by bank, placed by zone. Reference: Resources/Data/Maps/16_24/Meta/16_24_AmbientSounds.json and StreamingAssets/Music.bank. Matches our sound-music topic (ambience beds per biome).
- Element-variant spell effects with suffixes (el_wind_strike with _ca, _fl, _pr, _ta): one spell, four named variants. Names read from the folder listing only; the look is not read. Reference: Resources/Data/Effects/el_wind_strike_*.

## Inspiration briefs (recreate as clearly distinct originals; never copy)
Look of the meshes and textures was NOT read (binary). Briefs use the record data and folder names only.
1. Spell with three phases (label: "Bolt-and-burst spell"). why it works: the cast, the flight and the blast are three separate data slots, so a spell can be a cast only, a flight only, or all three. keep: a cast bound to the hand; a trail flight that may hit several targets; an optional blast list. change: our phases use a different attach point (the staff tip, not the hand), a different trail style, and a shockwave ring instead of a blast mesh. ref: /mnt/frankendom-donors/shnok-l2-unity/l2-unity/Assets/StreamingAssets/Data/LineageEffects/3.json
2. Layered-hit monster (label: "Gremlin-type skirmisher"). why: the hit sound is picked from a list keyed on what the monster is made of, so the same monster sounds wet or bony. keep: small quick monster; material-keyed hit list. change: our hit list keyed on armour type not body material; different body proportions and a bright rim tint instead of a plain tone. ref: /mnt/frankendom-donors/shnok-l2-unity/l2-unity/Assets/StreamingAssets/Data/Meta/Npcgrp_Classic.txt line 1
3. Spider family (label: "Web-spinner brood"). why: two spider variants share the family name but differ in mesh and stats (giant_spider and poison_spider rows). keep: one family, several sizes. change: legs and abdomen proportions differ, a glowing venom sac instead of a palette swap, and a web-spit attack in place of the bite. ref: Npcgrp_Classic.txt (class_name=[LineageMonster.giant_spider] and poison_spider rows); meshes in Resources/Data/Animations/LineageMonsters/giant_spider_m00 (not read).
4. Floating eye (label: "Watcher orb"). why: a single-eye floater is a readable silhouette at distance. keep: a hovering, eye-led silhouette. change: a ring of three smaller eyes, a slow spin telegraph, and no beam. ref: Npcgrp_Classic.txt class_name=[LineageMonster.monster_eye] (look not read).
5. Stone golem (label: "Plated boulder brute"). why: a slow, massive silhouette is readable at 375 wide with one signature sound. keep: slow heavy tank; stone-type hit list. change: moss and crystal inlays in place of plain stone, a different stomp sound, and a ground-crack telegraph. ref: Npcgrp_Classic.txt class_name=[LineageMonster.stone_golem] (look not read).

## Cross-link
- Spawn/encounter: NpcSpawner.cs under Scripts/Game/Manager/World/Spawner (not read; loader only). Data for spawns is in Npcgrp tables.
- VFX: LineageEffects JSON and Resources/Data/Effects (not opened beyond names).
- Sound: FMOD banks and l2-unity-fmod/Assets folders, ambient JSON per map.
- Loot: Armorgrp and ItemName data tables (drop fields).
- Progression and skills: Skillgrp_Classic.txt.

## Not read
- Resources/Data/SysTextures (8654 files), Textures and StaticMeshes contents (binary).
- Resources/Data/Animations FBX and anim bodies (binary).
- Maps geodata and TerrainData binaries.
- Audio bank contents (binary); only file sizes.
- Plugin folders except licence files (Animancer example folders, Beautify, Nature, StylisedWater, Simple Water Shader, URP-WaterShaders, ProBuilder, TextMesh Pro, ParrelSync).
- Server half (gameserver, loginserver): not in this box.
- Npc/item name strings: counted, not quoted.
