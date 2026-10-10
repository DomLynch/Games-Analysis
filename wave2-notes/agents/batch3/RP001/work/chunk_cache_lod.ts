export {};

// clean-room sketch: static tiles are cached per chunk, only dirty chunks in view are re-cached,
// and a zoom-based level-of-detail fades two detail levels on a clamped linear ramp.
const CHUNK = 30;                 // tiles per chunk side
const SPRITES_PER_TILE = 6;
const REQUIRED = CHUNK * CHUNK * SPRITES_PER_TILE;   // sprites a chunk may need
const SLOT_SPRITES = 16382 - (16382 % REQUIRED);     // whole chunks per slot only

type Key = number;
const pack = (cx: number, cy: number): Key => cx * 65536 + cy;
const unpack = (k: Key): [number, number] => [Math.floor(k / 65536), k % 65536];

interface Chunk { dirty: boolean; team: number; slot: number; cacheId: number }

class StaticChunkCache {
  private chunks = new Map<Key, Chunk>();
  private slotsUsed: number[] = [];
  private nextCacheId = 0;
  private dirtyInView = new Set<Key>();
  private inView = new Set<Key>();
  private lastView = "";
  private lastTeam = -1;

  constructor(private readonly recache: (cacheId: number, cx: number, cy: number) => void) {}

  markTileDirty(tx: number, ty: number): void {
    const k = pack(Math.floor(tx / CHUNK), Math.floor(ty / CHUNK));
    const c = this.chunks.get(k);
    if (c === undefined) return;   // never cached: nothing to refresh
    c.dirty = true;
    if (this.inView.has(k)) this.dirtyInView.add(k);   // only in-view chunks are refreshed now
  }

  private cacheChunk(k: Key, team: number): void {
    let c = this.chunks.get(k);
    if (c === undefined) {
      let slot = this.slotsUsed.length - 1;
      if (slot < 0 || this.slotsUsed[slot] + REQUIRED > SLOT_SPRITES) {
        this.slotsUsed.push(0);
        slot = this.slotsUsed.length - 1;
      }
      this.slotsUsed[slot] += REQUIRED;
      c = { dirty: false, team, slot, cacheId: this.nextCacheId++ };
      this.chunks.set(k, c);
    }
    const [cx, cy] = unpack(k);
    this.recache(c.cacheId, cx, cy);
    c.dirty = false;
    c.team = team;
  }

  // Per frame: skip all work when the view and team are unchanged; otherwise refresh visible chunks.
  prepare(viewKey: string, team: number, visibleChunks: Key[]): void {
    if (viewKey === this.lastView && team === this.lastTeam) return;
    this.lastView = viewKey;
    this.lastTeam = team;
    this.inView = new Set(visibleChunks);
    this.dirtyInView.clear();
    for (const k of visibleChunks) {
      const c = this.chunks.get(k);
      if (c === undefined || c.team !== team || c.dirty) this.cacheChunk(k, team);
    }
  }

  // Before drawing: refresh dirty chunks that are in view.
  flushDirty(): void {
    for (const k of this.dirtyInView) {
      const c = this.chunks.get(k);
      if (c !== undefined && c.dirty) this.cacheChunk(k, this.lastTeam);
    }
    this.dirtyInView.clear();
  }

  slotCount(): number { return this.slotsUsed.length; }
}

// zoom level of detail: pixels per world unit, two thresholds, linear fade over `fade`
function lodAlpha(pixelsPerUnit: number, threshold: number, fade: number): number {
  const a = (pixelsPerUnit - threshold) / fade;
  return Math.min(1, Math.max(0, a));
}
function levelOn(alpha: number): boolean { return alpha >= 1 / 255; }
