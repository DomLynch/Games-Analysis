// Licence: GPL-3.0 (donor, LICENSE.md). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
export interface Member { id: string; level: number; }
export interface Award { id: string; exp: number; }
export interface GroupRules { memberStep: number; fullGroupMod: number; poolMultiplier: number; }

// Kill pool before the group step. Donor EXP_FORMULA = level^2 * 75 * 35 / 10 (about level^2 * 262.5).
export function killPool(npcLevel: number, killExpModPct: number | null): number {
  let ret = Math.floor(npcLevel * npcLevel * 2625 / 10);
  if (killExpModPct !== null && killExpModPct >= 0) ret = Math.floor(ret * killExpModPct / 100);
  return ret;
}

// Donor GetEXPForLevel: total XP at which a character is `level`. Closed form, not a sum of steps.
export function levelThreshold(level: number): number {
  const bands: Array<[number, number]> = [
    [31, 1.0], [36, 1.1], [41, 1.2], [46, 1.3], [52, 1.4], [53, 1.5], [54, 1.6],
    [55, 1.7], [56, 1.9], [57, 2.1], [58, 2.3], [59, 2.5], [60, 2.7], [61, 3.0],
  ];
  let mod = 3.1;
  for (const [limit, m] of bands) {
    if (level < limit) { mod = m; break; }
  }
  if (level <= 1) return 0;
  return Math.floor(Math.pow(level - 1, 3) * mod * 1000);
}

// One group kill. Grey kills (below the highest member's con) give the group nothing.
export function splitGroupKill(exp: number, members: Member[], grayCon: boolean, rules: GroupRules): Award[] {
  const n = members.length;
  if (n === 0 || grayCon) return [];
  let groupModifier = 1.0;
  if (n >= 2 && n <= 5) groupModifier = 1 + rules.memberStep * (n - 1);
  else if (n === 6) groupModifier = rules.fullGroupMod;
  let pool = exp;
  if (n >= 2 && n <= 6) pool += Math.floor(exp * groupModifier * rules.poolMultiplier);
  const highest = Math.max(...members.map(m => m.level));
  const share = Math.floor(pool / n);            // equal share over ALL members, eligible or not
  const out: Award[] = [];
  for (const m of members) {
    const diff = m.level - highest;
    const maxDiff = -Math.max(5, Math.floor(m.level * 15 / 10) - m.level); // level-gap allowance
    if (diff < maxDiff) continue;                // too far below the highest member: no share
    const cap = Math.floor((m.level + 3) ** 2 * 2625 / 10);  // per-member cap, level plus three
    out.push({ id: m.id, exp: Math.min(cap, share) });
  }
  return out;
}

export {};
