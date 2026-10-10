// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Id = string;

interface Member {
  id: Id;
  realm: number;
  inCombat: boolean;
  autoSplitLoot: boolean;     // per-player opt-out for item autosplit
  hasRoomFor(item: string): boolean;
}

interface Rules {
  maxMembers: number;         // donor default 8, a server property
  positionIntervalMs: number; // donor default 2500
}

class Party {
  private members: Member[] = [];
  private pending = new Map<Id, Id>(); // invitee -> inviter, one-shot
  private lastMapUpdate = 0;
  leader: Id | null = null;

  constructor(private rules: Rules, leader: Member) {
    this.members.push(leader);
    this.leader = leader.id;
  }

  roster(): readonly Member[] { return this.members; }

  // Only the leader invites. Realm/consent rules come in through canGroup.
  invite(inviter: Id, invitee: Member, canGroup: (a: Id, b: Member) => boolean): boolean {
    if (this.leader !== inviter) return false;
    if (this.members.length >= this.rules.maxMembers) return false;
    if (!canGroup(inviter, invitee)) return false;
    this.pending.set(invitee.id, inviter);
    return true;
  }

  // Accept checks the pending invite (consumed once), combat, capacity, and the add result.
  accept(invitee: Member, inviter: Id): boolean {
    if (this.pending.get(invitee.id) !== inviter) return false;
    this.pending.delete(invitee.id);
    if (invitee.inCombat) return false;
    if (this.members.length >= this.rules.maxMembers) return false;
    this.members.push(invitee);
    return true;
  }

  // Leader leaves: next member takes over. Two members left: the party dissolves.
  leave(id: Id): void {
    const i = this.members.findIndex((m) => m.id === id);
    if (i < 0) return;
    this.members.splice(i, 1);
    if (this.members.length === 1) {
      this.members = [];          // a lone member is removed too
      this.leader = null;
      return;
    }
    if (this.leader === id && this.members.length > 0) this.leader = this.members[0].id;
  }

  // Coins: each eligible member gets ceil(total / n). Eligibility is decided by the caller.
  splitCoins(total: number, eligible: Member[]): Map<Id, number> {
    const out = new Map<Id, number>();
    if (eligible.length === 0) return out;
    const share = Math.ceil(total / eligible.length);
    for (const m of eligible) out.set(m.id, share);
    return out;
  }

  // Items: random pick among eligible members with room; a full pack is dropped from the pool.
  pickItemRecipient(item: string, eligible: Member[], rand: (n: number) => number): Member | null {
    const pool = eligible.filter((m) => m.autoSplitLoot);
    while (pool.length > 0) {
      const k = rand(pool.length);
      const m = pool[k];
      if (m.hasRoomFor(item)) return m;
      pool[k] = pool[pool.length - 1];
      pool.pop();
    }
    return null;
  }

  // Party map: one update per interval, from a timestamp (fixed interval, no catch-up loop).
  mapUpdateDue(nowMs: number): boolean {
    if (this.leader === null) return false;
    if (nowMs - this.lastMapUpdate < this.rules.positionIntervalMs) return false;
    this.lastMapUpdate = nowMs;
    return true;
  }
}

export {};
