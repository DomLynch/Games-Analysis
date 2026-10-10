interface Stack { id: string; qty: number; }

interface Body {
  tile: number;
  stacks: Stack[];        // inventory; money is a stack with id "money"
  noDrop: boolean;        // donor CRITTER_NO_DROP
  specialDeath: boolean;  // donor CRITTER_SPECIAL_DEATH
  noHeal: boolean;        // donor CRITTER_NO_HEAL; such bodies are not aged
  isRobot: boolean;       // donor KILL_TYPE_ROBOT; such bodies are not aged
  dead: boolean;
}

interface GroundPile { tile: number; id: string; qty: number; }

const EXPIRE_AFTER_S = 6 * 24 * 3600;   // donor: 6 * 24 hours since last visit (zone data in Frankendom)

// Spill every stack of a body onto the ground, one pile per stack.
function spill(body: Body, ground: GroundPile[]): void {
  for (const s of body.stacks) ground.push({ tile: body.tile, id: s.id, qty: s.qty });
  body.stacks = [];
}

// Kill-time rule: only a body that vanishes spills. A body that stays keeps its loot for looting.
function onKill(body: Body, vanishes: boolean, ground: GroundPile[]): void {
  if (vanishes && !body.specialDeath && !body.noDrop) spill(body, ground);
}

// Zone re-entry after `secondsAway`: if the gap passes the threshold, every aging body spills
// (unless noDrop) and is removed. Bodies that are robots or noHeal are kept.
function onZoneReentry(bodies: Body[], secondsAway: number, ground: GroundPile[]): Body[] {
  if (secondsAway <= EXPIRE_AFTER_S) return bodies;
  const kept: Body[] = [];
  for (const b of bodies) {
    const ages = b.dead && !b.isRobot && !b.noHeal;
    if (!ages) { kept.push(b); continue; }
    if (!b.noDrop) spill(b, ground);
    // the body itself is removed (donor objectDestroy); nothing pushed to kept
  }
  return kept;
}

export {};
