# EQEmu (inventory-bank-equipment, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/common/inventory_profile.cpp` (`EQ::InventoryProfile::SwapItem` 260-400, `HasSpaceForItem` 485-586) and `/mnt/frankendom-donors/EQEmu/zone/inventory.cpp` (`Client::SwapItem` 1601 onward, `TryStacking` 1154, `AutoPutLootInInventory` 1197, `MoveItemCharges` 1282) | Licence: GPL-3.0-or-later (per file header of inventory_profile.cpp: "either version 3 of the License, or (at your option) any later version"; LICENSE.md is GNU GPL v3) | C++ | symbols `EQ::InventoryProfile::SwapItem`, `Client::SwapItem`, `Client::AutoPutLootInInventory`

Checked: Read in full: `common/inventory_profile.cpp` 260-400 (`SwapItem`) and 485-586 (`HasSpaceForItem`); `zone/inventory.cpp` 1154-1281 (`TryStacking`, `AutoPutLootInInventory`, equip and stack steps), 1601-1690 (`Client::SwapItem` start), 1728-1778 and 1804-1830 (bank gate, charge check, recursion, shared-bank check; the trader-satchel block at 1779-1803 by grep only), 2019-2106 (charge merge, split, direct swap and its gate). Read in part: `zone/inventory.cpp` 1054-1081 and 1083-1152 (`PutItemInInventory`, `PutLootInInventory`), 1282-1300 (`MoveItemCharges` head), 1549-1551, 1586-1600, 2106-2112 (fail message), 2212-2229 (saves). Not read: `zone/inventory.cpp` 1690-1727 (destroy and tradeskill-combine paths), 1831-2018 (trade, trader satchel, tradeskill world container, entity trade), 2107-2211 (trader and bag paths), `SwapItemResync` at 2238, the bodies of `SetMaterial` (`zone/client.cpp` 3667) and `SetAttuned`, `database.SaveInventory`, the RoF2 slot-number headers (values not read), the loot caller in `zone/loot.cpp`. Callers of `HasSpaceForItem`: grep finds only the Lua and Perl bindings (`zone/lua_inventory.cpp`, `zone/perl_inventory.cpp`); no zone loot code calls it. Confidence: high on the charge merge and split and on the order of the checks in the charge branch; high that the attune and material writes run before the equip gate (lines 2081 and 2092 before 2096, and no race, class or level check appears between 1601 and 2096); medium on the trade and tradeskill branches, which were not read. Read the licence header and LICENSE.md: GPL-3.0-or-later, clean-room only.

Best transferable idea: Move part of a stack by min(requested, room): the destination takes what fits, the source keeps the rest, and every refusal (too few charges, other item id, full destination) is decided before any write.
Decision (proposed): adapt - take the requested-count merge and the refuse-before-write order for Frankendom stack moves; reject the per-item loot pickup (it can report false after a partial move) and the per-row DB saves. Why: the merge rule is exact and small, and the one-ledger ruling needs refusals before writes; the all-or-nothing award should come from the planned add in the Dawn-of-Light note, with this donor's HasSpaceForItem as the capacity precheck.
Acceptance: A server test moves 5 charges from a 20-stack onto a 17-stack (max 20) and asserts 3 moved, the destination holds 20, and the source holds 17; a move of a different item id is refused and both stacks are unchanged.

## 1. Mechanism

- Two layers. `EQ::InventoryProfile::SwapItem` (common, data only) checks the source and the destination slot against a possessions bitmask and the bank size (the first gates in the function), then checks each item against the slot it would move into (equipment slots: race, class, deity and level; allowed slot), then swaps the two items with two `_PutItem` calls (392) and returns a named fail state. `Client::SwapItem` (zone) is the move packet handler. It validates the slot ids, applies the bank-range and count checks, runs the trade and tradeskill branches, and then does one of three things: a stack merge, a stack split, or a direct swap.
- `Client::SwapItem` order: (a) both slot ids must pass `IsValidSlot` (at the top of the function; a bad id is logged and returns false); (b) same-slot moves are handled as summon or lore checks and return true (right after the slot checks); (c) if either slot is a bank slot, the nearest banker must be within `USE_NPC_RANGE2` or the client is kicked (1738-1751); (d) a source with charges must hold at least the requested count, and the request must not exceed the stack size (1765-1768); (e) trader satchel and trade and tradeskill branches (not read in full); (f) the charge branch, when the requested count is above 0 (2021): the source must be stackable (2023-2025); if the destination has an item, it must have the same item id (2029-2031) and must have room (2033); the merge moves `usedcharges = min(room, requested)` (2037-2039), adds it to the destination (2041) and takes it from the source (2042); if the source ends at 0 charges, it is deleted (2044-2050); an overfull destination is refused before any write (2055-2056); (g) if the destination is empty and the requested count is at least the source charges, the whole stack moves through `m_inv.SwapItem` (2061-2066); otherwise it splits: the source keeps `charges - requested` (2069) and a new instance with the requested count is put in the destination (2071-2072); (h) without a count (the direct-swap branch at 2078), for an equipment destination the item is attuned and the material is set (2079-2092), and only then does `m_inv.SwapItem` run the race, class, deity and level gate (2096); on failure a named message is sent and the function returns false (2097-2106); (i) on success both slots are saved (2212-2229).
- `HasSpaceForItem` (common, 485-586) is a planner with no writes: for a stackable item it first counts stack room in general slots and in bag slots (500-502 and the bag loop), and only then counts empty general and bag slots. It returns true as soon as the remaining quantity fits.
- Loot pickup is per item: `AutoPutLootInInventory` (1197) tries an auto-equip into a free worn slot (with weapon, two-hand, instrument and dual-wield rules), then `TryStacking` (1154) for stackable items (merge into general-slot stacks, then bag stacks, recursing on any remainder at 1168 and 1185), then `FindFreeSlot` and `PutLootInInventory` (1266 onward). `MoveItemCharges` (1282) moves `min(source charges, room left)` (1291) and saves the destination row.

