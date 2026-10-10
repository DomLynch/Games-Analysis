# alexbatalov-fallout2-ce (inventory-bank-equipment, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` (with `src/inventory.cc`, `src/combat.cc`, `src/critter.cc`) | Licence: Sustainable Use License 1.0 (`LICENSE.md` line 1; internal-business and non-commercial use only; restricted, clean-room shape only) | C++ | symbols `itemAttemptAdd`, `itemAdd`, `itemRemove`, `_item_move_func`, `itemMoveAllHidden`, `itemDestroyAllHidden`, `_item_identical`, `inventoryOpenLooting`, `_move_inventory`, `_barter_attempt_transaction`

Checked: This is the Fallout 2 CE sibling of cell 1. The hint was INFERRED, so I went straight to `item.cc` and `inventory.cc` (the file layout is flat under `src/`, and the Fallout 1 names became `item*` and `_move_inventory`). Read in full: `itemAttemptAdd` (item.cc 253-323), `itemAdd` (324-400), `itemRemove` (401-466), `_item_move_func` and the move wrappers (478-535), `itemMoveAllHidden` and `itemDestroyAllHidden` (536-569), `_item_identical` (648-698), `itemGetWeight` (757-800), `itemIsHidden` (1133-1145), `_drop_into_container` (5429-5468), `_move_inventory` (4525-4669), `_barter_attempt_transaction` (4706-4762). Read in part: `objectGetInventoryWeight` (919-935), `inventoryOpenLooting` (4057-4127 and the loop skeleton, 4140-4505 by key lines and the exit block 4438-4505), `_adjust_ac` (2544-2560), `inventoryQuantitySelect` (5584-5600 and the digit entry 5700-5720), `critterKill` (critter.cc 818-905, the hidden-destroy line only), and the death branch of combat.cc (4846-4862). Not read: `skillsPerformStealing` (the steal chance), `_inven_wield` and `_invenWieldFunc` (3263-3410), `itemDropAll` (570-647), the body of `_barter_compute_value` (only its final return, about 4700-4702), `_barter_move_inventory` (4765-4851), and the loot arrow and layout code. Confidence: high on hidden items, stacking, checked moves, take-all, the steal XP rule and the barter checks; medium on the full loot-screen control flow.

Best transferable idea: give an item a "hidden" flag so it weighs nothing, stays out of the loot list while a body is looted, and is removed on death; and check both sides of a two-sided trade (carry on each side, then value) before any item moves.
Decision (proposed): adapt - keep the hidden flag and the two-sided check, but do not copy the donor's temporary box (a hidden container created on each loot). In Frankendom the loot view is a filter over the one ledger, and the death removal is a ledger event with a receipt, not a silent destroy.
Acceptance: A hidden item (a quest token or internal part) does not appear in the corpse loot payload and does not change the carry total shown on the phone; a server test asserts that after a death event no ledger row for a hidden item remains and that a barter refused for one side changes no row on either side.

## 1. Mechanism

