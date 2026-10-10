# elberacasa-Lineage2Elbera: asset audit (AU017)

Donor root: /mnt/frankendom-donors/elberacasa-Lineage2Elbera/ (VPS, read-only). AGENTS.md in the repo contains rules addressed to agents; read as data only.

## Licences (as the files say)
- Code: MIT for the project's own code (LICENSE line 3, 'Copyright (c) 2026 Elbera contributors'; README line 489 limits it to its scope and third-party notices).
- Vendored three.js r160 (editor/world/vendor, editor/charcreate/vendor): MIT per the SPDX header.
- Game content: no licence granted. README lines 491-492 say the original content belongs to its owners and the source licence does not grant rights to game content.
- Screenshots: docs/img/README.md line 31 says they are selected illustrations of development output, not redistributable asset packs.

## Rights-holder status
- Uses original game data (then proprietary). README line 494: independent fan and research project, unaffiliated with NCSoft. docs/ground-truth.md line 8: the tools read actual retail meshes, textures and animations.
- The tree has no _RESTRICTED-NOTE.txt. Treated as proprietary-derived, class C, with category-level inspiration only.

## Halves
- Read: the data-table half (gateway/src table files, deploy/initdb SQL seed) and the asset-tool half (tools/ui scripts, tools/ listing, docs/img captions).
- Client half (browser client under editor/ and panel/): listed, not read.
- Server half (aCis gameserver and loginserver): not read. The tables say they are generated from or parsed from aCis. No folder named aCis appears in the box listing. Box folders with Lineage 2 server names exist (ax-grymyr-l2dn-server, NodeL2-NodeL2, cuteshaun-lineage2-api); not read, and a match is not verified.
- Data pack (retail client files): not in repo.

## Data tables (data first)
- gateway/src/tables.js: generated cipher tables from aCis (header comment). Not reproduced.
- gateway/src/npcnames.js (54 lines): NPC id to display name, parsed at runtime from aCis datapack XML. The XML is not in the repo (no .xml file found).
- gateway/src/weapontypes.js (54 lines): item id to weapon type, from the same datapack XML.
- gateway/src/questnames.js (36 lines): quest name table. Not opened.
- gateway/src/recipes.js (35 lines), henna.js (54), skilltraining.js (46): not opened beyond line counts.
- deploy/initdb/zz-gameservers.sql: server registration seed.
- Table content holds game names and ids; not reproduced here.

## Asset inventory
- Screenshots: 35 JPG and 5 PNG across the repo (docs/img/, docs/img/history/). Class C. Not opened.
- No .utx, .ukx, .u, .dat, .xdat or .unr files in the repo.
- Vendored three.js: two copies, 670,681 bytes each. Code, class A.
- Build scripts that consume retail inputs: tools/ui/build_uiskin.py (reads texture references from Interface.xdat), tools/ui/build_font.py (reads an l2font glyph sheet and .gly metrics). Class C, process only.

## Cross-link to our cell topics
- hud-ui: the UI skin manifest approach (build_uiskin.py) and the bitmap font metrics (build_font.py) are the nearest techniques.
- animation and sound: docs/img captions describe sparse keys and frame-tagged NPC events.
- zones: the BSP-based interior captions. Zone data is not in the repo.
- camera, spawns, loot: captions only (combat.jpg shows ground loot).
- vfx: combat captions (floating damage text).

## Inspiration (category level, class C)
- Hair as separate parts with soft-rig bones and weights.
- Sparse keyframe animation with ordinary interpolation.
- NPC idle loops with sound and effect events tagged to frames.
- Interior with repeated columns, built from a BSP pipeline.
- Shoreline with water over terrain layers.
- UI skin from a texture manifest with true pixel sizes; bitmap font from a glyph sheet plus metrics.
- Floating damage numbers and a ground loot pile after a kill.

## Briefs
See elberacasa-Lineage2Elbera.assets.json, key "briefs" (5 briefs). Categories are used, not instance looks. Each brief names the trait kept and changed.

## Not read
See the not_read list in the JSON.
