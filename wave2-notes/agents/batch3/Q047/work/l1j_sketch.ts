// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
export interface Hitter { id: string; hate: number; }      // hate = damage dealt; dead hitters removed by the caller
export interface Member { id: string; level: number; }     // killer's known party members (killer included)
export interface Award { id: string; exp: number; }

const MEMBER_BONUS = 0.04;   // donor: MemberPartyBonus, per known party member
export const PARTY_RATE = 1.0; // donor: Config PartyExp, default 1.0

// Splits one kill's XP. `members` is null when the killer is solo.
// `partyIds` are all party members (known or not): their hate is pooled, but only known members are paid.
export function splitKill(
  hitters: Hitter[],
  exp: number,
  partyIds: Set<string> | null,
  members: Member[] | null,
  knownOtherMembers: number,
  royalBonus: number,
): Award[] {
  const total = hitters.reduce((s, h) => s + h.hate, 0);
  if (total <= 0) return [];
  const out: Award[] = [];
  if (partyIds === null || members === null) {
    for (const h of hitters) out.push({ id: h.id, exp: Math.floor(exp * h.hate / total) });
    return out;
  }
  let partyHate = 0;
  for (const h of hitters) {
    if (partyIds.has(h.id)) partyHate += h.hate;
    else out.push({ id: h.id, exp: Math.floor(exp * h.hate / total) });
  }
  let partyExp = Math.floor(exp * partyHate / total);
  partyExp = Math.floor(partyExp * (1 + PARTY_RATE * (MEMBER_BONUS * knownOtherMembers + royalBonus)));
  const levelSq = members.reduce((s, m) => s + m.level * m.level, 0);
  if (levelSq <= 0) return out;
  for (const m of members) {
    const dist = (m.level * m.level) / levelSq;
    out.push({ id: m.id, exp: Math.floor(partyExp * dist) });
  }
  return out;
}

export {};
