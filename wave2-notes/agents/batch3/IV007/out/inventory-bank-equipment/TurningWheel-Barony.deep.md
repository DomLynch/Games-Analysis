# TurningWheel-Barony (inventory-bank-equipment, cell 2)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` | Licence: BSD 2-Clause (`/mnt/frankendom-donors/TurningWheel-Barony/LICENSE.txt` line 3: "This open source release of Barony is licensed under the BSD 2-Clause License:") | C++ | symbol `getItemStackingBehaviorIndividualItemCheck` (with `getItemStackingBehavior`, `getItemEmptySlotStackingBehavior`, `Item::getMaxStackLimit`, `Item::shouldItemStack`, `itemCompare`, `itemPickup`)

Checked: Read in full: items.cpp 1442-1525 (itemCompare), 4102-4127 (getMaxStackLimit), 4129-4234 (single-merge planner), 4236-4248 (empty-slot split), 4376-4440 (bag scan and new-stack fallthrough), 6858-6942 (shouldItemStack); items.cpp 3857-4080 (itemPickup, read in two parts, its end at about 4080-4100 not read in full); items.hpp 900-921 and 959-962. Read in part: interface/playerinventory.cpp 3170-3230 (hotbar drop, the caller); items.cpp 7712-7740 (unique appearance, head only). Grep only: callers of the planners (getItemStackingBehavior at 4388/4402 and getItemStackingBehaviorIntoChest at 4279/4293; the other UI callers of getItemEmptySlotStackingBehavior at playerinventory.cpp 2876, 3090, 3959 were not opened). Not read: takeItemFromChest body (playerinventory.cpp 2361, head only), addItemToChestServer body (actchest.cpp 1955), equipItem (items.cpp 2328), dropItem (items.cpp 1779), the remaining 12,000 lines of playerinventory.cpp, and any touch or phone UI. Confidence: high on the stacking planner (read end to end); medium on the commit side (not read). camera_scope not applicable (not a camera cell).

Best transferable idea: Plan a stack merge as a pure function that returns the new counts for both sides (cap, overflow split, first bag slot that takes any of it), then commit only the planned amount, so pickup, drag and chest share one rule.
Decision (proposed): adapt — take the plan-then-commit stacking rule with overflow split and per-class caps; the donor's duplicated inline copy in pickup and its hard-coded caps are not kept (see section 6).
Acceptance: A player drags 10 arrows onto a quiver stack of 45 with a 50 cap: the stack reads 50, 5 stay in hand, and a 60-count drag into a full bag with no free slot changes nothing; a server test asserts that moveIntoBag on a source of 10 into a bag holding one stack of 45 (limit 50), with 0 free slots, returns 5 and leaves the stack at 50 and the source at 5.

## 1. Mechanism

- Two parts. (a) A planner answers, for one candidate stack, what happens and the new counts for both sides, and changes nothing: `getItemStackingBehaviorIndividualItemCheck` (items.cpp 4129). (b) A bag scan offers the item to each stack in bag order and takes the first stack that accepts any of it (`getItemStackingBehavior`, scan loop at items.cpp 4395-4425; a non-accepting result is skipped). If no stack accepts, the item starts a new stack of up to its limit (fallthrough at items.cpp 4427-4437).
- Order of steps inside the planner, for one candidate (items.cpp 4129-4234):
  1. If the two items differ even ignoring appearance, the result is "not same" and nothing moves (the final fallthrough, 4230-4233).
  2. Quiver or thrown-ball destination, or scrap destination, with total count at or above its class cap (51 for quiver/thrown ball, 101 for scrap; items.cpp 4141-4143): the destination is full if its count is at least the cap minus one (4151). Otherwise the destination is set to cap minus one and the source keeps the rest (4163-4165).
  3. Otherwise, if the destination stacks at all (`shouldItemStack`): limit = `getMaxStackLimit` (4183). Destination full if its count is at least the limit (4186). If the total is over the limit, destination = limit and source keeps total minus limit (4198-4199). Otherwise everything merges: source 0, destination the total (4215-4216).
  4. Otherwise, if the items are identical including appearance but the destination does not stack, the result is "destination full" (4226).
