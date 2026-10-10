// Licence: MIT (donor, LICENSE line 1). Clean-room sketch written from the described rules; MIT would also allow adapting the code.
// clean-room

export interface P2 { x: number; z: number; }
export interface Npc { id: string; pos: P2; down: boolean; hostile: boolean; facing: number; }

const VIEW_HALF_ANGLE = (100 * Math.PI) / 180; // +-100 degree view (donor code comment: spec requires +-100)

function d2(a: P2, b: P2): number { const dx = a.x - b.x; const dz = a.z - b.z; return dx * dx + dz * dz; }

// freeLos: ray only, no view cone. Otherwise the target must lie inside a cone around facing.
// `senses` stands in for the donor's final mask: smell alone is enough inside the range (no ray); sight needs the cone and the ray.
export function canSense(me: Npc, other: Npc, freeLos: boolean, rangeUnits: number, rayClear: (a: Npc, b: Npc) => boolean,
                         senses: { smell: boolean; see: boolean }): boolean {
  if (d2(me.pos, other.pos) > rangeUnits * rangeUnits) return false;
  if (senses.smell) return true;
  if (!senses.see) return false;
  if (!freeLos) {
    let da = Math.abs(Math.atan2(other.pos.z - me.pos.z, other.pos.x - me.pos.x) - me.facing);
    if (da > Math.PI) da = 2 * Math.PI - da;
    if (da > VIEW_HALF_ANGLE) return false;
  }
  return rayClear(me, other);
}

// Nearest hostile that can be sensed. The current enemy is kept while it is alive and sensed (not re-checked for hostility),
// and is replaced only by a strictly nearer hostile.
export function updateNearestEnemy(me: Npc, prev: Npc | null, near: Npc[], senseFree: (o: Npc) => boolean): Npc | null {
  let best: Npc | null = null;
  let bestD = Infinity;
  if (prev !== null && !prev.down && senseFree(prev)) { best = prev; bestD = d2(me.pos, prev.pos); }
  for (const o of near) {
    if (!o.hostile || o.down || o === me) continue;
    const d = d2(me.pos, o.pos);
    if (d < bestD && senseFree(o)) { best = o; bestD = d; }
  }
  return best;
}

export interface PerceptionClock { nextAt: number; periodMs: number; }

// Runs only when due; a current enemy outside the perception range is dropped; the clock is then reset.
// `assessEnabled` = the donor's hasPerc(PERC_ASSESSENEMY) and normal AI policy: when false the pick does not run at all.
export function perceive(me: Npc, prev: Npc | null, near: Npc[], senseFree: (o: Npc) => boolean,
                         rangeUnits: number, nowMs: number, clock: PerceptionClock, assessEnabled: boolean): Npc | null {
  if (clock.nextAt > nowMs) return prev;
  const found = assessEnabled ? updateNearestEnemy(me, prev, near, senseFree) : null;
  const kept = found !== null && d2(me.pos, found.pos) <= rangeUnits * rangeUnits ? found : null;
  clock.nextAt = nowMs + Math.max(clock.periodMs, 1);
  return kept;
}
