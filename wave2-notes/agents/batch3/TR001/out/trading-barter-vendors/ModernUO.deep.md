# ModernUO (trading-barter-vendors, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/SecureTrade.cs` | Licence: GPL-3.0-or-later (per the SecureTrade.cs header: version 3 or any later version; repo LICENSE is GPL v3) | C# | symbol `SecureTrade.Update`

Checked: Read in full: `Server/SecureTrade.cs` (477 lines), `Server/Items/SecureTradeContainer.cs` (1-96), `UOContent/Network/Packets/IncomingMobilePackets.cs` `SecureTrade` handler (93-165), `Server/Network/NetState/NetState.cs` ValidateAllTrades, CancelAllTrades, RemoveTrade (311-371) and AddTrade (423), `Server/Mobiles/Mobile.cs` OpenTrade (7621-7650) and the drop-to-trade line (7674), `Server/Items/Item.cs` AllowSecureTrade and OnSecureTrade (1884-1890), `UOContent/Engines/Ethics/Core/Ethic.cs` CheckTrade (78-97), `UOContent/Accounting/Account.cs` DepositPlat and WithdrawPlat (542-595), `UOContent/Mobiles/Vendors/GenericBuy.cs` (1-140), `GenericSell.cs` (1-113), `BaseVendor.cs` (buy 144-300, sell 408-560, ProcessSinglePurchase 1172-1220, price scalar 1349-1366; restock lines 130, 132, 140 and the VendorBuy trigger at 866 read by grep only), `PlayerVendor.cs` (540-580, 785-805). Callers read: `Update()` from the packet handler (IncomingMobilePackets 124, 129) and from `ClearChecks` (SecureTradeContainer 89); `ClearChecks` from the container hooks (40-70) and from the gold packet (162); `OpenTrade` from the drop path (Mobile.cs 7674). Other callers of `Restock` and `Update` were not searched. Not read: `VendorBuy` body (847-978, only grep lines 866, 926 read), `GenericBuy.cs` 140-276, `Banker.Withdraw` and `Banker.DepositUpTo`, `Container.ConsumeTotal`, `Town.Tax`, the `Gold` item class, the removal hook that fires when an item leaves the trade container, any exception handling around settle, `Server.Tests` trade tests. camera_scope: n/a (not a camera topic). Confidence: high for the trade window (read end to end); medium for the vendor numbers (read, not run). Donor CLAUDE.md and AGENTS.md exist at the donor root; treated as data, not read.

## 1. Mechanism

Trade window, in the order the code runs:

- **Open.** `Mobile.OpenTrade` (Mobile.cs 7621) checks a feature kill switch first (7623), then both players are players, alive and have a NetState (7627-7637). It asks the receiving mobile's veto `CheckTrade` (7644), reuses an existing trade container or creates a `SecureTrade` (7642, 7649; NetState.AddTrade 423). The drop path needs range 2 (7674).
- **Escrow for items only.** Each side gets a `SecureTradeContainer` (SecureTradeInfo ctor, SecureTrade.cs 431-441). Dropped items physically go into it. Currency is not moved at open: the offered gold and platinum sit on a `VirtualCheck` item (a field holder, not a stack of gold), and the move loops skip it (SecureTrade.cs 205, 225, 288, 310).
- **Lock on change.** Adding or removing any non-VirtualCheck item in the container calls `ClearChecks` (SecureTradeContainer.cs 40-70 hooks, 72-90). `ClearChecks` sets BOTH accept flags to false (81, 86) and then calls `Update` (89). A client gold or platinum edit also calls `ClearChecks` (IncomingMobilePackets 162).
- **Two-step confirm.** The client's Check packet sets only that player's accept flag and calls `Update` (IncomingMobilePackets 123-129). `Update` (SecureTrade.cs 186) does nothing else unless both accepts are true and neither side is disposed (193). If only one accept is set, it sends status to both clients and returns (326-329).
- **Re-check at confirm.** With both accepts true, `Update` runs `AllowSecureTrade` on every item in both containers (195-235, first call 210). When `AccountGold` is enabled it checks both players' balances against the offer (237-262; the failure message is at 247). If any check fails, both accept flags are cleared, both clients get status, and it returns (264-273).
- **Settle.** Currency first: `HandleAccountGoldTrade` (275-277, body 333-380) withdraws the payer's platinum and gold (338, 348, 358, 368), then deposits to the receiver (342, 352, 362, 372). Items second: From's items go to To's backpack through `OnSecureTrade(..., true)` (280-300), then To's go to From's (302-322). Then `Close` (324).
- **Close.** `Close` (136-158) sends close packets, sets `Valid = false`, removes the trade from both NetStates and disposes the two containers on a timer (156-157).
- **Cancel.** `Cancel` (82-134) puts each item back with `OnSecureTrade(..., false)` and `AddToBackpack` (102-108, 124-130). Currency never left the accounts, so nothing has to be returned. Then `Close`.
- **Presence.** `NetState.ValidateAllTrades` (311-338) cancels a trade when either player is deleted or dead, when the partner is not `InRange(…, 2)` (333), or when the maps differ (334). It is called from `Mobile.SetLocation` (7379) and from another site (Mobile.cs 2532, not read). `CancelAllTrades` runs in `Kill` (4749).