- Commit is separate. The hotbar drop (playerinventory.cpp 3188) asks the planner, computes `amountToPlace = selectedItem->count - oldItemQty` (3194), refuses a new stack when the bag has no free slot (3209, message "no room"), and only then calls `takeItemFromChest` with the planned amount (3203 merge, 3216 new stack).
- Checked the rule's numbers: getMaxStackLimit (items.cpp 4102-4127) returns 1 for an item that does not stack (4103-4105), 100 by default (4108), cap minus one for thrown balls and quivers (4111, 4119), 9 for thrown weapons and gems (4115), and cap minus one for scrap (4123). A stack therefore holds at most 50 quivers, 9 gems or thrown weapons, or 100 scrap.
- Who may stack: `shouldItemStack` (items.cpp 6858) lets a non-equipped item stack unless it is armour, a weapon, a staff, a ring, an amulet or a spellbook (the list is in the code); thrown items, gems, potions and most tools stack even when equipped (comment at items.cpp 6897); ammo stops at count 50, scrap at 100, and an item attribute "no_stack" (read from item data, 6934) turns stacking off.
- What counts as the same item (`itemCompare`, items.cpp 1442-1525): type, status (not for thrown items and quivers), beatitude, then the model (index plus appearance modulo the variation count), then non-stacking kinds when the stacking flag is set (scrolls-mail, books, spells, tome spells, and the loot bag, items.cpp 1492-1496 return "do not stack"), identified flag, unidentified scroll label, and appearance only when asked. Identical returns 0.
- Pickup repeats the same rules inline (`itemPickup`, items.cpp 3857-4080). A forced new stack (`forceNewStack`) never merges and records the appearances it must avoid; the new item then gets a unique appearance (`itemFindUniqueAppearance` at 4060; its try loop is `int tries = 100;` at 7719, head only read). Pickup also stamps the owner (items.cpp 3901) unless the owner is on the player's achievement list (3889-3899).
- Tick: none. Every step is synchronous, one call per pickup or drop. No per-frame loop is involved.

## 2. Key functions

- `getItemStackingBehaviorIndividualItemCheck`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 4129-4234. One merge of one item into one candidate stack. Reads only. Call sites checked by grep: 4388 and 4402 (inside getItemStackingBehavior), 4279 and 4293 (inside getItemStackingBehaviorIntoChest). I read the scan loops at 4395-4425 and 4253-4300 region only as far as the call sites.
- `getItemStackingBehavior`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 4376-4440. Bag scan over `stats[player]->inventory` (4395), first accepting stack wins, else the new-stack split (4427-4437). Called by the hotbar drop (playerinventory.cpp 3188). The other UI callers were not opened.
- `getItemEmptySlotStackingBehavior`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 4236-4248. The split of an item into a fresh stack: keeps the remainder above the limit on the source (4241), the limit on the new stack.
- `Item::getMaxStackLimit`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 4102-4127. Per-class limit, the only place the limits are chosen.
- `Item::shouldItemStack`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 6858-6940. Whether the item may stack at all, and at what count the ammo, scrap and gem limits stop it.
- `itemCompare`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 1442-1520. The identity test (0 = identical).
- `itemPickup`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 3857-4080. Pickup loop with an inline copy of the planner rules, owner stamp at 3901.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Plan a merge: same item? full? split at the cap? merge all? | None (the comparison) |
| Quiver/thrown-ball/scrap split rule (cap minus one held per stack) | Quiver cap 51 (theirs, items.hpp 960); scrap cap 101 (theirs, items.hpp 961); stack limit = cap minus one (theirs, items.cpp 4111, 4119, 4123) |
| Default stack limit | 100 (theirs, items.cpp 4108) |
| Thrown weapon and gem limit | 9 (theirs, items.hpp 962; used at items.cpp 4115) |
| Non-stackable item holds exactly one | 1 (theirs, items.cpp 4105) |
| Bag scan, first stack that accepts | Bag order (theirs, the node list, items.cpp 4395) |
| Commit only if the bag has a free slot for a new stack | Free-slot test (theirs, playerinventory.cpp 3209) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (same key, then stackable, then full, then split or merge all; then bag scan; then new stack; then free-slot gate). It omits and folds: the appearance-modulo-model test (the key stands for type, status, beatitude and model); the separate quiver and scrap branches (one limit does the same split, since a quiver limit of 50 is the donor's cap of 51 minus one); the thrown-ball and gem limits; the unique-appearance re-roll; the magic-duck hotbar update; the multiplayer packets; the scroll labels; the `no_stack` attribute; the non-stacking kinds in itemCompare (books, spells, loot bag), which the sketch folds into the `stackable` flag; and the donor's unreachable "remainder <= 0" guards in both split branches. The free-slot gate sits inside the commit function instead of the UI. The `export {};` line is appended only so the file is a module for the typecheck.

```ts
// Licence: BSD-2-Clause (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Outcome = "not-same" | "dest-full" | "merged-all" | "merged-part" | "new-stack";

interface Stack {
  key: string;        // type + status + beatitude + model, compared before appearance
  appearance: number; // compared only where the donor asks for it
  count: number;
  stackable: boolean; // donor: Item::shouldItemStack
  limit: number;      // donor: Item::getMaxStackLimit (1 when the item does not stack)
}

interface Plan {
  outcome: Outcome;
  srcAfter: number;   // count the moving stack keeps
  dstAfter: number;   // count the destination stack becomes (new stack: the amount it takes)
}

// One merge of src into dst. Reads only; nothing is changed.
function planMerge(src: Stack, dst: Stack): Plan {
  const keep = (o: Outcome): Plan => ({ outcome: o, srcAfter: src.count, dstAfter: dst.count });
  if (src.key !== dst.key) return keep("not-same");
  if (!dst.stackable) return keep(src.appearance === dst.appearance ? "dest-full" : "not-same");
  if (dst.count >= dst.limit) return keep("dest-full");
  const total = src.count + dst.count;
  if (total > dst.limit) {
    return { outcome: "merged-part", srcAfter: total - dst.limit, dstAfter: dst.limit };
  }
  return { outcome: "merged-all", srcAfter: 0, dstAfter: total };
}

// Bag scan in slot order: the first stack that accepts any of the item wins.
// If none does, the item needs a new stack and takes up to its limit.
function planIntoBag(src: Stack, bag: Stack[]): { plan: Plan; into: number } {
  for (let i = 0; i < bag.length; i++) {
    const p = planMerge(src, bag[i]);
    if (p.outcome === "not-same" || p.outcome === "dest-full") continue;
    return { plan: p, into: i };
  }
  const taken = Math.min(src.count, src.limit);
  return { plan: { outcome: "new-stack", srcAfter: src.count - taken, dstAfter: taken }, into: -1 };
}

// The only mutation. Returns how many moved; 0 means nothing changed.
function moveIntoBag(src: Stack, bag: Stack[], freeSlots: number): number {
  const { plan, into } = planIntoBag(src, bag);
  const moved = src.count - plan.srcAfter;
  if (moved <= 0) return 0;
  if (plan.outcome === "new-stack" && freeSlots <= 0) return 0; // no room: nothing changes
  if (into >= 0) bag[into].count = plan.dstAfter;
  else bag.push({ ...src, count: plan.dstAfter });
  src.count = plan.srcAfter;
  return moved;
}

export {};
```

Checked by running the sketch on the VPS (compiled to JS, then five asserts): split 10 into 45 with limit 50 gives moved 5, source 5, destination 50; a full stack at 50 is skipped and 10 go to the next stack (20 becomes 30); a 60-count item with no free slot and no stack moves nothing; a 60-count item with one free slot starts a new stack of 50 and keeps 10; a non-stackable item (limit 1) with an identical non-stackable item in the bag and one free slot moves 1 into a new stack and leaves 0. Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed name; the Frankendom repo was not checked for it). One planner for pickup, drag and any chest or stash move, so every move goes through one ledger.
- Parity-checklist row 18 (loot roll and XP award). The pickup and stacking step is the award side of row 18, not the roll.
- Reuse tag: adapt-allowed (BSD-2-Clause; the sketch is clean-room)
- Brief rule served: 1 (one ledger: one planner for every move); rules 7-9 n/a

