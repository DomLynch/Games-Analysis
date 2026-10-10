// Licence: GPL version 2 or later (donor binaries/data/, LICENSE.txt). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
interface Stance {
  targetVisibleEnemies: boolean;   // anything in vision is a candidate
  targetAttackersAlways: boolean;  // anything that hurts us is a candidate, even over a forced order
  respondChase: boolean;           // chase the candidate
  respondChaseBeyondVision: boolean;
  respondHoldGround: boolean;      // attack only inside the hold radius
  respondFlee: boolean;            // run instead of fighting
}

// Rows copied as values from the donor's stance table (one row per stance name).
const STANCES: Record<string, Stance> = {
  violent:    { targetVisibleEnemies: true,  targetAttackersAlways: true,  respondChase: true,  respondChaseBeyondVision: true,  respondHoldGround: false, respondFlee: false },
  aggressive: { targetVisibleEnemies: true,  targetAttackersAlways: false, respondChase: true,  respondChaseBeyondVision: false, respondHoldGround: false, respondFlee: false },
  defensive:  { targetVisibleEnemies: true,  targetAttackersAlways: false, respondChase: false, respondChaseBeyondVision: false, respondHoldGround: true,  respondFlee: false },
  passive:    { targetVisibleEnemies: false, targetAttackersAlways: false, respondChase: false, respondChaseBeyondVision: false, respondHoldGround: false, respondFlee: true },
};

type Pt = { x: number; y: number };
interface Ent { id: number; pos: Pt; classes: string[]; visible: boolean; }
interface Unit { pos: Pt; stance: Stance; forced: boolean; vision: number; holdPos: Pt; holdRange: number; }

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

// Hold-ground query radius: the range plus half the vision, capped at vision.
const holdQueryRange = (range: number, vision: number): number => Math.min(range + vision / 2, vision);

// Preference rank: index of the first preferred class the entity carries (0 = best). Undefined = no match.
function rank(classes: string[], preferred: string[]): number | undefined {
  const i = preferred.findIndex(c => classes.includes(c));
  return i < 0 ? undefined : i;
}

// Rank-0 entities are taken at once; otherwise the best rank group wins, first attackable in list order.
function pickTarget(ents: Ent[], preferred: string[], u: Unit, canAttack: (e: Ent) => boolean): Ent | undefined {
  const groups = new Map<number, Ent[]>();
  const unranked: Ent[] = [];
  for (const e of ents) {
    if (!canAttack(e)) continue;
    if (u.stance.respondHoldGround && dist(e.pos, u.holdPos) > u.holdRange) continue;
    const r = rank(e.classes, preferred);
    if (r === 0) return e;
    if (r === undefined) { unranked.push(e); continue; }
    const g = groups.get(r) ?? [];
    g.push(e);
    groups.set(r, g);
  }
  const best = [...groups.keys()].sort((a, b) => a - b)[0];
  if (best !== undefined) return groups.get(best)?.[0];
  return unranked[0];
}

// Retaliation rules by state. Idle: answer the attacker if the stance says so or the order is not forced.
function respondIdle(u: Unit): boolean {
  return u.stance.targetAttackersAlways || !u.forced;
}
// In combat only melee hits can redirect the unit (the donor's COMBAT state).
function redirectInCombat(type: 'Melee' | 'Ranged', u: Unit): boolean {
  return type === 'Melee' && (u.stance.targetAttackersAlways || !u.forced);
}
// While fleeing, a hit counts only if the hit entity is no farther away than the flee target.
function redirectWhileFleeing(u: Unit, hit: Ent, fleeTarget: Ent, attackerIsFleeTarget: boolean): boolean {
  if (attackerIsFleeTarget) return false;
  if (dist(u.pos, hit.pos) > dist(u.pos, fleeTarget.pos)) return false;
  return u.stance.targetAttackersAlways || !u.forced;
}

// Chase check, run every 1000 ms while chasing. Drop the chase when the target is hidden, outside the hold radius
// (hold stances), or out of vision (unless the stance chases beyond vision).
const CHASE_CHECK_MS = 1000;
function shouldAbandonChase(u: Unit, target: Ent): boolean {
  if (!target.visible) return true;
  if (u.stance.respondHoldGround && dist(target.pos, u.holdPos) > u.holdRange) return true;
  if (!u.stance.respondChaseBeyondVision && dist(u.pos, target.pos) > u.vision) return true;
  return false;
}

// Flee: keep running until the target is at least the current distance plus the flee distance away.
function fleeGoalDistance(u: Unit, target: Ent, fleeDistance: number): number {
  return dist(u.pos, target.pos) + fleeDistance;
}
function fleeDone(u: Unit, target: Ent, goal: number): boolean {
  return dist(u.pos, target.pos) >= goal;
}
