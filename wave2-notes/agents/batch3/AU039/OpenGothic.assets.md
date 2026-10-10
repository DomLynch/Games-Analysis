# OpenGothic (asset audit, class C, cell AU039)

Donor: /mnt/frankendom-donors/OpenGothic
Code licence: MIT (LICENSE:5; copyright LICENSE:3, "Copyright (c) 2019 Try").
Asset licence: none in the box. The README says the game assets and scripts are not provided and must come from a Gothic 2 install (README.md:25).
Rights-holder status: community re-implementation of Gothic 2: Night of the Raven (README.md:2). Original rights holder not named in repo files. Unknown beyond that.
Half read: the engine half (common/ and shader/). The data half (the user's Gothic 2 install) is not in the box. The format library ZenKit is an empty submodule dir here (lib/ZenKit has 0 entries). No paired data donor in this batch.

## Licence
- LICENSE is MIT. lib/miniz carries its own LICENSE file.
- Submodule licences (Tempest, bullet3, TinySoundFont, dmusic, ZenKit, rapidjson) are not in the box.

## Asset inventory
| Group | Path | Count | Class | Note |
|---|---|---|---|---|
| Gothic 2 game data | not in box | 0 | C | User supplies (README.md:25). |
| Editor icons (PNG) | spacer/assets/ic/, spacer/assets/im/ | 15 | C | Licence unclear for images. Not opened. |
| App icon, screenshot | icon.ico, scr0.png | 2 | C | Screenshot content not stated. Not opened. |
| Shaders (code) | shader/ | many folders (water, sky, hud, ssao, hiz, virtual_shadow, epipolar, lighting, materials, inventory, bink, rtsm, swrt) | A (code) | Code under MIT. |
| Packaging | packaging/opengothic.appdata.xml | 1 | A | Not read. |
| Audio, music, fonts, models, textures, maps | none found | 0 | D | find for tga, mds, zen, wav, mp3, ogg, mod, ttf: none. |

## Data first
- The content tables are the Gothic 2 script (Daedalus) and world files. None are in the box. The code that reads them uses the script VM: NPCs are created from an instance id and bound to a script symbol (common/world/objects/npc.cpp:182, :194, :264).
- The item class derives from the world object class (common/world/objects/item.h:14). Item data itself is in the script, not read.

## Inspiration (category level)
- Water as a sum of a few directional Gerstner waves, phase from the tick counter, amplitude floor so calm water moves (shader/water/gerstner_wave.glsl:17-32).
- Separate water passes: underwater, reflection, mesh path (shader/water/).
- Sky from look-up tables, with a multiple-scattering approximation (shader/sky/sky_multi_scattering.frag:15, transmittance step at :58).
- Music as a small state machine: named states and a tag set, chosen from the current theme (common/gamemusic.h:8-34).
- Entities as instances of script symbols: one data row per instance, one template per type (rows 20-21).
- Fog and light effects by name only (not read): epipolar shafts, virtual shadow, SSAO.

## Inspiration briefs
1. **Calm lake surface.** Keep: three or four directional waves summed in the shader; phase from the tick counter; amplitude floor. Change: our own wave directions and count; a shoreline foam band from depth; our own palette. Ref: shader/water/gerstner_wave.glsl:17-32.
2. **Dusk sky with a sun disc.** Keep: sky from a look-up table; a sun disc drawn over the sky. Change: our own sun direction and palette per zone; no volumetric cloud layer; stylised horizon band. Ref: shader/sky/sky_multi_scattering.frag:15, :58 (sun.frag name only, not read).
3. **Zone mood music cue.** Keep: named music states; tags for place and danger; one selector picks the cue. Change: our own cue names tied to zone data; a boss-intro stinger; no copy of the donor's track set. Ref: common/gamemusic.h:8-34.

Recreate every idea as a clearly distinct original. Never copy the donor's look.

## Cross-link
- Zones: world and sky per zone (sky LUT, water) is the matching idea for the zones topic. Zone data itself not read.
- Sound: GameMusic state set is the sound-music fold-in (layers, stingers, zone beds). Sound playback in common/sound/soundfx.h was not read beyond the class line (soundfx.h:11).
- HUD: shader/hud has a gizmo and a light imposter pass (names only).
- VFX: water and sky shaders; fog and shadow passes by name only.
- Spawns, loot, animation, camera: not read for this audit.

## Not read or not in box
See the not_read list in OpenGothic.assets.json. Main gaps: all Gothic 2 data (absent), empty submodules, shader bodies other than water and sky.
