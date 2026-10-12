// Licence: clean-room. Written from the described mechanism of the GPL-2.0-or-later donor (service cover windows),
// not a translation of its lines. Names and structure are new.
export interface ServiceCfg { id: string; x: number; z: number; radius: number; }
export interface Service {
  cfg: ServiceCfg;
  live: boolean;            // covering the area in the committed grid
  supplyDays: number;       // days of supply inside the current window, may carry surplus or a small debt
  daysSinceEval: number;    // days elapsed since the last window evaluation
}
export interface CoverRules { windowDays: number; toleranceDays: number; }
export interface AreaGrid {
  size: number;             // grid is size x size cells
  committed: Uint8Array;    // what players get right now
  staged: Uint8Array;       // written during the window, copied in one pass at commit
}

// Called once per day for each service, in any order: nothing reads the grid until commit.
export function serviceDay(s: Service, suppliedToday: boolean): void {
  s.daysSinceEval++;
  if (suppliedToday) s.supplyDays++;
}

// Called once per window per service: decide, then stage the square around the service.
// simplified: the donor order is kept (check the window, activate or fail, then stage the area). Changed: the
// square is inclusive on all four sides (the donor's loop stops one cell short on the east and south), and a
// failed window also zeroes the supply count so its days do not carry into the next window (donor leaves it).
export function evaluateWindow(s: Service, grid: AreaGrid, r: CoverRules): void {
  if (s.supplyDays + r.toleranceDays < s.daysSinceEval) {
    s.live = false;
    s.daysSinceEval = 0;
    s.supplyDays = 0;          // FIX: failed window leaves no credit for the next one
    return;
  }
  s.live = true;
  s.supplyDays -= s.daysSinceEval;   // surplus (or a small debt) carries to the next window
  s.daysSinceEval = 0;
  const x0 = Math.max(s.cfg.x - s.cfg.radius, 0);
  const x1 = Math.min(s.cfg.x + s.cfg.radius, grid.size - 1);  // FIX: inclusive east edge
  const z0 = Math.max(s.cfg.z - s.cfg.radius, 0);
  const z1 = Math.min(s.cfg.z + s.cfg.radius, grid.size - 1);  // FIX: inclusive south edge
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) grid.staged[z * grid.size + x] = 1;
  }
}

// After every service has evaluated in this window: the whole area switches in one pass.
export function commitWindow(grid: AreaGrid): void {
  grid.committed.set(grid.staged);
  grid.staged.fill(0);
}

export {};
