// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Body { id: string; x: number; y: number; hp: number; }
interface Blast { x: number; y: number; hp: number; deathHand: boolean; }
interface Hit { id: string; damage: number; killed: boolean; }

// Positions are in 1/256-tile units. Metric: larger axis plus half the smaller axis.
function tileDistance(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx > dy ? dx + (dy >> 1) : dy + (dx >> 1);
}

// Splash: 16 steps per tile; each quarter tile inside the radius halves the blast (integer shift).
function resolveBlast(b: Blast, bodies: Body[]): Hit[] {
  const radiusSteps = b.deathHand ? 32 : 16;
  const hits: Hit[] = [];
  for (const body of bodies) {
    const steps = tileDistance(b.x, b.y, body.x, body.y) >> 4;
    if (steps >= radiusSteps) continue;
    const damage = b.hp >> (steps >> 2);
    const wasAlive = body.hp > 0;
    body.hp = body.hp >= damage ? body.hp - damage : 0;
    hits.push({ id: body.id, damage, killed: wasAlive && body.hp === 0 });
  }
  return hits;
}

export {};
