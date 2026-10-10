// Licence: GPL-2.0-or-later (donor, binaries/data). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface GroupMember {
  hitpoints: number;
  maxHitpoints: number;
}

export interface GroupHealth {
  fraction: number; // 0..1, width of the group bar
  count: number;    // number of members, shown as a number beside the bar
  hidden: boolean;  // no bar when nobody in the group has hit points
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// Ratio of sums: a member with more max HP moves the bar more.
export function groupHealthBySum(members: GroupMember[]): GroupHealth {
  let hp = 0;
  let maxHp = 0;
  for (const m of members) {
    if (m.hitpoints) {            // members without hit points do not count
      hp += m.hitpoints;
      maxHp += m.maxHitpoints;
    }
  }
  const hidden = hp <= 0;
  const fraction = hidden || maxHp <= 0 ? 0 : clamp01(hp / maxHp); // guard for max 0 (not in donor)
  return { fraction, count: members.length, hidden };
}

// Equal-weight option the donor does not have: mean of each member's own ratio.
export function groupHealthByMean(members: GroupMember[]): GroupHealth {
  let sum = 0;
  let n = 0;
  for (const m of members) {
    if (m.hitpoints && m.maxHitpoints > 0) {
      sum += clamp01(m.hitpoints / m.maxHitpoints);
      n += 1;
    }
  }
  const hidden = n === 0;
  return { fraction: hidden ? 0 : sum / n, count: members.length, hidden };
}

export {};
