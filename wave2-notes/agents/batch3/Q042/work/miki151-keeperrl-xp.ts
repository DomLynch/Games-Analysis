// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Gain constants are inputs (designer data) here; the donor's values are not copied into the rules object.
// clean-room
interface CombatXp {
  xp: number;            // stored combat experience (fractional)
  peakAttack: number;    // highest attack value seen so far (integer in the donor)
  maxPromotion: number;  // cap on the value used for attacks is 5 x maxPromotion
}

interface XpRules {
  maxGain: number;        // largest gain per kill
  minGain: number;        // smallest gain per kill (floor against farming weak enemies)
  equalGain: number;      // gain when victim and killer have the same peak attack
  gapForMaxGain: number;  // attack gap at which the largest gain is reached
}

// Gain is linear in the attack gap between victim and killer, clamped to [minGain, maxGain].
function killGain(killer: CombatXp, victimPeak: number, rules: XpRules): number {
  const gap = victimPeak - killer.peakAttack;
  const linear = (rules.maxGain - rules.equalGain) * gap / rules.gapForMaxGain + rules.equalGain;
  return Math.max(rules.minGain, Math.min(rules.maxGain, linear));
}

// Only eligible killers gain. Returns true when the whole-number level changed (the donor plays its level-up cue here).
function awardKill(killer: CombatXp, victimPeak: number, eligible: boolean, rules: XpRules): boolean {
  if (!eligible) return false;
  const before = Math.floor(killer.xp);
  killer.xp += killGain(killer, victimPeak, rules);
  return Math.floor(killer.xp) !== before;
}

// The value used for attacks is capped by the promotion cap (5 per promotion level).
function cappedXp(c: CombatXp): number {
  return Math.min(5 * c.maxPromotion, c.xp);
}

interface TeamMember {
  c: CombatXp;
  leader: boolean;       // carries the leadership buff
}

// Team value: the leader's capped value if a leader exists (and stops the scan); otherwise the best capped member.
function teamValue(members: readonly TeamMember[]): { value: number; leadership: boolean } {
  let value = 0;
  for (const m of members) {
    if (m.leader) return { value: cappedXp(m.c), leadership: true };
    value = Math.max(value, cappedXp(m.c));
  }
  return { value, leadership: false };
}

// A member's effective value for attacks: the team value under leadership, otherwise the mean of own and team value.
function effectiveXp(member: CombatXp, team: { value: number; leadership: boolean }): number {
  const own = cappedXp(member);
  if (team.leadership) return team.value;
  if (team.value > 0) return (team.value + own) / 2;
  return own;
}

// Peak attack is raised each tick from the uncapped value (the caller computes bestAttackUncapped).
function updatePeak(c: CombatXp, bestAttackUncapped: number): void {
  c.peakAttack = Math.max(c.peakAttack, bestAttackUncapped);
}

export {}
