// Licence: GPL-3.0 (donor, ModernUO). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Pt {
  x: number;
  y: number;
  z: number;
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  z1: number;
  z2: number;
}

// A town is one zone made of several rectangles; child zones (farms, inns) point at the town as parent.
interface Zone {
  name: string;
  priority: number; // donor default 50; a child with a parent takes the parent's priority
  childLevel: number; // 0 for a top-level zone, parent + 1 for a child
  dynamic: boolean; // donor: dynamic zones sort before non-dynamic ones
  area: Rect[];
  guardsDisabled: boolean;
  allowHousing: boolean; // donor GuardedRegion.AllowHousing is false for towns
}

// donor CompareTo: dynamic first, then higher priority, then deeper child
function outranks(a: Zone, b: Zone): boolean {
  if (a.dynamic !== b.dynamic) return a.dynamic;
  if (a.priority !== b.priority) return a.priority > b.priority;
  return a.childLevel > b.childLevel;
}

// Containment is half-open here; the donor Rectangle3D.Contains was not read.
function inside(r: Rect, p: Pt): boolean {
  return p.x >= r.x1 && p.x < r.x2 && p.y >= r.y1 && p.y < r.y2 && p.z >= r.z1 && p.z < r.z2;
}

// donor Find(Point3D): the first zone in rank order whose area holds the point; otherwise the map default.
// simplified: sorts every candidate zone per call; the donor keeps per-16-tile sector lists sorted once at registration.
function resolveZone(zones: Zone[], p: Pt, defaultZone: Zone): Zone {
  const ranked = zones.slice().sort((a, b) => (outranks(a, b) ? -1 : outranks(b, a) ? 1 : 0));
  for (const z of ranked) {
    if (z.area.some((r) => inside(r, p))) return z;
  }
  return defaultZone;
}

interface Mob {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  criminal: boolean;
  murderer: boolean;
  invulnerable: boolean;
  staff: boolean; // donor: AccessLevel > Player is never a candidate
  blessed: boolean; // donor: Blessed mobiles are never candidates
}

interface Npc {
  humanInTown: boolean;
  x: number;
  y: number;
}

const GUARD_WINDOW_MS = 15_000; // donor GuardTimer: 15.0 s, renewed on each new crime
const SHOUT_RANGE = 8; // donor: a townsperson within 8 tiles answers at once
const CALL_RANGE = 14; // donor CallGuards: a "guards" shout reaches 14 tiles
const GUARD_RECRUIT_RANGE = 15; // donor BaseGuard.Spawn: existing guards within 15 tiles are used first

interface Guard {
  focus: Mob | null;
  x: number;
  y: number;
}

// donor BaseGuard.Spawn: recruit idle guards and guards already on the target first, then make the rest.
// onlyAdditional (reinforcement): guards already on the target do not count towards the amount.
function spawnGuards(target: Mob, targetX: number, targetY: number, guards: Guard[], amount: number, makeGuard: () => void, onlyAdditional = false): void {
  let left = amount;
  for (const g of guards) {
    if (Math.hypot(g.x - targetX, g.y - targetY) > GUARD_RECRUIT_RANGE) continue;
    if (g.focus === null) {
      g.focus = target;
      left--;
    } else if (g.focus === target && !onlyAdditional) {
      left--;
    }
  }
  while (left > 0) {
    makeGuard();
    left--;
  }
}

// donor GuardAvengeTimer: after a guard dies with its focus alive, three ticks at 2.5 s, 3.5 s and 4.5 s each add one guard.
const AVENGE_TICKS_MS = [2500, 3500, 4500];
function reinforcementWave(focus: Mob, guards: Guard[], makeGuard: () => void): void {
  spawnGuards(focus, focus.x, focus.y, guards, 1, makeGuard, true);
}

class TownGuardWindow {
  // mob id -> time the candidate status ends (ms)
  private readonly candidates = new Map<number, number>();

  // donor IsGuardCandidate: not a guard (the Mob type here is never a guard), alive, not staff, not blessed, not invulnerable,
  // and criminal (murderers always, when reds are not allowed)
  isCandidate(m: Mob, allowReds: boolean): boolean {
    if (!m.alive || m.staff || m.blessed || m.invulnerable) return false;
    return (!allowReds && m.murderer) || m.criminal;
  }

  // donor CheckGuardCandidate: the first crime opens the window and, if a townsperson is in shouting range, a guard is called at once.
  // A repeat crime renews the window (donor: timer.Stop(); timer.Start()).
  // shouter is the nearest qualifying townsperson, chosen by the caller (donor loop at lines 258-276, not in this sketch)
  onCrime(now: number, zoneGuardsOn: boolean, m: Mob, allowReds: boolean, shouter: Npc | null, guards: Guard[], makeGuard: () => void): void {
    if (!zoneGuardsOn) return; // donor: IsDisabled() is checked before CheckGuardCandidate runs
    if (!this.isCandidate(m, allowReds)) return;

    if (!this.candidates.has(m.id)) {
      this.candidates.set(m.id, now + GUARD_WINDOW_MS);
      if (shouter !== null) {
        spawnGuards(m, m.x, m.y, guards, 1, makeGuard);
        this.candidates.delete(m.id);
      }
    } else {
      this.candidates.set(m.id, now + GUARD_WINDOW_MS);
    }
  }

  // donor CallGuards: a "guards" shout calls every candidate within 14 tiles (candidates from the table reach outside the zone).
  onGuardsShout(zoneGuardsOn: boolean, mobsWithin14: Array<{ mob: Mob; inZone: boolean }>, allowReds: boolean, guards: Guard[], makeGuard: () => void): void {
    if (!zoneGuardsOn) return; // donor: the speech and CallGuards paths are skipped when the zone is disabled
    for (const { mob, inZone } of mobsWithin14) {
      if (!this.isCandidate(mob, allowReds)) continue;
      const tabled = this.candidates.has(mob.id);
      const alwaysAndInZone = inZone && !allowReds && mob.murderer;
      if (!tabled && !alwaysAndInZone) continue;
      this.candidates.delete(mob.id);
      spawnGuards(mob, mob.x, mob.y, guards, 1, makeGuard);
    }
  }

  // donor GuardTimer.OnTick, called per tick here: drop expired candidates
  expire(now: number): void {
    for (const [id, end] of this.candidates) {
      if (end <= now) this.candidates.delete(id);
    }
  }
}
