// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Member = {
  id: string;
  level: number;
  alive: boolean;
  inRange: boolean;     // inside the reward distance of the kill
};

type Share = { id: string; xp: number };

// Group bonus by counted members: 1-2 members 1.0, 3 members 1.166, 4 members 1.3, 5 or more 1.4.
function groupBonus(count: number): number {
  if (count <= 2) return 1.0;
  if (count === 3) return 1.166;
  if (count === 4) return 1.3;
  return 1.4;
}

// base: XP of the kill, computed once by the caller. isGrey: per-member test (the victim is grey for that member).
function splitXp(
  base: number,
  members: Member[],
  killerId: string,
  isGrey: (m: Member) => boolean,
): Share[] {
  // A player without a group gets the base XP as it is.
  if (members.length === 1) return [{ id: members[0].id, xp: base }];

  // Counted members: the killer, and every alive member in range.
  const counted = members.filter(m => m.id === killerId || (m.inRange && m.alive));
  const count = counted.length;
  const sumLevel = counted.reduce((s, m) => s + m.level, 0);
  const maxLevel = Math.max(...counted.map(m => m.level));

  // Highest-level counted member for whom the victim is not grey.
  const notGrey = counted.filter(m => !isGrey(m));
  const top = notGrey.length > 0 ? notGrey.reduce((a, b) => (b.level > a.level ? b : a)) : null;
  const fullXp = top !== null && top.level === maxLevel;   // code tests only the top member
  const bonus = groupBonus(count);

  return members.filter(m => m.id === killerId || m.inRange).map(m => {   // donor 246: the killer is rewarded even out of range
    // Dead members and members above the top non-grey level get nothing.
    if (top === null || !m.alive || m.level > top.level) return { id: m.id, xp: 0 };
    const share = bonus * m.level / sumLevel;
    const xp = fullXp ? Math.floor(base * share) : Math.floor((base * share) / 2) + 1;
    return { id: m.id, xp };
  });
}
