# electronicarts-CnC_Remastered_Collection: asset audit (AU017)

Donor root: /mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/ (VPS, read-only)

## Licences (as the files say)
- Code: GPL v3 with additional terms. LICENSE.md line 1 says Electronic Arts released TiberianDawn.dll, RedAlert.dll and the Command & Conquer Map Editor, with source, under the GPL V3 and additional terms (line 3). Additional terms (line 603): no trademark or publicity rights are granted.
- Conflict: TIBERIANDAWN/License.txt line 1 lists only TiberianDawn.dll and RedAlert.dll (no map editor). The two licence texts disagree on whether the editor is covered by the same statement. Class C for the editor's non-code files on that conflict.
- README.md line 35: the repo and its contents are GPL v3 with additional terms.
- Assets: no game assets in the repo. Only a 512 x 512 preview PNG and an icon sit in CnCTDRAMapEditor/Resources.

## Rights-holder status
- Original company release for the code: LICENSE.md line 1 and SCRIPTS/tgautil.py line 2 ('Copyright 2020 Electronic Arts Inc.').
- Game content: not in the repo. README line 16: to use the compiled binaries you must own the game.

## Halves
- Read: file lists of the engine folders (TIBERIANDAWN/, REDALERT/), the map editor (CnCTDRAMapEditor/), SCRIPTS/, and the licence and README text. The tgautil.py argparse lines were read.
- Engine half (game DLL source): listed, not read.
- Data pack (the game's own rules, art and audio): not in repo.
- Matching half in the box: no folder for this game's data was found by name. OpenRA-OpenRA is a different project and was not compared.

## Data tables (data first)
- No CSV, JSON, INI, MIX, SHP, AUD or VQA files in the repo.
- Data-shaped files: 22 .resx XML files (UI layout and strings in the editor), App.config, Properties/Settings.settings. Only the file list was read.

## Asset inventory
- CnCTDRAMapEditor/Resources/GameIcon00.ico: 393,230 bytes.
- CnCTDRAMapEditor/Resources/UI_CustomMissionPreviewDefault.png: 6,916,684 bytes, 512 x 512 (IHDR bytes).
- CnCTDRAMapEditor/Steamworks.NET/redist/steam_api64.dll: 289,568 bytes, third-party runtime binary.
- No maps, music, sound effects, sprites or dialogue in the repo.

## Cross-link to our cell topics
- hud-ui: editor inspector panels and the briefing settings are the closest UI reference.
- zones, spawns, loot, vfx, animation, sound, camera: no assets in the repo. The engine code (not read) would be the place to look.

## Inspiration (category level, class C)
- Mission editor as one inspector per object family.
- Default preview card for a mission without a custom picture.
- Briefing as its own settings panel with a preview slot.
- Publish-to-workshop dialog flow.
- Frame-pack tool that zips a folder of frame images.

No creature, item or zone art is in the repo, so no creature or item briefs are given.

## Briefs
See electronicarts-CnC_Remastered_Collection.assets.json, key "briefs" (4 UI and tool briefs). Each names the trait kept and changed.

## Not read
See the not_read list in the JSON.
