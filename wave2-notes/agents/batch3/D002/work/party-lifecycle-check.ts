// Licence: GPL-2.0 (donor, DOLSharp LICENSE; file headers GPL-2.0-or-later). Clean-room sketch of the mechanism, not a translation.
interface Member {
  id: string;
  isPlayer: boolean;
}

interface Party {
  leaderId: string | null;
  members: Member[];        // join order; index 0 is not always the leader (donor MakeLeader swaps)
  maxMembers: number;       // GROUP_MAX_MEMBER, 8 (zone or engine data)
}

// Who may invite: the leader, when the inviter is in a party (donor InviteToGroupHandler 63-67).
function canInvite(inviterId: string, party: Party | null): boolean {
  return party === null || party.leaderId === inviterId;
}

// Accepting an invite: the joiner must be free and not in combat (donor DialogResponseHandler 208-221).
function canAccept(joinerInParty: boolean, joinerInCombat: boolean): string | null {
  if (joinerInParty) return "already in a party";
  if (joinerInCombat) return "in combat";
  return null;
}

// Add a member at the end of the join order. Refuses a full party or a duplicate.
function addMember(p: Party, m: Member): "ok" | "full" | "duplicate" {
  if (p.members.length >= p.maxMembers) return "full";
  if (p.members.some((x) => x.id === m.id)) return "duplicate";
  p.members.push(m);
  return "ok";
}

// Remove a member. If one member would be left, that member is removed too and the party is gone.
// If the leader leaves and two or more remain, the first remaining player in join order leads.
// Returns true if the party still exists.
function removeMember(p: Party, id: string): boolean {
  const idx = p.members.findIndex((x) => x.id === id);
  if (idx < 0) return true;
  const wasLeader = p.leaderId === id;
  p.members.splice(idx, 1);

  if (p.members.length <= 1) {
    p.members = [];
    p.leaderId = null;
    return false;
  }
  if (wasLeader) {
    const next = p.members.find((x) => x.isPlayer) ?? p.members[0];
    p.leaderId = next.id;
  }
  return true;
}

// Swap the chosen member into slot 0 and make them leader.
function makeLeader(p: Party, id: string): boolean {
  const idx = p.members.findIndex((x) => x.id === id);
  if (idx < 0) return false;
  const first = p.members[0];
  p.members[0] = p.members[idx];
  p.members[idx] = first;
  p.leaderId = id;
  return true;
}

export {}
