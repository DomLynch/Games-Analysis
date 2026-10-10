# maddogg221-SWGVulkanClient (asset audit, AU033)

Donor path (VPS, read-only): /mnt/frankendom-donors/maddogg221-SWGVulkanClient/

## Licence (what the files say)
- Code: LICENSE.md is a custom "personal, non-commercial" licence. Personal non-commercial use, fork and modify allowed. No commercial use, no selling, no profit from it, no claim of SOE/Daybreak/Lucasfilm/Disney/SWGEmu affiliation. Redistribution only non-commercial, with the licence included unmodified (LICENSE.md sections 1-2; README.md line 28 repeats "not licensed for commercial use").
- Section 5 of LICENSE.md: "does not copy source code from any GPL-licensed or other third-party reference project"; third-party libraries keep their own licences.
- Assets: no separate asset licence. The repo bundles no game art, models, textures or audio. README.md line 26 and HOWTO.md line 9 say the user supplies their own SWG client data.

## Rights-holder status (conflict in the files)
- README.md (line 20) and LICENSE.md describe a clean-room reimplementation.
- Two code comments say otherwise: libs/terrain/include/terrain/MultiFractal.h (lines 8-9) says it is ported from the SOE client's sharedFractal source, "recovered from C:\SWG-Source-ref's git history". libs/animation/include/animation/SkeletalPose.h (lines 119-120) says it reads "a 2015 leak of Sony Online Entertainment's own code".
- Rights holders named in LICENSE.md section 2: Sony Online Entertainment, Daybreak Game Company, Lucasfilm, Disney, SWGEmu. Beyond what the files say: unknown.
- Class C for the ported code and data lists: restricted, shape and technique only.

## Asset inventory (paths and counts)
| Group | Path | Count | Class |
|---|---|---|---|
| Binary art/models/audio | none in repo | 0 | D |
| Object template paths | libs/assets/data/object_template_candidates.txt | 10,682 lines (paths only) | C |
| Terrain layout pairs | libs/assets/data/real_terrain_grading_map.txt | 496 lines, tab-separated | C |
| Shaders | libs/renderer/shaders/ (Mesh, Terrain, Label, Wireframe .hlsl) | 172 lines | C |
| Ported terrain/skeleton code | libs/terrain/..., libs/animation/include/animation/SkeletalPose.h | 4 files, part read | C |
| Tooling | tools/swg_blender_toolkit (7 .py), tools/dummyclient (15), tools/pcapdecoder (2) | 24 files, names only | C |

Shader detail (Mesh.hlsl): one fixed directional light, shade = 0.5 + 0.5 x clamped N.L (line 55). Textures multiply the flat colour; untextured parts sample a 1x1 white fallback (comment, lines 4-5).

## Which half was read
Client half, in part: renderer shaders, terrain generator (Affector.cpp:120, MultiFractal.h), animation header (SkeletalPose.h comment), dummy client (names and one search hit). Data half: the two text lists (head only). Server half: none in this box. README.md line 9 names Core3 (GPL) as the server reference; it is not in this donor set.

## Inspiration (own words, category level)
- Terrain from stacked noise octaves: per-octave frequency, amplitude, bias and gain, combined by a data-chosen rule, then height and colour-ramp affectors shape it. Build with original noise. Refs: libs/terrain/include/terrain/MultiFractal.h lines 8-21; libs/terrain/src/Affector.cpp:120.
- Grading as a per-structure data flag: player houses get none and a small seam is accepted; only some non-player categories get it. Ref: PROGRESS.md line 88.
- Object catalogue split by category, with creatures held out until skeletal support exists. Ref: libs/assets/data/object_template_candidates.txt; tools/dummyclient/Visualizer.cpp line 610.
- Wrapped single-light shading that never goes fully dark, times texture, with a white fallback. Ref: libs/renderer/shaders/Mesh.hlsl lines 54-56.
- A separate bind-pose debug switch to isolate rest-pose errors from clip data. Ref: libs/animation/include/animation/SkeletalPose.h (provenance caveat applies).
- Headless dummy client with screenshot capture and a rest-pose test: one run gives a pose sheet. Refs: tools/dummyclient/ScreenshotCapture.cpp, RestPoseAutoTest.cpp (names only, not read).

## Inspiration briefs
1. Flattened outpost on hills (zone). Keep: flat footprint pad, noise hills, height-banded colour. Change: round wall ring, desert-to-ash palette, one signal post. Ref: libs/terrain/src/Affector.cpp:120.
2. Wrap-lit stylised fighter (shading). Keep: one key light, wrapped shade, texture times colour. Change: warm-cool split light, painted rim band, our own ramp. Ref: libs/renderer/shaders/Mesh.hlsl lines 54-56.
3. Ridge-line pass (zone skyline). Keep: per-octave tuning, height banding. Change: ridged not rounded, spiky tops, cliff-foot colour line. Ref: libs/terrain/include/terrain/MultiFractal.h lines 8-21.
4. Pose sheet capture (QA/camera). Keep: fixed-camera stills per pose, rest pose first. Change: our 375-wide fight camera, mid-fight pose added. Ref: tools/dummyclient/ScreenshotCapture.cpp (name only).

Dom's rule for all briefs: recreate as a clearly distinct original, never a copy.

## Cross-link to our cell topics
- camera: dummy client screenshot harness (name only).
- zones: terrain generator and per-structure grading (restricted; category-level only).
- spawns: object category split (catalogue, no spawn logic read).
- animation: bind-pose debug switch (restricted).
- loot, hud-ui, vfx, sound: nothing in this donor.

## Not read / unverified
- No binary assets exist; none opened.
- libs/assets parsers, libs/swgproto, libs/soe, libs/worldmodel, libs/clientcommon, libs/creatureanim: not read.
- libs/terrain/src other than Affector.cpp:120: not read.
- tools/dummyclient sources, Blender toolkit .py, pcapdecoder: not read.
- Terrain.hlsl, Label.hlsl, Wireframe.hlsl: line counts only.
- The text lists were read at the head only.
