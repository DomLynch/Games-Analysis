// Licence: MIT (donor LICENSE, Copyright (c) 2025 amilich). Shape of the donor's pacing and culling rules, re-written from the mechanism.
const TILE_W = 64;
const TILE_H = TILE_W * 0.6;

export interface View { left: number; top: number; right: number; bottom: number; } // world units

// Phone cap: a RAF tick is skipped when the last drawn tick is under the budget.
export interface Pacing { lastDrawMs: number; }
export function shouldDrawFrame(nowMs: number, st: Pacing, isMobile: boolean): boolean {
  const budgetMs = isMobile ? 33 : 16;
  if (isMobile && nowMs - st.lastDrawMs < budgetMs) return false;
  st.lastDrawMs = nowMs;
  return true;
}

// Moving entities and sprites stand still while a phone pans or pinches.
export function entitiesMove(isMobile: boolean, panning: boolean, pinching: boolean): boolean {
  return !(isMobile && (panning || pinching));
}

// Timestep for the entity loop, clamped so a stall cannot jump the simulation.
export function clampDelta(nowMs: number, lastMs: number): number {
  return Math.min((nowMs - lastMs) / 1000, 0.3);
}

// Pad the view: 1 tile left/right, 2 tile heights top/bottom (donor order).
export function padView(v: View): View {
  return { left: v.left - TILE_W, right: v.right + TILE_W, top: v.top - TILE_H * 2, bottom: v.bottom + TILE_H * 2 };
}

// Diagonal sums (x + y) that can reach the padded view. Screen y grows with x + y.
export function visibleSumRange(p: View, gridSize: number): [number, number] {
  const minSum = Math.max(0, Math.floor((p.top - TILE_H * 6) * 2 / TILE_H));
  const maxSum = Math.min(gridSize * 2 - 2, Math.ceil((p.bottom + TILE_H) * 2 / TILE_H));
  return [minSum, maxSum];
}

// Walk diagonals back to front; visit only tiles whose box touches the view.
export function forEachVisibleTile(
  gridSize: number,
  view: View,
  toScreen: (x: number, y: number) => { sx: number; sy: number },
  visit: (x: number, y: number) => void,
): void {
  const p = padView(view);
  const [minSum, maxSum] = visibleSumRange(p, gridSize);
  for (let sum = minSum; sum <= maxSum; sum++) {
    for (let x = Math.max(0, sum - gridSize + 1); x <= Math.min(sum, gridSize - 1); x++) {
      const y = sum - x;
      if (y < 0 || y >= gridSize) continue;
      const { sx, sy } = toScreen(x, y);
      // Tall tiles: keep a tile whose top is up to 4 tile heights above the view.
      if (sx + TILE_W < p.left || sx > p.right || sy + TILE_H * 4 < p.top || sy > p.bottom) continue;
      visit(x, y);
    }
  }
}

// Zoom density gate for ambient vehicles and pedestrians (values from donor constants).
export interface DensityRules { pedestrianMinZoom: number; hideAllBelow: number; pedestrianCap: number; }
export function pedestriansAllowed(zoom: number, r: DensityRules): boolean {
  return zoom >= Math.max(r.pedestrianMinZoom, r.hideAllBelow);
}
export function spawnRoom(current: number, r: DensityRules): number {
  return Math.max(0, r.pedestrianCap - current);
}

// Detail level for a pedestrian at this zoom (thresholds 0.55 and 0.75 in donor).
export function drawDetail(zoom: number): "simple" | "medium" | "full" {
  if (zoom < 0.55) return "simple";
  if (zoom < 0.75) return "medium";
  return "full";
}

export {};
