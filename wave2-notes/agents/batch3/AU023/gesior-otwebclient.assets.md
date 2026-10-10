# gesior-otwebclient - asset audit (AU023)

Source tree (VPS, read only): /mnt/frankendom-donors/gesior-otwebclient/
Half read: the browser client (TypeScript modules under modules/, init.ts, index.html, default.html, styles.css, README.md, package.json). The server half is not in the box: README.md line 10 says the client needs a websocket-proxy server, and no proxy or server code is in the tree.

## Licence (what the files say)
- Code: MIT. package.json line 10 is "license": "MIT". No LICENSE or COPYING file exists in the tree.
- Assets: no licence statement. The only image files (img/bg.jpg, img/bg2.jpg) have no licence file or header.
- Third-party code in modules/: big.js (copyright line names Michael Mclaughlin, 2017) and jspack.ts / jspack.js (copyright line names Fair Oaks Labs, 2008). Their own licence text was not read.
- npm dependencies in node_modules/ carry their own LICENSE files (e.g. js-tokens, component-emitter). Not read beyond the file list.

## Rights-holder status (from repo files only)
unknown. README.md line 3 says the project is based on edubart/otclient. package.json line 9 names the author as Gesior.pl. No file names the owner of the game the client was written for. No game data is shipped.

## Asset inventory
| group | path | count | licence | class | note |
|---|---|---|---|---|---|
| background JPEGs | img/bg2.jpg, img/bg.jpg | 2 files, about 2.5 KB each | none stated | C | Both are JPEG (EXIF header read via od). styles.css line 15 sets body background to img/bg2.jpg. bg.jpg not referenced in styles.css, index.html or default.html (those three files only were checked). |
| game sprites (Tibia-style .spr) | none in tree | 0 | n/a | D | modules/spritemanager.ts line 11: getSpriteImage returns a blank Image. Line 9 has an m_spritesFile field that is never filled. Loader is a stub. |
| game data tables (.dat) | none in tree | 0 | n/a | D | thingtype.ts parses sprite layout structures, but no data file is shipped. |
| fonts | none shipped | 0 | n/a | D | styles.css body uses font-family Verdana (a system font named, not shipped). |
| UI text | index.html line 4 title, default.html line 7 title | 2 strings | none | D | Demo leftovers: default.html title is a warship-game name; index.html title is a jQuery demo. Not game text. |
| data tables (code) | modules/constants/const.ts (enum Otc, DrawFlags, ThingCategory), modules/constants/proto.ts (enum Proto, opcode table, 227 lines) | 2 tables | MIT (code) | n/a | These are the tables that hold the look and feel constants and the protocol opcodes. Cited for inspiration, not as assets. |

## Data first
- Layout and look constants: modules/constants/const.ts (tile size, floor range, draw-layer flags, timing values for text and effects).
- Protocol opcodes: modules/constants/proto.ts (enum Proto).
- Sprite addressing: modules/thingtype.ts getSpriteIndex (line 614).

## Stub warning
Many modules are stubs. color.ts line 23, outfit.ts and missile.ts throw or do nothing. Treat their names as intent, not behaviour.

## Inspiration (category level, class C donor)
- Sprite sheets are addressed by a single formula over animation frame, pattern X/Y/Z, layer, and cell width and height (thingtype.ts getSpriteIndex). An artist could lay out sheets on that grid.
- The world is a 32 px tile grid with a vertical stack of floors, a sea-level floor and an underground band (const.ts Otc block). Our zone depth bands could use the same idea of a sea line and a deep band.
- Draw order is split into named layers: ground, borders, bottom, items, creatures, effects, missiles, texts (const.ts DrawFlags). A good model for our camera and VFX sort order.
- Speech-style floating text lasts longer the longer the line is, with a minimum and a cap on width (const.ts block near ANIMATED_TEXT_DURATION). A fade-and-float bubble could be built from the same idea.
- Character looks are modelled as slots (head, body, legs, feet, mount) on an outfit object (outfit.ts). The methods are stubbed, but the slot model is clear.
- Effects run a per-frame animation with a phase that clamps at the last frame and wraps the pattern offset (effect.ts drawEffect). Useful for spell and impact VFX.
- The dialog look is a near-transparent light panel with a thin dark border (index.html inline style, .ui-dialog). Simple HUD panel idea for our hud-ui cell.

## Briefs (class C: category level only)
See gesior-otwebclient.assets.json key "briefs". Rule for all briefs: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed.

## Cross-link to our cell topics
- camera: draw-layer order (const.ts DrawFlags) and the floor stack (Otc block).
- zones: the sea-floor and underground bands (const.ts Otc block).
- vfx: effect.ts drawEffect and the text duration rules.
- animation: thingtype.ts getSpriteIndex frame axis.
- hud-ui: index.html / styles.css panel style.
- spawns, loot, sound: no content in this donor (not read beyond names).

## Not read
- js/vendor.js (762 KB bundle) and js/index.js (118 KB bundle); bundles were not opened.
- node_modules/ licence files (listed only, see Licence).
- modules/statictext.ts, modules/map.ts, modules/game.ts, modules/creature.ts (names seen, not read in full).
- .idea/ IDE files, package-lock.json.
- img/*.jpg pixel content (only file header via od).
