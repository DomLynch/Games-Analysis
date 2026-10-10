// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Vec2 = { x: number; y: number };
const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

const RETARGET_S = 5;        // seconds between re-picks (engine constant)
const THINK_S = 0.2;         // awake think interval (engine constant)
const CHASE_RANGE = 96;      // current target stays in play out to this distance (units)
const AWARENESS_RANGE = 18;  // a new target must be inside this distance (units, zone data)
const HOME_RADIUS = 192;     // beyond this from home the mob walks back (units, zone data)
const ALERT_COOLDOWN_S = 120; // one alert per target per two minutes (engine constant)

type Tactic = 'random' | 'focused' | 'lastDamager' | 'topDamager' | 'nearest';
interface Foe { id: string; pos: Vec2; attackable: boolean; }
interface Mob {
  pos: Vec2; home: Vec2;
  tactics: Tactic[];                 // the mob's flag set; one is chosen per retarget
  target: Foe | null;
  lastDamager: Foe | null; topDamager: Foe | null;
  nextRetargetAt: number;
  state: 'idle' | 'awake' | 'return';
}

// Uniform choice among the mob's flags, each time it looks for a target.
function pickTactic(tactics: Tactic[], rand: () => number): Tactic {
  return tactics[Math.floor(rand() * tactics.length)];
}

// Distance-weighted pick: weight = 1 - (own distance / total distance); weights sum to n - 1.
function weightedByDistance(mob: Mob, foes: Foe[], rand: () => number): Foe {
  const ranked = foes.map(f => ({ f, d: dist(mob.pos, f.pos) })).sort((a, b) => a.d - b.d);
  if (ranked.length === 1) return ranked[0].f;
  const total = ranked.reduce((s, r) => s + r.d, 0);
  const roll = rand() * (ranked.length - 1);
  let acc = 0;
  for (const r of ranked) {
    acc += 1 - r.d / total;
    if (roll < acc) return r.f;
  }
  return ranked[0].f;          // rounding fallback: nearest
}

// Hysteresis: the current target is kept out to CHASE_RANGE; any other foe must be inside AWARENESS_RANGE.
function visibleFoes(mob: Mob, foes: Foe[]): Foe[] {
  return foes.filter(f => f.attackable &&
    dist(mob.pos, f.pos) <= (f === mob.target ? CHASE_RANGE : AWARENESS_RANGE));
}

// Retarget: 5 s gate (or called at once when the target is lost). No foe in view sends the mob home.
function findTarget(mob: Mob, foes: Foe[], now: number, rand: () => number): void {
  mob.nextRetargetAt = now + RETARGET_S;
  const vis = visibleFoes(mob, foes);
  if (vis.length === 0) {
    if (mob.state !== 'return') mob.state = 'return';
    mob.target = null;
    return;
  }
  switch (pickTactic(mob.tactics, rand)) {
    case 'random': mob.target = weightedByDistance(mob, vis, rand); break;
    case 'focused': break;                                  // keep the current target
    case 'lastDamager': mob.target = mob.lastDamager ?? mob.target; break;
    case 'topDamager': mob.target = mob.topDamager ?? mob.target; break;
    case 'nearest': mob.target = vis.reduce((a, b) => (dist(mob.pos, a.pos) <= dist(mob.pos, b.pos) ? a : b)); break;
  }
}

// Leash, run on each awake think: a target past CHASE_RANGE is dropped; a mob past HOME_RADIUS walks home.
function leash(mob: Mob, foes: Foe[], now: number, rand: () => number): void {
  if (mob.target && dist(mob.pos, mob.target.pos) >= CHASE_RANGE) {
    mob.target = null;
    findTarget(mob, foes, now, rand);
  }
  if (dist(mob.pos, mob.home) > HOME_RADIUS && mob.state !== 'return') {
    mob.state = 'return';
    mob.target = null;
  }
}

// Alert: a mob that takes a target wakes same-type mobs in range, at most once per target per cooldown.
function alertAllowed(lastAlertS: Map<string, number>, targetId: string, now: number): boolean {
  const t = lastAlertS.get(targetId);
  return t === undefined || now - t >= ALERT_COOLDOWN_S;
}

export {};
