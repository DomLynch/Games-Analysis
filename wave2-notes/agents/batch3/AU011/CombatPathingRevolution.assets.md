# CombatPathingRevolution: asset audit (AU011)

Root on VPS: /mnt/frankendom-donors/CombatPathingRevolution/ (read-only, nothing copied).

## Licences (what the files say)
- Code licence: MIT. LICENSE line 3 reads "Copyright (c) 2022 max-su-2019". README line 56 links "[MIT](LICENSE)".
- Asset licence: none separate. The only licence file is the root LICENSE (MIT). The repo contains no art, audio, models, fonts or maps.
- Game dependency: the README says the plugin is for Skyrim (line 3: "SKSE/VR plugin that introduced modern action game combat pathing AI into skyrim."). Line 26 "Needed for SSE/AE" refers to a separate Address Library the user must install. The game itself is not in the repo.
- Credit lines (README lines 58-65): the README credits Fenix for "source codes from his combat AI" (line 61) and Dtry for "for sharing the source codes from payload interpreter" (line 63). The repo does not state the licence of those credited source parts.
- Rights-holder status: fan/mod plugin for a commercial game (per README). Copyright line names max-su-2019; info.ini line 1-2 names the mod and author Maxsu. Game rights are not in the repo.

## Asset inventory
| Group | Path (under root) | Count / size | Licence | Class |
|---|---|---|---|---|
| Behaviour data (Havok XML) | Nemesis_Engine/mod/mscpr/0_master/#0106.txt (69 KB), #0107.txt (18 KB), #0108.txt (154 KB) | 3 | MIT (repo) only; data origin not stated | C |
| Mod metadata | Nemesis_Engine/mod/mscpr/info.ini | 4 lines | MIT (repo) | A (metadata) |
| Behaviour variable config | BehaviorDataInjector/MaxsuCPR_BDI.json | 2.7 KB, one list of named variables | MIT (repo) | A (config, game-specific names) |
| Debug symbols | CombatPathingRevolution.pdb | 36 MB binary | MIT (repo) | D (build artefact; not opened) |
| Docs | doc/en/Developers Guidelines of CPR.md, README.md | 2 text files | MIT (repo) | A (text) |

Game content: no art, sprites, models, textures, audio, fonts, maps or game text. Extension count: h 16, cpp 12, txt 4, json 3, md 2, in 2, ps1 1, pdb 1, ini 1.

## Inspiration (own words)
- The mod's core is a set of distance bands around an enemy: an inner minimum, mid and maximum radius, plus a switch that enables an advance radius. Recreate as a readable engagement ring for our own melee AI, drawn on the ground rather than hidden in numbers.
- The source tree names four movement modes as separate hooks: circling, backing off, advancing and a fallback. A four-state melee spacing model, which an AI author can rebuild from scratch.
- The developer guide has a "Debugging In Game" section. The idea (show the AI's current choice on screen while it runs) is worth copying for our own AI debugging overlay.
- The README calls it "modern action game combat pathing". The mood is grounded, reactive melee circling, not scripted choreography.

## Inspiration briefs
1. Engagement ring (own label). Why it works: it makes spacing readable at a glance; the player sees who is in range. Traits worth keeping: three nested distance bands; a toggle that adds a fourth advance band; the ring follows the target. Traits to change: draw as ground decals in our palette, not debug text; uneven band widths; a per-enemy ring colour. Ref: BehaviorDataInjector/MaxsuCPR_BDI.json line 17 (the radius variables block).
2. Four-mode spacing brain (own label). Why it works: a small, readable set of movement moods (circle, back off, advance, fallback). Traits to keep: a fallback state; mode switching by distance; a readable state name. Traits to change: our own state names and timing; a bias toward flanking; a per-archetype mode weight. Ref: src/Circling_Hook.cpp, src/Backoff_Hook.cpp, src/Advance_Hook.cpp, src/Fallback_Hook.cpp (names only; not read).

Note: the briefs are mechanics, not art. No visual creature, armour or effect exists in this donor.

## Cross-link to our topics
- camera and hud-ui: the debugging overlay idea (in-game state readout) is relevant to hud-ui.
- zones and spawns: the engagement ring is a zone idea for melee encounters.
- animation: the Havok behaviour files are animation-graph data for Skyrim; not reusable as animation assets.
- loot, vfx, sound: no assets here.

## Not verified
- The contents of #0106 and #0108 were not read; only the first lines of #0107.
- The .pdb (36 MB) was not opened.
- The src/*.cpp and *.h hooks were not read; only file names.
- Docs: only the first line of the guide was read; the "Debugging In Game" section was seen only as a table-of-contents entry.
- The BDI JSON was read to line ~20 only.