## 6. Gaps and risks

- Defect 1, duplicated rules: `itemPickup` (items.cpp 3857-4080) repeats the planner's branches inline instead of calling it. The two copies must agree by hand. fix: one planner function; pickup, drag and chest all call it (the sketch's `planIntoBag`).
- Defect 2, constants: the caps are file-level constants (items.hpp 960-962) and the default 100 is written inline (items.cpp 4108); the planner also repeats cap-minus-one arithmetic in two places (4111, 4119, 4123, 4151). Off-by-one risk. fix: store one max-stack per item class in the catalogue and derive "full" from it only. The donor's values are not kept as constants.
- Defect 3, dead variant: `getItemStackingBehaviorIntoChest` (items.cpp 4251) has no caller in the donor's *.cpp or *.hpp files (grep). It also holds a commented-out slot-order alternative. fix: do not port it; the chest path is `addItemToChest` (actchest.cpp 1351).
- The commit is not verified: `takeItemFromChest` (playerinventory.cpp 2361) and `addItemToChestServer` (actchest.cpp 1955) were not read past their heads, so whether a commit can fail half way is unknown. The chest request is a client message ("CITM", actchest.cpp 1365) that the server handles; the server's check was not read. Frankendom must make the server validate every move (one ledger), not trust the client.
- Frankendom has one ledger, the donor has a per-player node list (`stats[player]->inventory`). Frankendom's loot pickup must run on the server (kills are server-verified); the client only previews the plan.
- Phone: nothing in this donor is a touch UI. playerinventory.cpp is a 12,582-line mouse and controller UI; only its hotbar drop was read. Loot ceremony, rarity colour and phone inspect are (not read) and not claimed here.
- Ammo and loot bags: the loot bag (TOOL_PLAYER_LOOT_BAG) never stacks (items.cpp 1492-1496), so each bag is its own stack. Frankendom's drop bag should follow the same rule and say so in the catalogue.
- Equip and drop were not read (items.cpp 2328, 1779). The paper-doll equip path is out of this note.
- Donor licence is BSD-2-Clause, so adapting the idea is allowed; the sketch is still written from the mechanism.

Reuse tag: adapt-allowed (BSD-2-Clause)
Brief rule served: 1 (one ledger: one planner for every move); rules 7-9 n/a
