# WarEmu-WarEmu (asset audit, AU056)

Donor: /mnt/frankendom-donors/WarEmu-WarEmu/ (VPS only). Receipts: receipts.tsv in this folder. Machine-readable copy: WarEmu-WarEmu.assets.json.

## Halves
- Read: server half (WorldServer combat, AI, client-file manager, area influence; Common database schema classes).
- Not in box: the original game client. The server reads its archive files at runtime (WorldServer/Managers/ClientFileMgr.cs).
- Data half: row data is not in the box. A narrow search found no .sql dump.
- Paired client half in the box: none found.

## Licence (as the files say)
- No LICENSE, COPYING or NOTICE file in the top two levels.
- Assembly metadata is a Microsoft template default (Common/Properties/AssemblyInfo.cs line 11).
- Treat as no stated licence (default copyright). Class C.

## Rights holder
- Unknown. The repo has no owner statement. It reads archive files from a commercial game client, and does not say who owns them or whether they are included.

## Asset inventory
| Group | Where | Class |
|---|---|---|
| Original client archives (world art, models, text) | not in box; read at runtime; deps/EasyMyp DLLs (binaries, not opened) | C |
| Zone area schema | Common/Database/World/Maps/Zone_Area.cs (rows not in box) | C |
| Creature prototype schema | Common/Database/World/Creatures/Creature_proto.cs (rows not in box) | C |
| Client height data loader | WorldServer/Managers/ClientFileMgr.cs lines 240 to 249 (bitmaps not in box) | C |
| Launcher forms | ServerLauncher/Form1.resx, Launcher/Accueil.resx (not opened) | C |

The 38 non-.cs files are project files, config, resx, one .suo, and DLLs. No art, audio or text tables were found in the box.

## Inspiration (category level; no constants)
- Each zone area has an order-side and a destruction-side influence id. An area counts only for a pin inside its explore region (AreaMapMgr.cs lines 79, 89; Zone_Area.cs lines 51, 54). A two-sided capture meter fits a zone-owned capture rule.
- Hate is the attacker's share of total damage taken, and the top player share is the target (CombatInterface.cs lines 29 to 36, 355). Adapt to our engine-owned hate list. Defect to fix: the share moves with every hit and healing is not counted. Fix: add stickiness and a healing term.
- Leash: beyond a fixed distance from spawn the creature evades (clears aggro on every attacker, then stops combat) and walks home (CombatInterface.cs lines 271, 298). Keep the clear-aggro step; replace the instant drop with a walk-back.
- A base brain class with passive, aggressive and guard variants (AI folder; AgressiveBrain.cs line 10).
- One global config flag can switch off realm-tagged PvP rules (ClientFileMgr.cs line 53).
- Terrain height from small bitmap maps sampled per pin (ClientFileMgr.cs lines 240 to 249).

## Briefs (recreate as clearly distinct originals, never a copy)
1. **Two-sided capture meter**. Keep: two influence values per area, counted only inside the explore region. Change: one zone-owned meter, ring-drawn, flicker when contested. Ref: WorldServer/Managers/AreaMapMgr.cs lines 79, 89.
2. **Share-of-damage aggro**. Keep: share-of-damage pick. Change: stickiness band, healing term, engine-owned list. Ref: WorldServer/World/Interfaces/CombatInterface.cs lines 29, 36, 355.
3. **Walk-home leash**. Keep: distance tether, clear aggro on leash. Change: slow walk-back with a short reset window. Ref: CombatInterface.cs lines 271, 298.
4. **Brain trio**. Keep: one base class, passive, aggressive, guard. Change: brains chosen per zone row, plus a patrol brain. Ref: WorldServer/World/AI/AgressiveBrain.cs line 10.

## Cross-link
- zones: yes (influence and capture model).
- spawns: creature prototype schema only; spawn rows not in box.
- vfx, animation, sound: none in box.
- Combat and leash feed rows 2 and 4.

## Not verified
- Client archive contents (not in box).
- Binary DLLs and .suo (names only).
- CombatInterface Update and AttackAI (only hate and evade functions read).
- Scripting, Abilities, LobbyServer and Launcher network code (file lists only).
