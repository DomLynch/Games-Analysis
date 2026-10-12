// Licence: AGPL-3.0 (donor). Clean-room sketch of the shape only: fame-gated guard aggro, assist rule, aggro floors.
interface GuardGroup {
  aggroRange: number;                       // donor: 25 unless a ring group sets its own
  playerAttackable: boolean;                // donor: group-wide switch
  attackableAt: (fame: number) => boolean;  // donor: per-faction switch, a threshold per group script
  attackBelow: number;                      // donor: FameForGuardAttack (default -450000)
  helpAtOrAbove: number;                    // donor: FameForGuardHelp (default -450000)
}

type TargeterKind = "player" | "guardNpc" | "sameFactionNpc" | "otherNpc";

interface Targeter { id: number; kind: TargeterKind; }

interface VisiblePlayer {
  id: number;
  alive: boolean;
  distance: number;          // from the group centre
  fame: number;              // standing toward the guard faction
  outpostAttacker: boolean;  // donor: outpost faction test
  targeters: Targeter[];     // entities currently targeting this player
}

interface Floor { entityId: number; floor: number; }

const FLOOR_TARGET = 1.0;    // donor: aggro floor for the attacked player or for the attacker
const FLOOR_AMBIENT = 0.5;   // donor: floor for bandits and predators inside range

// One guard tick for one visible player. Donor order: attack rule first (and it ends the player), then assist.
function guardFloorsFor(g: GuardGroup, p: VisiblePlayer): Floor[] {
  if (!p.alive || p.distance > g.aggroRange) return [];

  const willing = g.playerAttackable || g.attackableAt(p.fame);
  if (willing && (p.fame < g.attackBelow || p.outpostAttacker)) {
    return [{ entityId: p.id, floor: FLOOR_TARGET }];
  }

  const out: Floor[] = [];
  for (const t of p.targeters) {
    if (t.kind === "player" || t.kind === "guardNpc") continue;
    if (t.kind === "sameFactionNpc") {
      out.push({ entityId: p.id, floor: FLOOR_TARGET });   // guards side with the player against their own kind
      continue;
    }
    if (p.fame >= g.helpAtOrAbove && !p.outpostAttacker) {
      out.push({ entityId: t.id, floor: FLOOR_TARGET });   // help: hit the attacker of a player in good standing
    }
  }
  return out;
}

// Bandits and predators within range get the ambient floor.
function ambientFloors(g: GuardGroup, ambient: { id: number; distance: number }[]): Floor[] {
  return ambient.filter((a) => a.distance <= g.aggroRange).map((a) => ({ entityId: a.id, floor: FLOOR_AMBIENT }));
}

export {};
