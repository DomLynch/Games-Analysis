// Licence: MIT (donor, OTClient). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export interface Foe {
  id: string;
  hpPct: number;     // 0-100
  pathLen: number;   // steps to reach it; caller passes only foes that have a path
  isMonster: boolean;
}

export interface Rule {
  priority: number;     // 0-10, set in the editor
  maxDistance: number;  // 1-10, set in the editor
  chase: boolean;
  danger: number;
}

export interface Pick { foe: Foe; rule: Rule; score: number }

// Score one foe under one rule. Out of reach: only the current-target bonus survives.
export function scoreFoe(foe: Foe, rule: Rule, isCurrent: boolean): number {
  let score = isCurrent ? 1 : 0;
  if (foe.pathLen > rule.maxDistance) return score;
  score += rule.priority;
  if (foe.pathLen === 1) score += 10;
  else if (foe.pathLen <= 3) score += 5;
  const hp = foe.hpPct;
  if (rule.chase && hp < 30) score += 5;
  else if (hp < 20) score += 2.5;
  else if (hp < 40) score += 1.5;
  else if (hp < 60) score += 0.5;
  else if (hp < 80) score += 0.2;
  return score;
}

// One tick. scan(r) returns the foes in a square of radius r around the player.
export function pickTarget(
  scan: (radius: number) => Foe[],
  rulesFor: (foe: Foe) => Rule[],
  currentId: string | null,
): { pick: Pick | null; danger: number } {
  let foes = scan(6);                                            // 12x12 window
  if (foes.filter(f => f.isMonster).length > 10) foes = scan(3); // crowded: 6x6 window
  let best: Pick | null = null;
  let danger = 0;
  for (const foe of foes) {
    if (!foe.isMonster || foe.hpPct <= 0) continue;
    let bestScore = 0;
    let bestRule: Rule | null = null;
    for (const rule of rulesFor(foe)) {
      const s = scoreFoe(foe, rule, foe.id === currentId);
      if (s > bestScore) { bestScore = s; bestRule = rule; }
    }
    danger += bestRule ? bestRule.danger : 0;   // danger only from a rule that scored above 0
    if (bestRule && bestScore > (best?.score ?? 0)) best = { foe, rule: bestRule, score: bestScore };
  }
  return { pick: best, danger };
}
