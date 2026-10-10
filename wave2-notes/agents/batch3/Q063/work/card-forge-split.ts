// Clean-room sketch: lethal-first split of one damage pool across an ordered list of targets.
// Shape only, written from the described mechanism; donor licence GPL-3.0 (Forge). Not a line-by-line translation.

export interface Target {
  id: string;
  toughness: number;          // damage needed to die, before damage already on it
  damageMarked: number;       // damage already on this target
  assignedThisStep: number;   // damage already assigned to it earlier in this step
  unkillableByHit: boolean;   // indestructible or shielded: this hit cannot kill it
}

export interface Split {
  byTarget: Map<string, number>; // positive entries only
  toDefender: number;            // trample overflow (0 without trample)
}

function lethalLeft(t: Target): number {
  return Math.max(0, t.toughness - t.damageMarked - t.assignedThisStep);
}

// Damage that kills this target: 1 for a deathtouch source, Infinity when this hit cannot kill it.
function killAmount(t: Target, deathtouch: boolean): number {
  if (t.unkillableByHit) return Infinity;
  return deathtouch ? 1 : lethalLeft(t);
}

export function splitDamage(damage: number, ordered: Target[], trample: boolean, deathtouch: boolean): Split {
  let left = damage;
  const byTarget = new Map<string, number>();
  const add = (id: string, n: number): void => {
    if (n > 0) byTarget.set(id, (byTarget.get(id) ?? 0) + n);
  };

  for (const t of ordered) {
    if (left <= 0) break;
    const need = killAmount(t, deathtouch);
    if (need <= left) {
      add(t.id, need);                       // enough to kill: give exactly that, move on
      left -= need;
    } else {
      const give = Math.min(lethalLeft(t), left); // cannot kill: the least that is still lethal, or all that is left
      add(t.id, give);
      left -= give;
    }
  }

  let toDefender = 0;
  if (left > 0) {
    if (trample) toDefender = left;          // overflow to the defending player
    else if (ordered.length > 0) add(ordered[ordered.length - 1].id, left); // else flush into the last target
  }
  return { byTarget, toDefender };
}
export {};