- **Stacking and identity** (`_item_identical`, item.cc 648-698). Items stack only if pid and sid match, neither has the equipped or queued flag, neither is a container, and both have empty contents. The byte compare is now on the item's flags and item-specific data (line 688, `data.flags` and `data.item`); the CE comment says the donor's original compared 32 bytes, including the inventory header, which is safe to skip because containers are already filtered out. Ammo and money set the quantity equal before the compare.
- **Add** (`itemAttemptAdd` 253-323 then `itemAdd` 324-400). `itemAttemptAdd` is the checked path. For a container: refuse when used size plus incoming size reaches max (`>=`, line 269); if the container's owner is a creature, refuse when its carry would go over (280-281). For a creature: refuse a non-biped unless its proto has `CRITTER_BARTER` (296-304), then refuse when inventory weight plus incoming goes above `STAT_CARRY_WEIGHT` (313-314, strict `>`). `itemAdd` is the force path: merge into an identical entry (334), or append. For ammo the rounds pool exactly as in Fallout 1 (381 onward); otherwise the quantity is added (390).
- **Weights** (`itemGetWeight` 757-800, `objectGetInventoryWeight` 919-935). The weight is the proto weight, set to zero for a hidden item (765-769). A container adds its contents. A weapon adds its loaded ammo at `ceil(rounds / box size)` boxes (793), and this still happens when the weapon is hidden. The inventory weight is the sum of item weight times quantity (919-935). For a creature the function then adds an add-on for the hand and armour items; I read only the first lines of that branch, so its exact rule is (not read).
- **Hidden items** (`itemIsHidden` 1133-1145; `itemMoveAllHidden` 536-551; `itemDestroyAllHidden` 553-569). A hidden item is one whose proto has the `ITEM_HIDDEN` extended flag (1144; the flag value is in `proto_types.h`, line 227). `inventoryOpenLooting` creates a temporary box (a Jesse container, 4123) and moves every hidden item from the target into it (4127), so the looter never sees them. At exit the box is emptied back into the target (4467) and destroyed. When a critter dies, the damage path destroys its hidden items (combat.cc 4858), and `critterKill` does the same (critter.cc 905).
- **Move** (`_item_move_func` 478-512). Remove from the source (`itemRemove`), add to the target (`itemAttemptAdd` for `itemMove`, `itemAdd` for `itemMoveForce`), and on failure `itemAdd` the item back into the source (492). If that also fails, the item is connected to the owner's map tile (the rollback is in the same shape as Fallout 1). `itemMoveAll` loops on index 0 with no exit (528).
- **Remove** (`itemRemove` 401-466). A whole-stack removal compacts the entry. A partial removal copies the object (`_obj_copy`, 435) with the donor's `// TODO: Not sure about this line.` above it (434). For ammo the remainder is reset to a full box. Stealth boy handling is present and is not relevant here.
- **Two-sided barter** (`_barter_attempt_transaction` 4706-4762). The order is: (1) the buyer's free carry (`STAT_CARRY_WEIGHT` minus current weight) must hold the incoming table's weight, else message 31 (4710-4711, 4712-4717). (2a) If the NPC is a party member, the NPC's free carry must hold the offer's weight, else message 32 (4722). (2b) Otherwise the offer must be non-empty and not queued, and the buyer's barter value (`_barter_compute_value`) must not exceed the offer's cost (4735-4744), else message 28 (4751). (3) Only then do both `itemMoveAll(barterTable, dude)` (4759) and `itemMoveAll(offerTable, npc)` (4760) run. Nothing moves before every check passes.
- **Take-all** (`inventoryOpenLooting` 4271-4280). Not while stealing (4272). Compares the target's inventory weight with the looter's free carry (4273-4276). If it fits, `itemMoveAll(target, looter)` moves everything; otherwise the "cannot carry that much" message (31) shows and nothing moves.
- **No-steal gate** (`inventoryOpenLooting` 4072-4076). A critter whose pid has `CRITTER_NO_STEAL` cannot be looted or stolen from; the donor shows message 50 ("You can't find anything to take from that.") and returns.
- **Moves in the loot screen** (`_move_inventory` 4525-4669). Same shape as Fallout 1: the drag and quantity picker, then while stealing `skillsPerformStealing` runs first and a failure returns `INVENTORY_MOVE_RESULT_CAUGHT_STEALING` (4612). Otherwise `itemMove` runs, and success returns `INVENTORY_MOVE_RESULT_SUCCESS`. A failed take shows message 25 (4647-4657).
- **Drop into a container and its rollback** (`_drop_into_container` 5429-5468). Remove from the player (5443), `itemAttemptAdd` to the container, and on failure `itemAdd` (force) back to the player with the donor's SFALL comment saying this fixes items disappearing when overloaded (5451-5454). On success, an armour slot is cleared through `_adjust_ac` (5459).
- **Quantity picker** (`inventoryQuantitySelect` 5584-5720). The same behaviour as Fallout 1, with the cap at 99999 (5594) and typed digits as `(10 * value) mod 100000 + digit` (5713). The set-timer variant is the same function.
- **Steal XP** (`inventoryOpenLooting` 4249, 4368-4369, 4470-4471). The same escalation as Fallout 1: 10, then +10 per success, paid at exit only if not caught and not a party member, capped at `300 - Steal`.
- **Armour swap** (`_adjust_ac` 2544-2560). The same bonus subtraction and addition as Fallout 1 for AC, DR and DT (2546 is the first line). The difference: there is no `obj_dude` gate, so the swap applies to any critter that calls it (Fallout 1 gates it, inventry.cc 2195).

