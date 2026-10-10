# ASSET AUDIT: geckosio-geckos.io (AU022)

Donor root: /mnt/frankendom-donors/geckosio-geckos.io/ (VPS, read-only). Receipts: receipts.tsv.

## Summary
- Code licence: BSD-3-Clause (LICENSE:1; package.json:48; README.md:739). Copyright (c) 2021 Yannick Deubel (LICENSE:3).
- Asset licence: none stated. There are no game assets.
- Rights status (from files): single named copyright holder for the code. No game content.
- Best class: D. The donor is a netcode library (README.md:9: real-time client/server communication over UDP using WebRTC and Node.js). Nothing to use as game art, audio or maps.

## Which half was read
- Netcode library, both halves: package descriptions read (package.json:3, packages/client/package.json:4) and README read at the transport lines. Source of packages/client, server and common listed only, not read.
- Asset half: the only assets are 5 image files under readme/. No separate game-data half exists in the tree.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Logos and thumbnail | readme/logo-256.png, logo-512.png, logo.svg, thumbnail.png, enable3d-logo.png | 5 | D |
| Demo chat page | packages/chatApp/src/index.html | 1 | D |
| Client bundles (JS) | bundles/geckos.io-client.*.min.js | 10 | D (code) |

Searched extensions (png, jpg, gif, svg, wav, mp3, ogg, json, tmx, glb, gltf, obj, fbx, ttf, woff): the only matches are the 5 images above; the rest are JSON and config files.

## Inspiration (own words)
1. Shared packages for client, server and common (packages/*), so one message schema serves both halves.
2. Transport trade-off written down: UDP over WebRTC against websocket (README.md:50, :73).
3. Port-range configuration for WebRTC (README.md:152).
4. Versioned client bundles per release.
5. No art or narrative to recreate.

## Briefs
None. No creatures, items, armour, zones or effects in the donor.

## Cross-link to our cell topics
- None of camera, zones, spawns, loot, hud-ui, vfx, animation, sound has assets here. The shared-package layout is an architecture reference for netcode only.

## Not verified
- Source of packages/client, server and common (listed only).
- Test suites, jest config and package-lock.json.
- Contents of the minified bundles.
- Binary logo files (not opened).
