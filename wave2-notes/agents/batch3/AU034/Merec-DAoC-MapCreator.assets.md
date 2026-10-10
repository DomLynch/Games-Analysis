# Merec-DAoC-MapCreator (asset audit, AU034)

Donor: Merec-DAoC-MapCreator (VPS: /mnt/frankendom-donors/Merec-DAoC-MapCreator/)
Code licence: GPL-2.0 (LICENSE, GNU GPL v2 text; source headers name Stefan Schäfer as copyright holder, e.g. Classes/Constants.cs line 3).
Asset licence: no separate asset licence. The repo LICENSE is GPL-2.0 for the tree; no file states a different licence for the PNG, DDS or XML data. The origin of the pre-rendered images is not stated.
Halves read: single desktop tool (WinForms). No server or client half in the box. DATA half = MapCreator/data (prerendered PNGs, textures, Zones.xml, fixtures.xml, XSD and XSC files), read by listing and by opening the two XML tables. The DAoC game client (which the README says the tool uses) is not in the box.
Paired donor in the box: not searched.

## Licence and rights (from the files)
- LICENSE: GPL v2 text. Source files carry "Copyright(C) 2015/2017 Stefan Schafer" headers and the GPL notice (Constants.cs line 5).
- README.md line 2: the tool generates DAoC maps "using the game client". So the game's own data is needed from the user and is not in the repo.
- Rights-holder status: the repo names only the tool author. The status of the game data and of the pre-rendered images is unknown from the repo files.

## Asset inventory
- MapCreator/data/prerendered/objects: 11 PNG files (relic temples in three variants, boats, logs, a rock barrier, a pier). Class C (origin not stated). Not opened.
- MapCreator/data/prerendered/trees: 44 PNG files (oaks, birches, pines, elms, beech, dead and gnarled trees, a holly tree, a creepy web pine). Class C. Not opened.
- MapCreator/data/textures: 5 files: elmleaves_rt_1.dds, lava.dds, watery.dds (DDS, 87536 bytes each), leaves_mask.png (36428 bytes), tree_leaves.png (34055 bytes). Class C. Not opened.
- MapCreator/Resources: MapCreatorInfo.jpg, dol_small.png. Class C. Not opened.
- MapCreator/icon.ico: application icon. Class C.
- libs/ (ICSharpCode.SharpZipLib.dll, Niflib.SharpDX.dll, MWControls.dll, MPKLib.dll, MWCommon.dll) and tools/filever.exe: binaries. Licence not stated in the box. Class C. Not opened.
- No audio, fonts, 3D meshes, or UI skin art. Class D for those.

## Data tables (data first)
- MapCreator/data/Zones.xml (363 lines): 240 zone entries, each with id, type and a place name. Type counts: Outdoor 124, Dungeons 49, Indoor 27, Instances 26, Battlegrounds 11, Capitol 3. The header comment lists the zone types (Zones.xml line 6). Class B for the XML structure (GPL repo), C for the place names (game terms). Names not copied here.
- MapCreator/fixtures.xml (137 lines): 8 fixture categories. Each has an id, a renderer (None, Shaded x3, Flat x1, Image x3), a light ramp (min, max, direction), a colour, a transparency, and a shadow record (offset, size, transparency). Class B (GPL).
- MapCreator/data/*.xsd and *.xsc: dataset schemas and UI settings (generated). Class B.
- MapCreator/Classes/Constants.cs: enums for expansion and river types (River, Lake, Swamp, Lava). Class B.

## Inspiration (own words)
- Bounds and water are computed from terrain, not flood-filled. The changelog (README) says the bounds generator was rewritten to avoid flood fills and the water pass was rewritten. A top-down zone map from a height and water pass is a direct fit for a minimap or world map (hud-ui).
- Fixture categories carry a render mode, a light ramp by direction, and a shadow offset per category. One small table styles every landmark on a map. Ref fixtures.xml lines 3, 17.
- River types are a small enum: river, lake, swamp, lava. Lava is its own class, not a water colour. Ref Constants.cs line 40.
- Foliage uses a separate leaf-mask texture (tree_leaves.png with leaves_mask.png) and a per-map tree transparency setting (changelog 2014). Foliage stays readable at small size without high-poly leaves. Not read: image content.
- Landmarks come in faction variants: three relic temple renders with the same footprint (prerendered/objects, alb, hib, mid). Keep one silhouette and change the faction's ornament. Not read: image content.
- Zones are tagged by type in one XML table (outdoor, dungeon, indoor, instance, battleground, capitol). This matches zones as data on one runtime. Ref Zones.xml line 6.

## Briefs
Dom's rule: each brief is a clearly distinct original, not a copy. Traits kept and changed are listed.
1. Label: "Faction keep landmark". Why: a tall, centred silhouette reads as a minimap marker at 375 wide. Keep: central tower silhouette and footprint across three factions. Change: recreate as a distinct original: different roof and arch, faction colour by tint, not by copied ornament. Ref: MapCreator/data/prerendered/objects/Hib_RelicTemple_F.png, Mid_RelicTemple_F.png, alb_relictemple_f.png (not read).
2. Label: "Gnarled dead tree". Why: a bare crown reads at distance against living foliage. Keep: split bare crown and dark trunk silhouette. Change: recreate as a distinct original: different branch count and an ember knot at the base. Ref: MapCreator/data/prerendered/trees/Hdeadtree.png, Beech_gnarl_dead.png (not read).
3. Label: "Leaf-mask canopy". Why: one mask texture gates a flat canopy, which is cheap to draw at scale. Keep: a leaf mask on a flat card for foliage. Change: recreate as a distinct original: our own leaf shape and a sway rule. Ref: MapCreator/data/textures/tree_leaves.png and leaves_mask.png (not read).
4. Label: "Lava band". Why: lava as its own class reads as a hazard, not water. Keep: a distinct lava river class in the river enum. Change: recreate as a distinct original: a slow glowing band with a crust and an audio tick. Ref: MapCreator/Classes/Constants.cs line 40; MapCreator/data/textures/lava.dds (not read).

## Cross-link
- hud-ui: minimap and world-map pass (bounds, water, fixture styling). Strongest topic match.
- zones: Zones.xml type taxonomy.
- spawns/encounters: placed props (logs, boats, pier, trees) are map dressing, not spawns.
- vfx, sound, animation, camera, loot, progression, death: no assets in this donor.

## Not read
- All PNG and DDS image content (dimensions and pixels not opened).
- libs/*.dll, tools/filever.exe (binaries; listed only).
- MapCreator/Classes/MpkWrapper.cs and the other .cs files (listed by name; the README is the only source for the game-client dependency).
- NifUtil/ source (listed only).
- CLAUDE.md and AGENTS.md: not present in this donor.
