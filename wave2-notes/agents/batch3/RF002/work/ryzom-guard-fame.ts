// Licence: AGPL-3.0 (donor). Clean-room sketch of the shape only: fame-gated guard aggro, assist rule, aggro floors.
interface GuardGroup {
  aggroRange: number;                       // donor: 25 unless a ring group sets its own
  playerAttackable: boolean;                // donor: group-wide switch
  attackableAbove: number[];                // donor: _FactionAttackableAbove thresholds for this faction (attackable when fame > t)
  attackableBelow: number[];                // donor: _FactionAttackableBelow thresholds for this faction (attackable when fame < t)
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

// Donor isFactionAttackable: strict above any Above threshold, or strict below any Below threshold.
function isFactionAttackable(g: GuardGroup, fame: number): boolean {
  return g.attackableAbove.some((t) => fame > t) || g.attackableBelow.some((t) => fame < t);
}

// One guard tick for one visible player. Donor order: attack rule first (and it ends the player), then assist.
function guardFloorsFor(g: GuardGroup, p: VisiblePlayer): Floor[] {
  if (!p.alive || p.distance > g.aggroRange) return [];

  const willing = g.playerAttackable || isFactionAttackable(g, p.fame);
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

// Bandits and predators strictly inside range get the ambient floor (donor uses < here, players use the <= test above).
function ambientFloors(g: GuardGroup, ambient: { id: number; distance: number }[]): Floor[] {
  return ambient.filter((a) => a.distance < g.aggroRange).map((a) => ({ entityId: a.id, floor: FLOOR_AMBIENT }));
}

export {};
