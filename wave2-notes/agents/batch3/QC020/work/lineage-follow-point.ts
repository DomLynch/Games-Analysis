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
