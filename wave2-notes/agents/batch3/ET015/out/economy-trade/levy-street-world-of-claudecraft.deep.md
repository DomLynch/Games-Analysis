# levy-street-world-of-claudecraft (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts` (with `server/woc_market_rules.ts` `listingEligibility`) | Licence: MIT (repo `LICENSE`, "MIT License", Copyright (c) 2026 Levy Street, read) | TypeScript | symbol `exchangeHardLock`, `listingEligibility`

Checked: Read in full: `src/sim/exchange_eligibility.ts` (1-192). Read the server authority `server/woc_market_rules.ts` 512-617 (refusal union, policy type, restricted policy, `listingEligibility`). Read `src/sim/transfer_lock.ts` 18-22, `src/sim/item_lock_flag.ts` 16-18, `src/sim/equipment_rules.ts` 209-214 (`effectiveQuality`), `src/sim/loot_master.ts` 13-20 (a second quality rank table, not used). Grep of `tests/woc_market_rules.test.ts` for the expected reasons. Not read: the rest of `woc_market_rules.ts` (bid, settlement and bond state machines), `inventory_extract.ts` (the sim re-check; described in a comment only), the client pre-filters (`src/ui/woc_market_view.ts`, `src/ui/trade_woc_view.ts`; described in a comment only). The donor is a token-exchange game ($WOC): this note takes the item eligibility rule only. The token, wallet, bond and settlement parts are out of scope and are not used. Three or more candidate files opened. Confidence: high on the rule order and the reasons (read end to end). Camera scope: not applicable.

Best transferable idea: One eligibility function for trade, checked in a fixed order with one refusal reason per copy, where the server re-runs it and an unknown item category is refused by default.
Decision (proposed): adapt — Frankendom's player trade and auction need one rule that says why a copy cannot be traded (quest, bound, locked), and the closed default and the precedence chain fit; the token exchange, bond and settlement do not, and neither does the store-catalog exclusion.
Acceptance: a server test: a quest item, a bound copy, a bind-on-trade copy, a soulbound sword and a player-locked item each refuse with their own reason; a kind the taxonomy does not know is refused as not eligible; a common sword is refused below the epic floor while an epic sword lists; a common mount lists.

## 1. Mechanism

- Category first (`exchangeItemCategory`, 66-71): a mount by kind (67), then a chroma plate by use type (68), then equipment if the def has a slot (69), else `other`. `other` is the closed default (53): anything unrecognised is not tradable.
- Server order (`listingEligibility`, 582-617): (a) no def, refuse `unknown_item` (587). (b) Hard locks via the shared predicate `exchangeHardLock` (591-592). (c) Policy exclusion by item id (593). (d) Category switch: equipment, mount and chroma each read their own policy flag; `other` is always refused (595-603). (e) For equipment only, the quality floor (606-615): quality = rolled quality if present, else def quality, else common (610); refuse if its rank is below the floor's rank (611-613).
- Hard locks, in order (`exchangeHardLock`, 155-180): quest kind first (160). Then the instance lock: a copy with bind-on-trade set or with a `boundTo` stamp (166). The reason is `bound_copy` if `boundTo` is present, else `bind_armed` (167). Presence is tested, not truthiness, so character id 0 counts. Then a soulbound def, except mounts (169). Then a no-market-list def, except chromas (170). The owner's own lock is last (178), so it is only reported when nothing stronger applies.
- Policy (`WOC_MARKET_RESTRICTED_POLICY`, 556-562): equipment allowed, equipment floor `epic`, mounts allowed, chromas allowed, excluded set empty. The floor is applied only to equipment (190-191); mounts and chromas trade at any tier. The comment says this is so a common mount is not hidden (src/sim/exchange_eligibility.ts 183-189).
- Rank table (`QUALITY_RANK`, 564-571): poor 0, common 1, uncommon 2, rare 3, epic 4, legendary 5. Epic (4) is the default floor.
- The `rolled` quality beats the def quality (`effectiveQuality`, equipment_rules.ts 213): a rolled item ranks by what it rolled.

## 2. Key functions

