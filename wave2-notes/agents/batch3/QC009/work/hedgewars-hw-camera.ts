// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec2 = { x: number; y: number };

interface CamTuning {
  leadPx: number;        // screen-px look-ahead in the travel direction (donor: z = round(200/zoom))
  edge: number;          // dead-zone distance from the view edge, in view units (donor: cGearScrEdgesDist)
  blendPerStep: number;  // share of the gap closed per reference step (donor: 7/8 kept per call, so 1/8 closed)
  stepMs: number;        // reference step length in ms (donor: cTimerInterval = 8)
  breakPx: number;       // manual pan above this (manhattan px) hands control back to the player (donor: 4)
  zoomPerMs: number;     // zoom easing rate per ms (donor: 0.002)
}

interface Cam {
  off: Vec2;        // donor WorldDx/WorldDy: shift from world to view
  pivot: Vec2;      // donor CursorPoint: where the look-ahead point sits in view space
  prevPivot: Vec2;  // donor prevPoint
  follow: boolean;  // donor FollowGear != nil and autoCameraOn
  zoom: number;
  zoomTarget: number;
}

interface Hero { x: number; y: number; dx: number; dy: number; }

// One camera step. halfW/halfH are the half view size in world units at the current zoom.
function stepCam(cam: Cam, hero: Hero, manual: Vec2, dtMs: number,
                 halfW: number, halfH: number, t: CamTuning): void {
  const dz = t.zoomPerMs * dtMs;
  if (cam.zoom > cam.zoomTarget) cam.zoom = Math.max(cam.zoomTarget, cam.zoom - dz);
  else cam.zoom = Math.min(cam.zoomTarget, cam.zoom + dz);

  cam.pivot.x += manual.x;
  cam.pivot.y += manual.y;
  if (cam.follow && Math.abs(cam.pivot.x - cam.prevPivot.x) + Math.abs(cam.pivot.y - cam.prevPivot.y) > t.breakPx) {
    cam.follow = false;
    cam.prevPivot = { ...cam.pivot };
    return;
  }

  if (!cam.follow) {
    // no follow: pivot movement pans the world, then the pivot is re-centred
    cam.off.x -= cam.pivot.x - cam.prevPivot.x;
    cam.off.y -= cam.pivot.y - cam.prevPivot.y;
    cam.pivot = { x: 0, y: 0 };
  } else {
    const lead = t.leadPx / cam.zoom;
    const k = 1 - Math.pow(1 - t.blendPerStep, dtMs / t.stepMs);
    const dstX = hero.x + Math.sign(hero.dx) * lead + cam.off.x;
    cam.pivot.x += (dstX - cam.pivot.x) * k;
    const vLead = Math.abs(hero.dy * lead) < 10 ? 0 : Math.sign(hero.dy) * lead;
    const dstY = hero.y + vLead + cam.off.y;
    cam.pivot.y += (dstY - cam.pivot.y) * k;

    // dead zone: move the view only when the pivot leaves it
    const minX = -halfW + t.edge, maxX = halfW - t.edge;
    if (cam.pivot.x < minX) { cam.off.x += minX - cam.pivot.x; cam.pivot.x = minX; }
    else if (cam.pivot.x > maxX) { cam.off.x += maxX - cam.pivot.x; cam.pivot.x = maxX; }
    const minY = -halfH + t.edge, maxY = halfH - t.edge;
    if (cam.pivot.y < minY) { cam.off.y += minY - cam.pivot.y; cam.pivot.y = minY; }
    else if (cam.pivot.y > maxY) { cam.off.y += maxY - cam.pivot.y; cam.pivot.y = maxY; }
  }
  cam.prevPivot = { ...cam.pivot };
}

// Explosion shake: amount falls with the effect's age (donor doStepBigExplosionWork).
function shakeAmount(timer: number): number {
  return Math.max(1, 13 - Math.floor((timer * 15) / 250));
}

// Random offset on both axes per call (donor ShakeCamera). rnd returns [0, 1).
function shake(cam: Cam, amount: number, rnd: () => number): void {
  const a = Math.max(1, Math.round((amount * cam.zoom) / 2));
  cam.off.x += -a + Math.floor(rnd() * (1 + 2 * a));
  cam.off.y += -a + Math.floor(rnd() * (1 + 2 * a));
}
export {};
