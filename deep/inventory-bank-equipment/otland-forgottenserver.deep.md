# otland-forgottenserver (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/otland-forgottenserver/src/depotchest.cpp | Licence: GPL-2 | C++ | symbol DepotChest::queryAdd
Symbol check: DepotChest::queryAdd (14) confirmed (opened this pass, whole file 1-64). postAddNotification (46-51) is a relay for the owning locker. Base Container::queryAdd was not read.

## 1. Mechanism
- Server-side admission check for a depot (bank-like chest). Runs synchronously before every move or add into the depot.
- Inputs: the target thing, count, flags, and the acting creature. Output: a ReturnValue code (ok, NOTPOSSIBLE, DEPOTISFULL, or the base class result).
- Non-items are refused (NOTPOSSIBLE). Unless the NOLIMIT flag bit is set, it computes how many depot slots the add would use: a partly moved stackable counts 1; an item not already at the top level of this depot counts its holding count + 1 when it is a container, otherwise 1.
- If getItemHoldingCount() + that count exceeds maxDepotItems the add is refused with DEPOTISFULL. Otherwise it defers to Container::queryAdd (line 43; that base was not read).
- Container events from inside the depot are forwarded to the parent locker (postAddNotification 46-51, postRemoveNotification 53-58, getParent 60-64: parent of the container's parent, or null).
- Event-driven per request. No tick.

## 2. Key functions
- DepotChest::queryAdd | /mnt/frankendom-donors/otland-forgottenserver/src/depotchest.cpp | 14-44 | admission check counting item holdings against the depot cap.
- DepotChest::postAddNotification | /mnt/frankendom-donors/otland-forgottenserver/src/depotchest.cpp | 46-51 | relays add events to the owning locker.
- DepotChest::getParent | /mnt/frankendom-donors/otland-forgottenserver/src/depotchest.cpp | 60-64 | climbs one level past the container to the locker.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Capacity counted in holdings, so a container costs its contents plus one (lines 31-33, 38) | maxDepotItems (theirs; used at line 38, definition not read) |
| Bypass flag for admin or internal moves (line 22) | FLAG_NOLIMIT bit (theirs; bit value defined elsewhere, not read) |
| Stackable partial moves cost one slot (lines 26-28) | items[type].maxItems (theirs; line 11, passed to the Container base as the chest's own capacity, not part of queryAdd) |

## 4. TypeScript sketch
simplified: the final defer to Container::queryAdd (line 43) is replaced by returning 'ok'; the addCount order (stackable first, then foreign-parent overwrite) matches the donor.
```ts
// Licence: GPL-2 (otland-forgottenserver) | clean-room: written from the mechanism, no donor lines.
type Admit = 'ok' | 'DEPOT_FULL' | 'NOT_POSSIBLE';
interface Item { stackable: boolean; count: number; isContainer: boolean; holding: number; topParent: string; }
interface Depot { id: string; holding: number; maxItems: number; }
const FLAG_NOLIMIT = 1 << 0; // theirs: bit value

// Admission check run before any add into the depot.
function depotAdmit(d: Depot, item: Item | null, moveCount: number, flags: number): Admit {
  if (!item) return 'NOT_POSSIBLE';
  const skipLimit = (flags & FLAG_NOLIMIT) !== 0;
  if (!skipLimit) {
    let addCount = 0;
    if (item.stackable && item.count !== moveCount) addCount = 1;
    if (item.topParent !== d.id) {
      // an item coming from outside costs its holding count when it is a container
      addCount = item.isContainer ? item.holding + 1 : 1;
    }
    if (d.holding + addCount > d.maxItems) return 'DEPOT_FULL';
  }
  return 'ok'; // donor then defers to the base container rules
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/inventory/inventory.ts (bank or stash admission on the server, with the server-side ledger writer origins/server/career.ts as the owner of totals); gear/stash capacity fields belong in the catalogue (origins/contracts/economy.ts).
- Parity-checklist row: nearest row 18 (loot roll and XP/career award: a bank cap gates where awarded loot can land) and row 21 (catalogue fields: capacity per container type). Not a fight-engine row.
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The admission rule is the whole depot logic shown. Base Container::queryAdd and the move path were not read.
- Counting by holdings is a server rule. Frankendom must run it on the server (server-verified rule), never on a client.
- No rebalance or overflow path is shown; the donor's cap is a plain number.
- GPL-2: only the mechanism is described.
