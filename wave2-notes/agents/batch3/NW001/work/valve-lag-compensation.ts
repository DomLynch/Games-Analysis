// Licence: Valve Source 1 SDK LICENSE (restricted). Clean-room sketch of the mechanism, not a translation of the donor lines.
const MAX_UNLAG_S = 1.0;       // donor: player_lagcompensation.cpp:34 (sv_maxunlag "1.0", clamped 0..1)
const TELEPORT_DIST = 64;      // donor: player_lagcompensation.cpp:28 (sv_lagcompensation_teleport_dist "64")
const MISMATCH_S = 0.2;        // donor: player_lagcompensation.cpp:407 (fabs(deltaTime) > 0.2f)

interface Rec { t: number; x: number; y: number; alive: boolean }  // t = simulation time in seconds; index 0 is the newest
type Track = Rec[];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Once per frame, after all players have thought (donor: :245-303): drop records older than now - MAX_UNLAG_S,
// then add a new record only if the simulation time has moved on.
function frameUpdate(track: Track, now: number, simT: number, cur: Rec): void {
  const deadtime = now - MAX_UNLAG_S;
  while (track.length > 0 && track[track.length - 1].t < deadtime) track.pop();
  if (track.length > 0 && track[0].t >= simT) return;
  track.unshift(cur);
}

// The server's target time for a shot (donor: :345-411). Latency plus interpolation delay, clamped to the window.
// The client's own claim is used unless it disagrees with the server estimate by more than 0.2 s.
function targetTime(now: number, claimedT: number, outLatencyS: number, lerpS: number): number {
  const correct = clamp(outLatencyS + lerpS, 0, MAX_UNLAG_S);
  const claimed = claimedT - lerpS;
  const delta = correct - (now - claimed);
  return Math.abs(delta) > MISMATCH_S ? now - correct : claimed;
}

// Position of one target at time T (donor: :440-540). Walk from the newest record; stop at a dead record or a
// teleport (no backtrack, returns null); stop at the first record at or before T; then interpolate between the
// two records that bracket T, or copy the record found when no bracket exists.
// simplified: the donor also restores angles and bounding boxes, applies the sv_unlag_fixstuck recursion,
// and stores animation and pose records. This sketch keeps position and alive only, and it does not apply the
// position (the caller would move the target and restore it after the shot, as donor :599-770 does).
function sampleAt(track: Track, cur: { x: number; y: number }, T: number): { x: number; y: number } | null {
  let rec: Rec | undefined;
  let prev: Rec | undefined;
  let prevPos = cur;
  for (let i = 0; i < track.length; i++) {
    prev = rec;
    rec = track[i];
    if (!rec.alive) return null;
    const dx = rec.x - prevPos.x;
    const dy = rec.y - prevPos.y;
    if (dx * dx + dy * dy > TELEPORT_DIST * TELEPORT_DIST) return null;
    if (rec.t <= T) break;
    prevPos = { x: rec.x, y: rec.y };
  }
  if (rec === undefined) return null;
  if (prev !== undefined && rec.t < T && rec.t < prev.t) {
    const f = (T - rec.t) / (prev.t - rec.t);
    return { x: rec.x + (prev.x - rec.x) * f, y: rec.y + (prev.y - rec.y) * f };
  }
  return { x: rec.x, y: rec.y };
}

export {};
