# Dawn-of-Light-DOLSharp (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Group.cs` (with `gameutils/BattleGroup.cs`, `gameutils/GroupMgr.cs`, `gameutils/Alliance.cs`, `packets/Client/168/InviteToGroupHandler.cs`, `packets/Client/168/DialogResponseHandler.cs`, `commands/playercommands/invite.cs`, `serverproperty/ServerProperties.cs`) | Licence: GPL-2.0 per the repo `LICENSE` file (Version 2, June 1991); file headers read as "either version 2 ... or any later version" (BattleGroup.cs 1-18); copyleft, clean-room only | C# | symbol `Group.AddMember` / `Group.RemoveMember` / `Group.MakeLeader`

Checked: cell 3 is row 3 of `cells-D002.tsv` (category_no 18, list 12, hint: groups, battlegroups, guilds, alliances). Read in full: `Group.cs` 31-112 and 144-338 (the autosplit property bodies 113-143 and the messaging and UI helpers 339-493 were not read); `BattleGroup.cs` 1-236 (whole file); `GroupMgr.cs` 1-97 (registry and looking-for-group list); `Alliance.cs` 29-178 (membership and disband); `InviteToGroupHandler.cs` 40-93; `DialogResponseHandler.cs` 205-244; `invite.cs` 90-115 (GM path); `ServerProperties.cs` 525-532 (property lines). Candidates opened: 8 files (the 7 above plus `ServerProperties.cs`, property lines only). Grep only: `StandardMobBrain.cs` 969-1000 (victim lists read `group.MemberCount` and `bg.PlayerCount`; not read in full). Not read: `Guild.cs` (1042 lines; only grep for the alliance link), `ChatGroup.cs`, the group XP and loot share in `AbstractServerRules.cs`, the consumers of the battlegroup loot type and treasurer, the battlegroup commands except for the size constant. Confidence: high on the party roster lifecycle (read and traced line by line; the two-member dissolve path traced through the recursive call at 245-249); medium on the alliance half (read, but guild side not read). Camera scope: not a camera cell.

Best transferable idea: A party is a join-ordered roster with a hard size cap, invites only from its leader, and when one member would be left the party dissolves with that member, while a leader who leaves hands leadership to the first remaining player in join order.
Decision (proposed): adapt - take the join-order roster, the leader succession and the dissolve-at-one rule, which are simple server state; set the cap as data; keep the party size (8) separate from the fight rule MAX_ATTACKERS = 3, because a full party cannot all attack one target.
Acceptance: a server test asserts that in a party of three the leader leaving makes the earliest-joined remaining player leader and keeps the party; in a party of two either member leaving removes both and deletes the party; joining a party already at its cap is refused with "full"; accepting an invite while in PvE combat is refused.

## 1. Mechanism

