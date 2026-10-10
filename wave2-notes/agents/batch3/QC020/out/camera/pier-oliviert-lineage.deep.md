# pier-oliviert-lineage (camera, cell 14)

Donor: `/mnt/frankendom-donors/pier-oliviert-lineage/src/components/camera.coffee` (compiled twin `lib/components/camera.js`, same logic) | Licence: none found (unclear; no LICENSE, README or manifest licence) | CoffeeScript | symbol `Camera`

Checked: camera_scope "world camera" (open MMO zone, 2D tile grid, follow of the local player). Read in full on the VPS: camera.coffee, game_controller.coffee (the whole file), characters.coffee, tiles.coffee, models/characters/character.coffee, move.coffee; compiled JS: camera.js read in full, game_controller.js read only at the camera call sites and the constructor (grep plus lines 9-31 and 100-120), tiles.js and characters.js only by grep and part reads (source read in full). Callers of `camera.position` and `camera.update` were all read: game_controller.coffee 53 (update), 79 (Player packet), 85 (Move packet); the compiled JS repeats them at 109 and 116. Confidence high on what the code does; nothing was run. I was torn between PARTIAL and STRONG: I wrote STRONG because the whole path is read end to end and the mechanism is self-contained, but it is a very small mechanism and gives none of the owner's third-person asks.

Best transferable idea: Pin the local player at the screen centre and draw every other entity at centre plus its tile offset times the tile size, so the view keeps no state beyond the viewport centre. (The donor applies the rule only to the character whose packet just arrived, so it does not hold it when the player moves; a port must re-place every entity each frame.)
Decision (proposed): reject - the donor's camera snaps every packet, leaves the floor static and re-places only the sender's sprite (so other entities go stale when the local player moves), and nothing in it answers the owner's shoulder, smoothing, collision or framing asks; its one useful rule (the view is client-only) is already our ruling.
Acceptance: A still of the world camera taken mid-run at 375 wide shows the floor moving under the hero, and a remote hero glides between packets instead of jumping one tile.

## 1. Mechanism

- There is no moving camera. The camera keeps only the screen centre: `x = renderer.width / 2`, `y = renderer.height / 2` (camera.coffee 3-5; the renderer is 1024 by 768, game_controller.coffee 6).
- Each time a character's position is known, `position` writes that sprite's screen position as `centre + delta * 32` on each axis (camera.coffee 9-11). The delta is `character.x - player.x` (and y) from `Characters.delta` (characters.coffee 19-21). So the local player's sprite sits at the centre (delta 0) and a character is drawn relative to it, one tile = 32 px, but only at the moment that character's own packet arrives: `camera.position` runs only for the character in the packet just received (game_controller.coffee 79, 85), and no loop re-lays out the other sprites. When the local player moves, only the player's own sprite is re-placed (delta 0), and other characters keep stale screen offsets until their own next packet. The Move packet also carries a heading that the camera ignores.
- Order of steps for one Move packet (game_controller.coffee 81-85): `@character(packet)` is, after its first call, a cache closure (23-31) that calls `character.update(packet)` for a cached id, which overwrites `x` and `y` from the packet (character.coffee 16-18); then `camera.position` runs for that character. (First call quirk, not camera: the outer `character` method at 23-39 replaces itself and calls `@player.update(packet)` on whatever packet arrives first.) The Player packet path (74-79) first creates the character and adds it to the stage if it is not in the on-screen list, then calls `camera.position`.
- `move` is an empty function (camera.coffee 7-8). Nothing else in the donor calls it.
- Per frame: `render` (game_controller.coffee 52-54) calls `camera.update(stage)`, which is `renderer.render(stage)` (camera.coffee 13-14), then schedules the next frame with `requestAnimationFrame`. There is no fixed step. Positions change only when a packet arrives, so a remote character jumps to its new tile on the packet with no interpolation.
- The floor is static. `Tiles` places the tile sprites once in its constructor, from the origin, across the 1024 by 768 canvas (tiles.coffee 3, 8, 16-29), and the camera never touches them. So the ground does not scroll; only the sprites are offset (read, not run).
- `isOnScreen` is membership in the stage list (characters.coffee 16-17), not a viewport test.
- Sprite speed fields `speedX`/`speedY` are set to 2 (character.coffee 9), but neither the camera nor the update path reads them (grep over the donor: assignments only).

## 2. Key functions

