# AAEmu-AAEmu (trading-barter-vendors, cell 2)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TradeManager.cs` | Licence: unclear. README "Licensing information" names the GNU LGPL v3 text (README.md:36); `LICENSE.GPL` is GPL v3; `LICENSE.MIT` is MIT (Copyright 2019 Rain0Ash). Clean-room, shape only | C# | symbol `TradeManager` (`LockTrade`, `OkTrade`, `UnlockTrade`, `AddItem`, `FinishTrade`)

Checked: read `TradeManager.cs` in full (393 lines, numbered). Read the four C2G packet classes that call it (`CSStartTradePacket.cs`, `CSCanStartTradePacket.cs` in full; the others by their one-line calls). Grep of `TradeManager` across `AAEmu.Game` found callers only in the C2G packets. `ItemTemplate.cs:18` and `ItemManager.cs:383` read by line only. Not read: `AddOrMoveExistingItem` internals (so whether the whole stack moves is inferred, see D5), the logout path (so D11 is inferred from the grep), `WorldManager.GetCharacterByObjId` null behaviour, `MailForAuction` (auction, outside this cell). camera_scope: n/a (trade). Confidence: high on the trade flow and D1-D4, D6-D10; medium on D5 and D11 as stated.

## 1. Mechanism

Two-party trade keyed by one trade id, in a dictionary (`_trades`, 27-30). Event-driven: each client packet calls one method; no tick. Order of steps:

(a) Request. `CanStartTrade` (68-75) first calls `IsTrading` on both players (70). `IsTrading` (46-53) cancels any existing trade of that player (51) as a side effect. Then the target gets a request packet (74). Nothing is stored. `StartTrade` (77-102) repeats the same `IsTrading` check (79), creates a template with both locks and both oks false (81-96), stores it (97) and sends a started packet to both (100-101).

(b) Offer. `AddItem` (124-155) requires an active trade and `item.Count >= amount` (128), then adds the item object to the caller's list (136 or 143). `AddMoney` (157-187) requires `character.Money >= moneyAmount` (160) and stores the amount (168 or 175). `RemoveItem` (189-222) takes an item out of the list (201-202, 209-210). Every change ends with `UnlockTrade` (149, 181, 216).

(c) Lock-on-change. `UnlockTrade` (55-66) returns at once if neither side is locked (57). Otherwise it clears both locks and both oks (59-62), sends both sides a lock update (63-64) and logs "Lockers opened and Ok undone" (65).

(d) Lock and ok. `LockTrade` (224-263) sets the caller's lock (247 or 252). Unlock (`_lock` false, 238-243) clears both lock flags and does not touch the ok flags. `OkTrade` (265-308) returns at once if neither side is locked (272). It sets the caller's ok (280 or 285), sends both sides the ok state (290-291). When both oks are true (294):

(e) Settle. `FinishTrade` (310-392). Money check: the owner's offer must not exceed the owner's money (315), same for the target (321). Money moves (335-347), then the owner's items to the target's bag (351-365), then the target's items to the owner's bag (367-381), each with `AddOrMoveExistingItem`. A failed move only adds 1 to `hasErrors` (362, 378). The trade is removed (384), both sides get a trade-made packet (385-386), and a log line reports partial failures as "possible exploit or modified client!" (388-391).

Before (e), `OkTrade` checks free slots: if the owner has fewer free slots than the target's items, or the target has fewer than the owner's, it calls `CancelTrade` (297-298) but does not return (see D3).

## 2. Key functions

- `TradeManager.UnlockTrade`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TradeManager.cs` 55-66. The lock-on-change rule.
- `TradeManager.LockTrade`: same file 224-263. Lock and unlock; the unlock branch 238-243.
- `TradeManager.OkTrade`: same file 265-308. The ok check and the both-ok finish.
- `TradeManager.FinishTrade`: same file 310-392. Money and item settle, not atomic.
- `TradeManager.AddItem`, `AddMoney`, `RemoveItem`: same file 124-222. Each change calls `UnlockTrade`.
- Requests: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Packets/C2G/CSCanStartTradePacket.cs` 8-20 and `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Packets/C2G/CSStartTradePacket.cs` 8-19.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lock, then ok; any change unlocks both | none (flags only) |
| Settle checks money against cash at settle, not only at add | the owner check (315) and target check (321) |
| Free-slot check before settle | `FreeSlotCount(SlotType.Inventory)` (297-298); counts slots, not stack space |
| Stack amount check at add | `item.Count >= amount` (128); the amount is not used to split the stack later |
| Money offer | `int`; no `>= 0` check at add (160); a negative amount is stored and ignored at settle (`> 0` at 333 and 342) |
| Range or presence gate | none found in the trade path (not read elsewhere) |
| Bind-on-pickup gate | none found in the trade path; `BindOnPickup` is checked only at pickup (ItemManager.cs:383) |

