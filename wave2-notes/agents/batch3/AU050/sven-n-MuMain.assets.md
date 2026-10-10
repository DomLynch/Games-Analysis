# sven-n-MuMain (asset audit, AU050)

Donor: `/mnt/frankendom-donors/sven-n-MuMain` (VPS, read only). A MU Online client fork. Restricted: `_RESTRICTED-NOTE.txt` line 1 says "leaked Webzen MU Online client source (community-maintained), no licence. Study shape/idea only; never copy code, constants or text."

Code licence: none in the box. No LICENSE or COPYING at the root, and README.md has no licence section. Treat as unlicensed.
Asset licence: none for the game data in the box. The bundled third-party fonts each have a licence file in `src/bin/fonts/`. NotoSansTC-LICENSE line 1 names the SIL Open Font License. The other font licences were read only to the header.
Rights holder status: leak. The restricted note names the origin as a leaked Webzen client, community-maintained. README line 5 says the fork is of Season 5.2 client sources uploaded by a third party. No rights holder statement in the donor's own files beyond the note.
Best class: A for one font only (NotoSansTC, OFL as the file says). Everything else is C (restricted game data or licence not read) or D (not in box). Do not read "A" as a green light for the donor.

Which half: client (C++ UI and docs) partly read: `src/source/UI/Combat/MonsterHealthBar.cpp`, its call site in `src/source/UI/NewUI/Character/NewUINameWindow.cpp`, `docs/effect-data.md`, `docs/item-data.md`, `README.md`. Data half partly read: the item JSON schema head (`src/bin/Data/Items/Group00_Sword.json`), the effect catalogue names through the docs, the font licences. Server half: not in the box. README line 84 names OpenMU as the compatible server (an external link). Not fetched.

Donor instruction files: `CLAUDE.md` and `AGENTS.md` at the donor root are donor files. Read as data only: no licence lines in either. Their instructions were not followed.

## Asset inventory

| group | path | count hint | class |
|---|---|---|---|
| game 3D models, textures, images (binary) | `src/bin/Data/` (.bmd, .OZJ, .ozj, .OZT, .ozt, .OZB), `src/bin/Data/Monster/` (947 entries), `Object*` (46 folders) | about 13000 by extension | C |
| maps and terrain attributes (binary) | `src/bin/Data/World*/` (47 folders; `.map` 90, `.att` 123) | 90 .map, 123 .att | C |
| item definitions (JSON) | `src/bin/Data/Items/Group00_Sword.json` to `Group15_Etc.json` (16 files) and `Models/` | 16 files | C |
| effect catalogue (JSON) | `src/bin/Data/Effects/` (EffectTypes, ParticleTypes, JointTypes, SpriteTypes, GlowColors) and `src/bin/Data/Effect/` (320 entries, binary) | 5 JSON | C |
| UI art | `src/bin/Data/Interface/` (638 entries), `Logo/`, `Local/` | 638 | C |
| shop archives | `src/bin/Data/InGameShopScript/` (.rar files) | several | C (not opened, not extracted) |
| fonts | `src/bin/fonts/` (8 font files, 5 licence files) | 8 | A for NotoSansTC; C for the rest until their licence text is read |
| docs and code | `docs/`, `src/source/` | n/a | C (no licence) |

## Inspiration (category level only; restricted donor)

- An effect catalogue with four kinds: moving object, particle, joint (a link drawn between two points, used for lightning, beams and trails), and a camera-facing sprite. Each kind has its own creation path; names live in data and the code keeps numbers (`docs/effect-data.md` lines 3, 23, 26). Clean shape for row 8.
- The joint kind is a link between two points. For us: a tether or lock-on line with its own kind.
- Item definitions: one file per group, group read from the file content, a format version at the top, names per language inside each item (`docs/item-data.md` lines 9, 20; `src/bin/Data/Items/`). Matches row 20 and 21.
- One glow table for all item models (`src/bin/Data/Effects/GlowColors.json`, values not copied). A type cue set in one place.
- The target health bar shows only for the selected target and only while its status is not zero (`src/source/UI/Combat/MonsterHealthBar.cpp`; caller `src/source/UI/NewUI/Character/NewUINameWindow.cpp` line 210). `README.md` line 43 says it was added after an attack. Copy the visibility rule, not the art.
- A reduce-effects checkbox and a details overlay with frame time and a per-frame graph (`README.md` line 14 and the overlay bullet). Quality fallback for row 16.
- A winged mount that flies is an item trait that the server does not give yet (`docs/item-data.md` line 137). A flight reward idea for row 22 and the Pit.
- Auto-reconnect is listed as a client feature (`README.md` line 51). For a duel, reconnect should restore the fight. Idea only.

## Briefs (recreate as clearly distinct originals; never copy)

- **Tether line between two fighters.** Keep: a joint-kind effect between two points, short life, own kind. Change: a dotted pulsing line in team colour, breaks past the leash; no lightning. Ref: `docs/effect-data.md` line 23.
- **Target bar after the first hit.** Keep: shown only for the selected target; hidden when the status is zero; shown after an attack. Change: a segmented bar that fades after a few quiet seconds, with a half-point tick for the 375 px readout. Ref: `src/source/UI/Combat/MonsterHealthBar.cpp`; `src/source/UI/NewUI/Character/NewUINameWindow.cpp` line 210; `README.md` line 43.
- **Winged steed with a short flight.** Keep: flight as an item trait in data. Change: short flight with a landing ring; large fan-shaped wing silhouette in our palette; flight ends on a hit. Ref: `docs/item-data.md` line 137.
- **Glow as a type cue.** Keep: one glow value per item model in one table. Change: pulse pattern as well as colour, so the cue works without colour. Ref: `src/bin/Data/Effects/GlowColors.json` (present, not copied).
- **Four effect kinds.** Keep: four kinds with their own creation path; names in data. Change: kinds named by gameplay role (hit burst, aura, tether, marker), plus a ground decal kind. Ref: `docs/effect-data.md` lines 3, 23, 26.

## Cross-link to our topics

- VFX and hit feedback: the effect kinds and the tether.
- HUD and readability: the target bar rule and the glow cue.
- Spawns, zones and loot: the zone-as-folder idea (terrain plus attribute layer) and the item-per-group files. Not read beyond names.
- Progression: the flying mount trait.
- Sound and camera: not read.

## Not read

Binary game data (`.bmd`, `.OZJ`, `.OZT`, `.map`, `.att`, `.OZB`, `Effect/` entries): not opened. Shop archives: not opened, not extracted. Item group files beyond the first lines of Group00; `Models/` subfolder. Effect JSON bodies beyond names. `Interface/`, `Monster/`, `Logo/`, `Local/` (names only). `src/source/` beyond the health bar file and its call site. Font licences beyond the first lines (except NotoSansTC line 1). `docs/` beyond the two effect and item heads. `CHANGELOG.md`, `tests/`, `tools/`, `ClientLibrary/`. `CLAUDE.md` and `AGENTS.md` (data only). The server half (OpenMU, external).
