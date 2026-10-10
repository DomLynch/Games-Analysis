// Normalised-region HUD registry. Each element stores a 0..1 rectangle of the canvas.
interface Rect01 { x0: number; y0: number; x1: number; y1: number; }
interface PixelRect { x: number; y: number; w: number; h: number; }
interface HudWidget { onOpened(): void; onClosed(): void; draw(r: PixelRect): void; }

export class HudLayer {
  // Map keeps insertion order, which is the draw order (later = on top).
  private elements = new Map<string, { widget: HudWidget; region: Rect01 }>();
  visible = true;

  add(id: string, widget: HudWidget, region: Rect01): void {
    const old = this.elements.get(id);
    if (old) old.widget.onClosed();   // fix: the donor overwrites without closing the replaced widget
    widget.onOpened();
    // Setting an existing key keeps its original draw position, as the donor's LinkedHashMap does.
    this.elements.set(id, { widget, region });
  }

  remove(id: string): boolean {
    const e = this.elements.get(id);
    if (!e) return false;
    e.widget.onClosed();
    this.elements.delete(id);
    return true;
  }

  // Region x canvas size, floored, then drawn in insertion order with no culling.
  draw(canvasW: number, canvasH: number): void {
    if (!this.visible) return;
    for (const { widget, region } of this.elements.values()) {
      const x = Math.floor(region.x0 * canvasW);
      const y = Math.floor(region.y0 * canvasH);
      const w = Math.floor((region.x1 - region.x0) * canvasW);
      const h = Math.floor((region.y1 - region.y0) * canvasH);
      widget.draw({ x, y, w, h });
    }
  }
}

// Charge crosshair: stage = floor(min(1, charge) * (stages - 1)); nothing is drawn at zero charge.
export function chargeStage(charge: number, stageCount: number): number | null {
  const c = Math.min(1, charge);
  if (!(c > 0) || stageCount === 0) return null;
  return Math.floor(c * (stageCount - 1));
}

export {};
