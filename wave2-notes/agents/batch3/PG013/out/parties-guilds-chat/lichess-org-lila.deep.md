# lichess-org-lila (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/team/src/main/TeamSecurity.scala` (with `TeamApi.scala` kick, `TeamMember.scala`, `TeamMemberRepo.scala`, and the gates in `app/controllers/Team.scala` and `app/controllers/TeamApi.scala`) | Licence: GNU AGPL v3 (LICENSE header read, line 1: "GNU AFFERO GENERAL PUBLIC LICENSE"; `COPYING.md` top line read only) — copyleft, clean-room, shape only | Scala | symbol `TeamSecurity` (`Permission`, `setPermissions`, `form.permissions`), `TeamApi.kick`

Checked: the hint file `modules/chat/src/main/ChatApi.scala` (363 lines) was read in full. It is a real chat write pipeline (timeout gate, flood gate, link check, garbage detector, a 150-line rolling `$slice`). It is not a group mechanism, so this note uses the team rank model instead; the chat pipeline is noted in section 6 but not written up. The team rank model: `TeamSecurity.scala` read in full (1-131), `TeamMember.scala` read in full (1-34), `TeamApi.kick` read (304-324), `TeamApi.hasPerm`/`isLeader` read (394-404), `TeamMemberRepo` read at 65-69, 95-96, 114-121, controller gates read (`app/controllers/Team.scala` 166-185; `app/controllers/TeamApi.scala` 124-146). Depth: full on the rank model and kick; the join-request path (`processRequest`, TeamApi 217-228) was only partly read, and `hasAdminCreator`, `doQuit`, `selectAnyPerm` and the join check on a declined request were not read. Confidence: high on the rank rules, medium on the request path. Camera_scope: not applicable.

