# exult-exult (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/exult-exult/usecode/ucinternal.cc` | Licence: GPL-2.0-or-later (per file headers: "either version 2 of the License, or (at your option) any later version"; the COPYING file is the GPL v2 text) | C++ | symbol `Usecode_internal::remove_party_items`

Checked: Symbol `remove_party_items` at ucinternal.cc 1176-1207 (read in full). Helpers read: `count_objects` ucinternal.cc 1113-1138; `get_party` from 871; `Container_game_object::remove_quantity` contain.cc 342 onward; `Container_game_object::count_objects` contain.cc 573 onward; `Can_be_added` contain.cc 59 onward; `Game_object::modify_quantity` objs.cc 453-510. Confidence: high on the order of operations and numbers of the debit path. Medium on whether the locked-container mismatch in section 1 can occur in the shipped data: the shape flag data was not read and nothing was run. Not read: the usecode bytecode that calls the intrinsic (where buy/sell prices and shop logic would live), and the shape flag tables. Camera: not applicable.

## 1. Mechanism

- Entry: scripted usecode calls the intrinsic `remove_party_items` (usecode/intrinsics.cc 910-912), which passes quantity, shape, quality, frame and a flag to the internal function. The flag is ignored (`ignore_unused_variable_warning(flagval)` in the same function). The function runs on demand from scripts, not per frame. No locking or transaction appears in this function.
- Step 1, pre-check the whole party. `count_objects` is called with the party sentinel -357 (ucinternal.cc 1123 tests for it; 1127-1137 sums `count_objects` over each party member). `get_party` puts the avatar at index 0 (875-876), then the party members.
- Step 2, refusal. If the request is not "any quantity", and the count is below the request, the function returns 0 at once and removes nothing (1195-1196). If the request is "any quantity", the request becomes the whole count (1194).
- Step 3, drain in party order. The original request is saved (1198). For each member, in order, while quantity is still owed, `remove_quantity` takes what it can and returns what is still owed (1199-1204).
- Inside one holder (contain.cc 342 onward): if the container cannot hold the shape, it returns the amount owed unchanged (348, with allow_locked false). Otherwise it walks its objects. On a matching stack it calls `modify_quantity(-delta)` (360). If the stack was not deleted, it recurses into the object (365).
- Stack arithmetic (objs.cc 453 onward): a stack's quantity is kept in the low 7 bits of `quality` (471). Adds clamp at MAX_QUANTITY = 100 (321, 478-479) and return the leftover (510). A stack taken to zero or below is removed (482).
- Step 4, result. Return `quantity != orig_cnt` (1206): true when anything was removed. Given the pre-check, that means the full amount, except in the mismatch below. A zero request returns 0 (false), because nothing is removed and the test compares to zero.
- Mismatch (donor defect, from reading the code, not run): the pre-check counts with `allow_locked = true` (contain.cc 578), but the drain removes with `allow_locked = false` (348, default in 59 and tested at 63). A holder whose shape is flagged locked (`is_container_locked`, shapes/shapeinf.h 667-668) is counted but never drained. If the unlocked part is short, the drain removes what it can and the function still returns true. The caller then believes it was paid in full. Whether a locked-flag holder can sit in a party member's pack in the shipped data was not checked.

## 2. Key functions

- `Usecode_internal::remove_party_items`: `/mnt/frankendom-donors/exult-exult/usecode/ucinternal.cc` 1176-1207. Pre-check, refusal, drain, result.
- `Usecode_internal::count_objects`: `/mnt/frankendom-donors/exult-exult/usecode/ucinternal.cc` 1113-1138. Sentinel -357 selects the whole party.
- `Container_game_object::remove_quantity`: `/mnt/frankendom-donors/exult-exult/objs/contain.cc` 342 onward (receipts 348, 360, 365). Recursive drain, one holder.
- `Container_game_object::count_objects`: `/mnt/frankendom-donors/exult-exult/objs/contain.cc` 573 onward (receipts 578, 590-594). Recursive count, allows locked.
- `Can_be_added`: `/mnt/frankendom-donors/exult-exult/objs/contain.cc` 59 onward (line 63 is the locked test). The one place locked is decided, and the two callers pass different values.
- `Game_object::modify_quantity`: `/mnt/frankendom-donors/exult-exult/objs/objs.cc` 453-510 (receipts 478-482, 510). Stack cap, clamp, leftover, removal at zero.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count every eligible holder first; if short, refuse and remove nothing | Party sentinel -357 and any-quantity sentinel (ucinternal.cc 1123, 1194) |
| Drain holders in a fixed order, each giving what it can, until the debit is paid | Avatar first, then party members (875-876). The order is data, not a rule of the mechanism |
| Stack add clamps at a cap and returns the leftover to the caller | Stack cap 100 (theirs, objs.cc 321; clamp 478-479; leftover 510) |
| A stack reduced to zero is removed | Threshold 0 (objs.cc 482) |
| Success means something was removed | Zero request returns 0 (1206 with orig_cnt 0; mechanism read, not receipted beyond 1206) |

