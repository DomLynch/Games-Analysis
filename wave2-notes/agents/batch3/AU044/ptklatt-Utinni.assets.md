# ptklatt-Utinni (asset audit, AU044)

Donor: /mnt/frankendom-donors/ptklatt-Utinni (VPS, read only). Read by narrow ls, grep, sed and head only.

Halves: client-side tool only. README line 2 says it is a plugin and injection framework for the Star Wars Galaxies client (SWGEmu named as the target). The server half is not in the box. Data pack: only data/ut.ini and data/utinni.cfg (settings and path strings, no game data).

## Licence (what the files say)
- Code: MIT, "Copyright (c) 2020 Philip Klatt" (LICENSE lines 1-5).
- Third party, licenses.txt: lists CppSharp, dearImgui, ImGuizmo, LeksysINI, spdlog. The MIT text was read for CppSharp, dearImgui and ImGuizmo. The LeksysINI and spdlog entries were not read.
- external/nvapi (NVIDIA NVAPI SDK files: nvapi.h, NvApiDriverSettings.c/.h, a PDF and a CHM). nvapi.h line 10 refers to a "license to use this code in individual and commercial software." The full NVIDIA licence text was not read. Class C for this group.
- external/DetourXS (4 source files): no licence file in the tree and DetourXS is not listed in licenses.txt. Licence unknown, class C.
- Asset licence: no separate asset licence in the tree. The repo LICENSE covers "Software" and "associated documentation files". The icons are not listed per file, so their coverage is inferred.

## Asset inventory
| group | path | count | class | note |
|---|---|---|---|---|
| toolbar icons | data/Icons/, UtinniCoreDotNet/Resources/ | 18 PNG in repo | A (repo MIT, inferred) | undo, redo, min, max, close, cog, maximize. Tool UI, not game art. Pixel size not measured. |
| tool icon | TJT.ico in data/Icons/ and UtinniCoreDotNet/Resources/ | 4 ICO in repo | A (inferred) | tool icon |
| config | data/ut.ini, data/utinni.cfg | 2 files | A | settings. utinni.cfg holds path strings for game content (terrain/naboo.trn, object/creature/player/... .iff) but no game files. |
| game content | none | 0 | D | no art, models, audio, maps or text tables in the repo |
| third-party SDK | external/nvapi/*, 8 DLL binaries | see above | C | not redistributable on the files read; DLLs and CHM not opened |

No audio files, no 3D models, no maps, no string tables. Data tables: none. (The "data first" check: there are no game data tables in the box. The only data files are settings.)

## Rights-holder status (from the files)
Author copyright on the tool (MIT, 2020, Philip Klatt). The README names Star Wars Galaxies and SWGEmu as targets and names no rights holder for the game. The repo ships no game data. Status: author-owned tool; game rights unknown.

## Best class
A for the tool's own icons and config (MIT, attribution). D for game content (none in the box). Overall: A, but there is almost nothing art-related to take.

## Inspiration (tool and UI patterns, no art to copy)
- Hotkeys as named, rebindable actions with one editor page (README line 11). Pattern: every action has a name, a default and a rebind screen.
- Undo and redo as a shared command framework (README line 10). Pattern: every edit is a reversible command, which suits zone-data editing.
- Transform handles drawn on the selected object (README line 7, ImGuizmo). Pattern: direct manipulation of a placed object in the scene.
- Free-look camera that hides the avatar only while detached (README line 18). Pattern: an inspection camera separate from the play camera.
- Offline scene mode (README line 15). Pattern: authoring without the live server, which suits zone authoring.
- Icons are small and flat (data/Icons). Pattern: a one-glyph-per-command set, readable at 375 wide. Not read in pixels.

## Briefs (category level, all ours to design)
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed. These are UI and tool ideas, not creatures, so the silhouette and sound criteria do not apply.

1. **On-object move handles** (own label). Why it works: a placed object is edited where it sits. Kept: one handle set per selected object, drag to move, every drag is undoable. Changed: our own handle shapes (rings and pillars) in our palette, not default axis colours. Reference: README.md line 7.
2. **Remap-everything page** (own label). Why: every action is a named binding on one page. Kept: named actions, rebind and reset. Changed: touch first, rebind by long press on the action, preset layouts for thumb play. Reference: README.md line 11.
3. **Detached inspection camera** (own label). Why: free look that hides the avatar only while detached. Kept: avatar hidden only in this mode, normal camera returns on exit. Changed: our version is a slow replay dolly for the fight record, not free fly. Reference: README.md line 18.
4. **Edit history for zone data** (own label). Why: every edit is a reversible command. Kept: a command stack with undo and redo. Changed: each command is a zone-data diff shown as a preview before it applies. Reference: README.md line 10.

## Cross-link
- Camera: yes, the free-look idea (README line 18). Worth a look for the replay camera.
- HUD and UI: small flat icons and an editor UI. Worth a look for the editor, not for the phone HUD.
- Sound, music, zones, spawns, loot, VFX, animation: nothing in this donor.

## Not read
- UtinniCore C++ and C# sources (listed, not opened). UtinniCoreDotNet/UI/Theme: only the licence header of ThemeUtility.cs was read.
- external/spdlog and external/LeksysINI licence texts; external/ImGuizmo/LICENSE.txt.
- NVIDIA licence text beyond nvapi.h line 10; NVAPI PDF and CHM (binary); the 8 DLL binaries.
- sdk/ templates and examples.
- Icon pixel sizes and palettes (the PNG files were not opened; `file` was not available on the VPS).
