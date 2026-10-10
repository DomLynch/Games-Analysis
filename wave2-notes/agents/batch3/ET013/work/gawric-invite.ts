// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const INVITE_SECONDS = 20; // data: the donor's default window (ShowWindow default 20 s)

type InviteState = "pending" | "accepted" | "declined" | "expired";

interface Invite {
  id: number;
  from: number;
  to: number;
  expiresAt: number; // server clock, seconds
  state: InviteState;
}

function openInvite(id: number, from: number, to: number, now: number, seconds: number = INVITE_SECONDS): Invite {
  return { id, from, to, expiresAt: now + seconds, state: "pending" };
}

// Server-side answer. The server clock decides; a late accept is refused even if the client showed a live bar.
function respond(inv: Invite, accept: boolean, now: number): InviteState | "already-closed" {
  if (inv.state !== "pending") return "already-closed";
  if (now >= inv.expiresAt) {
    inv.state = "expired";
    return "expired";
  }
  inv.state = accept ? "accepted" : "declined";
  return inv.state;
}

// Server-side sweep: every invite past its time closes as expired (the donor's client sends decline on its timer).
function sweep(invites: Invite[], now: number): number {
  let closed = 0;
  for (const inv of invites) {
    if (inv.state === "pending" && now >= inv.expiresAt) {
      inv.state = "expired";
      closed += 1;
    }
  }
  return closed;
}

// Client display only: fraction of the bar still shown (the donor's progress = time left / window).
function drainFraction(inv: Invite, now: number, seconds: number = INVITE_SECONDS): number {
  return Math.max(0, Math.min(1, (inv.expiresAt - now) / seconds));
}

export {};
