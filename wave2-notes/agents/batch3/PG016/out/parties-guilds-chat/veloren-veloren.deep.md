# veloren-veloren (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/group.rs` (with `server/src/events/invite.rs`, `server/src/events/group_manip.rs`, `server/src/sys/invite_timeout.rs`, `common/src/comp/invite.rs`) | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | Rust | symbols `GroupManager::add_group_member`, `GroupManager::remove_from_group`, `can_invite`, `invite_timeout::Sys::run`

Checked: Read in full: `common/src/comp/group.rs` (540 lines), `server/src/events/invite.rs` (431), `server/src/events/group_manip.rs` (367), `server/src/sys/invite_timeout.rs` (70), `common/src/comp/invite.rs` (30). Callers read: `common/systems/src/controller.rs` 120 and 132 (client requests become invite and group events); `server/src/settings/mod.rs` 192 and 230 (size setting). Grepped only: `server/src/sys/msg/register.rs` 397 (group size sent to the client at login). Not read: the client side of `ServerGeneral::GroupUpdate` and `voxygen/src/hud/group.rs` (hint file; HUD, client-only), any XP or loot share by group (not read). Confidence: high on the server flow as written; nothing was run. camera_scope: not a camera cell.

## 1. Mechanism

Two parts: a group record (who leads and who is in it) and an invite that expires.

- Group record. A `Group(u32)` component sits on each member; a `GroupManager` slab holds `GroupInfo { leader, num_members, name }` (`common/src/comp/group.rs` 31-40, 144-150). The file says of itself: "Primitive group system" (9), with listed shortcomings including "relies on careful management of groups to maintain a valid state" (13). Pets are members too, with role `Pet` (42-46); they are not counted in `num_members` (36).
- Invite flow, in order (server):
  1. The request becomes `InitiateInviteEvent(inviter, invitee_uid, kind)` (`common/systems/src/controller.rs` 120). The invitee must exist (`server/src/events/invite.rs` 78-90); self-invite is dropped (93-99).
  2. `can_invite` (`server/src/events/group_manip.rs` 20-85): refuse if the invitee is already in the inviter's group, and only when the inviter is the leader (30-36). Refuse if the group size, counted as members when the inviter leads or 1 otherwise, plus pending group invites, reaches `max_player_group_size` (51-68).
  3. Refuse if the invitee already holds an invite (`invite.rs` 153-162).
  4. Store the invite on the invitee with deadline now + 31 s, and push the entry onto the inviter's pending list (164-195). The invitee's client is sent a 30 s timeout (202-206). The inviter is told the invite is pending (223-225).
- Accept (`invite.rs` 261-288): remove the invite and the pending entry (366-379), then `add_group_member(inviter, invitee)`. That first removes the invitee from any old group (`group.rs` 180-194). If the inviter is not the leader of its own group, it leaves that group and starts a new one (205-212). If there is no group, one is created with 2 members and the inviter as leader (220-227). Each member is notified, and the invitee gets the group record (244-254).
- Timeout (`server/src/sys/invite_timeout.rs`, phase Create, every tick): compare each invite's deadline with the server clock (30, 39). An expired entry is removed from the inviter's pending list (44) and the inviter is told "TimedOut" (57).
- Leave, kick, leader transfer (`group.rs` 298-507; `group_manip.rs` 134-363):
  - Leader leaves: the group record is removed (352). Each non-pet member loses the group (406-407). A member with pets instead gets a new group with its pets (395-400).
  - Non-leader leaves: the leaving member's record is removed (460-466), or, if it has pets, it is moved to a new group with its pets (441-459). The member count drops (474-475). Remaining entities are counted, pets included (481-494). If one entity remains, the group is disbanded and that entity loses its group (497-501; the code assumes the last one is the leader).
  - Kick: target must be in a group, the kicker must be its leader (202), pets cannot be kicked (176-181), a player cannot kick themselves (187-194).
  - Leader transfer: the assigner must be the leader (293), then `assign_leader` sets the new leader (526).

## 2. Key functions

