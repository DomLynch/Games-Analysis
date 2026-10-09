# pmbstyle-L2Solo (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Backpack.js | Licence: Apache-2.0 | JavaScript | symbol Backpack (insertItem/deleteItem/useItem)
Symbol check: class Backpack (55), insertItem (65), deleteItem (73), consumeSoulshot (104), useItem (190) confirmed by opening them this pass. The input line 55 is the class line; the methods are the anchors. fetchItem is in src/GameServer/Model/Backpack.js (62-65).

## 1. Mechanism
- Server-side Backpack per actor, held in memory and mirrored to the database through a write queue.
- insertItem(id, selfId, item) (65-71) asks DataCache for the item definition by selfId, asynchronously, then pushes a new Item with the merged fields. No duplicate check.
- deleteItem(session, id, amount, callback) (73-102) returns if the actor is dead; finds the stack by item id (fetchItem, Model 62-65); skips pet-locked items (fetchItem is a silent no-op when the id is absent); total = stack amount minus the amount asked. If total > 0 it sets the new amount, pushes the item list to the client, calls back with the selfId, and queues a write. If total <= 0 it filters the list by instance id (fetchId, not selfId, so only that stack goes), pushes the list, calls back, and queues a 0 write. Both write paths are skipped when session.persistenceMode is 'ephemeral'.
- useItem(session, id) (190-270) routes a use request by kind, in this order: wearable (skips pet gear, fixes the slot, then equipGear); shot items (compatibility and already-loaded checks, then consumeSoulshot or consumeSpiritshot, then a skill-start broadcast); then catalogue resolvers in order: beast, utility, recipe, mercenary ticket, extractable, enchant scroll, item skill; then tattoo dye opens the henna list; otherwise a warning log. The first handler that returns true stops the chain.
- Inputs: session, item id, amount. Outputs: in-memory list, a client push, a queued database write. Event-driven per request. No tick.

## 2. Key functions
- Backpack.insertItem | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Backpack.js | 65-71 | async definition lookup then push; no dedupe.
- Backpack.deleteItem | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Backpack.js | 73-102 | subtract, drop the stack at zero or below, push, queue a write.
- Backpack.useItem | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Backpack.js | 190-270 | routes a use request by item kind.
- Backpack.consumeSoulshot | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Backpack.js | 104-120 | checks the stock covers the cost, then calls deleteItem.
- Model Backpack.fetchItem | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Model/Backpack.js | 62-65 | finds the first stack with the item id; no-op otherwise.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Stack decrement with remove-at-zero and a write per change | Soulshot cost: the equipped weapon's soulshot field, with a chance-based cheaper roll (miser) (theirs, Items/C4WeaponSA.js 48-51, soulshotCost) |
| Guard on pet-locked stacks and dead actors | Shot kinds soulshot and spiritshot (theirs) |
| Use request routed by item kind through catalogues | Fishing rod grade table, ids 6529 to 6534 and 7560 (theirs, Backpack.js 30-38, FISHING_ROD_GRADES) |

## 4. TypeScript sketch
simplified: the dead-actor early return, the client item-list push and the callback are omitted; persistence is reduced to a flag; a missing id returns null as the donor's fetchItem no-ops.
```ts
// Licence: Apache-2.0 (pmbstyle-L2Solo). Lift permitted; re-expression of Backpack.js 73-102 (deleteItem).
interface Stack { id: number; selfId: number; amount: number; petLocked: boolean; }
interface Persist { write(characterId: number, itemId: number, amount: number): void; }

class Inventory {
  items: Stack[] = [];
  constructor(private persist: Persist, private characterId: number, private ephemeral: boolean) {}

  // Mirrors deleteItem: subtract; a total at or below zero drops the whole stack.
  deleteItem(id: number, amount: number): Stack | null {
    const stack = this.items.find((s) => s.id === id);
    if (!stack || stack.petLocked) return null;
    const total = stack.amount - amount;
    if (total > 0) {
      stack.amount = total;
      this.afterChange(stack.id, total);
    } else {
      this.items = this.items.filter((s) => s.id !== id); // donor filters by instance id (fetchId), as here
      this.afterChange(stack.id, 0);
    }
    return stack;
  }
  private afterChange(id: number, amount: number): void {
    if (!this.ephemeral) this.persist.write(this.characterId, id, amount);
  }
  // Guard the donor leaves to its caller: refuse when the stock is short.
  consume(id: number, amount: number): boolean {
    const stack = this.items.find((s) => s.id === id);
    if (!stack || stack.amount < amount) return false;
    return this.deleteItem(id, amount) !== null;
  }
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/inventory/inventory.ts (stack decrement, remove-at-zero, owned by the server) with the write going through origins/server/career.ts (one ledger); equip routing meets gear data in src/gear-stats.ts.
- Parity-checklist row: row 15 (gear dressing: the wearable branch of useItem is the equip step) and row 18 (loot/career award: stacks arrive on that path). Shot routing touches row 13 (specials) only if Frankendom adds consumables.
- Reuse tag: adapt.
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- deleteItem does not check the stock. An over-consume silently removes the whole stack; only consumeSoulshot checks first.
- The zero-removal filters by instance id (line 93), so two stacks of one type do not both vanish. Earlier note claiming type-id filtering was wrong.
- insertItem is asynchronous through DataCache. Order against a later delete in the same tick is not guaranteed.
- Persistence is a write per change, with an ephemeral bypass. Frankendom's server must own the write rule.
- Bot journal calls in the same file are bot-only and do not apply.
