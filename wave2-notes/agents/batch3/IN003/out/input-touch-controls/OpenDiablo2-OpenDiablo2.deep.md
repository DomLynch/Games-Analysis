# OpenDiablo2-OpenDiablo2 (input-touch-controls, cell 2)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/game_controls.go` | Licence: GPL-3.0 (`LICENSE` file, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Go | symbol `OnMouseButtonRepeat` (with `OnMouseButtonDown`)

Checked: Read in full: `OnMouseButtonRepeat` (game_controls.go 432-490), `OnMouseButtonDown` (522-566), `isInActiveMenusRect` (774-806), the HUD rectangle constants (44-84) and the actionable-region list (135-220), `truncateFloat64` (426-429). Read: `Player.Advance` casting gate (player.go 91-110), `IsCasting` and `StartCasting` (220-236), the viewport screen-to-world chain (viewport.go 18-20, 71-86), the input manager's button dispatch (input_manager.go 30, 156-196), `Now()` (timeutils.go 10-13), `Game.OnPlayerMove` (game.go 321-335). Callers: the two handlers are reached through the input manager's interface dispatch (input_manager.go 162 and 192); a repo-wide grep found no direct calls to `GameControls` handlers. Not read: the server handling of the move packet, the pathfinder, the input service in `d2core/d2input/ebiten`, how often the input manager's `Advance` is called, any client-side prediction of the move. Confidence: high on the gates, the order of checks and the numbers; high on the globe band (computed from the constants); medium that the globe defect shows in play (read from code, not run). Camera scope: not a camera topic (n/a).

Best transferable idea: Route a touch by hit order (HUD first, menus second, world last), latch where the touch started so a held touch never becomes a move, and rate-limit hold re-sends to a 0.25 s floor.
Decision (proposed): adapt — the hit order, press-origin latch and hold floor are the input rules our phone tap-to-move needs; the latch fixes the globe defect, and the isometric inverse is rejected because our camera is 3D third-person.
Acceptance: A 1 s hold on the top of the HP globe at 375 wide leaves the hero's position unchanged and sends no move; a 1 s hold on open ground sends at most 4 target updates; a tap during a cast is dropped (or buffered, whichever is chosen), and a server test asserts the move is validated against zone bounds.

## 1. Mechanism

- Dispatch: the input manager's `Advance` (input_manager.go 30) checks each mouse button. A button that was just pressed goes to `OnMouseButtonDown` (162). A button that is still held goes to `OnMouseButtonRepeat` on every call (187-192). Each handler is offered to the chain in turn (propagate, not read).
- Press (`OnMouseButtonDown`, 522-566), in order:
  1. If the cursor is inside any actionable region (HUD buttons, skills, XP, stamina, both globes), run that region's action and return (527-530). A globe click toggles its stats panel (906 for HP).
  2. If the skill select menu is open and the button is left, pass the click to it and close it (533-539).
  3. Convert the cursor to world coordinates and truncate to 0.1 tile (ScreenToWorld, then `truncateFloat64`; 426-429 for the truncation).
  4. Left button, not on an active menu rect, not casting: set the left-action time, then Shift+left casts the left skill at the point and plain left sends a move (545-553).
  5. Right button, not on an active menu rect, not casting: cast the right skill at the point (557-560).
  No throttle is applied on press.
- Hold (`OnMouseButtonRepeat`, 432-490): the same world conversion (439-441). For each button it computes the time since that button's last action (447-448) and fires only if at least 0.25 s has passed (450-451, const at 35). The left move needs: at least 0.25 s since the last left action, the point not on an active menu rect (449), and not casting (453). The right cast needs the same gates (481). So a held button re-sends the target at most four times per second.
- Casting gate: while the hero is casting, both handlers drop the input (545, 557 on press; 453, 481 on hold). Nothing is queued. The flag is set when a cast starts (player.go 234) and cleared after the cast animation has played once (99-100). The skill itself fires when the animation is half done (105-108, the threshold `half = 0.5` at 86).
- Send: `OnPlayerMove` (game.go 321) builds a move packet from the hero's current world position and the target (326) and sends it to the server (331). The donor does not move the hero in this function (any prediction elsewhere not read).
- Coordinates: `OrthoToWorld` (viewport.go 76-79) inverts the isometric projection used by `WorldToOrtho` (85-86) with 80 by 40 px tiles (18-19) and `half = 2` (20). Screen to world is `ScreenToOrtho` then `OrthoToWorld` (71-72).

## 2. Key functions

