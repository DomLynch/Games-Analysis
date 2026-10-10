// Licence: MIT (donor, LICENSE line 1). Adapted in shape; written from the mechanism.
export interface HitSplat {
  damage: number;
  type: number;
}

export interface HitRecord {
  hp: number;
  slotCount: number;      // hits applied this tick
  slot1: HitSplat | null; // first splat value
  slot2: HitSplat | null; // second splat value
}

export function newHitRecord(hp: number): HitRecord {
  return { hp, slotCount: 0, slot1: null, slot2: null };
}

// One hit. The splat keeps only the hit points that were actually removed.
export function applyHit(r: HitRecord, damage: number, type: number): number {
  let dealt = damage;
  if (r.hp - damage <= 0) {
    dealt = r.hp;
    r.hp = 0;
  } else {
    r.hp -= damage;
  }
  const splat: HitSplat = { damage: dealt, type };
  if (r.slotCount % 2 === 1) {
    r.slot2 = splat;   // odd count: second slot
  } else {
    r.slot1 = splat;   // even count: first slot (a third hit overwrites the first hit's splat)
  }
  r.slotCount += 1;
  return dealt;
}

// End of tick: clear the record, as the donor does in its per-tick reset.
export function resetHitRecord(r: HitRecord): void {
  r.slotCount = 0;
  r.slot1 = null;
  r.slot2 = null;
}

export {};
