# opentibiabr-otclient (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua` | Licence: MIT (LICENSE line 1: "OTClient is made available under the MIT License") | Lua | symbols `onPiecePriceEdit` (fee preview, 1628-1780) and `createMarketOffer` (buy pre-check, 1802-1880)

Checked: Read: `t_market.lua` 1600-1884 (fee formula, preview, buy pre-check, sell stock check, create call) and 1418-1442 (sell-side affordability). Read: `market_helpers.lua` 35-38 and 74-81 (`convertGold`, `getTotalMoney`), `gamelib/market.lua` line 4. Cross-checked against the server (not this cell's note; read for the mismatch only): `otland-forgottenserver/src/game.cpp` 5203-5330 (`playerCreateMarketOffer`, `playerCancelMarketOffer`), `src/const.h` 8-9, `config.lua.dist` 74-77. Camera scope: not a camera cell. Confidence: high on every number quoted (each read in place). Not read: the engine-side `g_game.createMarketOffer` send path (C++, not in this donor's Lua), the offer list and history rendering, and the server accept path beyond line 5390. Cell N = 11 (the cells file category_no).

Best transferable idea: one shared pure fee function (rate of gross, floor, cap, all as zone data) computes both the server debit and the client preview, so the two cannot drift.
Decision (proposed): adapt — keep the shape (listing fee charged at creation, buy pays gross plus fee, sell pays fee only) but compute it in one shared function; reject this donor's duplicated client copy, which already disagrees with the server (2 percent versus 1 percent, round up versus round down, cap 1,000,000 versus 100,000).
Acceptance: a server test lists 10 units at 10,000 gold and asserts the buyer is debited 101,000 (100,000 gross plus a 1,000 fee), and the client preview for the same inputs shows 1,000 because both call the same `listingFee`.

## 1. Mechanism

- This is a client. It does not own money or items. Its job: show the player what a listing will cost or pay before they send it.
- Inputs: unit price (typed by the player, `numericValue`) and amount (scroll bar). Step 1: `fee = ceil((price / 50) x amount)`, which is 2 percent of gross, rounded up (1667). Step 2: floor 20 and cap 1,000,000 (1668-1671). Step 3: gross = price x amount (`grossProfit = numericValue * amount`, 1710 buy branch and 1772 sell branch). Step 4: for a buy listing the preview shows gross plus fee (1713); for a sell listing it shows gross minus fee (1775).
- Create (`createMarketOffer`, 1802): recomputes the same fee (1837-1842). For a buy listing it refuses if `getTotalMoney() < gross + fee` (1844-1845). For a sell listing it refuses if the depot holds fewer items than the amount (`itemCount < amount`, 1854-1857). Then it sends the offer. The server re-computes everything (see cross-check below).
- The client holds a second copy of the fee rule. The server holds another (cell 2 covers the server in full). The two copies differ: see section 3.
- Tick and timing: not applicable. Event-driven: the preview runs on each keystroke or scroll change (`onPiecePriceEdit`, `updateCreateCount` 1610-1626).

## 2. Key functions

- `onPiecePriceEdit`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua` 1628-1778. Fee preview; the fee line is 1667 and the clamp is 1668-1671.
- `createMarketOffer`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua` 1802-1884. Pre-checks (amount and price positive, buy total affordability at 1837-1845, sell stock in the else branch at 1854) then the send at 1874.
- `changeOfferType`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua` 1780-1800. Switches the preview labels: "Gross Profit" for sell, "Price" for buy (the fee sign flips between them).
- `getTotalMoney`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/market_helpers.lua` 74-81. Returns the player's total gold (the donor's API; the bank and inventory split is not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing fee is a rate of gross, floored and capped | Client: rate 1/50 (2 percent), round up, floor 20, cap 1,000,000 (t_market.lua 1667-1671). Server: rate 1/100 (1 percent), round down, floor 20, cap 100,000 (game.cpp 5251-5255; const.h 8-9). |
| Buy listing pays gross plus fee up front; sell listing pays the fee only | Same sign rule on both sides (client 1713, 1775; server 5292 buy total, 5286 sell fee) |
| Preview equals the debit | Not true in this donor. At price 10,000 gold x 10 units (gross 100,000) the client shows a fee of 2,000 and the server debits 1,000. At gross 100,000,000 the client shows 1,000,000 and the server debits 100,000. |
| Refund on cancel | Server refunds the gross of a buy to the bank (game.cpp 5328) and never the fee. The fee is a sink. |
| Max offers per player | Client constant `MarketMaxOffers = 100` (gamelib/market.lua 4). Server default `maxMarketOffersAtATimePerPlayer = 100` (config.lua.dist 77). These agree. |

