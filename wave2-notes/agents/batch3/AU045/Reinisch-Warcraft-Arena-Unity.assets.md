# Reinisch-Warcraft-Arena-Unity (asset audit, AU045)

Donor: /mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity (VPS, read-only). Receipts: receipts.tsv (verified, 12 rows for this donor).

Code licence: Unlicense (public domain dedication), per LICENSE line 1. Zenject bundled under MIT (Assets/Plugins/Zenject/LICENSE.txt line 1).
Asset licence: none stated as a licence file. README.md lines 152-158 say character models, textures and sounds are copyrighted by Blizzard Entertainment (c)2004, that WoW and Warcraft are Blizzard trademarks, that Path of Exile and Sirus are Grinding Gear Games trademarks, and that the project is a non-commercial educational fan project not affiliated with either company.
Rights-holder status (file statement only): fan project; Blizzard named as copyright holder of models, textures and sounds. Owner of UI art, VFX, balance data and localization is not stated.
Best class: C (assets). The code is class A under the Unlicense, but that is code, not content.

## Halves read
- Server: Assets/Scripts/Server/Game.Server.asmdef (line 2 name only). Server scripts not opened. Matching client: Assets/Scripts/Client/Game.Client.asmdef (not opened). Both halves live in this same Unity project, so no separate pair in the box.
- Client: asmdef listing only; the README architecture section (lines 43-60, 62) was read.
- Data pack: Assets/Settings/Balance (166 .asset files), Assets/Settings/Sound (228 files, folders only), Assets/Localization (6 files). Balance headers and one scripted spell read. No second data pack in the box.

## Asset inventory (counts from find)
- Models and animation: 15 .fbx, 16 .obj, 113 .anim, 146 .mat, 24 .controller, 95 .prefab. Characters: Human/Mage, Dummy, Druid Cat, Super Zombie, Sheep, Steam Tank, Ragnaros (Ragnaros.fbx and Steam Tank.fbx located). Class C.
- Textures and UI: 814 .png and 208 .PNG under Assets; Lobby map frame Lordaeron_Sirus_Background.png. Class C.
- Audio: 192 files (126 .wav, 63 .ogg, 3 .mp3) under Assets/Audio. Sirus voice folder about 35 files, including a German subfolder. Class C.
- Spell visuals: Assets/Rendering/Spell Visuals (at least 12 named effect folders: Frost Nova State, Ice Block, Ice Barrier, Living Bomb Area, Pyroblast and more). Shaders: 17 .shader, 7 .shadergraph. Class C.
- Balance data (DATA TABLE): 99 spell records, 12 class-info records, 7 Lordaeron map definitions, Default Balance.asset. Class C (names follow the WoW kit; the file says nothing about licence).
- Localization (DATA TABLE): GameAudio_en/de/es/it.asset plus Shared Data. grep finds 27 key or id lines in GameAudio_en (grep count, not a parse). Class C.

## Data first
- Class records list spells as GUID references (Class Info - Mage.asset, line 13 onward).
- Spell records (Settings/Balance/Spells/, Spells/Scripted/, Spells/Boss/) hold the hazard and boss patterns. MeteorMaze_LvL 1.asset line 15 is MazeRingEffects, a list of ring effects.
- Boss records are named for Ragnaros (Spells/Boss/), while the README (line 20) features the Sirus boss. Grep for Sirus in Assets/Scripts returned no matches.

## Inspiration (own words; class C, so category level)
- Ring-telegraph hazard: a data list of floor rings sets the whole arena pattern (MeteorMaze_LvL 1.asset line 15; MeteorCorridor_LvL 1 to 3 by file name). Recreate with a telegraph layer and a shape of our own.
- Three-beat slam: slam, arrival impact and shockwave are separate spell records (Settings/Balance/Spells/Boss/, file names only). Recreate as three chained records so each beat tunes alone.
- Persistent freeze overlay: Frost Nova State and Ice Block are their own folders, so a held state reads separately from a one-shot burst. Recreate as a held overlay on the silhouette.
- Model-swap status: a target becomes a critter for a short time (Rendering/Characters/Sheep; Polymorph Spell.asset). Recreate with our own critter and tint.
- Phase callouts: Audio/Characters/Sirus has phase-tagged files (Phase1 to Phase3 by name). Recreate as a per-phase audio cue with our own lines.
- Class as data: a class record holds a spell list and a power type. Recreate the pattern with our own names.

## Briefs (5b; Dom's rule: recreate as a clearly distinct original, never a copy)
The briefs are in Reinisch-Warcraft-Arena-Unity.assets.json under "briefs" (5): ring-telegraph hazard maze; three-beat ground slam; held frost overlay state; model-swap critter status; phase-change boss callout. Each lists the trait kept and the trait changed, with file paths.

## Cross-link
- Camera: third-person camera (README line 105) and the Controls section (rotate camera, rotate character). No camera assets opened.
- Zones: Lordaeron map definitions (7) and the arena scenario are data-driven.
- Spawns: not read.
- Loot: not read.
- HUD and UI: Assets/Rendering/UI (Lobby, Map Frames) and Audio/UI (Targeting, Buttons, Errors, Instances) folders. Spell-error sounds exist as a folder.
- VFX: Spell Visuals folder, above.
- Animation: Animations folders under each character (113 .anim).
- Sound: Settings/Sound plus Audio folders (above). Phase callouts can serve as the stinger idea for boss beats.
- Progression and death or respawn presentation: not located in the files read.

## Not read / unexpected
- Not read: server and client scripts, all binary art and audio, Scenes and Prefabs bodies, ProjectSettings, Packages.
- Unexpected: the README features a Sirus boss, but the boss spell records are named for Ragnaros and no script names Sirus.
- Unexpected: the README's Blizzard statement covers character models, textures and sounds, but says nothing about UI art, VFX or balance data.
