// Licence: MIT (donor, Nakazawa Tech KK 2024). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Anim { frames: number; ticks: number; offset: number; }
interface TileSprite { animation?: Anim | null; }
interface Ctx {
  clearRect(x: number, y: number, w: number, h: number): void;
  drawCell(cell: number, x: number, y: number): void;
}
interface Cell { sprite: TileSprite; baseCell: number; x: number; y: number; }

const ANIMATION_MS = 180;   // one shared clock for every animated tile (donor AnimationSpeed = 180)

// Tick number from wall-clock time; every listener gets the same number in the same interval.
function tickAt(nowMs: number): number {
  return Math.floor(nowMs / ANIMATION_MS + 1);
}

// Cell offset for an animation at a tick (donor getFrame formula); null when the sprite does not animate.
function frameOffset(anim: Anim | null | undefined, tick: number): number | null {
  if (!anim) return null;
  return (Math.floor(tick / anim.ticks) % anim.frames) * anim.offset;
}

// Cells that animate are picked once per map change, not re-scanned every tick.
function collectAnimated(cells: Cell[]): Cell[] {
  return cells.filter((c) => c.sprite.animation != null);
}

// Redraw only the animated cells on a retained canvas; static cells keep the pixels already drawn.
function redrawAnimated(ctx: Ctx, animated: Cell[], tick: number, tileSize: number): void {
  for (const c of animated) {
    const px = c.x * tileSize;
    const py = c.y * tileSize;
    ctx.clearRect(px, py, tileSize, tileSize); // the donor does not clear here; it relies on a base redraw and sprite opacity (not verified for every sprite)
    ctx.drawCell(c.baseCell + (frameOffset(c.sprite.animation, tick) ?? 0), px, py);
  }
}

export {};
