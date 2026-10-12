// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface SummonCap { playerCap: number; monsterCap: number; }  // 0 = uncapped for that caster kind
export interface Summon { id: string; spell: string; casterId: string; remaining: number; linkId: string | null; }

// Catalogue data: one cap per spell, separately for player and monster casters.
export const CAPS: Record<string, SummonCap> = {
  haunt: { playerCap: 8, monsterCap: 8 },
  simulacrum: { playerCap: 5, monsterCap: 5 },
  "summon-undead": { playerCap: 0, monsterCap: 8 },
};

export function capFor(spell: string, casterIsPlayer: boolean): number {
  const c = CAPS[spell];
  if (!c) return 0;
  return casterIsPlayer ? c.playerCap : c.monsterCap;
}

// A monster caster does not start a capped summon when it is already at the cap.
export function mayStartSummon(
  list: Summon[], casterId: string, spell: string, casterIsPlayer: boolean,
): boolean {
  const cap = capFor(spell, casterIsPlayer);
  if (cap === 0) return true;
  return list.filter((s) => s.casterId === casterId && s.spell === spell).length < cap;
}

// Adds a summon and enforces the cap. The new one counts as 1; when the total is over the cap, the
// summon with the least remaining time goes, and so does its linked group. Returns the removed ids.
export function addSummon(list: Summon[], s: Summon, casterIsPlayer: boolean): string[] {
  list.push(s);
  const cap = capFor(s.spell, casterIsPlayer);
  if (cap === 0) return [];
  const others = list.filter((x) => x !== s && x.casterId === s.casterId && x.spell === s.spell);
  if (1 + others.length <= cap || others.length === 0) return [];

  let oldest = others[0];
  for (const o of others) {
    if (o.remaining < oldest.remaining) oldest = o;
  }
  const removed = new Set<string>([oldest.id]);
  if (oldest.linkId !== null) {
    for (const o of others) {
      if (o.linkId === oldest.linkId) removed.add(o.id);
    }
  }
  for (let i = list.length - 1; i >= 0; i--) {
    if (removed.has(list[i].id)) list.splice(i, 1);
  }
  return [...removed];
}

// Donor summ_dur: base 100 per degree up to 4, plus 500 from degree 5 and 1000 from degree 6 (the
// degree-6 base is set, not added), then fuzzed to [base - 60%, base + 40%].
export function summonDuration(degree: number, rnd: () => number): number {
  let base = 0;
  if (degree >= 6) base = 1000;
  if (degree >= 5) base += 500;
  base += 100 * Math.min(4, degree);
  const lo = Math.floor((60 * base) / 100);
  const hi = Math.floor((40 * base) / 100);
  return base - lo + Math.floor(rnd() * (lo + hi + 1));
}

// While the necromancy effect is active, a monster death in line of sight raises a zombie with chance
// (150 + power / 2) / 200, capped at 1. Donor uses a randomised half of the power; this uses floor.
export function raiseOnKillChance(power: number): number {
  const x = 150 + Math.floor(power / 2);
  return Math.min(1, x / 200);
}

export {};
