# levy-street-world-of-claudecraft (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts | Licence: MIT | TypeScript | symbol exchangeItemCategory / exchangeHardLock
Symbol check: exchangeItemCategory (66), exchangeHardLock (155) and exchangeCategoryUsesQualityFloor (190) confirmed. exchangeBrowseCategory (83) and exchangeBrowseSubcategory (100) are also in the file.

## 1. Mechanism
- A pure classifier module for the item exchange. It is used by the server (listingEligibility in server/woc_market_rules.ts, authoritative), the sim (extractTradableCopy in src/sim/inventory_extract.ts) and two client pre-filters (header comment, lines 5-13; those four files were not opened). The donor puts one definition in all four places so they cannot disagree.
- Input: an item definition (kind, use type, slot, soulbound, noMarketList flags) and an optional per-copy instance payload (boundTo, bindOnTrade, and the owner's `locked` flag).
- Step 1, category: mount first, then mech chroma, then equipment if the def has a slot, else other. Order matters so a future mount with a slot keeps its own category (comment 59-65). `other` is the closed default: an unrecognised kind is not tradable (53-55).
- Step 2, hard lock (155-180): quest kind is refused (160). Then the per-copy predicate isTransferLockedInstance (166; transfer_lock.ts 18-22, read: true when the payload has bindOnTrade === true or boundTo defined): it answers bound_copy if boundTo is present (presence, not truthiness, since pid 0 is real) else bind_armed (167). Then soulbound (not for mounts, 169) and noMarketList (not for chromas, 170). Last, the owner's own item lock (178; item_lock_flag.ts 16-18: payload.locked === true), kept last on purpose (171-177).
- Policy is not here: whether a category trades, the price floor value and operator exclusions stay on the server (comment 29-34).
- Step 3, price floor: only the equipment category uses the quality floor (190-192). Mounts and chromas are traded at any tier. The "epic by default" value is from the comment at 188, the floor itself lives on the server (not read).
- Output: null (eligible) or one ExchangeLock reason. A browse category (weapon, armor, mount, chroma, other) and a subcategory (weapon type or armour slot) feed the filter UI.
- Pure functions, no clock, no rng (comment 36-42), so nothing runs per tick; the header says they are called at listing and at bag extraction.

## 2. Key functions
- exchangeItemCategory (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts | 66-71 | mount, chroma, equipment or other, by discriminators in that order.
- exchangeBrowseCategory (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts | 83-91 | player-facing filter category; weapons and armour split apart.
- exchangeBrowseSubcategory (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts | 100-105 | weapon type or armour slot for the second filter.
- exchangeHardLock (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts | 155-180 | ordered refusal reasons, per-copy lock first.
- exchangeCategoryUsesQualityFloor (levy) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts | 190-192 | true only for equipment.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered classifier with the most specific discriminator first | Category names: mount, mech_chroma, equipment, other (theirs) |
| Ordered refusal list, per-copy state checked before def flags | Lock names and their order (theirs) |
| Exception per category for a flag (mounts may be soulbound, chromas may be no-market-list) | Which categories are exempt (theirs, a product rule) |
| One shared predicate used by all enforcement points | isTransferLockedInstance (transfer_lock.ts 18-22) and isItemLocked (item_lock_flag.ts 16-18), small leaf files (theirs) |
| Quality floor applied to one category only | Floor applies to equipment; "epic by default" per the comment at 188, value lives on the server (theirs) |

## 4. TypeScript sketch
simplified: browse category and subcategory (83-105) are omitted; the per-copy predicate (transfer_lock.ts) is inlined as two checks on the copy, and the instance field `locked` is named playerLocked. Order matches the donor: quest, bound or armed copy, soulbound, no-market-list, owner lock.
```ts
// Licence: MIT (levy-street-world-of-claudecraft). Logic lifted from
// src/sim/exchange_eligibility.ts and rewritten as plain TS with local types.
type Category = 'mount' | 'mech_chroma' | 'equipment' | 'other';
type Lock = 'soulbound' | 'quest_item' | 'no_market_list' | 'bound_copy' | 'bind_armed' | 'locked';

interface ItemDef {
  kind?: string;
  useType?: string;
  slot?: string;
  soulbound?: boolean;
  noMarketList?: boolean;
}
interface CopyState { boundTo?: number; bindOnTrade?: boolean; playerLocked?: boolean; }

export function itemCategory(def: ItemDef): Category {
  if (def.kind === 'mount') return 'mount';
  if (def.useType === 'mechChroma') return 'mech_chroma';
  if (def.slot !== undefined) return 'equipment';
  return 'other';
}

export function hardLock(def: ItemDef, copy?: CopyState): Lock | null {
  const cat = itemCategory(def);
  if (def.kind === 'quest') return 'quest_item';
  if (copy?.boundTo !== undefined) return 'bound_copy';
  if (copy?.bindOnTrade) return 'bind_armed';
  if (def.soulbound && cat !== 'mount') return 'soulbound';
  if (def.noMarketList && cat !== 'mech_chroma') return 'no_market_list';
  if (copy?.playerLocked) return 'locked';
  return null;
}

export function usesQualityFloor(cat: Category): boolean {
  return cat === 'equipment';
}
```

## 5. Lands in
- Frankendom file(s): origins/contracts/economy.ts (TradeBlock reasons and tradeCooldown already cover bound, stackable and story-critical blocks, lines 52-83; this note's lock list would extend that union) and origins/contracts/items.ts (item definition fields). Named from reading economy.ts in the world worktree; items.ts by name only.
- Parity-checklist row: row 21 (catalogue fields: item category, soulbound and no-market flags as data) and row 18 (one ledger).
- Reuse tag: adapt (MIT, so the logic can be lifted; the lock names and the mount exemption are Levy product rules to re-decide)
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- Only the classifier. The pricing, escrow, expiry and delivery are elsewhere in the donor (not read).
- Soulbound and bind-on-trade logic is tuned to Levy's economy (mounts tradable, chromas off the gold market). Frankendom already has its own TradeBlock set in economy.ts (bound, story-critical, stackable, cash-shop, shop-not-gear); the gap is only the missing no-market flag and owner lock, which need a Lead ruling before adding.
- The donor's bound-copy rule keys on a boundTo stamp. Frankendom's one-ledger rule needs the equivalent stamp on the item instance, written server-side.
- No fight or combat content. Nothing here lands in src/fight.
