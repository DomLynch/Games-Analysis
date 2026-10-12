# opentibiabr-otclient (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/opentibiabr-otclient/modules/game_stash/game_stash.lua (+ src/client/game.cpp, modules/game_quickloot/quickloot.lua) | Licence: MIT (LICENSE line 1, read: "OTClient is made available under the MIT License") | Lua (UI) and C++ (protocol client) | symbol recomputeViewport / loadNextBatch
Checked: opened game_stash.lua in the sections for constants (1-20), pooled tiles (315-349), render and reset (351-390), batch loader and scroll (396-417), search debounce (423-429), withdraw modal (441-486), viewport geometry and window creation (491-568), stash open and data render (574-613, only the call sites). Not read: applyFilters, sortFilteredList, getItemMeta, the tile mouse handlers (234-314), onSupplyStashEnter body, onSupplyStashClose. Opened game.cpp at the hinted file: move (809-819), moveToParentContainer, use, stashWithdraw and stashStowItem (2106-2121), sendQuickLoot (2147-2157). These are thin protocol wrappers; the server makes the rules (not in this donor). Opened quickloot.lua 1-330 and 336-479 (the category bag table, fallback flag, accept and skip lists, and onChooseItem); the server's routing order is not in the donor, so quick loot is noted only as a second idea. Camera: not applicable (UI). Confidence: high on the batch and pool mechanism (read end to end); medium on the viewport arithmetic (derived by hand from the lines; not run). The hint file (game.cpp) is the wrong place for the mechanism: it only sends requests. Parity hint 18 does not match a list renderer; this note uses row 14 (HUD).

## 1. Mechanism
The stash (the supply bank) is a list that the server fills and the client shows. The client never decides what is in it; it only renders, filters, sorts and sends requests.

Rendering (game_stash.lua:358-390 renderItems, 351-356 refreshRenderedItems). renderItems returns early if the game is offline or the window is missing. It re-runs the filter only when the reason is "data" or a filter input changed, re-runs the sort only when the filter changed or the sort choice changed, saves the new input state, then calls refreshRenderedItems. That function releases every mounted tile back to the pool (resetItems, 325-334), sets loadedCount to 0, and loads the first batch.

Batch loading (396-407). loadNextBatch appends entries from loadedCount+1 up to min(total, loadedCount + BATCH_SIZE). Nothing is appended beyond that. Tiles come from a pool (itemBoxPool:get at 337; new pooled widgets are created at 315-323 and parked in a hidden bin created in ensureWindow at 539-542).

Scroll trigger (409-417). The scroll handler stops if every entry is already loaded. Otherwise it loads the next batch when the scroll offset reaches the scroll maximum minus SCROLL_THRESHOLD. So the next batch is requested about three rows before the bottom, not at the bottom.

Viewport numbers (491-496, recomputeViewport). cols = max(1, floor(panelWidth / CELL_SIZE)); rows = max(1, floor(panelHeight / CELL_SIZE)); BATCH_SIZE = cols x (rows + 1), one viewport plus one row of overscan; SCROLL_THRESHOLD = CELL_SIZE x 3. CELL_SIZE is 36 (line 8). recomputeViewport runs once, at the end of ensureWindow (line 566), and runs before the first data render (line 613).

Search (423-429). Each text change cancels the pending debounce and schedules renderItems after 150 ms.

Amount picker (441-486). Opening a withdraw from the stash shows a modal slider from 1 to the stack amount, starting at the full amount. Up and Down move by 10, Left and Right by 1, PageUp jumps to the maximum and PageDown to the minimum (lines 455-466). OK or Enter sends stashWithdraw(itemId, value, 1) (line 474); Cancel or Escape closes.

Requests (game.cpp). Game::move turns a count of zero or less into 1 and sends the move to the server (809-818). stashWithdraw sends the item, count and stack position (2106-2112). The server decides whether the move happens.

