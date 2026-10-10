# OpenDAoC-OpenDAoC-Core (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Group.cs` | Licence: GNU GPL v3 (LICENSE file; its head reads "GNU GENERAL PUBLIC LICENSE" then "Version 3, 29 June 2007"; copyleft, clean-room, shape only) | C# | symbol `Group`

Checked: Class `Group` at Group.cs 21-744 (file 745 lines). Read in full: 1-240, 240-345, 345-460, 541-745. Not read: Group.cs 460-540 (the member update senders; they only send packets). Invite and accept handlers read in full (InviteToGroupHandler.cs 1-48, DialogResponseHandler.cs 120-164). Command paths read: invite.cs 1-110, group.cs 25-60. Caller check: AddMember callers are DialogResponseHandler.cs 154, 161-162 and invite.cs 95-99 (GM path); RemoveMember callers are GamePlayer.cs 935, GameNPC.cs 2782, DisbandFromGroupHandler.cs 29, and disband.cs 41 and 64. Confidence high on the group mechanics (read in full). Medium on the client dialog, which is not in the donor as code I read. Not read: `ApplyGuildDues`, `CanSeeObject`, `Util.Random` bounds, `GroupMgr`, the guild-rank permission model (not part of this note), `NormalServerRules.IsAllowedToGroup` beyond lines 131-141. camera_scope: not applicable (not a camera cell).

Best transferable idea: a party is one server-side object that owns membership, a capacity, a one-shot invite consent, leader succession and a shared loot split, and the presence and opt-out filter decides who can receive a drop.
Decision (proposed): adapt - take the membership lifecycle and the loot eligibility filter (present, opted in, has room, random pick with full-pack fallthrough); change the coin rounding (ceil creates coins), the unchecked AddMember result on accept, and the pet/guild-ID packet hack, which we do not need.
Acceptance: a server test where a 9th invite is refused with "party full", a two-member party dissolves when one member leaves, a dropped item goes to exactly one random eligible member who is in view and has room, and a 10-coin drop split across 3 eligible members credits exactly 10 on the one ledger.

## 1. Mechanism

- Invite, client path. The leader (if the inviter is in a group) sends an invite. Order: the inviter must be the leader if in a group (InviteToGroupHandler.cs 22-26); the group must not be full (28-32); the server rule must allow it (34-35); the target must not already be in a group (37-41); then the target gets a group-invite dialog (44). The `/invite` command has the same leader check (invite.cs 13-17) and the target-in-group check (82-86), but it does not check capacity before sending the invite (104-108).
- Invite key. The inviter's name is stored on the target as a temp property under the key `group_invite` (PacketLib168.cs 1379; DialogResponseHandler.cs 11). On accept, the key is removed with `TryRemoveProperty` (DialogResponseHandler.cs 125): it is one-shot, and it must match the inviter's current name.
- Accept, order of checks (DialogResponseHandler.cs 120-164): the key must match (125); refuse if the accepter is already in a group (128-132); the server rule must allow it (134-135); refuse while in PvE combat (137-141). If the inviter has a group: it must still be that group's leader (145-146); the group must not be full (148-152); then `AddMember` (154). If the inviter has no group: create `new Group(leader)`, register it, add the leader, then add the accepter (159-162). `GamePlayerEvent.AcceptGroup` fires in both branches (155, 163).
- `AddMember` (Group.cs 102-184): under the group lock it refuses if the group is full or the living is already in a group (108). Otherwise it appends the member, sets `living.Group` and `living.GroupIndex` to the count minus one (111-114), and announces "has joined the group" (117). It then sends the new player the member list, icons and quest state (119-124, 179-181).
- `RemoveMember` (186-325): under the lock it removes the member (192), sets `Group` to null and index to 0xFF (196-197), and disbands if the group is empty (199-200). It then cancels Guard, Protect and Intercept effects where both the leaver and the other side are players (216-254). Two-member rule: after the removal, if exactly one member is left (308), that member is removed too (311), which disbands the group. Otherwise, if the leaver was the leader and more than one member remains (313), the first `GamePlayer` member becomes leader (316) and everyone is told (317). Slot indexes are then re-compacted (321).
- `DisbandGroup` (342-358): ends the mission, stops the position timer (347-351), and clears the leader and the member list (353-357).
- Party chat. `/g` sends to every player in the group (group.cs 45-53), through `SendMessageToGroupMembers`, which prefixes "[Party]" (447) and sends to `GetPlayersInTheGroup()` (451-455). Membership is the only scope: there is no channel field.
- Coins (Group.cs 562-604). Eligible = active and `CanSeeObject(money)` (571-577). If none: a "no one wants" message and `Blocked` (579-583). Else `splitMoney = ceil(value / n)` (591). Each eligible member gets `ApplyGuildDues(splitMoney)` (596) and `AddMoney` of that amount (600). The coin pile is removed (586). The group's `AutosplitCoins` flag gates the whole path (566); the per-player `AutoSplitLoot` flag is ignored for coins (comment 574).
- Items (Group.cs 607-670). Gated by the group `AutosplitLoot` flag and by "not player-discarded" (616). Eligible = active, the player's `AutoSplitLoot`, and `CanSeeObject(item)` (622-626). Pick a random eligible member (651), try to add the item to the backpack (654). If the pack is full, message that member and remove them from the pool (657-658), then pick again. If the pool empties, `Blocked` and the item stays on the ground (635; comment 614).
- Map update timer. The group starts a position timer in its constructor (71). It fires every 2500 ms (721, 728). Each tick sends the map update to every player in the group (736-739), then returns 2500 to reschedule (741). If the leader is null, it returns 0 and stops (733-734). `DisbandGroup` stops it and drops the reference (347-351).

