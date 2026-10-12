// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism, not a translation.
export interface V2 { x: number; y: number }
export interface Foe { id: number; pos: V2; dead: boolean }

// Tap snap: the nearest live enemy within a radius of the tap (donor: 20 world units).
// simplified: the donor's Units.closestEnemy body was NOT read; "nearest within radius" is assumed from its name and arguments.
export function tapTarget(tap: V2, foes: Foe[], snapRadius = 20): Foe | undefined {
  let best: Foe | undefined;
  let bestD = snapRadius;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.pos.x - tap.x, f.pos.y - tap.y);
    if (d <= bestD) { best = f; bestD = d; }
  }
  return best;
}

// Auto target when nothing was tapped: nearest live enemy within weapon range (donor: Units.closestTarget, body not read).
export function autoTarget(unitPos: V2, range: number, foes: Foe[]): Foe | undefined {
  let best: Foe | undefined;
  let bestD = range;
  for (const f of foes) {
    if (f.dead) continue;
    const d = Math.hypot(f.pos.x - unitPos.x, f.pos.y - unitPos.y);
    if (d <= bestD) { best = f; bestD = d; }
  }
  return best;
}

// A target is dropped when it dies or leaves range (donor: Units.invalidateTarget, body not read).
export function keepTarget(t: Foe | undefined, unitPos: V2, range: number): Foe | undefined {
  if (t === undefined || t.dead) return undefined;
  return Math.hypot(t.pos.x - unitPos.x, t.pos.y - unitPos.y) <= range ? t : undefined;
}

export interface Hull { pos: V2; vel: V2 }

const TURN_PER_FRAME = 0.05; // donor constant, applied once per 60 Hz frame

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

// Anchor steering (donor: the unit is pulled toward the camera centre).
// Outside arriveRadius the desired velocity has length min(speed, dist) and its angle turns toward the
// current velocity angle by TURN_PER_FRAME per 60 Hz frame (we convert it to a dt term; donor is per frame).
// Inside arriveRadius the desired velocity is zero and the real velocity bleeds off by decelPerSecond * speed.
// simplified: the donor's approachDelta body was NOT read; the bleed rate here is an assumed linear decay.
export function steerToAnchor(
  hull: Hull,
  anchor: V2,
  speed: number,
  dtSeconds: number,
  arriveRadius = 15,
  decelPerSecond = 0.5,
): { desired: V2; vel: V2; boosting: boolean } {
  const dx = anchor.x - hull.pos.x;
  const dy = anchor.y - hull.pos.y;
  const dist = Math.hypot(dx, dy);
  const boosting = dist > 85;

  if (dist <= arriveRadius) {
    const bleed = decelPerSecond * speed * dtSeconds;
    const m = Math.hypot(hull.vel.x, hull.vel.y);
    const vel = m <= bleed || m === 0 ? { x: 0, y: 0 } : { x: hull.vel.x * (1 - bleed / m), y: hull.vel.y * (1 - bleed / m) };
    return { desired: { x: 0, y: 0 }, vel, boosting };
  }

  const mag = Math.min(speed, dist);
  const offAngle = Math.atan2(dy, dx);
  const velAngle = Math.atan2(hull.vel.y, hull.vel.x);
  const f = 1 - Math.pow(1 - TURN_PER_FRAME, dtSeconds * 60);
  const ang = offAngle + wrapAngle(velAngle - offAngle) * f;
  return { desired: { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag }, vel: hull.vel, boosting };
}

// Edge pan: depth into a 60 px margin, scaled to world units, capped in speed (donor: maxPanSpeed 1.3).
export function edgePan(screen: V2, screenSize: V2, worldPerPx: number, marginPx = 60, maxSpeed = 1.3): V2 {
  let px = 0;
  let py = 0;
  if (screen.x <= marginPx) px = -(marginPx - screen.x);
  if (screen.x >= screenSize.x - marginPx) px = screen.x - screenSize.x + marginPx;
  if (screen.y <= marginPx) py = -(marginPx - screen.y);
  if (screen.y >= screenSize.y - marginPx) py = screen.y - screenSize.y + marginPx;
  let v = { x: px * worldPerPx, y: py * worldPerPx };
  const m = Math.hypot(v.x, v.y);
  if (m > maxSpeed) v = { x: (v.x * maxSpeed) / m, y: (v.y * maxSpeed) / m };
  return v;
}

// Pinch zoom: scale relative to the scale captured when the pinch began.
export function pinchScale(initialDistance: number, distance: number, startScale: number): number {
  return (distance / initialDistance) * startScale;
}

export {};
