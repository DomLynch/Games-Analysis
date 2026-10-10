// Licence: BSD-2-Clause (donor ClassicUO). Clean-room sketch of the described mechanism, not a line-by-line translation.
// Client-only HUD layer. It reads server state each frame and never changes it.

export type BarTone = "poison" | "yellow" | "normal";

// Priority, not last-edge: poison beats yellow beats normal, every frame.
export function barTone(s: { poisoned: boolean; yellowHits: boolean }): BarTone {
  if (s.poisoned) return "poison";
  if (s.yellowHits) return "yellow";
  return "normal";
}

// Percent bar width. Clamp the percent to 0..100, then scale to the bar width in px.
export function barPixels(max: number, current: number, widthPx: number): number {
  if (max <= 0) return 0;
  let pct = Math.floor((current * 100) / max);
  if (pct > 100) pct = 100;
  if (pct < 0) pct = 0;
  return Math.floor((widthPx * pct) / 100);
}

// Frame update: only touch the view when a value changed (donor caches the last value).
export class BarView {
  private width = -1;
  private tone: BarTone | "" = "";
  setWidth(px: number): boolean {
    if (px === this.width) return false;
    this.width = px;
    return true;
  }
  setTone(t: BarTone): boolean {
    if (t === this.tone) return false;
    this.tone = t;
    return true;
  }
}

// Demo: poisoned first, then a yellow-hits flag arrives while still poisoned, then yellow ends.
const view = new BarView();
const seq = [
  { poisoned: true, yellowHits: false },
  { poisoned: true, yellowHits: true },
  { poisoned: true, yellowHits: false },
];
for (const s of seq) {
  const changed = view.setTone(barTone(s));
  console.log(barTone(s), changed);
}
console.log(barPixels(200, 150, 100), barPixels(200, 1, 100), barPixels(0, 0, 100));
export {};
