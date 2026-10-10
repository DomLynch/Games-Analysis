# levy-street-world-of-claudecraft (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/social/party.ts` | Licence: MIT (LICENSE line 1 "MIT License", Copyright (c) 2026 Levy Street) | TypeScript | symbol `PartyMachine` (`partyInvite`, `partyAccept`, `formDungeonFinderGroup`, `removeFromParty`)

Checked: `party.ts` read in full, lines 1-640 (depth full). Camera_scope: not applicable (not a camera cell). Callers: read by grep only (signatures and call lines, bodies not read): `server/game.ts` 6988-7006 (invite, accept, kick, promote), `src/sim/sim.ts` 3729 (removePlayer teardown), `src/sim/social/dungeon_finder.ts` 522 and 759, `src/sim/social/battleground_party.ts` 44-141. Not read: `hillPartyJoin` / `hillPartyDisband`, `ready_check`, `pull_timer`, the `Party` type body (`sim.ts` 1047), `dungeon_finder.ts` in full. Confidence: high on the party machine, medium on the finder seam (I read its call site and the ordering comment, not its matcher). The hint file `server/guild_roster.ts` (148 lines) was also read: it is a cache-fronted public guild roster read (TTL 30 s, single-flight per guild, misses never cached, cap 512 keys, `server/guild_roster.ts` 22-26, 89-115). It is real but it is a web read, not a group mechanism, so this note uses the party machine. Guild rank permissions and chat channels were only located by file name (`server/guild_rank_cmd.ts`, `src/sim/social/chat.ts`) and were not read: not covered here.

Best transferable idea: A group join is an all-or-nothing server merge: validate every premade unit first, then write, so one stale member snapshot changes nothing.
Decision (proposed): adapt — keep the invite expiry, one-group-per-player rule and validate-then-merge on the server, but carry the 5 and 10 caps as zone data, not constants (Frankendom rulings: server-owned state, zones as data).
Acceptance: Server test: a merge request holding one stale member snapshot returns null and leaves every group unchanged; an invite accepted after more than 30 seconds of server ticks is refused as expired.

## 1. Mechanism

- One state machine owns every party and raid. Three maps: `parties` (id to party), `partyByPid` (a player is in at most one group), `partyInvites` (invitee pid to one pending invite). Source: `party.ts` 58-61.
- Invite (`partyInvite`, 126-165). Checks in this order: no self-invite (130); if the inviter is in a group, only its leader may invite (131-135); a full group refuses (136-139, cap from `partyCapacity`); the target must not already be grouped (140-143); the target must have no live pending invite of any kind, party, trade or duel (144-147, `hasPendingSocialInvite` 114-120). Then the invite is stored with an expiry 30 sim-seconds ahead (148). A dev test bot accepts at once (164).
- Accept (`partyAccept`, 167-235). An absent or expired invite refuses (170-173) and is not removed on that path; a valid one is removed (175). If the accepter is already grouped, refuse (180-183). If the inviter has no group, create one with the inviter as leader and sole member (186-204). Capacity is checked a second time at accept (205-208), because the group may have filled since the invite. The accepter gets the next raid sub-group (209) and is appended to the member list (210-212).
- Decline and kick: decline removes the invite (237-250). Kick is leader-only, refuses self-kick, and calls `removeFromParty` (258-268).
- Leader handoff (`partyPromote`, 273-298): leader-only, roster unchanged.
- Raid conversion: `convertPartyToRaid` needs the leader and at least 5 members (300-319), sets `raid = true` and renumbers sub-groups (320-321). `convertRaidToParty` needs the leader and at most 5 members (339-362), then clears the sub-group map (363-364).
- Dungeon Finder formation seam (`formDungeonFinderGroup`, 430-536). This is the core. It takes ordered units. Each unit is either a whole premade party (with its party id, leader and member snapshot) or one solo player. Order of steps: (a) read-only validation of every unit before any write: no pid appears twice (435); every pid must have a live, non-leaving meta and entity (439-440); a premade unit must match a live party with the same leader and same member count and each member present (448-451); a solo unit must be exactly its leader and not already grouped (445-446). (b) total must be at least 2 and at most 10 for raid or 5 for party (454). (c) Only now the writes: the first premade unit (else the first unit) becomes the base; a solo base creates a fresh party led by that solo (459-479). (d) Raid conversion runs before anyone joins, so ten players never hit the five-player party cap (480-484). (e) Each other unit: a premade party is dissolved silently, with no disband chatter (487-500); its members join one by one with the next sub-group (501-514). (f) Loot-settings summary goes to every member (527-534). A `null` return leaves all state unchanged.
- Leave and teardown (`removeFromParty`, 568-639). Order: revoke master-loot authority held by the leaver (575); remove the pid from members and sub-groups (582-584); clear paladin party auras in both directions (589-593); drop the leaver from any open ready check (597); log to everyone including the leaver (598-605). If one or zero members remain (606): a non-raid single survivor gets a hill disband call (607-608); every survivor is unmapped and told "Your party has disbanded." (610-619); the party, its markers, its ready check and its pull timer are deleted (620-625). Otherwise, if the leaver was the leader, the new leader is `members[0]`, which is the oldest remaining member because members are appended in join order (626-627).
- Time: the invite clock is the sim clock. The Sim's time advances by `DT` each tick (`sim.ts` 5939), and the seam reads it as `host.time` (`sim_context.ts` 1259-1260). `DT = 1 / TICK_RATE` with `TICK_RATE = 20` (`types.ts` 32-33). So 30 is 30 seconds of sim time.
- Tick: no loop of its own. Everything runs synchronously when a command arrives. The only per-tick effect is the invite expiry, which is checked lazily when an invite is read (`hasActiveInvite` 101-112 deletes a stale entry on read).

