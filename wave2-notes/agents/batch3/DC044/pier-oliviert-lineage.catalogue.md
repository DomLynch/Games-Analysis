# pier-oliviert-lineage (design catalogue, DC044)

Donor tree: /mnt/frankendom-donors/pier-oliviert-lineage/ (read over ssh only, nothing copied or run).
Asset audit used first: AU042 (`/private/tmp/p2/wave2-haiku/batch3/AU042/pier-oliviert-lineage.assets.md`). Not repeated here; the screen stack, camera and tabbed chat are referenced from it and re-checked against the code.
Receipts: `receipts.tsv` in this folder (19 rows for this donor, all verified with verify_receipts.py).
Rule for every idea below: recreate as a clearly distinct original, never a copy. Inspiration stays category-level because this donor has no licence and is treated as restricted (class C).

## Which half was read
- **Read: the client half only.** A Chrome packaged app: `lib/` (CoffeeScript compiled to JS, read) and `templates/`, `window.html`, `manifest.json`, the CSS heads. `src/` (CoffeeScript source, same file names) was not read; it mirrors `lib/`.
- **Not in the box under a Lineage 1 name: the server half.** The packet classes in `lib/packets/` are the client side of the protocol. Lineage 2 donors exist in the box (cuteshaun-lineage2-api, elberacasa-Lineage2Elbera, realratchet-Lineage2JS). They are a different title and were not opened or matched.
- No creature, class, weapon, gear or zone data is in the donor. The names and looks come from the server, which is not here.

## Counts (verified by reading and grep)
- creatures: 0
- classes: 0 (the player packet carries `spriteId`, an appearance index, not a class; see section 2)
- weapons: 0
- gear_sets: 0
- zones: 0 (`tiles.js` draws a grid of sprites; there is no map data)
- files in the donor: 103

## 1. Creatures / beasts
None. The only character-like data is the player and character packets: `player.js` carries `spriteId` (int16, line 19) and `x`, `y`, `status`, `heading`, `light`, `speed`, `experience`, `lawful`. These are the same kind of fields a creature list would need, but no creature list is in the donor.

## 2. Classes / races / factions
- **Classes and races:** none. No class or race field in any packet read.
- **Factions:** the character info packet carries a `pledge` string (line 13 of `lib/packets/server/charinfo.js`, next to `name`). A pledge is a clan tag. The chat tabs include a Clan tab (`templates/chat.html` line 11). This is the only faction-like data.
- **Progression:** none in the client files.

## 3. Weapons
None. The donor has no weapon or item files.

## 4. Armour / gear
None.

## 5. Zones / dungeons
None. `lib/components/tiles.js` builds a grid of tile sprites at a fixed size (`tileSize: 32` in `lib/controllers/game_controller.js` line 22; applied at `lib/components/tiles.js` line 42). Each tile has a normal and a hover texture (`tiles.js` line 64 sets the hover texture; line 70 restores the normal one). There is no zone, biome or spawn data.

## 6. Item / effect looks worth recreating (client hints only)
- **Hover texture swap on a tile:** `lib/components/tiles.js` lines 62 to 70. Technique: a pointer-over state by changing a sprite's texture. Cheap, and works without animation.
- **One tile unit:** a single 32 px grid constant shared by the camera and the tiles (`lib/components/camera.js` line 18 places the sprite at centre plus offset times 32).
- **Hover name readout:** `lib/components/characters.js` line 17 sets a sprite's mouseover handler, which writes the character's name to the console. Technique: hover-to-identify in code; no visible UI panel in the client read.
- **Nothing else is animated.** A search for death, respawn, boss, loot, drop, sound, audio, animation and anim found only the `requestAnimationFrame` render loop (`lib/controllers/game_controller.js` lines 31 and 74). No sound files, no death or respawn code, no boss or loot code in the client read.
- **Texture:** one texture file, `assets/textures/bunny.png`, not opened. `.gitignore` line 1 excludes `assets/textures/`, so it may not be in the repo at all.

## Top striking candidates (only three real ones; ranked on the Frankendom criteria)
Silhouette at 375 px, one signature behaviour, one signature sound or effect, and a 20 to 30 percent resemblance that could be ours. The donor has no sprites or sounds, so readability and sound are not read.

