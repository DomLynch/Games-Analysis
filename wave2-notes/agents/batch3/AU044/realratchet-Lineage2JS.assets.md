# realratchet-Lineage2JS (asset audit, AU044)

Donor: /mnt/frankendom-donors/realratchet-Lineage2JS (VPS, read only).

Halves: client half only. src/ is a TypeScript client renderer and asset decoder (Unreal package format). README line 21: "start working on networking code with the server" means the server half is future work and is not in the box. Data pack: none in the box. The README says the user must supply the client install (line 27), so the game data is not in the tree.

## Licence (what the files say)
- Code: no LICENSE file in the tree. package.json line 12: "license": "ISC". That is the only licence statement. The README calls the work "open-source" (line 10) but names no licence file.
- Assets: none shipped. Images in docs/, reference/ and html/ have no licence statement.
- Asset licence: none stated. Conflicting or absent licence, so class C.

## Asset inventory
| group | path | count | class | note |
|---|---|---|---|---|
| screenshots | docs/tower_inside.jpg, tower_outside.jpg, tower_statues.jpg | 3 JPG, 1.3 to 1.6 MB each | C | game previews (README line 27: "Here are some previews"); rights not stated |
| map reference images | reference/mapC6.jpg, map-interlaced.jpg, map-reference.gif | 3 files, 260 to 363 KB | C | map reference, no licence |
| UI image | html/skybox.png | 1 file, 556 bytes | C | size only; not opened (may be a placeholder) |
| styles | style/style.scss, style/skill-viewer.scss | 2 | code | not read |
| source | src/**/*.ts | 419 .ts plus a few .js and .vs and .glsl | code | not read beyond the sections listed below |
| audio, models, maps, text tables | none in tree | 0 | D | the ext count showed no audio or model files |

Data tables: none in the box. Data sits in the user-supplied client install (README line 27).

## Rights-holder status (from the files)
README line 6 names NCSOFT as the company behind the game ("bad decisions made by NCSOFT"). README line 13 says the author works from "encrypted asset binaries" and uses disassembly. README line 27 says the author does not know the legality of providing assets. Status: proprietary game; decompile-informed; no rights statement for the repo's own work. Treat as restricted for copying.

## Best class
C. No LICENSE file (unclear code licence), screenshots and map images of game content with no licence, and a reverse-engineered basis per the README. Clean-room shape only.

## Inspiration (technique and look, recreate from scratch)
- Splash puffs at contact (src/rendering/water-hit-effect.ts lines 9, 20, 31, 32, 36, 38). The effect is sized as a fixed fraction of the body's collision radius; it faces the mover only while moving; the spawn interval comes from the effect script's spawn-rate function, with a fallback. Recreate: size from the body, speed-driven rate, and a flat sprite burst of our own.
- Additive night-sky body (src/rendering/sky-renderer.ts lines 25, 29, 32). A two-sided celestial sprite with additive blending and depth write off. Recreate: a soft moon disc with a dusk-tinted halo.
- Vertex-baked glow mixed into the lighting (src/objects/lit-actor.ts lines 193-194). Baked per-vertex glow is scaled into a modulate-style domain. Recreate: an explicit tint ramp in our own shader, not the same domain.
- Springy hair and cape bones (src/objects/dynamic-hair-simulation.ts lines 17, 23). A damped bone chain with a stiffness term and a collision resolve limit. Recreate: fewer segments and our own sway law. No constants copied (the file's constants carry binary addresses).
- Camera handedness fix in the projection, not the quaternion (src/rendering/ue2-conventions.ts lines 10, 17, 19). The up axis is set once and the projection is mirrored on X. Idea for our own pipeline when importing mirrored data.
- Sky and fog colour pipeline (src/rendering/sky-renderer.ts, env-info.ts, l2-env.ts): read only at the sky-renderer head; the env pipeline was not read.

## Briefs (category level, all ours to design)
Dom's rule: recreate as a clearly distinct original, never a copy. No constants, colour codes or coordinates from this donor are to be used. Names below are our own labels.

1. **Shoreline splash puffs** (own label). Why it works: a splash that grows with the body and only faces the wake while moving. Kept: size tied to the body's collider; spawn rate driven by speed. Changed: a flat sprite burst in our own shapes and palette, faced away from the wake. Ref: src/rendering/water-hit-effect.ts lines 9-38.
2. **Night-sky moon glow** (own label). Why it works: an additive, two-sided body that reads as a glow at dusk. Kept: additive blending, depth write off, two-sided sprite. Changed: our own disc and a dusk-tinted halo, with a different count of bodies. Ref: src/rendering/sky-renderer.ts lines 25-33.
3. **Vertex-baked glow mixing** (own label). Why it works: baked per-vertex glow softens the lighting. Kept: baked per-vertex glow mixed with the lighting term. Changed: an explicit tint ramp in our own shader, not a modulate domain. Ref: src/objects/lit-actor.ts lines 193-194.
4. **Springy cape bones** (own label). Why it works: a short damped chain sways and stops on contact. Kept: a damped bone chain with a collision limit. Changed: fewer segments and our own sway law (wind-driven, not input-driven). Ref: src/objects/dynamic-hair-simulation.ts lines 17, 23 (names only, no values).

## Cross-link
- Camera: ue2-conventions.ts (handedness fix in projection). Worth a look when importing mirrored or foreign coordinate data.
- VFX: water-hit-effect.ts and sky-renderer.ts. Worth a look for splash and celestial glow.
- Animation: dynamic-hair-simulation.ts (springy bones). Worth a look for cloth or cape.
- Sound, zones, spawns, loot, HUD: no assets in this donor; the src/ game and UI files were not read.

## Not read
- Most of src/ (419 .ts files): only the sections named above.
- src/assets decoders, env-info.ts, l2-env.ts beyond the names, skill-viewer, physics, ue-script VM.
- docs/*.jpg and reference/* images (sizes only from ls; not opened).
- html/skybox.png (size only); style/*.scss; package-lock.json; .vscode.
- Server half and any data pack: not in the box.
