// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

// --- 1. Diminishing returns ladder: one entry per (target, group), any source ---
export type DrLevel = 0 | 1 | 2 | 3; // 0 = full, 1 = half, 2 = quarter, 3 = immune
const DR_MULT: readonly number[] = [1, 0.5, 0.25, 0]; // fixed engine rule
const DR_RESET_MS = 15000;                              // fixed engine rule: reset after 15 s with no active aura
const PVP_CC_CAP_MS = 10000;                            // donor comment says 10 s; per-group values not read

interface DrEntry { hitCount: number; stack: number; stampMs: number; }

export class DrLadder {
  private groups = new Map<string, DrEntry>();

  // Level read when a CC is about to land. Read only, except the reset.
  level(group: string, nowMs: number): DrLevel {
    const e = this.groups.get(group);
    if (!e || e.hitCount === 0) return 0;
    if (e.stack === 0 && nowMs - e.stampMs > DR_RESET_MS) { e.hitCount = 0; return 0; }
    return Math.min(e.hitCount, 3) as DrLevel;
  }

  // Called after the level was read. The first landing creates the entry at level 1 (the 2nd application).
  // maxLevel is per group in the donor (GetDiminishingReturnsMaxLevel), not always 3 (immune): store it on the group row.
  // The caller also decides whether this target type may advance the group (donor: DRTYPE_PLAYER groups only on player-controlled targets).
  land(group: string, nowMs: number, maxLevel: DrLevel = 3): void {
    const e = this.groups.get(group);
    if (!e) { this.groups.set(group, { hitCount: 1, stack: 0, stampMs: nowMs }); return; }
    if (e.hitCount < maxLevel) e.hitCount += 1;
  }

  applied(group: string): void {
    const e = this.groups.get(group);
    if (e) e.stack += 1;
  }

  removed(group: string, nowMs: number): void {
    const e = this.groups.get(group);
    if (e && e.stack > 0) {
      e.stack -= 1;
      if (e.stack === 0) e.stampMs = nowMs; // the 15 s window starts when the last aura ends
    }
  }
}

// Duration after the ladder. The caller sets pvpCap when the source is a player and the target is a
// player (or a creature with the all-diminish flag). Donor: Unit.cpp 11403-11404.
export function ccDurationMs(baseMs: number, level: DrLevel, pvpCap: boolean): number {
  const capped = pvpCap ? Math.min(baseMs, PVP_CC_CAP_MS) : baseMs;
  return Math.floor(capped * DR_MULT[level]); // 0 means the aura is not applied
}

// --- 2. Resist chance R / (R + C), capped at 0.75, with partial-resist bins ---
export function resistConstant(casterLevel: number): number {
  if (casterLevel > 60) return 150 + (casterLevel - 60) * (casterLevel - 67.5);
  if (casterLevel > 20) return 50 + (casterLevel - 20) * 2.5;
  return 50;
}

export function resistChance(resist: number, casterLevel: number): number {
  const r = Math.max(resist, 0);
  return Math.min(r / (r + resistConstant(casterLevel)), 0.75);
}

// Probabilities that 0,10,...,100 percent of the hit is resisted (11 bins).
export function partialBins(avg: number): number[] {
  const p = Array.from({ length: 11 }, (_, i) => Math.max(0, 0.5 - 2.5 * Math.abs(0.1 * i - avg)));
  if (avg <= 0.1) { p[0] = 1 - 7.5 * avg; p[1] = 5 * avg; p[2] = 2.5 * avg; }
  return p;
}

export function pickBin(probs: number[], u01: number): number {
  let acc = probs[0];
  let i = 0;
  while (u01 >= acc && i < 10) { acc += probs[++i]; }
  return i; // damage resisted = damage * i / 10
}

// --- 3. One roll checked against cumulative bands: miss, then resist ---
// hitChanceBp and resistBp are basis points (1 = 0.01 percent).
export function hitRoll(hitChanceBp: number, resistBp: number, rnd01: number): "miss" | "resist" | "hit" {
  const hit = Math.min(Math.max(hitChanceBp, 100), 10000);
  const roll = 1 + Math.floor(rnd01 * 10000); // 1..10000
  let band = 10000 - hit;
  if (roll < band) return "miss";
  band += resistBp;
  if (roll < band) return "resist";
  return "hit";
}

// --- 4. Cast pushback: +500 ms per hit, reduced by aura %, at most 2 pushes ---
export interface CastTimer { remainingMs: number; castMs: number; pushes: number; }

export function pushback(c: CastTimer, reducePct: number): void {
  const add = Math.floor(500 * (1 - Math.min(Math.max(reducePct, 0), 100) / 100));
  if (add <= 0 || c.pushes >= 2) return; // fix: check first, spend a push only when one applies
  c.pushes += 1;
  c.remainingMs = Math.min(c.remainingMs + add, c.castMs);
}

export {};
