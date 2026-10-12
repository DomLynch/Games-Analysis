# rathena-rathena (trading-barter-vendors, cell 1)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` | Licence: GPL-3.0 (LICENSE file is GNU GPL v3; trade.cpp header says "Licensed under GNU GPL") | C++ | symbol `trade_tradecommit`

Checked: `trade.cpp` read in full (686 lines; function start lines: request 31, accept 108, impossible_trade_check 181, trade_check 247, add item 351, add zeny 471, OK 498, cancel 520, commit 586). `pc.hpp` 410 and 714-718, `pc.cpp` 5689-5715, `itemdb.cpp` 3283-3290 and the `battle.cpp` config rows (8543, 8907) read. Confidence: high on the trade window order of operations. Medium on the partner-edit gap: the server code shows no freeze, but client-side blocking was not read. Not read: `check_distance_bl`, the bodies of `pc_additem`, `pc_delitem`, `pc_checkadditem`, `pc_inventoryblank`, the trade packets in clif, the barter loader beyond `npc.cpp` 394-800 (barter execution not read), `vending.cpp` (not read). camera_scope: not applicable (trade topic).

## 1. Mechanism

- Two characters trade through a 2-step confirm. The window is a per-character state with a 2-bit `deal_locked` flag: 0 = editable, 1 = clicked OK (own offer locked), 2 = clicked Trade (ready to commit).
- Order of steps as the code runs:
  - (a) Request (`trade_traderequest`, 31): refused on no-trade maps, when the target is missing or self, when the target is in an NPC or in another trade, or when the target has a pending guild/party invite (unless `invite_request_check` is on). Refused when the characters are on different maps or farther than TRADE_DISTANCE (2) unless the requester has the @trade right (81). A pending trade with someone else is cancelled first. The partner ids are set on both sides and the target gets the request. Neither side is in the trading state yet.
  - (b) Accept (`trade_tradeack`, 108): accept is type 3, cancel is type 4 (line 129 resets both sides). Accept re-checks distance (the characters may have warped, per the code comment), refuses if either side is in an NPC, vending, buying store or storage, and only then sets `trading = 1` on both (165-166) and clears both deal structs.
  - (c) Offer (`trade_tradeadditem`, 351; `trade_tradeaddzeny`, 471): allowed only while the caller is trading and its own `deal_locked` is 0 (360, 477). Item rules: amount must be in range; the item must be tradeable for both GM levels (`itemdb_cantrade`), or partner-tradeable; rental items and hatched eggs are refused; account/guild-bound items are refused unless the bound-trading right exists (399); a free slot among 10 is needed (414); the receiver must have room for the item (`pc_inventoryblank`, 432); the receiver's weight limit covers both offers (438). Zeny is capped at the caller's zeny and at MAX_ZENY minus the partner's zeny (485). Any invalid zeny amount cancels the whole trade (486).
  - (d) OK (`trade_tradeok`, 498): sets the caller's `deal_locked = 1` (510) and sends the lock flags to both clients. This is step 1. The partner's flag is not touched.
  - (e) Trade (`trade_tradecommit`, 586): sets the caller's `deal_locked = 2` (601). It returns and waits until the partner is also at 2 (603). Then the server re-runs `impossible_trade_check` on the caller (608) and on the partner (the same call follows for the partner): offered zeny above held zeny sets the `ZENY_HACKER` register and returns -1 with no GM message and no ban (188-191); an offered item count above the inventory count is the hack flag that messages GMs and, if `ban_hack_trade` is above 0, bans the account (203-224). Either way the trade is cancelled. Then `trade_check` on both sides (620): both zeny caps and both receivers' stack and slot capacity are verified against copies of the inventories, so nothing moves before the check passes.
  - (f) Move (lines 630-655): items move one slot at a time. For each slot, `pc_additem` puts the item on the partner (633). Only if that returns 0 is the source removed with `pc_delitem` (634-635). If the add failed, the item is put back on the owner's client (637), so the item stays with its owner. The other direction runs the same pattern (about 641-652). Zeny moves with `pc_payzeny` from the payer and `pc_getzeny` to the receiver, both logged as LOG_TYPE_TRADE (656-657, and the reverse).
  - (g) Close: both sides get `deal_locked = 0`, `trading = 0` and cleared `trade_partner` (668-675), clients are told complete (678-679), and both characters are saved when the `CHARSAVE_TRADE` flag is set (chrif_save at 683).
