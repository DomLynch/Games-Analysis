// Licence: unclear (donor header: DOOM Source Code License; top-level LICENSE.TXT is GPL v2 text). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Body {
  id: number;
  isPlayer: boolean;     // invulnerability and armour apply to player bodies only (donor: inside the player-specific branch)
  health: number;
  shootable: boolean;
  mass: number;          // per-type value; push = damage x 12.5 / mass (map units)
  armourClass: 0 | 1 | 2; // 0 none; class 1 soaks a third of a hit, class 2 a half
  armourPoints: number;
  invulnerable: boolean;
  painChance: number;    // flinch threshold on a 0..255 roll
  threshold: number;     // > 0 while the body is committed to another target
}

export interface Hit {
  damage: number;
  source: number | null; // attacker id; null for the environment
  pushes: boolean;       // false for a melee weapon that does not push
}

export interface HitResult {
  dealt: number;     // damage taken by health
  dead: boolean;
  push: number;      // push magnitude from the raw damage (map units); the caller decides how to use it
  flinch: boolean;
  retargetTo: number | null;
  threshold: number;
}

const BASE_THRESHOLD = 100; // value is a placeholder; the donor's BASETHRESHOLD is not read

// Donor order: gates, then push (from raw damage, before the invulnerability gate), then (players only) invulnerability and armour split,
// then health and death, then the flinch roll, then retarget to the source (not after a kill).
export function applyHit(b: Body, h: Hit, rand255: () => number): HitResult {
  const none: HitResult = { dealt: 0, dead: false, push: 0, flinch: false, retargetTo: null, threshold: b.threshold };
  if (!b.shootable || b.health <= 0) return none;

  const push = h.pushes ? (h.damage * 12.5) / b.mass : 0;

  if (b.isPlayer && b.invulnerable && h.damage < 1000) return { ...none, push };

  let damage = h.damage;
  if (b.isPlayer && b.armourClass !== 0) {
    let saved = b.armourClass === 1 ? Math.trunc(damage / 3) : Math.trunc(damage / 2);
    if (b.armourPoints <= saved) {
      saved = b.armourPoints;
      b.armourClass = 0; // pool used up
    }
    b.armourPoints -= saved;
    damage -= saved;
  }

  b.health -= damage;
  if (b.health <= 0) return { dealt: damage, dead: true, push, flinch: false, retargetTo: null, threshold: b.threshold };

  const flinch = rand255() < b.painChance;

  let retargetTo: number | null = null;
  let threshold = b.threshold;
  if (b.threshold === 0 && h.source !== null && h.source !== b.id) {
    retargetTo = h.source;
    threshold = BASE_THRESHOLD;
  }
  return { dealt: damage, dead: false, push, flinch, retargetTo, threshold };
}

export {};
