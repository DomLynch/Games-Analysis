// Licence: Zlib (DFHack default per LICENSE.rst; plugins/rendermax/renderer_light.cpp has no per-file header). Clean-room sketch of the strip split, max-merge and write barrier only.
// clean-room
interface Rect { x0: number; y0: number; x1: number; y1: number } // half-open, like the donor's rect2d
interface Grid { w: number; h: number; cells: number[] }          // one scalar channel, for brevity

// Split the viewport into `threads` vertical strips; the last strip takes the remainder.
function planStrips(vp: Rect, threads: number): Rect[] {
  const slice = Math.floor((vp.x1 - vp.x0) / threads);
  const out: Rect[] = [];
  for (let i = 0; i < threads; i++) {
    out.push({
      x0: vp.x0 + i * slice,
      y0: vp.y0,
      x1: i === threads - 1 ? vp.x1 : vp.x0 + (i + 1) * slice,
      y1: vp.y1,
    });
  }
  return out;
}

// Max-merge one worker's canvas into the shared grid over its strip plus a margin
// (the margin must cover how far that worker's lights can spill; the donor merges the whole canvas instead).
// Max is order-free, so merges from different workers commute.
function mergeStripMax(target: Grid, canvas: Grid, strip: Rect, margin: number): void {
  const x0 = Math.max(0, strip.x0 - margin);
  const x1 = Math.min(target.w, strip.x1 + margin);
  const y0 = Math.max(0, strip.y0 - margin);
  const y1 = Math.min(target.h, strip.y1 + margin);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * target.w + x;
      target.cells[i] = Math.max(target.cells[i], canvas.cells[i]);
    }
  }
}

// Counting barrier: the frame is ready once every worker has reported its merge.
class WriteBarrier {
  private writes = 0;
  constructor(private readonly workers: number) {}
  reset(): void { this.writes = 0; }   // donor signalDoneOcclusion sets writeCount = 0
  done(): void { this.writes++; }      // donor writeCount++ under the write lock
  ready(): boolean { return this.writes >= this.workers; }
}
