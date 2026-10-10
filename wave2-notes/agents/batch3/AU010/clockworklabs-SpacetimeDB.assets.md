# clockworklabs-SpacetimeDB: asset audit (AU010)

Root on VPS: /mnt/frankendom-donors/clockworklabs-SpacetimeDB/ (read-only, not copied)

## Licences (as the files say)
- Repo: Business Source License 1.1 (LICENSE.txt line 1). Licensor Clockwork Laboratories, Inc. (lines 7, 10: (c) 2023). Licensed Work SpacetimeDB 2.12.0 (line 8). Additional Use Grant: one production instance and no Database Service (lines 12-15). Change Date 2031-10-08 (line 24). Change License GNU AGPL v3.0 with a linking exception (line 26).
- Conflict to note: README line 256 says the chosen open-source licence is GPLv3 with linking exception. LICENSE.txt line 26 says AGPL v3.0.
- demo/Blackholio: Apache License 2.0 (demo/Blackholio/README.md line 94; demo/Blackholio/LICENSE).
- Third-party: EmojiOne sprite sheet (attribution file says it is provided by EmojiOne and points to its site for licensing terms). LiberationSans with OFL text (Google copyright line). Inter and Source Code Pro web fonts in docs (licence not read).

## Rights-holder status
Company project. LICENSE.txt line 10 names Clockwork Laboratories, Inc. Third-party items name their own holders. Trademark status of logo files is not stated.

## Asset inventory
- demo/Blackholio/client-unity/Assets: RepeatingBackground.png (128x128), StarBackground.png (2048x2048), UIUsernamePanel.png (455x200). Class A (Apache 2.0).
- Shader graphs and prefabs: CircleShader.shadergraph (about 106 KB), WavyOutline.shadersubgraph, materials and prefabs. Class A.
- demo/Blackholio/client-godot/icon.svg (128x128). Class A.
- EmojiOne.png (512x512) with JSON and attribution. Class C (licence deferred to a website).
- LiberationSans.ttf with OFL text. Class B.
- docs/static/fonts: two woff2 web fonts. Class C (not read, no licence found by name).
- docs/static (about 118 PNG, SVG, JPG including logos), images/ (architecture diagram, light and dark sets, social set), templates/ (about 5 images). Class C (logos and marketing art, licence scope unclear).
- Docs text (STYLE.md 31 KB, DEEP_DATABASE_STYLE.md 17 KB, DEVELOP.md 11 KB). Class C (engineering docs, not game text).
- crates/smoketests/fixtures/upgrade_old_module_v1.wasm: test fixture. Class C.
- No game levels or maps in the repo; the demo world comes from server tables at run time.

## Best class
A for Blackholio's own art (Apache 2.0). C for the rest (logos, EmojiOne, docs images, unclear fonts).

## Inspiration (own words)
- Circle as a shader: the disc is a shader graph with a border property and a body colour (CircleShader.shadergraph line 3294 for BorderSize).
- Wavy rim as a sub-graph, reusable on other shapes (name read only).
- Hue-shifted shading via RGB-to-HSV helpers.
- Layered procedural starfield with low-alpha nebula discs and generated stars (StarfieldBackground.cs line 30).
- Palette by index, one colour per player (CircleController.cs line 6 and FoodController.cs line 6). Values not copied.
- Timed spawn and decay tables for pickups (SpawnFoodTimer.g.cs line 14).
- Tiling parallax backdrop (names read only).

## Briefs (see .assets.json for full fields)
- Rim-pulse orb (CircleShader.shadergraph, WavyOutline.shadersubgraph).
- Drifting nebula backdrop (StarfieldBackground.cs).
- Timed mote pickups (SpawnFoodTimer.g.cs).
- Palette-seeded avatar (CircleController.cs).

## Cross-link to our cell topics
- vfx and shaders: the circle shader and the wavy rim are the most useful reference, as a technique to rebuild from scratch.
- zones and spawns: timed pickup tables are a model for spawn timing.
- hud-ui: the username panel and the leaderboard row prefab are a compact UI reference.
- camera, animation, loot, sound: no relevant asset found in the files read. No audio in the repo beyond one TTF in Unity.

## Receipts
Receipts: receipts.tsv in this folder (rows for SpacetimeDB; all verified with verify_receipts.py).

## Not verified
Listed in clockworklabs-SpacetimeDB.assets.json under not_read. In short: no image, font or wasm opened beyond header dimensions; shader graph read by node names only; the full BSL text not read; EmojiOne sprite and JSON not read.
