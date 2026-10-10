# Gethe-wow-ui-source - asset audit (AU023)

Source tree (VPS, read only): /mnt/frankendom-donors/Gethe-wow-ui-source/
Half read: the client UI half (Interface/AddOns Lua, XML, TOC files, plus the four PNG masks, the UI.xsd schema and the file lists). The game client and server are not in the box. The README (line 3) describes the repo as UI source only.

## Licence (what the files say)
- Blizzard UI code (about 4,050 files in the donor, nearly all under Interface/): no licence. _RESTRICTED-NOTE.txt line 1 says "RESTRICTED: Blizzard proprietary WoW UI code (shipped to players), no licence." Line 1 also says "Study shape/idea only; never copy code, constants or text."
- Third-party library Interface/AddOns/middleclass/middleclass.lua: header carries the standard permission-notice wording (line 3 "Permission is hereby granted, free of charge") and copyright line 2 "Copyright (c) 2011 Enrique García Cota". This library is code and is outside the Blizzard restriction.
- No LICENSE or COPYING file in the tree.

## Rights-holder status (from repo files only)
proprietary, Blizzard Entertainment. Basis: AddOnList TOC line 2 "## Author: Blizzard Entertainment" and _RESTRICTED-NOTE.txt "Blizzard proprietary".

## Asset inventory
Counts from find and ls (no audio, no 3D models, no maps, no fonts in the box).

| group | path | count | licence | class | note |
|---|---|---|---|---|---|
| talent node masks (PNG) | Interface/AddOns/Blizzard_SharedTalentUI/talents-diamond-mask.png (128x128), talents-hexagon-mask.png (64x64), talents-octagon-mask.png (128x128), talents-octagon-mask-half.png (128x128) | 4 | none; restricted note | C | Dimensions read from PNG header bytes. Referencing code was not found by a grep of the four file names inside AddOns (lua and xml only). |
| UI XML layout schema | Interface/AddOns/Blizzard_SharedXML/UI.xsd | 1 | none; restricted note | C | Schema for XML frames. Declares enumerations such as frame points. |
| Lua and XML UI code | Interface/AddOns/Blizzard_*/ | about 2,551 .lua, 1,091 .xml, 394 .toc | none; restricted note | C | Code, not art. Named here because the data tables live in it. |
| data tables (Lua) | Interface/AddOns/Blizzard_CooldownViewer/CooldownViewerSoundAlertData.lua; Blizzard_BoostTutorial/Blizzard_TutorialRacialData.lua; Blizzard_HousingTutorials/Blizzard_HousingTutorialsData.lua | 3 | none; restricted note | C | Sound-cue categories with text labels; range tiers for tutorial callouts; housing tutorial data. |
| API documentation | Interface/AddOns/Blizzard_APIDocumentationGenerated/ | many | none; restricted note | C | Generated documentation tables (e.g. PlayerDataConstantsDocumentation.lua). |
| localisation files | Localization.lua in Blizzard_AddOnList, Blizzard_EncounterJournal, Blizzard_BlackMarketUI and others | several | none; restricted note | C | Text strings. Not opened. |
| third-party Lua library | Interface/AddOns/middleclass/middleclass.lua (+ .toc) | 1 library | permission-notice wording in header (MIT-style) | A (as stated by file) | Code library. Included only for licence clarity. |
| file lists | Interface/ui-code-list.txt (4,043 lines), Interface/ui-gen-addon-list.txt, Interface/ui-toc-list.txt (394 lines) | 3 | none | n/a | Lists of addon files, used for the build. |
| export workflow | .github/workflows/export.yml | 1 | none | n/a | Named "Extract interface files from CDN" (line 1). The workflow name says the files come from a CDN extraction. |
| fonts, audio, models, maps | none in tree | 0 | n/a | D | Not present in this box. |

## Data first
- Names and labels: Blizzard_CooldownViewer/CooldownViewerSoundAlertData.lua (sound categories and text keys), Blizzard_BoostTutorial/Blizzard_TutorialRacialData.lua (callout range tiers), Blizzard_HousingTutorials/Blizzard_HousingTutorialsData.lua.
- Layout schema: Blizzard_SharedXML/UI.xsd.
- Not a name table: the restricted note asks us not to copy constants or text, so no values are quoted here.

## Inspiration (category level only; class C donor)
- Talent nodes come in a small family of faceted shapes (diamond, hexagon, octagon, half-octagon) at two sizes. The shape itself carries the tier. An artist could make a family of distinct faceted node shapes for ability tiers.
- Sound alerts are grouped by category, and each category holds short named cues with text labels. A grouped cue picker is a clean UI pattern for alerts.
- Tutorial callouts use a few distance bands (short, medium, long) defined in one data table. Callouts keyed to distance tiers help new players read range.
- The housing and edit-mode data providers show sample icons while the player places HUD parts. A preview-in-placement-mode idea for our hud-ui.
- The map event overlay is a separate data provider on top of the base map (Blizzard_WorldMap/WM_EventOverlayDataProvider.lua). Layered map overlays are a good model for zone heat or event tint.
- The XML schema enumerates frame anchor points. A declarative layout schema could keep our HUD positions data-driven.

## Briefs (class C: category level only)
See Gethe-wow-ui-source.assets.json key "briefs". Rule for all briefs: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed.

## Cross-link to our cell topics
- hud-ui: talent node masks (Blizzard_SharedTalentUI), edit-mode sample icons (Blizzard_FrameXMLUtil/EditModeAuraDataProvider.lua), layout schema (Blizzard_SharedXML/UI.xsd).
- vfx and sound: sound alert categories (Blizzard_CooldownViewer/CooldownViewerSoundAlertData.lua).
- camera and zones: distance-band callouts (Blizzard_BoostTutorial/Blizzard_TutorialRacialData.lua), map overlay layers (Blizzard_WorldMap/WM_EventOverlayDataProvider.lua).
- spawns, loot, animation: no content in this box.

## Not read
- Localization.lua files (names only, not opened).
- Most of the 348 AddOns folders (listed only).
- The API documentation files (names only).
- Pixel content of the four PNG masks (header bytes only).
- Game client and server halves: not in the box.