## 2. Key functions

- `EQ::InventoryProfile::SwapItem`: `/mnt/frankendom-donors/EQEmu/common/inventory_profile.cpp` 260-400 (slot gates near the top, item gates in the middle, swap at 392; the race and class line is 338, the slot-allowed check is 359).
- `EQ::InventoryProfile::HasSpaceForItem`: `/mnt/frankendom-donors/EQEmu/common/inventory_profile.cpp` 485-586 (stack room first at 500-502).
- `Client::SwapItem`: `/mnt/frankendom-donors/EQEmu/zone/inventory.cpp` 1601 onward (bank gate 1738-1751, count check 1765-1768, charge branch 2021-2077, direct swap 2078-2106).
- `Client::TryStacking`: `/mnt/frankendom-donors/EQEmu/zone/inventory.cpp` 1154-1196 (recursion at 1168 and 1185).
- `Client::AutoPutLootInInventory`: `/mnt/frankendom-donors/EQEmu/zone/inventory.cpp` 1197-1281 (stack step at 1266).
- `Client::MoveItemCharges`: `/mnt/frankendom-donors/EQEmu/zone/inventory.cpp` 1282 onward (charges_to_move at 1291).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Merge a requested count: take min(room, requested); the source keeps the rest (2037-2042) | Stack size per item (theirs, item data; not read) |
| Split a stack into an empty slot: the source keeps charges minus requested (2069) | None |
| Refuse a count above the stack size or above the charges in the source (1765-1768) | None |
| Refuse two different item ids in a stack move (2029-2031) | None |
| Bank range: a banker must be near, checked on the server | `USE_NPC_RANGE2` 40000 (theirs, `common/features.h` 215, "arbitrary right now"; the unit follows the donor's distance function, not read) |
| Bag slot id = bag base + parent index x slot count + bag index (1097) | Slot count and base values in the RoF2 headers (not read) |

## 4. TypeScript sketch

simplified: The sketch models only the charge branch of `Client::SwapItem` (merge and split with a requested count, with every refusal decided before any write) and the equip-gate order. It OMITS: the plain swap for non-stack items (named here, not modelled; it is `InventoryProfile::SwapItem`), the summon and lore checks, the bank range check, the trade, trader-satchel and tradeskill branches, shared-bank verification, the database saves, and the race, class, deity and level rules themselves (the gate is a callback). It REORDERS one step on purpose: the donor sets the attune flag and the visible material BEFORE the gate runs (2081, 2092, then 2096); the sketch runs the gate first, so a refused equip changes nothing (defect D1 in section 6). It also has no request of 0 (the donor's direct swap); the sketch assumes a positive request.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Reason = "ok" | "insufficient" | "not-stackable" | "other-item" | "over-max" | "race-class" | "level";

interface Stack {
  itemId: number;
  charges: number;
  stackSize: number;
  stackable: boolean;
  attuneable: boolean;
  attuned: boolean;
}

interface MoveResult {
  reason: Reason;
  moved: number;
  created: Stack | null;
}

// Equip move: every gate runs first; only then is anything visible written (attune, material).
function equipSwap(item: Stack, gate: () => Reason, setMaterial: () => void): Reason {
  const r = gate();
  if (r !== "ok") return r; // nothing was written: no attune, no material change
  if (item.attuneable) item.attuned = true;
  setMaterial();
  return "ok";
}

// Partial stack move with a requested count. Every refusal is decided before any write.
function moveCharges(src: Stack, dst: Stack | null, requested: number): MoveResult {
  const refuse = (reason: Reason): MoveResult => ({ reason, moved: 0, created: null });

  if (src.charges > 0 && (src.charges < requested || requested > src.stackSize)) return refuse("insufficient");
  if (!src.stackable) return refuse("not-stackable");

  if (dst) {
    if (dst.itemId !== src.itemId) return refuse("other-item");
    if (dst.charges >= dst.stackSize) return refuse("over-max");
    // same rule as the donor: take the smaller of the room left and the requested count.
    const moved = Math.min(dst.stackSize - dst.charges, requested);
    dst.charges += moved;
    src.charges -= moved; // the caller deletes src when it reaches 0
    return { reason: "ok", moved, created: null };
  }

  if (requested >= src.charges) {
    // whole stack goes to the empty slot; the caller deletes src
    return { reason: "ok", moved: src.charges, created: { ...src } };
  }
  src.charges -= requested; // split: the source keeps the rest
  return { reason: "ok", moved: requested, created: { ...src, charges: requested } };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/iv003-eqemu-stack-move.ts`) exits 0. Sketch file: `/private/tmp/p2/wave2-haiku/batch3/IV003/work/eqemu-stack-move.ts`.

## 5. Lands in

- TARGET `origins/server/inventory.ts` (new file name proposed; the Frankendom inventory file was not read in this pass). This is the same module as the Dawn-of-Light note: the stack-move rule and the refuse-before-write order go into the one move function there.
- Parity row 18 (loot roll and XP award): the stack merge is what a loot bundle does when it fills existing stacks, and the equip gate is what an award into a worn slot must pass. Closest row; no inventory row exists in the checklist.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: Frankendom ruling "one ledger" (one place that changes items, refusals before writes); licence rule 7 (GPL-3.0 read from the header and LICENSE.md; shape only)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect D1, attune and material before the gate (`zone/inventory.cpp` 2079-2096): for an equipment destination the donor sets `SetAttuned(true)` (2081) and `SetMaterial` (2092) before `m_inv.SwapItem` checks race, class, deity and level (2096). A refused equip (for example a class that cannot use the item) still leaves the item attuned in memory and the visible material changed; the attune is saved with the next save of that item (the save path was not traced), and the material is only put back if the resync at `SwapItemResync` (2238, not read) does it. fix: run the gate first, then attune and set material, as `equipSwap` does.
- Defect D2, loot pickup reports false after a partial placement (`zone/inventory.cpp` 1185 and 1266): `TryStacking` moves charges into existing stacks (`MoveItemCharges`, 1182) and then returns the result of a recursive `AutoPutLootInInventory`. When no free slot remains, the recursive call returns false, so the whole pickup reports failure although part of the bundle is already in a stack. The donor's caller in `zone/loot.cpp` was not read, so it is not known whether the remainder is left on the corpse correctly. fix: return the count placed and the remainder, and let the award pay out exactly what landed.
- Pattern not adopted, per item and per row: `PutItemInInventory` (1054-1077) and `PutLootInInventory` (1083) write one row per item and recalculate bonuses per item. There is no batch. The Dawn-of-Light note has the batching pattern (BeginChanges and CommitChanges). fix: one write and one stats recalculation per action.
- Gap: `HasSpaceForItem` (485-586) is a correct stack-first capacity check, but grep finds no zone caller (only the Lua and Perl bindings). Loot pickup therefore places item by item, and a bundle is not all-or-nothing. Frankendom's award should call a precheck like this one before it writes anything.
- Ruling check, server-verified: the donor checks the banker's distance on the server (1740), which matches the rulings. Its response is to kick the client for "Inventory desync" (1751). fix: refuse the move with a message and no kick, except for a proven exploit.
- Ruling check, one ledger: the gate lives in two layers (the zone's attune and material writes, and `InventoryProfile::SwapItem`). Reordering the zone calls can bypass the gate. fix: one move function in Frankendom that runs every gate before any visible write.
- Ruling check, zones as data: the stack sizes and the bank size come from item and character data (rows 20-21), not zone fields. Frankendom should keep them out of zone data.
- Phone presentation: `SendLootItemInPacket` (1549-1551) only sends the item packet to the client; the loot and bag window is the EverQuest client's UI. No phone layout exists in this donor.
- Not read, so not claimed: the trade, trader-satchel and tradeskill branches (1831-2018, 2107-2211), `SwapItemResync` (2238), the loot caller in `zone/loot.cpp`, the bodies of `SetMaterial`, `SetAttuned` and `database.SaveInventory`, and the RoF2 numeric slot values.
