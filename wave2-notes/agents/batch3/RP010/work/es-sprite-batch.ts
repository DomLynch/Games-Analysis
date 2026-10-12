// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Sprite { readonly id: number; readonly frames: number; }
export interface Screen { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number; }
export interface Item {
  readonly sprite: Sprite;
  readonly x: number; readonly y: number; // centre in zoomed camera space (the caller multiplies by zoom, as the donor does)
  readonly ux: number; readonly uy: number; // unit vector of the facing
  readonly width: number; readonly height: number; // HALF extents in logical pixels (donor Width()/Height() = 0.5 * zoom * scale * sprite size, Drawable.cpp 70-81); pass full size / 2
  readonly frame: number; readonly alpha: number;
  readonly clip: number; // 1 = full height; less cuts the bottom of the quad
}

const FLOATS = 6; // x, y, s, t, frame, alpha per vertex
type Pt = { x: number; y: number };

// One vertex array per sprite. Each sprite instance is a 6-vertex strip: two dummy vertices, four corners, two dummy vertices.
export class SpriteBatch {
  private readonly groups = new Map<Sprite, number[]>();

  constructor(private readonly screen: Screen, private readonly zoom: number) {}

  clear(): void { this.groups.clear(); }

  // Returns false when the item is off screen. The cull runs before any vertex work.
  add(it: Item): boolean {
    const z = this.zoom;
    const hx = (Math.abs(it.ux * it.height) + Math.abs(it.uy * it.width)) * z;
    const hy = (Math.abs(it.ux * it.width) + Math.abs(it.uy * it.height)) * z;
    if (it.x + hx < this.screen.left || it.y + hy < this.screen.top) return false;
    if (it.x - hx > this.screen.right || it.y - hy > this.screen.bottom) return false;

    const uxz = it.ux * z;
    const uyz = it.uy * z;
    let uw: Pt = { x: -uyz * it.width, y: uxz * it.width };
    let uh: Pt = { x: uxz * it.height, y: uyz * it.height };
    const tl: Pt = { x: it.x - (uw.x + uh.x), y: it.y - (uw.y + uh.y) };
    uw = { x: uw.x * 2, y: uw.y * 2 };
    uh = { x: uh.x * 2 * it.clip, y: uh.y * 2 * it.clip };
    const tr: Pt = { x: tl.x + uw.x, y: tl.y + uw.y };
    const bl: Pt = { x: tl.x + uh.x, y: tl.y + uh.y };
    const br: Pt = { x: bl.x + uw.x, y: bl.y + uw.y };

    let v = this.groups.get(it.sprite);
    if (!v) { v = []; this.groups.set(it.sprite, v); }
    const push = (p: Pt, s: number, t: number): void => {
      v!.push(p.x, p.y, s, t, it.frame, it.alpha);
    };
    push(tl, 0, 1); push(tl, 0, 1); // dummy pair marks the start
    push(tr, 1, 1);
    push(bl, 0, 1 - it.clip);
    push(br, 1, 1 - it.clip);
    push(br, 1, 1 - it.clip);      // dummy pair marks the end
    return true;
  }

  // One entry per sprite: the caller binds the sprite's texture and issues one strip draw of `vertexCount` vertices.
  groupsForDraw(): Array<{ sprite: Sprite; vertexCount: number; data: number[] }> {
    const out: Array<{ sprite: Sprite; vertexCount: number; data: number[] }> = [];
    for (const [sprite, data] of this.groups) out.push({ sprite, vertexCount: data.length / FLOATS, data });
    return out;
  }
}

export {};
