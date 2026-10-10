# BifrostTitan-daoc-niflib (asset audit, AU006)

Donor root (VPS, read-only): /mnt/frankendom-donors/BifrostTitan-daoc-niflib/
Scope: C++17 port of the niflib.net NIF parser. 45 files: 21 h, 20 cpp, README, CMakeLists, .gitignore, .gitattributes. No asset files.

## Licences (as the files say)
- Code: the file headers say the code is licensed under GPL-2.0-or-later. Example: include/niflib/ni_string.h:1 "...added for the 2026 migration; licensed under GPL-2.0-or-later." The same header line appears in other include/niflib files (checked on ni_collision.h, ni_particles.h).
- The repo root has no LICENSE file (directory listing: CMakeLists.txt, .gitattributes, .gitignore, include, README.md, src, tests).
- README.md:3 names the upstream as "the existing niflib.net codebase maintained by dol-leodagan". The upstream licence text is not in this repo.

## Rights-holder status (repo files only)
- Upstream: niflib.net, maintained by dol-leodagan (README.md:3). Copyright lines are not present in the files read.
- Port: the port itself has no copyright line. Unknown beyond that.

## Asset inventory
- None. Every file is code, build, or docs (21 .h, 20 .cpp, 1 .md, 1 .txt = CMakeLists.txt). No art, models, audio, text data or maps.

## Class per group
| group | path | class | reason |
|---|---|---|---|
| code | include/niflib, src, tests | C | GPL-2.0-or-later per headers; the upstream licence text is not in the repo; clean-room, shape only |
best_class: D for the non-code content (none). The code is C under the rule for GPL and unclear licences.

## Inspiration (own words, no copied text)
- A particle emitter as a data record: a controller carries a start time, a stop time, an emit rate, a speed with random spread, and a particle lifetime (include/niflib/ni_particles.h:88 class NiParticleSystemController; fields at lines 101, 105, 113). A blood spurt or spark burst can be authored as one small record instead of code.
- Typed records from a name: a block factory builds 100 record types from their type names (README.md, Port Status). Idea: effect and unit records looked up by name from a registry.
- Fail loud on unknown data: unknown block types fail with an explicit error (README.md, Port Status). Our data loaders can do the same for unknown effect or zone keys.
- Skinning and morph targets exist as their own record files (ni_skinning.h, ni_morph.h in CMakeLists). Morph targets could blend a creature pose without a full rig. Only file names read.
- Collision and extra-data records are separate from geometry (ni_collision.h, ni_extra_data.h). Hit shapes can live as data on the model, not in code. File names only.

## Inspiration briefs
See the JSON "briefs" key (3 briefs). Effects only; no creature or armour visuals in this donor.

## Cross-link to our cell topics
- vfx: particle controller record (strongest match).
- animation: morph targets and skinning (names only).
- zones, loot, camera, spawns, hud-ui, sound: nothing relevant read.

## Not read
- Function bodies in src/ and the morph, skinning and collision headers beyond their names.
- tests/ bodies.
- The upstream niflib.net licence text (not in repo, not obtained).
