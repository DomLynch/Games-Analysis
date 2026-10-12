# l1j-en-classic (trading-barter-vendors, cell 3)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Trade.java` (with `clientpackets/C_Trade.java`, `C_TradeAddItem.java`, `C_TradeOK.java`, `C_TradeCancel.java`, `C_Attr.java` case 252, `model/L1Inventory.java` tradeItem and storeTradeItem, `model/L1CheckPcItem.java`, `network/Client.java` quit path) | Licence: GPL-2.0-or-later (`COPYING` is GNU GPL version 2, June 1991; the `L1Trade.java` header says "either version 2, or (at your option) any later version") | Java | symbol `L1Trade.TradeOK` (settle) and `C_TradeAddItem` (offer)

Checked: Read in full: `L1Trade.java` (189 lines: TradeAddItem 50-80, TradeOK 82-154, TradeCancel 156-189), `C_TradeOK.java` (60 lines), `C_TradeAddItem.java` (144 lines, read at the top level; the cheat check body in `L1CheckPcItem.java` 39-60 read, the category queries 61-138 read in part), `C_Trade.java` (52 lines), `C_TradeCancel.java` (43 lines), `C_Attr.java` case 252 (195-224), `Client.java` quit path (144-154), `L1Inventory.java` tradeItem (302-351), checkAddItem (74-99), storeTradeItem (187-205). Callers: `setTradeOk` callers checked by grep across the source (only L1Trade.java 61-62, 147-148, 183-184, C_TradeOK 40, 42, C_TradeAddItem 123). `getTradeWindowInventory` callers checked by grep (only L1Trade.java). Not read: the NPC merchant and private shop paths (`C_Shop`, `L1MerchantInstance`), the `Config` values (`MAX_NPC_ITEM`, `AUTO_BAN`), `Account.ban`, the log classes' storage, the `L1ItemInstance` fields beyond those used. No `.git` in the copy; history is code comments (section 7). Confidence: high on the offer, confirm and settle order and on the confirm-lock gap (each claim traced to a line); medium on the failed-transfer path (reachable only through early null returns, as read). Camera: not applicable.

Best transferable idea: Escrow by move: an offered stack leaves its owner's bag the moment it is offered, so it cannot be spent during the trade; a cancel of any kind, including a disconnect, returns it.

Decision (proposed): adapt - keep escrow-by-move and the cancel-on-quit rule; fix the donor's gaps: any offer change clears both confirmations (the donor lets the partner change the deal after the other side has confirmed), a range check at confirm and a cancel out of range (the donor has none after the window opens), room reserved at offer time and checked again per receiver before any move (the donor checks only the current size), and no automatic ban on a count mismatch (log and cancel instead). Reject the per-player side inventory as the escrow store: the escrow lives inside the trade object, so the one-ledger rule holds.

Acceptance: Server test: A offers a sword and confirms; B adds 10 gold; A's confirm clears and A's client shows back-to-trade; B cannot settle a deal A has not re-confirmed. While the sword is offered, A's bag does not list it. Second test: the two players walk 15 tiles apart before the second confirm, so the trade cancels and the sword returns to A's bag. Player sees the confirm tick drop on both windows when either side changes an offer.

## 1. Mechanism

