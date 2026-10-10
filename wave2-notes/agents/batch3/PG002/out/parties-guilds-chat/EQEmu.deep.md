# EQEmu (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/EQEmu/zone/groups.cpp` | Licence: GPL-3.0-or-later (zone/groups.cpp header: "version 3 of the License, or (at your option) any later version"; LICENSE.md is the GNU GPL v3 text) | C++ | symbol `Group::DelMember` (with `Group::AddMember`, `Client::GroupFollow`, `Client::LeaveGroup`, `Handle_OP_GroupInvite2`)

Checked: Read in full or in the relevant ranges: `Group::AddMember` (zone/groups.cpp 223-300), `Group::DelMember` (649-812), `Group::DisbandGroup` (915-989), `Client::LeaveGroup` (1258-1313), `Group::GroupCount` (1111-1122), `Group::IsLeader` (2580-2591); `Client::GroupFollow` (zone/client.cpp 5052-5215, non-raid branch); `Handle_OP_GroupFollow2`, `Handle_OP_GroupInvite2`, `Handle_OP_GroupDisband` (zone/client_packet.cpp 7195-7230, 7318-7360, 7377-7516). Confidence high for in-zone party join, leave, kick and disband. Not read: the raid branch of GroupFollow, the world-side handling of ServerOP_GroupFollow and ServerOP_GroupInvite, merc and bot branches (only where they touch the count), the end of GroupFollow after AddMember, guild ranks, chat channels, friend lists. The list's hint file (`utils/sql/svn/600_group_leadership.sql`) is a schema migration (ALTER TABLE group_leaders, rule_values inserts), not the mechanism. camera_scope: n/a (not a camera cell).

## 1. Mechanism

Party formation is an invite, then an accept, then a seat in a fixed-size slot array. The server holds no record of a pending invite. The party is created at accept time, not at invite time.

