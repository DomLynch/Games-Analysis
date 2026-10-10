// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; shape only, not a translation of the donor lines.
// clean-room
export interface Unit {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  radius: number;
}

const TICKS_PER_SECOND = 10;   // donor Automation.ticksPerSecond, passed here as data
const LEASH_2D = 1500;         // donor Npc.js disengage distance, passed here as data
const MELEE_HIT_FRACTION = 0.644;

export function dist3(a: Unit, b: Unit): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function leashBroken(npc: Unit, target: Unit): boolean {
  const dx = target.x - npc.x;
  const dy = target.y - npc.y;
  return Math.sqrt(dx * dx + dy * dy) >= LEASH_2D;
}

// Arrival delay in ms: stop at the target's radius, then 100 ms per tick of travel time.
export function arrivalMs(src: Unit, dst: Unit, speed: number): number {
  const distance = dist3(src, dst) - dst.radius;
  const duration = 1 + (TICKS_PER_SECOND * distance) / speed;
  return (1000 / TICKS_PER_SECOND) * duration;
}

// Attack time in ms from attack speed (donor: 500000 / atkSpd).
export function meleeAttackMs(atkSpd: number): number {
  return 500000 / atkSpd;
}

export function meleeTimes(attackMs: number): { hitAt: number; flagClearAt: number } {
  return { hitAt: attackMs * MELEE_HIT_FRACTION, flagClearAt: attackMs };
}

// Resolution re-check: the donor checks that both sides are alive, not that they are still in range.
export function resolveMelee(attacker: Unit, target: Unit, hitLanded: boolean, pAtk: number, pDef: number): number {
  if (!attacker.alive || !target.alive) return 0;
  if (!hitLanded) return 0;
  return (77 * pAtk) / pDef;
}

export {};
