# hdneo-mxo-hd (Hardline Dreams, MxO server emulator): asset audit (AU024)

Donor path (VPS, read-only): /mnt/frankendom-donors/hdneo-mxo-hd/

**Half read:** server (hds/, C#) and the data pack (data/, hds/bin/Debug/netcoreapp3.1/data/). **Client half:** not read. The README says a working client came from a community member in 2014; I did not find a client in my listing of the top-level folders and did not search further.

## Licences (what the files say)
- LICENSE line 1: "The MIT License". Line 3: "Copyright (c) 2010-2017 Google, Inc. http://angularjs.org". **Conflict:** the MIT text names AngularJS as copyright holder, not this project. README has no licence section. Treat the code licence as ambiguous (class C for anything where it matters).
- No licence terms for any data file. README "Other Files" (line 92): the mission XML files come from MxOSource and "several data files which are contributed by the community and mxoemu.info (Rajkosto)". No terms given.
- README line 97 says "In the docs folder is a data.zip". The docs/ folder contains only SETUP.MD. A data.zip (37,219,664 bytes) is under hds/bin/Debug/netcoreapp3.1/data/ instead. Not opened.

## Rights-holder status
README calls this an emulator for "the good old MxO Game" and says the data was parsed from logs (line 40: "parsed all possible vendors from logs") and from game files (static objects "parsed using a tool"). The README names contributors but no rights holder. Treat the game-derived data as proprietary-derived. Not a clean-room claim.

## Asset inventory (counts from wc -l or find; no images, audio or models in the box)
- data/staticObjects_{dt_1,dt_2,it,slums_1,slums_2}.csv: five world-object tables, about 2.86 million lines in total. Header (staticObjects_it.csv line 1): metr_id, sector_id, mxoId, staticId, type, exterior, position, rotation, quaternion.
- data/mob_parsed_cleaned.csv (13145 lines), mob_parsed.csv (13141), mob_parsed_untouched.csv (14481), mob.csv (3), mob_just_some_and_winter.csv (101). Semicolon-separated mob and NPC lists.
- data/mxoClothing.csv (38040 lines) and mxoClothing_previos_version.csv (37283). Header (line 1): GoidDecimal, ClothesType, ShortName, ItemName, ModelId, ColorId.
- data/abilityIDs.csv (9973 lines). Header (line 1): AbilityID, GOID, AbilityName, isCastAble, CastTime, CastAnimStart, CastAnimMid, CastAnimEnd, ActivationFX, ValueFrom, ValueTo, isBuff, BuffTime, executionFX.
- data/gameobjects.csv (44406 lines; first line is a data row, no header).
- data/newrsiIDs.csv (83 lines), data/vendor_items.csv (44 lines), vendor_items_old.csv (2 lines).
- data/animations.txt (12854 lines; header line "Num anim entries: 5442"), data/fxlisthex.txt (2357), data/fxlistreal.txt (3585). Symbolic names of animations and effects.
- data/missions/*.xml: mission_zion_1.xml, mission_machinist_1.xml, mission_merovingian_1.xml. Plus data/NPC_COLLECTION.xml (182 lines). Same files also under hds/bin/Debug/netcoreapp3.1/data/ with mission_smith.xml and mission_hds_test.xml, and old/*.bck backups.
- hds/bin/Debug/netcoreapp3.1/data/data.zip (37 MB): not opened.
- hds/lua/lua51.dll and LuaInterface.dll: binaries, not opened.
- SQL/reality_hd.sql: schema, not read.
- Loaders and types: hds/resources/Data/*.cs (18 files). Data-first: the CSVs and XML above are the tables; the C# loaders are not cited.

## Classes per group
- All data CSV/XML tables: C (game-derived or community-contributed, no licence terms).
- Mission XML: C (MxOSource contribution, no terms).
- Code (LICENSE conflict): C.
- Overall best_class: C. No group is A or B. There is no usable art or audio.

## Inspiration (own words, category-level only, because the donor is C)
- Four-phase ability timing: each ability row pairs a cast time with three animation hooks (start, middle, end) and separate activation and execution effect IDs (data/abilityIDs.csv header). Use the phase structure, not the names or numbers.
- Clothing as colourways: each clothing row links an item to a model ID and a colour ID, so one model yields many looks (data/mxoClothing.csv header). Use the same pattern for armour recolours.
- Large emote library with a prefixed naming scheme (data/animations.txt, 5442 entries). Use a smaller, own gesture set with consistent prefixes.
- Standing per faction: README "Chat commands" section describes a numeric alignment and a per-organisation reputation score. Use the mechanic with our own factions and scale.
- Mission template with reward and objective fields on one node (data/missions/mission_zion_1.xml, the data element's title, exp, info and objective attributes). Use the template shape only.
- Fast travel as sparse nodes: README lists signposts, hyperjump and hardline teleports as features. Use sparse travel nodes with our own names.

## Briefs (recreate as clearly distinct originals, never a copy; category-level only)
See the briefs array in the JSON. Five briefs: colourway armour family, four-phase telegraphed ability, faction standing, mission reward template, emote set.

## Cross-link to our cell topics
- zones and spawns: data/staticObjects_*.csv and mob_*.csv (structure only; do not copy positions).
- loot: data/vendor_items.csv (vendor stock rows).
- vfx: data/fxlisthex.txt and fxlistreal.txt (symbolic effect names).
- animation: data/animations.txt.
- hud-ui, camera, sound: no assets in this donor.
