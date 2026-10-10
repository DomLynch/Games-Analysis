# shoff-ShadowbaneCacheViewer (asset audit, cell AU049)

Donor: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer (VPS). This is a C# and C++ viewer and exporter for Shadowbane cache files. It is a tool, not a game.
Read: README.md, src/Shadowbane.Cache/ObjectType.cs, src/Shadowbane.Models/Deed.cs and Particle.cs, src/Shadowbane.Cache.IO/BadRenderIds.cs (head), Documents/ folder listing and one CObjects text view (first line), Exports/ listing and sizes, 010Templates/mesh.bt (header), licence heads of the bundled web libraries.
Half read: DATA pack is NOT in the box. The README says the .cache files are not included. I checked the file-extension listing of the whole tree: no .cache files are present. What is here is the CODE that parses them (the client-side half) plus some dumps and docs. Matching half: the game client that produced the .cache files is not in this box and was not read.

## Licence (what the files say)
- Code licence: no LICENSE, COPYING or NOTICE file at the repository root or in src/ or Native/. Stated as: none in the repo.
- Asset licence: README.md lines 4-5 say the actual .cache files "are the property of the owner of the Shadownbane intellectual property" and "not contained in this repository". Asset licence for anything else: none stated.
- Bundled web libraries (src/Shadowbane.Web/wwwroot/lib): jQuery licence text begins "Copyright JS Foundation and other contributors" (LICENSE.txt line 1); Bootstrap LICENSE line 1 "The MIT License (MIT)". Those are code libraries, not game content.
- The 010 templates (010Templates/*.bt) carry a header "010 Editor v9.0.1 Binary Template"; README says they are incomplete. No licence on the templates.

## Rights-holder status (repo files only)
"unknown": the README says the cache file IP belongs to the owner of the Shadowbane IP but does not name that owner, and it does not say whether the viewer author is a fan, a clean-room author or a licensee. Cache files are excluded. The Exports and Documents folders contain material whose origin is not stated.

## Asset inventory (paths under the donor root)
1. Cache object text views: Documents/CObjects_Text_Views, 13 files, 76K. Hex dumps of cache records (UTF-16 bytes), not readable text. Origin: game cache, not stated. Class C.
2. Exports/: 10 Wavefront .mtl material files, all 0 bytes (empty placeholders); no .obj files present. Names are prop names (for example Lizardman Totem, Bramble Gate, Snake Hut, Hourglass, Crater, Fallen_C, Tree, Rock 1, Ground, Scroll Rack). Class D (empty, no usable content).
3. Documents/ExportedFromMaya: head.mtl and boxes.mtl (material blocks), 110122.png and 110123.png (40K each), two .mayaSwatches files. Origin of the PNG textures not stated. Class C (unclear).
4. src/Shadowbane.Cache/uv_map.png (528K). UV map image, origin not stated. Class C (unclear).
5. Documents/CacheObjectIndexes.rar (8.7M). Archive, NOT opened (not extracted, by rule). Contents unknown. Class C (unclear, may be game-derived index data).
6. Documents/duplicate_render_ids.xlsx (not opened). Spreadsheet of duplicate render ids, per the name. Class C.
7. Documents PDFs: opengl-book_pdf.pdf (44M), comparison_of_3d_file_formats.pdf (392K), asfamcfileformat.pdf (60K). Third-party documents. Licence not stated in the repo; not opened. Class C (unclear).
8. 010Templates: 11 .bt binary templates (CacheObjects, Skeleton, mesh, indexed_texture, RenderInfo variants, Type4, Type9, type13). These are format-description code, not game art. No licence is stated for them, so class C for reuse.
9. Native/ C++ viewer (skeleton, animation, animcontrol, model, texture, canvas, objects, zones). Code, not art. Not read beyond file names.

## Classes per group
- Game-derived content (cache text dumps, Maya exports, uv_map, CacheObjectIndexes.rar, xlsx): C.
- Empty Exports .mtl placeholders: D.
- Third-party PDFs: C (licence not stated).
- Bundled jQuery and Bootstrap (MIT per file): code libraries, not art. Not classed for assets.
- Nothing is class A or B. No donor asset is licensed for reuse in the files read.

## Inspiration (own words, category level)
- Object taxonomy by flag bits: sun, basic props (pillars, rocks, trees, monuments, static structures), buildings and interactive objects, items (weapons, armour, equipment), mobile things (creatures, NPCs, characters), deeds, keys and warrants, particles and interface. A single enum with a comment per flag. Ref: src/Shadowbane.Cache/ObjectType.cs lines 3-26. Use for our zone-data categories (props, interactive, creatures, loot).
- A claimable plot marker ("deed") is one record with three presentation ids: a world render id, an inventory icon id and a minimap icon id. One entity, three views. Ref: src/Shadowbane.Models/Deed.cs lines 6-29. Matches our hud-ui topic (minimap and inventory).
- A skip list for known-bad render ids checked at load time, so one broken entry does not stop the load. Ref: src/Shadowbane.Cache.IO/BadRenderIds.cs lines 7-17.
- One parser per object kind, chosen by the type flag, each reading its own fields from an offset (Deed, Particle, ModelObject). Good shape for a zone-data pipeline: a small record type per kind with its own parse step. Ref: src/Shadowbane.Models/Particle.cs lines 6-24 (particle record is one render id, minimal).
- Format discovery by hex dump and by 010 binary templates kept next to the code. Method idea for any binary donor: keep the template beside the parser so a future reader sees the byte layout. Ref: 010Templates/mesh.bt line 2.
- Material blocks in Maya export form a single named material with diffuse, specular, transparency and shine terms. Shape only (no values recorded here). Ref: Documents/ExportedFromMaya/head.mtl lines 1-8.

## Inspiration briefs (recreate as clearly distinct originals; never copy)
Looks of the props were NOT read (the .mtl files are empty, no .obj in the box). Briefs use names and code only.
1. Claim plot marker (label: "Land claim stake"). why it works: one claim object shows up in three places (in the world, in the bag, on the minimap) with the same identity. keep: one record, three icon ids; a claimable plot. change: a stake with a pennant instead of a deed sheet; our zone colour as the palette key; no unused id fields. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/src/Shadowbane.Models/Deed.cs lines 14-29.
2. Thorn-wrapped gate (label: "Vine gate"). why: a gate prop reads as a barrier at 375 wide. keep: a passable-or-blocked barrier prop. change: a hinged wooden gate with a lantern, not thorns. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Exports/Bramble Gate.mtl (0 bytes; name only, look not read).
3. Timer hourglass prop (label: "Sand timer shrine"). why: a visible countdown object in a zone gives players a readable clock. keep: a timer prop placed in the zone. change: a stone shrine with a flame instead of sand; the flame drops at the timer end. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Exports/Hourglass.mtl (0 bytes; name only).
4. Crater hazard (label: "Impact pit"). why: a pit is a readable hazard shape on the ground. keep: a ground-level hazard. change: a glowing rim and a smoke column instead of a flat hole. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Exports/Crater.mtl (0 bytes; name only).
5. Lizard totem (label: "Clan totem spire"). why: a tall totem reads as a landmark at range. keep: a tall totem landmark. change: a stacked head design of our own, a different ornament set, a coloured banner. ref: /mnt/frankendom-donors/shoff-ShadowbaneCacheViewer/Exports/Lizardman Totem.mtl (0 bytes; name only).

## Cross-link
- hud-ui: minimap and inventory icon ids on one record (Deed.cs).
- spawns and encounters: object taxonomy by flag (ObjectType.cs) for prop and mobile counts.
- loot: items category in ObjectType (flag 0x9) only; no drop data read.
- vfx: Particle.cs is a single-id record; no effect data read.
- animation: Native/animcontrol.cpp and Skeleton.cs exist; not read.

## Not read
- The .cache game data (absent from the box; README excludes it).
- CacheObjectIndexes.rar (8.7M, not opened or extracted).
- duplicate_render_ids.xlsx (not opened).
- opengl-book_pdf.pdf, comparison_of_3d_file_formats.pdf, asfamcfileformat.pdf (not opened).
- uv_map.png and the Maya PNG textures (binary).
- Native C++ viewer bodies (names only), Mesh.cs, Skeleton.cs, Animation, texture code.
- Shadowbane.Web pages and tests.
- Cache object text views beyond the first line of one file.
