// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the mechanism; not a translation.
// clean-room
export const VIOLENCE_NONE = 0;
export const VIOLENCE_MINIMAL = 1;
export const VIOLENCE_NORMAL = 2;
export const VIOLENCE_MAX = 3;

export type Anim = string;

export interface DeathHit {
  damage: number;            // damage dealt by this hit
  damageType: number;        // index into the tables (0..6 in the donor)
  melee: boolean;            // punch, kick, thrust, swing or throw
  singleShotNormal: boolean; // one-shot gun with normal damage type (caller computes this)
  bloodyTrait: boolean;      // attacker has the bloody-mess trait
  hitFromFront: boolean;
}

export interface Victim {
  hasArt(anim: Anim): boolean; // art exists for this creature, facing and animation
}

export interface DeathTables {
  tier2: readonly Anim[]; // mid-severity death per damage type
  tier3: readonly Anim[]; // heavy-severity death per damage type
}

export interface DeathTuning {
  tier2Damage: number; // 15 in donor
  tier3Damage: number; // 45 in donor
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

export function pickDeath(hit: DeathHit, v: Victim, violence: number, tables: DeathTables, tune: DeathTuning): Anim {
  let death: Anim;
  if (hit.melee) {
    death = violence === VIOLENCE_MAX && hit.bloodyTrait ? 'bigHole' : 'fallBack';
  } else if (hit.singleShotNormal) {
    death = violence === VIOLENCE_MAX && (hit.bloodyTrait || hit.damage >= tune.tier3Damage) ? 'bigHole' : 'fallBack';
  } else if (violence > VIOLENCE_NORMAL && (hit.bloodyTrait || hit.damage >= tune.tier3Damage)) {
    death = tables.tier3[hit.damageType];
    if (checkDeath(v, death, VIOLENCE_MAX, violence, hit.hitFromFront) !== death) {
      death = tables.tier2[hit.damageType]; // heavy art missing: use the mid tier
    }
  } else if (violence > VIOLENCE_MINIMAL && (hit.bloodyTrait || hit.damage >= tune.tier2Damage)) {
    death = tables.tier2[hit.damageType];
  } else {
    death = 'fallBack';
  }

  if (!hit.hitFromFront && death === 'fallBack') {
    death = 'fallFront';
  }
  return checkDeath(v, death, VIOLENCE_NONE, violence, hit.hitFromFront);
}

export const DONOR_TABLES: DeathTables = {
  tier2: ['dancingAutofire', 'slicedInHalf', 'charred', 'charred', 'electrify', 'fallBack', 'bigHole'],
  tier3: ['chunksOfFlesh', 'slicedInHalf', 'fireDance', 'meltedToNothing', 'electrifiedToNothing', 'fallBack', 'explodedToNothing'],
};

export {};