## 2. Key functions

- `itemAttemptAdd`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 253-323 (checked add).
- `itemAdd`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 324-400 (force add; merge at 334 and 390; ammo pooling at 381).
- `itemRemove`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 401-466 (copy at 435; TODO at 434).
- `_item_move_func`, `itemMove`, `itemMoveForce`, `itemMoveAll`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 478-535 (rollback at 492; loop at 528).
- `itemMoveAllHidden`, `itemDestroyAllHidden`, `itemIsHidden`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 536-569 and 1133-1145.
- `itemGetWeight` and the hidden zero: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 757-800.
- `_item_identical`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 648-698.
- `_barter_attempt_transaction`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 4706-4762.
- `inventoryOpenLooting`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 4057-4505.
- `_move_inventory`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 4525-4669.
- `_drop_into_container`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 5429-5468.
- `_adjust_ac`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 2544-2560.
- Death hook: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat.cc` 4858; `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/critter.cc` 905 (inside `critterKill`, 818).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Container refuses when used + incoming reaches max (strict `>=`) | Max size per proto (not read); size per unit per proto |
| Carrier refuses when weight + incoming is above the cap (strict `>`) | `STAT_CARRY_WEIGHT` (stat value not read) |
| Hidden item weighs zero, is set aside in loot, destroyed on death | `ITEM_HIDDEN` proto extended flag (item.cc 1144) |
| Ammo weight is ceil(rounds / box) boxes | Box weight and box size per proto (item.cc 793) |
| Take-all: all-or-nothing against free carry | None (inventory.cc 4276) |
| Two-sided barter: carry check on each side, then value, then move both | Party-member rule (inventory.cc 4722); value check (4744) |
| Quantity picker 1..min(max, 99999) | 99999 (inventory.cc 5594); typed digits mod 100000 (5713) |
| Steal XP: 10, +10 per success, cap 300 minus Steal | 10 (4249), +10 (4369), 300 (4471) |
| No-steal flag refuses the loot screen | `CRITTER_NO_STEAL` (4072) |

## 4. TypeScript sketch

simplified: the sketch keeps the hidden-item rules (zero weight, set aside, destroyed on death), the ammo box rounding and the two-sided barter order. It drops the proto lookups, the identity and merge details, the stack-merge when moving entries (the sketch moves entries as they are), the stealth boy case, the barter price formula (the sketch takes "offer value ok" as an input), the Jesse box object itself (the sketch uses a plain holder), the party-member flag source, and the UI and animation. It reorders nothing from the donor's barter order: carry on the buyer side, then carry on the seller side for a party member or value for a non-party seller, then both moves. The code block is the file that was typechecked with `tsc --strict --target es2020`, with `export {}` at the end.

```ts
// clean-room sketch: hidden (internal) items, weapon ammo weight, and a two-sided checked barter. Written from the described mechanism, not a translation.
type Item = {
  kind: number;          // proto id
  weight: number;        // proto weight per unit
  hidden: boolean;       // proto extended flag: internal item
  ammoRounds: number;    // rounds loaded in a weapon (0 if none)
  ammoBoxSize: number;   // rounds per box (0 if the weapon takes no box ammo)
  ammoBoxWeight: number; // weight of one box
};

type Entry = { item: Item; qty: number };

type Holder = {
  entries: Entry[];
  carry: number;         // carry cap (creatures only)
};

const OK = 0;
const ERR_CARRY_BUYER = -1;
const ERR_CARRY_SELLER = -2;
const ERR_OFFER = -3;

// Hidden items weigh zero; loaded ammo weighs ceil(rounds / box size) boxes, even on a hidden weapon.
function itemWeight(it: Item): number {
  let w = it.hidden ? 0 : it.weight;
  if (it.ammoBoxSize > 0 && it.ammoRounds > 0) {
    w += it.ammoBoxWeight * Math.ceil(it.ammoRounds / it.ammoBoxSize);
  }
  return w;
}