- `GroupManager::add_group_member`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/group.rs` 156-255. Joins a member to the inviter's group, leaving old groups first.
- `GroupManager::remove_from_group`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/group.rs` 330-507. Leader-leave disbands, non-leader leave shrinks and disbands at one remaining.
- `can_invite`: `/mnt/frankendom-donors/veloren-veloren/server/src/events/group_manip.rs` 20-85. Refuses same-group and full-group invites. Its leader check covers only the same-group rule (33) and the count (59).
- Invite event handler: `/mnt/frankendom-donors/veloren-veloren/server/src/events/invite.rs` 39-228 (`handle` 57-227). Stores invite, sets deadline 178.
- Accept path: `/mnt/frankendom-donors/veloren-veloren/server/src/events/invite.rs` 261-288 and `get_inviter_and_kind` 362-379.
- Timeout system: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/invite_timeout.rs` 26-69.
- Kick and leader transfer: `/mnt/frankendom-donors/veloren-veloren/server/src/events/group_manip.rs` 158-270 (kick), 271-363 (assign).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Invite expires after a deadline on the server clock; the invitee's prompt shows a shorter countdown | Server 31 s (`invite.rs` 30); shown to the client 30 s (`invite.rs` 32) |
| Capacity check: current members plus pending invites, against a cap | Cap 6 (`server/src/settings/mod.rs` 230), a settings value, not a rule |
| One pending invite per invitee | Rule (`invite.rs` 153) |
| Joiner leaves its old group first | Rule (`group.rs` 180-194) |
| Leader leaving disbands the group for everyone without pets | Rule (`group.rs` 345-407) |
| Group with one remaining entity disbands | Threshold 1 (`group.rs` 497) |
| Kick and leader transfer are checked against the leader on the server | Rule (`group_manip.rs` 202, 293) |

## 4. TypeScript sketch

simplified: the sketch adds a leader-only check on invite, which the donor does not have (donor `can_invite` checks the leader only for the same-group rule, and a non-leader inviter is pulled out of its group on accept). It also omits pets (the donor's `Role::Pet`, pet re-grouping on leave, and pets in the disband count), the NPC and enemy special groups, client notifications (the sketch returns error strings instead), map markers, group names, and the slab storage. It keeps the donor's order: leave the joiner's old group, then join or create, and disband on leader leave or on one remaining. Expiry is a per-tick scan with the server clock.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 veloren-group.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/party.ts` (proposed new module; the path is not checked against the Frankendom repo). It holds server-side party state: membership, leader, invites with a server deadline. Kill and XP ownership would read it.
- Parity-checklist row 18 (loot roll and XP award). This is the nearest row, not a true fit: membership decides who shares XP and loot, but row 18 does not describe parties, invites or leader rules. Chat and friend lists have no row at all.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger and server-verified state (party membership is checked on the server, never by the client).

Best transferable idea: keep party state on the server with a leader-only check on every change, and count pending invites against the size cap so a party cannot overfill.
Decision (proposed): adapt — keep the leader-only gates, the pending-invite count in the capacity check, the server-side 31 s expiry with a shorter 30 s prompt, and the leader-leave disband; do not port the notifier and slab design or the pet role, which Frankendom does not have.
Acceptance: Player A invites B; B's prompt counts down from 30 s; at 31 s the server clears the invite and A sees an "invite timed out" message. With 5 members and 1 pending invite, a further invite is refused by the server. A non-leader's kick request is refused by the server, and the party state is unchanged.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- The donor's invite check does not require the inviter to lead. The donor's `can_invite` (`group_manip.rs` 30-36, 59-62) allows a non-leader to send an invite, and on accept `add_group_member` (`group.rs` 207-210) pulls that inviter out of its group (the match arm at 207-210). Frankendom must check leadership at invite time and again at accept time.
- Client-side checks are not read. If the donor's UI hides invite for non-leaders, that is a client guard only; the server path above does not stop it.
- The donor says of itself that the group model is primitive and relies on careful management (`group.rs` 9-13). Frankendom's one-ledger rule means the server should own a single party table; the donor's notifier fan-out is not needed for that.
- Leader leave disbands the group at once with no handover (`group.rs` 345-352). Frankendom needs a rule (handover or disband); the donor picks disband.
- The 1 s gap between the client's 30 s and the server's 31 s is a latency buffer, not a game rule. Frankendom should show the server's deadline, or keep the gap explicit in data.
- The disband count includes pets (`group.rs` 481). Frankendom has no pets; drop that count unless summons are added.
- Group size cap 6 comes from a server setting (`server/src/settings/mod.rs` 230). Frankendom should keep it as an engine constant, not a per-zone value, unless zones differ.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: none significant
