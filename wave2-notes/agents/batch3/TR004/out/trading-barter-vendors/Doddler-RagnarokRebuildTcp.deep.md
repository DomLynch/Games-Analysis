# Doddler-RagnarokRebuildTcp (trading-barter-vendors, cell 2)

Donor: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/Npcs/NpcInteractionState.cs` (with `Npc.cs`, `Items/CharacterBag.cs`, `Npcs/NpcTradeItem.cs`, `Networking/PacketHandlers/NPCPackets/PacketOnNpcTrade.cs`, `PacketShopBuySell.cs`; data in `GameConfig/ServerData/`) | Licence: custom non-commercial licence in `license.txt` (not an OSI licence; it allows use and modification but forbids any commercial use, including running a server that takes donations or sells in-game rewards). Class: restricted, shape only | C# | symbol `NpcInteractionState.FinalizeItemTrade`

Checked: Read in full: `NpcInteractionState.cs` 364-381 (StartItemTrade) and 383-527 (FinalizeItemTrade, the barter pipeline), `NpcTradeItem.cs` 1-81, `PacketShopBuySell.cs` 1-66, `Npc.cs` 706-846 (SubmitPlayerPurchaseFromNpc and SubmitPlayerSellItemsToNpc) and 848-889 (SellItem by name and by name with price, including the load-time profit guard), `CharacterBag.cs` 60-125 (partial) and 175-215 (RemoveItemByBagId), `license.txt` (first paragraph). Read in part: `PacketOnNpcTrade.cs` 1-60 (rest of the handler not read), `NpcInteractionState.cs` 529-625 (helpers), `Npc.cs` 1464-1490 (crafted and traded item helpers), `MilestoneEvent.txt` 87-108 (read through grep output, not opened in the file), `PronteraShop.txt` 1-12. Not read: `CommandBuilder.SendNpcBeginTrading` and the client side, what `ItemReference.UniqueItem` does for a stackable item (line 443 assumes it is safe), the network layer's handling of thrown exceptions, the vending (player shop) path (PacketVending*), the rest of `CharacterBag.cs`. Donor has no `.git`; history is `PatchNotes.txt` only (section 7). Confidence: high on the barter order of operations and on the discount defect (arithmetic checked by hand against ItemsUsable.csv); medium on whether any shipped recipe triggers the duplicate-requirement defect (only the lines in MilestoneEvent.txt 87-108 were seen; the macros take `%socket` as a requirement, so a call site that passes Iron or Resin as the socket item would repeat an input). Camera: not applicable.

Best transferable idea: A barter is one recipe row (inputs as item id plus count, a zeny price, one result); the server validates every input and the price before it removes anything, then consumes and grants in one pass, and a unique input is taken by its own bag id so the exact piece changes hands.

Decision (proposed): adapt - keep the validate-everything-then-apply order and the exact-piece rule for unique inputs; change the recipe from a script macro into a data row, sum stackable inputs per item before checking them, check every removal result, and clamp the per-unit shop price at zero (the donor's shop discount is broken; see section 6).

Acceptance: Server test: a recipe needs 3 Iron, 1 Blade (unique) and 500 zeny for one Sword; a player with 5 Iron, 1 Blade and 600 zeny gets the Sword, and 3 Iron, the Blade and 500 zeny are removed in one settle. With 2 Iron the trade is refused and nothing is removed. A recipe that names Iron twice (2 + 2) with 3 Iron in the bag is refused, not granted. Player sees: the trade button shows the exact shortfall per input before they confirm.

## 1. Mechanism

- Opening: `StartItemTrade(setName)` looks up a named recipe set on the NPC (`NpcInteractionState.cs` 364-380) and sends it to the client. A recipe set is a `List<NpcTradeItem>` keyed by name (`Npc.cs` 55).
- Confirm: the client sends a recipe index, a count (1-99, `PacketOnNpcTrade.cs` 47), and up to ten bag ids (55). The handler only runs while the player is in the WaitForTrade state (26), then calls `FinalizeItemTrade` (383).
- Order inside `FinalizeItemTrade`, and nothing is removed until the last check passes:
  (a) recipe index must be inside the set (394-399); the result item must have data (402-409);
  (b) a crafted (unique-result) recipe is limited to a count of one (411-416); a unique result cannot be bought in a count above one (418-422);
  (c) zeny: the player must have at least `count * ZenyCost` (424-428);
  (d) each submitted bag id must exist in the bag (436-441), and is mapped to its item type (443);
  (e) requirements: for each `(itemId, count)` (454), the count is multiplied by the trade count (460). A stackable item is checked against the full stack count, one entry at a time (465). A unique item is matched to a submitted bag id of the same type (471-491); an equipped match is noted for unequip (477-481), and a matched id is removed from the pool so it cannot match twice (484-489); no match is an error (494-498);
  (f) leftover submitted bag ids are an error (501-506), so a player cannot slip extra items into the trade.
- Apply, after all checks: equipped inputs are unequipped (508-509); each requirement is removed with `RemoveItemByBagId` (512-516); zeny is dropped by `count * ZenyCost` (518); the result is created, with a fresh GUID for a unique result (519-524); the client gets a TradeSuccess event (525) and the zeny update.
- The bag removal (`CharacterBag.cs` 179-214) subtracts from a stack and deletes it at zero (184-188). A unique piece is removed by bag id and must match the full count (201-202).

## 2. Key functions

- `NpcInteractionState.FinalizeItemTrade`: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/Npcs/NpcInteractionState.cs` 383-527. The barter pipeline: validate, then unequip, remove, drop zeny, grant.
- `NpcInteractionState.StartItemTrade`: same file 364-381. Opens a named recipe set.
- `CharacterBag.RemoveItemByBagId`: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/Items/CharacterBag.cs` 179-214. Stack path 181-192, unique path 199-211.
- `Npc.SubmitPlayerPurchaseFromNpc`: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/Npc.cs` 710-791. Shop buy, with the discount defect at 748.
- `Npc.SubmitPlayerSellItemsToNpc`: same file 793-846. Shop sell, with the overcharge percent at 827.
- `Npc.SellItem(name, price)`: same file 866-889. Load-time guard at 875-878.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Validate every input and the price, then apply once | None (rule) |
| Count per trade | 1 to 99 per packet (PacketOnNpcTrade.cs 47); unique result and unique input: count must be 1 |
| Bag ids per trade | up to 10 (PacketOnNpcTrade.cs 55) |
| Price in zeny per unit | `NpcTradeItem.ZenyCost` (NpcTradeItem.cs 13); total = count times cost |
| Sockets per crafted unique | at most 4 used (NpcTradeItem.cs 73) |
| Shop discount percent | `5 + 2 * skill level`, capped at 24 (Npc.cs 721; cap at 722-723 in the donor copy) |
| Overcharge on sell-back | `5 + 2 * skill level`, capped at 24 (Npc.cs 801-803) |
| Load-time guard on shop sell value | sell-back value must not exceed half the sell price (Npc.cs 875) |
| Item price table | `Price` column of ItemsUsable.csv (header line 1); Apple 512 = 15, Milk 519 = 25 |

