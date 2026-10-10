# SWG-Source-client-tools (asset audit, cell AU051)

Donor: `/mnt/frankendom-donors/SWG-Source-client-tools/` (VPS only, read-only). **RESTRICTED** per `_RESTRICTED-NOTE.txt`: leaked official SWG source, proprietary, no licence. Study shape and idea only. Descriptions below stay at category level: no constants, coordinates, colour codes or copied text.
Half read: **client half and tools** (`src/game/client`, `src/engine/client`, `publish/` manifests, `tools/`, `deps/`, `plugin/`). The matching server half is `SWG-Source-dsrc` (data and scripts) and the game server code, which is not in the box.

## 1. Licences (as the files say)
- `_RESTRICTED-NOTE.txt` line 1: "leaked official SWG (Sony Online/Disney) source, proprietary, no licence". This is the only licence-like statement in the tree.
- `README.md` (line 2) says the repo "contains the source for the SWG Client as well as the tools". It has no licence section. A search for "licen" in the README found nothing else.
- Code licence: none stated (restricted note says no licence). Asset licence: none stated.
- Conflict: none in the files read. The restriction is the stated status.

## 2. Asset inventory (what is here)
- **No game art or audio in usable formats**: a name search for `.dds`, `.msh`, `.wav`, `.mp3`, `.ogg`, `.tga`, `.iff`, `.stf`, `.ttf`, `.fbx` returned 0 files.
- **Publish manifests** (`publish/`, 48 files): binary `client_data_tree_files.mft` (26 MB; only the magic header read; it names a build path, not reproduced). Text lists by category: `data_texture_00` (1,608 lines), `data_skeletal_mesh_00` (5,739 lines), `data_animation_00` (5,987 lines), `data_static_mesh_00` (483 KB), `data_music_00` (144 lines), `data_sku1_00` to `_07`, `data_sample_00` to `_04`, `data_other_00` (2.4 MB), `patch_00` to `_08` and more. Contents not reproduced; line counts only.
- **Editor UI images** (png, bmp, ico, cur): `ClientEffectEditor/ui/images` (82), `UiBuilder/res` (37), `AnimationEditor/ui/images` (37), `BugTool/ui/images` (33), `QuestEditor/ui/images` (16), `NpcEditor/ui/images` (15), `TerrainEditor` res (35). Tool art, not game art. Not opened.
- **UI layout files** (`.ui`, 89 in total): `ShipComponentEditor/ui` (18), `SwgGodClient` shared ui (16), `ParticleEditor/ui` (15). Not opened.
- **Tool executables and installers**: `tools/` (about 14 `.exe` and `.dll`), `deps/` (4 installers, including a 67 MB and an 18 MB file), `plugin/win32/`. **Not run, not opened.**
- **Sound-related source**: 78 files with "sound" in the name (for example the sound options page). **Particle-related source**: 135 files. **HUD-related source**: 40 files. Code, not assets.
- **Radar and HUD source**: `src/game/client/library/swgClientUserInterface/src/shared/page/` (ground radar, space radar, HUD pages). Code, not assets.

## 3. Rights-holder status (repo files only)
- Restricted note: "leaked official SWG (Sony Online/Disney) source". README: "SWG Source" project, client and tools source. The restricted note is the stated status.
- Status: **leaked / restricted** (per the note in the repo).

## 4. Best class
**C** for everything usable as an idea (leaked, proprietary, no licence). **D** for executables and installers (not assets; never run). Category-level inspiration only.

## 5. Inspiration (category-level, own words)
- **Ground radar with role-coded blips**: one blip routine draws each nearby object with a shape chosen by role: a targeting bracket, a difficulty ring, a group marker, a waypoint arrow, and a corpse marker (`SwgCuiGroundRadar_BlipPane.cpp` lines 329, 588, 600, 612). Idea: the radar as the main readability tool at 375 wide, with one blip language per role.
- **Radar range from a data table**: the min and max range come from a range table, not hard-coded (`SwgCuiGroundRadar.cpp` line 95). Idea: radar range as zone data, the same way zones are data on one runtime.
- **Effect authoring as tools**: separate editors exist for particles, swoosh trails, lightning arcs, client effects and sound (`src/engine/client/application/ParticleEditor`, `SwooshEditor`, `LightningEditor`, `ClientEffectEditor`, `SoundEditor`). Idea: each effect family gets its own authoring tool and a small set of parameters, so artists can tune weapon trails and hit flashes without code.
- **Animation and skeletal manifests**: the publish lists count skeletal meshes and animations as separate indexed lists (5,739 and 5,987 lines). Idea: animation clips as a catalogue, which fits our row 7 creature clips.

## 6. Inspiration briefs
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. KEPT and CHANGED traits are named below. Category-level only.

1. **Role-coded radar blips (own label)**. Why: at 375 wide, a radar that shows target, threat and waypoint by shape reads at a glance. Silhouette: a bracket for the target, a ring for difficulty, an arrow for the waypoint. Signature behaviour: the blip changes shape when the role changes. Signature sound: none in this donor (ours to design). Kept: one blip language per role; a waypoint arrow. Changed: our own glyph shapes and colour logic; a corpse marker that fades. Ref: `src/game/client/library/swgClientUserInterface/src/shared/page/SwgCuiGroundRadar_BlipPane.cpp` lines 329, 588, 600, 612.
2. **Weapon trail authored in a tool (own label)**. Why: a swoosh trail that artists can tune in a dedicated editor keeps weapon feel adjustable without code. Kept: separate authoring tool for trails. Changed: our own trail shape and fade, tied to our hitstop. Ref: `src/engine/client/application/SwooshEditor/` (directory; files not read).
3. **Lightning arc effect (own label)**. Why: an arc that jumps between two points reads as magic at a glance. Kept: a dedicated editor for arcs. Changed: our own jitter and colour, shown only on the caster's target. Ref: `src/engine/client/application/LightningEditor/` (directory; files not read).

## 7. Cross-link to our cell topics
- hud-ui (minimap / radar): section 5 radar ideas and brief 1. Minimap: 0 files named minimap; the radar is the closest.
- vfx: the effect editors (particle, swoosh, lightning, client effect) are the closest matches.
- sound-music: `SoundEditor` directory and 78 sound-named source files exist; not read.
- animation: animation manifest counts (section 5, row 7).
- spawns / loot / zones: nothing here beyond the radar range table.

## Not read
- All executables, installers, `deps/`, `tools/`, `plugin/`: not run, not opened.
- `client_data_tree_files.mft` and all `publish/*.txt` contents beyond line counts (contents are leaked asset path lists; not reproduced).
- All image files and `.ui` files: counted only.
- `SwooshEditor`, `LightningEditor`, `ParticleEditor`, `ClientEffectEditor`, `SoundEditor` source: directories listed, files not read.
- The radar pages beyond the lines cited.
