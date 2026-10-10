// Licence: MIT (donor LICENSE). Adapted shape from src/sim/social/party.ts, written fresh here.
// clean-room
type Pid = number;
interface Invite { fromPid: Pid; expires: number }
interface Group {
  id: number;
  leader: Pid;
  members: Pid[];
  raid: boolean;
  sub: Map<Pid, 1 | 2>;
}
interface Unit { groupId: number | null; leaderPid: Pid; members: Pid[] }

const GROUP_CAP = 5;      // party cap (data in the real game: per activity)
const RAID_CAP = 10;      // raid cap
const SUB_SIZE = 5;       // raid subgroup size
const INVITE_WINDOW = 30; // sim seconds

class GroupMachine {
  groups = new Map<number, Group>();
  groupByPid = new Map<Pid, number>();
  invites = new Map<Pid, Invite>();
  nextId = 1;

  constructor(private readonly now: () => number) {}

  groupOf(pid: Pid): Group | null {
    const id = this.groupByPid.get(pid);
    return id === undefined ? null : (this.groups.get(id) ?? null);
  }

  capacity(g: Group | null): number {
    return g?.raid ? RAID_CAP : GROUP_CAP;
  }

  invite(from: Pid, target: Pid): string | null {
    const mine = this.groupOf(from);
    if (mine && mine.leader !== from) return 'only the leader may invite';
    if (mine && mine.members.length >= this.capacity(mine)) return 'group is full';
    if (this.groupOf(target)) return 'already grouped';
    const pending = this.invites.get(target);
    if (pending && pending.expires >= this.now()) return 'already has a pending invite';
    this.invites.set(target, { fromPid: from, expires: this.now() + INVITE_WINDOW });
    return null;
  }

  accept(pid: Pid): string | null {
    const inv = this.invites.get(pid);
    if (!inv || inv.expires < this.now()) return 'invitation expired';
    this.invites.delete(pid);
    if (this.groupOf(pid)) return 'already grouped';
    let g = this.groupOf(inv.fromPid);
    if (!g) g = this.newGroup(inv.fromPid);
    if (g.members.length >= this.capacity(g)) return 'group is full';
    this.addMember(g, pid);
    return null;
  }

  // Remove a pid. A group of one or none dissolves; a leaver who was leader is
  // replaced by the oldest remaining member (members[0]).
  remove(pid: Pid): void {
    const g = this.groupOf(pid);
    if (!g) return;
    g.members = g.members.filter((m) => m !== pid);
    g.sub.delete(pid);
    this.groupByPid.delete(pid);
    if (g.members.length <= 1) {
      for (const m of g.members) this.groupByPid.delete(m);
      this.groups.delete(g.id);
      return;
    }
    if (g.leader === pid) g.leader = g.members[0];
  }

  // Merge premade units into one group. Every unit is validated first and the
  // function returns null with NO writes if any check fails.
  formMerged(units: Unit[], raid: boolean): Group | null {
    const seen = new Set<Pid>();
    let total = 0;
    for (const u of units) {
      for (const pid of u.members) {
        if (seen.has(pid)) return null;
        seen.add(pid);
      }
      total += u.members.length;
      if (u.groupId === null) {
        if (u.members.length !== 1 || u.members[0] !== u.leaderPid) return null;
        if (this.groupOf(u.leaderPid)) return null;
      } else {
        const g = this.groups.get(u.groupId);
        if (!g || g.leader !== u.leaderPid || g.members.length !== u.members.length) return null;
        if (!u.members.every((p) => g.members.includes(p))) return null;
      }
    }
    if (total < 2 || total > (raid ? RAID_CAP : GROUP_CAP)) return null;

    // Validation passed: writes start here.
    const base = units.find((u) => u.groupId !== null) ?? units[0];
    let g = base.groupId !== null ? (this.groups.get(base.groupId) ?? null) : null;
    if (!g) g = this.newGroup(base.leaderPid);
    if (raid && !g.raid) {
      g.raid = true;
      this.renumber(g);
    }
    for (const u of units) {
      if (u === base) continue;
      if (u.groupId !== null) this.groups.delete(u.groupId); // dissolve silently
      for (const pid of u.members) this.addMember(g, pid);
    }
    return g;
  }

  private newGroup(leader: Pid): Group {
    const g: Group = { id: this.nextId++, leader, members: [leader], raid: false, sub: new Map([[leader, 1 as const]]) };
    this.groups.set(g.id, g);
    this.groupByPid.set(leader, g.id);
    return g;
  }

  private addMember(g: Group, pid: Pid): void {
    g.members.push(pid);
    g.sub.set(pid, this.nextSub(g));
    this.groupByPid.set(pid, g.id);
  }

  private nextSub(g: Group): 1 | 2 {
    const sub1 = g.members.filter((m) => (g.sub.get(m) ?? 1) === 1).length;
    return sub1 < SUB_SIZE ? 1 : 2;
  }

  private renumber(g: Group): void {
    g.sub.clear();
    g.members.forEach((m, i) => g.sub.set(m, i < SUB_SIZE ? 1 : 2));
  }
}

export {};
