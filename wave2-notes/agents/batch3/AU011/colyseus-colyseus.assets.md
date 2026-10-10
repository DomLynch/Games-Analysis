# colyseus-colyseus: asset audit (AU011)

Root on VPS: /mnt/frankendom-donors/colyseus-colyseus/ (read-only, nothing copied).

## Licences (what the files say)
- Code licence: MIT. LICENSE line 1 reads "Copyright (c) 2015-2026 Endel Dreyer"; README line 52 says "MIT licensed, even for commercial games." 13 workspace package.json files carry "license": "MIT" (grep only).
- Asset licence: none separate. The only licence file is the root MIT LICENSE. No licence line exists for the logos, screenshots or favicons.
- Third-party exception: packages/room-plugins/geoip/test/fixtures/NOTICE.md line 11 says the test database GeoLite2-Country-Test.mmdb is Apache License 2.0 (sourced from maxmind/MaxMind-DB). The NOTICE says it is excluded from published builds.
- Rights-holder status: open-source networking framework (copyright line names Endel Dreyer). No game. Ownership of the logos is not stated.

## Asset inventory
| Group | Path (under root) | Count / size | Licence | Class |
|---|---|---|---|---|
| Brand logos | media/logo.svg (7.9 KB), media/logo-cloud.svg (9.9 KB), media/header.png (36 KB) | 3 | none stated | C |
| Playground icons | packages/playground/public/logo192.png, logo512.png, favicon.ico; packages/playground/src/favicon.svg | 4 | none stated | C |
| Third-party logo | packages/sdk/media/browserstack-logo.png | 1 | none stated (third-party mark) | C |
| Screenshot | packages/loadtest/screenshot.png | 1 | none stated | C |
| Test fixture DB | packages/room-plugins/geoip/test/fixtures/GeoLite2-Country-Test.mmdb | 1 binary | Apache-2.0 per NOTICE.md | A (with Apache notice) |
| Text docs | README.md, PORTING.md (15 KB), PREDICTION.md (36 KB), BACKERS.md, AGENTS.md, CLAUDE.md, package READMEs | 44 .md/.txt files in tree | MIT (repo) | A (text) |

Game content: none. No 2D sprites, 3D models, audio, fonts, maps, levels or game text. Extension count across the tree: ts 437, tsx 82, json 56, md 43, png 5, svg 3, ico 1, mmdb 1.

## Inspiration (own words)
- PREDICTION.md (36 KB) opens with the feature promise in plain words and then sets the server half and the client half side by side, with the "load-bearing rules" listed up front. Worth copying as a documentation pattern for our own netcode or feel notes.
- The same guide pairs each concept with a minimal runnable reference (a platformer, a physics shooter, a 3D FPS). The reference projects are named in the doc but are not in this tree (no demos/ or test/ folder at root). A pattern to copy for our own prototypes: one tiny playable proof per mechanic.
- The promise "what you see is what you hit" is a clear one-line design target for hit feel. Useful as a mood line for our combat-feel doc, not as content.
- The playground package ships its own favicon and 192/512 logos: an operator dashboard look, not a game UI. Low value for art; the layout was not inspected.

## Inspiration briefs
None. The donor has no creatures, items, armour, zones or effects. Nothing visual to brief.

## Cross-link to our topics
- hud-ui: the playground dashboard is the only UI in the tree; not read in depth.
- camera / spawns / loot / zones / vfx / animation / sound: no assets here. The netcode docs touch prediction and interpolation, which relate to the feel of the camera and hits, but no art or audio.

## Not verified
- Logos and favicon: sized from the file listing only; not viewed.
- Screenshot and mmdb: not opened.
- CLAUDE.md, AGENTS.md, BACKERS.md, PORTING.md, .all-contributorsrc: listed, not read.
- The 13 package.json licence fields were checked with grep, not one by one.
- Source code under packages/*/src was not read (out of scope).