- `OnMouseButtonRepeat`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/game_controls.go` 432-490. Hold repeat with a per-button 0.25 s floor and the same gates as press.
- `OnMouseButtonDown`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/game_controls.go` 522-566. UI-first hit order, then menus, then the world.
- `isInActiveMenusRect`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/game_controls.go` 774-806. Bottom bar, side panels, mini panel, escape menu, help, skill select.
- `Player.Advance` cast gate: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2mapentity/player.go` 91-110.
- `OrthoToWorld`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2maprenderer/viewport.go` 76-79.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Hold re-send floor per button | 0.25 s (game_controls.go 35): at most 4 sends per second per button |
| Press has no floor | None (450-451 apply to hold only) |
| Snap target to a grid for the server | 0.1 tile, truncated toward zero (428) |
| Cast gate, released after one animation play | `GetPlayedCount() >= 1` (player.go 99-100) |
| Skill fires at half of the cast animation | 0.5 (player.go 86, 105) |
| HUD layout is absolute pixels on a fixed screen | 800 x 600 (game_controls.go 434); bottom bar y 550, h 50 (83); HP globe x 30, y 525, 80 x 60 (68-71); mana globe x 695, y 525, 80 x 60 (76) |
| Iso projection | tile 80 x 40 px, `half = 2` (viewport.go 18-20, 77-78) |

Worked check of the globe band (computed from the constants): the HP globe rectangle covers y 525 to 585 (71). The bottom bar covers y 550 to 600 (83). So the top 25 of the globe's 60 rows (y 525 to 549) are outside the bar. The same holds for the mana globe (76). A press on that band takes the press path, which runs the globe action and sends no move (527-530, 906). While the button stays down, the hold path checks only the menu rect (449), so a move is sent to the screen point each 0.25 s. The client sends a move to the point under the globe, so the hero is sent that way (the server decides the path; not read).

Defect (kept the idea, fix below): the hold path does not check the actionable regions, and the bottom bar misses the top of the globes. Fix: latch the press origin on touch-down and let only a world-origin hold send moves (the sketch does this). Equivalent fix in the donor: check the actionable list in the hold path too, and extend the bar rect to y 525.

Other observation: press has no floor (545-553), so a second quick click is always accepted; only holds are rate-limited. Nothing is buffered: a click during a cast is lost (545, 557).

## 4. TypeScript sketch

simplified: the press-origin latch is added (the donor has none; its hold path checks only the menu rect); the screen-to-world conversion is passed in as `toWorld` (the donor's iso inverse is not reproduced); the skill casts, the free camera, the panel toggles and the server packet are omitted; the donor's 0.1 tile snap is kept as `truncStep`; the order is UI, then menus, then the world, as in the donor's press path. The cast gate drops input (as the donor does) and does not queue.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Screen coordinates in pixels; world target in tiles. `now` is seconds.

export interface Pt { x: number; y: number; }
export interface Rect { x: number; y: number; w: number; h: number; }

export interface RouterCfg {
  uiRects: { id: string; rect: Rect }[]; // HUD buttons and globes: a touch here is a UI action
  menuRects: Rect[];                     // bottom bar and any open panel: no world move
  repeatFloorS: number;                  // hold re-sends at most once per this many seconds (donor 0.25)
  truncStep: number;                     // target snapped toward zero to this many tiles (donor 0.1)
}

export interface RouterState {
  origin: 'ui' | 'world' | null; // latched on touch-down; a hold never changes it (the fix)
  lastMoveAt: number;
  casting: boolean;              // a cast is running: new input is dropped, not queued (donor)
}

export type Action =
  | { kind: 'ui'; id: string }
  | { kind: 'move'; tx: number; ty: number }
  | { kind: 'none' };

const inRect = (r: Rect, p: Pt): boolean =>
  p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

const snap = (v: number, step: number): number => Math.trunc(v / step) * step;

function moveTo(p: Pt, toWorld: (p: Pt) => Pt, cfg: RouterCfg): Action {
  const w = toWorld(p);
  return { kind: 'move', tx: snap(w.x, cfg.truncStep), ty: snap(w.y, cfg.truncStep) };
}

// Touch-down: UI first, then menus, then the world. Latches where the touch started.
export function onDown(p: Pt, now: number, st: RouterState, cfg: RouterCfg, toWorld: (p: Pt) => Pt): Action {
  const ui = cfg.uiRects.find((u) => inRect(u.rect, p));
  if (ui) { st.origin = 'ui'; return { kind: 'ui', id: ui.id }; }
  if (cfg.menuRects.some((r) => inRect(r, p))) { st.origin = 'ui'; return { kind: 'none' }; }
  st.origin = 'world';
  if (st.casting) return { kind: 'none' };
  st.lastMoveAt = now;
  return moveTo(p, toWorld, cfg);
}

// Each frame the touch is held: re-send the move only for a world-origin hold, at the floor rate.
export function onHold(p: Pt, now: number, st: RouterState, cfg: RouterCfg, toWorld: (p: Pt) => Pt): Action {
  if (st.origin !== 'world') return { kind: 'none' };
  if (st.casting || now - st.lastMoveAt < cfg.repeatFloorS) return { kind: 'none' };
  st.lastMoveAt = now;
  return moveTo(p, toWorld, cfg);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 od2-tap-router.ts` on the VPS exits 0.

## 5. Lands in

- TARGET `src/fight/tap-move.ts` (new: the touch-to-intent router; UI first, then menus, then the world; press-origin latch; hold floor; cast gate drops input). Parity-checklist row 5 (controls/input).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: addendum rule 2 (judge the idea, not the genre); Strategy rule 2026-10-10 (keep the idea, fix the defect); the client builds an intent and the server owns the move.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Decision (proposed): adapt. Keep the hit order (UI, menus, world), the press-origin latch (the fix for the globe defect), and the hold floor of 0.25 s. Reject the donor's isometric inverse (viewport.go 76-79): our camera is third-person in 3D, so the target comes from a ground pick, not a 2D inverse. Do not copy the 800 x 600 absolute HUD layout (game_controls.go 434): our phone layout must scale to 375 wide.
- The donor drops input during a cast and never buffers it (453, 481, 545, 557). Frankendom has to choose: drop, or keep one buffered action for a short window. Pick one and test it.
- Server side not read: the donor sends the move and the server decides the path (game.go 326-331). Frankendom must validate the tap target (inside the zone bounds, reachable, not inside a wall) and the move rate on the server.
- No touch and no gamepad in this donor (not read). No virtual stick (cell 1 covers the stick math). Landscape vs portrait: not in this donor; the layout is fixed at 800 x 600 (434).
- Lock-on, gesture specials and input buffering for combos: not in this donor (not read).
- The globe defect is read from code, not run in a browser.
