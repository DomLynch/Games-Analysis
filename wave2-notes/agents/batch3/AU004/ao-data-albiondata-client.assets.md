# ao-data-albiondata-client: asset audit (AU004)

Source: /mnt/frankendom-donors/ao-data-albiondata-client (read-only, VPS).

## Licences (as the files say)
- Code: MIT License, Copyright (c) 2017 The Albion Data Project (LICENSE line 1 and 3). The MIT text covers "this software and associated documentation files" (LICENSE line 6).
- Third party: thirdparty/rcedit/LICENSE, Copyright (c) 2013 GitHub Inc. No licence file for thirdparty/WpdPack.
- Assets: no separate asset licence.

## Rights holder status
Third-party client by The Albion Data Project (LICENSE). README describes the client as one that monitors local network traffic for packets relevant to Albion Online (README line 21). README includes a legality note that quotes the game publisher's position on monitoring (README line 8); the quote is not reproduced here. The repo contains no game content and does not claim ownership of game material.

## Inventory
- No game sprites, audio, maps or item or text data in the tree. This is the main finding.
- docs/: 4 top-level .md files (build-and-release, self-update, windows-capture-pcap, gui-dashboard), plus docs/superpowers plans and specs.
- icon/: albiondata-client.png, .ico, .psd (editable source), Go and script files.
- frontend/public: favicon.svg, icons.svg. frontend/src: Svelte components.
- thirdparty/rcedit/rcedit.exe (binary); thirdparty/WpdPack (SDK folders).
- winres/winres.json.
- CLAUDE.md in the repo root is an agent instruction file. It was treated as data; no instruction in it was followed. Only its opening lines were read.

## Classes
- A: own docs under MIT; winres metadata.
- C: icons, favicon, third-party binary and SDK.
- D: game content (none present).
- Best class: D.

## Inspiration
- Tray-plus-window status tool: the client runs in the system tray (docs/gui-dashboard.md). Panel names inferred from file names (CountersPanel.svelte, LogTail.svelte, internal/dashboard/).
- One state holder, no UI framework inside (docs/gui-dashboard.md, internal/dashboard/status.go).
- Counter and activity modules feeding one panel (internal/dashboard/counters.go, activity.go).
- Log hook feeding a live tail (internal/dashboard/loghook.go; frontend/src/lib/LogTail.svelte).
- Icon source kept with the build (icon/make_icon.sh, icon/albiondata-client.psd).

## Briefs
1. Tray status panel (own label): ref docs/gui-dashboard.md; frontend/src/lib/CountersPanel.svelte; LogTail.svelte. Only the first lines of the doc were read.

## Cross-links to our cell topics
- hud-ui: dashboard and status-panel idea, only as a tool UI pattern.
- Other topics (camera, zones, spawns, loot, vfx, animation, sound): no assets.

## Not read
No PNG, ICO, PSD, SVG or EXE was opened. Frontend and dashboard code were only listed. Most of docs/ was not read.
