// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Pt { x: number; y: number }
export interface Fog { w: number; h: number; dark: number[][]; fog: number[][] }

// Step 1: stamp the view mask (square of side 2r+1, read x-major then y) around the player.
// 'dark' is monotone: bits are only cleared, so a revealed tile stays revealed. 'fog' holds the current view.
export function stampView(f: Fog, c: Pt, r: number, mask: number[]): boolean {
  let changed = false;
  let k = 0;
  for (let x = c.x - r; x <= c.x + r; x++) {
    for (let y = c.y - r; y <= c.y + r; y++) {
      const m = mask[k++];
      if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
      const prev = f.dark[x][y];
      f.dark[x][y] &= m;
      f.fog[x][y] = m;
      if (f.dark[x][y] !== prev) changed = true;
    }
  }
  return changed;
}

// Step 2: a tile is drawn on the minimap only when fully revealed (dark layer is 0).
export function minimapShowsTile(f: Fog, x: number, y: number): boolean {
  return f.dark[x][y] === 0;
}

// Step 3: blips. A hostile is shown only when engaged and inside the radius; idle hostiles are not drawn.
export interface Mob { pos: Pt; hp: number; ally: boolean; engaged: boolean; corpseCollision: boolean }
export type Blip = "ally" | "enemy" | "corpse";

// Donor factor 0.7071 (MenuMiniMap.cpp:141) times the larger minimap side.
export function minimapRadius(w: number, h: number): number {
  return Math.max(w, h) * 0.7071;
}

// Euclidean distance, as Utils::calcDist (Utils.cpp:330).
function dist(a: Pt, b: Pt): number {
  return Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
}

export function mobBlip(m: Mob, hero: Pt, fogOn: boolean, maskRadius: number, radius: number): Blip | null {
  const d = dist(hero, m.pos);
  if (m.hp > 0) {
    if (fogOn && d > maskRadius) return null;
    if (d > radius) return null;
    if (m.ally) return "ally";
    if (m.engaged) return "enemy";
    return null;
  }
  if (m.corpseCollision && d <= radius) return "corpse";
  return null;
}

// Step 4: the ortho window is centred on the player at zoom z; the window is w x h pixels.
export function windowOrigin(hero: Pt, z: number, w: number, h: number): Pt {
  return { x: z * hero.x - Math.floor(w / 2), y: z * hero.y - Math.floor(h / 2) };
}

export {};
