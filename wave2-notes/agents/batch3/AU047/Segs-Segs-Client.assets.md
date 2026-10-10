# Segs-Segs-Client (asset audit, cell AU047)

Donor: /mnt/frankendom-donors/Segs-Segs-Client (read on VPS, read-only)
Which half: client side, but only the launcher and HUD art exist. README.md line 5: "Currently, this is just the Launcher. The client development will begin soon after a stable working engine is available." There is no game client in the box. I read the licence, README, the launcher CMake and QML file list, the HUD asset folders, and PNG and SVG header sizes. The paired server half in this batch is Segs-Segs (server, zone and encounter Lua).

## Licences (as the files say)
- LICENSE line 1 "BSD 3-Clause License", line 3 "Copyright (c) 2019, SEGS". Repo-wide. The text speaks of "source and binary forms" and does not name images, audio or fonts separately.
- No licence file for the HUD art, launcher images, icons or sounds. No CREDITS file.
- Fonts in SEGSLauncher/Resources/Fonts: Cantarell (3 files), dejavusans.ttf, cuppajoe.ttf. The same family names appear in the server donor's Utilities folder, where the Cantarell file says SIL OFL 1.1 and the CuppaJoe file says the licence is assumed (see Segs-Segs.assets.md). Name match only; the client folder itself states nothing.
- app-icon.svg carries Inkscape 0.92.3 metadata (line 16). That is the only creator-tool note.

## Rights-holder status (repo files only)
SEGS project (BSD copyright line, 2019). Origin of the HUD and launcher art is not stated in the box: unknown.

## Asset inventory (sizes from ls and PNG header; pixel size from PNG header bytes and SVG width and height)
- AssetSource/Ingame/UI/HUD: 6 SVG source files, the HUD power tray set: Tray_Background.svg (35.9 KB, 1218x620), Tray_Buttons.svg (8.6 KB, 400x400), Tray_Empty.svg (2.2 KB, 1200x180), Tray_Inspirations_Empty.svg (1.8 KB, 600x300), Tray_Inspirations_Icon_Empty.svg (173 KB, 200x200), Tray_Power_Icon_Empty.svg (7.5 KB, 100x100).
- ProcessedAssets/Ingame/UI/HUD: 6 PNG renders of the same 6 names, same pixel sizes as the SVG width and height attributes (1:1 rasterisation). Pipeline: SVG source to PNG output.
- SEGSLauncher/Resources/Images: background_rectangle.png 907x453 (266 KB), bluestreak.png 2178x3366 (1.4 MB), button_play.png 162x41, button_settings.png 149x30, ms_metal.png 1518x2150 (544 KB; name suggests a metal texture, not viewed), segs-logo.png 655x639 (375 KB).
- SEGSLauncher/Resources/Icons: 7 SVG (app-icon, globe_red, globe_green, server_red, server_green, monitor, refresh-cw) and loader.gif.
- SEGSLauncher/Resources/Audio: launch.wav (1.27 MB), startup.wav (0.69 MB). Not played.
- SEGSLauncher/Resources/Fonts: 5 TTF (Cantarell Regular, Oblique, Bold; dejavusans; cuppajoe).
- Code: 23 h, 20 cpp, 5 qml; launcher only (Launcher.cpp, Worker.cpp, LauncherSetup.cpp, main.qml, MainWindow.qml, ServerDialog.qml, Setup.qml, MediaManager.qml). No game logic.

## Class per group
- HUD power tray set (AssetSource and ProcessedAssets): C (origin not stated; repo BSD names source and binary forms only; ambiguous, so C).
- Launcher images (background, bluestreak, ms_metal, segs-logo, buttons): C (origin not stated).
- Launcher icons (SVG): C.
- Launcher audio (wav): C (origin not stated; not played).
- Fonts: per the server donor's family files; Cantarell B (OFL 1.1), DejaVu B or A (Bitstream Vera, public domain changes), CuppaJoe C (licence assumed by the repo).
- Code (launcher): A (BSD 3-Clause; keep the notice).
- Overall best_class: C. Cantarell would be B, but only by name match to the server donor's file; the HUD and launcher art are C.

## Data first (names and looks)
- The HUD names are the tray parts (background, buttons, empty tray, a slot plate, a slot icon overlay, a power icon). Their layout is not in the box: the tray arrangement lives in the client, which is absent.
- Server list status uses two glyph names per state (server_green, server_red) and a globe pair (globe_green, globe_red), in Icons/.

## Inspiration (category-level for C donors)
- A power tray built from a plate, a row of empty-state slot plates, and an icon overlay for each filled slot (names and sizes above). Reads at a glance and fits a 375-wide bottom bar.
- Status glyphs in pairs (green and red, one per state) for server or lobby lists: a readable online or offline cue without text.
- A launcher backdrop built from a large metal texture and a logo plate (file names only; not viewed). Mood: a worn metal front door before the game.
- Icons drawn as SVG source with a PNG render step in a separate folder: an asset pipeline to copy (source in AssetSource, renders in ProcessedAssets).
- The launcher stores settings in a platform config file (README lines describing SEGSLauncher.conf): a plain pattern for per-player client options, not an asset.

## Inspiration briefs
1. Power tray (HUD). Why it works: a bottom bar with plate, empty slots, and filled icon overlays reads at a glance during a fight. Keep: plate plus empty-slot row plus icon overlay per slot. Change: our slot count and proportions for 375 wide, our palette, a bigger touch target, a cooldown ring instead of an empty plate. Ref: AssetSource/Ingame/UI/HUD/Tray_Empty.svg; Tray_Power_Icon_Empty.svg; Tray_Inspirations_Empty.svg (not opened as images).
2. Status glyph pair (HUD or lobby). Why it works: green and red dots with a globe read as online or offline with no text. Keep: a pair of glyphs per state, one colour each. Change: our colours (colour-blind safe shapes too), a different glyph, a pulse for "connecting". Ref: SEGSLauncher/Resources/Icons/server_green.svg and server_red.svg (not opened).
3. Metal plate backdrop (menu material). Why it works: a dark metal plate behind a logo gives the menu a worn, heavy mood. Keep: one large plate texture with a logo plate on top. Change: our own texture and palette, a material that matches our armour look, a different edge treatment. Ref: SEGSLauncher/Resources/Images/ms_metal.png (not viewed).

Rule (Dom): recreate each as a clearly distinct original, never a copy; traits kept and changed are listed above.

## Cross-link to our topics
- hud-ui (row 14): the tray set and status glyphs. Sound: two launcher WAV files, not played. Camera, zones, spawns, loot, animation: none in this donor. Creatures and items: none.

## Not read
- Images, icons, audio and fonts as pixels or sound (binary; sizes and names only). The SVG bodies were read only for the width and height attributes and the Inkscape line.
- The launcher C++ and QML bodies beyond the file list. CMakeLists.txt beyond the asset grep (no asset references found).
- 3rd_party/jcon-cpp (listing only).
