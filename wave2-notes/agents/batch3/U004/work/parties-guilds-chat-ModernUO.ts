// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CAPACITY = 10;        // members plus pending invites
const INVITE_MS = 30_000;   // a pending invite expires after 30 s
const UPDATE_RANGE = 18;    // tiles, the server-wide update range
const REJOIN_MS = 1_000;    // donor RejoinTimer delay after login; it only resends the member list (no seat is restored); declared, unused

interface Player { id: string; map: number; x: number; y: number; party: Party | null; }

class Party {
  members: Player[] = [];
  candidates = new Map<string, number>(); // invitee id -> expiry (ms timestamp)
  constructor(public readonly leader: Player) {
    this.members.push(leader);
    leader.party = this;
  }
  get count(): number { return this.members.length + this.candidates.size; }
}

// Tile distance helper; the donor's InRange metric was not read.
function withinRange(a: Player, b: Player, range: number): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= range;
}

// Invite: refused if members plus pending invites already reach capacity (checked before targeting).
// A repeat invite to the same target resets that target's expiry.
function invite(p: Party, target: Player, now: number): boolean {
  if (p.count >= CAPACITY) return false;
  p.candidates.set(target.id, now + INVITE_MS);
  return true;
}

// Accept: counts the accepting candidate, so members + candidates must still fit capacity.
function accept(p: Party, from: Player, now: number): boolean {
  const expiry = p.candidates.get(from.id);
  if (expiry === undefined || now >= expiry) return false; // deviation: the donor has no expiry check here (race, see Gaps)
  if (p.count > CAPACITY) return false;
  p.candidates.delete(from.id);
  p.members.push(from);
  from.party = p;
  return true;
}

// Expiry pass: runs on each pending invite's own 30 s timer in the donor, not a shared sweep.
function expire(p: Party, now: number): void {
  for (const [id, expiry] of p.candidates) {
    if (now >= expiry) p.candidates.delete(id);
  }
  if (p.candidates.size === 0 && p.members.length === 1) {
    p.leader.party = null;
    p.members = [];
  }
}

// Stamina and mana changes go to other members in range; hits are not pushed by this path.
function broadcastStam(p: Party, changed: Player, send: (to: Player) => void): void {
  for (const m of p.members) {
    if (m !== changed && m.map === changed.map && withinRange(m, changed, UPDATE_RANGE)) send(m);
  }
}

// Logout removes the member at once (donor 177-184). There is no seat hold; the donor's login RejoinTimer only resends the member list.
function onLogout(p: Party, who: Player): void {
  p.members = p.members.filter(m => m !== who);
  who.party = null;
}

export {};
