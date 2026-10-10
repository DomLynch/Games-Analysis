// Licence: id Software Limited Use Software License Agreement (educational use only, no commercial exploitation; donor README/LICENSE.DOC). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Dir = "N" | "E" | "S" | "W";
type Kind = "guard" | "officer" | "mutant" | "ss" | "dog";
type Mode = "shoot" | "dodge" | "chase";
type Rnd = () => number; // 0..255

const TILE = 65536;          // one tile in world units
const MIN_SIGHT = 0x18000;   // 1.5 tiles: close enough to notice without a facing test

interface Foe {
  kind: Kind;
  x: number;
  y: number;
  facing: Dir;
  connected: boolean;        // shares a floor area with the player
  ambush: boolean;           // must see the player once before it can wake
  reactTics: number;         // reaction countdown, 0 = idle
  baseSpeed: number;
  speed: number;
  chasing: boolean;
}

interface Target { x: number; y: number; }

function inFront(f: Dir, dx: number, dy: number): boolean {
  switch (f) {
    case "N": return dy <= 0;
    case "S": return dy >= 0;
    case "E": return dx >= 0;
    case "W": return dx <= 0;
  }
}

// Auto-sight inside 1.5 tiles; otherwise the target must be in the facing half-plane and lineClear must hold.
function canSee(foe: Foe, t: Target, lineClear: () => boolean): boolean {
  const dx = t.x - foe.x;
  const dy = t.y - foe.y;
  if (dx > -MIN_SIGHT && dx < MIN_SIGHT && dy > -MIN_SIGHT && dy < MIN_SIGHT) return true;
  if (!inFront(foe.facing, dx, dy)) return false;
  return lineClear();
}

function reactionDelay(kind: Kind, rnd: Rnd): number {
  switch (kind) {
    case "guard": return 1 + Math.floor(rnd() / 4);
    case "officer": return 2;
    case "mutant": return 1 + Math.floor(rnd() / 6);
    case "ss": return 1 + Math.floor(rnd() / 6);
    case "dog": return 1 + Math.floor(rnd() / 8);
  }
}

function speedMultiplier(kind: Kind): number {
  switch (kind) {
    case "guard": return 3;
    case "officer": return 5;
    case "mutant": return 3;
    case "ss": return 4;
    case "dog": return 2;
  }
}

// Engage: a state change plus a speed boost, as in the donor's FirstSighting.
function startChase(foe: Foe): void {
  foe.chasing = true;
  foe.speed = foe.baseSpeed * speedMultiplier(foe.kind);
}

// Returns true on the tick the foe engages. A new sighting only arms the reaction timer.
function wakeTick(foe: Foe, t: Target, noiseMade: boolean, lineClear: () => boolean, rnd: Rnd, tics: number): boolean {
  if (foe.reactTics > 0) {
    foe.reactTics -= tics;
    if (foe.reactTics > 0) return false;
    foe.reactTics = 0;
    startChase(foe);
    return true;
  }
  if (!foe.connected) return false;
  if (foe.ambush) {
    if (!canSee(foe, t, lineClear)) return false;
    foe.ambush = false;
  } else if (!noiseMade && !canSee(foe, t, lineClear)) {
    return false;
  }
  foe.reactTics = reactionDelay(foe.kind, rnd);
  return false;
}

// Shot roll while the line to the target is clear. Adjacent-close is the donor's (ob->distance < 0x4000) test, passed in.
function chaseTick(distTiles: number, adjacentClose: boolean, lineClear: boolean, rnd: Rnd, tics: number): Mode {
  if (!lineClear) return "chase";
  const chance = distTiles === 0 || (distTiles === 1 && adjacentClose)
    ? 300
    : Math.floor((tics * 16) / distTiles);
  return rnd() < chance ? "shoot" : "dodge";
}

// Dodge: sidestep preference toward the target axes first, away axes next, reverse last (not on the first attack).
function dodgeOrder(dx: number, dy: number, rnd: Rnd, back: Dir | null): Dir[] {
  const h: Dir = dx > 0 ? "E" : "W";
  const v: Dir = dy > 0 ? "S" : "N";
  const hAway: Dir = h === "E" ? "W" : "E";
  const vAway: Dir = v === "S" ? "N" : "S";
  let order: Dir[] = [h, v, hAway, vAway];
  if (Math.abs(dx) > Math.abs(dy)) order = [v, h, vAway, hAway];
  if (rnd() < 128) order = [order[1], order[0], order[3], order[2]];
  const picks = order.filter((d) => d !== back);
  if (back !== null) picks.push(back);
  return picks;
}

// Chase: toward axes (larger axis first), then the old heading, then a 50/50 sweep order, reverse last.
function chaseOrder(dx: number, dy: number, rnd: Rnd, oldDir: Dir | null, back: Dir | null): Dir[] {
  const h: Dir | null = dx > 0 ? "E" : dx < 0 ? "W" : null;
  const v: Dir | null = dy > 0 ? "S" : dy < 0 ? "N" : null;
  let d1: Dir | null = h;
  let d2: Dir | null = v;
  if (Math.abs(dy) > Math.abs(dx)) { d1 = v; d2 = h; }
  if (d1 === back) d1 = null;
  if (d2 === back) d2 = null;
  const out: Dir[] = [];
  if (d1 !== null) out.push(d1);
  if (d2 !== null) out.push(d2);
  if (oldDir !== null) out.push(oldDir);
  const sweep: Dir[] = rnd() > 128 ? ["N", "E", "S", "W"] : ["W", "S", "E", "N"];
  for (const d of sweep) if (d !== back) out.push(d);
  if (back !== null) out.push(back);
  return out;
}

// First direction that the caller says is walkable.
function pickDir(order: Dir[], walkable: (d: Dir) => boolean): Dir | null {
  for (const d of order) if (walkable(d)) return d;
  return null;
}

export {};
