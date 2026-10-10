// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Attitude = 'ignore' | 'follow' | 'flee' | 'attack';
type Pt = { x: number; y: number };
type Roll = () => number; // uniform in [0, 1)

interface Triggers { seen: boolean; close: boolean; weak: boolean; fear: boolean; }

interface Foe {
  anger: number;      // -100..100, resting value is `baseline`
  morale: number;     // -100..100
  baseline: number;   // the type's resting anger
  latched: boolean;   // has been provoked into treating the player as a target
  typeAggro: boolean; // type setting: true = attacks characters at once; false = waits to be provoked
  hp: number;
  maxHp: number;
}

interface Sight { dist: number; seen: boolean; targetHpPct: number; } // targetHpPct: the player's hp percent

// Chance x over y; with x <= 0 this can only fire on an exact zero roll.
const chance = (x: number, y: number, roll: Roll): boolean => roll() <= x / y;
const randInt02 = (roll: Roll): number => Math.floor(roll() * 3); // 0, 1 or 2

// One planning call's triggers against the player. Simplified: the weak branch only adds anger (the donor's weak fear and placate branches are omitted), and everything runs in this one call.
function applyTriggers(f: Foe, s: Sight, t: Triggers, fleeing: boolean, roll: Roll): void {
  if (!s.seen) return;
  if (!fleeing && f.anger <= 20) f.anger += t.seen ? randInt02(roll) : 0;
  if (!fleeing && t.seen && chance(f.anger, 200, roll)) f.latched = true;
  if (s.dist <= 5) {
    if (f.anger <= 30 && t.close) f.anger += 5;
    if (t.close && chance(f.anger, 100, roll)) f.latched = true;
    if (t.fear) f.morale -= 5;
  }
  const hpPct = s.targetHpPct;
  if (t.weak && hpPct <= 70 && f.anger <= 40) {
    f.anger += 10 - Math.floor(hpPct / 10);
    if (chance(f.anger, 100, roll)) f.latched = true;
  }
}

// Donor attitude order: unprovoked -> ignore; morale below 0 -> follow or flee; anger at or below 0 -> flee when hurt, else ignore; anger under 10 -> follow; else attack.
function attitude(f: Foe): Attitude {
  if (!f.latched) return 'ignore';
  if (f.morale < 0) return f.morale + f.anger > 0 && f.hp > f.maxHp / 3 ? 'follow' : 'flee';
  if (f.anger <= 0) return f.hp <= 0.6 * f.maxHp ? 'flee' : 'ignore';
  if (f.anger < 10) return 'follow';
  return 'attack';
}

// Once per action, after the move: step anger one point toward the baseline, then clear the latch when calm.
function decay(f: Foe, roll: Roll): void {
  if (f.anger !== f.baseline && roll() < 0.25 && (Math.abs(f.anger - f.baseline) > 15 || roll() < 0.5)) {
    f.anger += Math.sign(f.baseline - f.anger);
  }
  if (f.anger === f.baseline && f.latched && !f.typeAggro && !chance(f.anger, 100, roll)) {
    f.latched = false;
  }
}

interface Cand { id: number; dist: number; seen: boolean; power: number; hostile: boolean; }

// Donor rate_target: smart = distance / power (hostile +2); plain = integer distance. Out of range or unseen = Infinity.
function rate(c: Cand, best: number, smart: boolean): number {
  if (c.dist <= 0 || !c.seen) return Infinity;
  if (!smart) return c.dist < best ? c.dist : Infinity;
  const p = c.power + (c.hostile ? 2 : 0);
  return p > 0 ? c.dist / p : Infinity;
}

// Lowest rating wins; equal ratings are a uniform reservoir pick (donor one_in(valid)).
function pickTarget(cands: Cand[], maxSight: number, smart: boolean, roll: Roll): number | null {
  let best = smart ? 8.6 : maxSight;
  let target: number | null = null;
  let valid = 0;
  for (const c of cands) {
    const r = rate(c, best, smart);
    if (r === best) { valid++; if (roll() < 1 / valid) target = c.id; }
    if (r < best) { target = c.id; best = r; valid = 1; }
  }
  return target;
}

// Donor: a chasing foe heads for the target; a fleeing one mirrors the target through itself (pos - dest + pos).
// A follow-state foe counts as fleeing within 4 tiles (donor is_fleeing).
function moveGoal(att: Attitude, dist: number, self: Pt, target: Pt): Pt | null {
  if (att === 'attack') return target;
  const fleeing = att === 'flee' || (att === 'follow' && dist <= 4);
  return fleeing ? { x: 2 * self.x - target.x, y: 2 * self.y - target.y } : null;
}

// Donor throttle: turnsSinceTarget counts planning calls with no target (capped at 1800).
// curve is 1 at 0 and 0 at 1800 (a normalised logistic). Scan every call near 0, every 600 calls at 1800.
function shouldScan(turnsSinceTarget: number, curve: (t: number) => number): boolean {
  const skip = Math.trunc(600 * (1 - curve(turnsSinceTarget)));
  return skip === 0 || turnsSinceTarget % skip === 0;
}
function nextTurnsSinceTarget(prev: number, foundTarget: boolean): number {
  return foundTarget ? 0 : Math.min(prev + 1, 1800);
}

export {};
