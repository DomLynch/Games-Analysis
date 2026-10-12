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
