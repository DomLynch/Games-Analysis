# ax-grymyr-l2dn-server: asset audit (AU005)

Path: /mnt/frankendom-donors/ax-grymyr-l2dn-server (VPS, read-only)

## Licence (as the files say)
- Code: MIT. LICENSE.txt line 1 "MIT License"; copyright 2024-2025 Grymyr, L2Dn Server Project.
- Assets: conflicting. admin/help/license.htm states the GNU GPL (v3 or later). admin/help/license2.htm ("Datapack License") says the Datapack is property of its respective owners, free to use and modify, but cannot be distributed without consent.
- Class C for every datapack group, because the notices conflict. This records what the files say; it is not a legal reading.

## Rights-holder status (from repo files only)
- README: unofficial server emulator, "port of the L2J server written in Java".
- One enum source file carries a NCSOFT copyright string (SystemMessageId.cs line 195).
- The files state no NCSOFT authorisation. Official status: unknown.

## Asset inventory
- Dialogue html: DataPack/html, about 2285 .htm and 48 .html files, mostly NPC dialogue (default, merchant, guard, doorman, warehouse, teleporter), admin help. Class C.
- Quest html: DataPack/scripts/quests, 17 files (tutorial). Class C.
- Data xml: stats/items 310, stats/skills 287, buylists 254, multisell 170, npcs 109, baseStats 99, augmentation 76, pets 53, spawns 42, zones 41, transformations 29. Balance data, not art. Class C.
- UI and icon references: html uses names such as L2UI.SquareWhite and sek.cbui355, but no image files ship. Class D.
- Images: 1 favicon.png (DataPack Editor). Nothing else.
- Audio, 3D models, textures, fonts: none present (0 files of those types).
- Maps: the geodata folder has only Readme.txt; geodata .gz files are gitignored and not shipped. Class D.
- Tools: L2Dn.Packages reads Unreal texture packages and BuildDataPackDb reads Icon.utx from a user-supplied client path. Those client files are not in the repo. Class D.

## Best class
C overall (datapack text and data, conflicting notices). D for all art (none shipped).

## Inspiration
1. Dialogue is plain text in a small tag set, one line per step, with an advance link. Easy to recreate in our own panel style.
2. Icons are looked up by key from one shared sheet. Use our own atlas and a key per item. See Tools/BuildDataPackDb/Services/IconService.cs.
3. Zones are shapes built from nodes: box from 2 points, polygon from 3 or more, cylinder from 1 point plus radius. Useful for zone debug views. See DataPack/zones/documentation.txt.
4. Equipment slots are a fixed list with two-slot rings and earrings. See DataPack/stats/items/documentation.txt.
5. Shop and exchange lists are data files with a readme index. See DataPack/multisell/readme.txt.
6. Augmentation options are named stat-modifier entries. A tiered sheen could be drawn from our own shader ramp; no visuals ship here.

## Inspiration briefs (5)
- Saddle-beast form: whole-body shapeshift into a mounted beast. Ref stats/transformations/00157.xml.
- Rune-etched gear tier: tier from stat options, shown as our own rune seam. Ref stats/augmentation/options/00000-00099.xml.
- Elemental imbue: per-item element with a level shown as glow. Ref L2Dn.GameServer.Db/DbItemElemental.cs.
- Tutorial step panel: one short line per step, advance link. Ref scripts/quests/Q00206Tutorial/tutorial_dwarven_fighter001.html.
- Trigger volume set: box, polygon, cylinder volumes with a translucent debug overlay. Ref zones/documentation.txt.
Full fields are in ax-grymyr-l2dn-server.assets.json.

## Cross-link to our cell topics
- zones: node-based zone shapes (zones/documentation.txt).
- loot and vendors: multisell and buylists layout.
- hud-ui: html dialogue and tutorial panel style.
- vfx: elemental imbue and augmentation tiers (data only, no visuals).
- animation: transformation forms carry an action list (not read in full).

## Not read
See "not_read" in the JSON: most dialogue bodies, most stats xml, the Db migrations, most C# code, the bootstrap licence and the map file.