- `Camera` constructor and `position`: `/mnt/frankendom-donors/pier-oliviert-lineage/src/components/camera.coffee` 2-5 and 9-11.
- `GameController` render loop: `/mnt/frankendom-donors/pier-oliviert-lineage/src/controllers/game_controller.coffee` 52-54; packet dispatch that calls the camera: 68-90 (Player 74-79, Move 81-85).
- `Characters.delta` and `isOnScreen`: `/mnt/frankendom-donors/pier-oliviert-lineage/src/components/characters.coffee` 16-21.
- `Tiles` constructor and `placeTile`: `/mnt/frankendom-donors/pier-oliviert-lineage/src/components/tiles.coffee` 2-29.
- `Character` construction and `update`: `/mnt/frankendom-donors/pier-oliviert-lineage/src/models/characters/character.coffee` 2-18.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pin the local player at the viewport centre; draw each other entity at centre + (its tile - my tile) x tile px | Tile px 32 (theirs, camera.coffee 10-11; tileSize:32 at game_controller.coffee 9) |
| Viewport centre = half of the viewport size | Viewport 1024 by 768 (theirs, game_controller.coffee 6) |
| Snap to each packet, no smoothing | None (no smoothing constant exists in the donor) |
| Static floor, no scroll | None (tiles placed once, tiles.coffee 16-29) |
| Camera move hook | None (empty body, camera.coffee 7-8) |

## 4. TypeScript sketch

simplified: the sketch keeps only the placement rule (pin the local player to the centre, draw others at tile delta times 32 px, overwrite on each packet). It applies the rule as a pure function for any entity; the donor calls it only for the packet sender, so the sketch does not reproduce the stale offsets of the others when the player moves. It omits the PIXI sprites, the character cache and creation, the on-screen list, the tile grid, the render loop and the requestAnimationFrame schedule. It returns a screen position where the donor mutates a sprite. The centre and tile size are the donor's values (1024 by 768 viewport, 32 px tile).

```ts
// Licence: none found in the donor (unclear). Clean-room sketch from the described mechanism, not a translation.
// clean-room
interface Vec2 { x: number; y: number; }

const TILE_PX = 32;                              // donor: tileSize 32 and "* 32" in camera.coffee
const SCREEN_CENTRE: Vec2 = { x: 512, y: 384 };  // donor: 1024x768 renderer, half size

// Where an entity is drawn: the local player is pinned to the screen centre.
function screenFor(entity: Vec2, localPlayer: Vec2): Vec2 {
  return {
    x: SCREEN_CENTRE.x + (entity.x - localPlayer.x) * TILE_PX,
    y: SCREEN_CENTRE.y + (entity.y - localPlayer.y) * TILE_PX,
  };
}

interface Remote { pos: Vec2; screen: Vec2; }

// Each packet overwrites the position and redraws at once: no smoothing, no interpolation.
function onMovePacket(r: Remote, x: number, y: number, localPlayer: Vec2): void {
  r.pos = { x, y };
  r.screen = screenFor(r.pos, localPlayer);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client module; the Frankendom repo was not read for this cell). Client-only: the engine never reads it.
- Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (no licence found; clean-room only)
- Brief rule served: camera is client-only (the engine never reads the camera); rules 7-9 n/a

## 6. Gaps and risks

- Licence unclear: clean-room only. The sketch was written from the mechanism; no donor lines are copied.
- Snap: each Move packet jumps the sprite to its new tile. A world follow camera needs smoothing that is frame-rate independent. The donor has none, so do not copy the snap.
- Static floor: the ground never moves, so characters slide over a fixed tile texture. Do not treat this as a model for a world camera.
- Absent (read, not present): shoulder offset, pitch and yaw limits, collision pull-in, zoom, lock-on or multi-enemy framing, shake, recentring. The donor is 2D top-down, so a 3D third-person camera gets nothing from its geometry.
- The camera reads character data and writes only sprite positions; it never writes back into character state. That boundary matches our ruling (the view must not feed the fight state, and kills stay server-verified). Keep it.
- Units: the camera multiplies the delta by 32, which suggests packet x and y are tile units, but the code read does not document the unit (move.coffee 6-7 only shows int16). Inferred, not confirmed.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All cited lines verified (camera.coffee 3-5/9-11/13-14, game_controller 6/9/52-54/74-85, characters 16-21, tiles 3/8/16-29, character.coffee 9/16-18, move.coffee int16 at 6-7 under src/packets/server/, no licence). Overclaim: Mechanism says 'every other character is drawn relative to' the local player and Best idea says the view keeps no state beyond the centre; in fact camera.position runs only for the character whose packet just arrived (game_controller 79, 85), so when the local player moves nothing recomputes the other sprites and they keep stale screen offsets until their own packet.

**Missed:** When the local Move packet arrives, delta for the player is 0 and only the player sprite is re-placed; no loop re-lays out the other entities. So the 'pin player at centre, everyone else offset' rule is not actually maintained by this donor on player movement. Also Move packet carries a heading int8 (move.coffee 8) that the camera ignores.
