# heroiclabs-nakama (asset audit, AU025)

Donor: /mnt/frankendom-donors/heroiclabs-nakama (Go game server with Lua runtime sample modules and a bundled web console). Not a game: there are no creatures, items, zones or game art in this box.

Half read: server side only (Go server, Lua runtime modules, console UI build). The client SDKs are not in this tree, so no client half exists in the box to pair with it.

## Licences (as the files say)
- Code: Apache License 2.0. LICENSE line 3 reads "Version 2.0, January 2004"; README line 188 reads "This project is licensed under the [Apache-2 License]".
- Lua sample modules (data/modules/*.lua) carry the same Apache-2.0 header and "Copyright 2018 The Nakama Authors" (match.lua lines 2 and 4).
- Asset licence: none separate. The only licence file found is the repo LICENSE. It does not name images, fonts or icons. No CREDITS, NOTICE or per-folder licence file was found (find -maxdepth 3 for licen/notice/credit under console/ui).

## Asset inventory (counts from find, not opened)
- console/ui/dist/static: 16 SVG (feature icons named hiro_<feature>-<hash>.svg, e.g. base, economy, energy, inventory, leaderboards, tutorials, unlockables), 13 woff2 + 1 ttf font files (Inter, Roboto Mono, codicon), 3 JS, 1 CSS, 4 gz. Font licences are not stated in the tree.
- console/ui/dist/index.html (title "Nakama"), favicon.ico, robots.txt.
- .github/: logo.png, nakama.png, dashboard.png, players.png, modules.png, storage.png, api-explorer.png (screenshots of the console, roughly 0.01 to 0.5 MB each).
- console/api.swagger.json and console/console.swagger.json (API definitions, JSON text).
- data/modules/: 9 Lua files, 1,098 lines total (sample match handler, matchmaker hook, tournaments, IAP verifier, p2p relay, debug utils).
- CHANGELOG.md: 104 version headings, newest 3.41.0 dated 2026-09-18 (receipt).
- sample_go_module/: README and sample.go (minimal Go runtime example).

## Classes per group
- Lua sample modules and Go code: A (Apache-2.0; keep the header and attribution).
- Feature SVG icons, console screenshots, logo.png: C. The repo LICENSE is general and does not name these files, so the reading is unclear. Logo is also a brand mark; the file says nothing about trademarks.
- Fonts (Inter, Roboto Mono, codicon): C. No font licence in the tree.
- CHANGELOG and swagger text: A for reuse of structure only; no copyrightable game text.
- Overall best_class for non-code assets: C.

## Rights-holder status (from repo files only)
Original project, copyright line "The Nakama Authors" (Heroic Labs named in README). Not a fan project, leak or decompile.

## Inspiration (own words; this donor is a server, so visuals are UI only)
- A single-stroke feature icon family: each feature (rewards, leaderboards, energy, inventory, auctions) gets its own glyph on the same 200-unit square. Useful as a UI vocabulary for our hub and HUD features, not as copied artwork. Reference: console/ui/dist/static/hiro_*.svg.
- Icons drawn as two-tone gradient shapes (blue-violet stops visible in hiro_base). Technique: one gradient per glyph, flat secondary shape. Reference: console/ui/dist/static/hiro_base-CVjIFC1v.svg line 1.
- A matchmaker gate that matches exactly two users only when both carry the same "mode" property. Pattern: a small property check before a match is created. Reference: data/modules/match_init.lua lines 48-62.
- A match label string used as a skill bucket (sample default "skill=100-150"). Idea: queue tags as readable lobby labels. Reference: data/modules/match.lua line 48.
- Tournaments with a duration, reset schedule, and max-size fields (sample RPC). Idea: season windows as data fields, not code. Reference: data/modules/tournament.lua line 54.
- Console dashboard screenshots (.github/dashboard.png, players.png): ops-view layout for our Pit admin, not a player-facing look. Reference: .github/dashboard.png.

## Briefs
See the JSON "briefs" list (one brief, UI-only, because the donor has no creature, item, armour or zone content). Rule: recreate as a clearly distinct original, never a copy.

## Cross-link to our cell topics
- hud-ui: feature icon family and the two-tone gradient technique (icons only).
- progression: tournament and season window fields (data, not art).
- Not relevant to camera, zones, spawns, loot, vfx, animation, sound: no assets for those in the box (Lua sample modules hold only server logic).

## Not read
- Three console JS bundles (json.worker, editor.worker, index) matched the grep for "OFL"; not opened, so any licence text in them is unchecked.
- Individual SVG icon contents beyond hiro_base line 1 (not read).
- Font files and PNG screenshots (binary; not opened, only listed).
- Go server internals beyond match_registry.go line 315 and config.go defaults (not read).
- Client SDK halves (absent from the tree; not searched outside the top-level listing).
- console/ui JS bundles (only file names read).
