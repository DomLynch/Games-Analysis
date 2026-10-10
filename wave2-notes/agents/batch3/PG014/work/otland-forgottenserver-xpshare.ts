// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism; not a translation.
interface PartyMember {
  id: number;
  level: number;
  x: number;
  y: number;
  z: number;
  lastTickMs: number | null;   // last damage or heal that counted as activity; null = none
  notGainInFight: boolean;     // flag that exempts the activity check
}

type ShareStatus = 'ok' | 'empty' | 'level-spread' | 'too-far' | 'inactive';

interface SharePolicy {
  rangeTiles: number;          // EXPERIENCE_SHARE_RANGE in the donor
  floors: number;              // EXPERIENCE_SHARE_FLOORS in the donor
  activityWindowMs: number;    // pzLocked in the donor config
  baseMultiplier: number;      // share multiplier with one vocation
}

const POLICY: SharePolicy = { rangeTiles: 30, floors: 1, activityWindowMs: 60000, baseMultiplier: 1.2 };

// Per-member check, in donor order: level floor, then distance from the leader, then recent activity.
function memberStatus(leader: PartyMember, highestLevel: number, m: PartyMember, nowMs: number, p: SharePolicy): ShareStatus {
  if (m.level < Math.ceil((highestLevel * 2) / 3)) return 'level-spread';
  if (Math.abs(m.x - leader.x) > p.rangeTiles || Math.abs(m.y - leader.y) > p.rangeTiles ||
      Math.abs(m.z - leader.z) > p.floors) return 'too-far';
  if (!m.notGainInFight && (m.lastTickMs === null || nowMs - m.lastTickMs > p.activityWindowMs)) return 'inactive';
  return 'ok';
}

// One boolean for the whole party: the first failing member turns sharing off for everyone.
function partyShareStatus(leader: PartyMember, members: PartyMember[], nowMs: number, p: SharePolicy): ShareStatus {
  if (members.length === 0) return 'empty';
  const all = [leader, ...members];
  const highest = Math.max(...all.map(m => m.level));
  for (const m of all) {
    const s = memberStatus(leader, highest, m, nowMs, p);
    if (s !== 'ok') return s;
  }
  return 'ok';
}

// Each member gets the same share: kill XP x multiplier, split over every party member including the leader.
function perMemberShare(exp: number, distinctVocations: number, membersExcludingLeader: number, p: SharePolicy): number {
  const size = distinctVocations;
  const multiplier = size > 1 ? 1 + (size * (5 * (size - 1) + 10)) / 100 : p.baseMultiplier;
  return Math.ceil((exp * multiplier) / (membersExcludingLeader + 1));
}

export {};
