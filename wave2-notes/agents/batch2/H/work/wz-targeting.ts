interface Unit {
  id: number;
  x: number; z: number;
  hp: number; maxHp: number;
  incoming: number;            // damage already in flight at this unit
  role: 'fighter' | 'support' | 'other';
  visible: boolean;
}

interface Tuning {
  distWeightPerUnit: number;   // points lost per world unit of distance
  healthWeight: number;        // points gained for 100% missing health
  roleBonus: Record<Unit['role'], number>;
  notVisibleDiv: number;
  tooCloseDiv: number;
  doomedDiv: number;
  doomedOverkillPct: number;   // doomed when incoming > hp * (1 + pct/100)
  switchMargin: number;        // new target must beat current by this many points
}

const isDoomed = (t: Unit, tune: Tuning): boolean =>
  t.incoming > t.hp && t.incoming - t.hp > (t.hp * tune.doomedOverkillPct) / 100;

// Score one candidate. Returns -1 for "never", otherwise at least 1.
function score(me: Unit, t: Unit, rangeBonusUnits: number, tooClose: boolean, canWaitOnDoomed: boolean, tune: Tuning): number {
  const dist = Math.hypot(me.x - t.x, me.z - t.z);
  const damagePct = 100 - (100 * t.hp) / t.maxHp;
  let w = tune.distWeightPerUnit * rangeBonusUnits
        - tune.distWeightPerUnit * dist
        + (tune.healthWeight * damagePct) / 100
        + tune.roleBonus[t.role];
  if (!t.visible) w /= tune.notVisibleDiv;
  if (tooClose) w /= tune.tooCloseDiv;
  if (isDoomed(t, tune)) {
    if (canWaitOnDoomed) return -1;          // slow shooters leave a doomed target alone
    w /= tune.doomedDiv;
  }
  return Math.max(1, Math.floor(w));
}

// Pick the best candidate; keep the current target unless the new one clearly wins.
function choose(me: Unit, current: Unit | null, candidates: Unit[], tune: Tuning,
                range: number): Unit | null {
  let best: Unit | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (Math.hypot(me.x - c.x, me.z - c.z) >= range) continue;
    const s = score(me, c, range, false, false, tune);
    if (s >= 0 && (best === null || s > bestScore)) { best = c; bestScore = s; }
  }
  if (best === null) return null;
  const curScore = current ? score(me, current, range, false, false, tune) : -1;
  return curScore <= 0 || bestScore > curScore + tune.switchMargin ? best : null;
}

// Stagger: each unit re-evaluates when its (id + time) crosses a bucket boundary.
const timeToCheck = (id: number, now: number, delta: number, bucket: number): boolean =>
  Math.floor((id + now) / bucket) !== Math.floor((id + now - delta) / bucket);
export { choose, isDoomed, timeToCheck }
