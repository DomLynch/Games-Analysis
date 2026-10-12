// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type CcGroup = 'stun' | 'root' | 'incapacitate' | 'disorient' | 'silence' | 'knockback' | 'taunt';

interface DrRule {
  ladder: number[];      // duration multiplier by level; index 0 = first application at full length
  maxHits: number;       // landed hits that count before the level stops rising
  resetMs: number;       // level returns to 0 this long after the last aura of the group ended
  capMs: number | null;  // cap on a player-sourced CC applied to a player (null = no cap)
  appliesToAll: boolean; // false: diminished only when the target is a player
}

const RULE: Record<CcGroup, DrRule> = {
  stun:         { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: true },
  root:         { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  incapacitate: { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  disorient:    { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  silence:      { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  knockback:    { ladder: [1, 0], maxHits: 1, resetMs: 18000, capMs: 8000, appliesToAll: false },
  taunt:        { ladder: [1, 0.65, 0.4225, 0.274625, 0], maxHits: 4, resetMs: 18000, capMs: 8000, appliesToAll: true },
};

interface GroupState { hits: number; active: number; endedAtMs: number; }

export class DrTarget {
  private groups = new Map<CcGroup, GroupState>();

  constructor(readonly isPlayer: boolean) {}

  private state(g: CcGroup): GroupState {
    let s = this.groups.get(g);
    if (s === undefined) {
      s = { hits: 0, active: 0, endedAtMs: 0 };
      this.groups.set(g, s);
    }
    return s;
  }

  auraStarted(g: CcGroup): void {
    this.state(g).active += 1;
  }

  auraEnded(g: CcGroup, nowMs: number): void {
    const s = this.state(g);
    if (s.active > 0) {
      s.active -= 1;
      if (s.active === 0) s.endedAtMs = nowMs; // the reset clock starts when the last aura ends
    }
  }

  // Level the next landed hit will use. Read BEFORE that hit is counted.
  level(g: CcGroup, nowMs: number): number {
    const s = this.state(g);
    if (s.active === 0 && nowMs - s.endedAtMs > RULE[g].resetMs) return 0;
    return s.hits;
  }

  countHit(g: CcGroup, nowMs: number): void {
    const cur = this.level(g, nowMs);
    if (cur < RULE[g].maxHits) this.state(g).hits = cur + 1;
  }
}

export interface CcResult { durationMs: number; immune: boolean; level: number; }

// One harmful CC landing. baseMs is the ability's full duration.
export function landCc(t: DrTarget, g: CcGroup, baseMs: number, playerSource: boolean, nowMs: number): CcResult {
  const rule = RULE[g];
  const drOn = rule.appliesToAll || t.isPlayer;
  const level = drOn ? t.level(g, nowMs) : 0;
  if (drOn) t.countHit(g, nowMs);
  let d = baseMs;
  if (rule.capMs !== null && playerSource && t.isPlayer && d > rule.capMs) d = rule.capMs;
  if (drOn) d = Math.floor(d * rule.ladder[level]);
  return { durationMs: d, immune: d <= 0, level };
}

// A new CC is refused when its reduced duration would be shorter than one aura already on the target.
// The caller loops over the target's active auras of the same group, as the donor does.
export function bouncesOff(t: DrTarget, g: CcGroup, baseMs: number, remainingMs: number, nowMs: number): boolean {
  const rule = RULE[g];
  if (!(rule.appliesToAll || t.isPlayer)) return false;
  const d = Math.floor(baseMs * rule.ladder[t.level(g, nowMs)]);
  return d > 0 && d < remainingMs;
}

export {};
