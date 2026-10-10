# Asset audit: 2004Scape-Server (AU002, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/2004Scape-Server/
Method: ls, find, du, grep -n, head -c, od on PNG headers. No binary asset was decoded. No donor file was copied.

## Licences (as the files say)
- Code: LICENSE reads "MIT License" with "Copyright (c) 2023-2025 Lost City". README.md line 62 says the project "is licensed under the MIT License".
- Assets: no separate asset licence file exists in the repo. The repo-wide MIT text is the only licence statement found. No licence line sits in data/, public/ or view/.
- Third-party in src/3rdparty/bzip2-wasm/LICENSE: bzip2 copyright notice (Julian R Seward, 1996-2019). This is code, not an asset.
- Soundfont public/client/SCC1_Florestan.sf2: the RIFF INFO chunk carries ICOP "Public Domain" (read with strings, binary, no line receipt). The INAM field names "Florestan Basic GM GS". The ICMT field lists two project URLs.

## Rights-holder status (repo files only)
- Code: Lost City is the copyright holder named in LICENSE.
- Game-derived assets (models, maps, songs, sprites, scripts): UNKNOWN. The repo files do not say where they came from. The folder name data/src/models/_unpack is the only hint about extraction, and no file states a source.
- Jagex appears in three places: (1) code comments in 12 files under src/, tools/, view/ and public/ (all on comment lines; for example src/engine/entity/MoveRestrict.ts line 1 links to a social post); (2) comments in data/src/scripts; (3) in-game interface text in data/src/scripts/interface_welcomescreen/ and interface_reportabuse/ (for example a welcome-screen warning that "Jagex staff will NEVER email you"). No licence or permission text for game content was found.

## Asset inventory (counts from find; sizes from du)
| Group | Path | Count / size | Licence stated | Class |
|---|---|---|---|---|
| 3D models (binary) | data/src/models | 11,071 files: 3,454 .ob2 meshes, 7,391 .frame, 226 .base; about 44M | none | C |
| Map data | data/src/maps | 417 files: 414 .jm2, free2play.csv, labels.txt; about 39M | none | C |
| Music | data/src/songs | 182 .mid; about 4.9M | none | C |
| Skill jingles | data/src/jingles | 48 .mid; about 200K | none | C |
| Synth sound (binary) | data/src/synth | 435 .synth; about 2.2M; 38 entries under synth/npc | none | C |
| Sprites, textures, title, fonts | data/src/sprites, textures, title, fonts | 111 .png plus 45 .opt metadata; about 1.5M | none | C |
| Soundfont | public/client/SCC1_Florestan.sf2 | 1 file, 3,272,882 bytes | ICOP "Public Domain" (metadata only) | A |
| Script and content text | data/src/scripts | 2,125 files: 1,159 .rs2, 170 .obj, 151 .if, 116 .npc, 111 .loc, 100 .constant, 70 .varp | none | C |
| Word filter | data/src/wordenc | 4 files, including domainenc.txt | none | C |
| Private key file | data/config/private.pem | exists (see note) | n/a | not an asset |

PNG sizes read from the IHDR chunk: sprites/backbase1.png 501x61; textures/chainmail.png 64x64; title/logo.png 444x142; fonts/p12.png 200x240.

Note: data/config/private.pem and data/config/public.pem are committed in the repo. The contents were not opened, and the file is flagged here only so a human can review it.

## Best class
A, for the soundfont only (its metadata says Public Domain; not independently verified). Everything game-derived is C: no licence line and no provenance statement.

