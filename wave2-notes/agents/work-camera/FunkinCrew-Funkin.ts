// Licence: Apache-2.0 (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface CameraTuning {
  kickScale: number;       // zoom multiplier on a kick (donor default 1.015)
  kickEveryBeats: number;  // beats between kicks (donor default 4)
  kickOffsetBeats: number; // shifts the kick grid (donor default 0)
  kickCapScale: number;    // no kick once zoom is at or above base x cap (donor 1.35)
  decayPerFrame: number;   // kick relaxes by this factor per 60 Hz frame (donor 0.95)
  followRate: number;      // share of the gap closed per frame (donor 0.04)
}

interface FightCamera {
  baseZoom: number; // set zoom (stage zoom or tween target)
  kick: number;     // multiplier, 1 = no kick
  zoom: number;     // what the renderer uses
  x: number;
  y: number;
  paused: boolean;
}

const STEPS_PER_BEAT = 4; // donor Constants.hx 424

// Grid step event. Ignored while paused (donor: stepHit returns early when paused).
function onGridStep(cam: FightCamera, t: CameraTuning, step: number): void {
  if (cam.paused) return;
  const gridSteps = t.kickEveryBeats * STEPS_PER_BEAT;
  const shifted = step + t.kickOffsetBeats * STEPS_PER_BEAT;
  if (cam.zoom < cam.baseZoom * t.kickCapScale && shifted % gridSteps === 0) {
    cam.kick = t.kickScale;
  }
}

// Frame update with real elapsed seconds. Donor: update() decays the kick, writes the zoom, then follows.
function onFrame(cam: FightCamera, t: CameraTuning, focusX: number, focusY: number, elapsedS: number): void {
  if (cam.paused) return; // donor: no decay or zoom write while a substate is open
  const frames = elapsedS * 60;
  cam.kick = 1 + (cam.kick - 1) * Math.pow(t.decayPerFrame, frames);
  cam.zoom = cam.baseZoom * cam.kick;
  cam.x += (focusX - cam.x) * t.followRate;
  cam.y += (focusY - cam.y) * t.followRate;
}

// Stage start or restart: drop any kick and set the base zoom and focus.
function resetFightCamera(cam: FightCamera, baseZoom: number, focusX: number, focusY: number): void {
  cam.baseZoom = baseZoom;
  cam.kick = 1;
  cam.zoom = baseZoom;
  cam.x = focusX;
  cam.y = focusY;
}
export {}
