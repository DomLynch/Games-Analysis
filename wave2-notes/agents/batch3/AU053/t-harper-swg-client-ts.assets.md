# t-harper-swg-client-ts (asset audit, AU053)

Donor: /mnt/frankendom-donors/t-harper-swg-client-ts
Halves: read the CLIENT half (src/client, src/iff, README, docs list). Server half in box: SWG-Source-src (not read). Data half in box: SWG-Source-dsrc (read only planet_map_cat.tab name, _RESTRICTED-NOTE.txt and LICENSE.md head).

## Licence (as the files say)
- Code: no LICENSE file at repo root. package.json has no license field. README has no licence line.
- Assets: assets/ holds only README.md. Asset binaries are gitignored and not in the repo.
- Conflict to note: the paired SWG-Source-dsrc has LICENSE.md (LGPL-3.0 text) AND _RESTRICTED-NOTE.txt ("leaked official SWG (Sony Online/Disney) source, proprietary, no licence"). Class C.

## Rights-holder status
Unknown from this repo's own files. The README names a SWG-Source server and the SOE protocol with no copyright line.

## Asset inventory
- tests/fixtures/ (9 files, 60K): object-template IFF (1.5K), portal-layout POB (23K), three STF string tables (48-133 bytes), hex and JSON packet dumps. Binary, not parsed. Class C.
- docs/ (8 files): protocol and handbook prose. Class C, grep hits only.
- Art, models, textures, audio, fonts, maps: none in this repo. Class D.
- Data table in paired folder: SWG-Source-dsrc/sku.0/sys.shared/compiled/game/datatables/player/planet_map_cat.tab (present). Class C.

## Best class: C
Code and fixtures have no grant. Nothing visual or audible to reuse.

## Inspiration (own words)
- Planet-wide landmark pointer: fetch the list once, filter by category, drop inactive, sort nearest-first with an optional radius (map.ts lines 6, 226-232). Recreate as a waypoint pointer for our zones.
- Fixed hub-tag table of about twelve stable ids (map.ts lines 39-52). Use our own hub tags as zone data fields.
- Friendly-name aliases in front of the canonical table (map.ts lines 58-64). Accept common words in authoring, store one key.
- Golden pin test locks the id table so a data bump fails CI (map.ts line 19). Matches our catalogue row 20.
- Versioned binary header checked before trusting entries (src/iff/stf-reader.ts lines 71-72). Same check for any binary catalogue we ship.
- One small golden fixture per binary format, so parsers are testable without the live server.

## Briefs
1. Waypoint Beacon (own label). Keep: cached list, category filter, nearest first. Change: colour by threat or quest state, ground ring plus bearing tick, zone-data source. Ref: src/client/script/map.ts lines 226-232.
2. Hub Tags (own label). Keep: small fixed tag list, stable ids. Change: our own tags (camp, shrine, gate, market, pit) and icons. Ref: src/client/script/map.ts lines 39-52.

Recreate as clearly distinct originals, never a copy. Keep the mechanism; change the look, names and ids.

## Cross-link
- hud-ui: nearest-place pointer and category list map onto our minimap and world map.
- zones: the category table is a zone-type list.
- camera, vfx, animation, sound: none (headless client, per README line 9).
- spawns, loot: none read.

## Not read
- Binary fixture contents, STF entry counts, docs prose beyond grep hits.
- src/terrain/sim and bin/find-flat-land.ts (flat-patch zone-siting search, named in README only).
- src/client/knowledge.ts (export list only).
- SWG-Source-src server half; planet_map_cat.tab rows.
