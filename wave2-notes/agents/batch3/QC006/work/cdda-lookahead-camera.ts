// Licence: CC-BY-SA-3.0 (donor, LICENSE.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface LookAhead { lx: number; lz: number; }   // current look-ahead offset on the ground plane (units)
interface LeadParams {
  minSpeed: number;  // speed at or below which there is no lead (donor: one tile of vehicle speed)
  maxSpeed: number;  // speed at or above which the lead is full (donor: smallest max offset x tile speed)
  maxLead: number;   // full lead per axis, units (data; donor derives it from the window half-size minus a border)
  rate: number;      // glide speed toward the wanted lead, units per second (donor: one tile per call)
  snap: number;      // snap distance, units (donor: one tile)
}
interface Hero { x: number; z: number; vx: number; vz: number; speed: number; } // speed is signed: negative when reversing

// Returns the camera focus on the ground plane: the hero plus a look-ahead along the travel direction.
function stepLookAhead(st: LookAhead, h: Hero, dt: number, p: LeadParams): { x: number; z: number } {
  // travel direction, then the donor's corner squeeze: the larger component becomes +-1
  let dx = h.vx, dz = h.vz;
  if (Math.abs(dx) > Math.abs(dz) && Math.abs(dx) > 0.2) { dz /= Math.abs(dx); dx = Math.sign(dx); }
  else if (Math.abs(dz) > 0.2) { dx /= Math.abs(dz); dz = Math.sign(dz); }

  // speed factor, clamped to 0..1 here (the donor's inverse lerp is unclamped; see section 6)
  const rel = Math.min(1, Math.max(0, (Math.abs(h.speed) - p.minSpeed) / (p.maxSpeed - p.minSpeed)));
  const wantX = dx * rel * p.maxLead;
  const wantZ = dz * rel * p.maxLead;

  // glide toward the wanted lead; snap when close, as the donor does
  const ex = wantX - st.lx, ez = wantZ - st.lz;
  const dist = Math.hypot(ex, ez);
  if (dist <= p.snap) {
    st.lx = wantX; st.lz = wantZ;
  } else {
    const s = Math.min(1, (p.rate * dt) / dist);
    st.lx += ex * s; st.lz += ez * s;
  }
  return { x: h.x + st.lx, z: h.z + st.lz };
}

export {}