function holderWeight(h: Holder): number {
  let w = 0;
  for (const e of h.entries) w += itemWeight(e.item) * e.qty;
  return w;
}

// Loot screen: hidden items are set aside for the session and put back at exit.
function setAsideHidden(target: Holder, box: Holder): void {
  const keep: Entry[] = [];
  for (const e of target.entries) {
    if (e.item.hidden) box.entries.push(e);
    else keep.push(e);
  }
  target.entries = keep;
}

function returnHidden(box: Holder, target: Holder): void {
  target.entries.push(...box.entries.splice(0));
}

// On death, hidden items are destroyed rather than looted.
function destroyHiddenOnDeath(h: Holder): void {
  h.entries = h.entries.filter((e) => !e.item.hidden);
}

// Two-sided barter. Every check runs before anything moves, and each refusal has its own reason.
// buyerGets = the incoming table, sellerGets = the offer. The seller is a party member (carry checked) or not (offer value checked).
function barter(
  buyer: Holder,
  seller: Holder,
  offer: Holder,
  incoming: Holder,
  sellerIsParty: boolean,
  offerValueOk: boolean,
): number {
  if (holderWeight(incoming) > buyer.carry - holderWeight(buyer)) return ERR_CARRY_BUYER;
  if (sellerIsParty) {
    if (holderWeight(offer) > seller.carry - holderWeight(seller)) return ERR_CARRY_SELLER;
  } else if (offer.entries.length === 0 || !offerValueOk) {
    return ERR_OFFER;
  }
  buyer.entries.push(...incoming.entries.splice(0));
  seller.entries.push(...offer.entries.splice(0));
  return OK;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed new module, not checked against the Frankendom repo): the hidden-item flag on the catalogue entry (row 21 catalogue fields for the flag), the loot-view filter, the death removal as a ledger event, and the two-sided barter check. Parity-checklist row 18 (loot roll and XP award).
- today: none located (not checked).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room shape only, no copied text or code)
- Brief rule served: one ledger (every removal, including the death removal of hidden items, is a ledger event); the numbered rule for this in my copy of the brief is not confirmed.

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 allows internal-business and non-commercial use only. Clean-room sketch only.
- Donor pattern to drop: the loot screen creates a temporary Jesse container (inventory.cc 4123) to hold hidden items for the session. In Frankendom the loot view should be a filter over the ledger, with no hidden copy of the items.
- One ledger: the death removal (combat.cc 4858; critter.cc 905) is a silent destroy in the donor. Frankendom must make it a ledger event that the server writes, so a hidden item cannot be dupped by reloading.
- Server-verified: the donor's loot view is local. The server must refuse a loot request for a live critter (row 17 death and respawn, and row 18), refuse one for a `CRITTER_NO_STEAL` target, and check both carry caps before any move in a barter or take-all.
- The two-sided barter order (carry on the buyer, then carry or value on the seller, then move both) is the shape to keep. The donor's `_barter_compute_value` body was not read, so the price formula is not adopted from this cell.
- Donor quirk: a hidden weapon still weighs for its loaded ammo (item.cc 765-793), because the zero applies only to the proto weight. Frankendom should decide whether that is wanted and write the rule as data.
- Donor change from Fallout 1: `_adjust_ac` has no player-only gate here (inventory.cc 2544-2546), so a non-player critter's armour changes AC through this path. Frankendom should choose one rule. It is noted under row 15 (gear dressing), not in this cell's target.
- Defect (same as Fallout 1): `itemMoveAll` loops on index 0 with no exit when a move fails (item.cc 528); the return value of `itemMoveForce` is ignored. Fix: return on failure.
- Donor defect: partial remove copies the object with a TODO above it (item.cc 434-435). Fix: an explicit split.
- Quirk to decide, not copy: steal XP escalation as in Fallout 1. Frankendom has no steal ruling. Not adopted.
- Client-only: the loot view, picker and barter screen are client UI. The Pit has no loot (row 22). Phone shape: tap to select, then a quantity sheet, as in the Fallout 1 note.
