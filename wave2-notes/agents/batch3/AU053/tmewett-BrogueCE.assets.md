# tmewett-BrogueCE (asset audit, AU053)

Donor: /mnt/frankendom-donors/tmewett-BrogueCE
Halves: single-player roguelike, no separate server. Code and data tables are in src/brogue and src/variants. Read those plus bin/assets.

## Licence (as the files say)
- Code: GNU AGPL v3 (root LICENSE.txt, line 1). Source headers also read "Copyright 2012. All rights reserved." (src/brogue/Light.c line 6) next to the AGPL grant. Conflicting: treat as AGPL shape-only.
- Assets: bin/assets/LICENSE.txt covers tiles.png only: CC BY-SA 4.0 (line 5). Gives attribution to CE maintainers (line 3) and says the tiles derive from Oryx Design Lab's Brogue Tiles (line 10). No licence line for icon.png or tiles.bin.

## Rights-holder status
Community fork of Brogue. Creator named in source headers: Brian Walker (Light.c line 5). Tiles lineage per the assets file. No company named.

## Asset inventory
- bin/assets/tiles.png: tile atlas, IHDR 2048 x 5568 px, 405,688 bytes. Not opened. Class B (CC BY-SA 4.0).
- bin/assets/icon.png: 256 x 256 px, 61,867 bytes. No licence line. Class C.
- bin/assets/tiles.bin: 147,456 bytes. Not read. No licence line. Class C.
- Data tables in code: monsterCatalog (Globals.c line 1025; about 68 rows incl. player), tileCatalog (Globals.c line 315 to about line 579), item-kind tables (GlobalsBrogue.c line 665 onward). AGPL. Class B, shape only.
- Audio, music, fonts, maps: none shipped. Class D.

## Best class: B
Tiles are share-alike. Code is AGPL, so the field list and mechanism are the thing to reuse, not the text.

## Inspiration (own words)
- Creature row is one flat record: name, glyph, colour, HP, defence, accuracy, damage range, regen, move, attack, blood, light, large flag, drop chance and type (monsterCatalog). Row 21 field list for our catalogue.
- Hit chance is accuracy times a defence curve, clamped 0-100, in fixed point (Combat.c lines 105-131). Forced hits first: stuck, captive, seized-and-seizing defenders always get hit (lines 110-117). Row 1 duel step order.
- Replay as an input log: keystrokes and mouse events, plus a 36-byte header with version, mode, seed, turn count and deepest level (Recordings.c lines 30, 133-146, 193; playback via recallEvent line 340). Row 19: record seed and fight inputs, rebuild on replay.
- Glyph-first readability: one glyph index and one colour per creature, threat read from silhouette and colour. Our 375-wide readability rule.
- Tiles carry their own light and flags as data (tileCatalog header, Globals.c line 320). Zone dressing without code changes.
- Item kinds in per-family tables with one row shape, variant picks the live table (GlobalsBrogue.c lines 665-713). Loot.

## Briefs
1. Glyph Skirmisher (own label). Keep: one bold silhouette per class, one colour per threat tier, flat stat row. Change: head-and-shoulders sprite silhouette, our palette and stat names. Ref: src/brogue/Globals.c line 1025 onward.
2. Lit Hazard Tile (own label). Keep: per-tile glow value, per-tile block and hazard flags. Change: our own zone tiles and colours, our hazard (fire or fog). Ref: src/brogue/Globals.c lines 315-320.

Recreate as clearly distinct originals, never a copy. Keep the mechanism; change the look, names and ids.

## Cross-link
- hud-ui: glyph readability idea.
- zones: tileCatalog as zone dressing.
- spawns: drop and spawn fields exist; spawn logic not read.
- loot: four item-kind tables; rows not read.
- vfx: tile glow light values.
- camera, animation, sound: none in box.

## Not read
- Pixel content of tiles.png and icon.png; tiles.bin format.
- Row contents of monsterCatalog, tileCatalog and item tables beyond headers.
- PowerTables.c defenseFraction body; Monsters.c; Dijkstra.c; Architect.c; platform/tiles.c; changes/ folder.
