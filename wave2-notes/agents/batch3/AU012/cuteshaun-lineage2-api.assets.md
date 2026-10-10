# cuteshaun-lineage2-api: asset audit (AU012)

Source tree: /mnt/frankendom-donors/cuteshaun-lineage2-api/ (read-only on VPS). Half read: data-pack half (datapack names, generated JSON names, parser scripts, public API code and docs). The game-server half is not in this donor; its datapack source is named as aCis in script comments and was not read. Matching halves in the box by name only (not read): Lineage 2 server or JS projects elberacasa-Lineage2Elbera, pmbstyle-L2Solo, ax-grymyr-l2dn-server, NodeL2-NodeL2, realratchet-Lineage2JS, pier-oliviert-lineage; client halves shnok-l2-unity and gawric-Unity-Client-for-L2J.

## Licences (as the files say)
- Code: MIT, "Copyright (c) 2026 Andrii Tsapko" (LICENSE lines 1 and 3).
- README line 54: "Community project. Not affiliated with NCSoft." docs/api.md line 28: "Not affiliated with or endorsed by NCSoft."
- No separate asset or data licence. The generated dataset is committed (README line 40). The icon pack README (public/landing-icons/README.md line 1) says the icons were extracted from an approved icon-pack screenshot and does not name the approver.

## Asset inventory (data first)
- Data tables (primary): data/datapack/interlude/*.dat, 16 binary files (name tables such as itemname-e, skillname-e, questname-e, npcname-e, zonename-e; plus grp and recipe tables). Not opened.
- Generated JSON: data/generated/interlude/*.json, 16 files visible (items, npcs, drops, spawns, quests, skills, recipes, regions, huntingzones, armor-sets, hennas, multisells, buylists, classes, spellbooks, questname). Contents not read beyond names.
- Icons: public/icons/ 4002 PNG (about 16 MB). File names look like client-style icon ids (etc_, weapon_, armor_, skill####, action###). Origin not stated.
- Landing icon pack: public/landing-icons/, about 56 other PNG plus flat_offwhite/ raw crops (14). Raster extractions with @2x nearest-neighbour copies (README line 1).
- Web fonts: public/fonts/DepartureMono-Regular.woff2 and ia-writer-quattro-latin-400-normal.woff2. Licence not read.
- Map and creature art: none as art; creatures and zones exist only as data rows.

## Classes
- Code: MIT (A for the repo's own files).
- Icons, landing pack, datapack tables, generated JSON: C. Origin and licence not stated in the tree.
- Fonts: C until the licence is read.
- Rights holder: unknown.

## Inspiration (own words; category-level because the data is unlicensed)
- Icons at 1x plus a 2x copy with nearest-neighbour scaling keep pixel edges crisp on phones.
- Item icons use a strict per-category name rule with an index, mapped from group tables by a script (scripts/audit/map-item-icons-grp.ts, lines 5 to 7). About 4000 icons stay addressable by code.
- Pipeline: raw tables, then parser, then committed JSON, regenerated only when a parser changes (README, Local development section).
- Zone geometry (regions, huntingzones) and spawns are separate tables in data/generated/interlude/. Keep map shape and spawn list apart.
- Shops, crafting and dye are data tables (buylists, multisells, recipes, hennas): one generic shop shape can serve many shops.
- The landing icons suggest category motifs: a floral weapon, a worn blade, a single-eye monster, a navigation emblem, a guardian figure. Redraw these from scratch.

## Briefs (category-level; named from file names only, images not opened)
1. Floral weapon emblem. Keep: thin shaft, bloom-shaped head, dark ground with one accent. Change: crystal or bone head, cool accent, engraved shaft. Ref: public/landing-icons/blood-orchid.png.
2. Worn blade emblem. Keep: chipped edge, one highlight. Change: ring-guard hilt, frost wear. Ref: public/landing-icons/forgotten-blade.png.
3. Single-eye monster emblem. Keep: one eye as focal point, monster read from eye and brow. Change: several eyes or tentacle crown, different palette. Ref: public/landing-icons/eye-monster.png.
4. Pixel navigation emblem. Keep: two rings and a needle, pixel-stepped edges. Change: octagonal bezel, needle shape. Ref: public/landing-icons/compass-pixel.png.
Rule for every brief: recreate as a clearly distinct original, never a copy.

## Cross-link
Zones and spawns: the regions, huntingzones and spawns tables are worth a look for the zone and spawn cells. Loot: drops.json. HUD-UI: landing icons and icon grid. Camera, VFX, animation and sound: no assets here.

## Not read
See not_read in cuteshaun-lineage2-api.assets.json (binary .dat and icon contents, JSON contents, snapshots, font licences).
