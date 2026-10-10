# MovingBlocks-Terasology (asset audit, AU035)

Donor tree: /mnt/frankendom-donors/MovingBlocks-Terasology/ (VPS, read-only)
Which half I read: the ENGINE half only (engine/src/main/resources/org/terasology/engine/assets plus the top-level licence, NOTICE and README files, and docs-pre-merge/Credits.md). The game-content half (the separate module repos that hold block textures, creatures and the playable world) is NOT in this box: modules/ holds only gradle files. I did not read any content module because none is here.

## Licence (what the files say)
- Code: Apache License 2.0 (LICENSE line 3; README.md line 169 says code is Apache 2.0).
- Artwork: Creative Commons Attribution 4.0 (LICENSE_ARTWORK line 1; README.md line 169 says art is CC BY 4.0 "unless indicated otherwise - see credits for minor exceptions").
- Exceptions named in docs-pre-merge/Credits.md (the file LICENSE_NOTES points to /docs/Credits.md, which is not in this box; the copy here is docs-pre-merge/Credits.md):
  - Fugue Icons by Yusuke Kamiyamane, CC BY 3.0 (Credits.md line 326; list of editor_*.png icons).
  - Some icons by Florian Koberle, CC BY 4.0 (Credits.md line 350; contract.png, expand.png, layout icons).
  - kartikey0303 checkbox icons, "also CC BY 4.0" (Credits.md line 364).
  - Noto font, Apache 2.0 (Credits.md line 375).
  - Some base textures "use" the Good Morning Craft texture pack by Louis Durrant (Credits.md line 373). No licence line is given in the file. Those block textures are not in this box anyway.
  - Sound effects: Door Open and Door Close from FreeSound.org by named users, and Camera Click from FreeSound.org (Credits.md lines 317-319); "Block dig and destroy sounds by Austin Kelly" (line 320); "Other sound effects created by Exile" (line 321). None of these lines names a licence.
  - Soundtrack: primary soundtrack by Chris Koebke (line 314); Dimlight, Resurface and Other Side by Exile (line 316). No licence line.
- Conflict: the code and art split is stated, but per-file licences are not stated for sounds, music, meshes, shapes or lang files. Per the rule, those are class C (unclear).

## Rights-holder status (from repo files only)
- Community open-source project. NOTICE: "Copyright 2011-2016 MovingBlocks". Credits.md lists contributors and says the list is incomplete.
- Not a commercial game in this box. No leak or decompile marker in the files. Rights-holder status for individual third-party items: unknown where no licence line exists.

## Asset inventory (engine half, counts from find)
- Total in box: 180 PNG, 3 JPG, 22 OGG, 6 OBJ, 1 TTF, 5 FNT, 40 XML, 27 GLSL.
- textures/ (142 files): ui/ subfolders pauseMenu, advancedSetup, radial, treeView, icons (100 files under textures/ui). UI icons and editor icons, mostly PNG. Not block textures (those are in the content half, absent).
- fonts/ (25 files): Noto Sans and Noto Sans CJK bitmap fonts, .fnt plus PNG pages (e.g. NotoSans-Regular.fnt). Apache 2.0 per Credits.md line 375. Pixel style: bitmap font atlases. Class A (with the Apache notice).
- sounds/ (21 OGG): Slime1-6, FootGrass1-5, Dig, PlaceBlock, RemoveBlock, Loot, Land, Drink, Death, HeartBeat, Click, camera. Class C (no per-file licence; credits name FreeSound and individuals).
- music/ (1 OGG): MenuTheme.ogg. Class C (no licence line).
- blockSounds/ (2 .blocksounds data files) and blocks/ (2 data files). Data, repo-level licence only.
- mesh/ (6 OBJ): Cat.obj, Pony.obj (Blender v2.63 export headers, reference mtllib lines), ball.obj (~270 KB), cube.obj, hand.obj, UIBillboard.obj. No per-file licence. Pony and Cat are not named in Credits.md (grep). Class C.
- skeletalMesh/ (3 glTF): cubesm.gltf, 3cubesm.gltf, floatingCube.gltf (cubesm.gltf about 277 lines). Test-like cube rigs. Class C (repo-level licence only).
- shapes/ (31 .shape data files, 19 under slopes/): block shape presets such as stair, halfBlock, eighthBlock, cube, loweredCube, trimmedRaisedCube. Data. Class C (repo-level licence only).
- materials/ (9 .mat), atlas/ (3 .atlas: gui, icons, items), shaders/ (28 GLSL plus .info). Engine code-adjacent. Class C for the data, Apache for the code (repo-level).
- ui/ (59 JSON layouts): e.g. ui/ingame/deathScreen.ui (53 lines), ui/hud/toolbar.ui (44 lines), ui/ingame/inspectionScreen.ui (59 lines), pauseMenu, debugInfo, debugOverlay, menu/ and config/ folders. Repo-level licence (class C per file, no per-file licence).
- i18n/ (28 lang files): game_en.lang (3 lines), menu_en.lang (467 key-value lines), and locale files for ar, cs, de, es, fa, fr, gl and others. Text. Repo-level licence only: class C for per-file rights.
- prefabs/ (42 files): behaviorActions/ (17 behaviour-tree node prefabs: sequence, selector, dynselector, guard, invert, loop, parallel, timeout, sleep, running, succeed, fail, counter, lookup, setAnimation, playSound, playMusic), damageTypes/ (6: directDamage, drowningDamage, explosiveDamage, healingDamage, physicalDamage, supportRemovedDamage), blocks/ (2), player/ (9). Data.
- behaviors/ (1): default.behavior.
- docs/ images (PNG, JPG): not read.

