// Licence: unclear per donor (GPL-3.0 / LGPL-3.0 / MIT files). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface MoveXpTimer {
  dueAtS: number | null; // server time at which the one-shot award fires; null when no award is pending
  totalXp: number;       // companion XP total
  maxTotalXp: number;    // XP threshold of the highest companion level
}

const DRIP_S = 60;   // donor TimeSpan.FromSeconds(60) (Mate.cs 668)
const DRIP_XP = 300; // donor MateXpUpdateTask.Exp (MateXpUpdateTask.cs 10)

// Called on every move sample. serverMoving must come from server positions, not from client-reported velocity.
function onMoveSample(t: MoveXpTimer, nowS: number, serverMoving: boolean): void {
  if (!serverMoving) {
    t.dueAtS = null;                 // stop cancels the pending award (donor StopUpdateXp)
    return;
  }
  if (t.dueAtS === null && t.totalXp < t.maxTotalXp) {
    t.dueAtS = nowS + DRIP_S;        // start once; a second move sample while pending changes nothing (donor early return)
  }
}

// Called on the tick. Returns the XP to grant now, scaled by the server rate.
function dripDue(t: MoveXpTimer, nowS: number, expRate: number): number {
  if (t.dueAtS === null || nowS < t.dueAtS) return 0;
  t.dueAtS = null;                   // one-shot: the next moving sample starts a new minute
  return scaledGrant(DRIP_XP, expRate);
}

// Donor rounds the rate-scaled amount (Mate.cs 543). The message must report this value.
function scaledGrant(xp: number, expRate: number): number {
  return Math.round(expRate * xp);
}

// Level cap: the total never passes the highest level threshold (donor 549-552 removes the overflow).
function applyXp(t: MoveXpTimer, grant: number): number {
  t.totalXp = Math.min(t.totalXp + grant, t.maxTotalXp);
  return grant;
}
export {}
