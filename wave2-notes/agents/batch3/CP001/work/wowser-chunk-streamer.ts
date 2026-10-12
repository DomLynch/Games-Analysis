// Licence: MIT (donor). Adapted shape, re-expressed here; no donor line copied.
export interface ChunkEntry {
  id: string;
  filename: string;
}

export interface AssetLoader<T> {
  load(filename: string): Promise<T>;   // per-user clone in the donor (refcounted blueprint)
  release(item: T): void;               // per-user unload; the blueprint frees at zero refs
}

const LOAD_FACTOR = 1 / 40;   // share of the remaining backlog handled per slice
const MIN_PER_SLICE = 2;

export class ChunkStreamer<T> {
  private readonly refs = new Map<string, Set<number>>();
  private readonly pendingLoad = new Map<string, ChunkEntry>();
  private readonly pendingUnload = new Map<string, ChunkEntry>();
  private readonly loaded = new Map<string, T>();
  private readonly inFlight = new Set<string>();
  private scheduled = false;

  constructor(
    private readonly loader: AssetLoader<T>,
    private readonly schedule: (fn: () => void) => void,   // e.g. a 1 ms timer
    private readonly onLoaded: (id: string, item: T) => void,
    private readonly onUnloaded: (id: string, item: T) => void,
  ) {}

  addChunk(index: number, entries: ChunkEntry[]): void {
    for (const e of entries) {
      let set = this.refs.get(e.id);
      if (!set) {
        set = new Set<number>();
        this.refs.set(e.id, set);
      }
      set.add(index);
      this.pendingUnload.delete(e.id);
      if (!this.loaded.has(e.id) && !this.inFlight.has(e.id)) this.pendingLoad.set(e.id, e);
    }
    this.kick();
  }

  removeChunk(index: number, entries: ChunkEntry[]): void {
    for (const e of entries) {
      const set = this.refs.get(e.id);
      if (!set) continue;
      set.delete(index);
      if (set.size > 0) continue;   // still wanted by another chunk
      this.refs.delete(e.id);
      this.pendingLoad.delete(e.id);
      if (this.loaded.has(e.id)) this.pendingUnload.set(e.id, e);
    }
    this.kick();
  }

  // Only arms a timer while there is work: no idle polling.
  private kick(): void {
    if (this.scheduled) return;
    if (this.pendingLoad.size === 0 && this.pendingUnload.size === 0) return;
    this.scheduled = true;
    this.schedule(() => {
      this.scheduled = false;
      this.drainUnloads();
      this.drainLoads();
      this.kick();
    });
  }

  private drainLoads(): void {
    let count = 0;
    for (const [id, e] of this.pendingLoad) {
      this.pendingLoad.delete(id);
      if (this.loaded.has(id) || this.inFlight.has(id)) continue;   // no duplicate loads
      this.inFlight.add(id);
      this.loader.load(e.filename).then(
        (item) => {
          this.inFlight.delete(id);
          // Removed while loading: give the item back at once instead of keeping it.
          if (!this.refs.has(id)) {
            this.loader.release(item);
            return;
          }
          this.loaded.set(id, item);
          this.onLoaded(id, item);
        },
        () => {
          this.inFlight.delete(id);   // a failure is not cached; a later addChunk retries
        },
      );
      count += 1;
      if (count >= MIN_PER_SLICE && count > this.pendingLoad.size * LOAD_FACTOR) return;
    }
  }

  private drainUnloads(): void {
    let count = 0;
    for (const [id] of this.pendingUnload) {
      this.pendingUnload.delete(id);
      const item = this.loaded.get(id);
      if (item === undefined) continue;
      this.loaded.delete(id);
      this.onUnloaded(id, item);
      this.loader.release(item);
      count += 1;
      if (count >= MIN_PER_SLICE && count > this.pendingUnload.size * LOAD_FACTOR) return;
    }
  }
}
