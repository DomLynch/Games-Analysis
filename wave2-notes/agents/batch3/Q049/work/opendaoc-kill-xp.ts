// Licence: GPL-3.0 (donor repo LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Contributor {
  damage: number;            // damage this player dealt to the mob
  level: number;             // player level now
  groupId: number | null;    // group the player is in, or null
}

interface Player {
  xp: number;
  level: number;
}

interface KillInput {
  mobXp: number;                      // XP value of the mob (donor: ExperienceValue)
  mobExceedCap: number;               // 1.0 for ordinary mobs (donor: ExceedXPCapAmount)
  capPercent: number;                 // 125 = cap at 1.25 x the receiver's own level XP (donor: XP_CAP_PERCENT)
  totalDamage: number;                // all damage the mob took from everyone
  attackers: Contributor[];           // everyone who hit the mob (MAX_ATTACKERS = 3 in Frankendom)
  receiver: Contributor;              // the player being awarded; must be in attackers
  xpRate: number;                     // multiplier on the base only (donor: XP_RATE)
  groupBonusPerExtra: number;         // 0.125 per extra contributor in the group (donor constant)
  levelXp: (level: number) => number; // XP needed to reach a level (donor table: XPForLevel)
  maxLevel: number;                   // 50 in the donor
}

// Base XP for one receiver. Order: even split, cap on the receiver's own level, zero check, damage share, group bonus, rate.
function killBaseXp(k: KillInput): number {
  const unit = k.receiver.groupId === null
    ? [k.receiver]
    : k.attackers.filter(a => a.groupId === k.receiver.groupId);
  const count = unit.length;
  const unitDamage = unit.reduce((sum, a) => sum + a.damage, 0);

  let base = count > 1 ? Math.ceil(k.mobXp / count) : k.mobXp; // even split (donor also re-levels this for mixed groups; omitted)
  const cap = Math.floor(k.levelXp(k.receiver.level) * (k.capPercent / 100) * k.mobExceedCap);
  base = Math.min(base, cap);                                  // cap FIRST, against the receiver's own level
  if (base <= 0) return 0;                                     // zero check BEFORE the share (donor 76-77)
  const share = Math.min(1, unitDamage / k.totalDamage);
  base = Math.floor(base * share);                             // damage share AFTER the cap; may reach 0, which still proceeds (donor)

  const groupBonus = Math.floor(base * Math.max(0, count - 1) * k.groupBonusPerExtra);
  return Math.floor(base * k.xpRate) + groupBonus;             // rate applies to the base only, not to the bonus
}

// Apply an XP change. A loss can never take the player below the floor of the current level.
function applyXp(p: Player, delta: number, k: KillInput): void {
  const floor = k.levelXp(p.level);
  if (p.xp + delta < floor) delta = floor - p.xp;
  p.xp += delta;
  // one level step per call, and only on a gain (donor: Level++ once, not a loop)
  if (delta >= 0 && p.level < k.maxLevel && p.xp >= k.levelXp(p.level + 1)) p.level += 1;
}

export {}