## 4. TypeScript sketch

simplified: keeps the donor's lock-then-ok order and its change-unlock rule, with fixes for the defects below: every change and every unlock clears both oks, ok needs both locks, removal is by id, stacks carry a count, bind and range are checked, and settle is one all-or-nothing call. It omits the request handshake (CanStartTrade and StartTrade), the packets, the trade id manager, the logs and the faction TODO, and it folds the money and slot checks into `checkAll`. The sketch passed `tsc --noEmit --strict --target es2020` on the VPS (exit 0).

```ts
// Licence: README says LGPL-3.0; LICENSE.GPL is GPL-3.0; LICENSE.MIT is MIT. Unclear, so clean-room sketch from the described mechanism only.
type Role = "owner" | "target";

interface Stack { itemId: number; count: number; }

interface Side {
  stacks: Stack[];   // stacks offered, by reference to the owner's bag until settle
  money: number;
  locked: boolean;
  ok: boolean;
}

interface Hooks {
  hasStack(who: Role, stack: Stack): boolean;  // stack still in who's bag with at least count
  tradable(itemId: number): boolean;           // not bind-on-pickup (donor has no such check)
  money(who: Role): number;                    // cash on hand
  freeSlots(who: Role): number;                // free bag slots
  inRange(): boolean;                          // both players close enough (donor has no range check)
}

type Row =
  | { kind: "item"; itemId: number; count: number; from: Role; to: Role }
  | { kind: "money"; amount: number; from: Role; to: Role };

export class TradeWindow {
  private readonly sides: Record<Role, Side> = {
    owner: { stacks: [], money: 0, locked: false, ok: false },
    target: { stacks: [], money: 0, locked: false, ok: false },
  };
  private open = true;

  constructor(private readonly hooks: Hooks) {}

  private other(who: Role): Role {
    return who === "owner" ? "target" : "owner";
  }

  // Fix: every change clears BOTH locks and BOTH ok flags, whatever the lock state.
  // The donor returns early when no lock is held, so its ok flags survive edits.
  private changed(): void {
    for (const who of ["owner", "target"] as const) {
      this.sides[who].locked = false;
      this.sides[who].ok = false;
    }
  }

  addItem(who: Role, stack: Stack): boolean {
    if (!this.open || !this.hooks.tradable(stack.itemId) || !this.hooks.hasStack(who, stack)) return false;
    this.sides[who].stacks.push({ ...stack });
    this.changed();
    return true;
  }

  // Remove by id; never clear the whole offer (the donor clears it when one item or fewer is left).
  removeItem(who: Role, itemId: number): boolean {
    if (!this.open) return false;
    const s = this.sides[who];
    const before = s.stacks.length;
    s.stacks = s.stacks.filter((x) => x.itemId !== itemId);
    if (s.stacks.length === before) return false;
    this.changed();
    return true;
  }

  setMoney(who: Role, amount: number): boolean {
    if (!this.open || amount < 0 || amount > this.hooks.money(who)) return false;
    this.sides[who].money = amount;
    this.changed();
    return true;
  }

  // Lock. Unlocking also clears that side's ok (the donor's unlock branch leaves ok set).
  lock(who: Role, on: boolean): void {
    if (!this.open) return;
    this.sides[who].locked = on;
    if (!on) this.sides[who].ok = false;
  }

  // Ok is accepted only when both sides are locked (the donor accepts with either lock).
  // Returns the settlement rows when both have ok'd and every check passes, else null.
  confirm(who: Role): Row[] | null {
    if (!this.open) return null;
    if (!this.sides.owner.locked || !this.sides.target.locked) return null;
    this.sides[who].ok = true;
    if (!(this.sides.owner.ok && this.sides.target.ok)) return null;

    if (!this.checkAll()) {        // fail closed; no return path leaves a half-finished trade
      this.open = false;
      return null;
    }
    this.open = false;
    return this.rows();
  }

  private checkAll(): boolean {
    if (!this.hooks.inRange()) return false;
    for (const who of ["owner", "target"] as const) {
      const s = this.sides[who];
      if (s.money > this.hooks.money(who)) return false;
      for (const st of s.stacks) {
        if (!this.hooks.hasStack(who, st)) return false;
      }
    }
    if (this.hooks.freeSlots("target") < this.sides.owner.stacks.length) return false;
    if (this.hooks.freeSlots("owner") < this.sides.target.stacks.length) return false;
    return true;
  }

  // The caller passes all rows to one atomic settle(); if any row fails, the whole trade rolls back.
  private rows(): Row[] {
    const out: Row[] = [];
    for (const from of ["owner", "target"] as const) {
      const to = this.other(from);
      for (const st of this.sides[from].stacks) {
        out.push({ kind: "item", itemId: st.itemId, count: st.count, from, to });
      }
      if (this.sides[from].money > 0) {
        out.push({ kind: "money", amount: this.sides[from].money, from, to });
      }
    }
    return out;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed new module; the lock and ok state machine, one `settle()` call on completion).
- Parity row 18 (loot roll and XP award: ownership and one ledger). Trade has no parity row of its own; row 18 is the nearest.
- Decision (proposed): adapt. Lock-then-ok with lock-on-change is the shape Strategy asked for (a trade window with both-confirm and a lock on change). The defects below are why we do not copy the donor's flags.
- Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
- Brief rule served: one ledger (settle() is the only door; a trade is one settle with N rows); server-verified (both sides re-checked on the server at the final ok).

## 6. Gaps and risks

- Licence unclear: clean-room only. The sketch is written from the mechanism, not from donor lines.
- D1, stale ok survives an unlock and an edit (the worst one). Sequence: A locks; B oks (allowed, A is locked); A unlocks (the unlock branch at 238-243 clears only lock flags); A adds an item (`UnlockTrade` returns at 57 because no lock is held, so OkTarget stays true); A locks again and oks (294 passes). The trade settles with an item B never approved. Fix: every change and every unlock clears both oks, whatever the lock state (the sketch's `changed()` and `lock()`).
- D2, ok check does not match its comment. The comment at 271 says "Check if both locked"; the code at 272 returns only when neither side is locked. Fix: require both locks before an ok (the sketch's `confirm`).
- D3, cancel does not stop the finish. `CancelTrade` at 297 or 298 removes the trade (116) and sends the cancel, but there is no return, so `FinishTrade` runs (301) and reads `_trades[tradeId]` at 312, which throws. If the target is also short of room, the call at 298 runs `CancelTrade` again: after 297 has removed the trade, that call throws at 114; otherwise `FinishTrade` throws at 312. No items move, but the exception leaves the caller in an error path. Fix: return after the cancel.
- D4, settle is not atomic. Money moves at 335-347 before the item loops (351-381). A failed item move only increments `hasErrors` (362, 378); the trade is removed at 384 with the money already moved. Fix: build all rows, settle in one transaction, roll back all rows on any failure (the sketch's `rows()` plus one settle call).
- D5, the whole stack moves, not the offered count (inferred). `AddItem` checks `item.Count >= amount` (128) and stores the item object (136), then `FinishTrade` moves that object (355, 371). The amount is only echoed to the client (137). `AddOrMoveExistingItem` was not read, so this is inferred. Fix: store `{itemId, count}` and split the stack at settle (the sketch's `Stack`).
- D6, remove clears the whole offer. `RemoveItem` clears the list when it holds one item or fewer (201, 209), whatever item was taken down, and it checks only that the slot holds an item (193). Fix: remove by id only (the sketch's `removeItem`).
- D7, no bind check. `TradeManager.cs` has no `BindType` check. `ItemTemplate.cs:18` has the bind type, and `ItemManager.cs:383` enforces bind-on-pickup at pickup only. Frankendom's take-one loot needs a refusal at add: a bind-on-pickup item cannot be offered (the sketch's `tradable`).
- D8, any player can cancel another player's trade. `CanStartTrade` calls `IsTrading(target)` (70), which cancels the target's existing trade (51). `CSCanStartTradePacket.cs` (12-14) takes any objId from the client. Fix: a request to a busy player is refused, not cancelled; only the two parties can end a trade.
- D9, no consent step. `CSStartTradePacket.cs` takes the owner from a client objId (14) and makes the sender the target (16). `StartTrade` (77-102) checks nothing pending. Fix: store a pending request from `CanStartTrade` and require `StartTrade` to match it.
- D10, no range check in the trade path (TradeManager.cs and the two packets read). Fix: range check at start, at each change and at settle (the sketch's `inRange`); units are the client's, to be set as data.
- D11, a disconnect leaves the trade (inferred). The only callers of `TradeManager` methods in `AAEmu.Game` are the C2G packets. If `GetCharacterByObjId` returns null for a player who has left (not read), `CancelTrade` removes the trade at 116 and then reads `owner.Name` at 118 and throws. Fix: cancel on logout; null-check before logging.
- Minor: a negative money offer is accepted at add (160) and stored (168); settle ignores it (333, 342). No gain, but the offer shows a wrong number. Fix: reject below 0 at add (the sketch's `setMoney`).
- Trade limits: no per-trade item count cap found in the trade path; slots are the only limit (297-298).
- Taxes and fees: none in `TradeManager.cs`. Auction (`MailForAuction`) not read.
- Escrow for scheduled duel wagers: not in this donor. Items stay in their bags until settle, and the owner can use or move them until then (not checked at settle, the item is moved wherever it is). Frankendom needs an escrow row at duel start.

Best transferable idea: lock first, then ok; any change or unlock clears both oks, and only a both-locked, both-ok pair triggers one atomic settle.
Decision (proposed): adapt — lock-on-change and both-ok are the anti-scam shape we need; the stale-ok, partial-settle, whole-stack and no-bind defects are fixed in origins/server/trade.ts.
Acceptance: A offers one stack of 20 and 500 coins; B and A lock; B oks; A changes coins to 5, both locks and oks clear on both screens; both lock and ok again; one settle() writes one item row with count 20 and one money row under one trade id; a server test asserts that an ok given before a change settles nothing and that a bind-on-pickup item is refused at add.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All TradeManager.cs cites verified against numbered lines: IsTrading 46-53 (cancels at 51), UnlockTrade 55-66 early return at 57, CanStartTrade 68-75, StartTrade 77-102, CancelTrade 104-122 (Remove at 116, name read at 118), AddItem 124-155 (check 128, Add 136/143), AddMoney 157-187 (160, 168/175), RemoveItem 189-222 (193, clear-if-<=1 at 201/209), LockTrade unlock branch 238-243 clears only locks, OkTrade 265-308 (comment 271 vs code 272 mismatch confirmed; CancelTrade at 297/298 without return then FinishTrade 301 throws KeyNotFound at 312), FinishTrade 310-392 (money checks 315/321, money before items 335-347, hasErrors 362/378, remove 384, log 388-391). D1 stale-ok sequence reproduces exactly (lock A, ok B, A unlocks, A adds item - UnlockTrade returns at 57 - A locks and oks - settles). Packets CSStartTradePacket 14/16 and CSCanStartTradePacket 12-14 as described; README licence LGPL v3, LICENSE.GPL GPL v3, LICENSE.MIT as stated. Sketch passes the acceptance sequence (change coins to 5 clears both locks and oks; one item row count 20 plus one money row; bind-on-pickup refused at add). D7 slightly understates: ItemManager.cs:383 sets the SoulBound flag on bind-on-pickup items at creation and ErrorMessageType.cs:255 defines TradeSoulBoundItem, but no code in TradeManager uses either.
Missed: AddItem dereferences item.Count at line 128 before any null check (empty slot -> NullReference); the same item can be added to the offer twice (no dedupe) so one stack could be listed twice into FinishTrade; ErrorMessageType.TradeSoulBoundItem exists but is unused by TradeManager.
