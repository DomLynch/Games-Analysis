// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PlayerId = number;

interface Group { leader: PlayerId; members: Set<PlayerId> }
interface Invite { inviter: PlayerId; expiresAt: number }

const MAX_GROUP_SIZE = 6;            // server setting: max group size (default 6)
const INVITE_TIMEOUT_MS = 31_000;    // server-side expiry of a pending invite
const PRESENTED_TIMEOUT_MS = 30_000; // countdown the invitee is shown (1 s less, for latency)

class PartySketch {
  private groupOf = new Map<PlayerId, Group>();
  private invites = new Map<PlayerId, Invite>();     // one pending invite per invitee
  private outstanding = new Map<PlayerId, number>(); // pending invites per inviter

  constructor(private now: () => number) {}

  // Returns an error message, or null when the invite was sent.
  invite(inviter: PlayerId, invitee: PlayerId): string | null {
    const g = this.groupOf.get(inviter);
    if (g && g.leader !== inviter) return "only the leader can invite";
    if (g && g.members.has(invitee)) return "already in your group";
    if (this.invites.has(invitee)) return "invitee already has a pending invite";
    const size = (g ? g.members.size : 1) + (this.outstanding.get(inviter) ?? 0);
    if (size >= MAX_GROUP_SIZE) return "group size limit reached";
    this.invites.set(invitee, { inviter, expiresAt: this.now() + INVITE_TIMEOUT_MS });
    this.bump(inviter, +1);
    return null;
  }

  // Called once per tick by the server clock; expired invites are dropped.
  expire(): PlayerId[] {
    const t = this.now();
    const timedOut: PlayerId[] = [];
    for (const [invitee, inv] of this.invites) {
      if (inv.expiresAt > t) continue;
      this.invites.delete(invitee);
      this.bump(inv.inviter, -1);
      timedOut.push(invitee);
    }
    return timedOut;
  }

  accept(invitee: PlayerId): void {
    const inv = this.invites.get(invitee);
    if (!inv) return;
    this.invites.delete(invitee);
    this.bump(inv.inviter, -1);
    this.join(inv.inviter, invitee);
  }

  private join(leader: PlayerId, newMember: PlayerId): void {
    this.leave(newMember);
    let g = this.groupOf.get(leader);
    if (g && g.leader !== leader) {  // a member who is not the leader cannot lead: leave first
      this.leave(leader);
      g = undefined;
    }
    if (!g) {
      g = { leader, members: new Set([leader]) };
      this.groupOf.set(leader, g);
    }
    g.members.add(newMember);
    this.groupOf.set(newMember, g);
  }

  leave(member: PlayerId): void {
    const g = this.groupOf.get(member);
    if (!g) return;
    this.groupOf.delete(member);
    if (g.leader === member) {       // leader leaves: the whole group is disbanded
      for (const m of g.members) this.groupOf.delete(m);
      return;
    }
    g.members.delete(member);
    if (g.members.size === 1) {      // last member left besides the leader: disband
      for (const m of g.members) this.groupOf.delete(m);
    }
  }

  kick(kicker: PlayerId, target: PlayerId): string | null {
    const g = this.groupOf.get(target);
    if (!g) return "target is not in a group";
    if (g.leader !== kicker) return "only the leader can remove members";
    if (target === kicker) return "you can't kick yourself";
    this.leave(target);
    return null;
  }

  assignLeader(from: PlayerId, to: PlayerId): string | null {
    const g = this.groupOf.get(to);
    if (!g) return "target is not in a group";
    if (g.leader !== from) return "only the leader can hand over leadership";
    g.leader = to;
    return null;
  }

  private bump(inviter: PlayerId, delta: number): void {
    const n = (this.outstanding.get(inviter) ?? 0) + delta;
    if (n <= 0) this.outstanding.delete(inviter);
    else this.outstanding.set(inviter, n);
  }
}

export {};
