# brendenbowers-SWGEmuClient: asset audit (AU007)

- Code licence: none stated: no LICENSE, COPYING or NOTICE file in the tree; Plugins/SWGEmu/README.md License section says 'provided as-is for educational purposes related to SWG EMU'. Epic template headers ('Copyright Epic Games, Inc.') appear in engine target files.
- Asset licence: none stated for the .uasset and .umap files, the CSV table, or the three gameplay GIFs. The README says the client needs the TRE data files from a retail client, so the game data is not in the repo.
- Rights-holder status (from repo files only): unknown from repo files: the README says the plugin implements the Sony Online Entertainment UDP protocol for Star Wars Galaxies EMU and points to the SWGEmu server project; the repo does not state the copyright owner of the game or whether the work is clean-room.
- Best class: C

## Asset groups

| kind | path | count hint | licence | class | note |
|---|---|---|---|---|---|
| materials | Content/SWGEmu/Materials (19 .uasset) | 19 files | not stated | C | names suggest sky (gradient, starfield, cloud, sprite), water, hologram, construction ghost, waypoint, terrain blend, survey; internals not opened |
| UI blueprints: holo panels | Plugins/SWGUIHolo/Content/UI/Hologram (7 .uasset) and Materials (1) | 8 files | not stated | C | names: character sheet, map, inventory, detail card, meter line, attribute line, label; not opened |
| UI blueprints: window and HUD | Plugins/SWGUIWindow/Content/UI (19 .uasset) and Plugins/SWGUICore/Content/UI (13 .uasset) including HUD folder | 32 files | not stated | C | names: login, galaxy and character select, inventory, crafting, datapad, travel, radial menu, action bar, command queue, floating text, target box; not opened |
| input and touch assets | Content/Input (IMC_Default, IMC_MouseLook, Actions 4, Touch 3) | 9 files | not stated | C | input mapping and touch UI assets; not opened |
| props and levels | Content/SWGEmu/Props/SM_HoloDatapad.uasset; Content/SWGEmu/Levels/L_Startup.umap, SWGLevel.umap; SWGEmu.uasset, SWGPlayerController.uasset | 5 files | not stated | C | one holo datapad prop, two maps; not opened |
| data table | Plugins/SWGEmu/Content/SWGFormTagMappings.csv (14 lines) and Content/SWGEmu/Data/DT_SWGFormTagMappings.uasset | 14 lines | not stated | C | CSV read in part: a short table mapping four-letter template codes to actor classes, with notes; it is game-structure data, not art |
| gameplay GIFs | Docs/Login.gif, Docs/Buildings2.gif, Docs/UI-WithController.gif | 3 files, 47 to 90 MB each | not stated | C | screenshots of the client; not opened |
| C++ source | Plugins/*/Source (691 files (sum of listing counts)) | 691 files (sum of listing counts) | not stated | D | code, not assets; Epic template headers in some files |

## Inspiration (own words)

- Holographic UI language: the holo panels (character sheet, map, inventory, detail card, meter lines) and the hologram and holo-text materials suggest a translucent, projected look. Recreate with our own palette and frame shapes, using thin meter lines and translucent panels.
- Ghost placement preview: several construction materials (holo, translucent, textured and masked variants) show a building before it is placed. Recreate for our build mode, choosing the variant by device quality.
- Layered sky: a gradient sky, a starfield, a cloud layer and sky sprites are separate materials. Recreate as stacked layers with our own art so the sky reads as depth, not a single image.
- Radial command wheel: a radial menu widget sits in the HUD next to a command queue and an action bar with slots. Recreate as a ring menu with a visible queue for combat orders.
- Scan field overlay: a survey-field material suggests a ground overlay for resource scanning. Recreate as a soft tinted field that marks where a scan has been done.
- Template-code table: a short table maps object template codes to actor classes, with notes on what is data-only. Recreate the pattern as our own spawn type table with one row per object kind, not the same codes.

## Inspiration briefs

1. **Holo panel set**
   - why it works: translucent frames with thin meter lines read as a projected display rather than a flat menu
   - traits worth keeping: translucent panels; thin meter and attribute lines; a character sheet layout
   - traits to change: our palette (amber or ice), angular frames, our own typography and icons
   - reference: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/Plugins/SWGUIHolo/Content/UI/Hologram/WBP_HoloCharacterSheet.uasset (name only; not opened); Content/SWGEmu/Props/SM_HoloDatapad.uasset (name only)
2. **Ghost build preview**
   - why it works: a translucent placement ghost tells the player what will be built before they commit
   - traits worth keeping: translucent ghost with textured and masked variants
   - traits to change: our grid snapping and colour states (valid, blocked); a small footprint outline
   - reference: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/Content/SWGEmu/Materials/M_SWGConstructionHolo.uasset (name only; not opened)
3. **Layered star dome**
   - why it works: separate sky layers give depth without a large single sky image
   - traits worth keeping: gradient base, starfield, cloud layer and sprites on top
   - traits to change: our own sky colours, cloud shapes and star density per zone
   - reference: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/Content/SWGEmu/Materials/M_SWGStarField.uasset and M_SWGCloudLayer.uasset (names only)
4. **Radial command ring**
   - why it works: a ring of commands near the cursor is quick to use in combat
   - traits worth keeping: ring menu with a visible command queue beside it
   - traits to change: our own command set, icons and ring size; touch-friendly spacing
   - reference: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/Plugins/SWGUICore/Content/UI/WBP_RadialMenu.uasset (name only; not opened)
5. **Scan field overlay**
   - why it works: a tinted ground field shows what has been scanned without extra text
   - traits worth keeping: soft field overlay on the ground
   - traits to change: our own tint and edge treatment; a fade over time
   - reference: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/Plugins/SWGUIHolo/Content/Materials/M_SWGSurveyField.uasset (name only; not opened)

## Not read or not verified

- All .uasset and .umap files (binary Unreal assets; names and counts only)
- The three GIFs (47 to 90 MB each; file sizes only)
- The full CSV table beyond the first lines (14 lines total)
- C++ source except the copyright lines of three files and the README
- Whether the holo, construction and sky materials are the work of the repo authors or from Epic or a game: not stated in files read
- Five briefs given from names only; no internal material setup was seen