## 4. TypeScript sketch

simplified: The sketch follows the donor's order (count and zeny first, then inputs, then unique pieces, then leftovers, then apply) but changes three things on purpose. It sums stackable inputs per item type before checking them (the donor checks each entry alone, which lets two entries for one item pass together; see section 6). It checks that every submitted bag id is in the bag before anything else. It returns a plan and only then mutates, so every removal is decided before any is made; the donor's removals ignore the return value. It omits the client, the sockets and crafted flags, the equipment unequip side effects beyond a list, the weight and bag-slot limits, the fresh-GUID store (the sketch takes a `newUid` function), and the donor's exceptions (it returns a reason instead).

```ts
// Licence: custom non-commercial licence (donor license.txt; restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Requirement { itemId: number; count: number; unique: boolean; }
export interface Recipe { resultId: number; resultUnique: boolean; zenyCost: number; requires: Requirement[]; }
export interface Piece { bagId: number; typeId: number; equipped: boolean; }
export interface Bag { stacks: Map<number, number>; pieces: Map<number, Piece>; zeny: number; } // stacks keyed by item type id, pieces keyed by bag id
export interface Taken { unequip: number[]; takeStacks: [number, number][]; takePieces: number[]; zeny: number; }
export type Plan = { ok: true; taken: Taken } | { ok: false; reason: string };

// Validate everything first; nothing is mutated until the whole plan passes.
export function plan(bag: Bag, recipe: Recipe, times: number, submittedBagIds: number[]): Plan {
  if (times < 1 || times > 99) return { ok: false, reason: "count out of range" };
  if (recipe.resultUnique && times > 1) return { ok: false, reason: "one unique piece per trade" };
  for (const b of submittedBagIds) if (!bag.pieces.has(b)) return { ok: false, reason: "piece not in bag" };
  const zeny = recipe.zenyCost * times;
  if (bag.zeny < zeny) return { ok: false, reason: "not enough zeny" };

  // Fix for the donor's per-entry check: sum stackable requirements per item type first.
  const need = new Map<number, number>();
  for (const r of recipe.requires) {
    if (r.unique) continue;
    need.set(r.itemId, (need.get(r.itemId) ?? 0) + r.count * times);
  }
  for (const [itemId, n] of need) {
    if ((bag.stacks.get(itemId) ?? 0) < n) return { ok: false, reason: "not enough items" };
  }

  // Unique requirements: each needs one distinct submitted piece of that type.
  const pool = [...submittedBagIds];
  const takePieces: number[] = [];
  const unequip: number[] = [];
  for (const r of recipe.requires) {
    if (!r.unique) continue;
    if (times > 1) return { ok: false, reason: "unique input with count above 1" };
    const idx = pool.findIndex((b) => bag.pieces.get(b)?.typeId === r.itemId);
    if (idx < 0) return { ok: false, reason: "missing piece" };
    const bagId = pool[idx];
    pool.splice(idx, 1);
    takePieces.push(bagId);
    if (bag.pieces.get(bagId)?.equipped) unequip.push(bagId);
  }
  if (pool.length > 0) return { ok: false, reason: "extra pieces submitted" }; // refuse rather than take them

  return { ok: true, taken: { unequip, takeStacks: [...need.entries()], takePieces, zeny } };
}

// Apply a passed plan in one step. newUid mints the bag id of a unique result (donor: fresh GUID).
export function apply(bag: Bag, recipe: Recipe, times: number, taken: Taken, newUid: () => number): number {
  for (const b of taken.unequip) {
    const p = bag.pieces.get(b);
    if (p) p.equipped = false;
  }
  for (const [itemId, n] of taken.takeStacks) {
    const left = (bag.stacks.get(itemId) ?? 0) - n;
    if (left > 0) bag.stacks.set(itemId, left);
    else bag.stacks.delete(itemId);
  }
  for (const b of taken.takePieces) bag.pieces.delete(b);
  bag.zeny -= taken.zeny;
  if (recipe.resultUnique) {
    const bagId = newUid();
    bag.pieces.set(bagId, { bagId, typeId: recipe.resultId, equipped: false });
    return bagId;
  }
  bag.stacks.set(recipe.resultId, (bag.stacks.get(recipe.resultId) ?? 0) + times);
  return -1;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp) exited 0.

## 5. Lands in

- TARGET `origins/server/npc-barter.ts` (new module; the Frankendom NPC trade code was not read in this pass, so "new" is unverified). The apply step writes ledger rows through `settle()`: one row per consumed input and one for the result, and one for the zeny (or the Frankendom currency).
- Parity row: 18 (loot roll and XP award; item ownership), the nearest row. No parity row 1-22 covers NPC barter. Ruling needed (section 7).
- Reuse tag: rewrite-from-idea (custom non-commercial licence; restricted, clean-room only)
- Brief rule served: one ledger (settle() is the only door; barter is item rows plus a currency row); server-verified (the server does every check, the client only shows the shortfall).

## 6. Gaps and risks

- Restricted licence: clean-room only. The sketch is written from the mechanism.
- Donor defect 1, duplicate stackable inputs (latent): each stackable requirement is checked against the full stack on its own (465), and the removal loop ignores the return value of `RemoveItemByBagId` (514). If one recipe names the same stackable item twice, both entries pass the check; the first removal may empty the stack and the second returns false, so the player is charged less than the recipe says. Worked example from the code: a stack of 7 and two entries of 5 leaves 2 after the first removal, and the second removal deletes the stack with count 2 and reports success (CharacterBag.cs 184-188). Fix: sum per item before checking (the sketch does this), and check every removal result (the sketch computes the plan first, so it cannot half-apply). The `MilestoneEvent.txt` recipes (87-108) do not repeat an item name except through the socket macro argument, which could coincide with another requirement; not checked for every call site.
- Donor defect 2, shop discount uses the item id, not the price (serious, present in this copy): `var dcValue = saleEntry.id * discount / 100;` (Npc.cs 748). `ItemsForSale` is a list of (item id, price) (Npc.cs 54 and 857), so `saleEntry.id` is the item id. The unit cost becomes `price - itemId * discount / 100`. Worked numbers from the data: Apple (id 512, price 15) at discount 7 (skill level 1) gives 512*7/100 = 35, so the unit cost is 15 - 35 = -20, and each Apple bought pays the player 20 zeny; at the 24 cap, 512*24/100 = 122, so the unit cost is -107. Milk (id 519, price 25) gives -11 at 7 and -99 at 24. The total is not checked for a negative value (754), and zeny is set to `zeny - totalCost` (776), so a negative total credits zeny. The discount is on by default for trader NPCs (NpcTraderBase.cs 19 calls `OpenShop()` with the default true). Fix: `dcValue = saleEntry.price * discount / 100`, clamp the unit price at zero, and refuse a negative total. The load-time guard (875) checks only the list price when a shop entry is added, not the discounted buy price at purchase time, so the runtime discount can push the buy price below the margin that guard protects.
- Donor defect 3, early return in the shop buy packet: `if (itemCounts[i] <= 0) return;` (PacketShopBuySell.cs 51-52) returns before the rented pool arrays are given back. Harmless to the economy; a leak. Fix: return the arrays on every exit.
- Donor behaviour, unique input with trade count above 1: `FinalizeItemTrade` throws an Exception (NpcInteractionState.cs 458-459); it does not refuse quietly. What the packet layer does with the throw was not read (see below). The sketch returns a reason instead.
- Donor sloppiness, unequip loop: the apply step loops to `equippedItems.Length` (the stackalloc is sized `ItemRequirements.Count`, 508-509), not `equipCount`, so stale zero slots call `UnEquipItem(0)`; harmless because the lookup fails, but the loop should run to the count. The sketch's `unequip` list has exactly the used entries.
- Donor gap, no bag check on the result: a unique-result trade calls `CreateItemInInventory` (519-524) without re-checking bag weight or slots, unlike the shop buy path (Npc.cs 760-773). Frankendom should check capacity in the plan step.
- Donor risk, exception on bad packet: `PacketOnNpcTrade` throws when the bag-id count is above 10 (55-56), and the shop packet throws above 20 items (35-36). How the network layer handles the throw was not read; Frankendom should refuse, not throw.
- Donor risk, unchecked assumption: `resolvedBagItemTypes[i] = item.UniqueItem.Id;` (443) assumes a bag-id lookup returns a unique item; `GetItem` (CharacterBag.cs 99-115) also returns stackable items keyed by item type id. Not verified what happens when a stackable type id is submitted.
- Trade rule to keep: taking an equipped unique input unequips it first (508-509), and the donor does this after all checks pass. Keep that order.
- Not a barter, but the same donor: the player-to-player trade does not exist in this copy (no exchange or trade-with-player packet found by grep). Do not borrow a two-sided trade pattern from this donor; use the AzerothCore note for that.

## 7. Pass-2 additions

**As-data shape**
- Recipe row (in memory, `NpcTradeItem.cs` 9-17): `ItemId` int; `Sockets` list of int (up to 4 used, clamped at 73); `ZenyCost` int (13); `TradeCount` int (default 1); `ItemRequirements` list of (int item id, int count) (15); `IsCrafted` bool; `CombinedItem` ItemReference (17). Stored per NPC as `TradeItemSets`, a dictionary from set name to list (Npc.cs 55; filled by the helper at 1483-1489).
- Source of recipes: a script macro per recipe family (`macro Main_Gauche(%stone, %socket, %count) { AddItemToTradeSet(...); }`, MilestoneEvent.txt 87; the same shape for lines 88-108), with %-parameters filled in at each call site. Inside the macro the call is `AddItemToTradeSet("Daggers", CreateCraftedItem("Main_Gauche").Socket(%stone).Requires(%socket, %count).Requires("Resin", 25).Requires("Iron", 8).Costs(2000))` The recipe is script text with macro parameters, not a table.
- A new barter recipe is one macro call (or one macro definition for a new family) with no code change (this is the designers' path); but it is not a table row, so a tool cannot list or validate it without parsing script. For Frankendom the recipe must be a CSV or JSON row.
- Item price: `Price` column of `ItemsUsable.csv` (header row 1; Apple row 13, Milk row 20). Shop stock: a `Trader(...) { SellItem("Apple"); }` block (PronteraShop.txt 7-8), so a new shop line is one `SellItem` line (yes, a row in script text).
- Vending (player shops) has its own packets and was not read.

**Provenance per claim**
- Repo: Doddler-RagnarokRebuildTcp on the VPS; every claim has a file and line in receipts.tsv (verified). Licence: `license.txt`, non-commercial; restricted; shape only.

**What they patched later** (from `GameConfig/ServerData/Config/PatchNotes.txt`; no git history in the copy)
- 2025-08-10 update (heading at line 82): "Fixed npc trades consuming multiple sets of items, but only giving you one item in return." (line 85). So a multi-count barter once consumed several sets of inputs and gave one item back. The fix itself is not visible in this copy; the current code multiplies inputs by the count (460) and grants count times the result (523), and the sketch keeps that rule and checks it before the apply.
- 2025-08-11 update (heading at line 66): "Fixed your weight not decreasing when an equipment item is consumed via trade or refine." (line 69). A removal path forgot the weight; the sketch has no weight, so the lesson is to subtract weight in the same apply step.
- 2025-08-09 update (heading at line 101): "You can no longer soft lock your character by closing a vend shop with the ESC key." (line 119). Player vending, not read in code.
- No patch note mentions the shop discount, the overcharge, or the duplicate-input check. The discount defect (section 6) is present in the copy as it stands.

**Rulings for Dom**
1. Should a barter ever take an unequipped copy of a unique item the player also wears? Recommendation: no; the player must unequip first, as the donor does.
2. Should NPC shop discounts apply to the zeny price only, with the unit price floored at zero? Recommendation: yes; the donor bug shows a negative unit price must never be possible.
3. Should recipes be CSV or JSON rows that a tool can validate (no duplicate inputs, price above zero), instead of script lines? Recommendation: yes; the donor keeps them as script text, which is why its duplicate-input and discount defects are hard to see.

Reuse tag and brief rule are in section 5.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- MilestoneEvent.txt 87-108 are macro definitions with %-parameters, not one plain script line per recipe (confirmed).
- Unique input with count above 1 throws an Exception (NpcInteractionState.cs 458-459), not a refusal (confirmed).
- TradeItemSets is filled at Npc.cs 1483-1489, not "1480" (confirmed).
- Missed: unequip loop runs to equippedItems.Length not equipCount (508-509); unique-result trade has no bag weight/slot re-check (519-524) (both confirmed).

Fixed 2026-10-12: recipe source description (macros), Npc.cs line range, exception wording, added the unequip-loop and no-capacity-check defects as short lines. No sketch change.