## 4. TypeScript sketch

simplified: the sketch uses a flat list of stacks per holder; the donor recurses into containers inside containers. It uses one predicate that excludes locked stacks everywhere, so count and debit agree; the donor counts locked-shape holders but cannot drain them (see section 1). It returns true for a zero cost; the donor returns 0. It omits the quality and frame filters, the stack cap of 100, the on-fire rule, the volume and weight rules, and the usecode interface (the donor ignores the flag argument). Pre-check then drain, in the donor's order.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Stack = { shape: string; qty: number; locked: boolean };
// One party member's pack. The donor recurses into nested containers; this sketch keeps a flat list.
type Holder = { id: string; stacks: Stack[] };

// ONE predicate for counting and debiting. The donor's count allows locked containers and its debit does not.
function eligible(s: Stack, shape: string): boolean {
  return s.shape === shape && !s.locked;
}

function countAvailable(party: Holder[], shape: string): number {
  let total = 0;
  for (const h of party) {
    for (const s of h.stacks) {
      if (eligible(s, shape)) total += s.qty;
    }
  }
  return total;
}

// All-or-nothing debit: true and exactly `cost` removed, or false and nothing removed.
// Party order is the drain order (avatar first, as in the donor's get_party).
function debitParty(party: Holder[], shape: string, cost: number): boolean {
  if (cost <= 0) return true; // design choice: the donor returns false for a zero request
  if (countAvailable(party, shape) < cost) return false;

  let left = cost;
  for (const h of party) {
    for (const s of h.stacks) {
      if (left === 0) break;
      if (!eligible(s, shape)) continue;
      const take = Math.min(s.qty, left);
      s.qty -= take;
      left -= take;
    }
    h.stacks = h.stacks.filter((s) => s.qty > 0 || !eligible(s, shape));
    if (left === 0) break;
  }
  return left === 0;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/ledger.ts` (proposed new module; the path was not checked in the repo). One function, `debitHolders(holders, item, qty)`, that counts, refuses or drains in one server transaction. Shop buys and craft costs call it, so there is one ledger path.
- Parity-checklist row 18 (loot roll and XP award), the closest of rows 1-23 for a currency debit. No row names a shop, a ledger or a debit; the row is a stand-in.
- Reuse tag: adapt-shape (GPL-2.0-or-later; clean-room only, sketch above is written from the mechanism)
- Brief rule served: one ledger, server-verified (the check and the debit are one step on the server); rules 7-9 n/a

Best transferable idea: Count every eligible holder first, refuse with nothing removed when short, then drain in a fixed order, with count and drain sharing one predicate.

Decision (proposed): adapt. Frankendom needs one debit path for shop buys and craft costs; keep the check-then-drain shape, but use one predicate and one server transaction, and drop the party-of-NPCs part because Frankendom has one character.

Acceptance: a server test where a craft costing 5 coins with 4 held is refused, the balance stays at 4 and there is no partial debit; with 5 spread over two holders the balance drops by exactly 5 in one call and the response reports 5; and a holder with a locked-shape flag is either counted and drained, or not counted at all, never counted and left unpaid.

## 6. Gaps and risks

- The donor's count and debit use different predicates (contain.cc 578 against 348 and 59-63). The debit can pay less than the count reported, and the caller is told it succeeded. Frankendom must use one predicate, with a test that the countable amount equals the drainable amount when a locked holder is present.
- The donor has no transaction: this function shows no locking or transaction, and its calls come from script code. Frankendom's server must do the check and the debit as one transaction, or two concurrent buys can both pass the check. The storage layer was not read.
- A zero-cost request returns false in the donor (1206). Our sketch returns true. Decide it and test it, so a free craft does not look like a failed one.
- The donor's party is the avatar plus party members. Frankendom has one character. The multi-holder drain only matters if the ledger spans bag and bank, or several characters. Under "one character, one ledger", the transferable part is the pre-check and the drain over one holder list.
- The donor carries no prices, shop gumps or sink rates here. Buy and sell logic is in game usecode bytecode (not read). This note gives the debit primitive only, not pricing or inflation control.
- Faucet side, not in this note: monster equipment is rolled when the monster is created (monsters.cc 137; the `equipment` argument defaults to true in monsters.h 50). Each entry passes unless `1 + rand() % 100` is above its percent (147). Stackable money gets `1 + rand() % quantity` (168). That is a loot roll (parity row 18), read but not sketched; a candidate for a separate cell. The donor uses C `rand()`; how it is seeded was not checked. Do not port the RNG; use the server's seeded stream.
