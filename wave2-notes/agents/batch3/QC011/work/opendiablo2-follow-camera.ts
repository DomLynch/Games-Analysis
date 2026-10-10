// Licence of donor: GPL-3.0. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cam2 {
  x: number;                                  // camera position (screen-ortho units)
  y: number;
  target: { x: number; y: number } | null;    // where the camera eases to
}

const DONOR_GAIN = 0.85;     // fraction of the gap closed per call (donor), not per second
const HALF_LIFE_S = 0.08;    // proposed follow half-life in seconds (tunable)

// Donor-shaped step, for comparison only: one fixed-gain pull per call, whatever the frame time.
function donorStyleStep(cam: Cam2): void {
  if (cam.target === null) return;
  cam.x += DONOR_GAIN * (cam.target.x - cam.x);
  cam.y += DONOR_GAIN * (cam.target.y - cam.y);
}

// Adapted step: fraction of the gap closed depends on elapsed seconds, so the feel is the same at any frame rate.
function easeStep(cam: Cam2, dtS: number): void {
  if (cam.target === null) return;
  const k = 1 - Math.pow(0.5, dtS / HALF_LIFE_S);
  cam.x += k * (cam.target.x - cam.x);
  cam.y += k * (cam.target.y - cam.y);
}

// Follow: the target is written from the hero only when free look is off. The camera always eases to the target.
function setFollowTarget(cam: Cam2, heroX: number, heroY: number, freeLook: boolean): void {
  if (!freeLook) cam.target = { x: heroX, y: heroY };
}

// Free look pan: moves the target, not the camera. Shift doubles the step (donor: 8 and 16 units per key repeat).
function panTarget(cam: Cam2, dx: number, dy: number, shift: boolean): void {
  if (cam.target === null) cam.target = { x: cam.x, y: cam.y };
  const step = shift ? 16 : 8;
  cam.target.x += dx * step;
  cam.target.y += dy * step;
}

// Smoke test: hero walks right at 1 unit per frame; compare the donor-style lag with the adapted one.
const donorCam: Cam2 = { x: 0, y: 0, target: null };
const easeCam: Cam2 = { x: 0, y: 0, target: null };
let heroX = 0;
for (let frame = 0; frame < 120; frame++) {
  donorStyleStep(donorCam);                 // donor order: pull first, then the target is set from the hero
  setFollowTarget(donorCam, heroX, 0, false);
  heroX += 1;
  setFollowTarget(easeCam, heroX, 0, false);
  easeStep(easeCam, 1 / 60);
}
const donorLag = heroX - donorCam.x;
const easeLag = heroX - easeCam.x;
panTarget(easeCam, 1, 0, true);
export {};
