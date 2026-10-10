# Gethe-wow-ui-source (catalogue, DC027)

RESTRICTED. Blizzard proprietary WoW UI code, no licence (Gethe-wow-ui-source/_RESTRICTED-NOTE.txt, line 1: study shape and idea only). Everything below is category-level. No code, constants, text or colour values are copied. Because the restricted rule bars copied quotes, this donor has no receipts.tsv. Line numbers point at the donor files I read, so a human can look.

Donor root: /mnt/frankendom-donors/Gethe-wow-ui-source/ (VPS, read-only).
Half read: the CLIENT UI half only (Interface/AddOns Lua, XML and TOC; UI.xsd; the four talent-node PNG masks, read by file name and header). The matching game data pack and game server are not in this box (per AU023). I did not read a data pack, because none is present.
Licence (from files): Blizzard UI code, none (restricted note). The one licensed file is a third-party library (middleclass, permission-notice wording), which is outside the Blizzard restriction. No LICENSE file in the tree.
Audit used: AU023 (read first). Its counts are not re-counted here, except the addon folder count (348, which I counted).

## Counts
| Group | Count | Note |
|---|---|---|
| Creatures | null | no creature data in this box |
| Classes | null | no class data; UI folders named only |
| Weapons | null | no item data in this box |
| Gear sets | null | no item data in this box |
| Zones | null | no zone data; map overlay code named only |
| UI addon folders | 348 | counted |
| Talent-node masks (PNG) | 4 | diamond, hexagon, octagon, half-octagon (file names read) |

## 1. Creatures and beasts
None in this box. The client UI has boss-warning and encounter-timeline code that is about creatures, not the creatures themselves. Top 8: not applicable. The closest UI items are listed under section 7 (originals).

## 2. Classes, races, factions
- UI folders named only: Blizzard_ClassMenu, Blizzard_ClassTrial, Blizzard_ClassTrialSecure, Blizzard_AlliedRacesUI.
- Class colour is used on target names in boss warnings (Blizzard_EncounterWarnings/EncounterWarnings.lua around line 56), a shape to reuse.
- Progression UI: Blizzard_TalentUI and Blizzard_SharedTalentUI (node masks). Tree data not read.

## 3. Weapons
None in this box. No weapon data. Top 5: not applicable.

## 4. Armour and gear
None in this box. Azerite and artifact UI folders named only (Blizzard_AzeriteUI, Blizzard_ArtifactUI, Blizzard_AzeriteEssenceUI, Blizzard_AzeriteRespecUI). Not read. Top 5: not applicable.
The talent-node masks are the only gear-like shape language in the box: four faceted node shapes (diamond, hexagon, octagon, half-octagon) at two sizes (file names read; PNG dimensions from AU023 header read).

## 5. Zones and dungeons
None in this box as data. UI-level only:
- World map event overlay: a separate data provider on the base map (Blizzard_WorldMap/WM_EventOverlayDataProvider.lua; file named, read by AU023, not re-read here). Layered overlays are a model for zone heat or event tint.
- Tutorial callouts use a few distance bands defined in one data table (Blizzard_BoostTutorial, data file named in AU023; not re-read here).
- Flight map and adventure map folders named only (Blizzard_FlightMap, Blizzard_AdventureMap).
Top 5: not applicable.

## 6. Item and effect looks worth recreating (UI-level)
- Talent-node masks: faceted shapes that carry the tier by silhouette (Blizzard_SharedTalentUI/talents-*-mask.png).
- Encounter timeline: a track view with short, medium and long tracks, a highlight time, queued-track dividers and intro and outro animation times (Blizzard_EncounterTimeline/EncounterTimelineTrackView.lua; durations live in EncounterTimelineConstants.lua, values not copied).
- Death recap entries carry three flags, caused-death, avoidable and deadly, each with its own icon (Blizzard_DeathRecap/Blizzard_DeathRecap.lua, lines 11-19 and 220-222). Icons by flag, not text alone.
- Combat text (floating numbers) in Blizzard_CombatText, Shared and Mainline folders (named; not read in detail).

## 7. Inspiration for Frankendom (categories only, never copied)
Each item says what to keep and what to change. Recreate as a clearly distinct original, never a copy.

1. Faceted ability-tier nodes. Ref: Blizzard_SharedTalentUI masks (four shapes, two sizes). Why: the silhouette carries the tier, readable at 375 px. Keep: faceted shapes that encode tier, two size steps. Change: our own shapes and palette. Frankendom: HUD and ability tiers (row 14).
2. Boss warning card gated by combat and cleared by a boss-emote-cleared event. Ref: Blizzard_EncounterWarnings/EncounterWarnings.lua lines 10-11 (events), 27-37 (event dispatch), 38-66 (filters: severity, user setting, edit-mode guard), 68-70 (clear). Why: a warning shows only when it applies and disappears when the boss stops. Keep: severity match, user off-switch, combat-gated visibility, clear on the boss event. Change: our card look and wording. Frankendom: boss telegraph (row 13 specials, row 14 HUD).
3. Death recap with avoidable and deadly labels. Ref: Blizzard_DeathRecap/Blizzard_DeathRecap.lua lines 11-19 (icon getters), 220-222 (flags to icons). Why: a loss is made bearable when the player sees which hits were avoidable. Keep: per-hit flags, icon per flag. Change: our recap format and icons. Frankendom: death and respawn presentation (row 17).
4. Encounter timeline with three time bands and a now-line. Ref: Blizzard_EncounterTimeline/EncounterTimelineTrackView.lua line 63 (highlight time), line 80 (orientation), and EncounterTimelineConstants.lua (track enums). Why: upcoming boss events read in bands. Keep: short, medium and long bands and a highlight line. Change: our bands and tracks. Frankendom: boss intro and finisher staging (rows 9 and 13).
5. Throttled combat audio alerts, per category. Ref: Blizzard_CombatAudioAlerts/Blizzard_CombatAudioAlertManager.lua lines 130-168 (throttle set-up and refresh), 169-210 (events registered only when the category is on), 272 (voice per category). Why: an alert cannot spam; each category has its own throttle. Keep: per-category throttle, event registration only when needed, cancel timers on refresh. Change: our voices and cues. Frankendom: sound layering and stingers (sound-music fold-in).
6. Text-size manager with a minimum floor. Ref: Blizzard_AccessibilityTemplates/TextSizeManager.lua lines 52-80 (set scale, rebuild fonts, minimum scale). Why: accessibility is a floor, never a zero. Keep: a minimum scale and font rebuild on change. Change: our UI sizes. Frankendom: accessibility (hud-ui fold-in).
7. Layered map overlays as a separate data provider. Ref: Blizzard_WorldMap/WM_EventOverlayDataProvider.lua (named; AU023). Why: an event layer sits on the base map without rebuilding it. Keep: overlay as its own provider. Change: our zone heat or tint. Frankendom: zone map UI (no parity row; for Lead to place).

## 8. Death and respawn, idle and ambient, readability (what I saw)
- Death: the recap (above) is the presentation of a loss.
- Idle and ambient animation vocabulary: not read (no creature assets).
- Readability at 375 px: the talent masks are shape-coded by file name (silhouette-led; colour use not checked). Text-size floor (item 6).
- Max enemies per frame: not in UI code; not read.

## Not read
- Localization.lua files (names only).
- Most of the 348 AddOns folders (listed only).
- Blizzard_APIDocumentationGenerated (names only).
- Pixel content of the four PNG masks (header only, via AU023).
- Game client data pack and game server: not in this box.
- Combat text, damage meter, nameplates and chat bubble internals (named only).
