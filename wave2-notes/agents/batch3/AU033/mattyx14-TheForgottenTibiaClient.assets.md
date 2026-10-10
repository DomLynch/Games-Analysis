# mattyx14-TheForgottenTibiaClient (asset audit, AU033)

Donor path (VPS, read-only): /mnt/frankendom-donors/mattyx14-TheForgottenTibiaClient/ (an OTClient fork: the README and LICENSE name OTClient)

## Licence (what the files say)
- Code: MIT. LICENSE line 1: "OTClient is made available under the MIT License", copyright 2010-2017 OTClient. README.md line 59 repeats the MIT grant.
- Assets: no separate asset licence. The files do not list the origin or licence of the PNG art, fonts, cursors or the start-up sound; they fall under the repo MIT grant only.
- Tibia game data (spr/dat): not in the box. README.md line 20: "You will need to download spr/dat files on your own".

## Rights-holder status
Community client for the Tibia MMO (README.md line 5). Tibia-related identifiers in code: a CipSoft RSA constant and the hosts '.tibia.com' and '.cipsoft.com' (modules/gamelib/game.lua lines 20-21). The files do not state who owns the UI art, the fonts, or the game. No licence from CipSoft is shown. Unknown beyond that.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Tibia sprites and data (spr/dat) | data/things/ (empty except .gitignore) | 0 | D |
| UI images | data/images/ | 199 PNG | C (origin not stated) |
| Bitmap fonts | data/fonts/ | 9 PNG sheets, 6 .otfont | C |
| Cursors | data/cursors/ | 4 PNG, 1 OTML | C |
| Particle definitions | data/particles/particles.otps (text), particle.png | 2 | .otps A (text under MIT); png C |
| Start-up sound | data/sounds/startup.ogg | 1 | C (not opened) |
| Locale and layout text | data/locales/ (6 .lua), 25 .otui under data/, module folders (about 45) | many | A (MIT, keep the notice) |
| Tools | tools/ (scripts, gimp-bitmap-generator, katepart-syntax, lua-binding-generator, tfs_extendedopcode.patch) | 7 | A (MIT) |
| Client code | src/ (C++11 framework), modules/*.lua | many | A (MIT) |

Note: Frankendom gets no spr/dat art from this box. The UI art has no stated origin, so it is class C.

## Data first
The creature, item and tile data (spr/dat) is not in the box; README.md line 20 says the user supplies it. UI strings are inside module code and layout files, not in a string table: data/locales/en.lua has an empty translation table (comment at line 10). Other locale files were not read.

## Which half was read
Client half, in part: battle list, death window, combat controls, minimap (lua), particle definition (text), font and image names. Server half: the TFS patch (tools/tfs_extendedopcode.patch) is present; the server itself (The Forgotten Server) is not in the box. Data half: spr/dat absent by design; locales read at en.lua only.

## Inspiration (own words, category level)
- Battle list as a live target strip: filters by type, distance sort that re-sorts on each move, a party flag. Refs: modules/game_battle/battle.lua lines 237-262 and 281-290.
- Death presentation: a plain window states the penalty; a partial penalty gets a different sentence from a full one; a short game-message line. Ref: modules/game_playerdeath/playerdeath.lua lines 30-57.
- Three-step fight stance (offensive, balanced, defensive), a chase toggle and a safe-fight toggle; each sent to the engine on change. Ref: modules/game_combatcontrols/combatcontrols.lua lines 204-229.
- Cooldown effect as data: a short burst of particles with an attraction affector, so a ready cooldown collapses inward. Ref: data/particles/particles.otps (effect name at line 2; effect block below).
- Minimap: saved map loaded and saved, camera marker updated, full-map toggle; full map supplied by the user. Refs: modules/game_minimap/minimap.lua lines 98-131 and 144.
- Font set with monochrome, antialiased and rounded variants for small HUD text. Ref: data/fonts/*.otfont (names only).

Dom's rule for every brief: recreate as a clearly distinct original, never a copy.

## Inspiration briefs
1. Target strip with distance order (hud-ui). Keep: type filters, distance sort that re-sorts on move, party flag. Change: three-slot touch strip with threat shapes, colour secondary, party ring. Ref: modules/game_battle/battle.lua lines 237-262, 281-290.
2. Cooldown collapse burst (vfx). Keep: short burst then attraction pull to the centre. Change: collapsing ring on our own axis, soft sound on collapse, no straight-out burst. Ref: data/particles/particles.otps.
3. Penalty window wording (death and respawn). Keep: one plain window, a partial-penalty sentence, a short centre line. Change: respawn countdown instead of a close button, our own sentences, grey-out not flash. Ref: modules/game_playerdeath/playerdeath.lua lines 30-57.
4. Stance selector (fight modes). Keep: three steps, chase toggle, safe-fight toggle. Change: ring selector around the fighter, lock icon for chase, our own stance names. Ref: modules/game_combatcontrols/combatcontrols.lua lines 204-229.

## Cross-link to our cell topics
- hud-ui: battle list, minimap, stance controls, font set (modules/game_battle, game_minimap, game_combatcontrols).
- progression, loot, spawns, zones: none read.
- vfx: particle definition (data/particles).
- sound-music: one start-up sound (not opened); no sound module read.
- camera: minimap camera marker only.
- death/respawn: death window (playerdeath).

## Not read / unverified
- No spr/dat data in the box.
- PNG art, fonts, cursors, startup.ogg: names and counts only.
- src/ C++ framework: names only.
- Modules read in part; the rest (game_cooldown, game_healthinfo, game_hotkeys, game_textmessage, game_inventory and others) names only.
- Locales other than en.lua: names only.
- The TFS patch: names only; the server is absent.