- Cancel (`trade_tradecancel`, 520) works at any step. Before `trading` is set it only clears the partner pointers. After that it returns each side's offered items to its own client (virtual only; nothing was moved) and zeny to zero, clears both locks and cancels both windows.
- Tick: not a loop. Every step is one client packet and one synchronous server call. No timer, no per-frame work.

## 2. Key functions

- `trade_traderequest`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` 31-106. Request, range and partner set-up.
- `trade_tradeack`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` 108-179. Accept or cancel, re-check of range and busy states, `trading = 1`.
- `impossible_trade_check`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` from line 181. Commit-time hack check: zeny and item counts against the live inventory; response set by `ban_hack_trade`.
- `trade_check`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` from line 247. Commit-time capacity check on copies of both inventories: stack max and free slots for both sides; both zeny caps.
- `trade_tradeadditem`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` from line 351. Offer rules (see section 1 c).
- `trade_tradeok`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` from line 498. Step 1 lock, caller only.
- `trade_tradecancel`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` from line 520. Return of virtual items, reset of both sides.
- `trade_tradecommit`: `/mnt/frankendom-donors/rathena-rathena/src/map/trade.cpp` from line 586. Step 2: wait for both at 2, re-check, move items and zeny, reset, save.

## 3. Numbers vs mechanism

| Item | Donor formula or value | Range or default | file:line |
|---|---|---|---|
| Trade range | in range when `check_distance_bl(..., TRADE_DISTANCE)` (metric not read) and same map (`sd->m != target_sd->m`) | 2 tiles; same map required unless @trade | trade.cpp:24, 81 |
| Item slots per side | `ARR_FIND( 0, 10, trade_i ...)` | 10 | trade.cpp:414 (pc.hpp:717 `} item[10];` not receipted) |
| Lock states | `deal_locked`: 0 editable, 1 after OK, 2 after Trade | 2-bit field | pc.hpp:410, trade.cpp:510, 601 |
| Commit gate | commit waits while partner `deal_locked < 2` | both must be 2 | trade.cpp:603 |
| Receiver item slots | need `pc_inventoryblank(target) >= inventory_space + 1` when the item is counted | +1 per counted item | trade.cpp:432 |
| Stackable counts a slot | `count_stackable = (trade_count_stackable == 1) \|\| (add_item != EXIST)` | config default 1 (table column) so a stack always counts | trade.cpp:429; battle.cpp:8907 |
| Stack max | merge refused when sum > MAX_AMOUNT | value not read | trade.cpp:283 (and 322) |
| Receiver weight | `target.weight + deal.weight + trade_weight <= target.max_weight` | weight units; cap per character | trade.cpp:438 |
| Zeny offer | `0 <= amount <= sd.zeny` and `amount <= MAX_ZENY - partner.zeny` | MAX_ZENY = INT_MAX = 2147483647 | trade.cpp:485; common/mmo.hpp:82 |
| Hack response | `ban_hack_trade` default 0: item-count hack cancels the trade and tells GMs, no ban; > 0 bans for `ban_hack_trade*60` (the code has a `< 0` block-login branch at 214, but the config row's minimum is 0, so it cannot be reached by config); the zeny hack never messages or bans | 0 default (range 0 to INT_MAX); minutes x 60 in the ban call | trade.cpp:217, 224; battle.cpp:8543 |
| Bound items | refused when account bound, bound above guild, or guild bound to another guild, unless `pc_can_give_bounded_items` | flag | trade.cpp:399 |
| Fee or tax on trades | none found in trade.cpp (whole file read) | 0 | none |
| NPC buy price | `orig x (100 - r) / 100`, `r = max(5 + 2*lvDisc - (lvDisc==10), 5 + 4*lvRogue)` where each rate counts only when that skill level is above 0 (at both levels 0, r = 0 and the price is unchanged), floored at `min_shop_buy` | lv 1 = 7 %, lv 10 = 24 % (merchant); skill cap not read | pc.cpp:5693, 5695, 5698-5699 |
| NPC sell price | `orig x (100 + r) / 100`, `r = 5 + 2*lvOver - (lvOver==10)` only when OverCharge level is above 0 (r = 0 otherwise), floored at `min_shop_sell` | lv 1 = 7 %, lv 10 = 24 % (OverCharge) | pc.cpp:5711-5714, 5715 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's two-step order (OK locks, Trade commits, commit waits for both), the range gate, the 10-slot cap, the zeny cap, the commit-time re-check, and the fail-closed rule (nothing moves if the settle fails). It omits: the donor's bound, rental, equip, hatched-egg and GM-level checks; the weight and stack-max checks; the packet and client UI; the hack-flag ban path; the chrif save; the log rows. It reorders one thing on purpose: the donor moves items one slot at a time with add-then-delete, and the sketch builds every row first and applies them all in one all-or-nothing copy (the Frankendom one-ledger door). It also fixes one donor gap: any edit clears both OK flags, so the partner cannot change the offer after the other side pressed OK. The sketch uses a Chebyshev distance as a placeholder for `check_distance_bl` (not read).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TRADE_RANGE = 2;      // tiles (donor: TRADE_DISTANCE 2)
const MAX_SLOTS = 10;       // item slots per side (donor: deal.item[10])
const MAX_ZENY = 2147483647; // donor: MAX_ZENY INT_MAX

interface Line { itemId: string; qty: number; }
interface Offer { lines: Line[]; zeny: number; }
interface Trader {
  id: string; x: number; y: number;
  inv: Map<string, number>; zeny: number;
  offer: Offer;
  ok: boolean;          // step 1: OK locks this side's offer
  committed: boolean;   // step 2: Trade
}
interface Trade { a: Trader; b: Trader; open: boolean; }
type Result = { ok: true } | { ok: false; reason: string };
type Row = { from: string; to: string; itemId?: string; qty?: number; zeny?: number };

const fail = (reason: string): Result => ({ ok: false, reason });

function inRange(a: Trader, b: Trader): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= TRADE_RANGE;
}
function other(t: Trade, who: Trader): Trader { return who === t.a ? t.b : t.a; }

// Donor rule kept: a locked side cannot edit. Fixed: any edit clears BOTH OK flags,
// because the donor checks only the caller's lock and lets the partner change after OK.
function setOffer(t: Trade, who: Trader, offer: Offer): Result {
  if (!t.open) return fail("trade not open");
  if (who.ok) return fail("locked: cancel to edit");
  if (offer.lines.length > MAX_SLOTS) return fail("too many slots");
  if (offer.zeny < 0 || offer.zeny > who.zeny) return fail("not enough zeny");
  for (const l of offer.lines) {
    if (l.qty <= 0 || (who.inv.get(l.itemId) ?? 0) < l.qty) return fail("not enough " + l.itemId);
  }
  who.offer = offer;
  t.a.ok = false;
  t.b.ok = false;
  t.a.committed = false;
  t.b.committed = false;
  return { ok: true };
}

function press(t: Trade, who: Trader): Result {
  if (!t.open) return fail("trade not open");
  if (who.ok) return fail("already locked");
  if (!inRange(t.a, t.b)) return fail("too far");
  who.ok = true;
  return { ok: true };
}

function rowsFor(t: Trade): Row[] {
  const rows: Row[] = [];
  for (const [src, dst] of [[t.a, t.b], [t.b, t.a]] as const) {
    for (const l of src.offer.lines) rows.push({ from: src.id, to: dst.id, itemId: l.itemId, qty: l.qty });
    if (src.offer.zeny > 0) rows.push({ from: src.id, to: dst.id, zeny: src.offer.zeny });
  }
  return rows;
}

// All-or-nothing: apply every row to a copy; any failure returns null and nothing changes.
function applyRows(traders: Trader[], rows: Row[]): Map<string, { inv: Map<string, number>; zeny: number }> | null {
  const next = new Map<string, { inv: Map<string, number>; zeny: number }>();
  for (const t of traders) next.set(t.id, { inv: new Map(t.inv), zeny: t.zeny });
  for (const r of rows) {
    const from = next.get(r.from);
    const to = next.get(r.to);
    if (!from || !to) return null;
    if (r.itemId !== undefined && r.qty !== undefined) {
      const have = from.inv.get(r.itemId) ?? 0;
      if (have < r.qty) return null;
      from.inv.set(r.itemId, have - r.qty);
      to.inv.set(r.itemId, (to.inv.get(r.itemId) ?? 0) + r.qty);
    } else if (r.zeny !== undefined) {
      if (from.zeny < r.zeny || to.zeny > MAX_ZENY - r.zeny) return null;
      from.zeny -= r.zeny;
      to.zeny += r.zeny;
    }
  }
  return next;
}

// Step 2: commit. Both sides must be locked; the server re-validates and settles once.
function commit(t: Trade, who: Trader): Result {
  if (!t.open) return fail("trade not open");
  if (!who.ok) return fail("press OK first");
  who.committed = true;
  const partner = other(t, who);
  if (!partner.committed) return { ok: true };
  if (!partner.ok) return fail("partner not locked");
  const next = applyRows([t.a, t.b], rowsFor(t));
  if (next === null) {                 // nothing moved; both offers reset
    t.a.ok = t.b.ok = t.a.committed = t.b.committed = false;
    t.open = false;
    return fail("settle refused");
  }
  for (const tr of [t.a, t.b]) {
    const v = next.get(tr.id);
    if (v) { tr.inv = v.inv; tr.zeny = v.zeny; }
    tr.offer = { lines: [], zeny: 0 };
    tr.ok = false;
    tr.committed = false;
  }
  t.open = false;
  return { ok: true };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (typescript 7.0.2): exit 0.

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed new module; the path was not checked in the Frankendom repo from this box). The commit step is the only write path and calls the one ledger door `settle()`.
- Parity-checklist row 18 (loot ownership and XP award; trade is ownership transfer). Sub-line: one ledger, settle() is the only door; barter = two settle rows, never a side table. Not row 5 (input) and not row 23 (zones).
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room only)
- Brief rule served: one ledger (every item and zeny move is a settle row); server-verified outcome (re-check at commit); take-one loot: a traded item is still owned by one character at all times.

Best transferable idea: a trade is two locks and one commit: each side locks its own offer, the server settles only when both locks are current, and any change releases both locks so nothing can be swapped after a confirm.
Decision (proposed): adapt — keep the donor's two-step confirm (OK then Trade), the range gate, the commit-time re-check and the fail-closed rule, but make OK a joint freeze (any edit clears both OKs) and settle all rows in one all-or-nothing transaction. The per-item add-then-delete loop is the donor's one-ledger gap; do not copy it.
Acceptance: a server test where A offers 5 potions, B presses OK, then A changes the offer to 1 potion: both OK flags are cleared and B's next Trade press does not commit; a second test where B is one potion short at commit (the fixture removes the potion from B's inventory after `setOffer`, since `setOffer` already refuses an offer B cannot cover): the whole trade is refused and both inventories and zeny totals are unchanged.

## 6. Gaps and risks

- Partner edit after OK (donor defect, fix: as above): `trade_tradeadditem` checks only the caller's own `deal_locked` (trade.cpp:360 and 477). After A presses OK, B can still change B's offer, and the commit then uses the changed offer. Client-side blocking may exist (not read). Fix: any change clears both OK flags.
- Not atomic (donor defect, reasoned from the order of calls; not tested): items move one slot at a time with add then delete (633-635), and zeny moves after items (656). If the partner add succeeds and the owner delete then fails, the item exists twice; a crash between steps leaves a partial trade. Fix: one settle transaction (the sketch's all-or-nothing copy), with the ledger write as the commit point.
- Hack path depends on config: `ban_hack_trade` defaults to 0, which cancels the trade and notifies GMs but does not ban (trade.cpp:217; battle.cpp:8543); the zeny-hack branch never notifies or bans at all (188-191). Frankendom should decide the response in code: a hack flag needs a block or a ban in the server, not only a log line.
- No tax, fee or cap on trade volume beyond 10 slots per side and INT_MAX zeny (trade.cpp:414, common/mmo.hpp:82). Frankendom's trade limits and sinks must come from data.
- Bound items use account and guild bound flags (trade.cpp:399). Frankendom's "bound pieces" and test accounts are not in the donor; add them as item flags.
- Presence: the donor needs the same map and 2 tiles, unless @trade. Frankendom's cross-zone trade (presence) is not covered; a zone-hop trade needs its own rule.
- NPC price formulas (pc.cpp 5689-5715) are a skill-discount and skill-markup pair with floors. They are small and transferable as data (rate per skill level, floor per shop), but the vendor stock refresh and the barter loader (npc.cpp 394-800) were not read. The barter execution path is not read; do not claim it.
- GPL-3.0: clean-room only. The sketch is written from the described mechanism.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified OK: two-step deal_locked (OK=1, Trade=2, commit waits until partner 2, trade.cpp 586-606); impossible_trade_check then trade_check order; add-then-delete move loop 630-655 with clif_additem put-back; zeny pay/get after items; TRADE_DISTANCE 2 (line 24) and range gate at 81 incl. @trade exemption; 10 slots (ARR_FIND 0,10); caller-only lock checks at 360 and 477 so the partner-edit-after-OK defect is real server-side; zeny cap vs MAX_ZENY - partner zeny cancels trade; inventory_space +1 and trade_count_stackable default 1 (battle.cpp 8907); weight check covers receiver; bound-items rule; CHARSAVE_TRADE save; MAX_ZENY INT_MAX mmo.hpp:82; NPC price formulas pc.cpp 5689-5715 with lv1=7%, lv10=24%; GPL-3 LICENSE and trade.cpp header. ERRORS: (1) hack response: only the ITEM-count branch of impossible_trade_check runs the GM message and block/ban logic (lines ~203-224); the zeny-hack branch (sd->deal.zeny > zeny) just sets ZENY_HACKER=1 and returns -1 with no GM message or ban. Note says the zeny-or-item hack flags cancel and block/ban. (2) 'ban_hack_trade < 0 block the login' is unreachable by config: battle.cpp:8543 declares min 0 (default 0, max INT_MAX); only the > 0 ban path is configurable. (3) NPC buy-price formula written as r = max(5+2*lvDisc-..., 5+4*lvRogue) omits the guard that each rate applies only when the skill level is > 0 (pc.cpp 5689-5694); at level 0 the donor gives 0%, a literal port gives 5%. (4) Table says 'Stack max: merge refused when sum > MAX_AMOUNT trade.cpp:283' - not rechecked line; remaining cites plausible. Acceptance tests are consistent with the sketch (A edits -> setOffer clears both ok/committed -> B Trade press fails 'press OK first'; short-potion commit -> applyRows null -> nothing changes). Note: to make the 'B one potion short' test fail at commit rather than at offer time the fixture must mutate B's inventory after setOffer, since setOffer already validates.
Missed: Not missed in trade.cpp; vending.cpp and barter execution not read (admitted).

Fixed 2026-10-12 (Sonnet fixer): hack response corrected (only the item-count branch messages GMs or bans; zeny hack just sets ZENY_HACKER, verified trade.cpp 188-224); ban_hack_trade < 0 marked unreachable by config (battle.cpp 8543 minimum 0); NPC price formulas now state the skill-level-above-0 guard (pc.cpp 5689-5715); second acceptance test fixture clarified. Stack max cite 283 verified. Sketch unchanged. Also found: none.