Quick loot (quickloot.lua, a second idea, not the cell's main mechanism). The panel lists 24 loot categories (Unassigned, Gold, Armors, Amulets, ... Weapons: Wands; line 252 onward). Each category row has a loot bag and an obtainer bag; a fallback checkbox asks the server to fall back to the main container (333). Items can be put on an accept list or a skip list (filter handlers 83-161), saved per character in a settings file (load and save 163-221). The routing order is server-side and not in this donor.

## 2. Key functions
- renderItems, game_stash.lua:358-390: filter and sort only when inputs changed; then refreshRenderedItems.
- refreshRenderedItems, 351-356: release all tiles, reset loaded count, load the first batch.
- resetItems, 325-334: release every mounted tile to the pool.
- createItemBox, 336-349: take a tile from the pool and fill it (id, amount, name, rarity, tooltip).
- loadNextBatch, 396-407: append the next BATCH_SIZE entries.
- onItemsPanelScroll, 409-417: load the next batch within SCROLL_THRESHOLD of the bottom.
- onSearchChange, 423-429: 150 ms debounce.
- prepareWithdraw, 441-486: amount slider, keyboard steps, withdraw request.
- recomputeViewport, 491-496: cols, rows, BATCH_SIZE, SCROLL_THRESHOLD.
- ensureWindow, 521-568: creates the window and the pool; calls recomputeViewport at 566.
- Game::move, game.cpp:809-819; Game::stashWithdraw, game.cpp:2106-2112.

## 3. Numbers vs mechanism
- CELL_SIZE = 36 px (game_stash.lua:8, with a comment saying it matches the otui grid).
- Batch = cols x (rows + 1). Worked example, derived by hand and not run: a 375 px wide panel gives cols = floor(375 / 36) = 10; a 600 px tall panel gives rows = 16; so BATCH_SIZE = 10 x 17 = 170 entries and SCROLL_THRESHOLD = 108 px (three rows).
- Search debounce: 150 ms.
- Amount slider: min 1, max = stack amount, steps 1 (arrows), 10 (Up and Down), jump to the ends (PageUp and PageDown).
- Opening a stash entry does not load any entries beyond the first batch; the rest load on scroll.

## 4. TypeScript sketch
simplified: clean-room shape only. Omitted: the Lua widgets and the otui layout, the tooltip text, rarity colour, the mouse handlers, the seller and stash combos, the sort comparators and filter predicates (not read), the server event handlers, and the modal focus handling. Reordered: nothing; the donor's order (filter, sort, release, first batch) is kept. Changed: the batch size is recomputed by the caller on a resize (the fix below), and the withdraw step is a pure function that clamps to the stack amount (the donor relies on the slider's own limits). The sketch's Pool class takes a make and a reset function, as the donor does.

```ts
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
```

Typecheck: scp to the VPS and `npx -p typescript tsc --noEmit --strict --target es2020` passed (exit 0). A runtime check with Node was not run: Node's strip-only mode rejects the constructor parameter properties in Pool, so the functions were not executed. The arithmetic in section 3 is derived by hand from the same formulas.

## 5. Lands in
Target: src/fight/bag-list-view.ts (proposed; client view only, used by the bag and the bank on the phone and never by the server). Parity row 14 (HUD). The hint's row 18 does not describe a list renderer; loot ownership stays on the server ledger and is not cited here.

## 6. Gaps and risks
- Defect 1: the viewport is computed once, when the window is created (recomputeViewport at line 566), and never on resize or rotation. A phone that rotates keeps a batch sized for the old panel. Fix: recompute viewportSizes on the panel's resize event (sketch: caller passes new sizes).
- Defect 2: CELL_SIZE = 36 is a hard-coded duplicate of the grid size in the otui file (line 8 comment). Fix: read the cell size from the same layout value that draws the grid, so the two cannot drift.
- Defect 3: a zero batch would load nothing. BATCH_SIZE starts at 0 (line 9); the normal flow avoids this because ensureWindow runs first. Fix: clamp the batch to at least 1 in the sketch's viewportSizes (cols and rows already floor at 1).
- Defect 4: the comment at line 9 gives example numbers ("~20 cols x 12 rows") that the code no longer uses. Documentation drift only.
- Server-verified: the withdraw slider clamps on the client only. The server must refuse a withdraw above the stored amount; the donor's server side is not in this donor. The move and stash requests are requests, which matches the one-ledger ruling.
- One ledger and stale state: the list is rebuilt only on a data render or an input change. The server event handler (onSupplyStashEnter, 574-619) was not read, so how often the stash data is refreshed is not checked. The list must always be a view of the ledger, never a cached copy that can drift.
- Client-only: the list, the pool, the debounce and the slider are client presentation; the Pit and zones can both use them. Nothing here touches the fight loop.
- Phone: this is the readability half of the topic. The donor uses a 36 px cell grid; Frankendom's 375 px rule needs the cell size to come from the layout (defect 2).
- Quick loot (second idea, not adopted here): a category table with a loot bag and an obtainer bag per category, a fallback flag, and accept and skip lists per character. The routing itself is server-side and not in this donor, so its order of operations is unknown.

Reuse tag: adapt-shape (MIT: code may be adapted; the sketch is clean-room shape only)
Brief rule served: STRONG needs real code opened, numbers explained and a self-contained mechanism; met (batch, pool, scroll and slider read end to end), with the hint file (game.cpp) read and found to be wrappers only.

Best transferable idea: Render a long bag or bank grid one viewport plus one row at a time from a pool of tiles, load the next batch when the scroll is three rows from the bottom, and rebuild from the first batch whenever a filter or sort changes.
Decision (proposed): adapt — take the batch, pool and scroll threshold for the phone bag and bank; recompute the batch on resize and derive the cell size from the layout; never let the client clamp a withdraw on its own.
Acceptance: On a 375 px wide phone, the bag shows its first screen of entries at once, scrolling loads the next batch three rows before the bottom, rotating the phone recomputes the batch size, and a server test refuses a withdraw above the stored amount.