Ownership veto: each item has `AllowSecureTrade` (Item.cs 1884, default true). Overrides: `PlagueBeastInnard` always false (88); `Ethic.CheckTrade` (78) refuses an item whose ethic (Hero or Evil) does not match the receiver, and the BaseWeapon, BaseArmor and BaseClothing overrides call it.

Tick: none. The whole trade is event-driven by client packets. There is no per-frame loop in this path.

## 2. Key functions

- `SecureTrade.Update`: `/mnt/frankendom-donors/ModernUO/Projects/Server/SecureTrade.cs` 186-331. Confirm gate, re-check, settle, close.
- `SecureTrade.Cancel`: same file, 82-134. Returns items, then Close.
- `SecureTradeContainer.ClearChecks` and the item hooks: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/SecureTradeContainer.cs` 40-90. Any change resets both accepts, then Update.
- Client packet handler: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Network/Packets/IncomingMobilePackets.cs` 93-165 (Cancel 97-108, Check 109-132, gold 136-163).
- Presence: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/NetState/NetState.cs` 311-338.
- Open: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 7621-7650.

## 3. Numbers vs mechanism

Trade window (exact values from the code):

| Rule | Value or formula | Where |
|---|---|---|
| Trade range (open and keep) | 2 tiles, `InRange(..., 2)` | Mobile.cs 7674; NetState.cs 333 |
| Trade ends when | dead, deleted, out of range, or maps differ | NetState.cs 333-334 |
| Settle gate | accepted(A) AND accepted(B), both not disposed | SecureTrade.cs 193 |
| Reset on any change | both accepts = false, then Update | SecureTradeContainer.cs 81, 86, 89 |
| Balance re-check at confirm | offer <= balance for gold and plat, each side | SecureTrade.cs 244, 256 |
| Failure | both accepts = false, status sent, no settle | SecureTrade.cs 264-273 |
| Currency move | per side: withdraw from payer, deposit to receiver; no fee, no tax | SecureTrade.cs 338-379 |
| Platinum deposit cap | none: `TotalPlat += amount` | Account.cs 549 |
| Platinum withdraw check | refuse if amount > balance | Account.cs 589 |
| Negative offer | read as-is from client, no clamp | IncomingMobilePackets.cs 142-143 |
| Veto default | true (allow) | Item.cs 1884 |

Vendor prices and stock (read, not run). Columns: formula, numbers, where.

| Rule | Formula and numbers | Where |
|---|---|---|
| Stock price to buyer | `(m_Price * DefaultPrice + 50) / 100`, scalar = `100 + tax` when DefaultPrice != 0; if DefaultPrice == 0, base price is used. Integer, rounds half up. | GenericBuy.cs 57-82 (formula 79, zero check 61) |
| Scalar expression | `100 + Town.FromRegion(Region)?.Tax ?? 0`: the `??` binds after `+`, so no town gives scalar 0, which means base price | BaseVendor.cs 1353 |
| Sell price (player to vendor) | table[type]; Low x 0.60, Exceptional x 1.25; armour + 100 x Durability + 100 x ProtectionLevel; weapon + 100 x DurabilityLevel + 100 x DamageLevel; minimum 1 | GenericSell.cs 12-48 (Low at 20, durability at 25) |
| Buy-back price (vendor to player, resold items) | `(int)(1.90 * sell price)`: a 90% markup over the sell price | GenericSell.cs 83 |
| Restock timer | 1 hour, checked when the buy list opens | BaseVendor.cs 130, 866 |
| Restock refill | remaining = max after the rule below | GenericBuy.cs 136 |
| Sold out | max = min(999, 2 x max) | GenericBuy.cs 109 |
| Mostly unsold | half = 640 if max >= 999; max/2 if 20 < max < 999; else max. If remaining >= half, max = half. | GenericBuy.cs 121-135 (640 at 123) |
| Player-sold stock decay | 1 hour after last move | BaseVendor.cs 34, 926 |
| Sell batch cap | 500 stacks (counts stacks, not units) | BaseVendor.cs 32, 451 |
| Sell payout | sum of sell price x amount, paid as Gold items in 60,000 chunks | BaseVendor.cs 537, 544, 550 |
| Bank fallback for a buy | totalCost >= 2000 may be paid from the bank | BaseVendor.cs 264 |
| Staff buy | GameMaster and above buy for free | BaseVendor.cs 249 |
| Player vendor hold | accepts gold while HoldGold < 1,000,000; owner collects up to what the bank takes | PlayerVendor.cs 553-557, 800-801 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order at confirm (both accepts, then item permission and balances, then settle, then close) and the rule that any change clears both accepts. It changes three things on purpose: (a) offers do not move items into an escrow container, so ownership is checked at commit instead, and cancel has nothing to return; (b) client amounts are validated when written (non-negative, not above balance, items owned and tradeable), which the donor does not do; (c) settle is one all-or-nothing batch (dry run on copies, commit at the end), where the donor withdraws each side and deposits without rollback. It omits the packet layer, the VirtualCheck gump, the per-item OnSecureTrade hook (a no-op here), bulk-order and message strings, the Timer-based disposal, and the re-entry of the item-removal hook during the move loop (not read).

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemRef = { id: string; canTrade: boolean };
type Currency = "gold" | "plat";
interface Wallet { gold: number; plat: number }
interface Offer { items: ItemRef[]; gold: number; plat: number }
interface Side { playerId: string; offer: Offer; accepted: boolean }
interface Trade { a: Side; b: Side; open: boolean }
type Row =
  | { kind: "item"; itemId: string; from: string; to: string }
  | { kind: Currency; amount: number; from: string; to: string };
interface Ledger { wallets: Map<string, Wallet>; owner: Map<string, string> }

const MAX_BALANCE = 2147483647; // int32 cap (donor Account.DepositPlat has no check; fix here)
const RANGE_TILES = 2;          // donor InRange(..., 2)
const ZERO: Wallet = { gold: 0, plat: 0 };

function walletOf(l: Ledger, id: string): Wallet {
  return l.wallets.get(id) ?? ZERO;
}

// Client input is validated at write time (donor gap: no lower bound, no balance check on write).
function offerIsValid(o: Offer, w: Wallet, ownerOf: (id: string) => string | undefined, who: string): boolean {
  if (!Number.isInteger(o.gold) || !Number.isInteger(o.plat)) return false;
  if (o.gold < 0 || o.plat < 0) return false;
  if (o.gold > w.gold || o.plat > w.plat) return false;
  return o.items.every((it) => it.canTrade && ownerOf(it.id) === who);
}

// Any change to either offer clears BOTH accept flags (donor: ClearChecks on item add/remove and on gold edit).
function setOffer(t: Trade, side: "a" | "b", offer: Offer, l: Ledger): boolean {
  if (!t.open) return false;
  const me = t[side];
  if (!offerIsValid(offer, walletOf(l, me.playerId), (id) => l.owner.get(id), me.playerId)) return false;
  me.offer = offer;
  t.a.accepted = false;
  t.b.accepted = false;
  return true;
}

// Two-step confirm: nothing settles until both sides accept in the same offer state.
function setAccepted(
  t: Trade,
  side: "a" | "b",
  value: boolean,
  l: Ledger,
  canTradeWith: (it: ItemRef, from: string, to: string) => boolean,
): "waiting" | "reset" | "settled" | "closed" {
  if (!t.open) return "closed";
  t[side].accepted = value;
  if (!(t.a.accepted && t.b.accepted)) return "waiting";

  // Confirm-time re-check (donor Update): item permission, then balances, for both sides.
  const sides: [Side, Side][] = [[t.a, t.b], [t.b, t.a]];
  const ok = sides.every(([from, to]) =>
    from.offer.items.every((it) => canTradeWith(it, from.playerId, to.playerId)) &&
    offerIsValid(from.offer, walletOf(l, from.playerId), (id) => l.owner.get(id), from.playerId),
  );
  if (!ok) {
    t.a.accepted = false;
    t.b.accepted = false;
    return "reset";
  }

  const rows = buildRows(t);
  if (!settle(l, rows)) {
    t.a.accepted = false;
    t.b.accepted = false;
    return "reset";
  }
  t.open = false;
  return "settled";
}

function buildRows(t: Trade): Row[] {
  const rows: Row[] = [];
  for (const [from, to] of [[t.a, t.b], [t.b, t.a]] as const) {
    for (const it of from.offer.items) {
      rows.push({ kind: "item", itemId: it.id, from: from.playerId, to: to.playerId });
    }
    if (from.offer.gold > 0) rows.push({ kind: "gold", amount: from.offer.gold, from: from.playerId, to: to.playerId });
    if (from.offer.plat > 0) rows.push({ kind: "plat", amount: from.offer.plat, from: from.playerId, to: to.playerId });
  }
  return rows;
}

// Single door: all rows apply or none do. Dry run on copies, commit at the end.
function settle(l: Ledger, rows: Row[]): boolean {
  const wallets = new Map<string, Wallet>();
  for (const [k, v] of l.wallets) wallets.set(k, { ...v });
  const owner = new Map(l.owner);
  for (const r of rows) {
    if (r.kind === "item") {
      if (owner.get(r.itemId) !== r.from) return false;
      owner.set(r.itemId, r.to);
      continue;
    }
    const src = { ...(wallets.get(r.from) ?? ZERO) };
    const dst = { ...(wallets.get(r.to) ?? ZERO) };
    if (src[r.kind] < r.amount) return false;
    src[r.kind] -= r.amount;
    dst[r.kind] += r.amount;
    if (dst[r.kind] > MAX_BALANCE) return false;
    wallets.set(r.from, src);
    wallets.set(r.to, dst);
  }
  l.wallets = wallets;
  l.owner = owner;
  return true;
}

// Presence: any of these cancels the trade (donor ValidateAllTrades: dead, deleted, range, map).
function presenceOk(distanceTiles: number, sameMap: boolean, bothAlive: boolean): boolean {
  return sameMap && bothAlive && distanceTiles <= RANGE_TILES;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file copied to /tmp, exit 0.

Best transferable idea: a trade is two accept flags plus one settle that re-checks ownership and balances and applies every row or none, and any edit to either offer clears both flags.

Decision (proposed): adapt — keep the two-step confirm and the reset-on-change lock, because they stop a bait-and-switch; change the escrow to ownership-at-commit and make settle one all-or-nothing batch, because the donor's currency-then-items order is not atomic and its client amounts are not validated.

Acceptance: Two test players: A offers 50 gold and a sword; B accepts; A changes gold to 60, and both accept flags clear; B alone never settles; when both accept, one settle moves the sword and 60 gold and the total of all wallets is unchanged; a negative offer is refused when written; an offer above the payer's balance is refused at confirm and both accepts reset.

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed path; trade is server state, so it lives with the other server ledger code, not in src/fight). The settle() batch is the one door to the ledger; the client sends only offers and accepts.
- Parity-checklist row: 18 (loot roll and XP award). This is the nearest row: trade is the one place where ownership of a taken item changes between players. No row covers trade directly, so Lead should decide whether trade gets its own row.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (settle() is the only door; trade is never a side table); server-verified (the server re-checks at confirm); clean-room only.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the order of operations, not from the donor lines.
- Two wallets in the donor. Currency goes through the account API (Account.cs) and vendor payouts are Gold items in the backpack (BaseVendor.cs 550). Frankendom must not copy that: every trade and vendor payout is a ledger row through settle().
- Donor is not atomic. Currency moves for both sides before items move (SecureTrade.cs 277-322), and an exception between the two leaves a half trade. The donor code does not show a rollback. Our sketch uses dry run then commit.
- Client amounts are not validated. `reader.ReadInt32()` at IncomingMobilePackets.cs 142-143 is stored as-is. A negative offer is shown to the other player and transfers nothing (SecureTrade.cs 244 passes for a negative amount). Fix: reject at write (offerIsValid).
- No int32 cap on deposit. `TotalPlat += amount` (Account.cs 549) has no check. Fix: settle caps every balance (MAX_BALANCE) and refuses the batch.
- Gold offers for a player without an account are dropped silently: the currency path runs only when both players have accounts (SecureTrade.cs 275), and the VirtualCheck is skipped by the item loops (288). Fix: refuse at confirm with a message.
- Escrow difference. The donor moves offered items into a trade container (SecureTradeInfo ctor, 437-440) and returns them on cancel. Our model keeps items with the owner and checks ownership at commit, so a double offer of one item fails at the second settle. The item-removal hook (SecureTradeContainer.cs 48-54) is called by the donor's item moves; whether the removal path re-enters Update during the move loop was not read.
- Take-one loot: the donor has no take-one concept. Treat a taken item as `canTrade: false` by default and make the veto explicit, as the donor's `AllowSecureTrade` seam allows.
- Ethic veto: the hero or evil item split is a class-based veto (Ethic.cs 78). For Frankendom the same seam fits account-bound items and test-account items.
- Not found in this path: trade logs, rate limits, bot patterns, escrow for scheduled duel wagers, cross-zone trade. Our settle rows are the trade log.
- Vendor overflow: the resale branch adds `GetBuyPriceFor(item) * amount` to an int (BaseVendor.cs 210) with no overflow guard; the stock branch checks with long and refuses the whole order (1203). Not reproduced (not run). Fix: use the long accumulator and refuse the order, as the stock branch does.
- Staff buy for free (BaseVendor.cs 249). Frankendom must log this as a row or keep staff out of the shop path.
- The scalar expression (BaseVendor.cs 1353) works but reads wrong: no town gives scalar 0, which Price treats as base price. Fix: write `100 + (tax ?? 0)` explicitly.
