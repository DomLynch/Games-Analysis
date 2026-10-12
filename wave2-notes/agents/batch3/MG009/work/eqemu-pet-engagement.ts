// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface Pet {
  id: string;
  ownerId: string;
  kind: "main" | "swarm";
  familiar: boolean;          // familiars never join an owner's fight
  aggroImmune: boolean;       // others may not add this pet to a hate list
  engaged: boolean;           // already in a fight
  held: boolean;              // Hold stance; main pets only, per the donor gate
  gheld: boolean;             // never auto-engages
  targetLockId: string | null; // target-lock pets keep the caster's target id
}

export interface Attacker { id: string; kind: "npc" | "client" | "bot" | "corpse" | "trap"; }

// Frankendom ruling; the donor has no cap on pets joining one fight.
export const MAX_ATTACKERS = 3;

// The owner was hit: free pets of that owner join the attacker.
export function petsAnswerOwnerHit(
  ownerId: string, attacker: Attacker, pets: Pet[], attackersAlready: number,
): string[] {
  if (attacker.kind === "corpse" || attacker.kind === "trap" || attacker.id === ownerId) return [];
  const joined: string[] = [];
  for (const p of pets) {
    if (p.ownerId !== ownerId || p.familiar || p.aggroImmune || p.engaged) continue;
    if (p.kind === "main" && (p.held || p.gheld)) continue;
    if (attackersAlready + joined.length >= MAX_ATTACKERS) break;
    joined.push(p.id);
  }
  return joined;
}

// The owner engaged something: swarm pets add that target to their hate lists.
export function swarmJoinOnOwnerEngage(ownerId: string, pets: Pet[]): string[] {
  return pets.filter((p) => p.ownerId === ownerId && p.kind === "swarm" && !p.aggroImmune).map((p) => p.id);
}

// Swarm pets end with their owner's object (donor: the owner destructor depops them).
export function swarmRemovedWithOwner(ownerId: string, pets: Pet[]): string[] {
  return pets.filter((p) => p.ownerId === ownerId && p.kind === "swarm").map((p) => p.id);
}

// Summon-time gate for a target-lock pet: needs a target; a self-cast needs the target within 200 units.
export function targetLockSummonOk(selfCast: boolean, hasTarget: boolean, distance: number): boolean {
  if (!hasTarget) return false;
  return selfCast ? distance <= 200 : true;
}

// Called only when the caster's target actually changes. Ends a target-lock pet when the new target
// is gone, is not the locked id, or is a corpse. The donor then unsummons it (20k self damage, then Kill).
export function targetLockEnds(p: Pet, newTarget: { id: string; isCorpse: boolean } | null): boolean {
  if (p.targetLockId === null) return false;
  if (newTarget === null) return true;
  return newTarget.id !== p.targetLockId || newTarget.isCorpse;
}

export type FollowStep = "hold" | "walk" | "run" | "snap";

// Squared distance thresholds from the donor: 400 (20 units) stop, 1225 (35) run, 202500 (450) snap.
// Fix: the donor's snap branch calls the same walk or run as the else branch; here snap is a teleport beside the owner.
export function followStep(distSq: number, zDiff: number): FollowStep {
  if (distSq < 400 && zDiff <= 100) return "hold";
  if (distSq >= 202500 || zDiff > 100) return "snap";
  return distSq >= 1225 ? "run" : "walk";
}

export {};
