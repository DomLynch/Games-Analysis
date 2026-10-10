// Licence: Sustainable Use License 1.0 (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Hero {
  id: number;
  alive: boolean;
  inActiveRoom: boolean; // on the active level and not changing level
  x: number;
  y: number;
}

interface Mob {
  x: number;
  y: number;
  enemy: number | null; // hero id
  aggro: number; // 0..AGGRO_MAX ticks of memory
}

interface Grid {
  room(x: number, y: number): number;                             // region id of a tile (donor: dTransVal, not read)
  walkDist(ax: number, ay: number, bx: number, by: number): number; // donor WalkingDistance (not read)
}

const AGGRO_MAX = 255;

// Pick the enemy: a hero in the same room beats one in another room; within the same class the nearer wins;
// the first candidate is always taken.
function pickEnemy(mob: Mob, heroes: Hero[], grid: Grid, multiplayer: boolean): number | null {
  let best: Hero | null = null;
  let bestDist = -1;
  let bestSameRoom = false;
  for (const h of heroes) {
    if (!h.inActiveRoom) continue;
    if (!h.alive && multiplayer) continue;
    const sameRoom = grid.room(mob.x, mob.y) === grid.room(h.x, h.y);
    const dist = grid.walkDist(mob.x, mob.y, h.x, h.y);
    if ((sameRoom && !bestSameRoom) || ((sameRoom || !bestSameRoom) && dist < bestDist) || best === null) {
      best = h;
      bestDist = dist;
      bestSameRoom = sameRoom;
    }
  }
  mob.enemy = best === null ? null : best.id;
  return mob.enemy;
}

// Aggro memory, once per tick: seen this tick -> full memory; unseen -> counts down to 0.
function tickAggro(mob: Mob, seenThisTick: boolean): boolean {
  if (seenThisTick) {
    mob.aggro = AGGRO_MAX;
  } else if (mob.aggro !== 0) {
    mob.aggro--;
  }
  return mob.aggro > 0;
}

export {};
