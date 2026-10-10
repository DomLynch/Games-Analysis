// Licence: MIT (donor, OpenGothic). Clean-room sketch of the mechanism as described in the note; not a translation.
type Tier = "near" | "mid" | "far";

interface TierZone {
  nearRadius: number; // zone data, world units
  farRadius: number;  // zone data, world units
}

interface Actor {
  id: number;
  x: number; y: number; z: number;
  tier: Tier;
  nextPercTick: number;
  isPlayer: boolean;
  isDead: boolean;
}

// Squared-distance comparisons, as in the donor (no sqrt per actor).
function tierFor(distSq: number, zone: TierZone): Tier {
  const nearSq = zone.nearRadius * zone.nearRadius;
  const farSq = zone.farRadius * zone.farRadius;
  if (distSq < nearSq) return "near";
  if (distSq < farSq) return "mid";
  return "far";
}

// Runs once per tick before perception. Every actor is still updated elsewhere; this only sets the tier and returns the near list.
function assignTiers(actors: Actor[], player: Actor, zone: TierZone): Actor[] {
  const near: Actor[] = [];
  for (const a of actors) {
    if (a === player) continue; // the donor leaves the player on its own policy
    const dx = a.x - player.x;
    const dy = a.y - player.y;
    const dz = a.z - player.z;
    a.tier = tierFor(dx * dx + dy * dy + dz * dz, zone);
    if (a.tier === "near") near.push(a);
  }
  near.push(player);
  return near;
}

// Perception only for the near list. A due actor scans, then its timer is re-armed (minimum 1 tick).
function perceptionPass(
  near: Actor[],
  nowTick: number,
  intervalTicks: number,
  scan: (a: Actor) => void,
): void {
  for (const a of near) {
    if (a.isPlayer || a.isDead) continue;
    if (a.nextPercTick > nowTick) continue;
    scan(a);
    a.nextPercTick = nowTick + Math.max(intervalTicks, 1);
  }
}

export {};
