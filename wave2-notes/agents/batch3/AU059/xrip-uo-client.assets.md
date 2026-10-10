# xrip-uo-client (asset audit, cell AU059)

Donor: /mnt/frankendom-donors/xrip-uo-client/ (VPS only, read-only)
Half read: client (the UO client renderer and protocol). Server half: not in this box; the README names an external server, not read.
Data first: the box has no art data tables. The only data-layout sources are C++ headers for the MUL formats (include/uo/tiledata.h, animdata.h, animinfo.h, hues.h). Only hues.h and selected Renderer.cpp lines were read.

## 1. Licence

- Code: custom "non-commercial MIT-style" licence. LICENSE line 1 names Ilia Maslennikv (xrip). Line 4 allows use, modification and distribution for non-commercial purposes. Line 11 bars commercial use or monetisation without written permission. README line 618 gives the same name.
- Name conflict: LICENSE says "Maslennikv", README line 619 says "Maslennikov". Recorded as-is.
- Assets: none stated, because the box has no assets. README line 403: no MUL game data is distributed. The user must supply their own from a legitimate install.

## 2. Asset inventory

| Group | Path | Count | Note |
|---|---|---|---|
| Original UO game data | not in box (README table) | about 15 named MUL files | proprietary, user-supplied |
| Documentation | README.md, AGENTS.md, BT.md, bot-client.md, JS-BIBLE.md, pol_packets.md | 6 md | pol_packets.md about 151 KB (not read) |
| Bot scripts | scripts/js/lib/*.js, scripts/js/*.js, globals.d.ts | 7 js, 1 ts | code, not art |
| Test fixture | tests/path_regression.txt | 1 txt | not read |

Found in the box: no PNG, WAV, MP3, TTF, MAP or MUL files. A file-type census of the tree returned code, docs and config types only (cpp, h, bat, js, ts, md, xml, txt, iml, gitignore).

## 3. Rights-holder status (from repo files only)

Decompile-derived reimplementation. _RESTRICTED-NOTE.txt line 1: "rebuilt from decompilation of Origin's original UO client", with "study shape/idea only; never copy code, constants or text". README lines 624-625 describe an independent, educational reverse-engineering project that is not affiliated with or endorsed by the trademark owner. The repo does not establish the owner's rights and I have not looked them up.

Class for this donor: C for anything touching the original client or game data; D for the box's own non-code content.

## 4. Classes per group

- Original game data (user-supplied, not in box): C.
- Docs and protocol notes: D (nothing to take as assets).
- Bot scripts: C (code; not an asset source).
- Overall best class: D for the box's own content; C for the game-data path. Inspiration only.

## 5. Inspiration (category level, own words)

- Hue ramps for whole-sprite recolour. One source sprite is tinted by a fixed-length ramp indexed by one channel of each pixel, so one body gives many dye looks. Fit for gear dressing (row 15) and per-zone colour grade (row 16). Reference: include/uo/hues.h line 17; src/render/Renderer.cpp line 65.
- Target highlight as one tint applied to every layer of the targeted mobile, so body and gear highlight together. Reference: src/render/Renderer.cpp line 22. For us, use a rim and a pulse, not a flat tint.
- Light occlusion. Lights are cut when a roof or interior blocks them, and outside lights are kept out of interiors. Reference: src/render/Renderer.cpp lines 258-274. Fit for torches and zone ambience (vfx).
- Walk glide. The body animation runs in step with a sub-cell slide, and the local avatar stays centred while the world scrolls under it. Reference: README.md line 356. Fit for hero movement (row 6).
- Painter's-order draw. Statics, dynamic items and mobiles interleave by height, and equipment is drawn over the body at the same action and frame. Reference: README.md lines 354-356; src/render/Renderer.cpp near line 399. Fit for gear layering (row 15).
- Sloped ground. Flat tiles are blits; sloped tiles are stretched across four corner heights with a separate texture source. Reference: src/render/Renderer.cpp lines 61-64. Fit for terrain without an art file per slope.

## 5b. Inspiration briefs

Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed. Full entries are in xrip-uo-client.assets.json under "briefs".

1. Dye-ramp body set. Keep one greyscale body with a ramp per dye. Change to a shader palette per rarity tier, plus an accent ring so colour is never the only cue. Ref: include/uo/hues.h line 17.
2. Target rim pulse. Keep one cue on every layer of the target so the whole silhouette changes. Change to an outline rim and a slow pulse in a colour that never matches blood or the hit flash. Ref: src/render/Renderer.cpp line 22.
3. Roof-cut torch. Keep the occlusion-above rule for lights. Change to a zone interior flag instead of tile heights. Ref: src/render/Renderer.cpp lines 258-274.
4. Centred glide walk. Keep the centred avatar and the synced slide. Change to a fixed stride with an ease curve, using our own timings. Ref: README.md line 356.

Top-striking criteria applied: silhouette at 375 wide, one signature behaviour (the rim, the glide, the roof cut), one signature effect or sound (none in this donor: no sound in the box). Resemblance target 20-30 percent.

## 6. Cross-link to our topics

- camera: yes. Painter's order and the centred glide are worth a look.
- zones: no zone data in the box (the map MUL is not present).
- spawns: none in the box.
- loot: none in the box.
- hud-ui: a per-tile minimap colour table is referenced (radarcol.mul, optional, not in box). src/render/Minimap.cpp and RadarColors.cpp were not read beyond the names.
- vfx: light occlusion (lines 258-274).
- animation: mobile body animation and walk cadence (README lines 354-356).
- sound: none in the box.

## Not read

- pol_packets.md (size only), BT.md, bot-client.md, JS-BIBLE.md, AGENTS.md beyond line 1.
- src/ except the Renderer.cpp lines and hues.h line 17 cited above. src/mul/* loaders not opened.
- include/uo/tiledata.h, animdata.h, animinfo.h (layouts not opened).
- scripts/js/* and tests/* (listing only). .idea/* not opened.
- include/win32/MiniFB.h beyond its header comment. Its first 6 lines carry no copyright or licence line; the vendored library's licence is not stated there.
- The server half (external, not in box).

## Unexpected

- AGENTS.md line 1 contains a directive addressed to an agent about reply language. Donor data, ignored.
