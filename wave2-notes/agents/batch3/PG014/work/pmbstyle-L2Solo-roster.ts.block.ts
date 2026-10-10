// Licence: Apache-2.0 (donor). Clean-room sketch written from the described mechanism; not a translation.
type Role = 'tank' | 'healer' | 'buffer' | 'dps' | 'mage' | 'crafter' | 'spoiler';

interface Candidate { id: number; role: Role; level: number; cold: boolean; inGroup: boolean; }

interface RosterPolicy { minMembers: number; maxMembers: number; maxLevelGap: number; }

const ROLE_RANK: Record<Role, number> = { tank: 0, healer: 1, buffer: 2, dps: 3, mage: 4, crafter: 5, spoiler: 6 };
const SUPPORT: Role[] = ['tank', 'healer', 'buffer'];

// Free = idle (cold) and not already in a group.
function isFree(c: Candidate): boolean {
  return c.cold && !c.inGroup;
}

// Level floor for the activity: members must be at least sourceLevel minus the gap (floor, minimum 1).
function levelThreshold(sourceLevel: number, gap: number): number {
  return Math.max(1, Math.floor(sourceLevel - Math.max(0, gap)));
}

// Rank free candidates: role rank, then higher level, then lower id.
// Take one of each support role first, then fill in rank order up to the cap.
function pickRoster(pool: Candidate[], p: RosterPolicy): number[] {
  const cap = Math.max(1, Math.min(9, p.maxMembers));
  const ranked = pool.filter(isFree).sort((a, b) =>
    ROLE_RANK[a.role] - ROLE_RANK[b.role] || b.level - a.level || a.id - b.id);
  const picked: Candidate[] = [];
  const taken = new Set<number>();
  for (const role of SUPPORT) {
    const c = ranked.find(x => x.role === role && !taken.has(x.id));
    if (!c || picked.length >= cap) continue;
    picked.push(c);
    taken.add(c.id);
  }
  for (const c of ranked) {
    if (picked.length >= cap || taken.has(c.id)) continue;
    picked.push(c);
    taken.add(c.id);
  }
  return picked.map(c => c.id);
}

// Ready: enough free members, and every support role present unless the caller allows a fallback.
function isReady(roster: Candidate[], p: RosterPolicy, allowRoleFallback: boolean): boolean {
  const free = roster.filter(isFree);
  const roles = new Set(free.map(c => c.role));
  return free.length >= p.minMembers && (allowRoleFallback || SUPPORT.every(r => roles.has(r)));
}

export {};

export {};
