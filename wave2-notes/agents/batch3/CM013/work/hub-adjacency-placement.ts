// Licence: GPL-3.0 with Electronic Arts additional terms (donor, repo root LICENSE.md). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type HubId = number;

interface PlacementState {
  // One structure may be waiting to be placed at a time (donor: Map.PendingObject).
  pending: string | null;
  // Cached reach field: distance (Chebyshev, in cells) from the nearest friendly hub cell, 255 = out of reach.
  field: Uint8Array;
}

// Recompute the reach field from every friendly hub cell. Must be called whenever the hub set changes;
// the donor only does this once, when placement starts (stale-state defect).
function buildReachField(hubCells: HubId[], w: number, h: number, maxDist: number): Uint8Array {
  const field = new Uint8Array(w * h).fill(255);
  for (const hub of hubCells) {
    const hx = hub % w;
    const hy = Math.floor(hub / w);
    for (let y = hy - maxDist; y <= hy + maxDist; y++) {
      for (let x = hx - maxDist; x <= hx + maxDist; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = Math.max(Math.abs(x - hx), Math.abs(y - hy));
        const i = y * w + x;
        if (d < field[i]) field[i] = d;
      }
    }
  }
  return field;
}

// A footprint passes when ANY of its cells is within `reach` of a hub (donor wrapper: reach = Adjacent + 1).
// An off-grid footprint cell fails the whole check, as in the donor.
function passesProximity(footprint: number[], field: Uint8Array, reach: number, w: number, h: number): boolean {
  for (const c of footprint) {
    if (c < 0 || c >= w * h) return false;
    if (field[c] <= reach) return true;
  }
  return false;
}

type PlaceResult = "ok" | "no-pending" | "not-near-hub" | "blocked";

// Engine-side placement: the proximity rule is checked here too, not only on the client cursor.
function tryPlace(
  st: PlacementState,
  structure: string,
  footprint: number[],
  reach: number,
  w: number,
  h: number,
  isClear: (cell: number) => boolean,
): PlaceResult {
  if (st.pending !== structure) return "no-pending";
  if (!passesProximity(footprint, st.field, reach, w, h)) return "not-near-hub";
  if (!footprint.every(isClear)) return "blocked";
  st.pending = null;
  return "ok";
}

// Only one completed structure may wait at a time (donor: Manual_Place refuses when PendingObject is set).
function startPlacement(st: PlacementState, structure: string): boolean {
  if (st.pending !== null) return false;
  st.pending = structure;
  return true;
}

export {};