- A party is a `Group`: a leader (`LivingLeader`) and an ordered member list (`m_groupMembers`) whose capacity is `GROUP_MAX_MEMBER` (`Group.cs` 50). The constructor sets the leader but does not add the leader to the members (49). Parties are registered in `GroupMgr` (`AddGroup` 47, `RemoveGroup` 58).
- Creating a party happens when an invite is accepted (`DialogResponseHandler.cs` 205-243). If the joiner is already grouped, refused (208-212). If `IsAllowedToGroup` says no, refused (213). If the joiner is in PvE combat, refused (217-221). If the inviter has a party: refused unless the inviter is its leader (224), refused when `MemberCount >= GROUP_MAX_MEMBER` (225-229), otherwise `AddMember(joiner)` (230). If the inviter has no party: new `Group(leader)` (235), registered (236), leader added (238), joiner added (239).
- Inviting (`InviteToGroupHandler.cs` 42-90): if the inviter is in a party, only its leader can invite (63-67); a full party refuses (69-73); a target who is already grouped is refused (78-82). The GM path (`invite.cs` 95-109) creates the party with the GM first, or adds to the existing one with no leader check; the size cap is enforced only inside `AddMember`, and the return value is not checked (108).
- `AddMember` (`Group.cs` 180-208), under a freeze: refuse if `Count >= GROUP_MAX_MEMBER` or `Count >= 254` (183); refuse a duplicate (186-187); append; set `living.Group` and `GroupIndex = Count - 1` (190-191), so the index is join order. Then UI updates and a join message.
- `RemoveMember` (215-272), in order: `TryRemove` (217); if the party is empty, disband (220-221); clear the leaver's group and index; send messages; if exactly one member is left, remove that member too (245-249), which empties the party and disbands it through the same method; if two or more remain and the leaver was the leader (252), the new leader is the first remaining `GamePlayer` in list order (254-258), or the first living if no player remains (264); reindex (268).
- `DisbandGroup` (277-286): remove from `GroupMgr`, expire any mission, clear the leader and the member list.
- `MakeLeader` (304-328): if the target is in the party, swap the target into slot 0 and the old leader into the target's slot (310-316), set `LivingLeader` (314), announce (324).
- Battlegroup (`BattleGroup.cs` 27-236): a set of players, each with a leader flag (`AddBattlePlayer` 77-95 stores it at 90). Duplicate refused (82-83). Joining sets `player.isInBG` (92). No size check is made in `AddBattlePlayer`; `BATTLEGROUP_MAX_MEMBER` (default 64) is used as a `StringBuilder` capacity in `commands/playercommands/battlegroup.cs` (171, 249, 329), and grep found no other use, so it is not enforced anywhere the grep covered. Loot: a loot type flag, a threshold that must be 0 to 50 (`SetBGLootTypeThreshold` 120-133: out of range sets 0 and returns false), and a treasurer (`SetBGTreasurer` 153-173). The consumers of these were not read.
- Battlegroup removal (`RemoveBattlePlayer` 207-234): refuse a non-member (212); remove and clear the flag (231); when one player is left, remove that player too (221-228).
- Alliance (`Alliance.cs` 62-112): a guild joins by setting `alliance` and `AllianceId` and adding itself (66-67). When the alliance's leader guild (`DBguildleader`) leaves, every other guild is removed and the alliance object is deleted (85-100). Other guilds leaving only save (103-106). The guild side was not read.

## 2. Key functions

- `Group.AddMember`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Group.cs` 180-208. Cap, duplicate check, join-order index.
- `Group.RemoveMember`: same file 215-272. Empty, one-left and leader-succession order.
- `Group.DisbandGroup` and `Group.MakeLeader`: same file 277-286 and 304-328.
- Invite and accept gates: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/packets/Client/168/InviteToGroupHandler.cs` 42-90 and `DialogResponseHandler.cs` 205-244.
- `BattleGroup.AddBattlePlayer` and `RemoveBattlePlayer`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/BattleGroup.cs` 77-95 and 207-234.
- `Alliance.RemoveGuild`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Alliance.cs` 78-112.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (default in code) |
|---|---|
| Hard cap on the roster | `GROUP_MAX_MEMBER` 8 (`ServerProperties.cs` 531-532; checks at `Group.cs` 183 and `DialogResponseHandler.cs` 225); absolute ceiling 254 (`Group.cs` 183) |
| Dissolve when one member is left | Threshold 1 (`Group.cs` 245-249) |
| Leader succession: first remaining player in join order | `OfType<GamePlayer>().First()` (`Group.cs` 254) |
| Battlegroup size | `BATTLEGROUP_MAX_MEMBER` 64 declared (`ServerProperties.cs` 525-526), not enforced |
| Battlegroup loot threshold range | 0 to 50 (`BattleGroup.cs` 124-127) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for removal (remove, then dissolve at one remaining member, then leader succession to the first remaining player), and for the invite and accept gates it keeps the leader-only invite and the in-party and in-combat refusals. It omits the donor's `IsAllowedToGroup` rule, the target-already-grouped refusal on invite, the GM path, the message and UI updates, the mission expiry, the registry (`GroupMgr`), the `GroupIndex` bookkeeping (the sketch uses array order), and the freeze/lock. The sketch's `makeLeader` swap is the donor's slot swap. The sketch's `maxMembers` is data; the donor's 8 is a server property.

