# xyeppp-RoR-Interface (asset audit, cell AU059)

Donor: /mnt/frankendom-donors/xyeppp-RoR-Interface/ (VPS only, read-only; 11206 files)
Half read: the client UI half (interface/default, interface/interfacecore, interface/internal). The server half is not in the box as far as the top-level tree shows; not read.
Data first: the data tables are the CSV catalogues in interface/interfacecore/tome/ (194 CSV in total, bestiary/species.csv is the clearest) and the zone and quest XML in NO_DEHASH/xml. Window layout is in each module's .mod and XML. Handlers are in Lua.

## 1. Licence

- Code: none stated. There is no LICENSE file in the box. README.md line 2: "This repository contains the latest Return of Reckoning user interface source code." No licence line.
- Assets: none stated. No licence or credits file covers the textures, fonts, XML, Lua, CSV or lore text.
- Credits windows exist in-game (interfacecore/source/creditswindow.lua and .xml), but I did not read their text in full.

## 2. Asset inventory (paths and counts)

| Group | Path | Count |
|---|---|---|
| Textures (DDS) | interface/default/*/textures/, interface/ | 9895 DDS, plus 24 in NO_DEHASH/dds/ (9919 total) |
| UI markup and scripts | interface/default/*/ (XML, Lua, .mod) | 468 XML and 369 Lua across interface/; 111 .mod |
| CSV catalogues and lore | interface/interfacecore/tome/ | 193 CSV; 15 subfolders (achievements, bestiary, cards, gamefaq, gamemanual, historyandlore, liveevent, loadingscreens, noteworthypersons, oldworldarmory, sigils, tactics, titles, videoplayer, warjournal) |
| Bestiary images | interface/interfacecore/tome/bestiary/images/ | 182 files |
| Fonts | interface/interfacecore/fonts/ (14), interface/internal/fonts/ (1) | 15 TTF |
| TGA and PNG | interface/default/ | 122 TGA, 2 PNG |
| Hash-named export folder | NO_DEHASH/ (xml 6, dds 24, txt 2) | 32 files |

## 3. Rights-holder status

Publisher-authored UI, per the module headers: ea_mainmenuwindow.mod line 5 gives the author as "EAMythic". The box does not say how the NO_DEHASH files were obtained. The folder name and hash-style file names suggest archive exports, but nothing in the files says that, so provenance is unknown.

## 4. Classes per group

- Textures, markup, CSV, lore, bestiary images, fonts, TGA, PNG: C (no licence; publisher-owned by the module headers; fonts unknown).
- NO_DEHASH export: C (provenance not stated).
- Server half: not in box.
- Overall best class: C. Inspiration stays category level. No constants, no creature or zone names, no coordinates, no lore text.

## 5. Inspiration (category level, own words)

- Death and respawn card. On death the window offers respawn locations and an auto-respawn timer, and a killer line updates while it is open (ea_deathwindow/source/deathwindow.lua lines 83 and 122). Fit for death and respawn presentation (row 17): a loss that stays readable.
- Hit flash with an enable gate. The screen flash is driven by hit-point changes and can be switched off (screenflashwindow.lua lines 80 and 102). Fit for combat feedback (row 10) and an accessibility toggle (hud-ui).
- Choose-one loot window. Hovering an item row shows its item tooltip (chooseonelootwindow.lua line 60; the pick action was not read). Fit for the loot drop ceremony (row 18): inspect before choosing.
- Bestiary as catalogue data. Each creature row has an ID, subtype, image, armour class and up to ten type/id pairs (bestiary/species.csv line 1, header only). Fit for catalogue fields (row 21).
- Window-per-system layout. Each window is its own module with Lua and XML; an action-bar cluster manager and a layout editor let the player move bars (ea_actionbars, easystem_layouteditor). Fit for hud-ui on a phone screen.
- Map windows as separate modules: overhead map, world map, zone control (ea_overheadmapwindow, ea_worldmapwindow, ea_zonecontrolwindow). Fit for the minimap topic.
- Small readouts: a cast-timer window, a mouse-over target window, an objective tracker (ea_casttimerwindow, ea_mouseovertargetwindow, ea_objectivetrackers). Fit for threat and target readability (row 14).

## 5b. Inspiration briefs

Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed. Full entries are in xyeppp-RoR-Interface.assets.json under "briefs".

1. Respawn-choice death card. Keep: respawn options on death, an auto-respawn timer, a live killer line. Change: three abstract choices with no place names, and a timer ring. Ref: ea_deathwindow/source/deathwindow.lua line 83.
2. Hit flash with an off switch. Keep: a flash driven by hit-point changes and an enable gate. Change: a rim vignette in a threat colour, not a full-screen tint. Ref: screenflashwindow.lua lines 80 and 102.
3. Choose-one loot row. Keep: hover or tap to inspect, then take one. Change: three cards in a row at 375 wide with a rarity bar and a lid-lift ceremony. Ref: chooseonelootwindow.lua line 60.
4. Bestiary silhouette card. Keep: a creature as a data row, and a card built from the row. Change: three traits, a silhouette tile and a threat rating in place of numeric fields. Ref: bestiary/species.csv line 1 (header only).

Top-striking criteria applied: silhouette at 375 wide (the card and the row), one signature behaviour (the respawn choice, the take-one pick), one signature sound (none read; the pick sound is not in the box). Resemblance target 20-30 percent.

## 6. Cross-link to our topics

- camera: none read.
- zones: zone and public-quest XML in NO_DEHASH/xml (field layout only; values not reproduced).
- spawns: none read.
- loot: choose-one window (above); ea_pqlootwindow exists (not read).
- hud-ui: windows listed in section 5 (minimap, map, layout editor, target, cast, flash toggle).
- vfx: screen flash (lua, not the textures).
- animation: none read.
- sound: none in the box.

## Not read

- All DDS, TGA, TTF and PNG files: names and counts only.
- Most Lua and XML: only the death, screen-flash and loot handlers were read, by exact function line.
- tome lore, manual, card and armoury CSV bodies: headers only. Protected text, not reproduced.
- NO_DEHASH: one XML file read for layout; five other XML and the two TXT files not read.
- ror_mapextension.csv and credits CSVs: listed only.
- Server half: not in box.