Worked numbers, from the code:
- Client, price 10,000 x amount 10: `ceil((10000/50) x 10)` = 2,000. Server: `(10000/100.) x 10` = 1,000 (game.cpp 5251). Different.
- Client, gross 100,000,000: raw 2,000,000, capped 1,000,000 (1670-1671). Server: raw 1,000,000, capped 100,000 (5254-5255).

## 4. TypeScript sketch

simplified: one shared pure function (`listingFee`) computes the fee for both the server debit and the client preview, using integer basis points instead of a float divide, and rounds down. It reorders nothing from the donor's sign rule. It omits: the Lua 2^53 overflow guards (a Lua float artifact), the Tibia-coin 25-unit step, the depot stock check, the premium gate, the offer-count limit, the anonymous flag, and every refund path (the sketch's cancel is not written; the donor refunds gross to bank and keeps the fee, which this sketch does not reproduce).

```ts
// Licence: MIT (donor, OTClient). Clean-room shape, written from the described mechanism.
export interface FeeRule {
  basisPoints: number; // listing fee rate in basis points of gross (100 = 1 percent)
  min: number;         // floor, gold
  max: number;         // cap, gold
}

export interface Wallet { cash: number; bank: number; }

// One pure function. The server calls it for the debit; the client preview must call this same export.
export function listingFee(gross: number, rule: FeeRule): number {
  const raw = Math.floor((gross * rule.basisPoints) / 10000); // integer math, rounds down
  return Math.min(rule.max, Math.max(rule.min, raw));
}

// Takes gold from cash first, then bank. Returns null when the total cannot be covered.
export function takeFromWallet(w: Wallet, amount: number): Wallet | null {
  if (amount > w.cash + w.bank) return null;
  const fromCash = Math.min(w.cash, amount);
  return { cash: w.cash - fromCash, bank: w.bank - (amount - fromCash) };
}

// Buy listing: gross plus fee is paid at creation.
export function listBuy(w: Wallet, unitPrice: number, amount: number, rule: FeeRule): { fee: number; wallet: Wallet } | null {
  const gross = unitPrice * amount;
  const fee = listingFee(gross, rule);
  const after = takeFromWallet(w, gross + fee);
  return after === null ? null : { fee, wallet: after };
}

// Sell listing: only the fee is paid here. The caller removes the items.
export function listSell(w: Wallet, unitPrice: number, amount: number, rule: FeeRule): { fee: number; wallet: Wallet } | null {
  const fee = listingFee(unitPrice * amount, rule);
  const after = takeFromWallet(w, fee);
  return after === null ? null : { fee, wallet: after };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at `/tmp/opentibiabr-otclient-listing-fee.ts`: passed.

## 5. Lands in

- TARGET `origins/server/market.ts` (proposed new module; not read in the Frankendom tree, does not exist as far as this read goes). The one fee function and the wallet debit live here; the client preview imports `listingFee` from the same file.
- Parity-checklist row: 21 (catalogue fields). This is a stretch. The fee rate, floor and cap are catalogue or zone data, so row 21 is the closest of rows 1-23. None of rows 1-23 covers a player market directly; say so if Lead wants a new row.
- Reuse tag: adapt-allowed (MIT, so the code may be adapted; this note keeps the shape only and copies no lines)
- Brief rule served: one ledger (the server computes the debit; the client previews with the same function); zones as data (rate, floor and cap are data fields)

## 6. Gaps and risks

- The donor already has the failure we must avoid. The client and the server each compute the fee, and they disagree: rate 2 percent versus 1 percent, round up versus round down, cap 1,000,000 versus 100,000. A player is shown one fee and charged another. Frankendom must have one function, and the client calls it for previews only.
- The client's affordability check (`getTotalMoney() < totalCost`, 1845) is a UX check. The server does its own check (game.cpp 5293, `totalPrice > (playerMoney + player->bankBalance)`). The server is the authority; the client check must never be the only one.
- The fee is not refunded on cancel (game.cpp 5328). Frankendom must decide whether listing fees are a sink (as here) or refundable. Pick one and write it into the economy rules; do not leave it to the code.
- The refund goes to the bank balance, not to cash (game.cpp 5328). This is a ledger choice: state which wallet a refund lands in.
- Creating an offer needs a premium account by default (game.cpp 5227, config.lua.dist 75). That is a monetisation gate, not an economy mechanism. The addendum's ruling list says nothing about a premium tier (the full Frankendom ruling set was not read); leave it out unless Strategy adds one.
- Donor is a client for a Tibia-style market. The real rules (expiry, matching, history) live in the server and are cell 2's job. Nothing in this note verifies server-side expiry.
- Lua numbers are floats, so the client needs overflow guards (1697, 1826) that Frankendom does not need if it uses integers throughout.
