# PixelGuys-Cubyz (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/gui.zig | Licence: GPL-3 | Zig | symbol hudWindows / executeOpenWindowCommand

## 1. Mechanism

- Window manager for the game GUI. Each window has a string id and a flag `isHud`. Windows are registered once; a duplicate id is rejected with an error log.
- Open, modal-open and close requests made through `openWindow`, `openModalWindow` and the close helpers are not applied at once (`toggleWindow`, 359-378, is applied immediately and bypasses the queue). They are pushed onto a command queue (`GuiCommandQueue`) and applied at the start of `updateAndRenderGui` (line 580), once per frame. The queue is a `ConcurrentQueue` created with capacity 16 (line 58). Each open/close also calls `updateWindowPositions` (not read).
- `openWindows` is the stack in draw order: the last window is on top. Opening a window already in the stack moves it to the top (focus); a new one is appended and its open callback fires. Closing removes it and fires its close callback.
- A modal window, if one is set (`openModal` sets it, and clears the focused text input if the window was not already open), is the only window tested for hover (lines 591-593); the render pass also draws a dim rectangle before it (624-628). The hover pass is skipped while the mouse is grabbed (line 581).
- Hit testing runs in reverse draw order (top first). The first window whose rectangle contains the pointer and that reports the hover as handled stops the search; `hoveredAWindow` is read at lines 821 and 834, in the inventory release code, to decide whether releasing the carried stack drops it into the world; no other reader was found by grep in `src/`.
- `openHud` (380-388) calls `inventory.init()`, queues an open for every window marked `isHud`, then clears the reorder flag. Because the opens are queued they take effect on the next frame's command pass.
- Input: the window id strings, the mouse position divided by the GUI scale, and the open-window stack. Output: stack order, callbacks, hover state for the frame.

## 2. Key functions

- `GuiCommandQueue` (commands and `executeCommands`), `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/gui.zig`, lines 44-123. Deferred open, modal open and close; the focus move on re-open.
- `addWindow`, same file, lines 315-326 (unchanged). Duplicate-id check and HUD list registration.
- `openWindow` and `openModalWindow`, same file, lines 328-357. Lookup by id (error log if missing), then the scheduled command. `toggleWindow` at 359-378 is the immediate path.
- `openHud`, same file, lines 380-388. Opens all HUD windows and clears reorder.
- `updateAndRenderGui`, same file, lines 577-636 (hover test at 586-600; the rest updates and renders the windows and the modal dim). Runs the command queue, then the top-down hover search.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Deferred command queue applied at one point per frame | Queue capacity 16 at init (line 58) (theirs) |
| Ordered stack: re-open moves to top, close removes | Hover search from the top down (generic) |
| Modal blocks all other hit tests | `hideGui` and `reorderWindows` flags (lines 37-38) (theirs) |
| Register by id, reject duplicates, separate HUD list | HUD flag name `isHud` (theirs) |

## 4. TypeScript sketch

simplified: the donor's re-open also clears the selected window and calls `updateWindowPositions`, a modal open clears the focused text input, the hit test also requires `updateHovered` to return handled (the sketch returns the first rectangle hit), the hover pass is skipped while the mouse is grabbed, and `toggleWindow` bypasses the queue; the queue is a concurrent queue in the donor.

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Clean-room: a window stack with deferred open and close, focus-on-reopen, a modal gate and top-down hit testing.
type Win = { id: string; isHud: boolean; x: number; y: number; w: number; h: number; onOpen?: () => void; onClose?: () => void };
type Cmd = { kind: 'open' | 'modal' | 'close'; win: Win };
const queue: Cmd[] = [];
const stack: Win[] = []; // last element is on top
let modal: Win | null = null;
// Requests are queued, never applied at once.
function request(kind: Cmd['kind'], win: Win): void { queue.push({ kind, win }); }
// Applied once per frame, before hit testing.
function applyQueue(): void {
  for (const c of queue.splice(0)) {
    const i = stack.indexOf(c.win);
    if (c.kind === 'close') {
      if (modal === c.win) modal = null;
      if (i >= 0) { stack.splice(i, 1); c.win.onClose?.(); }
      continue;
    }
    if (c.kind === 'modal') modal = c.win;
    if (i >= 0) { stack.splice(i, 1); stack.push(c.win); continue; } // focus on re-open
    stack.push(c.win);
    c.win.onOpen?.();
  }
}
// Top-down hit test; while a modal window is set, only it can be hit.
function hitTest(px: number, py: number): Win | null {
  for (let i = stack.length - 1; i >= 0; i--) {
    const w = stack[i];
    if (modal && w !== modal) continue;
    if (px >= w.x && py >= w.y && px < w.x + w.w && py < w.y + w.h) return w;
  }
  return null;
}
// Opening every HUD window in one call.
function openHud(all: Win[]): void {
  for (const w of all) if (w.isHud) request('open', w);
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` (window stack and HUD panels), parity checklist row 14 (HUD); today: `src/hud.ts` (moving). The modal gate and the deferred queue are HUD-only; they carry no fight state. The "a window is hovered" flag feeds controls, row 5.
- Reuse tag: rewrite-from-idea (GPL-3, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor defers opens by one frame. A fight action that opens a window must not depend on the window existing in the same frame.
- In the donor the hover flag only gates the inventory drop (lines 821, 834). Frankendom's input path (row 5, `src/fight/input.ts`, today `src/input.ts` moving) needs the same flag so a click on a HUD panel does not become a fight action.
- No Pit or zone concept: the stack is client-only and holds no server state.
- The duplicate-id check logs (line 318) and returns; a Frankendom HUD should fail loudly in tests.
- Nothing here conflicts with one engine, zones as data or server-verified kills.