- Invite (client_packet.cpp 7431-7516). The invitee is looked up by name in this zone, unless rule `GroupInvitesRequireTarget` is on (default false, ruletypes.h 228), in which case the inviter's target is used. Inviting yourself is refused (7451). If the invitee is a client with no party (or only a merc in a party, `MercOnlyOrNoGroup`), the invite packet is forwarded to the invitee's client (7469). If the invitee is already in a party (not a raid), nothing is forwarded and the inviter is told the target is already grouped (7492), when rule `OnInviteReceiveAlreadyinGroupMessage` is on (default true, ruletypes.h 211). If no invitee is found in this zone and the target rule is off, the invite goes to world as ServerOP_GroupInvite (7510).
- Accept (client_packet.cpp 7377-7418). The invitee's client sends OP_GroupFollow naming the inviter. The handler turns LFP off (7393), finds the inviter in this zone (7401) and calls `GroupFollow` (7403). On success the names are copied into the packet and echoed to the inviter (7407). If the inviter is not in this zone, the handler calls LeaveGroup() and forwards ServerOP_GroupFollow to world (world side not read).
- GroupFollow (zone/client.cpp 5052-5215, non-raid branch). If the inviter has no party, it creates `new Group(inviter)` (5132), refuses with a red message if no group id is issued (5143-5144), adds the inviter (5149) and writes the leader name to the database (5150). It then calls `group->AddMember(this)` (5188). The inviter becomes the first member and leader at the moment the first accept lands.
- AddMember (zone/groups.cpp 223-). Refuses if `GroupCount() >= MAX_GROUP_MEMBERS` (233). Refuses if the name is already in a slot (256-262). Seats the name in the first empty slot (265-270). The in-zone pointer is stored only when the member is in this zone (`if (in_zone)`); an out-of-zone member is a name only. Then it sends the join update to in-zone members.
- GroupCount (1111-1122) counts filled name slots, so out-of-zone members count toward size.
- Leave by a member (zone/groups.cpp 1258-1313, `Client::LeaveGroup`). It counts the party, with merc and bot adjustments. If the count is under 3 (the leaver is included, so a party of two), it disbands the whole party (1287-1288). Otherwise it calls `DelMember(this)` (1291).
- Kick and rights (client_packet.cpp 7195-7377, the non-raid part). The leader may remove another client with `group->DelMember(memberToDisband, false)` (7339). The leader removing self goes to LeaveGroup. A non-leader's disband request always removes the requester only (7354-7355) and ignores any target.
- DelMember (zone/groups.cpp 649-812). If the leaver is the leader, it calls DisbandGroup and returns (656-663; the donor's own TODO at 656 says the code below does not work). For any other leaver it clears the slot, then runs a "handle leader quitting" block (691-706) that would hand leadership to the first in-zone client. As written that block cannot run for the leader, because the leader case already returned, so it is dead code (my reading; the TODO says the same). It then sends a leave to world, sends groupActLeave to the remaining members, removes the client, clears any tank, assist or puller role, and if fewer than three members remain (797) it clears NPC marks.
- DisbandGroup (zone/groups.cpp 915-989). Sends groupActDisband to every filled slot (923), removes each client from the group, tells world (ServerOP_DisbandGroup, 967), clears the database record (977), clears the leader (985) and removes the group from the entity list.
- Tick: none. Membership changes are event-driven (invite packet, accept packet, leave, kick, disconnect). There is no per-frame loop in this path. (not read: any timer on invites; none was found in the handlers read.)

## 2. Key functions

- `Group::AddMember`: `/mnt/frankendom-donors/EQEmu/zone/groups.cpp` 223-300. Capacity check, dedupe, first empty slot, in-zone pointer only when local.
- `Group::DelMember`: `/mnt/frankendom-donors/EQEmu/zone/groups.cpp` 649-812. Leader leave disbands; member leave clears the slot and tells the others; NPC marks cleared under three.
- `Client::LeaveGroup`: `/mnt/frankendom-donors/EQEmu/zone/groups.cpp` 1258-1313. Under-three count disbands; otherwise DelMember.
- `Group::DisbandGroup`: `/mnt/frankendom-donors/EQEmu/zone/groups.cpp` 915-989.
- `Client::GroupFollow`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 5052-5215. Creates the party at first accept, then AddMember.
- Invite and accept handlers: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 7377-7418 (accept), 7431-7516 (invite), 7195-7377 (disband and kick).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Party is a fixed array of named slots; a join takes the first empty slot | Six slots (theirs, common/eq_packet_structs.h 891; read on the line, value 6) |
| Refuse a join when the slots are full or the name is already seated | Capacity check at zone/groups.cpp 233 |
| A leave that would drop the party below two disbands it | Threshold `MemberCount < 3` counting the leaver (theirs, zone/groups.cpp 1287) |
| Leader leaving disbands the party (any size) | No succession (dead code, 691-706) |
| Only the leader may remove others; members remove only themselves | Client packet branch (theirs, client_packet.cpp 7336-7355) |
| Invite is forwarded, accept is the commit | Client-held invite, no server timer (theirs, 7469, 7403) |
| Out-of-zone members count, but hold no pointer | Name-only slots (theirs, groups.cpp 1117, 265-270) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order at accept (find inviter, create the party with the inviter in slot 0 if none exists, check already-seated, check capacity, take the first empty slot) and the leave and kick rules. The donor's full check is inside AddMember after the party is created; the sketch checks it before taking a slot, with the same result. It omits: the raid branch of GroupFollow, merc and bot handling, the SoD acknowledgement packets, the cross-zone ServerOP packets (the sketch treats every player as in one zone), the database writes, the NPC-mark clears, the tank, assist and puller roles, the LFP reset, the "already in group" message to the inviter, and the dead succession block (the sketch does not include it, as the donor's code cannot run). It adds no invite timeout, because the donor has none; that is a gap, not a copy.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MAX_PARTY = 6;          // fixed slots per party
const MIN_PARTY_KEEP = 2;     // a leave that would leave fewer than this disbands the party

interface Party {
  id: number;
  leader: string;
  slots: (string | null)[];   // fixed-size slot array, one name per slot
}

interface Player {
  name: string;
  zone: string;
  partyId: number | null;
}

type JoinResult = 'joined' | 'refused:inviter-gone' | 'refused:already' | 'refused:full';

function partySize(p: Party): number {
  return p.slots.filter((s) => s !== null).length;
}