1. **Fixed-centre follow camera** (`lib/components/camera.js` lines 15 and 18). Why: the hero is held at screen centre, with the world offset by tile times 32. Keep: the fixed hero and the offset world (parity row 11). Change: smoothing (the move hook at line 15 is an empty stub) and a fight framing that widens toward the foe.
2. **One screen stack** (`lib/lineage.js` lines 18 and 22). Why: one list of screens, with push and current. Keep: one stack for login, character select and world. Change: a working pop (see the defect below), our own screens, and a fade between them.
3. **Tabbed chat with per-tab history** (`lib/engine/chat.js` lines 12, 37 and 47; `templates/chat.html` lines 9 to 13). Why: each channel tab keeps its own history and the Global tab is the default. Keep: the default tab and per-tab history. Change: our channel names and colour tags, and a read-only fight-log tab.
4. **Ready gate** (`lib/engine/progress.js` lines 16 to 18). Why: a pending list; each finished part is removed and the gate reports ready when the list is empty. Keep: the idea (ready when the pending list is empty). Change: a guard for an unknown element. Defect: `indexOf` returns -1 for an element not in the list, and `splice(-1, 1)` then removes the last element, so an unknown update silently drops a pending item. Fix: return false and do nothing when the index is below zero. Decision: adapt (idea), defect fixed in the sketch.
5. **Compact move record** (`lib/packets/server/move.js` lines 11 and 16 to 19). Why: one short fixed-field record per moving actor (character id as int32, x and y as int16, heading as int8; packet id 126). Keep: a short fixed-field record per actor, one per move. Change: our field set and a rate limit. Idea for the many-on-one sync (parity row 18, post-K item 3).

## Defect in the screen stack (keep the idea, fix the defect)
`lib/lineage.js` line 22 is `pop` as `return this.controllers.slice(this.controllers.indexOf(controller), 0);`. `slice` never mutates the array, and the end index 0 makes it return an empty array, so `pop` removes nothing and returns nothing useful. The same donor already does it right in `lib/components/characters.js` line 24: `splice(indexOf, 1)` removes the item. Fix: remove the controller with `splice` and return it. Decision: adapt (idea), defect fixed in the sketch.

## Briefs (category level, recreate as clearly distinct originals)
- **Fight camera:** keep a fixed hero and an offset world; change smoothing and widen the frame when a foe is in range.
- **Screen stack:** keep one stack with push and current; change to a working pop and our own screens.
- **Chat tabs:** keep the default tab and per-tab history; change the channels and add a read-only fight log.

## Inspiration for Frankendom
1. **Fight camera** (parity row 11). Keep: the fixed hero and the offset world. Change: smoothing, and a fight framing that widens on the foe. Ref: lib/components/camera.js lines 15 and 18.
2. **Screen stack for login, select and world** (screens). Keep: one stack with push and current. Change: a working pop with splice, our screens, and a fade between them. Ref: lib/lineage.js lines 18 and 22; characters.js line 24 for the working remove.
3. **Clan-tag chat with a fight-log tab** (hud-ui and chat). Keep: a default tab and per-tab history. Change: our channel names, colour tags, and a read-only fight log. Ref: lib/engine/chat.js lines 12, 37 and 47; templates/chat.html lines 9 to 13.
4. **Pledge tag on a character card** (factions, label only). Keep: a short clan string on the character info. Change: our tag rules and the look of the tag. Ref: lib/packets/server/charinfo.js line 13.
5. **Ready gate for asset loading** (loading screens). Keep: the gate that reports ready when the pending list empties. Change: a guard for unknown items (the defect above). Ref: lib/engine/progress.js lines 16 to 18.
6. **Compact move record for many-on-one sync** (parity row 18, post-K item 3). Keep: one short fixed-field record per moving actor. Change: our field set and a rate limit. Ref: lib/packets/server/move.js lines 11 and 16 to 19.

## Licence note
No LICENSE, NOTICE or CREDITS file in the donor, and `manifest.json` has no licence field. The donor is treated as restricted (class C), so inspiration is category level only. `assets/javascripts/jquery.js` states the MIT licence in its header (line 9); it is a library and is class A as a library only. `assets/javascripts/pixi.js` is a minified library with no licence text found (class C). The window title and the manifest name a commercial title; the title is not repeated here. The README is a packet-encryption walk-through with sample key material; it is not reproduced here. The donor is not claimed as leaked; the files do not say. Not legal advice.

## Not read
- The pixi.js body, the bunny PNG, and the `src/` CoffeeScript mirror.
- Socket encryption and decryption (`lib/socket/*.js`), and the packet classes beyond player, move and charinfo.
- `templates/game.html` and `templates/login.html` body text (key lines only); CSS beyond the audit's heads.
- The Lineage 2 donors in the box (different title, not opened).
- Death, respawn, boss, loot, sound and idle animation: searched, none found in the client read.
- Silhouettes, readability at 375 px, and any audio (no sprites or sounds in this donor).
