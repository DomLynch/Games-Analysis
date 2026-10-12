// Licence: MIT (donor LICENSE). Adapted: rewritten from the described shape; no donor lines are copied.
// clean-room
export type Rect = { x: number; y: number; w: number; h: number };
export interface PoolState { key: string; hash: number; }   // key: texture page, opacity, clip (identity); hash: its number form
export interface Quad { dest: Rect; src: Rect; }
export interface Batch { state: PoolState; quads: Quad[]; }

export const SHADER_DELAY_MS = 1000 / 20; // 50 ms: an animated shader refreshes at up to 20 Hz

// 32-bit combine in the spirit of a boost-style hash_union.
function mix(seed: number, v: number): number {
  const s = seed >>> 0;
  return (s ^ ((v >>> 0) + 0x9e3779b9 + ((s << 6) >>> 0) + (s >>> 2))) >>> 0;
}

function rectHash(r: Rect): number {
  let h = 0;
  for (const n of [r.x, r.y, r.w, r.h]) h = mix(h, Math.round(n * 16));
  return h;
}

export class DrawRecorder {
  private recording: Batch[] = [];
  private byState = new Map<string, Batch>();   // grouped mode: one batch per state for the whole recording
  private lastBatch: Batch | null = null;       // consecutive mode: extend the batch only from the previous draw
  private curHash = 0;
  private lastHash = 0;
  private lastQuadHash = -1;
  private lastRecordedAt = Number.NEGATIVE_INFINITY;
  private shaderDelayMs = 0;
  ready: Batch[] = [];                          // the last recording, read by the rasteriser

  constructor(
    private readonly grouped: boolean,          // overlays (names, bars): group by state, order not kept
    private readonly cached: boolean,           // a cached raster target exists: skip repeats, re-raster on change or timer
    private readonly refreshDelayMs: number,    // 0 = no timer
  ) {}

  // Called while recording a frame: an animated shader asks for a shorter refresh.
  setAnimatedShader(on: boolean): void {
    this.shaderDelayMs = on ? SHADER_DELAY_MS : 0;
  }

  // Shorter non-zero of the pool and shader delays, and enough time since the last recording.
  canRefresh(now: number): boolean {
    let delay = this.refreshDelayMs;
    if (this.shaderDelayMs > 0 && (delay === 0 || this.shaderDelayMs < delay)) delay = this.shaderDelayMs;
    return delay > 0 && now - this.lastRecordedAt >= delay;
  }

  // Asked before recording a frame. Note: reads the shader delay set during the previous frame (see section 6).
  canRepaint(now: number): boolean {
    return this.canRefresh(now);
  }

  // Start of a frame: the previous content hash becomes the comparison value; the recording is emptied.
  beginFrame(): void {
    this.lastHash = this.curHash;
    this.curHash = 0;
    this.lastQuadHash = -1;
    this.shaderDelayMs = 0;
    this.recording = [];
    this.byState.clear();
    this.lastBatch = null;
  }

  add(state: PoolState, q: Quad): void {
    const h = mix(mix(state.hash, rectHash(q.dest)), rectHash(q.src));
    this.curHash = mix(this.curHash, h);
    if (this.cached) {
      if (h === this.lastQuadHash) return;     // same draw as the previous one: skip
      this.lastQuadHash = h;
    }

    let batch: Batch | undefined;
    if (this.lastBatch !== null && this.lastBatch.state.key === state.key) batch = this.lastBatch;
    else if (this.grouped) batch = this.byState.get(state.key);

    if (batch === undefined) {
      batch = { state, quads: [] };
      this.recording.push(batch);
      if (this.grouped) this.byState.set(state.key, batch);
    }
    batch.quads.push(q);
    this.lastBatch = batch;
  }

  // End of a frame. Returns true when `ready` must be re-rasterised into the cache.
  // A cached target keeps its picture when the content did not change and the refresh is not due.
  release(now: number): boolean {
    const changed = this.curHash !== this.lastHash;
    if (this.cached && !changed && !this.canRefresh(now)) {
      this.recording = [];
      return false;
    }
    this.lastRecordedAt = now;
    this.ready = this.recording;
    return true;
  }
}
export {};