// Invitee accepts. The party is created here, at accept time; the server holds no pending invite.
function acceptInvite(
  parties: Map<number, Party>,
  players: Map<string, Player>,
  nextId: { value: number },
  invitee: string,
  inviter: string,
): JoinResult {
  const me = players.get(invitee);
  const inv = players.get(inviter);
  if (!me || !inv || me.zone !== inv.zone) return 'refused:inviter-gone';
  if (me.partyId !== null) return 'refused:already';

  let party = inv.partyId !== null ? parties.get(inv.partyId) : undefined;
  if (party === undefined) {
    // No party yet: the inviter starts one in slot 0. A new party cannot be full.
    party = { id: nextId.value++, leader: inv.name, slots: new Array<string | null>(MAX_PARTY).fill(null) };
    party.slots[0] = inv.name;
    parties.set(party.id, party);
    inv.partyId = party.id;
  }
  if (party.slots.includes(me.name)) return 'refused:already';
  if (partySize(party) >= MAX_PARTY) return 'refused:full';

  const slot = party.slots.indexOf(null);
  party.slots[slot] = me.name;
  me.partyId = party.id;
  return 'joined';
}

function disband(parties: Map<number, Party>, players: Map<string, Player>, party: Party): void {
  for (const name of party.slots) {
    if (name === null) continue;
    const p = players.get(name);
    if (p) p.partyId = null;
  }
  parties.delete(party.id);
}

// Leader leaving always disbands. Any leave that leaves fewer than MIN_PARTY_KEEP also disbands.
function leaveParty(parties: Map<number, Party>, players: Map<string, Player>, who: string): 'left' | 'disbanded' {
  const p = players.get(who);
  if (!p || p.partyId === null) return 'left';
  const party = parties.get(p.partyId);
  if (party === undefined) { p.partyId = null; return 'left'; }
  if (who === party.leader || partySize(party) - 1 < MIN_PARTY_KEEP) {
    disband(parties, players, party);
    return 'disbanded';
  }
  party.slots[party.slots.indexOf(who)] = null;
  p.partyId = null;
  return 'left';
}

// Leader may remove anyone; a member may only remove themselves.
function kick(parties: Map<number, Party>, players: Map<string, Player>, by: string, target: string): boolean {
  const p = players.get(target);
  if (!p || p.partyId === null) return false;
  const party = parties.get(p.partyId);
  if (party === undefined) return false;
  if (by !== party.leader && by !== target) return false;
  leaveParty(parties, players, target);
  return true;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/party.ts` (new; server-held party record, invite accept and leave, one ledger). The fight engine reads party membership; it does not own it. Parity-checklist row: none fits (closest is row 18, loot roll and XP award, where a party XP share would read membership; party formation itself has no row in 1-23).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: server-verified state and one ledger (the party is server state; the client only renders it). Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism and was typechecked (strict, es2020) on the VPS. It is not a translation of the donor lines.
- No server-held invite. The accept handler (client_packet.cpp 7401-7407) trusts the inviter name in the accept packet and checks only that the inviter is in this zone. In the handlers read there is no invite expiry, so the server cannot refuse a stale invite. Frankendom's server-verified ruling needs the server to hold each invite with an expiry. This is an adapt, not a copy.
- Leader leaving disbands the whole party at any size (661-663). Consistent and simple, but harsh. The succession code that would avoid it is dead (656 TODO). Do not copy the dead block; decide the rule and test it.
- Party size 6 is a constant from an older raid UI. Frankendom's MAX_ATTACKERS = 3 caps attackers per target in a fight; it is not a party size and must not be conflated with it. Party size should be an engine constant with a server test.
- Cross-zone path: an accept in another zone forces LeaveGroup and forwards to world. Frankendom runs zones as data on one runtime, so the zone-boundary part does not port. The donor's state is split between zone and world through ServerOP packets; Frankendom's one ledger wants a single party record, which is the thing to keep.
- Not read: raid branch, merc and bot branches, the world-side handlers, guild ranks, chat channels, friend lists and social sync. The cell's broader topic is only partly covered by this note.

Best transferable idea: Keep a party as one fixed-size slot record on the server, with the leave rules (leader leaving, or a leave that drops below two, disbands it) and a server-checked accept.
Decision (proposed): adapt - the slot record, the size cap and the minimum-two rule fit Frankendom; the client-only invite and the dead succession code do not fit "server-verified" and "one ledger", so the invite must be server-held with an expiry.
Acceptance: a player sees a pending invite; if the inviter has left the world before the accept, the accept is refused with "inviter gone" and no party appears; a server test asserts a seventh accept is refused as full, and that a leader leaving clears every member's party in one write.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: server-verified state and one ledger.