## Inspiration (own words; for recreation from scratch)
- Per-creature sound kits. Each creature has its own folder of synth files (data/src/synth/npc/, for example bat/ holds bat_attack, bat_hit and bat_death). One short sound per action, so a creature is recognisable by ear alone.
- Animation as shared base plus frames. All 226 base and 7,391 frame files sit under data/src/models/_unpack, which suggests one rig per body type with many short poses. Recreate the idea with our own rig.
- Recolour variants. NPC configs (data/src/scripts/areas/area_edgeville/configs/edgeville.npc) change colours through pairs of palette entries (keys recol1s to recol5d) and reuse the same walk and ready animation set. One body gives several liveries for little art cost. No numbers are copied here.
- Tiny modular UI art. Panels are built from many small PNG pieces (sprites/backbase1.png, backleft1.png, backright1.png and so on), with a fixed-cell bitmap font atlas (fonts/p12.png, 200x240). A 9-slice-style panel and a fixed-cell font are an easy original build.
- Small repeating material tiles. textures/chainmail.png is a 64x64 tile, and the folder also holds bark, canvas and darkwood tiles. These show how a low-resolution material set can carry armour and wood cheaply. The tile content itself was not viewed.
- Stinger music for progress. data/src/jingles/ holds one short track per skill advance (names of the form "advance <skill>"), kept apart from looping area themes in data/src/songs/. Reward feedback in a few seconds of music is worth an original take.
- Place-name labels as data. data/src/maps/labels.txt pairs place names with map positions and one extra numeric field, so a plain list drives map labels.

## Briefs (creatures, zones, items, effects)
1. Night-flier (creature). Why it works: a sound-led identity from a small, fast creature with its own attack, hit and death cues. Keep: one sound kit per creature; a small flying silhouette; short attack, hit and death cues. Change: wing count and body plan; a different hue family; a different instrument for the timbre. Ref: data/src/synth/npc/bat/ (the files were named but not decoded; visuals not read).
2. Chainmail tile (material). Why it works: a 64px tile reads as metal at phone size. Keep: small square tile; mid-tone metal read; used for armour material. Change: plate or rivet pattern instead of rings; warmer or cooler metal; a different light direction. Ref: data/src/textures/chainmail.png (size only verified).
3. Cavern zone (zone). Why it works: a zone identity carried by its own looping track and map set. Keep: dedicated loop per zone; enclosed map shape (name level only); zone-specific ambience. Change: lighting colour; a landmark; the instrumentation. Ref: data/src/songs/cavern.mid and data/src/songs/crystal_cave.mid (names only), data/src/maps/.
4. Skill-advance stinger (effect and sound). Why it works: a short reward cue that marks progress without stopping play. Keep: one cue per skill; a distinct tone per skill family; kept apart from the loop. Change: a rising or falling contour; the key; the length. Ref: data/src/jingles/ (for example "advance attack.mid").
5. Recoloured shopkeeper (NPC variant). Why it works: one body shows several roles through colour. Keep: one body in several colourways; role read from colour; shared walk and ready animation names. Change: accessories on the silhouette; a different role colour; a new name. Ref: data/src/scripts/areas/area_edgeville/configs/edgeville.npc (block [generalshopkeeper5]).

## Cross-links to our cell topics
- camera: none in assets. (The 2009 donor has the camera notes.)
- zones: labels.txt and map files (data/src/maps/) are useful for zone layout, not art.
- spawns: NPC configs under data/src/scripts/areas/ define spawns as text.
- loot: item definitions are in data/src/scripts/ (.obj files); not read.
- hud-ui: panel pieces and bitmap font in data/src/sprites/ and data/src/fonts/.
- vfx: not read.
- animation: base and frame files in data/src/models/_unpack/.
- sound: data/src/synth/ (creature kits), data/src/jingles/ (stingers), data/src/songs/ (zone loops).

## Not read / not verified
- All binary files (ob2, frame, base, jm2, mid, synth, png pixels, sf2 except strings output). Formats and counts only.
- The 2,125 script files were not opened one by one; counts come from find.
- public/client/*.js and *.wasm (code).
- data/config/private.pem and public.pem (existence only; deliberately not opened).
- No web facts were used. Rights status is "unknown" wherever the repo is silent.
