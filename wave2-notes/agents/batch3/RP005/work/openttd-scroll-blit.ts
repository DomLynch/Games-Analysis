// Licence: GPL-2.0-only (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Rect { left: number; top: number; width: number; height: number; }

const log: string[] = [];
const redraw = (r: Rect): void => { log.push(`redraw ${r.left},${r.top} ${r.width}x${r.height}`); };

const overlaps = (a: Rect, b: Rect): boolean =>
  a.left + a.width > b.left && b.left + b.width > a.left &&
  a.top + a.height > b.top && b.top + b.height > a.top;

// Splits r into the pieces it keeps (r minus window i). Only windows after i can still cover a piece,
// because the earlier windows did not overlap r at all.
function carve(r: Rect, fronts: Rect[], start: number, out: Rect[]): void {
  for (let i = start; i < fronts.length; i++) {
    const w = fronts[i];
    if (!overlaps(r, w)) continue;
    const right = r.left + r.width;
    const bottom = r.top + r.height;
    const wRight = w.left + w.width;
    const wBottom = w.top + w.height;
    const l = Math.max(r.left, w.left);
    const rr = Math.min(right, wRight);
    if (r.left < w.left) carve({ left: r.left, top: r.top, width: w.left - r.left, height: r.height }, fronts, i + 1, out);
    if (wRight < right) carve({ left: wRight, top: r.top, width: right - wRight, height: r.height }, fronts, i + 1, out);
    if (r.top < w.top) carve({ left: l, top: r.top, width: rr - l, height: w.top - r.top }, fronts, i + 1, out);
    if (wBottom < bottom) carve({ left: l, top: wBottom, width: rr - l, height: bottom - wBottom }, fronts, i + 1, out);
    return;
  }
  out.push(r);
}

// view: the map view rectangle. fronts: windows in front of it, back to front.
// xo, yo: how far the content moves on screen (positive = right / down).
function scrollView(view: Rect, fronts: Rect[], xo: number, yo: number): void {
  if (xo === 0 && yo === 0) return;
  const pieces: Rect[] = [];
  carve(view, fronts, 0, pieces);
  for (const p of pieces) {
    // A piece that moves by at least its own size keeps nothing: redraw it whole.
    if (Math.abs(xo) >= p.width || Math.abs(yo) >= p.height) { redraw(p); continue; }

    // Blit the kept part; the moved part is valid, the exposed strips are not.
    let { left, top, width, height } = p;
    log.push(`blit ${left},${top} ${width}x${height} by ${xo},${yo}`);

    // Exposed strips: the side strip first, full height; then the top or bottom strip across the new width.
    if (xo > 0) { redraw({ left, top, width: xo, height }); left += xo; width -= xo; }
    else if (xo < 0) { redraw({ left: left + width + xo, top, width: -xo, height }); width += xo; }

    if (yo > 0) redraw({ left, top, width, height: yo });
    else if (yo < 0) redraw({ left, top: top + height + yo, width, height: -yo });
  }
}

// Demo: a 640 x 480 map view, one window in front, pan 40 px right then 30 px up.
const view: Rect = { left: 0, top: 0, width: 640, height: 480 };
const fronts: Rect[] = [{ left: 500, top: 100, width: 120, height: 80 }];
scrollView(view, fronts, 40, 0);
scrollView(view, fronts, 0, -30);
export {};
