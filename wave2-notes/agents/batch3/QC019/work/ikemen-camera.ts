// Licence: MIT (donor, Ikemen GO). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Tracked { leftest: number; rightest: number; leftVel: number; rightVel: number; } // extremes of tracked fighters, world x
interface View { left: number; right: number; }
interface Bounds { minLeft: number; maxRight: number; zoomIn: number; zoomOut: number; }
interface ZoomGate { delayLeft: number; }

const TENSION = 50;          // zone data: dead-zone margin in world units (donor default 50 at 320 wide, times the local scale)
const TENSION_VEL = 1;       // zone data: smoothing speed, donor clamps it to 0..20
const SMOOTH = 0.05;         // engine: fraction of the gap closed per logic tick, times the logic scale and the speed
const SNAP_STEP = 0.2;       // engine: minimum step per tick in world units (donor: gameWidth / 3200)
const ZOOM_DELAY_TICKS = 0;  // zone data: ticks to hold before zooming in after a failed fit
const ZOOM_IN_SPEED = 1;     // zone data: fraction of a zoom-in step taken per tick; 1 = off
const ZOOM_OUT_SPEED = 1;    // zone data: fraction of a zoom-out step taken per tick; 1 = off

// Step 1: framing targets from the tracked extremes, with a dead zone of `tension` on each side.
function framingTarget(v: View, t: Tracked, b: Bounds, tension: number): View {
  let left = v.left;
  let right = v.right;
  if (t.leftest < left + tension) {
    const newLeft = Math.max(t.leftest - tension, b.minLeft);
    const diff = left - newLeft;
    left = newLeft;
    right = Math.max(v.right - diff, Math.min(t.rightest + tension, b.maxRight));
  } else if (t.rightest > right - tension) {
    const newRight = Math.min(t.rightest + tension, b.maxRight);
    const diff = right - newRight;
    right = newRight;
    left = Math.min(v.left - diff, Math.max(t.leftest - tension, b.minLeft));
  }
  return { left, right };
}

// Step 2: move one view edge toward its target; a small move is raised to the leading fighter's edge speed.
function stepEdge(oldEdge: number, target: number, posVel: number, negVel: number, lg: number, tv: number): number {
  let e = oldEdge;
  const snap = SNAP_STEP * lg * tv;
  for (let i = 0; i < 3; i++) {
    e = e + (target - e) * SMOOTH * lg * tv;
    const gap = target - e;
    if (Math.abs(gap) <= snap) e = target;
    else e += gap > 0 ? snap : -snap;
  }
  const d = e - oldEdge;
  if (d > 0 && d < posVel) e = Math.min(oldEdge + posVel, target);
  else if (d < 0 && d > negVel) e = Math.max(oldEdge + negVel, target);
  return e;
}

// Step 3: zoom toward the fit scale; a fraction of the change per tick when the speed is below 1.
function zoomStep(oldScale: number, fit: number, inSpeed: number, outSpeed: number): number {
  const speed = fit > oldScale ? inSpeed : outSpeed;
  if (speed < 0 || speed >= 1) return fit;
  return oldScale + speed * (fit - oldScale);
}

// One logic tick of the fight view: framing, edge smoothing, zoom gate, zoom step, centre.
function fightCameraTick(
  v: View, t: Tracked, b: Bounds, oldScale: number, gate: ZoomGate,
  gameWidth: number, logicSpeed: number,
): { view: View; scale: number } {
  const lg = 60 / logicSpeed;
  const target = framingTarget(v, t, b, TENSION);
  let left = stepEdge(v.left, target.left, t.rightVel, t.leftVel, lg, TENSION_VEL);
  let right = stepEdge(v.right, target.right, t.rightVel, t.leftVel, lg, TENSION_VEL);

  let fit = Math.min(gameWidth / (right - left), b.zoomIn);
  if (fit > oldScale) {
    if (gate.delayLeft > 0) { gate.delayLeft -= 1; fit = oldScale; }
  } else {
    gate.delayLeft = ZOOM_DELAY_TICKS;
  }
  const scale = Math.max(b.zoomOut, zoomStep(oldScale, fit, ZOOM_IN_SPEED, ZOOM_OUT_SPEED));
  left = Math.max(left, b.minLeft);
  right = Math.min(right, b.maxRight);
  return { view: { left, right }, scale };
}
