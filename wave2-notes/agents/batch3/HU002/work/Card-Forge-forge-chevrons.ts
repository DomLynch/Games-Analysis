// Licence: GPL-3.0 (donor). clean-room sketch of the shape of off-screen enemy arrows around the player, written from the described mechanism, not a translation.
// clean-room
interface V2 { x: number; y: number; }
interface Foe { x: number; y: number; hidden: boolean; inStage: boolean; defeated: boolean; }
interface Arrow { x: number; y: number; angleDeg: number; }

const OFFSET_PX = 18; // distance from the player's screen point to the arrow (donor GameHUD.java line 504)
const LANE_PX = 9;    // spread per lane (donor GameHUD.java line 503)

// Gate: the arrows show only for a clear-quest map, with the setting on, the HUD visible, and foes left.
// Mirrors donor GameHUD.java lines 514-518 (setting, HUD hidden, in map, clear quest active, remaining > 0).
function arrowsEnabled(settingOn: boolean, hudHidden: boolean, inMap: boolean, clearQuest: boolean, remaining: number): boolean {
  return settingOn && !hudHidden && inMap && clearQuest && remaining > 0;
}

// Remaining enemies: on the stage and not defeated (donor MapStage.java lines 986-988).
function remainingEnemies(foes: Foe[]): number {
  return foes.filter(f => f.inStage && !f.defeated).length;
}

// One arrow per hidden foe. Arrows sit in a fan around the player's screen point (already projected).
// Donor: lane = index / 2 and spread = sign * lane * 9, which puts index 0 and index 1 both at spread 0.
// Fix in this sketch: k = ceil(i / 2), sign = -1 for odd i, +1 for even i, so the spreads run 0, -9, +9, -18, +18.
function layoutArrows(playerScreen: V2, playerWorld: V2, foes: Foe[], maxArrows: number): Arrow[] {
  const out: Arrow[] = [];
  const hidden = foes.filter(f => f.hidden && f.inStage && !f.defeated);
  for (let i = 0; i < Math.min(hidden.length, maxArrows); i++) {
    let dx = hidden[i].x - playerWorld.x;
    let dy = hidden[i].y - playerWorld.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    const side = { x: -dy, y: dx };
    const k = Math.ceil(i / 2);
    const sign = i % 2 === 1 ? -1 : 1;
    const spread = sign * k * LANE_PX;
    out.push({
      x: playerScreen.x + dx * OFFSET_PX + side.x * spread,
      y: playerScreen.y + dy * OFFSET_PX + side.y * spread,
      angleDeg: Math.atan2(dy, dx) * 180 / Math.PI,
    });
  }
  return out;
}

export {};
