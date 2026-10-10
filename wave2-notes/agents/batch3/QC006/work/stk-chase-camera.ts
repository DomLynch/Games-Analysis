// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface KartPose { x: number; y: number; z: number; heading: number; speed: number; skid: number; } // skid: visual skid factor, -1..1
interface ChaseState {
  offX: number; offY: number; offZ: number; // camera offset in the kart-local frame (units); -z is behind
  heading: number;                          // smoothed heading used for placement (rad)
}
interface ChaseParams {
  distance: number;   // rest distance behind the kart (zone data; donor default 1.0)
  smoothPos: number;  // position smoothing time constant, s (zone data; donor default 0.2)
  smoothRot: number;  // heading smoothing time constant, s (zone data; donor default 0.125)
  maxSpeed: number;   // engine max speed, same unit as kart.speed
}
interface CamPose { px: number; py: number; pz: number; tx: number; ty: number; tz: number; }

function lerpAngle(a: number, b: number, t: number): number {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
}

function stepChaseCamera(st: ChaseState, kart: KartPose, dt: number, p: ChaseParams): CamPose {
  if (dt <= 0) throw new Error("dt must be positive");
  const ratio = Math.max(kart.speed / p.maxSpeed, -0.12);          // reverse speed floored at -0.12
  let behind = (2.8 + 5.6 * ratio) * Math.sqrt(p.smoothPos);        // pulls back as speed rises
  behind = Math.max(behind, 2 * p.distance);                        // never closer than 2 x distance
  const a = Math.asin(Math.max(-1, Math.min(1, kart.skid)));        // skid angle (donor: asinf of visual skid factor)
  const wantX = -behind * Math.sin(a / 2);                          // sideways swing during a skid
  const wantY = 0.85 + ratio / 2.5;                                 // height rises a little with speed
  const wantZ = -behind * Math.cos(a / 2);

  const d1 = dt / Math.max(dt, p.smoothPos);                        // position lerp fraction
  const d2 = dt / Math.max(dt, p.smoothRot);                        // heading lerp fraction

  // place with the PREVIOUS offset and heading, then advance the state
  const s = Math.sin(st.heading), c = Math.cos(st.heading);
  const px = kart.x + st.offX * c + st.offZ * s;
  const pz = kart.z - st.offX * s + st.offZ * c;
  const py = kart.y + st.offY;
  st.heading = lerpAngle(st.heading, kart.heading, d2);
  st.offX += (wantX - st.offX) * d1;
  st.offY += (wantY - st.offY) * d1;
  st.offZ += (wantZ - st.offZ) * d1;

  return { px, py, pz, tx: kart.x, ty: kart.y + 0.5, tz: kart.z };  // look at 0.5 above the kart origin
}

export {}