- `exchangeHardLock`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/exchange_eligibility.ts` 155-180. The lock chain, first match wins.
- `exchangeItemCategory`: same file, 66-71. Closed category with explicit discriminators first.
- `listingEligibility`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/woc_market_rules.ts` 582-617. The server rule. Calls the same predicate as the sim and the client.
- `WocEligibilityPolicy` and `WOC_MARKET_RESTRICTED_POLICY`: same file, 524-562. Policy as data: flags, floor, exclusion set.
- `isTransferLockedInstance`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/transfer_lock.ts` 18-22. Bind-on-trade or boundTo.
- `isItemLocked`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/item_lock_flag.ts` 16-18. The owner lock flag.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Refuse by fixed precedence, one reason per copy | Order of the checks (theirs, exchange_eligibility.ts 160-178) |
| Closed default category | `other` is refused (theirs, 53) |
| Floor applies to one category only | Floor `epic` (theirs, woc_market_rules.ts 558); rank 4 (theirs, 569) |
| Collectibles trade at any tier | Mounts and chromas allowed at every rank (theirs, woc_market_rules.ts 559-560) |
| Rolled quality beats base quality | Missing quality counts as common (theirs, woc_market_rules.ts 610) |
| Operator exclusion by id, after the locks | Empty set in the restricted policy (theirs, 561) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: unknown def, hard lock (quest, bound or armed, soulbound, no-trade, owner lock), exclusion, category switch, then the equipment floor. It renames the donor's fields (`noMarketList` to `noTrade`, `mech_chroma` to `chroma`, `equipmentQualityFloor` to `floor`) and narrows the quality type, so the donor's `?? 0` for an unknown quality string is not needed. It omits the consumed-on-use rule for chroma plates, the sim re-check at extraction, the client pre-filters, the store-catalog exclusion (the set is passed in), the bid and settlement state machines, and the second quality rank table in `loot_master.ts`. The donor's `isTransferLockedInstance` and `effectiveQuality` are inlined.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ET015-levy-trade-eligibility.ts) exits 0.

## 5. Lands in

- TARGET `origins/server/trade-eligibility.ts` (new, the one rule for what a player may list or trade; the server runs it, and the client may run it only as a pre-filter that the server repeats). No parity row covers trade rules. Row 21 (catalogue fields) is the closest: the bound, locked and no-trade flags, the category and the floor are catalogue fields. Stated plainly: none of rows 1-23 is about trade, so this is a closest fit, not a match.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this sketch is written fresh)
- Brief rule served: one ledger (one rule, one refusal reason, server re-checks it); server-verified (the server listing rule runs before any custody action); catalogue as runtime source (flags are fields on the item).

## 6. Gaps and risks

- The donor's policy is a product decision, not a constant: the restricted policy turns the equipment floor on at epic and both collectible arms on (woc_market_rules.ts 551-562 comment). Frankendom should keep the floor and the flags as catalogue or zone fields, and set the first values by ruling, not by copying epic.
- The reason order is load-bearing. The donor says the order is so that the strongest fact is reported (exchange_eligibility.ts 161-165, 174-177). A test must pin the order, or the player is told a weaker reason.
- The donor keeps an armed copy refused on the directed rail for escrow reasons (exchange_eligibility.ts 117-127). Frankendom has no escrow, so the escrow argument does not transfer. Only the bound-copy and armed-copy refusals do.
- Mounts and chromas are exempt from soulbound and no-trade in the donor (169-170). The donor says this was a choice made when every reins item was soulbound, then changed (exchange_eligibility.ts 133-141). Frankendom should not inherit an exemption without a ruling.
- Quality rank tables are duplicated in the donor (`woc_market_rules.ts` 564, `loot_master.ts` 13; `inventory_sort.ts` 93 also has one, seen by grep only). The donor's own comment says the server rule and the sim's quality rule must be the same call (`woc_market_rules.ts` 607-609). Frankendom should have one rank table.
- Exclusion by id is merged from a store catalogue that sells items for the donor's token (woc_market_rules.ts 544-548). Reject for Frankendom; the exclusion set is data, not a store link.
- The client pre-filter and the sim re-check are described in comments only (not read). The shape is "same predicate in three places", which Frankendom should enforce by importing one module, not by copying lists.
- The donor is MIT. Code may be adapted; this sketch is written fresh from the rule order.
