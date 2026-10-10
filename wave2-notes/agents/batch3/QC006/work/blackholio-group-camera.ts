// Licence: Apache-2.0 (donor demo/Blackholio/LICENSE). Adaptable; this sketch is written from the mechanism, not copied from the donor.
// clean-room
interface Piece { x: number; y: number; mass: number; }     // one owned piece: position and mass from the server row
interface CamState { x: number; y: number; zoom: number; }
interface CamParams {
  baseRadius: number;   // visible radius the zoom aims for (zone data; donor 50)
  followSpeed: number;  // position follow rate per second (donor 8.0)
  zoomSpeed: number;    // zoom follow rate per second (donor 2.0)
  baseSize: number;     // size with one small piece (donor 10)
  massCap: number;      // max size added from mass (donor 10)
  massDivisor: number;  // mass per unit of size (donor 5)
  splitStep: number;    // size added once you own 2+ pieces (donor 30)
  worldCenterX: number; // fallback target when there is no piece
  worldCenterY: number;
}

// Mass-weighted centre of the owned pieces, or null when there is nothing to frame.
function groupCentre(pieces: Piece[]): { x: number; y: number } | null {
  let sx = 0, sy = 0, total = 0;
  for (const p of pieces) { sx += p.x * p.mass; sy += p.y * p.mass; total += p.mass; }
  if (total <= 0) return null;
  return { x: sx / total, y: sy / total };
}

function stepGroupCamera(st: CamState, pieces: Piece[], dt: number, p: CamParams): CamState {
  const c = groupCentre(pieces);
  const tx = c ? c.x : p.worldCenterX;
  const ty = c ? c.y : p.worldCenterY;
  // Simplified: a fraction clamped to 1 (the donor does not clamp; see section 6).
  const fPos = Math.min(1, dt * p.followSpeed);
  st.x += (tx - st.x) * fPos;
  st.y += (ty - st.y) * fPos;

  // Zoom only when there is at least one piece (simplified: the donor has no such guard).
  if (pieces.length === 0) return st;
  const totalMass = pieces.reduce((sum, q) => sum + q.mass, 0);
  const size = p.baseSize
    + Math.min(p.massCap, totalMass / p.massDivisor)
    + Math.min(pieces.length - 1, 1) * p.splitStep;
  const desiredZoom = p.baseRadius / Math.max(size, 1);
  const fZoom = Math.min(1, dt * p.zoomSpeed);
  st.zoom += (desiredZoom - st.zoom) * fZoom;
  return st;
}

export {}
