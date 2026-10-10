// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Perm = "chat" | "kick" | "setRank" | "editRanks" | "cheat";
const PERMS: Perm[] = ["chat", "kick", "setRank", "editRanks", "cheat"];

export interface Rank {
  id: number;           // smaller id = higher rank (0 = top)
  perms: number;        // bitmask, bit i = PERMS[i]
}

export interface Member {
  id: number;
  rankId: number;
  isHost: boolean;
  cooldownTicks: Map<string, number>;   // action name -> ticks left
}

export const bit = (p: Perm): number => 1 << PERMS.indexOf(p);
export const can = (r: Rank, p: Perm): boolean => (r.perms & bit(p)) !== 0;

// Server gate for one game action. Returns null if allowed, else the refusal reason.
export function gateAction(
  actor: Member, ranks: Map<number, Rank>, action: string, needs: Perm, cooldownTicks: number,
): string | null {
  const rank = ranks.get(actor.rankId);
  if (rank === undefined || !can(rank, needs)) return "permission";
  if (!actor.isHost && (actor.cooldownTicks.get(action) ?? 0) > 0) return "cooldown";
  if (!actor.isHost && cooldownTicks > 0) actor.cooldownTicks.set(action, cooldownTicks);
  return null;
}

// Fixed-tick decay: call once per server tick for every member.
export function decayCooldowns(m: Member): void {
  for (const [name, left] of m.cooldownTicks) {
    if (left - 1 <= 0) m.cooldownTicks.delete(name);
    else m.cooldownTicks.set(name, left - 1);
  }
}

// Rank change. The donor checks: the actor holds setRank, the target is not the host, and only the top rank can promote to the top rank.
// Added here (not in the donor): the actor may not touch a member ranked above them, nor promote anyone above their own rank.
export function canSetRank(
  actor: Member, target: Member, toRankId: number, ranks: Map<number, Rank>,
): boolean {
  const a = ranks.get(actor.rankId);
  if (a === undefined || !can(a, "setRank") || target.isHost) return false;
  if (toRankId === 0 && actor.rankId !== 0) return false;      // donor rule: only top rank promotes to top rank
  if (target.rankId < actor.rankId) return false;               // added: no touching a higher rank
  if (toRankId < actor.rankId) return false;                    // added: no promoting above yourself
  return ranks.has(toRankId);
}

export {};
