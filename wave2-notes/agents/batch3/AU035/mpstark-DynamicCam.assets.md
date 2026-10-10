# mpstark-DynamicCam (asset audit, AU035)

Donor tree: /mnt/frankendom-donors/mpstark-DynamicCam/ (VPS, read-only)
Which half I read: the CLIENT addon half only (Lua and XML in the top-level folder, Libs, Locales, Ui, Options). It is a World of Warcraft UI addon. There is no server half in this box. The game client (Blizzard's WoW data, icons, UI frames) is not in the box and is not a donor half. I read the situation engine (SituationManager.lua 1040-1126, 509-530, 613-630), the default data table (DefaultSettings.lua 7-30, 160-195) and the preset table head (Presets.lua 10-22). I grepped Core.lua, Options.lua and Locales only.

## Licence (what the files say)
- Code and repo: MIT License (LICENSE line 1, permission text line 5; copyright line 3: "Copyright (c) 2016-2020 Michael P. Starkweather (mpstark), 2020-2026 LudiusMaximus"). DynamicCam.toc line 40: "## X-License: The MIT License (MIT)".
- Libs/: only Libs/LICENSE.md is in the box (line 1: "All library code contained in this directory ("Libs") is owned and licensed by their respective owners."). The libraries (LibStub, Ace3 family, LibCompress, LibCamera, LibEasing, LibMountInfo, LibHideUI) are external git or svn externals listed in .pkgmeta (line 35: LibCamera from github). They are NOT in the box; I did not read their licences beyond the pointer file.
- Asset licence: no separate asset licence in the repo. The art files (Ui/Textures) have no per-file licence line. Per the rule, unclear = class C.

## Rights-holder status (repo files only)
- Fan addon for World of Warcraft. The toc sets Interface versions and an IconTexture path into the game client (interface/icons/..., not in the box). The repo says nothing about official affiliation. Comments refer to "Blizzard" (Core.lua, Options/CvarMonitor.lua), but no statement of ownership is in the files. Status for the game-client assets it refers to: unknown (not in the box).
- Addon code and text: MIT, copyright mpstark and LudiusMaximus.

## Asset inventory
- Lua code: about 25,900 lines in the top-level and subfolder .lua files (Core, SituationManager, DefaultSettings, Presets, ZoomBasedEditor, ZoomBasedSettings, MouseZoom, UiHideModule, Sharing, Options.lua 152 KB, Options/ and Ui/ folders). MIT.
- Ui/Textures (3 files): export-button.png (65 KB), import-button.png (71 KB), commondropdownsettings2x.blp (132 KB, a Blizzard texture format). No licence line per file, origin not stated. Class C. I did not open the binaries (the BLP name says game-format texture; `file` is not on this VPS, so no header read).
- Locales/ (12 Lua files plus Locales.xml): enUS.lua is 679 lines. Languages: de, es (ES and MX), fr, it, ko, pt-BR, ru, zh (CN and TW), plus en. Text strings. Covered by the repo MIT as software text; class A with MIT notice. I quoted no string values.
- Presets.lua: a table of named presets (keys such as "Immersive" and "Shushudaa's preset") with author fields and encoded import strings. Author names are "LudiusMaximus" (line 13) and "Shushudaa" (line 19). No licence line for the preset strings beyond the repo MIT. Class C (named third-party author, no own licence).
- Ui/ and Options/ Lua: layout and widgets (tree scroll box, detach frame, controls). Code only.
- Data tables that matter: DefaultSettings.lua defines the situation records (name, events, priority, condition string, enter/exit transition times, rotation and zoom fields) starting at line 7 (situationDefaults) and line 106 (defaults). The shipped situation list starts at line 166 (situations = {) with IDs such as "001" (City), "002" (City Indoors), "004" (World), "005" (World Indoors), "006" (World Combat, priority 50).
- Shareable presets and situation data are the data half. Lua tables, no binary data.

## Mechanism read (client)
- Situation picker: EvaluateSituations (SituationManager.lua 1040-1126) walks every enabled situation, runs its condition string, keeps the one with the highest priority among the true ones (line 1070 uses strict ">", so the first one seen wins a tie; line 1049 iterates with pairs, whose order Lua does not define). It sends DC_SITUATION_ACTIVE and DC_SITUATION_INACTIVE messages on each false-to-true or true-to-false flip (lines 1062-1079).
- Hold-off: leaving the current situation waits for the current situation's delay (lines 1088-1107). A delay timer is armed with delayTime = now + delay (line 1100) and the evaluation re-runs after the delay.
- Defect (read in full at lines 1111-1125): delayTime is cleared only in the branch where a new top situation is found (line 1119). In the branch where no situation is active (lines 1120-1124), delayTime is not cleared. A stale past value then makes the next hold-off test (line 1104) pass at once, so one later hold-off is skipped. Fix: clear delayTime whenever a swap happens, both branches. I did not run this; it is a read of the code.
- Defect: ties in priority depend on pairs() order. Fix: iterate a fixed sorted list of IDs, or give each situation a unique order key.
- Rotation on entry (StartRotation, lines 509-528): continuous yaw takes a speed and a transition time (line 515); degree rotation takes yaw and pitch with the profile's easing name looked up in LibEasing (line 520). Rotation stops on leaving (StopRotation, defined at line 532, not read in full).
- Zoom restore (ShouldRestoreZoom, lines 613-630): setting "never" short-circuits (line 617); otherwise the saved zoom from before a situation is restored on exit (always or adaptive).
- Events per situation: RegisterSituationEvents (line 76) subscribes only to the events a situation lists (DefaultSettings.lua 170, 176, 182, 188, 194), so the checks run only when relevant events fire.
- Transition times: each situation has timeToEnter and timeToExit (DefaultSettings.lua 27-30; default 1 second).

## Inspiration notes (category level, my own words)
- A camera picker that is data: each camera situation is a record with a priority, the events that can flip it, a condition string, enter and exit times, and optional rotation. The top true record wins; flips send messages. For the fight camera (row 11), the situations map to fight phases: idle, engage, parry, finisher. Files: SituationManager.lua 1040-1126; DefaultSettings.lua 166-195.
- Fight-over-everything priority: the combat situation sits at priority 50 while the non-combat ones sit at 0 to 11. A single clear override above all others. File: DefaultSettings.lua 193-195.
- Hold-off before leaving a framing so the camera does not flicker in and out of combat. The delay is a per-situation number. File: SituationManager.lua 1088-1107.
- Rotation during a transition: an engage swing done as a timed yaw with a named easing curve, or as a continuous yaw whose speed is a field. File: SituationManager.lua 509-528.
- Zoom remembered and restored on exit, with three settings (never, always, adaptive). File: SituationManager.lua 613-630.
- Shareable presets with an author credit and an encoded string. Idea for sharing camera feel between players, with credit to the author. File: Presets.lua 10-22 (strings not copied).

## Inspiration briefs
- See the .assets.json "briefs" key. Rule for every brief: recreate as a clearly distinct original, never a copy; name the trait kept and the trait changed.

## Cross-link to our cell topics
- camera: primary. The situation picker, transition easing, rotation and zoom restore are all camera topics for row 11. Client-only, which matches the Frankendom ruling that the camera is client-only.
- hud-ui: Ui/ and Options/ hold a tree scroll box and a detach frame. Options UI, not in-game HUD. Read by name only.
- sound-music: none in the box.
- spawns, loot, zones, vfx, animation, progression: none in the box (camera-only addon).
- Accessibility: the zoom and rotation options are a setting surface (Options.lua, not read beyond a grep).

## Not read
- Core.lua body (grep only), Options.lua (152 KB; grep only for the Blizzard note), ZoomBasedEditor.lua, ZoomBasedSettings.lua, MouseZoom.lua, UiHideModule.lua, Sharing.lua, Ui/*.lua, Options/*.lua (names only).
- Locales beyond the line counts and the one history paragraph (not quoted).
- The three texture binaries (sizes and names only; no image opened).
- The external libraries (not in the box).
- SituationManager.lua ChangeSituation body (lines 774-1039) and the rest of the file (not read).