Best transferable idea: A guild rank is a set of independent permission flags, and the rules that protect the rank structure (at least one admin, a hard cap on admins, creator keeps admin, no rank change through the edit form) are checked before any write.
Decision (proposed): adapt — take the flag-set rank model and the kick hierarchy (plain members kickable with the kick flag, leaders only by an admin, creator never) for Frankendom guilds; drop the Lichess-specific perms (tournaments, forum moderation), keep the invariant checks, and make the caps (10 leaders, 3 admins) zone or guild data rather than constants.
Acceptance: Server test: an edit that would leave no admin, or name 4 admins, is refused and every member's flags are unchanged; a player with only the kick flag can remove a plain member but is refused on a leader; a kicked player's immediate re-invite is refused by a declined-request record (the donor's join-side check was not read, so this is a spec to build, not a donor-verified rule).

## 1. Mechanism

- A rank is a set of eight independent flags on a team member: Public, Settings, Tour, Comm, Request, PmAll, Kick, Admin (`TeamSecurity.scala` 11-19). A member with an empty set is a plain member (`TeamMember.scala` 10). A leader is a member with at least one flag (`TeamApi.scala` 394-396 via `hasAnyPerm`; the `selectAnyPerm` filter was not read). The creator gets all eight at creation (`TeamApi.scala` 84).
- Permission check: `hasPerm` reads the member's own row and matches one flag (`TeamMemberRepo.scala` 65-66; `TeamMember.scala` 14-15). A site moderator with `ManageTeam` bypasses the team check (`TeamApi.scala` 398-400).
- Who may edit flags: the permissions page is gated on Admin (`app/controllers/Team.scala` 166-167); the gate helper `WithOwnedTeam` was not read, so whether a site moderator passes it is not confirmed here (the bypass is visible in `isGranted`, `TeamApi.scala` 398-400). The save is called at 174-175.
- Save order (`TeamSecurity.scala` 37-51 and the form 89-131). The form checks run first, in this order: at least one leader holds Admin (98-100); the leader name set may not change (102-104, so leaders are not added or removed through this form); at most 10 leaders (106-108; `maxLeaders = Max(10)` at `modules/team/src/main/Team.scala` 91 (the controller `app/controllers/Team.scala` has no such value)); no duplicate names; the creator keeps Admin unless a site moderator or the team has no Admin creator (115-118); no kid account may hold Admin (120-125); at most 3 admins (127-130). Only after the form passes: the save unsets every flag (39), sets each leader's new set (40), and builds a notice list of leaders whose set changed and is non-empty (42-47). The controller then sends each changed leader a system message (`app/controllers/Team.scala` 175-185).
- Adding a leader: `addLeader` gives the new leader only the Public flag (53-54), and the form's leader cap and "not already a leader" checks apply first (60-78).
- Kick (`TeamApi.scala` 304-318). Route gate: the kick page and API need the Kick flag (`app/controllers/Team.scala` 141; `app/controllers/TeamApi.scala` 124). Then the whole call runs inside a per-team sequencer, `workQueue(team.id)` (304; sequencer defined at 33). Allowed if: the target is not the team creator (308), and the target is a member, and either the target has no flags at all or the kicker holds Admin or is a site moderator with `ManageTeam` (309-310). If allowed: a declined request for that user is upserted with the reason "Kicked from team" (312-315), then `doQuit` runs (316, not read), then a `KickFromTeam` event is published (317). The declined record is what stops an immediate rejoin, per the comment at 312.
- Time: none. The rank rules are checked on each request. There is no tick. The only serialization is the per-team sequencer on kick and on request decisions (`TeamApi.scala` 33, 217, 304).

## 2. Key functions

- `TeamSecurity.form.permissions` verifying chain: `/mnt/frankendom-donors/lichess-org-lila/modules/team/src/main/TeamSecurity.scala` 89-131. The rule order and the refusal messages.
- `TeamSecurity.setPermissions`: same file, 37-51. Unset-all, set-each, changed-leader notice list.
- `TeamApi.kick`: `/mnt/frankendom-donors/lichess-org-lila/modules/team/src/main/TeamApi.scala` 304-318. Creator protection, the leader-needs-Admin rule, declined-request record.
- `TeamMember.hasPerm` and `TeamMemberRepo.hasPerm`: `TeamMember.scala` 14-15; `TeamMemberRepo.scala` 65-66. One flag test against the member's own row.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank = independent flag set; permission check = one flag test | The eight flag names (theirs, `TeamSecurity.scala` 12-19); they are Lichess features (tournaments, forum moderation), not game perms |
| At least one admin must exist | Minimum 1 (theirs, `TeamSecurity.scala` 99) |
| Admin cap | 3 (theirs, `TeamSecurity.scala` 129) |
| Leader cap | 10 (theirs, `modules/team/src/main/Team.scala` 91; check at `TeamSecurity.scala` 107) |
| New leader starts with one flag only | Public (theirs, `TeamSecurity.scala` 54) |
| Plain member is kickable by any kicker with the Kick flag; a leader only by an admin | Rule, no number (theirs, `TeamApi.scala` 310) |
| Creator is never kickable and keeps Admin | Rule, no number (theirs, `TeamApi.scala` 308; `TeamSecurity.scala` 116-118) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's refusal order for the permission edit (at least one admin, no leader-set change, leader cap, creator keeps admin, kid check, admin cap) and the kick rules (route flag, creator protected, leader-needs-admin, site-mod bypass). It omits: the Lichess account rule (Lichess cannot be made a leader without ManageTeam, `TeamSecurity.scala` 68-70, 92-96), duplicate-name check (the sketch uses a map, so duplicates cannot exist), the `hasAdminCreator` definition (not read; the sketch approximates it as "the creator currently holds Admin"), the sequencer (`workQueue`), the declined-request record and `doQuit`, and the notification side effects. The donor writes the permission set in two steps (unset all, then set each, `TeamSecurity.scala` 39-40); the sketch applies one member at a time in memory, so it does not reproduce the donor's window between those two writes.

```ts
// Licence: AGPL-3.0 (donor, LICENSE). Clean-room: shape only, written from the described rules, not a translation.
// clean-room
type Perm = 'public' | 'settings' | 'tour' | 'comm' | 'request' | 'pmAll' | 'kick' | 'admin';
const ALL_PERMS: Perm[] = ['public', 'settings', 'tour', 'comm', 'request', 'pmAll', 'kick', 'admin'];
const MAX_LEADERS = 10;
const MAX_ADMINS = 3;

interface Member { userId: string; perms: Set<Perm>; isKid: boolean }
interface Team { creatorId: string; members: Map<string, Member> }
interface LeaderEdit { userId: string; perms: Set<Perm> }

const isLeader = (m: Member | undefined): boolean => !!m && m.perms.size > 0;
const hasPerm = (m: Member | undefined, p: Perm): boolean => !!m && m.perms.has(p);

// Creator starts with every permission; a plain member starts with none.
function createTeam(creatorId: string): Team {
  const creator: Member = { userId: creatorId, perms: new Set(ALL_PERMS), isKid: false };
  return { creatorId, members: new Map([[creatorId, creator]]) };
}

// Kick: route needs 'kick'; the target must not be the creator; a plain member
// can be kicked by any kicker with 'kick'; a leader only by an admin (or a site mod).
function kickRefusal(team: Team, kickerId: string, targetId: string, siteMod: boolean): string | null {
  const kicker = team.members.get(kickerId);
  if (!siteMod && !hasPerm(kicker, 'kick')) return 'insufficient permissions';
  if (targetId === team.creatorId) return 'the creator cannot be kicked';
  const target = team.members.get(targetId);
  if (!target) return 'not a member';
  if (!(target.perms.size === 0 || hasPerm(kicker, 'admin') || siteMod)) return 'only an admin can kick a leader';
  return null;
}

// Permission edit: only an admin may send one. The whole new leader list is checked
// before anything is written; a failing check returns its message and changes nothing.
function permissionRefusal(team: Team, edits: LeaderEdit[], siteMod: boolean): string | null {
  const admins = (list: { perms: Set<Perm> }[]) => list.filter((l) => l.perms.has('admin')).length;
  if (admins(edits) === 0) return 'at least one leader must be able to manage permissions';
  const before = [...team.members.values()].filter(isLeader).map((m) => m.userId).sort().join(',');
  const after = edits.map((e) => e.userId).sort().join(',');
  if (before !== after) return 'leaders cannot be added or removed here';
  if (edits.length > MAX_LEADERS) return `no more than ${MAX_LEADERS} leaders`;
  const creatorWasAdmin = hasPerm(team.members.get(team.creatorId), 'admin');
  const creatorStillAdmin = edits.some((e) => e.userId === team.creatorId && e.perms.has('admin'));
  if (!siteMod && creatorWasAdmin && !creatorStillAdmin) return 'the creator must keep admin';
  for (const e of edits) {
    const m = team.members.get(e.userId);
    if (e.perms.has('admin') && m?.isKid) return 'kid accounts cannot manage leader permissions';
  }
  if (admins(edits) > MAX_ADMINS) return `no more than ${MAX_ADMINS} admins`;
  return null;
}

// Applies a permission edit only after it passes; returns the users to notify.
function applyPermissions(team: Team, edits: LeaderEdit[], siteMod: boolean): { error: string | null; notify: string[] } {
  const error = permissionRefusal(team, edits, siteMod);
  if (error) return { error, notify: [] };
  const notify: string[] = [];
  for (const e of edits) {
    const m = team.members.get(e.userId);
    if (!m) continue;
    const changed = m.perms.size !== e.perms.size || [...e.perms].some((p) => !m.perms.has(p));
    m.perms = new Set(e.perms); // one write per member, in memory here
    if (changed && e.perms.size > 0) notify.push(e.userId);
  }
  return { error: null, notify };
}
```

## 5. Lands in

- TARGET `src/fight/guild.ts` (proposed new module; Frankendom's current guild code was not read, so I cannot say what it already has). Guild ranks and permission checks belong in the engine so the server, not the client, decides who may kick or edit ranks.
- Parity row: none fits guild ranks. The closest row is 18 (loot roll and XP award), and only as a partial fit: the donor's flags do not touch loot, so it applies only if Frankendom gives guild ranks a loot permission. Lead should decide whether guild ranks need a row of their own.
- Reuse tag: rewrite-from-idea (AGPL v3: clean-room; shape only, written from the rules above, not a translation)
- Brief rule served: 1 (one engine: rank and kick checks run on the server); zones as data for the caps (see section 6)

## 6. Gaps and risks

- Not Frankendom's model: the donor's flags are feature switches for a forum and tournament site. Frankendom needs flags that match its own actions (for example invite, kick, edit ranks, manage loot), and it should use only the ones a guild needs.
- Caps as data: 10 leaders and 3 admins are code constants here (`modules/team/src/main/Team.scala` 91; `TeamSecurity.scala` 129). Frankendom should carry them as guild or realm data, with the engine holding only the rule that a cap exists.
- Race: the donor's permission save is two writes, unset-all then set-each (`TeamSecurity.scala` 39-40), and the controller calls it directly (`app/controllers/Team.scala` 175), not through the team sequencer. A reader cannot tell from these lines whether a second save can interleave. Frankendom must run the whole rank edit as one server transaction, or through its per-guild sequencer.
- Server-verified: the rank check is the donor's server check. Frankendom must also check the kicker's rank from the server's own record, never from the client. Its own rule is that a kicked player loses any fight or loot right in an open encounter; the donor has no encounters, so nothing here covers that.
- One ledger: the kick and join events publish to the bus (`TeamApi.scala` 317, 250). Frankendom should keep the rank record in the one ledger and treat these events as notices only.
- MAX_ATTACKERS = 3 is an engagement rule and is separate from the admin cap of 3 here. Do not reuse the number for both.
- Chat (not written up): `modules/chat/src/main/ChatApi.scala` 1-363 (read in full) is a real chat write pipeline: a timeout gate (`chatTimeout.isActive`, 223), a flood gate (`flood.allowMessage`, 229, 287), a link check, a garbage detector (340-363), and a rolling buffer kept at 150 lines (`$slice` -150, 310). The pipeline's order is in `write` (68-98). It may be a second note under a chat cell; it was not written up here.
- Not read: (`hasAdminCreator` is defined at `modules/team/src/main/Team.scala` 62 as leaders.exists(creator and Admin); read after the checker, it matches the sketch) `selectAnyPerm` (`TeamMemberRepo.scala`), `doQuit`, the declined-request check in the join path, `processRequest` in full (TeamApi 217-228).
- `doQuit` (TeamApi.scala 274-281) decrements the member count and publishes LeaveTeam; the kick path relies on it (called at 316) and it was not read.

## Checker findings

- Verdict: MINOR
- Corrected: maxLeaders location: modules/team/src/main/Team.scala 91, not the controller Team.scala; hasAdminCreator is defined at modules/team/src/main/Team.scala 62, no longer listed as unread
- Missed (also added to section 6): doQuit (TeamApi 274-281) side effects used by kick
