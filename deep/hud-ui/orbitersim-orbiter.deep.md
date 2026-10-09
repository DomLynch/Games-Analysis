# orbitersim-orbiter (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Pane.cpp | Licence: MIT | C++ | symbol Pane::SetPanelMode

## 1. Mechanism

- Cycles the cockpit view type: 1 = generic cockpit, 2 = 2D panel, 3 = virtual cockpit. Called from the key map (F8 by default, action `TogglePanelMode`: `Keymap.cpp` 211, handler `Orbiter.cpp` 2313) and, through `SetPanelMode`, from the camera's own mode changes (`Camera.cpp` 238-260).
- `TogglePanelMode` (a one-line loop, 177) calls `SetPanelMode(panelmode % 3 + 1)` up to three times and stops at the first call that returns true. `SetPanelMode` itself also falls back internally, so the retries are two levels deep; and it assigns `panelmode` before trying to load (line 193), so a failed load leaves `panelmode` advanced.
- `SetPanelMode(pmode, force)`: does nothing if already in that mode (unless forced). Otherwise it sets `panelmode`, unsets the vessel's camera movement (195), unregisters every multi-function display, deletes the current panel objects, and tries to build the requested mode. Mode 1 builds the default panel and asks the focus vessel for a generic cockpit; mode 2 tries a 2D panel and, if the vessel has none, the older panel type (214-234); mode 3 loads the virtual cockpit. If the mode fails to load, it falls to the next mode in the cycle and tries again, up to three times.
- After a successful build: in mode 0 no multi-function display exists; in mode 1 the first two exist; modes 2 and 3 leave the display flags as they were. Each display that exists and was active is reopened, the heads-up display is resized unless the virtual cockpit supplies its own heads-up surface, the camera mode is set to match, and every cockpit area is redrawn.
- Inputs: the requested mode, the focus vessel's ability to load each cockpit. Output: the active panel objects, the camera mode, display slots. No simulation state changes.

## 2. Key functions

- `Pane::TogglePanelMode`, `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Pane.cpp`, lines 175-178. Tries the next mode up to three times.
- `Pane::SetPanelMode`, same file, lines 187-265. Tear down, build with fallback, reopen displays, set camera, redraw.
- `Pane::RedrawCockpitAreas`, same file, lines 180-185. Redraws whichever panel object is live (2D panel, else virtual cockpit, else the older panel).
- Callers: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Camera.cpp`, lines 238-260 (the cockpit-mode switch calls `SetPanelMode(1/2/3)`; for mode 2 and 3 it also selects the panel or VC and, for VC, leans the camera), and `Orbiter.cpp` 2313 (key).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cycle a view type, try each candidate with a fallback, stop at the first that loads | Three modes in the cycle (theirs) |
| Tear down, build, then reattach dependent displays and redraw | Display count per mode: 0 in mode 0, 2 in mode 1, unchanged otherwise (theirs) |
| No-op when already in the requested mode unless forced | Three-attempt cap (theirs; the cap equals the mode count) |
| Camera mode mirrors the view mode | Camera mode table: generic, 2D panel, virtual cockpit (line 260) (theirs) |

## 4. TypeScript sketch

simplified: the sketch sets `current` only when a load succeeds (the donor assigns `panelmode` first), has no mode 0, and treats mode 2's 2D-panel-then-older-panel fallback as one load; teardown order, MFD unregister and reopen, HUD resize and the camera call are collapsed into `reattach`.

```ts
// Licence: MIT - logic adapted from Pane.cpp lines 175-265 (Martin Schweiger, MIT); path cited
// Adapted: a view-mode cycle with a fallback when a mode cannot load, then a re-attach and redraw.
type Loader = (mode: number) => boolean; // true when the mode's view loaded

const MODES = 3;
let current = 1;

// Cycle to the next mode, trying each candidate until one loads (at most MODES attempts).
function togglePanelMode(load: Loader): number {
  for (let i = 0; i < MODES; i++) {
    if (setPanelMode(current % MODES + 1, load)) return current;
  }
  return current;
}

// Set a mode; on failure fall to the next candidate. Returns true when a mode is in place.
function setPanelMode(requested: number, load: Loader, force = false): boolean {
  if (requested === current && !force) return true;
  let mode = requested;
  for (let attempt = 0; attempt < MODES; attempt++) {
    if (load(mode)) {
      current = mode;
      reattach(mode);
      return true;
    }
    mode = (mode % MODES) + 1;
  }
  return false;
}

// Per-mode display count (only modes 0 and 1 change it); the camera mode mirrors the view mode.
function reattach(mode: number): void {
  if (mode === 0 || mode === 1) displayCount = mode === 0 ? 0 : 2;
  // stand-in for re-open of active displays, camera mode and redraw
}
let displayCount = 0;
```

## 5. Lands in

- Frankendom target: `src/fight/camera.ts` (view-mode cycle), parity checklist row 11 (fight camera); today: `src/camera.ts` (moving; not re-checked on disk). The panel loading is not Frankendom's; keep only the cycle and fallback shape. The HUD resize on mode change is row 14.
- Reuse tag: adapt (MIT, the logic can be lifted; the view types are Orbiter's and must become Frankendom's).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Orbiter's cycle assumes a fixed set of modes and a loader per mode; Frankendom's camera modes must be a data table with defaults (zones as data).
- The fallback retries the next mode, not the same one, so a failed mode can silently change the view. Frankendom should surface the failure.
- Teardown deletes the old panel before the new one loads; a failed load leaves no panel until the fallback succeeds. Frankendom should load before tearing down.
- The sketch's display counts are a stand-in; the real re-attach and redraw calls are not reproduced.
- Client-only; the view mode is not fight state and must not affect the one engine in `src/fight/`.
