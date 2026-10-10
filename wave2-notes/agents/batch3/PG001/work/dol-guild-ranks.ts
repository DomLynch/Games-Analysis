// Clean-room sketch: guild rank ladder with per-rank permission flags, one permission check, and per-recipient chat hear checks.
// Donor licence: GNU GPL version 2 or any later version (Dawn of Light header, GameServer/gameutils/Guild.cs). Written from the described mechanism; no donor lines copied.
// clean-room
type Perm =
  | "emblem" | "acHear" | "acSpeak" | "demote" | "promote" | "gcHear" | "gcSpeak"
  | "invite" | "ocHear" | "ocSpeak" | "remove" | "alli" | "view" | "claim" | "upgrade"
  | "release" | "buff" | "dues" | "withdraw";

type Ladder = Partial<Record<Perm, boolean>>;

interface Rank {
  level: number;   // 0 is the leader level
  title: string;
  perms: Ladder;
}

const JOIN_LEVEL = 9;

// Each level gets everything the levels above it get, plus its own additions (a superset ladder).
function defaultLadder(level: number): Ladder {
  const p: Ladder = { gcHear: true };
  if (level < 9) { p.gcSpeak = true; p.view = true; }
  if (level < 8) p.emblem = true;
  if (level < 7) p.acHear = true;
  if (level < 6) p.acSpeak = true;
  if (level < 5) p.ocHear = true;
  if (level < 4) p.ocSpeak = true;
  if (level < 3) { p.invite = true; p.promote = true; }
  if (level < 2) { p.release = true; p.upgrade = true; p.claim = true; }
  if (level < 1) { p.remove = true; p.alli = true; p.dues = true; p.withdraw = true; p.buff = true; }
  return p;
}

class GuildRanks {
  private online = new Map<string, { rank: Rank | null; staff: boolean }>();

  constructor(private ranks: Rank[]) {}

  rankByLevel(level: number): Rank | undefined {
    return this.ranks.find(r => r.level === level);
  }

  join(name: string, staff: boolean): boolean {
    const rank = this.rankByLevel(JOIN_LEVEL) ?? null;
    if (this.online.has(name)) return false;
    this.online.set(name, { rank, staff });
    return true;
  }

  // One check for every guild action. Offline players fail; staff pass; otherwise the rank's flag decides.
  hasPerm(name: string, need: Perm | "leader"): boolean {
    const m = this.online.get(name);
    if (!m) return false;
    if (m.staff) return true;
    if (!m.rank) return false;
    if (need === "leader") return m.rank.level === 0;
    // As in the donor: there is no separate demote flag, so demote is gated by promote.
    const flag: Perm = need === "demote" ? "promote" : need;
    return m.rank.perms[flag] === true;
  }

  // Guild chat: the sender needs speak; each online member then needs hear, checked one by one.
  guildChatRecipients(sender: string): string[] {
    if (!this.hasPerm(sender, "gcSpeak")) return [];
    return [...this.online.keys()].filter(n => this.hasPerm(n, "gcHear"));
  }
}

export {};
