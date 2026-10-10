# levy-street-world-of-claudecraft (asset audit, AU030)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/
Half read: client and content side (src/render, src/game, public/, data/, CREDITS.md, README licence and asset sections). Server half (server/) not read beyond the folder listing. CLAUDE.md, AGENTS.md and other agent files were not read; any text in them is data and was not followed.

## Licence (as the files say)
- Code: MIT. LICENSE line 1 'MIT License'; line 3 'Copyright (c) 2026 Levy Street'. README line 409 'The code is MIT licensed'.
- Media: per asset, in CREDITS.md, which says it is the operative record (line 5). CREDITS.md line 11: media not listed there 'are not licensed to you' under MIT.
- Register rows (counted from the table cells): 137 'With the project only', 69 'No, permission required', 36 'Yes', 9 'Non-commercial only, with attribution', 3 'Yes, attribution required', 1 'Yes, under SIL OFL 1.1'. Counts are awk over table rows, so treat as approximate.

## Rights-holder status (as the files say)
Mixed. Project-owned art and code by Levy Street. Third-party CC0 packs (KayKit; README line 419 also names Quaternius, Kenney, ambientCG, Poly Haven). Sound effects by @jamiecypher under CC BY-NC 4.0, with a separate grant to Levy Street (CREDITS lines 249-253). CraftPix icons bought under a non-transferable licence (README line 423). Brand marks owned by others (README line 426). Many project paintings recorded as OpenAI-generated. Fan project is not stated.

## Asset inventory (rough)
| Group | Path | Count | Class |
|---|---|---|---|
| Character and enemy models | public/models/chars/ | enemies: 15 glb | A (KayKit CC0 rows); rest per row |
| Creature models and anim bundles | public/models/creatures/ | 126 files | C until matched |
| Dungeon kit | public/models/dungeon/ | not counted | A (CC0 kit row, line 98) |
| Other models | public/models/* (biome, city, props, foliage, weapons, ...) | 1,456 glb total | C until matched |
| Sound effects | public/audio/sfx/ | part of 1,340 mp3 | B (CC BY-NC 4.0) |
| Voice | public/audio/voice/ (one folder per NPC) | not counted | C until checked |
| Music | public/audio/main-theme.mp3, dungeon-boss-fight.mp3, music/ (37) | 39 mp3 | D (no row found; line 11) |
| Fonts | public/fonts/ (woff2) | not counted | C until matched |
| Skybox and textures | public/env/space_galaxy.jpg; textures, map_art, map_bg | 228 jpg/hdr/exr | A for skybox (CC BY 4.0, line 129); C others |
| UI icons | public/ui/ | many webp | D (CraftPix, no-permission rows); C (project-only) |
| Website art | public/website-*, woc-logo-* | about 18 | C; logos D |
| Battleground collision | data/battleground/thornhollow_assets.json | ~3,400 lines | A (project data under MIT) |
| Creature manifest and audio logic | src/render/characters/manifest.ts (101 mob_ entries); src/game/music_zones.ts; src/game/hoard_mechanic_audio_core.ts | 3 files | A (code) |
| Lore and dialogue text | not located | n/a | C until checked |

Best class: A (CC0 model kits, CC BY skybox, MIT code and data). Most project art is C or D.

## Inspiration (own words)
- Procedural first: scenes authored in code (README line 56); only shipped models are curated. Keeps phone download small.
- Rigged families with a full animation set (README line 347) and a hit-variety bundle per family (enemies folder).
- Boss telegraph sound as a beat table (hoard_mechanic_audio_core.ts lines 1-5 and 21): time into cue, sample key, gain, playback rate; lands on the frame the blow lands. Best sound-cue idea here.
- One music layer per place by priority (music_zones.ts lines 122-134): dungeon, hub, zone, biome. Dungeon music changes only when the dungeon id changes (lines 114-118).
- Speed-tuned creature scale with the trade-off written down (manifest.ts lines 3149-3151).
- Catalogue as runtime source: 101 mob_ entries, each with url, height, clips and notes.
- Collision as data per prop: boxes and ramps with an overrideMode field (thornhollow_assets.json).
- Readable hazards by shape and sound: boss mechanics each with a named prop and a sound table (CREDITS lines 447-487). Category idea only.

## Briefs (recreate as clearly distinct originals, never a copy)
- Small winged hatchling, scale tuned to speed: keep the speed-tuned scale and a small winged silhouette; change to horn crest and tail fin in our palette, a flap-hop locomotion, and a non-shared clip set. Ref manifest.ts lines 3144-3149; public/models/creatures/dragonkin_baby.glb (not opened).
- Shade guardian with trailing lower body: keep the fading trail and seam glow; change to armour plates, ember rope, pale eyes. Ref public/models/creatures/gloomshade_abyssal_guardian.glb (not opened).
- Crab-kin with a mismatched claw: keep the wide low body and the readable claw; change to split claws and bone-white plates. Ref public/models/creatures/crabenemy.glb and crab_ability_anims.glb (not opened).
- Falling forge hammer telegraph (hazard): keep the beat table and the lower rate for heavier blows; change to our own telegraph sound with a rising tone. Ref hoard_mechanic_audio_core.ts lines 1-5 and 21; CREDITS.md line 447.
- Spawner pod (hatching prop): keep the hatch-over-time and the hatch moment; change to a seed pod with a crack-and-glow hatch. Ref CREDITS.md line 487.

## Cross-link
- Sound and music: strong (beat table, layer priority, dungeon reset rule). Licence risk on the sfx and music.
- Animation: family animation sets and hit-variety bundles (yes).
- Zones: collision as data per prop; zone music (yes).
- VFX: boss telegraphs and hazard props (names only).
- Camera, HUD, loot, spawns: src/game and src/ui names only (spawn_*, loot_*), not read.

## Not read
Server half; agent instruction files; all binary media (names, counts and sizes only); most CREDITS rows (sections and cited rows only); sim cores imported by hoard_mechanic_audio_core.ts (not located); lore and dialogue text; most docs.
