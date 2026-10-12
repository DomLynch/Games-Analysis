// Clean-room shape of a batched, pooled list for a long bag or bank grid on a phone (MIT donor; shape only).
interface Entry { id: number; name: string; amount: number }

interface ListState {
  filtered: Entry[];   // already filtered and sorted by the caller
  loaded: number;      // how many entries have tiles mounted
  batch: number;       // entries per batch
  threshold: number;   // px before the bottom that triggers the next batch
}

// Tile pool: reuse tile objects instead of creating and destroying them on every filter change.
class Pool<T> {
  private free: T[] = [];
  constructor(private make: () => T, private reset: (t: T) => void) {}
  get(): T { return this.free.pop() ?? this.make(); }
  release(t: T): void { this.reset(t); this.free.push(t); }
}

// Batch size: one full viewport of cells plus one row of overscan. Threshold: three cells.
// Recomputed when the panel size changes (the donor computes it once, when the window is created).
export function viewportSizes(panelW: number, panelH: number, cell = 36): { batch: number; threshold: number } {
  const cols = Math.max(1, Math.floor(panelW / cell));
  const rows = Math.max(1, Math.floor(panelH / cell));
  return { batch: cols * (rows + 1), threshold: cell * 3 };
}

// Mount the next batch: entries loaded+1 .. min(total, loaded+batch).
export function loadNextBatch(st: ListState, mount: (e: Entry) => void): void {
  const total = st.filtered.length;
  if (st.loaded >= total) return;
  const limit = Math.min(total, st.loaded + st.batch);
  for (let i = st.loaded; i < limit; i++) mount(st.filtered[i]);
  st.loaded = limit;
}

// Scroll handler: load more only when the bottom is within the threshold.
export function onScroll(st: ListState, scrollTop: number, maxScroll: number, mount: (e: Entry) => void): void {
  if (st.loaded >= st.filtered.length) return;
  if (scrollTop >= maxScroll - st.threshold) loadNextBatch(st, mount);
}

// Re-render after a filter, sort or search change: release every tile, then load the first batch again.
export function renderList(st: ListState, pool: Pool<{ entry: Entry | null }>, mounted: { entry: Entry | null }[],
                           next: Entry[], mount: (e: Entry) => void): void {
  for (const t of mounted) pool.release(t);
  mounted.length = 0;
  st.filtered = next;
  st.loaded = 0;
  loadNextBatch(st, (e) => { const t = pool.get(); t.entry = e; mounted.push(t); mount(e); });
}

// Withdraw amount: clamp to 1..max; arrows step 1, Up and Down step 10, PageUp and PageDown jump to the ends.
export function stepAmount(current: number, max: number, key: 'left' | 'right' | 'up' | 'down' | 'pageUp' | 'pageDown'): number {
  const clamp = (n: number) => Math.min(max, Math.max(1, n));
  switch (key) {
    case 'left': return clamp(current - 1);
    case 'right': return clamp(current + 1);
    case 'up': return clamp(current + 10);
    case 'down': return clamp(current - 10);
    case 'pageUp': return max;
    case 'pageDown': return 1;
  }
}

export {};
