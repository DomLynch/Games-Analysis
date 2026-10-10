# pier-oliviert-lineage (assets audit, AU042)

Donor/Licence: Chrome packaged app (client only, CoffeeScript compiled to JS). No LICENSE, NOTICE or CREDITS file; manifest.json has no licence field. Code licence: none stated.
Rights holder: unknown from the files. The files name a commercial title ("Lineage: The Bloodpledge", window.html line 4; manifest name "Lineage"). README is a packet exchange walk-through. Treated as restricted: class C, category-level inspiration only. Not claimed as leaked; the files do not say.
Pair half: the server half is not in the box under a Lineage 1 name. Lineage 2 donors exist by name (a different title; not opened, not matched).

## Asset groups
- Third-party: assets/javascripts/jquery.js (1.9.1, MIT per header line 9). Code, class A as a library only.
- Third-party: assets/javascripts/pixi.js (minified, about 60 KB, no licence text found). Class C.
- Textures: assets/textures/bunny.png, the only image (name only, not opened). .gitignore excludes assets/textures/ (line 1). Class D.
- CSS: login.css, game.css, chat.css (layout only). Class C.
- UI text: templates/login.html, characters.html, chat.html, game.html (1006 bytes total). Class C.
- Protocol classes: lib/packets/server (11), lib/packets/client (4), lib/socket (encryption and framing). Class C, restricted.
- Data tables, locale, audio, fonts, maps, 3D models: none in the donor. Class D.

## Data first
No XML, JSON, CSV or locale tables. The client receives its data from the server, so the names and looks are not here. The packet classes are the closest thing to a data schema (for example lib/packets/server/move.js, the move record).

## Inspiration (category level, restricted donor)
1. Screen stack: lineage.js keeps a controller list and a push that renders the new screen (lines 16-25). Keep: one stack drives login, select and world. Defect: pop() (line 22) uses slice(index, 0), which returns an empty list and removes nothing. Fix: remove the controller (splice) and return it. Decision: adapt (idea), defect fixed in the sketch.
2. Fixed-centre follow view: camera.js places the character at screen centre plus tile offset times 32 px (line 18). The move() stub (line 15) is empty, so there is no smoothing. For parity row 11, keep the fixed hero and the offset world; add smoothing and a fight framing.
3. One tile unit: the tile component receives tileSize 32 (game_controller.js line 22). One grid constant shared by every component.
4. Components on one stage: chat, tiles, characters and camera are built from one controller (game_controller.js from line 17). Keep the split: state in controllers, drawing in components.
5. Chat as channel tabs with a history per tab: engine/chat.js marks a global tab as active and keeps a history per tab (lines 9-10). Idea for hud-ui.
6. Small fixed-field movement record: the move message carries id, x, y and a one-byte heading (move.js lines 14-19). Idea for the many-on-one sync (row 18, post-K item 3): one short record per moving actor.

## Briefs (recreate as clearly distinct originals; never copies)
- Fixed-centre follow view (own label): keep the fixed hero and the offset world; change: smoothing, a fight framing that widens on the foe, no empty stub. Ref: lib/components/camera.js lines 15, 18.
- Screen stack for login to world (own label): keep one stack with push and current; change: a working pop, our own screens, a fade between screens. Ref: lib/lineage.js lines 16-25; lib/controllers/characters_controller.js line 34.
- Tabbed chat with per-channel history (own label): keep the default tab and per-tab history; change: our channel names and colour tags, a read-only fight-log channel. Ref: lib/engine/chat.js lines 9-10; templates/chat.html.

Readability at 375 px, sound, silhouette: not read (no sprites or audio in this donor).

## Not read
See the .assets.json not_read list (encryption and packet classes beyond move.js, the pixi body, CSS beyond game.css head, the bunny PNG, the Lineage 2 donors).
