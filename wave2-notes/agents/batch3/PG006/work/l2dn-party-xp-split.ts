// Licence: MIT (donor LICENSE, Grymyr / L2Dn Server Project). Written from the described shape, not a line-by-line port.
export interface PartyMember {
  id: string;
  level: number;
  inRange: boolean; // within reward range of the kill
  alive: boolean;
}

// Party XP bonus on the pool, indexed by members minus one, capped at the last entry.
const PARTY_BONUS = [1.0, 1.6, 1.65, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2];

// Level-gap rules: first match wins. Levels are the top member's level minus this member's level.
export const GAP_RULES: ReadonlyArray<{ min: number; max: number; pct: number }> = [
  { min: 0, max: 9, pct: 1.0 },
  { min: 10, max: 14, pct: 0.3 },
  { min: 15, max: 99, pct: 0 },
];

// poolBase is the monster XP already scaled by this party's damage share (applied once, by the caller).
// rateParty is the party XP rate from zone or engine data.
export function splitPartyXp(poolBase: number, members: PartyMember[], rateParty: number): Map<string, number> {
  const eligible = members.filter(m => m.inRange && m.alive);
  const out = new Map<string, number>();
  const n = eligible.length;
  if (n === 0) return out;

  const bonus = n < 2 ? PARTY_BONUS[0] : PARTY_BONUS[Math.min(n - 1, PARTY_BONUS.length - 1)] * rateParty;
  const pool = poolBase * bonus;

  const topLevel = Math.max(...eligible.map(m => m.level));
  const sqSum = eligible.reduce((s, m) => s + m.level * m.level, 0);

  for (const m of eligible) {
    const share = (pool * (m.level * m.level)) / sqSum;
    const diff = topLevel - m.level;
    const rule = GAP_RULES.find(g => diff >= g.min && diff <= g.max);
    out.set(m.id, rule ? share * rule.pct : 0); // no rule matched: 0 here (donor differs, see gaps)
  }
  return out;
}

export {};