```ts
// Licence: GPL-2.0 (donor, DOLSharp LICENSE; file headers GPL-2.0-or-later). Clean-room sketch of the mechanism, not a translation.
interface Member {
  id: string;
  isPlayer: boolean;
}

interface Party {
  leaderId: string | null;
  members: Member[];        // join order; index 0 is not always the leader (donor MakeLeader swaps)
  maxMembers: number;       // GROUP_MAX_MEMBER, 8 (zone or engine data)
}

// Who may invite: the leader, when the inviter is in a party (donor InviteToGroupHandler 63-67).
function canInvite(inviterId: string, party: Party | null): boolean {
  return party === null || party.leaderId === inviterId;
}

// Accepting an invite: the joiner must be free and not in combat (donor DialogResponseHandler 208-221).
function canAccept(joinerInParty: boolean, joinerInCombat: boolean): string | null {
  if (joinerInParty) return "already in a party";
  if (joinerInCombat) return "in combat";
  return null;
}

// Add a member at the end of the join order. Refuses a full party or a duplicate.
function addMember(p: Party, m: Member): "ok" | "full" | "duplicate" {
  if (p.members.length >= p.maxMembers) return "full";
  if (p.members.some((x) => x.id === m.id)) return "duplicate";
  p.members.push(m);
  return "ok";
}

// Remove a member. If one member would be left, that member is removed too and the party is gone.
// If the leader leaves and two or more remain, the first remaining player in join order leads.
// Returns true if the party still exists.
function removeMember(p: Party, id: string): boolean {
  const idx = p.members.findIndex((x) => x.id === id);
  if (idx < 0) return true;
  const wasLeader = p.leaderId === id;
  p.members.splice(idx, 1);

  if (p.members.length <= 1) {
    p.members = [];
    p.leaderId = null;
    return false;
  }
  if (wasLeader) {
    const next = p.members.find((x) => x.isPlayer) ?? p.members[0];
    p.leaderId = next.id;
  }
  return true;
}

// Swap the chosen member into slot 0 and make them leader.
function makeLeader(p: Party, id: string): boolean {
  const idx = p.members.findIndex((x) => x.id === id);
  if (idx < 0) return false;
  const first = p.members[0];
  p.members[0] = p.members[idx];
  p.members[idx] = first;
  p.leaderId = id;
  return true;
}
```

## 5. Lands in

- TARGET `src/fight/party.ts` (new file): the party roster as server state, with the cap as data and leader succession on the server. Parity-checklist row 18 (loot roll and XP award): party membership decides who shares a kill, but the roster lifecycle itself has no row of its own; the donor's XP share was not read here (see section 6).
- today: (not read) - no Frankendom file was opened for this note.
- Reuse tag: rewrite-from-idea (GPL-2.0 copyleft; clean-room only; shape, not lines)
- Brief rule served: one engine and server-verified state (the roster is decided on the server); MAX_ATTACKERS = 3 kept as a fight rule, not a party rule. Rules 7-9 n/a.

## 6. Gaps and risks

- Copyleft (GPL-2.0): clean-room. The sketch is written from the described mechanism only.
- Party size 8 and MAX_ATTACKERS = 3 are different numbers for different rules. A party of eight cannot all attack one target under Frankendom's ruling; do not let party size set the fight cap.
- Two-member parties dissolve when either member leaves (the recursion at 245-249). That is a design choice in the donor; a Frankendom party of two may want it, but it should be a stated rule with a test, not an accident.
- Leader succession uses join order, which is a stable and testable rule. The donor's fallback (264) can pick a non-player living; Frankendom has no non-player party members, so do not port that branch.
- The donor adds the leader to the roster only in the accept path (238) and the GM path (103). A single code path for party creation is needed in Frankendom.
- Battlegroup size is declared but, by grep, not enforced (`BATTLEGROUP_MAX_MEMBER`); do not copy the declared number as a rule.
- Battlegroup loot threshold: the consumers were not read, so the meaning of the threshold and treasurer is unknown. Do not port the loot rule from this note.
- The alliance rule (leader guild leaves, alliance dissolves) is a guild-level rule. The guild side was not read, so it is not a Frankendom decision in this note.
- The donor's XP and loot share for parties (`AbstractServerRules.cs`) was not read here; cell 2 covers the same kind of award in the OpenDAoC donor.
- Mob victim selection reads group and battlegroup membership (`StandardMobBrain.cs` 969-1000, grep only): that belongs to the ai-aggro topic and was not read in full.
