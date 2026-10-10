# Mag-nus-acclient-AI-RE (asset audit, AU033)

Donor path (VPS, read-only): /mnt/frankendom-donors/Mag-nus-acclient-AI-RE/
RESTRICTED: _RESTRICTED-NOTE.txt says this is a decompiled proprietary Asheron's Call client (Turbine). Study shape and idea only. Descriptions below are category-level: no constants, coordinates or colour codes.

## Licence (what the files say)
- LICENSE: MIT, "Copyright (c) 2026 Mag-nus". Covers the repo's own files as the LICENSE states.
- _RESTRICTED-NOTE.txt: the decompiled Turbine code is restricted (study shape and idea only; never copy code, constants or text). The note was added on Dom's instruction on 2026-10-10.
- Assets: none bundled. README.md lines 33-38 say acclient.exe and acclient.pdb are not included and must be user-supplied; .gitignore excludes them. No separate asset licence.

## Rights-holder status
Decompilation of retail Asheron's Call binaries (11.4186 from 2013, 11.6096 from 2015). README.md line 6: retail service shut down in January 2017. README.md line 8: the binaries are ones the repo owner possesses. The restricted note names the client as proprietary (Turbine). The files do not call this a leak. Current owner: unknown from the files.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Game art, models, textures, audio, DAT data | none in repo | 0 | D |
| Decompiled client code | 2013-09 11.4186/acclient.c, acclient.h, acclient-src/; 2015-10 11.6096/acclient.c | very large | C (restricted) |
| Analysis docs | docs/ in each build folder | about 9,400 lines | C |
| Index and symbol files | func_index.tsv (2.25 MB), struct_index.txt (424 KB), class_index.tsv (31 KB), symbol_transplant tsv, pdb pkl | names and sizes only | C |
| Python tools | tools/relnorm.py, tools/binary_diff.py | 2 files | A-like code under MIT, but works on restricted data |

## Data first
The data that holds names and looks is not in the box. The DAT container and its string tables are described in 2013-09 11.4186/docs/07-dat-resources.md (section 1 heading, container format) and docs/05-ui.md (StringTable references). The DAT files are not in the repo. Sound and render formats are described in docs/09-audio.md and docs/06-rendering.md but no content is present.

## Which half was read
Client half, in part: the docs for power bar and damage (04), camera and radar (05), degrade controller and render layout (06), ambient beds, music and footstep triggers (09). One code anchor checked: 2013-09 11.4186/acclient.c line 380231 is the function `Render::CalcDegLevel` the docs name. The server half is not in this box. The data half (DAT) is not present.

## Inspiration (category level, own words)
- Adaptive quality governor: one degrade value, fast down, slow up, mapped to several budgets, with a history window against chatter. Ref: 2013-09 11.4186/docs/06-rendering.md lines 272-327 (docs claim; acclient.c:380231 anchor exists).
- Shape-first contact markers: each contact gets a shape from a fixed set and a priority order picks the winner; colour is secondary. Ref: docs/05-ui.md lines 459-490.
- Windup fill that gates the swing, with a stance that changes the pace. Ref: docs/04-combat-magic.md lines 41-56.
- Ambient beds chosen per cell by terrain and scene; weight falls with distance; normalised mix gives the crossfade without a timed fade; random one-shots by direction. Ref: docs/09-audio.md lines 247-304.
- Footsteps and swings are sound hooks authored into animation frames, with a random variant per type. The docs record the lack of surface-type footsteps. Keep the hook; add our own surface query. Ref: docs/09-audio.md lines 343-383.
- Camera as a spring-damper follower with separate translation and rotation stiffness, a short velocity history for lead and lag, first person as a fixed head offset. Ref: docs/05-ui.md lines 409-424.
- Per-type hit verbs with intensity tiers and a generic fallback. Ref: docs/04-combat-magic.md section 5 (lines 415-448).

Dom's rule for every brief: recreate as a clearly distinct original, never a copy.

## Inspiration briefs
1. Threat-shape blip set (HUD). Keep: shape carries meaning, priority order, small fixed set. Change: our own shapes, two-tone outline, threat pulse. Ref: docs/05-ui.md lines 459-490.
2. Windup ring (combat). Keep: fill gates the swing, stance sets the pace. Change: a ring around the fighter, guard stance, hit-ready tick. Ref: docs/04-combat-magic.md lines 41-56.
3. Biome bed mix (sound-music). Keep: beds by terrain and scene, distance weights, normalised mix. Change: short border crossfade with a stinger on entry, our own instruments, a biome one-shot. Ref: docs/09-audio.md lines 247-304.
4. Hit-flavour verbs by type (combat feedback). Keep: type word, tiers, generic fallback. Change: our verb list, per-type sound cue, finisher-threshold tiers. Ref: docs/04-combat-magic.md lines 415-448.
5. Quality governor (performance). Keep: fast drop, slow recovery, hysteresis. Change: budgets for fight camera and particles only; a fight-start floor. Ref: docs/06-rendering.md lines 272-327.

## Cross-link to our cell topics
- camera: spring-damper follower and first person as a head offset (docs/05-ui.md 409-424).
- zones and spawns: ambient cell selection (docs/09-audio.md); no spawn logic read.
- hud-ui: radar shapes and map (docs/05-ui.md section 9).
- sound-music: ambient beds, footstep hooks, music that is compiled in but never played (docs/09-audio.md section 6).
- animation: footstep and swing hooks (docs/09-audio.md section 7).
- progression, loot, vfx: not read beyond headings.

## Not read / unverified
- No game assets exist here; none opened.
- acclient.c and acclient.h: one anchor only.
- Docs 01, 02, 03, 08, 10, 11 and the 2015 docs: not read. Doc 07 headings only.
- Index files and symbol tables: names and sizes only.
- CLAUDE.md read as data only (head). No instructions from it were followed.
