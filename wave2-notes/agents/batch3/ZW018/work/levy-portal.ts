// Licence: MIT (donor LICENSE, Copyright 2026 Levy Street). Clean-room sketch of the mechanism, not a translation.
interface Point { x: number; z: number }
interface PortalLanding extends Point { facing: number }
interface PortalSide { x: number; z: number; landing: PortalLanding }
interface PortalDef { id: string; a: PortalSide; b: PortalSide; radius: number; enterText: string; leaveText: string }
interface PlayerPos { kind: string; x: number; z: number }
interface Transit { landing: PortalLanding; text: string; portalId: string }

const DEFAULT_RADIUS = 2.0;

function dist2d(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dz = p.z - q.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Where a live player is sent this tick, or null. First match wins; no rng, no state.
export function portalTransit(
  player: PlayerPos,
  portals: readonly PortalDef[],
  instanceXLimit: number,
): Transit | null {
  if (player.kind !== 'player') return null;
  if (player.x > instanceXLimit) return null;
  for (const portal of portals) {
    const r = portal.radius > 0 ? portal.radius : DEFAULT_RADIUS;
    if (dist2d(player, portal.a) < r) return { landing: portal.b.landing, text: portal.enterText, portalId: portal.id };
    if (dist2d(player, portal.b) < r) return { landing: portal.a.landing, text: portal.leaveText, portalId: portal.id };
  }
  return null;
}

// Authoring check (zone data test): an arrival must land outside the trigger it came from.
export function landingClearsTriggers(portal: PortalDef): boolean {
  const r = portal.radius > 0 ? portal.radius : DEFAULT_RADIUS;
  return dist2d(portal.a.landing, portal.a) >= r && dist2d(portal.b.landing, portal.b) >= r;
}
