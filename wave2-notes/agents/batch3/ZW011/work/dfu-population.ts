// Licence: MIT (donor, Daggerfall Unity). Clean sketch of the mechanism (shape only), not a line-by-line translation.
interface ZoneSpawn {
  blockCount: number;        // zone width x height, in 16-block units (zone data)
  perSixteenBlocks: number;  // donor: 24 (zone data)
  minGroups: number;         // donor: 1
  maxGroups: number;         // donor: 4
}

const TICK_S = 0.1;          // donor: 10 logic ticks per second (engine constant)
const RECYCLE_DIST = 150;    // donor: world units (engine constant)
const VISIBLE_POP_RANGE = 120; // donor: world units (engine constant)
const HALF_VIEW_DEG = 90;    // donor: 180 field of view, half of it (engine constant)
const MAX_SEEK = 4;          // donor: recycle when seekCount > 4 (engine constant)

interface Mobile {
  active: boolean;
  scheduleEnable: boolean;
  scheduleRecycle: boolean;
  dist: number;              // refreshed by the caller each tick (donor reads the motor position)
  angleDeg: number;          // angle from the player's forward to the mobile
  seekCount: number;
}

interface WorldInput {
  isDay: boolean;
  suppressed: boolean;       // racial override, donor's SuppressPopulationSpawns
  inZoneRange: boolean;      // player within the zone's rect plus margin
  findSpawn: () => { dist: number; angleDeg: number } | null;
}

function blankMobile(): Mobile {
  return { active: false, scheduleEnable: false, scheduleRecycle: false, dist: 0, angleDeg: 0, seekCount: 0 };
}

function maxPopulation(z: ZoneSpawn): number {
  const groups = Math.min(z.maxGroups, Math.max(z.minGroups, Math.floor(z.blockCount / 16)));
  return groups * z.perSixteenBlocks;
}

// A mobile may change visibility only when it is beyond the pop range or outside the player's front half.
function allowChange(m: Mobile): boolean {
  return m.dist > VISIBLE_POP_RANGE || m.angleDeg > HALF_VIEW_DEG;
}

export class ZonePopulation {
  readonly cap: number;
  private pool: Mobile[] = [];
  private timer = 0;

  constructor(zone: ZoneSpawn) {
    this.cap = maxPopulation(zone);
  }

  // Runs once per TICK_S of accumulated frame time. The timer is reset to 0, so overshoot is dropped (as in the donor).
  update(dt: number, world: WorldInput): void {
    this.timer += dt;
    if (this.timer < TICK_S) return;
    this.timer = 0;

    // 1. Spawn at most one mobile per tick: reuse a free slot, or grow the pool below the cap.
    if (world.inZoneRange) {
      let slot = this.pool.findIndex(m => !m.active);
      if (slot === -1 && this.pool.length < this.cap) {
        this.pool.push(blankMobile());
        slot = this.pool.length - 1;
      }
      const at = slot === -1 ? null : world.findSpawn();
      if (slot !== -1 && at) {
        this.pool[slot] = { active: true, scheduleEnable: true, scheduleRecycle: false,
                            dist: at.dist, angleDeg: at.angleDeg, seekCount: 0 };
      }
    }

    // 2. Per mobile: show pending ones (day only, unseen), mark for recycle, recycle when unseen.
    for (const m of this.pool) {
      if (m.active && m.scheduleEnable && allowChange(m) && world.isDay && !world.suppressed) {
        m.scheduleEnable = false;
      }
      if (m.seekCount > MAX_SEEK || m.dist > RECYCLE_DIST || !world.isDay) {
        m.scheduleRecycle = true;
      }
      if (m.active && m.scheduleRecycle && allowChange(m)) {
        m.active = false;
        m.scheduleEnable = false;
        m.scheduleRecycle = false;
      }
    }
  }

  liveCount(): number {
    return this.pool.filter(m => m.active).length;
  }
}
export {};
