// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the mechanism; not a translation.
// clean-room
export const VIOLENCE_NONE = 0;
export const VIOLENCE_MINIMAL = 1;
export const VIOLENCE_NORMAL = 2;
export const VIOLENCE_MAX = 3;

export const DAMAGE_TYPE_NORMAL = 0;
export const DAMAGE_TYPE_FIRE = 2;
export const DAMAGE_TYPE_EXPLOSION = 6;

export type Anim = string;
export type AttackKind = 'punch' | 'kick' | 'thrust' | 'swing' | 'throw' | 'fireSingle' | 'other';

export interface KillHit {
  damage: number;
  damageType: number;
  attackKind: AttackKind;
  hitFromFront: boolean;
  attackerIsPlayer: boolean;
  bloodyTrait: boolean;      // attacker is the player and has the bloody-mess trait
  molotov: boolean;          // thrown weapon is the molotov cocktail
  flameboy: boolean;         // weapon carries the flameboy perk
  pyromaniac: boolean;       // attacker is the player with the pyromaniac perk
}

export interface Victim {
  hasArt(anim: Anim): boolean;
}

export interface DeathTables {
  tier2: readonly Anim[]; // mid-severity death per damage type
  tier3: readonly Anim[]; // heavy-severity death per damage type
}

export interface Thresholds { mid: number; heavy: number; }

// Donor order: molotov sets fire and its own thresholds; pyromaniac fire sets both to 1; flameboy divides by 3.
export function thresholdsFor(hit: KillHit, base: Thresholds): { thresholds: Thresholds; damageType: number } {
  let mid = base.mid;
  let heavy = base.heavy;
  let damageType = hit.damageType;
  if (hit.molotov) {
    mid = 5;
    heavy = 15;
    damageType = DAMAGE_TYPE_FIRE;
  }
  if (hit.attackerIsPlayer && hit.pyromaniac && damageType === DAMAGE_TYPE_FIRE) {
    mid = 1;
    heavy = 1;
  }
  if (hit.flameboy) {
    mid = Math.trunc(mid / 3);
    heavy = Math.trunc(heavy / 3);
  }
  return { thresholds: { mid, heavy }, damageType };
}

// Keep the variant only if the violence setting allows it and the art exists; otherwise a standard fall.
export function checkDeath(v: Victim, anim: Anim, minViolence: number, violence: number, hitFromFront: boolean): Anim {
  if (violence >= minViolence && v.hasArt(anim)) {
    return anim;
  }
  if (hitFromFront) {
    return 'fallBack';
  }
  return v.hasArt('fallFront') ? 'fallBack' : 'fallFront';
}

export function pickDeath(hit: KillHit, v: Victim, violence: number, tables: DeathTables, base: Thresholds): Anim {
  const { thresholds, damageType } = thresholdsFor(hit, base);
  const bloody = hit.bloodyTrait;
  // Donor sets the molotov's animation to fire-single as well as its damage type.
  const kind: AttackKind = hit.molotov ? 'fireSingle' : hit.attackKind;

  const isMeleeGroup = kind === 'kick' || kind === 'thrust' || kind === 'swing'
    || (kind === 'punch' && damageType === DAMAGE_TYPE_NORMAL)
    || (kind === 'throw' && damageType !== DAMAGE_TYPE_EXPLOSION);

  let death: Anim = 'fallBack';
  if (isMeleeGroup) {
    if (violence === VIOLENCE_MAX && bloody) {
      death = 'bigHole';
    }
  } else if (kind === 'fireSingle' && damageType === DAMAGE_TYPE_NORMAL) {
    if (violence === VIOLENCE_MAX && (bloody || hit.damage >= thresholds.heavy)) {
      death = 'bigHole';
    }
  } else if (violence > VIOLENCE_MINIMAL && (bloody || hit.damage >= thresholds.mid)) {
    if (violence > VIOLENCE_NORMAL && (bloody || hit.damage >= thresholds.heavy)) {
      death = tables.tier3[damageType];
      if (checkDeath(v, death, VIOLENCE_MAX, violence, hit.hitFromFront) !== death) {
        death = tables.tier2[damageType];
      }
    } else {
      death = tables.tier2[damageType];
    }
  }

  if (!hit.hitFromFront && death === 'fallBack') {
    death = 'fallFront';
  }
  return checkDeath(v, death, VIOLENCE_NONE, violence, hit.hitFromFront);
}

// Corpse aging on map load. The flag is per map (the world map record), not per zone code.
export function agingStage(hoursAway: number, mapAgesBodies: boolean): number {
  if (!mapAgesBodies || hoursAway === 0) {
    return 0;
  }
  if (hoursAway > 14 * 24) {
    return 2; // corpses and the fourteen-day misc object
  }
  if (hoursAway > 6 * 24) {
    return 1; // corpses become blood pools
  }
  return 0;
}

// Blood pool frame: a random 0-3, plus 6 for flat critters, else plus 3 unless rat or mantis.
export function bloodPoolFrame(roll0to3: number, flatCritter: boolean, ratOrMantis: boolean): number {
  if (flatCritter) {
    return roll0to3 + 6;
  }
  return ratOrMantis ? roll0to3 : roll0to3 + 3;
}

export {};
