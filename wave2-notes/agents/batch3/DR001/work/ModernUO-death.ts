// Licence: GPL-3.0 (donor ModernUO). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room

// ---- 1. Death: where each item goes (worn items and pack items use one rule set) ----
export type Fate = "corpse" | "keep" | "remain";
export interface ItemFlags { movable: boolean; blessed: boolean; insured: boolean; newbied: boolean; nontransferable: boolean; }
export interface VictimCtx { isPlayer: boolean; keepsItems: boolean; murderer: boolean; young: boolean; }

export function fateOnDeath(it: ItemFlags, v: VictimCtx, worn: boolean): Fate {
  if (!it.movable) return worn ? "remain" : "keep";
  if (v.keepsItems || it.blessed || it.insured) return "keep";
  if (it.newbied && !v.murderer) return "keep";
  if (v.isPlayer && it.nontransferable) return "keep";
  if (v.isPlayer && v.young) return "keep";   // young players lose nothing on the corpse
  return "corpse";
}

// ---- 2. Insurance: one saved item per paid cover ----
export interface InsuranceOutcome { saved: boolean; bank: number; stillInsured: boolean; bonusToKiller: number; }

export function settleInsurance(
  insured: boolean, autoRenew: boolean, bank: number, killedByPlayer: boolean, inDuel: boolean,
): InsuranceOutcome {
  if (!insured) return { saved: false, bank, stillInsured: false, bonusToKiller: 0 };
  if (inDuel) return { saved: true, bank, stillInsured: true, bonusToKiller: 0 }; // duel: kept, cover not spent
  if (!autoRenew) return { saved: true, bank, stillInsured: false, bonusToKiller: 300 }; // cover used up
  const cost = killedByPlayer ? 300 : 600;   // flat cost in the donor, halved when a player killed you
  if (bank >= cost) return { saved: true, bank: bank - cost, stillInsured: true, bonusToKiller: 300 };
  return { saved: true, bank, stillInsured: false, bonusToKiller: 300 }; // saved now, renewal missed
}

// ---- 3. Monster loot rights: damage share with a threshold that scales with max HP ----
export function lootRights(totals: Map<string, number>, hitsMax: number, firstDamager?: string): Set<string> {
  const rights = new Set<string>();
  if (totals.size === 0) return rights;
  if (firstDamager !== undefined && totals.has(firstDamager)) {
    totals.set(firstDamager, Math.trunc((totals.get(firstDamager) as number) * 1.25)); // first hit gets 25 percent
  }
  const top = Math.max(...totals.values());
  const div = hitsMax >= 3000 ? 16 : hitsMax >= 1000 ? 8 : hitsMax >= 200 ? 4 : 2;
  const min = Math.trunc(top / div);
  for (const [who, dmg] of totals) if (dmg >= min) rights.add(who);
  return rights;
}

// ---- 4. Corpse looting: a non-owner loot can be a criminal act ----
export interface CorpseLootCtx {
  owner: string;
  partyMemberCanLoot: (who: string) => boolean;
  notorietyInnocent: (who: string) => boolean; // from the donor's CorpseNotoriety (not read in full)
  harmfulRestrictionsMap: boolean;
}
export function canLoot(c: CorpseLootCtx, who: string): { ok: boolean; criminal: boolean } {
  const criminal = who !== c.owner && !c.partyMemberCanLoot(who) && c.notorietyInnocent(who);
  return { ok: !criminal || !c.harmfulRestrictionsMap, criminal };
}

// ---- 5. Animate dead: ability, tiers, and a rolling cap of three per caster ----
// Fixed: multiply before divide (the donor divides by 10 first, which steps in blocks of 10 raw points).
export function undeadAbility(necro: number, spirit: number, ownerFame: number): number {
  const raw = Math.trunc(necro * 30) + Math.trunc(spirit * 70);
  return Math.min(Math.max(Math.trunc((raw * 18) / 10), 0), ownerFame);
}

export interface Tier<T> { min: number; kinds: T[]; }   // tiers ordered from highest min to lowest
export function pickTier<T>(ability: number, tiers: Tier<T>[], rnd: () => number): T | null {
  for (const t of tiers) {
    if (ability < t.min || t.kinds.length === 0) continue;
    return t.kinds[Math.floor(rnd() * t.kinds.length)] ?? null;
  }
  return null;
}

export function registerUndead(list: number[], id: number, cap = 3): number | null {
  list.push(id);
  return list.length > cap ? (list.shift() as number) : null; // the oldest is killed
}

// Rot: one hit point per tick (donor interval 1650 ms), dies at zero.
export function rotTick(hp: number): { hp: number; dead: boolean } {
  return hp > 0 ? { hp: hp - 1, dead: false } : { hp: 0, dead: true };
}
export {};
