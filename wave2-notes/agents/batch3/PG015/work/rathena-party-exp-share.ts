// Licence: GPL-3.0 (donor, LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface PartyMember {
  id: number;
  level: number;
  online: boolean;
  alive: boolean;
  map: string;
}

interface Party {
  members: PartyMember[];
  expShare: boolean;   // the flag the server turns off when the level band breaks
}

interface Attacker {
  id: number;
  partyId: number | null;
  dmg: number;         // damage this attacker dealt to the mob
}

// Level band over ONLINE members only, then the share is allowed if the band fits.
// The donor also accepts a family exemption; this sketch takes it as an input.
function bandAllowsShare(p: Party, shareLevel: number, familyExempt: boolean): boolean {
  if (p.members.length < 2) return true;
  let min = Infinity;
  let max = 0;
  for (const m of p.members) {
    if (!m.online) continue;
    min = Math.min(min, m.level);
    max = Math.max(max, m.level);
  }
  return max - min <= shareLevel || familyExempt;
}

// One mob kill. Each attacker's share is its damage over the total damage (capped at 1).
// Shares from a party with exp share on are pooled; everyone else is paid directly.
// The pool is then split evenly among the party's living members on the mob's map,
// whether or not they hit the mob, with an optional bonus per extra member.
function splitKillExp(
  mobExp: number,
  mobMap: string,
  attackers: Attacker[],
  parties: Map<number, Party>,
  evenShareBonusPct: number,
): Map<number, number> {
  const paid = new Map<number, number>();
  const pool = new Map<number, number>();
  let total = 0;
  for (const a of attackers) total += a.dmg;
  if (total === 0) return paid;

  for (const a of attackers) {
    const share = Math.min(1, a.dmg / total) * mobExp;
    const party = a.partyId === null ? undefined : parties.get(a.partyId);
    if (party && party.expShare) {
      pool.set(a.partyId as number, (pool.get(a.partyId as number) ?? 0) + share);
    } else {
      paid.set(a.id, (paid.get(a.id) ?? 0) + Math.floor(share));
    }
  }

  for (const [partyId, amount] of pool) {
    const party = parties.get(partyId);
    if (!party) continue;
    const eligible = party.members.filter((m) => m.alive && m.map === mobMap);
    const c = eligible.length;
    if (c < 1) continue;
    let each = Math.floor(amount / c);
    if (evenShareBonusPct > 0 && c > 1) {
      each = Math.floor((each * (100 + evenShareBonusPct * (c - 1))) / 100);
    }
    for (const m of eligible) paid.set(m.id, (paid.get(m.id) ?? 0) + each);
  }
  return paid;
}

export {};
