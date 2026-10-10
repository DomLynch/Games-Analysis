// clean-room sketch of the movement bound in NetServer.java (applySnapshot). Donor is GPL-3.0: shape only, no line-by-line translation.
export interface Motion {
  x: number;
  y: number;
  lastSnapId: number;   // id of the last snapshot accepted
  lastMs: number;       // time the last snapshot was accepted
}

export interface Claim {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Config {
  tileSize: number;     // donor 8 units per tile
  correctTiles: number; // donor 14: correct the client only beyond this distance
  maxElapsedMs: number; // donor 1500: cap on the time credit for one snapshot
  slack: number;        // donor 1.1 multiplier on the allowed move
  verify: boolean;      // donor: strict && headless
}

export interface Result {
  x: number;            // server position after this snapshot
  y: number;
  correction: boolean;  // true if the server must send the client its position
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

// Returns null when the snapshot is stale or the unit is not controllable this tick.
export function applySnapshot(
  m: Motion,
  c: Claim,
  nowMs: number,
  maxSpeed: number,     // units per tick, donor unit.speed()
  ignore: boolean,      // donor: dead or wrong unit
  cfg: Config,
): Result | null {
  if (c.id < m.lastSnapId) return null;

  const cx = finite(c.x);
  const cy = finite(c.y);
  const elapsed = Math.min(nowMs - m.lastMs, cfg.maxElapsedMs);
  const maxMove = (elapsed / 1000) * 60 * maxSpeed * cfg.slack;

  let nx = m.x;
  let ny = m.y;
  if (!ignore) {
    let dx = cx - m.x;
    let dy = cy - m.y;
    const len = Math.hypot(dx, dy);
    if (len > maxMove && len > 0) {
      dx = (dx / len) * maxMove;
      dy = (dy / len) * maxMove;
    }
    if (cfg.verify) {
      nx = m.x + dx;
      ny = m.y + dy;
    } else {
      // non-verify: the donor resets the unit to its previous position and writes the claim into the sync buffer; the sketch assumes readSyncManual adopts the claim (its body was not read)
      nx = cx;
      ny = cy;
    }
  }

  const correctDist = cfg.tileSize * cfg.correctTiles;
  const correction = cfg.verify && Math.hypot(cx - nx, cy - ny) > correctDist;

  m.x = nx;
  m.y = ny;
  m.lastSnapId = c.id;
  m.lastMs = nowMs;
  return { x: nx, y: ny, correction };
}

export {};
