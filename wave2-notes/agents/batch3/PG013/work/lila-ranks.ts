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

export {};
