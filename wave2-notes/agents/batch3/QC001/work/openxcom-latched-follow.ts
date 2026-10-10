// Licence of donor: GPL-3.0-or-later. Clean-room sketch written from the described mechanism (latch, release on impact), not a translation of donor lines.
// Shape only. The damping is a Frankendom choice, not in the donor.
interface Vec2 { x: number; y: number }
interface ViewSize { w: number; h: number }
interface FollowCam { latched: boolean }

// Left and right and top and bottom test: a 1 px margin, as the donor does.
const LEAVE_MARGIN_PX = 1;
// Frankendom value (not in the donor, which locks at once). Tunable client data.
const RECENTRE_HALF_LIFE_MS = 120;

function outsideView(p: Vec2, v: ViewSize): boolean {
  return p.x < LEAVE_MARGIN_PX || p.x > v.w - LEAVE_MARGIN_PX
      || p.y < LEAVE_MARGIN_PX || p.y > v.h - LEAVE_MARGIN_PX;
}

// Called once per client frame with the subject's screen position.
// Returns the pan to apply to the view (the subject moves by minus this amount).
function updateProjectileFollow(
  cam: FollowCam, subject: Vec2, view: ViewSize, dtMs: number, impacted: boolean,
): Vec2 {
  if (impacted) { cam.latched = false; return { x: 0, y: 0 }; } // release at impact
  if (!cam.latched) {
    if (!outsideView(subject, view)) return { x: 0, y: 0 };      // free flight: no camera move
    cam.latched = true;                                          // leave the frame once: latch on
  }
  const target: Vec2 = { x: view.w / 2, y: view.h / 2 };
  const k = 1 - Math.pow(0.5, dtMs / RECENTRE_HALF_LIFE_MS);     // frame-rate independent blend
  return { x: (subject.x - target.x) * k, y: (subject.y - target.y) * k };
}

const cam: FollowCam = { latched: false };
const view: ViewSize = { w: 800, h: 600 };
const pan = updateProjectileFollow(cam, { x: 900, y: 300 }, view, 16, false);
void pan;
export {};