## Inspiration notes (category level, my own words)
- Behaviour-tree node library as data: each node is a small prefab with a name, category, shape and a one-line description. Decorator nodes (guard, timeout, invert, loop, counter) wrap a child. A compact set of 15-20 nodes covers most AI brains. For us: express the AI brain (row 2) as a few data nodes (guard = aggro gate, timeout = give-up timer, loop = patrol) rather than one hard-coded class. File: engine/src/main/resources/org/terasology/engine/assets/prefabs/behaviorActions/sequence.prefab and guard.prefab.
- Damage types are data: physicalDamage carries an impulse value and is a prefab. Knock-back strength is a field of the damage type, not of the attacker. Idea for hit impact (row 10): keep knock-back as a field of the hit type, change the numbers and add hitstop. File: prefabs/damageTypes/physicalDamage.prefab.
- Death screen as a centred column: a title label, a details label, a spacer, then a stacked button column (respawn, settings, main menu, exit). The respawn button is the first and most prominent action. For row 17: keep the single prominent respawn at the top, show cause of defeat in the details line, change the wording and add a short grace before the button enables. File: ui/ingame/deathScreen.ui lines 7-43.
- Sound variation pools: six slime variants and five grass footstep variants (sounds/Slime1-6.ogg, sounds/FootGrass1-5.ogg). A pool of 5-6 near-identical clips chosen at random stops repetition. For row 12 (combat cues): build a hit-sound pool of 5 per impact class. Recreate the sounds ourselves; do not reuse these files.
- Block shapes as a small preset library (stair, half, eighth, slope, trimmed raised cube) in .shape data. Idea for zone geometry and arena steps: a few stepped and sloped shape presets chosen as data. File: shapes/stair.shape, shapes/halfBlock.shape, shapes/slopes/.
- Textured UI icon sets with a clear rule per folder (editor icons, pause menu, radial menu). A radial menu folder exists (textures/ui/radial). Idea for the phone inspect flow and radial selection: a radial item picker. File: engine/.../assets/textures/ui/radial/.

## Inspiration briefs
(See the .assets.json "briefs" key for the structured list.)

## Cross-link to our cell topics
- camera: no camera assets in box (camera.prefab is a player prefab, not read).
- zones / spawns: content half absent; no spawn data read.
- loot: sounds/Loot.ogg exists (class C). Not read beyond its name.
- hud-ui: toolbar.ui, deathScreen.ui, debugInfo.ui, inspectionScreen.ui exist; deathScreen and toolbar read.
- vfx: particle_vert/frag/geom shaders exist (not read).
- animation: skeletalMesh/*.gltf, behaviorActions/setAnimation.prefab (not read).
- sound: sounds/ and music/ (see above).

## Not read
- docs/*.md (about 80 files), docs/images, docs-pre-merge other files.
- inspectionScreen.ui, pauseMenu.ui, debugInfo.ui, debugOverlay.ui (names and sizes only).
- The content of the 180 PNGs and 22 OGG files: only names and counts.
- shaders/*.glsl (names only), mesh/*.obj bodies (headers only), skeletalMesh bodies, shapes/*.shape bodies (names only), i18n locale files other than menu_en.lang (counted only).
- The rest of Credits.md beyond the lines cited.
- The gradle and build-logic folders (not assets).
