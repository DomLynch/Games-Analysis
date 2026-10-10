// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pt { x: number; y: number; }
interface Thing extends Pt {
  id: string;
  flags: string[];      // block flags, e.g. "generator", "factory", "core"
  active: boolean;      // has items or is not idle (donor: targetFlagActive)
}
interface World {
  enemyUnits: Thing[];       // hostile units
  enemyBuildings: Thing[];   // hostile buildings
}

// null in a flag list means "closest enemy in range, units first, then buildings".
type FlagChain = (string | null)[];

// Donor numbers (AIController.java 40, 286; FlyingAI.java 53).
const RETARGET_TICKS_IDLE = 40;     // no target
const RETARGET_TICKS_ENGAGED = 90;  // has a target

function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function within(a: Pt, b: Pt, r: number): boolean { return dist(a, b) <= r; }

function closestInRange(from: Pt, world: World, range: number): Thing | undefined {
  const units = world.enemyUnits.filter(u => within(from, u, range));
  const pick = (list: Thing[]) => list.reduce<Thing | undefined>(
    (best, t) => (best === undefined || dist(from, t) < dist(from, best) ? t : best), undefined);
  return pick(units) ?? pick(world.enemyBuildings.filter(b => within(from, b, range)));
}

function closestWithFlag(from: Pt, world: World, flag: string): Thing | undefined {
  // no range limit here, as in the donor (targetFlagActive)
  const list = world.enemyBuildings.filter(b => b.flags.includes(flag) && b.active);
  return list.reduce<Thing | undefined>(
    (best, t) => (best === undefined || dist(from, t) < dist(from, best) ? t : best), undefined);
}

// Main target: core in range first, then walk the flag chain in order, then the core.
export function findMainTarget(from: Pt, range: number, core: Thing | undefined,
                               chain: FlagChain, world: World): Thing | undefined {
  if (core && within(from, core, range)) return core;
  for (const flag of chain) {
    const hit = flag === null ? closestInRange(from, world, range) : closestWithFlag(from, world, flag);
    if (hit) return hit;
  }
  return core;
}

// Weapon mount target: the main target if it is inside the mount's range, else the closest in range.
export function findMountTarget(mountPos: Pt, mountRange: number, main: Thing | undefined,
                                world: World): Thing | undefined {
  if (main && within(mountPos, main, mountRange)) return main;
  return closestInRange(mountPos, world, mountRange);
}

// Retarget gate: a tick counter that fires after 40 ticks idle or 90 ticks engaged.
export function retargetDue(ticksSinceLast: number, hasTarget: boolean): boolean {
  return ticksSinceLast >= (hasTarget ? RETARGET_TICKS_ENGAGED : RETARGET_TICKS_IDLE);
}

export {};