Tick: the map timer is a fixed-interval game timer (not a per-frame loop). The membership and loot calls are synchronous, one call per command, packet or pickup.

## 2. Key functions

- `Group.AddMember`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Group.cs` 102-184. Capacity and "not already in a group" under one lock, then indexes, then the join announcement and the client sync.
- `Group.RemoveMember`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Group.cs` 186-325. Remove, disband when empty, the two-member dissolve (308-311), leader succession (313-318), re-index (321).
- Invite accept: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/packets/Client/168/DialogResponseHandler.cs` 120-164. One-shot key, rule check, combat check, capacity check, add or create.
- Invite send: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/packets/Client/168/InviteToGroupHandler.cs` 6-46, and `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/commands/playercommands/invite.cs` 11-109.
- Coin split: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Group.cs` 562-604.
- Item split: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Group.cs` 607-670 (the random pick is the static local `GiveItemToRandomEligibleMember`, 643-669).
- Map timer: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Group.cs` 719-743.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Capacity checked under the same lock as the add (refuse when full or already grouped) | Max 8 members: server property default 8 (ServerProperties.cs 533, theirs) |
| One-shot consent: the pending invite is removed on accept and must match the inviter | Key name `group_invite` (DialogResponseHandler.cs 11, theirs). No expiry found in the code read (DialogResponseHandler.cs 125 consumes it; no timer seen) |
| Leader-only invite | Rule, no number |
| Leader succession: first player member in slot order takes over | Slot 0 is the leader after `MakeLeader` (Group.cs 395-397); the `First()` call throws when no player is left (see section 6) |
| Two members, one leaves: the other is dropped and the group dissolves | Threshold 2, i.e. `memberCount == 1` after removal (Group.cs 308, theirs) |
| Fixed-interval map update per group | 2500 ms (Group.cs 721, theirs) |
| Coin share, rounded up over eligible members | ceil(value / n) (Group.cs 591, theirs). Rounding up credits more than the pile (see section 6) |
| Item to a random eligible member; full pack drops that member from the pool and retries | Random pick (Group.cs 651); the upper bound of `Util.Random` was not read |
| Eligibility filter: active, in view, opted in (items only), has room | Opt-in flag `AutoSplitLoot` (Group.cs 624); group-level `AutosplitLoot` / `AutosplitCoins` default true (46-47) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for invite (leader-only, capacity, consent), accept (one-shot key, combat, capacity, then add), leave (leader succession, two-member dissolve), coin split (ceil) and item pick (random with full-pack retry). It omits the donor's realm and server rules (they come in as `canGroup`), guild dues, the pet and guild-ID packet hack, the group-window and quest packets, the mission text, the GM invite that skips consent, the `MakeLeader` and `SwitchPlayers` index swaps, the chat strings, and the cancel of Guard, Protect and Intercept on leave. Two changes from the donor: `accept` returns a boolean for every refusal so the caller sees it (the donor ignores the bool from `AddMember`, DialogResponseHandler.cs 154), and when the party dissolves the sketch sets `leader` to null and clears the roster rather than leaving stale state.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/pg003-opendaoc-party.ts) exited 0.

## 5. Lands in

- TARGET `origins/server/party.ts` (new module: membership, one-shot invites, leader succession, loot split on the server; the client only shows the party window and the map).
- Parity row: 18 (loot roll and XP award), the closest row, and it covers the loot split only. Party membership, invites and leader succession have no row in 1-23; say so in the PR and add a row if Lead wants one.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (the coin split credits the one ledger, not per-client state), server-verified state (invite, accept and loot are decided on the server); the rule about one engine does not apply to a social system.

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the mechanism and was not copied from the donor.
- Coin rounding (Group.cs 591, 600): `ceil` credits each eligible member the rounded-up share, so the total paid can exceed the pile by up to n-1 coins. Frankendom's one ledger must distribute the exact remainder (for example the first members take the extra coin). Do not port the ceil.
- `accept` ignores the `AddMember` result (DialogResponseHandler.cs 154; the caller check on line 148 is a pre-check only). If the add fails, `AcceptGroup` still fires. The engine must check the result.
- The invite key has no expiry in the code read (DialogResponseHandler.cs 125 consumes it, nothing else clears it). Lifetime across logout was not read. Frankendom needs a timeout as data.
- `RemoveMember` leader fallback (Group.cs 316): `_groupMembers.OfType<GamePlayer>().First()` throws when no player is left. The `?? _groupMembers[0]` fallback is reached only if `First()` returns null, which a non-null list cannot produce. In practice AddMember callers pass players, so the throw is latent, not hit.
- GM invite (invite.cs 95-99) adds a target with no consent and no capacity check; `AddMember` refuses silently at 108, but the GM message at 101 is still sent. Frankendom must not have an admin path that skips consent without a ledger entry.
- Realm rule lives in the server rules: `NormalServerRules.IsAllowedToGroup` checks the realm (135-139), while `PvEServerRules.IsAllowedToGroup` returns true (139-141). In Frankendom this is a rule value (zone data or engine constant), not a per-ruleset method.
- Guild dues are taken from coins before the credit (Group.cs 596). Frankendom has no guild economy in this ruling; drop the step.
- Pet and guild-ID hack (Group.cs 134-176, 256-298): PvP-only client-visible state for pets; not relevant to our one-engine model.
- The group class sends client packets from inside the membership methods. Frankendom should return events from `origins/server/party.ts` and let the client layer send them.
- Friend lists and chat channels were not searched separately (no grep for "friend" alone was run on the .cs tree). Guild ranks and permissions were not read; the guild model is outside this note.
