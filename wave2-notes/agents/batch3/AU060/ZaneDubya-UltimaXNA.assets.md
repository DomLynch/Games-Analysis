# ZaneDubya-UltimaXNA (asset audit, AU060)

Donor: /mnt/frankendom-donors/ZaneDubya-UltimaXNA/ (599 files)
Code licence: GNU GPL v3 (License.txt; dev/LICENSE.txt; credits.txt line 4 says v3 or later).
Asset licence: none separate. Treated as unclear (class C). Game data is proprietary (class C).
Rights holder: code by the UltimaXNA Development Team (credits.txt line 2). Game data: Ultima Online is (c) 2015 Electronic Arts (credits.txt line 16); UltimaXNA is not affiliated with EA (line 17).
Best class: C.

## Half read
- Read: the client half (dev/, the shader, data tables, docs).
- Server half: not this repo. ReadMe.md line 16 says it is tested against RunUO 2.6 (not in the box).
- Data half: Ultima Online client files are NOT in the tree. ReadMe.md line 14 says so. Loader names were read in code (hues.mul, Cliloc, Music/Digital mp3s).
- Paired donors in the box: ModernUO (server), ClassicUO and crossuo (clients). Not in this batch, not read.

## Licence, plainly
- The repo is GPL v3. Credits say it includes code from RunUO, UltimaSDK and OpenUO (credits.txt line 10); those licences are not in the tree.
- The two cfg data tables say "taken from RunUO" (containers.cfg line 3, bodytable.cfg line 3). The RunUO licence is not in the tree, so the status of those tables is unclear.
- No file states a licence for res/ art or the shader beyond the repo GPL.

## Asset inventory (non-code only)
| Group | Path | Count / size | Class |
|---|---|---|---|
| Client data pack | not in tree; loader names in dev/Ultima/Resources/HueData.cs (line 66), ClilocResource.cs (line 48), dev/Ultima/Audio/UOMusic.cs (line 29) | absent | C (proprietary) |
| Data tables (cfg) | dev/Data/bodytable.cfg (about 1,114 lines); dev/Data/containers.cfg (50 lines) | body rows by type column: 509 Equipment, 218 Monster, 75 Animal, 19 Human, 4 Sea | C |
| Credits page | dev/Data/credits.txt | 1 short file | C |
| Logos and icon | res/UltimaXNAIcon64.png, res/UltimaXNALogo1024.png, res/ultimaxna.ico | 2 PNG, 1 ICO (sizes not measured) | C |
| Shader (HLSL) | dev/Content/Shaders/IsometricWorld.fx (205 lines); res/depreciated/ParticleEffect.fx | 1 active file, 4 pixel shaders, 2 techniques named | C (GPL code, shape only) |
| Docs | doc/VertexPositionNormalTextureHue.txt, doc/Html tags supported by UltimaXNA.txt, doc/CodeAudit.txt | 3 text files | C |

No creatures, no sprites, no maps, no audio, no fonts ship in the box. Font and map code loads client files that are absent.

## Data first
- Body classes: dev/Data/bodytable.cfg maps a body ID to a class (equipment, monster, animal, human, sea). Header at line 9.
- Containers: dev/Data/containers.cfg maps a container gump ID to a rectangle, a drop sound and an optional item-ID whitelist. Field format at line 10.
- Hues: the hue palette is read from a client file, expanded from 5-bit to 8-bit colour and packed into two lookup textures (dev/Ultima/Resources/HueData.cs lines 66-83). The table is absent here; the loader is the cited half.
- Hue IDs for skin, hair and text tones are set in code (dev/Ultima/Data/Hues.cs lines 5-43). Numbers are not reproduced here.

## Inspiration (class C: category level)
- Grey-to-ramp recolour. A neutral sprite takes many tints because its brightness selects a column in a per-tint ramp (dev/Content/Shaders/IsometricWorld.fx PixelShader_Hue). The ramp is a short strip per hue, not a gradient.
- Two recolour modes: full tint, or tint only the neutral pixels so coloured trim survives (IsometricWorld.fx line 92 comment).
- One vertex attribute packs tint, tint mode, transparency and a no-lighting flag (doc/VertexPositionNormalTextureHue.txt lines 5-9).
- Container gumps as data: rectangle, drop sound, item whitelist (containers.cfg). A chest that takes only some items, with its own sound.
- Body classes keyed by body ID (bodytable.cfg). Gear rules attach to a class, not to each creature.
- Stencil shadow pass: an opaque sprite writes one dark half-transparent pixel (IsometricWorld.fx PixelShader_ShadowSet). Good for ground shadows under creatures.
- Legacy rich-text subset with block layout and unknown tags ignored (doc/Html tags supported by UltimaXNA.txt).

## Briefs (Dom's rule: recreate as a clearly distinct original; never a copy)
1. **Neutral-ramp armour finish.** Keep: a brightness-indexed ramp per tint, plus a partial mode that tints only neutral pixels. Change: our own ramps per material with a hard specular band; the tint on a second channel so hit flash does not wipe the highlight. Ref: dev/Content/Shaders/IsometricWorld.fx (PixelShader_Hue); dev/Ultima/Resources/HueData.cs.
2. **Locked chest with item filter and own drop sound.** Keep: each container is data (place on the gump, drop sound, whitelist). Change: our silhouette and lid animation; sound tied to rarity; a rim glow when a valid item hovers. Ref: dev/Data/containers.cfg.
3. **Body-class gear rule.** Keep: body ID to class table; rigs and gear key off the class. Change: our classes (plated biped, armoured quadruped, serpent, winged), each with its own rig rule and a visible silhouette change when worn. Ref: dev/Data/bodytable.cfg.
4. **Single-pass ground shadow.** Keep: a stencil gate so overlapping sprites do not darken twice. Change: a soft oval for bipeds, a wider flat shape for quadrupeds. Ref: IsometricWorld.fx PixelShader_ShadowSet.
5. **Tag-subset item text.** Keep: a few tags, block layout, unknown tags ignored. Change: our own rarity and stat tags; our palette. Ref: doc/Html tags supported by UltimaXNA.txt.

## Cross-links
- HUD-UI: legacy rich text, gump containers, the isometric view.
- Loot: container whitelist and drop sound (containers.cfg); body classes for gear.
- Gear dressing (row 15) and colour grade (row 16): the hue ramp and the two modes.
- VFX: the shadow pass; the (unread) particle effect file.
- Sound-music: named mp3 tracks per region from client data (absent); audio loaders not read.
- Camera: isometric world shader, not read beyond the hue, shadow and grayscale passes.

## Not verified
- All client data (absent). Loader code was read only at the cited lines.
- Remaining shader passes (MiniMap), the grayscale pass body, ParticleEffect.fx, the art/gump/animation loaders, UOSound.cs, AudioService.cs, doc/CodeAudit.txt, plugins/ExamplePlugin/.
- Pixel sizes of res/ art. Full cfg tables beyond the first rows.
- Licences of RunUO, UltimaSDK and OpenUO: not in the tree.
