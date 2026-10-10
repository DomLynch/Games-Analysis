# Asset audit: 2009scape-rt4-client (AU002, batch 3)

RESTRICTED donor. _RESTRICTED-NOTE.txt says: "RESTRICTED: Jagex-derived RuneScape rev 530 client. Study shape/idea only; never copy code or constants." Descriptions below are high level on purpose. No constants, coordinates or colour codes are given.

Donor tree (VPS, read-only): /mnt/frankendom-donors/2009scape-rt4-client/

## Licences (as the files say)
- Code: LICENSE is the GNU AGPL, "GNU AFFERO GENERAL PUBLIC LICENSE", Version 3 (LICENSE lines 1 and 2).
- Third-party jars in lib/ (JOGL, Gluegen, Gson, 18 .jar files) are named in the README "Libraries Used" section. Their licence files are not in the repo and were not read.
- Assets: no asset licence file. The only restriction text is _RESTRICTED-NOTE.txt, which is a usage note and not a licence.
- A BSD-style header sits on client/src/main/java/plugin/api/SpritePixels.java (code).

## Rights-holder status (repo files only)
- The restricted note says the client is "Jagex-derived RuneScape rev 530".
- README says it is a "Fork of Pazaz/RT4-Client" and describes decompiler clean-up: "Fix poor decompiler behavior (fernflower)" and "OpenRS2 annotations are left in the source".
- So the repo files describe a decompiled, Jagex-derived client. Rights holder of the game content is not stated beyond "Jagex-derived". Class: restricted.

## Asset inventory (counts from find; sizes from wc -c)
| Group | Path | Count / size | Licence stated | Class |
|---|---|---|---|---|
| Item table (JSON) | plugin-playground/src/main/kotlin/GroundItems/res/item_configs.json | 1 file, 3,352,381 bytes | none | C (restricted) |
| Item table copy (JSON) | plugin-playground/src/main/kotlin/KondoKit/res/item_configs.json | 1 file, 3,352,381 bytes | none | C (restricted) |
| NPC hitpoint table (JSON) | plugin-playground/src/main/kotlin/KondoKit/res/npc_hitpoints_map.json | 1 file, 47,588 bytes | none | C (restricted) |
| Bitmap-style font (TTF) | plugin-playground/src/main/kotlin/KondoKit/res/runescape_small.ttf | 1 file, 33,260 bytes | none | C (restricted) |
| Crest icon (PNG) | client/src/main/resources/saradomin.png | 64x64 (IHDR), 3,720 bytes | none | C (restricted) |
| XP overlay icons (PNG) | plugin-playground/src/main/kotlin/XPDropPlugin/res/ (xpIco.png, rl-lvls.png) | 2 files, each under 350 bytes | none | C (restricted) |
| Script-op name index (text) | ref/cs2-names.txt | 1 file, 45,744 bytes; numbered lines | none | C (restricted) |
| Audio, 3D models, map files | whole tree | none found by extension census | n/a | D |

Extension census of the whole tree: 385 .java, 68 .kt, 25 .properties, 18 .jar, 7 .gradle, 4 .json, 3 .png, 2 .yml, 2 .txt, 1 .md, 1 .ttf. No audio, 3D model or map files.

## Best class
C. Everything non-code is either game-derived or unlicensed. Audio, models and maps are absent, so class D applies to those.

## Inspiration (own words, high level, per the restricted note)
- Tiny single-purpose overlay icons: the XP-drop and level icons are a few hundred bytes each. The idea is an icon that reads at a glance next to a number. Ref: plugin-playground/src/main/kotlin/XPDropPlugin/res/.
- Data-driven item behaviour: the item table carries per-item flags (tradeable, destroy, two-handed and similar) so UI behaviour comes from a table, not code. Ref: the item_configs.json structure (values not reproduced).
- Feature plugins that ship their own res/ folder: each small feature brings its own icons and config. An original idea is a modular asset folder per feature. Ref: plugin-playground/src/main/kotlin/*/res/.
- Camera feel: the README lists tweening on by default and mouse-wheel camera movement as client changes. Those are interaction ideas worth recreating from scratch. Ref: README.md lines 42 and 52.
- Crest at small size: a single emblem drawn at 64 pixels as a faction marker. Recreate with our own geometry and legibility rule. Ref: client/src/main/resources/saradomin.png (not viewed).
- Pixel label font: a small pixel-face font for overlay labels at small sizes. Make an original one with our own proportions. Ref: plugin-playground/src/main/kotlin/KondoKit/res/runescape_small.ttf (header only).

## Briefs (creatures, zones, items, effects)
1. Tiny XP-drop icon (UI). Why it works: level feedback at a glance. Keep: one-glyph icon; readable at under 16px; paired with a number. Change: shape language; palette; placement. Ref: plugin-playground/src/main/kotlin/XPDropPlugin/res/xpIco.png.
2. Order crest (faction emblem, 64px). Why it works: a single emblem legible at small size. Keep: one emblem; legible at 64px; high-contrast silhouette. Change: our own geometry; colour family; motif. Ref: client/src/main/resources/saradomin.png (not viewed).
3. Ground-item label overlay (UI). Why it works: quick scanning of dropped loot. Keep: one label per item; flag-driven behaviour; small font. Change: bottom-anchored placement; rarity colour families; icon instead of text. Ref: plugin-playground/src/main/kotlin/GroundItems/ (folder and item table; code not read).
4. Soft camera tween (camera feel). Why it works: softer camera moves. Keep: tween on by default; wheel zoom; middle-drag rotate. Change: ease curve; zoom limits; wheel versus keys. Ref: README.md lines 42 and 52.
5. Pixel label font (HUD). Why it works: legible small labels. Keep: fixed-cell pixel face; small size for overlays. Change: x-height and glyph width; proportional spacing; accent set. Ref: plugin-playground/src/main/kotlin/KondoKit/res/runescape_small.ttf (header only).

## Cross-links to our cell topics
- camera: README.md deviations (tween, wheel zoom, render-loop camera pan). Strong match.
- zones: none in assets.
- spawns: none in assets.
- loot: item table (flags and per-item records); drop overlay plugin folder.
- hud-ui: overlay icons, crest, pixel label font.
- vfx: none read.
- animation: none in assets (code only).
- sound: none in tree.

## Not read / not verified
- The 355 .java files under client/src/main/java/rt4 and the Kotlin and Java plugin code (code, not assets).
- The contents of item_configs.json and npc_hitpoints_map.json beyond the first lines (values not reproduced anyway).
- saradomin.png and the XP icons were not viewed; only sizes and names.
- runescape_small.ttf: header only.
- The 18 jars in lib/ and their licences.
- The restricted note was read in full. No mirror or leak was searched for.