## 2. Key functions

- `PartyMachine.partyInvite`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/social/party.ts` 126-165. Leader-only, capacity, one-group, one-pending-invite checks, then a 30-second invite.
- `PartyMachine.partyAccept`: same file, 167-235. Expiry, one-group invariant, lazy party creation, capacity re-check, sub-group assignment.
- `PartyMachine.formDungeonFinderGroup`: same file, 430-536. All-or-nothing merge: validation pass (432-454) then writes (456-535).
- `PartyMachine.removeFromParty`: same file, 568-639. Member filter, disband at one or zero, leader succession to `members[0]`.
- `PartyMachine.convertPartyToRaid`, `convertRaidToParty`, `moveRaidMember`: same file, 300-414. Leader-gated raid mode and sub-group moves (5 per sub-group).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Invite expires after a fixed window, checked when read | 30 sim-seconds (theirs, `party.ts` 148) |
| One group per player; check at invite AND at accept | Group cap 5 (theirs, `party.ts` 28); raid cap 10 (theirs, `party.ts` 36) |
| Raid sub-groups filled to 5, overflow to group 2 | Sub-group size 5 (theirs, `party.ts` 37 and 564) |
| Validate every premade unit, then write only | Minimum total 2 (theirs, `party.ts` 454) |
| Leader leaves, oldest remaining member takes over | Order = join order (theirs, `party.ts` 582, 627) |
| Group of one dissolves | Threshold `<= 1` (theirs, `party.ts` 606) |
| Ticks to seconds | `TICK_RATE` 20 per second (theirs, `types.ts` 32) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of checks, the invite expiry, the one-group rule, the all-or-nothing merge, sub-group numbering and leader succession. It omits the side effects the donor runs on every join or leave: hill join and disband, deed stats, soulwell eligibility, dungeon reset locks, paladin aura sync, master-loot authority revoke, raid markers, ready checks, pull timers and every chat line. It also omits the donor's lazy purge of a stale invite on read (`hasActiveInvite`), replacing it with a plain expiry comparison. The donor's `partyAccept` does not delete an expired invite; the sketch matches that. The sketch returns error strings instead of calling the donor's error emitter. The sketch's `invite` does not also refuse on a pending trade or duel invite, which the donor does (114-120), and it omits the self-invite refusal (130) and the dev-bot auto-accept (164).

```ts
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
```

## 5. Lands in

- TARGET `src/fight/group.ts` (new, proposed): the server-owned group state (party or raid of up to 5 or 10) with the invite, accept, merge and leave rules above. Frankendom's current group code was not read, so I cannot say what it already has.
- Parity row: none fits group formation exactly. Closest is row 18 (loot roll and XP award), a partial fit only: the donor's group is the object that carries loot settings and the XP share. Row 18 is the closest, and nothing in the checklist covers group formation itself. Lead should decide whether a row is needed.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is clean-room and was written fresh, not copied)
- Brief rule served: 1 (one engine: the group is server state, not a client list); the zones-as-data rule applies to the caps, see section 6

## 6. Gaps and risks

- Ownership: the donor keeps groups in the ephemeral Sim (`server/social.ts` 3, a comment, read). Frankendom's rule is that kills and state are server-verified, so the group must live on the server and be created only from the server's own session list. The donor's `server/game.ts` 7041 bounds a client-supplied pid list by `RAID_MAX` (grep line only; the surrounding handler was not read). Frankendom must check each pid against its own session, not trust a client list.
- Caps as data: `party.ts` 28 and 36 are code constants. Frankendom should carry the group cap as zone or activity data (zones as data), with the engine holding only the rule that a cap exists.
- `MAX_ATTACKERS = 3` is a fight rule (how many can engage one target), not the group size. A 5-person group against a single target must still engage at most 3 at once. Do not merge the two numbers.
- One ledger: the finder merge calls `bumpDeedStat(..., 'partiesJoined', 1)` (478, 513). That is a side effect on the player's record that Frankendom would have to put in the one ledger, not in a group object.
- Pit as client: a Pit fight is a single arena. The group should stay server-side and the Pit should only display it. This machine has no fight logic.
- The finder's all-or-nothing rule (validate, then write, return `null` otherwise) is the part to copy. The donor runs it synchronously with no `await` in the function body (430-536), so no other write can interleave. That holds for this function only; I did not check the callers' awaits.
- Invite expiry is checked lazily on read. A stale invite stays in the map until someone reads it. Frankendom should either prune on read as the donor does or use one timer-wheel sweep.
- Leader succession to `members[0]` is the donor's rule. Frankendom may prefer the highest-rank member, which would need a rank model the donor does not have here.
- Not read: hill join and disband, ready checks, pull timers, the dungeon matcher. Their effects on a party are cited by name only.
