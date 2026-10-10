# OpenRCT2-OpenRCT2 (asset audit, AU040)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/ (VPS, read only)
Half read: client plus engine repo and in-repo data and resources (src/ code not read). The paired data pack (objects.zip, the park objects) is named in assets.json but is NOT in the box.

## Licence
- Code: GPL-3.0 or later (licence.txt line 1; readme.md line 147).
- Assets: no asset licence file in the box. The repo-wide GPL-3.0 statement does not say whether it covers resources/ or data/, so those groups are class C.
- Separate downloads (objects, OpenMusic, sound effects, title sequences, replays) are listed in assets.json with sha256 pins. Their licences are not in the box.

## Rights-holder status (from files only)
Re-implementation of RollerCoaster Tycoon 2 (readme.md line 11). The game needs original RCT2 files (readme.md line 74). Clean-room status is not stated.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Shaders (code) | data/shaders/ | 10 files | B (GPL repo, scope by repo-wide statement) |
| Palettes | resources/palettes/ (base, map_base, map_glass, map_translucent, marker) | 5 folders + sprites.json | C |
| Bitmap fonts | resources/fonts/ (latin 708 PNG, cyrillic, currency) | 899 PNG | C |
| UI art | resources/g2/ | 172 files | C |
| Track and support sprites | resources/tracks/track/ (23 type folders), support/, sprites.json (1.17 MB) | 23 folders | C (origin not stated) |
| Logos and app icons | resources/logo/, resources/mac/ | about 15 | C |
| Language tables | data/language/ (en-GB.txt 3874 lines) | 28 files | C |
| Scenario patches | data/scenario_patches/ | 142 .parkpatch | C |
| Objects, music, sfx (not in box) | assets.json URLs | 5 zips | not in box |

## Inspiration (own words)
- One sprite set, many looks: an 8-bit index texture recoloured by a 256-entry palette (data/shaders/applypalette.frag lines 3 and 12).
- Named palette sets as files (base, map_glass, map_translucent, marker, darken step) for the map and HUD.
- Three glyph sizes per character (bold, small, tiny) keep text sharp when small.
- A translucent glass palette suggests a dimmed overlay for a minimap.
- Content tweaks shipped as data patches (data/scenario_patches).
- Locale ids (STR_XXXX) with value tokens so numbers can sit inside any language's sentence.

## Briefs
- Glass map overlay: keep the translucent layer over the terrain; change to a steel ramp with no grid. Ref resources/palettes/map_glass/.
- Per-zone palette swap: keep one art set with a palette lookup; change the swap to a zone colour grade. Ref data/shaders/applypalette.frag.
- Three-size glyph ladder: keep one face in several pixel sizes; change to one sans with weight steps for 375 px. Ref resources/fonts/latin/a-breve-uc-tiny.png.

## Not read
src/ engine code; the five zips; big manifests (tracks/sprites.json, palettes/sprites.json) sampled only; PNG content (names only); other 27 locale files; parkpatch contents; resources/mac/Assets.car.
