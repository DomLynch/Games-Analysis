// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation.
interface Hog {
  health: number;
  pending: number;      // damage waiting for the damage round
  karma: number;        // damage reflected back to this hog, waiting to be added
  invulnerable: boolean;
  king: boolean;
  frozen: boolean;
  teamHasKing: boolean;
}

interface Rules { kingMode: boolean; modifier: number; percent: number; }

// Explosion damage falls with distance from the blast centre and is capped at the radius.
function explosionDamage(radius: number, dist: number, hogRadius = 9): number {
  const base = radius * 2 + Math.floor(hogRadius / 2);
  const raw = base - Math.round(dist);
  if (raw <= 1) return 0;
  return Math.min(Math.floor(raw / 2), radius);
}

// A downward landing speed above 0.4 hurts: 1 plus 70 per unit above the threshold, rounded.
function fallDamage(dY: number): number {
  return dY > 0.4 ? 1 + Math.round((dY - 0.4) * 70) : 0;
}

// Scale by the global modifier and percent. A king attacker adds half; a king or frozen target takes half.
function modifyDamage(dmg: number, attackerKing: boolean, targetKingOrFrozen: boolean, r: Rules): number {
  const attack = attackerKing ? 1.5 : 1;
  const target = targetKingOrFrozen ? 0.5 : 1;
  return Math.round(r.modifier * dmg * attack * r.percent * 0.01 * target);
}

// A hit only adds to the pending amount. Health does not move until the damage round.
function addPending(target: Hog, amount: number): void {
  target.pending += amount;
}

// One damage round over all hogs, in the donor's order. Returns true when nothing was pending.
function damageRound(hogs: Hog[], rules: Rules, multiShot: boolean): boolean {
  let nothingPending = true;
  for (const h of hogs) {
    if (!multiShot) h.pending += h.karma;
    if (h.pending !== 0 && !h.invulnerable) {
      nothingPending = false;
      h.health = h.health < h.pending ? 0 : h.health - h.pending;
    } else if (rules.kingMode && !h.teamHasKing) {
      h.health = 0;
    }
    if (!multiShot) h.karma = 0;
    h.pending = 0;
  }
  return nothingPending;
}

// Turn-end loop: round, pause, round again, until a round finds nothing pending.
// The pause is short only when it is not between turns and not inside a multi-shot.
function settleDamage(hogs: Hog[], rules: Rules, multiShot: boolean, betweenTurns: boolean,
                      pause: (steps: number) => void): number {
  let rounds = 0;
  for (;;) {
    rounds++;
    if (damageRound(hogs, rules, multiShot)) return rounds;
    pause(!betweenTurns && !multiShot ? 500 : 1500);
  }
}

export {};
