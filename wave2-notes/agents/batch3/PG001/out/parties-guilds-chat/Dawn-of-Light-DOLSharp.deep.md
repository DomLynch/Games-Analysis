# Dawn-of-Light-DOLSharp (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Guild.cs` (with `GuildMgr.cs`, `commands/playercommands/guildchat.cs` and `guild.cs` as callers) | Licence: GNU General Public License, version 2 "or (at your option) any later version" (header of `Guild.cs`; repository `gplheader.txt`) | C# | symbol `HasRank`

Checked: Read `Guild.cs` 36-75 (rank enum), 585-700 (`AddPlayer`, `RemovePlayer`, start of `HasRank`), 700-815 (the permission switch, the Leader check, `GetRankByID`) and 822-846 (`SendMessageToGuildMembers`). Read `GuildMgr.cs` 250-341 (the default rank ladder, `CreateRank`). Read `GuildRank.cs` by grep of its public members (the full field list; no `Demote` member). Read `Guild.cs` table size at `DOLDatabase/Tables/Guild.cs` 63. Read `guildchat.cs` 25-145 (guild, officer, alliance chat). Read `guild.cs` 2640-2672 (the rank-level edit) and grepped every `HasRank(` call site in `GameServer` (bodies not read beyond those quoted). Not read: `IsSpammingCommand` (the 500 argument's meaning), `Guild.cs` 75-585 and 850-1042, and the flag-editing commands. Party and group formation (`Group.cs`, `GroupMgr.cs`) was NOT read: the cell's hint pointed at `Guild.cs`, so this note covers guild ranks and permissions only. Confidence: high on the permission check and the default ladder (read end to end, callers grepped); high on the rank-level edit gap (read the whole command branch).

Best transferable idea: Store one ladder of ranks by level, where each level is a superset of the level below, and gate every guild action through one server-side permission check that reads the rank's flag, with the leader defined as level 0 and chat hearing checked per recipient.
Decision (proposed): adapt - keep the one permission check, the superset ladder as data and the per-recipient hear check; give Demote its own flag rather than the donor's Promote alias, and add a server guard that keeps exactly one level-0 rank.
Acceptance: A server test where a rank-2 officer (default ladder: invite and promote, no remove) can invite but not remove a member; a new member (rank 9) can hear guild chat but a `/gu` send is refused; a leader edit that would leave no level-0 rank (or two) is refused with a message.

## 1. Mechanism

- Ranks: a guild holds an array of 10 rank rows, levels 0 to 9 (`DOLDatabase/Tables/Guild.cs` 63). Each row has a level byte (`GuildRank.cs` 117) and boolean flags for Emblem, AcHear, AcSpeak, GcHear, GcSpeak, OcHear, OcSpeak, Invite, Promote, Remove, View, Claim, Upgrade, Release, Dues, Withdraw, Alli and Buff (the members of `GuildRank.cs`, checked by grep). Note there is no Demote member.
- Default ladder (`GuildMgr.cs` `CreateRank`, 261-341): each level is a superset of the level below. Level 9 gets GcHear only (269). Levels below 9 add GcSpeak and View (285-288). Below 8: Emblem. Below 7: AcHear. Below 6: AcSpeak. Below 5: OcHear. Below 4: OcSpeak. Below 3: Invite and Promote (306-307). Below 2: Release, Upgrade, Claim. Level 0 only: Remove, Alli, Dues, Withdraw, Buff (316-321), and the title "Guildmaster" (320).
- Joining: `AddPlayer(player)` puts the player at rank level 9 (589). It refuses when the player is null or already has a guild (600). The rank object is stored on the player and saved (611-613).
- Permission check, `HasRank(member, needed)` (669-791), in order: (a) the member must be in the guild's online list, else false (674); (b) a player with account privilege above 1 passes every check (681-682); (c) a member with no rank row is refused (684-690); (d) the leader permission is "rank level is 0" (768); (e) every other permission returns the matching flag of the member's rank (692-783); (f) an unknown permission logs and returns false (774-782).
- The Demote case returns the Promote flag (706-708; the Promote case at 710-712 also returns Promote). Demote has no flag of its own.
- Rank lookup by level: `GetRankByID(index)` returns the first row whose level equals the index, or null (798-815).
- Guild chat (`guildchat.cs`): `/gu` requires the sender's GcSpeak (40), has a 500 argument to the spam helper (46), then sends through `SendMessageToGuildMembers` (53). That broadcast checks GcHear for each online member, one by one (`Guild.cs` 833-846, check at 839). Officer chat (`/o`, 73-93) requires OcSpeak for the sender and OcHear for each recipient (88). Alliance chat (119-142) requires AcSpeak for the sender and AcHear for each recipient in each allied guild (136). Chat channels are therefore just permission pairs (speak and hear) on the same ladder.
- Leader rank-level edit (`guild.cs` 2656-2668): gated by the Leader check (2658), then `GetRankByID(number).RankLevel = lvl` (2666) with `lvl` from `Convert.ToByte` (2665). No duplicate-level check and no check that a level-0 rank remains.
- Callers: `HasRank` is called from every guild command (invite 398, remove 460/546/1678, promote 1265, demote 1411, alliance 1884-2074, release 2130, upgrade 2233, dues 2279, withdraw 2356, view 2800, claim 2822, plus leader-only actions), from guild chat, from housing (`House.cs` 1310, `HouseMgr.cs` 573, 678) and from keeps (`AbstractGameKeep.cs` 616).
- Timing: none. Checks run when the command or message arrives.

## 2. Key functions

- `Guild.HasRank`: `Guild.cs` 669-791 (membership, staff bypass, rank flag switch, leader rule).
- `Guild.GetRankByID`: `Guild.cs` 798-815.
- `Guild.SendMessageToGuildMembers`: `Guild.cs` 833-846 (per-recipient GcHear).
- `Guild.AddPlayer`: `Guild.cs` 598-627 (refusal, rank assignment; the default join call is 587-590).
- `GuildMgr.CreateRank`: `GuildMgr.cs` 261-341 (the superset ladder).
- Guild chat and officer and alliance handlers: `commands/playercommands/guildchat.cs` 30-143.
- Rank-level edit: `commands/playercommands/guild.cs` 2656-2668.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One permission check with a flag per action | 20 permission keys (theirs, `Guild.cs` 40-62; Demote has no column). |
| Superset ladder by level | 10 levels, 0 to 9 (theirs, `DOLDatabase/Tables/Guild.cs` 63; ladder thresholds 9, 8, 7, 6, 5, 4, 3, 2, 1 at `GuildMgr.cs` 285-314). |
| Default join level | 9, the lowest rank (theirs, `Guild.cs` 589). |
| Leader rule | Level 0 (theirs, `Guild.cs` 768). |
| Staff bypass | Privilege above 1 (theirs, `Guild.cs` 681). |
| Chat spam window argument | 500 (theirs, `guildchat.cs` 46, 79); the helper's unit and semantics not read. |
| Level field type | C# `byte` (theirs, `GuildRank.cs` 117); the level-edit path converts input with `Convert.ToByte` (`guild.cs` 2665) and has no range check beyond that. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for a permission check: online membership, then the staff bypass, then the rank row (refused if missing), then leader as level 0, then the flag, with Demote aliased to Promote as the donor does. The chat check is speak for the sender, then hear for each online recipient. It omits the database writes (`SaveIntoDatabase`, the guild-wide player list), the rank titles, the leader's level-edit command, the officer and alliance channels (same shape with other flag pairs), the spam window, the locking around the member list, and the removal path. The sketch's join refuses only when the player is already online; the donor refuses when the player already has a guild. The sketch takes the rank row from the caller's ladder instead of a database.

```ts
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
```

Typecheck: the block above with `export {}` appended, run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/guild-ranks.ts` (new, proposed): the rank ladder and the one permission check, on the server. Guild chat channels use the same check. The client only shows what the server allows.
- Parity row: none. No row of 1-23 covers guilds, ranks or chat permissions, so the parity row is "none". The closest-looking row (17, death and respawn) is not a fit and is not used.
Reuse tag: rewrite-from-idea (GPL version 2 or later; clean-room only)
Brief rule served: one ledger (ranks and flags are server rows, not client state); server-verified (every guild action is checked on the server); zones as data (the ladder is data, not code). MAX_ATTACKERS = 3 and the fight engine: not applicable.

## 6. Gaps and risks

- GPL version 2 or later (copyleft): clean-room only. The sketch is written from the mechanism, not translated.
- Demote has no permission column. It reads the Promote flag (`Guild.cs` 706-708). Probably deliberate because the table has no Demote member, but no comment says so. Frankendom should give demote its own flag.
- The leader rank-level edit has no guard (`guild.cs` 2656-2668). A leader can set any rank's level, so two rows can share level 0 (two leaders) or none can (no leader). `GetRankByID` returns the first match (`Guild.cs` 804), so a duplicate silently hides one row. Frankendom must check that exactly one level-0 rank exists before saving.
- Staff bypass is silent and total: privilege above 1 passes every check (`Guild.cs` 681-682), including leader-only actions such as rank edits and housing. Frankendom should make a staff override an explicit, logged action, not a default.
- Membership is the online list (`Guild.cs` 674). An offline member has no permissions at all. That is correct for live commands; I did not read when the online list is filled.
- Permissions are per rank only. The donor has no per-member grant (not in the code read).
- The per-recipient hear checks (`Guild.cs` 839, `guildchat.cs` 88, 136) run one rank lookup per member per message. Guild size is bounded in practice; I found no cap in the code read.
- Party and group formation (`GameServer/gameutils/Group.cs`, `GroupMgr.cs`) was not read. It needs its own cell.
- Not read: `IsSpammingCommand` (the 500 argument's unit), `Guild.cs` 75-585 and 850-1042, the flag-editing commands, and the house and keep bodies that call `HasRank`.
