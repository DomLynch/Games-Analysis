// Licence: GPL-2.0-or-later (per the L1Party.java header; COPYING is the GPL v2 text). Clean-room sketch from the described mechanism, not a translation of the donor.
const MAX_PT = 8;             // data field: altsettings MaxPT (default 8)
const INVITE_RANGE_TILES = 5; // data field: invite distance (donor limit is 5)

type PartyEvent =
  | { kind: "hp"; of: number; pct: number }   // mini HP meter, 0..100
  | { kind: "clear"; of: number }             // meter removed
  | { kind: "notice"; code: 418 | 419 | 420; name: string };

interface Player {
  id: number; name: string; mapId: number; x: number; y: number;
  isGm: boolean; hp: number; maxHp: number;
  party: Party | null;
  pendingFrom: number; // one pending invite slot (donor partyID); 0 = none
}

type InviteResult = "sent" | "ignored" | "target-in-party" | "not-leader";
type AcceptResult = "joined" | "new-party" | "party-full" | "no-invite";

const hpPct = (p: Player): number => Math.floor((100 * p.hp) / p.maxHp);

class Party {
  private members: Player[] = [];
  private leader: Player | null = null;

  constructor(private readonly cap: number, private readonly emit: (to: Player, e: PartyEvent) => void) {}

  vacancy(): boolean { return this.members.length < this.cap; }
  isLeader(p: Player): boolean { return this.leader === p; }

  // donor addMember: a full party refuses unless the leader is a GM; a duplicate is refused; both silently
  add(p: Player): "added" | "ignored" {
    if ((this.members.length === this.cap && !this.leader?.isGm) || this.members.includes(p)) return "ignored";
    if (this.members.length === 0) this.leader = p;
    const others = [...this.members];
    this.members.push(p);
    p.party = this;
    for (const m of others) { // meters both ways, as createMiniHp
      this.emit(p, { kind: "hp", of: m.id, pct: hpPct(m) });
      this.emit(m, { kind: "hp", of: p.id, pct: hpPct(p) });
    }
    return "added";
  }

  // donor removeMember: drop, clear party link, clear meters both ways (no notices here)
  private remove(p: Player): void {
    if (!this.members.includes(p)) return;
    this.members = this.members.filter((m) => m !== p);
    p.party = null;
    for (const m of this.members) {
      this.emit(p, { kind: "clear", of: m.id });
      this.emit(m, { kind: "clear", of: p.id });
    }
  }

  // donor leaveMember: leader leaving disbands everyone (418); with two members both leave; else 420 to all
  leave(p: Player): void {
    if (this.isLeader(p)) {
      for (const m of [...this.members]) { this.remove(m); this.emit(m, { kind: "notice", code: 418, name: p.name }); }
      return;
    }
    if (this.members.length === 2 && this.leader) {
      const l = this.leader;
      this.remove(p); this.remove(l);
      this.emit(p, { kind: "notice", code: 420, name: p.name });
      this.emit(l, { kind: "notice", code: 420, name: p.name });
      return;
    }
    const others = [...this.members];
    this.remove(p);
    for (const m of others) this.emit(m, { kind: "notice", code: 420, name: p.name });
    this.emit(p, { kind: "notice", code: 420, name: p.name });
  }

  // donor kickMember: two-member rule as leave, kicked member gets 419; no notice to the leader in the two-member case
  kick(p: Player): void {
    if (this.members.length === 2 && this.leader) { const l = this.leader; this.remove(p); this.remove(l); }
    else this.remove(p);
    this.emit(p, { kind: "notice", code: 419, name: p.name });
  }
}

// donor C_CreateParty: same map, within range, target not in a party, only the leader of a party may invite
function invite(from: Player, to: Player, dist: (a: Player, b: Player) => number): InviteResult {
  if (from.id === to.id || from.mapId !== to.mapId || dist(from, to) > INVITE_RANGE_TILES) return "ignored";
  if (to.party) return "target-in-party";
  if (from.party && !from.party.isLeader(from)) return "not-leader";
  to.pendingFrom = from.id; // overwrites any earlier pending invite
  return "sent";
}

// donor C_Attr accept: the inviter's party takes the accepter if it has room or the inviter is a GM; else a new party
// simplified note: a silent refusal in Party.add (GM inviter, non-GM leader, full party) is reported here as "party-full"
function accept(acc: Player, inviter: Player | undefined): AcceptResult {
  if (!inviter) return "no-invite";
  if (inviter.party) {
    if (!(inviter.party.vacancy() || inviter.isGm)) return "party-full";
    return inviter.party.add(acc) === "added" ? "joined" : "party-full";
  }
  const p = new Party(MAX_PT, () => {});
  p.add(inviter);
  p.add(acc);
  return "new-party";
}
export { Party, invite, accept, MAX_PT };
