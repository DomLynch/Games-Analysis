// Licence: MIT (donor, LICENSE read). Written fresh from the described rule order; not copied.
// clean-room
export type Quality = 'poor' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Category = 'mount' | 'chroma' | 'equipment' | 'other';
export type Refusal =
  | 'unknown_item' | 'quest_item' | 'bound_copy' | 'bind_armed' | 'soulbound'
  | 'no_trade' | 'locked' | 'excluded_item' | 'not_eligible_category' | 'below_quality_floor';

export interface ItemDef {
  id: string;
  kind: string;
  slot?: string;
  quality?: Quality;
  soulbound?: boolean;
  noTrade?: boolean;
  chroma?: boolean;
}

export interface ItemInstance {
  rolledQuality?: Quality;
  boundTo?: number;        // character id; presence is the test, id 0 is valid
  bindOnTrade?: boolean;
  locked?: boolean;        // the owner's own lock
}

export interface Policy {
  allowEquipment: boolean;
  floor: Quality;          // applies to equipment only
  allowMounts: boolean;
  allowChromas: boolean;
  excluded: ReadonlySet<string>;
}

export type Eligibility = { ok: true } | { ok: false; reason: Refusal };

const RANK: Record<Quality, number> = { poor: 0, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

// Closed default: anything not recognised is 'other', which is never tradable.
export function categoryOf(def: ItemDef): Category {
  if (def.kind === 'mount') return 'mount';
  if (def.chroma) return 'chroma';
  if (def.slot !== undefined) return 'equipment';
  return 'other';
}

// First match wins, so each copy gets one reason the player can read.
export function hardLock(def: ItemDef, inst: ItemInstance | undefined): Refusal | null {
  if (def.kind === 'quest') return 'quest_item';
  if (inst && (inst.bindOnTrade === true || inst.boundTo !== undefined)) {
    return inst.boundTo !== undefined ? 'bound_copy' : 'bind_armed';
  }
  const cat = categoryOf(def);
  if (def.soulbound && cat !== 'mount') return 'soulbound';
  if (def.noTrade && cat !== 'chroma') return 'no_trade';
  if (inst?.locked === true) return 'locked';   // weakest fact last
  return null;
}

export function eligibility(def: ItemDef | undefined, inst: ItemInstance | undefined, p: Policy): Eligibility {
  if (!def) return { ok: false, reason: 'unknown_item' };
  const lock = hardLock(def, inst);
  if (lock) return { ok: false, reason: lock };
  if (p.excluded.has(def.id)) return { ok: false, reason: 'excluded_item' };
  const cat = categoryOf(def);
  const allowed =
    cat === 'equipment' ? p.allowEquipment :
    cat === 'mount' ? p.allowMounts :
    cat === 'chroma' ? p.allowChromas : false;
  if (!allowed) return { ok: false, reason: 'not_eligible_category' };
  if (cat === 'equipment') {
    const q: Quality = inst?.rolledQuality ?? def.quality ?? 'common';
    if (RANK[q] < RANK[p.floor]) return { ok: false, reason: 'below_quality_floor' };
  }
  return { ok: true };
}
export {};
