// Licence: GNU GPL v2 or later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Seconds = number;
interface Pt { x: number; z: number; }
interface Unit extends Pt { id: number; power: number; }
interface PlayerTeam { id: number; power: number; units: Unit[]; } // units: live units only
interface Aggro { team: number; targetId: number; target: Pt; }   // target: where the target stood when picked
interface Director { aggro: Map<number, Aggro>; expiresAt: Seconds; }
interface Tuning { checkEvery: Seconds; aggroLasts: Seconds; startAfter: Seconds; swarmRatio: number; reachedDistance: number; }

const ENGAGE_RATIO = 0.5;
const ORBIT_RAD = (45 * Math.PI) / 180;
const STUCK_DIST = 50;
const NOGO_RADIUS = 600;
const NOGO_MAX = 10;

function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.z - b.z); }

// Director: called by the engine loop on each check (the donor runs it when gameFrame % interval == 1).
function runDirector(now: Seconds, tune: Tuning, horde: Unit[], players: PlayerTeam[], prev: Director, rng: () => number): Director {
  if (now < tune.startAfter) return prev;
  const hordePower = horde.reduce((s, u) => s + u.power, 0);
  const playerPower = players.reduce((s, t) => s + t.power, 0);
  if (!(hordePower > playerPower * tune.swarmRatio)) return { aggro: new Map(), expiresAt: 0 };

  const eligible = players.filter((t) => t.power > 0 && t.units.length > 0);
  const load = new Map<number, number>(eligible.map((t) => [t.id, 0]));
  const liveIds = new Map<number, Set<number>>(eligible.map((t) => [t.id, new Set(t.units.map((u) => u.id))]));
  const kept = new Map<number, Aggro>();
  const pending: Unit[] = [];

  for (const z of horde) {
    const a = prev.aggro.get(z.id);
    const valid = a !== undefined && liveIds.has(a.team) && liveIds.get(a.team)!.has(a.targetId) && dist(z, a.target) > tune.reachedDistance;
    if (valid && a) {
      kept.set(z.id, a);
      load.set(a.team, load.get(a.team)! + z.power);
    } else {
      pending.push(z);
    }
  }

  if (eligible.length > 0) {
    pending.sort((p, q) => (q.power - p.power) || (p.id - q.id)); // strongest first, ties by id
    for (const z of pending) {
      let best = eligible[0];
      for (const t of eligible) {
        const lt = load.get(t.id)!;
        const lb = load.get(best.id)!;
        if (lt < lb || (lt === lb && t.id < best.id)) best = t; // least-loaded team, ties to lower id
      }
      const pick = best.units[Math.floor(rng() * best.units.length)];
      kept.set(z.id, { team: best.id, targetId: pick.id, target: { x: pick.x, z: pick.z } });
      load.set(best.id, load.get(best.id)! + z.power);
    }
  }
  return { aggro: kept, expiresAt: now + tune.aggroLasts };
}

// Engage point: stand at half the weapon range from the target, on the zombie's side,
// plus a second point rotated 45 degrees around the target (side = +1 or -1).
function engagePoints(self: Pt, target: Pt, weaponRange: number, side: 1 | -1): { primary: Pt; secondary: Pt } | undefined {
  const dx = self.x - target.x;
  const dz = self.z - target.z;
  const d = Math.hypot(dx, dz);
  if (d === 0) return undefined; // no move order
  const k = (weaponRange * ENGAGE_RATIO) / d;
  const rx = dx * k;
  const rz = dz * k;
  const s = Math.sin(ORBIT_RAD) * side;
  const c = Math.cos(ORBIT_RAD);
  return {
    primary: { x: target.x + rx, z: target.z + rz },
    secondary: { x: target.x + rx * c - rz * s, z: target.z + rx * s + rz * c },
  };
}

// Stuck check: a unit that moved less than STUCK_DIST since its last sample gets a no-go disc
// at its spot (max NOGO_MAX, oldest dropped) and must reroute. The sample always advances.
interface Mover extends Pt { lastX: number; lastZ: number; noGo: Pt[]; }
function stuckCheck(m: Mover, exemptRememberedGoal: boolean): boolean {
  const moved2 = (m.x - m.lastX) ** 2 + (m.z - m.lastZ) ** 2;
  m.lastX = m.x;
  m.lastZ = m.z;
  if (exemptRememberedGoal || moved2 >= STUCK_DIST * STUCK_DIST) return false;
  const inside = m.noGo.some((g) => dist(g, m) < NOGO_RADIUS);
  if (!inside) {
    if (m.noGo.length >= NOGO_MAX) m.noGo.shift();
    m.noGo.push({ x: m.x, z: m.z });
  }
  return true;
}

export {};
