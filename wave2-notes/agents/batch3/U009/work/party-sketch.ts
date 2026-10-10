// Licence: BSD-2-Clause (donor, permissive). Written from the described mechanism, not a line-by-line translation.
// clean-room
type Serial = number;
interface PartyView { leader: Serial | null; inviter: Serial | null; slots: (Serial | null)[]; }

const PARTY_SIZE = 10;     // donor PARTY_SIZE = 10 (PartyManager.cs:16)
const POLL_MS = 250;       // donor poll cadence (WorldMapEntityManager.cs:211)
const TRUST_MS = 10000;    // donor packet trust window (WorldMapEntityManager.cs:105)
const STALE_MS = 2000;     // donor: LastUpdate = now + 1000 and sweep removes when LastUpdate < now - 1000

function emptyParty(): PartyView {
  return { leader: null, inviter: null, slots: new Array<Serial | null>(PARTY_SIZE).fill(null) };
}

// A roster packet replaces the whole roster. `removed` is set only for a removal packet.
// Removing yourself, or the slot-0 member, clears the party. A removal that leaves <= 1 member dissolves it.
function applyRoster(serials: Serial[], removed: Serial | null, me: Serial): PartyView {
  if (serials.length <= 1) return emptyParty();
  if (removed !== null && (removed === me || removed === serials[0])) return emptyParty();

  const view = emptyParty();
  let kept = 0;
  serials.forEach((s, i) => {
    if (s === removed) return;           // slot stays null; later slots do not shift
    if (i < PARTY_SIZE) view.slots[i] = s;
    kept++;
  });
  if (removed !== null && kept <= 1) return emptyParty();
  view.leader = serials[0];              // first serial in the roster is the leader
  return view;
}

// Accept is only possible when an invite is pending and no leader is set.
function canAccept(v: PartyView): boolean {
  return v.inviter !== null && v.leader === null;
}

interface MemberView { serial: Serial; inView: boolean; }   // inView: a live mobile within view range

// One poll per POLL_MS. The guild query always goes out; at most ONE party-position query per poll,
// aimed at the first member that is not visible locally.
function pollPlan(now: number, nextAllowedAt: number, enabled: boolean, v: PartyView, members: MemberView[]):
  { send: boolean; guildQuery: boolean; partyQueryFor: Serial | null; nextAllowedAt: number } {
  if (!enabled || now < nextAllowedAt) return { send: false, guildQuery: false, partyQueryFor: null, nextAllowedAt };
  let partyQueryFor: Serial | null = null;
  if (v.leader !== null) {
    for (const m of members) {
      if (!m.inView) { partyQueryFor = m.serial; break; }
    }
  }
  return { send: true, guildQuery: true, partyQueryFor, nextAllowedAt: now + POLL_MS };
}

// Map markers. A server packet opens a trust window; local updates are accepted only inside it.
class MapMarkers {
  private lastSeen = new Map<Serial, number>();
  private trustUntil = -Infinity;
  private nextSweepAt = 0;

  packetUpdate(serial: Serial, now: number): void {
    this.trustUntil = now + TRUST_MS;
    this.lastSeen.set(serial, now);
  }

  localUpdate(serial: Serial, now: number): boolean {
    if (now > this.trustUntil) return false;   // no recent server packet: ignore the local guess
    this.lastSeen.set(serial, now);
    return true;
  }

  // Runs at most once per second, drops anything not seen for STALE_MS.
  sweep(now: number): void {
    if (now < this.nextSweepAt) return;
    this.nextSweepAt = now + 1000;
    for (const [serial, seen] of this.lastSeen) {
      if (now - seen > STALE_MS) this.lastSeen.delete(serial);
    }
  }

  has(serial: Serial): boolean { return this.lastSeen.has(serial); }
}

export {};
