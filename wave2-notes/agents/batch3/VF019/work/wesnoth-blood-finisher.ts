// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Outcome = "miss" | "hit" | "kill";
const STEP_MS = 50;      // display step for the HP countdown
const MATCH_FAIL = -10;  // score of a clip that does not apply

interface Unit { hp: number; maxHp: number; alive: boolean; }

// 1. Outcome is read from the damage that will land, before any HP changes.
function outcomeOf(damage: number, defenderHp: number): Outcome {
  if (damage >= defenderHp) return "kill";
  return damage > 0 ? "hit" : "miss";
}

// 2. Clip choice: each matching constraint adds 1; highest score wins; ties go to the rng.
interface Clip { event: "attack" | "defend"; outcome?: Outcome; damage?: number; startMs: number; lengthMs: number; baseScore: number; }

function clipScore(c: Clip, event: string, outcome: Outcome, damage: number): number {
  if (c.event !== event) return MATCH_FAIL;
  let s = c.baseScore;
  if (c.outcome !== undefined) { if (c.outcome !== outcome) return MATCH_FAIL; s += 1; }
  if (c.damage !== undefined) { if (c.damage !== damage) return MATCH_FAIL; s += 1; }
  return s;
}

function chooseClip(clips: Clip[], event: string, outcome: Outcome, damage: number, rng: () => number): Clip | undefined {
  let best = MATCH_FAIL;
  let ties: Clip[] = [];
  for (const c of clips) {
    const s = clipScore(c, event, outcome, damage);
    if (s <= MATCH_FAIL) continue;
    if (s > best) { best = s; ties = [c]; }
    else if (s === best) ties.push(c);
  }
  if (ties.length === 0) return undefined;
  return ties[Math.floor(rng() * ties.length)];
}

// 3. HP countdown over the clip. Display only: the caller commits the real HP after this.
function countdownFrames(hp: number, damage: number, clipMs: number): number[] {
  const frames: number[] = [];
  let left = damage;
  let t = 0;
  while (left > 0) {
    const steps = Math.max(1, Math.trunc((clipMs - t) / STEP_MS));
    const removed = Math.max(1, Math.trunc(left / steps));
    left -= removed;
    hp -= removed;
    frames.push(hp);
    t += STEP_MS;
  }
  return frames;
}

// 4. Drain: heal from the damage actually dealt (capped at the defender's HP), clamped to the attacker's headroom.
function drainOf(defenderHp: number, damage: number, attacker: Unit, pct: number, constant: number): number {
  const dealt = Math.min(defenderHp, damage);
  let d = Math.trunc(dealt * pct / 100) + constant;
  d = Math.min(d, attacker.maxHp - attacker.hp);
  d = Math.max(d, 1 - attacker.hp);
  return d;
}

// 5. Death: a last-breath hook runs first and can revive; the death clip plays; the die hook runs;
//    the unit is removed only if it is still at 0 HP.
function resolveDeath(u: Unit, lastBreath: () => void, deathClip: () => void, onDie: () => void): boolean {
  lastBreath();
  if (u.hp > 0) return false;
  deathClip();
  onDie();
  if (u.hp > 0) return false;
  u.alive = false;
  return true;
}

// 6. An authoritative result overrides the local one when it is given.
function diesOf(localDies: boolean, authoritative?: boolean): boolean {
  return authoritative ?? localDies;
}

// 7. One strike: pick the clip and run the countdown, then commit HP, then drain, then death.
interface StrikeResult { outcome: Outcome; frames: number[]; removed: boolean; drained: number; clipStartMs: number | undefined; }

function strike(att: Unit, def: Unit, rawDamage: number, hits: boolean, clips: Clip[], drainPct: number, drainConst: number, rng: () => number, serverDies?: boolean): StrikeResult {
  const damage = hits ? rawDamage : 0;
  const outcome = outcomeOf(damage, def.hp);
  const clip = chooseClip(clips, "defend", outcome, damage, rng);
  const frames = countdownFrames(def.hp, damage, clip ? clip.lengthMs : 0);

  const drained = hits ? drainOf(def.hp, damage, att, drainPct, drainConst) : 0;

  def.hp -= damage;                                  // commit after the clip
  const died = diesOf(def.hp <= 0, serverDies);
  if (died && def.hp > 0) def.hp = 0;                // the authoritative death is kept, not undone later
  att.hp = Math.min(att.maxHp, att.hp + drained);    // heal (positive) or recoil (negative)

  const removed = died ? resolveDeath(def, () => undefined, () => undefined, () => undefined) : false;
  return { outcome, frames, removed, drained, clipStartMs: clip ? clip.startMs : undefined };
}
