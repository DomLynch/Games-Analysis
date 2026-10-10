# guilhermelhr-unityro (UnityRO): asset audit (AU024)

Donor path (VPS, read-only): /mnt/frankendom-donors/guilhermelhr-unityro/

**Half read:** client (UnityClient/). **Server half:** not read. The README says the client connects to rAthena (Hercules should also work). No server code is in the box as far as my listing showed; I did not search the full tree.

## Licences (what the files say)
- Code: LICENSE line 1 "GNU AFFERO GENERAL PUBLIC LICENSE", version 3. README line 80: "This project is licensed under the GNU Affero General Public License v3.0".
- No project-wide asset licence in the repo.
- Bundled third-party items carry their own terms (see groups below). Unity Standard Assets water has no licence file in the repo. The EmojiOne attribution file points readers to EmojiOne's licensing terms (licence text not in the repo).

## Rights-holder status
- The README describes the project as porting some Ragnarok Online functions to Unity. The client reads the user's own GRF archives: StreamingAssets/config.json line 3 lists "rdata.grf" and "kro_data.grf" as data the user points to. So the original game data is NOT in the repo; it is used at run time from the user's copy.
- Treat the RO-derived sprites, tables and data as original-game-derived (proprietary). The repo does not name the rights holder.

## Asset inventory
- Fonts: TextMesh Pro LiberationSans.ttf plus LiberationSans - OFL.txt (line 6: SIL Open Font License 1.1).
- Sprite sheets: Assets/Resources/Fonts/DamageSprite.png (96x32 PNG, from header) and crit_baloon.png (70x60). Sprites: warp_particle.png (64x64), base_btn_background.png, sysbox_background.png, scrollbar_horizontal.png, scrollbar_vertical.png (PNG), chat_box_background.bmp, chat_box_btn.bmp. Total 9 image files.
- Data tables (JSON, id-keyed): Assets/AddressableAssets/DataTables/ClassTable.json (3.4 KB), WeaponJobTable.json (3.6 KB), WeaponActions.json (16.6 KB). Name strings are non-ASCII in a legacy code page; not decoded or copied here.
- Standard Assets water: Assets/Standard Assets/Environment/Water (Basic)/ (WaterBasicPlane.fbx, WaterBasicNormals.jpg, WaterBasicDaytimeGradient.psd, WaterBasicNighttimeGradient.psd, FXWaterBasic.shader, prefabs and materials).
- Unity project files: 9 .unity scenes (Login, CharSelection, CharCreation, Map, Loading, Splashscreen, OfflineScene, CharServerSelection, UtilityScenes/ModelsScene), 49 .prefab files, 25 .shader files (including Resources/Shaders/Ragnarok/RagnarokEffectShader.shader), Resources/Animations/ItemDrop.anim.
- Binaries: 8 DLLs in Assets/Plugins (ICSharpCode.SharpZipLib, I18N, I18N.CJK, I18N.West, MoonSharp.Interpreter, NSubstitute, Castle.Core, System.Threading.Tasks.Extensions). No licence file for them in the repo; not opened.
- Config only: StreamingAssets/config.json, RemoteConfigs/RemoteConfigs.json (class D).
- Audio: none found by extension scan (no wav, ogg or mp3).
- Models: no mesh files (only the Standard Assets water FBX). Character and monster models come from the user's GRF.

## Classes per group
- Fonts: LiberationSans, A (OFL 1.1 as the file states).
- Repo shaders and Unity project files: B (AGPL-3.0 as stated for the repo; share-alike condition).
- RO-derived sprites, data tables: C (no licence line; game-derived).
- EmojiOne sprite sheet: C (attribution only, terms not in repo).
- Unity Standard Assets water: C (no licence file; Unity package).
- DLLs: C (no licence in repo).
- Overall best_class: A, but ONLY for the bundled OFL font. The valuable game-derived art and tables are C.

## Data first
- Tables: Assets/AddressableAssets/DataTables/*.json (keyed by numeric id). The class and weapon tables are the data; the loader is not cited here.

## Inspiration (own words, category-level)
- Damage numbers as a sprite font: a small digit sheet rendered through a TextMesh Pro sprite material (Resources/Fonts/DamageSprite.asset, Resources/Prefabs/Damage.prefab uses a TMP text style). A critical hit gets a separate bubble-shaped sprite (crit_baloon.png). Keep the separate crit shape; change the bubble and digit rig.
- One effect shader with exposed blend, cull and depth-write options (RagnarokEffectShader.shader lines 7-10, 26-30). One material setup serves both additive and alpha effects.
- A short one-shot drop animation at 60 fps, not looped (Resources/Animations/ItemDrop.anim: sample rate line 55, loop time line 80). Good template for pickup feedback.
- A warp burst built from one 64x64 soft particle (Resources/Sprites/warp_particle.png) and a particle prefab (PortalParticles.prefab). Keep single-texture bursts; change the silhouette.
- Time-of-day water: the planar water uses separate daytime and night-time gradient strips plus a normal map (Standard Assets water Textures folder). Technique is generic; re-author our own gradient strip.
- Id-keyed class x weapon grids (WeaponActions.json) to drive combat options. Not visual, but a clean matrix structure for our class-weapon table.

## Briefs (recreate as clearly distinct originals, never a copy)
See the briefs array in the JSON. Four briefs: critical-hit number bubble, loot pickup pop, warp burst, time-of-day water gradient.

## Cross-link to our cell topics
- vfx: damage numbers, shader, warp burst (above).
- animation: ItemDrop.anim (one clip).
- hud-ui: Resources/Sprites panels and scrollbars (small flat PNG and BMP files). Visuals not opened.
- zones, spawns, loot, camera: Assets/Scenes (9 scenes) and DataTables; scene YAML not read.
- sound: no audio in the box.