- Opening: `C_Trade` (40-43) requires the target to be adjacent (`FaceToFace.faceToFace`) and not already in a trade; it sets both trade ids at once and sends the target a yes/no prompt (type 252). The target's answer is handled in `C_Attr` case 252 (195-224): if the facing check fails at answer time (204), or the answer is no (212-217), both trade ids are cleared; a yes sends the trade window to both (218-222).
- Offer: `C_TradeAddItem` (the client sends item object id and count) runs these checks, in order: the sender must be online (55-66: an offline sender is treated as a dupe exploit and disconnected); the item must exist and the count must be valid (67-69: a count above the held count, a non-stackable count other than 1, or a count of 0 or less, or a count above 2000000000, triggers an autoban call when `Config.AUTO_BAN` is set, then disconnect, 69-82); a cheat check by item category (89; a flagged stack is deleted from the player's bag by `checkPcItem` (`pc.getInventory().removeItem`, L1CheckPcItem 58): this is destruction as anti-cheat, see defect 8); the item must be tradable (96) and not sealed (bless 128 or more, 101); a pet item is refused (the pet loop); the sender must not already have confirmed (123); the partner's bag must have room for the stack (127, `checkAddItem`: item count, size, weight and stack amount against the partner's current contents, not counting stacks the sender has already offered). Then `L1Trade.TradeAddItem` (50-80) moves the stack into the trade window with `tradeItem` (67): this is escrow by move. A count above the held count sends both sides a cancel status and clears both trade ids (58-64), but it never calls `TradeCancel`, so stacks already in the windows are not returned (defect 7).
- Confirm: `C_TradeOK` (40-46) sets the sender's confirmation, and when both are set it checks that both inventories have fewer than 164 items (43-44, `180 - 16`), then calls `L1Trade.TradeOK`; if a side is full, both get message 263 and the trade is cancelled (48-51).
- Settle: `L1Trade.TradeOK` (82-154): for each side, the loop runs once per item in the window and always reads index 0 (96-97 for the sender, the mirror loop for the partner); each item is moved to the other side's inventory with `tradeItem` (100-102), and a null result logs a warning and continues (104); after both loops both sides get the "complete" status (145) and both confirmations and trade ids are cleared (147-150).
- Cancel: `L1Trade.TradeCancel` (156-189) moves every window item back to its owner's inventory and sends the cancel status to both sides. The disconnect path calls it first when a trade id is set (`Client.java` 145-149): "First cancel trade & save inventory to help avoid duping".
- No tick: the whole trade is packet-driven. There is no range check after the window opens: `C_Attr` checks facing only at the answer (204), and `C_TradeAddItem`, `C_TradeOK` and `L1Trade` do not check distance at all.

## 2. Key functions

- `L1Trade.TradeAddItem`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Trade.java` 50-80. Escrow by move with the invalid-count cancel.
- `L1Trade.TradeOK`: same file 82-154. Settle loops, the complete status and the cleanup.
- `L1Trade.TradeCancel`: same file 156-189. Return of escrow to owners.
- `C_TradeAddItem` constructor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_TradeAddItem.java` 54-137. The offer checks in order.
- `C_TradeOK` constructor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_TradeOK.java` 40-51. Confirm and capacity pre-check.
- `L1Inventory.tradeItem` (move between inventories): `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Inventory.java` 308-351. Validation 310-321, split with a new instance 325-340, store 350.
- `L1CheckPcItem.checkPcItem`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1CheckPcItem.java` 39-60. Category checks against the item tables.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Escrow by move (offered stack leaves the owner's bag) | None (rule) |
| Confirm pre-check on both sides' item counts | 164 items per side (`180 - 16`, C_TradeOK.java 43-44) |
| Adena cap per stack | 2000000000 (L1Inventory.java 44 `MAX_AMOUNT`; L1CheckPcItem.java 50) |
| Non-stackable items | count must be 1 (C_TradeAddItem.java 69; L1CheckPcItem.java 44) |
| Stackable cap (non-adena) | 1000000000 by the cheat check (L1CheckPcItem.java body, read in part) |
| Weight cap | `MAX_WEIGHT` = 1500 (L1Inventory.java 45), scaled by `RATE_WEIGHT_LIMIT_PET` |
| Sealed item threshold | bless value 128 or more (C_TradeAddItem.java 101) |
| Adena item id | 40308 (L1ItemId.java 87) |
| Max inventory items | `Config.MAX_NPC_ITEM` (config value not read) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's escrow by move and the cancel that returns every escrowed stack, and adds the three fixes from section 6 in the sketch: any offer change clears both confirmations (the donor lets the partner change the deal), the settle re-checks range and each receiver's room before any move (the donor has no range check after open and checks capacity only at offer time), and room is reserved per offered stack at offer time (the donor's check counts the current size only). It differs on purpose in one more place: the escrow is a map inside the trade object, not the donor's per-player trade inventory, so the one-ledger rule holds. It omits the donor's pet and sealed checks (kept as flags only), the stackable merge into an existing partner stack (the sketch reserves one slot per offered stack, which is conservative), the cheat check and category tables, the logs and the autoban, and the NPC and private shop paths. `settle` returns ledger rows that a real build writes through `settle()`.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Item { objectId: number; itemId: number; count: number; stackable: boolean; bound: boolean; tradable: boolean; }
export interface Bag { items: Map<number, Item>; capacity: number; }
export interface Escrow { from: string; item: Item; }
export interface Trade { a: string; b: string; open: boolean; escrow: Map<number, Escrow>; confirmed: Map<string, boolean>; }
export interface Row { from: string; to: string; objectId: number; itemId: number; count: number; }
export interface World {
  bag(owner: string): Bag;
  inRange(a: string, b: string): boolean;
  newId(): number;
}

function partnerOf(t: Trade, who: string): string { return who === t.a ? t.b : t.a; }

// Any offer change clears BOTH confirmations. The donor clears only the editor's own lock (defect 1).
function unconfirmBoth(t: Trade): void {
  t.confirmed.set(t.a, false);
  t.confirmed.set(t.b, false);
}

// Escrow by move: the offered stack leaves the owner's bag now, so it cannot be spent during the trade.
export function offer(t: Trade, who: string, objectId: number, count: number, w: World): boolean {
  if (!t.open) return false;
  const src = w.bag(who);
  const item = src.items.get(objectId);
  if (!item || !item.tradable || item.bound) return false;
  if (count < 1 || count > item.count) return false;
  if (!item.stackable && count !== 1) return false;
  // Reserve room: every stack already offered by this player plus this one must fit in the partner's bag.
  let offeredStacks = 0;
  for (const e of t.escrow.values()) if (e.from === who) offeredStacks++;
  const dst = w.bag(partnerOf(t, who));
  if (dst.items.size + offeredStacks + 1 > dst.capacity) return false;

  let moved: Item;
  if (count === item.count) {
    src.items.delete(objectId);
    moved = item;
  } else {
    item.count -= count;
    moved = { ...item, objectId: w.newId(), count };
  }
  t.escrow.set(moved.objectId, { from: who, item: moved });
  unconfirmBoth(t);
  return true;
}

// Cancel (also used on disconnect or out of range): every escrowed stack goes back to its owner.
export function cancel(t: Trade, w: World): void {
  for (const e of t.escrow.values()) w.bag(e.from).items.set(e.item.objectId, e.item);
  t.escrow.clear();
  t.open = false;
}

// Both confirmed: re-check range and room for each receiver, then move every escrowed stack in one step.
export function confirm(t: Trade, who: string, w: World): { status: "waiting" | "settled" | "cancelled"; rows: Row[] } {
  if (!t.open) return { status: "cancelled", rows: [] };
  t.confirmed.set(who, true);
  if (!t.confirmed.get(t.a) || !t.confirmed.get(t.b)) return { status: "waiting", rows: [] };
  if (!w.inRange(t.a, t.b)) {
    cancel(t, w);
    return { status: "cancelled", rows: [] };
  }
  const rows: Row[] = [];
  const need = new Map<string, number>();
  for (const e of t.escrow.values()) {
    const to = partnerOf(t, e.from);
    rows.push({ from: e.from, to, objectId: e.item.objectId, itemId: e.item.itemId, count: e.item.count });
    need.set(to, (need.get(to) ?? 0) + 1);
  }
  for (const [to, n] of need) {
    const dst = w.bag(to);
    if (dst.items.size + n > dst.capacity) {
      cancel(t, w);
      return { status: "cancelled", rows: [] };
    }
  }
  for (const e of t.escrow.values()) w.bag(partnerOf(t, e.from)).items.set(e.item.objectId, e.item);
  t.escrow.clear();
  t.open = false;
  return { status: "settled", rows };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp) exited 0.

## 5. Lands in

- TARGET `origins/server/trade.ts` (the same module as the AzerothCore note; the escrow store is inside the trade object; the Frankendom trade code was not read in this pass, so "new" is unverified).
- Parity row: 18 (loot roll and XP award; item ownership), the nearest row. No parity row 1-22 covers trades. Ruling needed (section 7).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (the escrow is a state on the trade; the settle writes rows through settle()); server-verified (range, room and confirmations are checked on the server).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Donor defect 1, the partner can change the deal after the other side confirmed (serious): `C_TradeAddItem` 123 refuses an add only when the sender's own confirmation is set (`pc.getTradeOk()`), and `L1Trade.TradeAddItem` (50-80) never clears either flag when a stack is added. So side B can add an item after side A has confirmed; A's confirmation stays set; B then confirms (C_TradeOK 40-42) and the settle runs (46) with B's new stack, which A never saw. Fix: any offer change clears both confirmations (the sketch's `unconfirmBoth`).
- Donor defect 2, no range check after the window opens: `C_Attr` checks facing only when the target answers (204), and nothing in `C_TradeAddItem`, `C_TradeOK` or `L1Trade` checks distance. A trade can settle with the partners far apart. Fix: range check on each server tick and at confirm; cancel out of range (the sketch checks at confirm).
- Donor defect 3, room is not reserved and the settle does not refuse: `checkAddItem` (C_TradeAddItem 127) checks the partner's current contents for each add and does not count stacks already offered, so two adds can each see the same free slot. At settle, `C_TradeOK` 43-44 checks only the current sizes against 164, and `storeTradeItem` (L1Inventory 187-205) stores with no capacity check at all, so a settle can push a bag past the limit. Fix: reserve per offered stack at offer time and re-check per receiver before any move (the sketch does both).
- Donor defect 4, the settle loop stalls on a failed transfer (latent): the loop reads index 0 each time (L1Trade 96-97), so a failed transfer at index 0 leaves that stack at index 0 and no later stack is attempted in that pass; both sides then get "complete" (145) and the failed stack stays in the trade window, which nothing returns to its owner (the window is read only by TradeOK and TradeCancel). In the code as read, `tradeItem` returns null only for a missing item, a zero count, an equipped item, or a short window (L1Inventory 310-321) and the store never fails, so this is reachable only through those early returns. Fix: settle is all-or-nothing; a failed move aborts the whole trade and returns escrow.
- Donor defect 7, a bad count strands the window (serious if reachable): `L1Trade.TradeAddItem` 58-64 clears both trade ids and sends cancel status when the count is above the held count, but never calls `TradeCancel`; stacks already offered stay in the trade windows, which nothing returns (the window is read only by `TradeOK` and `TradeCancel`). `C_TradeAddItem` 69-82 pre-empts this by disconnecting, so it is reachable only through other callers, but the pattern is the same as defect 4. Also `TradeAddItem` 67-72 ignores a null return from `tradeItem` and still sends `S_TradeAddItem` to both sides. Fix (kept idea: escrow by move): every abort path, including a bad offer, calls the one cancel that returns all escrow; the sketch's `offer` refuses without touching the trade and `cancel` returns everything.
- Donor defect 8, anti-cheat that destroys items: `checkPcItem` (L1CheckPcItem 52-53) flags any non-adena stackable above 1000000000 and `removeItem` deletes the whole stack from the player's bag, so a legitimate large stack is wiped on a trade offer. Fix: refuse the offer and log; never delete on a heuristic.
- Donor defect 5, unguarded lookup: `C_TradeAddItem` 67 may return null from `getItem(itemid)`, and 69 dereferences it at once (NullPointerException path; the exception handling above the constructor was not read). Fix: check the item before any field read; refuse and log.
- Donor defect 6, dead branch: the second `if (isCheat)` at C_TradeAddItem.java 132 cannot run, because the first at 90 returns (93) on a cheat. Harmless; remove when porting.
- Donor risk, automatic bans: an offline sender (55-66) and a count mismatch (69-82) both disconnect the player and, when `Config.AUTO_BAN` is set, ban the account and the IP (56-58, 72-74). The comment at 68 says the autoban is not configurable yet ("TRICIDTODO: set configurable autoban"). Fix: log and cancel the trade, and flag the account for review; a ban is a human decision (ruling 3).
- Donor cost: `checkPcItem` runs three SQL queries per offered stack (`findWeapon`, `findArmor`, `findEtcitem`, L1CheckPcItem 44-60 and the query bodies). Frankendom should load the category as a field of the item row, not query per offer.
- Not read: the NPC merchant and private shop paths (`C_Shop`, `L1MerchantInstance`), `Account.ban`, the log classes' storage (`LogTradeComplete`, `LogTradeAddItem`, `LogTradeBugItem`), the `Config` values.

## 7. Pass-2 additions

**As-data shape**
- Trade window (a per-player inventory, `model/Instance/L1PcInstance.java` 876 and 1897): an `L1Inventory` of `L1ItemInstance` rows. Row fields copied on a split (L1Inventory.java 331-340): item id (from the item template), count, enchant level, identified flag, durability, charge count, remaining time, last-used time, bless value. The split creates a new instance through `ItemTable.createItem` (331-332); how it gets its object id was not read.
- A new trade field (for example a per-trade cap) is one row: no. The rules are code in `L1Trade` and `C_TradeAddItem`, and the caps are in code and `Config`.
- Item category data: three tables decide what a stack is for the cheat check: `weapon` (by item_id), `armor` (by item_id) and `etcitem` (by item_id, with a `stackable` column, L1CheckPcItem.java 122-128). A new tradable etcitem is one row in `etcitem`: yes (the trade and cheat checks pick it up with no code change). A new weapon or armor is one row in its table: yes.
- Sealed and tradable flags come from the item template (`isTradable`, C_TradeAddItem 96) and the bless value on the instance (101).

**Provenance per claim**
- Repo: l1j-en-classic on the VPS (`/mnt/frankendom-donors/l1j-en-classic`). Each claim has a file and line in receipts.tsv (verified). Licence: GPL-2.0-or-later; shape only in the strict sense of the brief (copyleft: clean-room, no line-by-line port).

**What they patched later** (no `.git` in the copy; comments and messages only)
- `C_Trade` 40: "fix for trade bug" (the trade-id check before starting a trade, so a busy target is not re-paired).
- `Client.java` 145: "First cancel trade & save inventory to help avoid duping" (the quit cancel, the best dupe guard here).
- `C_TradeAddItem` 54: "additional dupe checks. Thanks Mike" (the comment credits a named person; it gives no reason, and the checks are the offline and count checks in this file).
- `C_TradeAddItem` 68: "TRICIDTODO: set configurable autoban" (a to-do: the autoban is not configurable yet).
- `L1Inventory.java` 193: "TODO: test me!" (the stackable merge in `storeTradeItem` is untested).
- `L1Inventory.java` 345: a warning when a transfer runs before the source is removed; the code does not say why it was added.
- README.md and DEVGUIDE.md have no trade notes (the only "trade" word in README.md is in a copyright line).

**Rulings for Dom**
1. Should a trade cancel automatically when the two players are out of range (recommendation: yes, checked on each tick and at confirm, and the escrow goes back)?
2. Should any change to an offer clear both confirmations (recommendation: yes; the donor lets the partner change the deal after the other side has confirmed)?
3. Should a count mismatch or an offline sender ban the account automatically (donor: yes when AUTO_BAN is set; recommendation: no, log and cancel and flag for a human to review)?

Reuse tag and brief rule are in section 5.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Offline-sender block is lines 55-66, not 55-63; count block is 69-82, not 69-84; the extra `itemcount > 2000000000` term at 70 was omitted.
- "A flagged stack is removed, see section 3" pointed at nothing; L1CheckPcItem 58 deletes the stack from the player's bag. L1PcInstance is under model/Instance/.
- Missed: L1Trade.TradeAddItem 58-64 cancels without TradeCancel (stranded escrow); 67-72 ignores a null tradeItem result; L1CheckPcItem 52-53 destroys legitimate stacks over 1e9.

Fixed 2026-10-12: corrected line ranges (55-66, 69-82) and added the 2e9 term; explained the flagged-stack deletion; fixed L1PcInstance path; added defects 7 (stranded window, null tradeItem result) and 8 (destructive anti-cheat).
