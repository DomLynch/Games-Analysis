// Licence of donor: GPL-2.0 (FreeOrion source). Clean-room sketch of the mechanism shape, not a translation.
type Pt = { x: number; y: number };
type Rgba = { r: number; g: number; b: number; a: number };
interface Ring { cx: number; cy: number; r: number }           // map units
interface RingGroup { fill: Rgba; line: Rgba; rings: Ring[] }  // one group per colour
interface Run { start: number; count: number }
interface RingBatch {
  fillPts: Pt[]; fillCols: Rgba[]; fillRuns: Run[];
  linePts: Pt[]; lineCols: Rgba[]; lineRuns: Run[];
}

const MIN_R = 5;      // donor filter, map units
const MAX_R = 2048;   // donor filter, map units

const unitCache = new Map<number, Pt[]>();
function unitCircle(n: number): Pt[] {
  let u = unitCache.get(n);
  if (u === undefined) {
    u = [];
    for (let i = 0; i <= n; i++) {
      const a = (2 * Math.PI * i) / n;
      u.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    unitCache.set(n, u);
  }
  return u;
}

// Fix: segment count follows the on-screen size instead of a fixed 36 / 72.
// Proposed cap 96 is not a donor constant (donor auto formula caps at 30, CUIDrawUtil.cpp 81).
function segmentsFor(diameterPx: number): number {
  return Math.min(96, Math.max(12, 3 + Math.floor(diameterPx / 4)));
}

// Rebuild when the rings change (turn or zone change, zoom change), never per frame.
export function buildRingBatch(groups: RingGroup[], pxPerUnit: number): RingBatch {
  const b: RingBatch = { fillPts: [], fillCols: [], fillRuns: [], linePts: [], lineCols: [], lineRuns: [] };
  for (const g of groups) {
    const fillStart = b.fillPts.length;
    const lineStart = b.linePts.length;
    for (const ring of g.rings) {
      if (ring.r < MIN_R || ring.r > MAX_R) continue;
      const n = segmentsFor(2 * ring.r * pxPerUnit);
      const u = unitCircle(n);
      for (let i = 0; i < n; i++) {
        b.fillPts.push(
          { x: ring.cx, y: ring.cy },
          { x: ring.cx + ring.r * u[i].x, y: ring.cy + ring.r * u[i].y },
          { x: ring.cx + ring.r * u[i + 1].x, y: ring.cy + ring.r * u[i + 1].y },
        );
        b.fillCols.push(g.fill, g.fill, g.fill);
      }
      for (let i = 0; i < n; i++) {
        b.linePts.push(
          { x: ring.cx + ring.r * u[i].x, y: ring.cy + ring.r * u[i].y },
          { x: ring.cx + ring.r * u[i + 1].x, y: ring.cy + ring.r * u[i + 1].y },
        );
        b.lineCols.push(g.line, g.line);
      }
    }
    // one run per colour group; empty groups add no run (donor always adds one)
    if (b.fillPts.length > fillStart) b.fillRuns.push({ start: fillStart, count: b.fillPts.length - fillStart });
    if (b.linePts.length > lineStart) b.lineRuns.push({ start: lineStart, count: b.linePts.length - lineStart });
  }
  return b;
}

// Draw-call budget: two calls per colour group, however many rings it holds.
export function drawCallCount(b: RingBatch): number {
  return b.fillRuns.length + b.lineRuns.length;
}

// Frame pacing: ms to wait before the next frame. lastFrameEndMs is the end of the previous governed frame.
// Fix: the interval is 1000 / capFps (donor uses 1 / (max + 1), one frame too loose).
export function frameWaitMs(nowMs: number, lastFrameEndMs: number, capFps: number): number {
  if (capFps <= 0) return 0; // 0 = no cap
  const minFrameMs = 1000 / capFps;
  return Math.max(0, minFrameMs - (nowMs - lastFrameEndMs));
}

export interface CapOptions {
  focusedCapOn: boolean; focusedFps: number;
  unfocusedCapOn: boolean; unfocusedFps: number;
}

// Cap chosen by window focus: focused cap, or a low background cap, or none.
export function capFor(focused: boolean, o: CapOptions): number {
  if (focused) return o.focusedCapOn ? o.focusedFps : 0;
  return o.unfocusedCapOn ? o.unfocusedFps : 0;
}

export {};
