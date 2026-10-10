// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MAX_PARTY = 6;          // fixed slots per party
const MIN_PARTY_KEEP = 2;     // a leave that would leave fewer than this disbands the party

interface Party {
  id: number;
  leader: string;
  slots: (string | null)[];   // fixed-size slot array, one name per slot
}

interface Player {
  name: string;
  zone: string;
  partyId: number | null;
}

type JoinResult = 'joined' | 'refused:inviter-gone' | 'refused:already' | 'refused:full';

function partySize(p: Party): number {
  return p.slots.filter((s) => s !== null).length;
}

// Invitee accepts. The party is created here, at accept time; the server holds no pending invite.
function acceptInvite(
  parties: Map<number, Party>,
  players: Map<string, Player>,
  nextId: { value: number },
  invitee: string,
  inviter: string,
): JoinResult {
  const me = players.get(invitee);
  const inv = players.get(inviter);
  if (!me || !inv || me.zone !== inv.zone) return 'refused:inviter-gone';
  if (me.partyId !== null) return 'refused:already';

  let party = inv.partyId !== null ? parties.get(inv.partyId) : undefined;
  if (party === undefined) {
    // No party yet: the inviter starts one in slot 0. A new party cannot be full.
    party = { id: nextId.value++, leader: inv.name, slots: new Array<string | null>(MAX_PARTY).fill(null) };
    party.slots[0] = inv.name;
    parties.set(party.id, party);
    inv.partyId = party.id;
  }
  if (party.slots.includes(me.name)) return 'refused:already';
  if (partySize(party) >= MAX_PARTY) return 'refused:full';

  const slot = party.slots.indexOf(null);
  party.slots[slot] = me.name;
  me.partyId = party.id;
  return 'joined';
}

function disband(parties: Map<number, Party>, players: Map<string, Player>, party: Party): void {
  for (const name of party.slots) {
    if (name === null) continue;
    const p = players.get(name);
    if (p) p.partyId = null;
  }
  parties.delete(party.id);
}

// Leader leaving always disbands. Any leave that leaves fewer than MIN_PARTY_KEEP also disbands.
function leaveParty(parties: Map<number, Party>, players: Map<string, Player>, who: string): 'left' | 'disbanded' {
  const p = players.get(who);
  if (!p || p.partyId === null) return 'left';
  const party = parties.get(p.partyId);
  if (party === undefined) { p.partyId = null; return 'left'; }
  if (who === party.leader || partySize(party) - 1 < MIN_PARTY_KEEP) {
    disband(parties, players, party);
    return 'disbanded';
  }
  party.slots[party.slots.indexOf(who)] = null;
  p.partyId = null;
  return 'left';
}

// Leader may remove anyone; a member may only remove themselves.
function kick(parties: Map<number, Party>, players: Map<string, Player>, by: string, target: string): boolean {
  const p = players.get(target);
  if (!p || p.partyId === null) return false;
  const party = parties.get(p.partyId);
  if (party === undefined) return false;
  if (by !== party.leader && by !== target) return false;
  leaveParty(parties, players, target);
  return true;
}

export {};
