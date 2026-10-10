# 0ad-0ad (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Barter.js` | Licence: GPL-2.0-or-later (LICENSE.txt lines 17-18: "binaries/data/" is "GPL version 2 (or later) - see license_gpl-2.0.txt"; Barter.js has no header of its own) | JavaScript (0 A.D. simulation component) | symbol `Barter.prototype.ExchangeResources`

Checked: Read in full: Barter.js (1-149). Read in part: Player.js 1-12, 75-77, 185-196, 636-645; Commands.js 691-700; BarterButton.js 1-40 and 114-123; test_Barter.js 1-140; GuiInterface.js 135 (one line); template_player.xml 68-80; resources/metal.json (truePrice only; the other three resource files also read by grep, all 100). Callers: a grep of the whole public mod found one caller of `ExchangeResources`, Commands.js:699. The AI (petra tradeManager.js) reads `barterPrices` (lines 230-307) and was only grepped. Not read: Timer.js (the unit of the 5000 interval, and whether it is simulation time), the network or lockstep layer that delivers the "barter" command, Market.js and Trader.js (trade routes, a different mechanism), the rest of test_Barter.js (140 to end). Candidates opened: Barter.js, Player.js, Commands.js, BarterButton.js, test_Barter.js, LICENSE.txt. Confidence: high on the deal order, the price formula, the index move and the restore; medium on the timer's clock. Not a camera cell.

Best transferable idea: Move each traded resource's price index by a fixed step per fixed-size lot, clamp it, and let a slow timer pull it back to zero, so repeated trades get worse but recover on their own without a designer touching anything.

Decision (proposed): adapt — the impact-and-recovery shape is what a player-run market needs to resist being drained, but the index here is one shared number per market and the two ledger writes are separate calls, so Frankendom scopes the index to a zone market and makes the payment one server transaction.

Acceptance: Player view: trading 100 wood for stone gives 82 stone at the start; a second 100-wood trade gives 79; with no trades the rate returns to 82 in about 20 seconds (assuming the 5000 is milliseconds, which was not read). Server test: a 40-unit trade is refused and balances and indexes stay unchanged; after two 100-unit trades the wood index is -4 and the stone index is +4.

## 1. Mechanism

One market (the system entity `Barter`) holds one price index per barterable resource, starting at zero (Barter.js 43-48). The buy and sell prices of each resource are the true price times a shifted spread (50-58):

- buy price = truePrice x (100 + 10 + index) x buyMultiplier / 100
- sell price = truePrice x (100 - 10 + index) x sellMultiplier / 100

So at index 0 and multipliers 1, the hero pays 110% of true price to buy and receives 90% to sell.

`ExchangeResources(playerID, resourceToSell, resourceToBuy, amount)` (63-128) runs in this order:

1. Validate, in four early returns: amount above 0 (65-69), the sold resource is known (71-75), the bought resource is known (77-81), and the amount is exactly one lot (100) or a batch of five lots (500) (83-84).
2. Check the player may barter: `CanBarter()` (86-88). `Player.CanBarter` is true only when the player's `barterEntities` list is non-empty (Player.js 187-189).
3. Take the payment: `TrySubtractResources` for the sold amount (90-94). A refusal ends the call, and nothing is paid out.
4. Take a price snapshot with `GetPrices`, before any index moves (96), and compute the payout as `Math.round(sellPrice[sold] / buyPrice[bought] * amount)` (97). The per-player multipliers come from `GetBarterMultiplier()` (53; Player.js 192-194).
5. Credit the bought resource (98).
6. Send a barter notification (100-107) and bump the sold and bought statistics counters (109-114).
7. Move the indexes (116-124). The move is `2 x amount / 100` per call: 2 points for one lot, 10 points for a batch. The sold resource's index drops by that amount and the bought resource's index rises by it. Each index is clamped to plus or minus 89 (the cap is 99% of the lot minus the 10-point spread, lines 118 and 122-124).
8. If no restore timer is running, start one at a 5000 interval (126-127).

The restore is `ProgressTimeout` (130-147), which the timer calls every 5000 units. Each index moves toward zero by at most 0.5 per call (136). When every index is zero, the timer cancels itself and clears its handle (142-145).

Tick note (rule 6): the loop that drives the restore is the Timer interface (`SetInterval` at 127, handled by `ProgressTimeout`). It is an interval, not a per-frame accumulator. Whether the interval runs on simulation time or wall time was not read (Timer.js not read). Nothing in Barter.js runs per frame.

Example, derived from the formulas above and checked against the unit test's own arithmetic (test_Barter.js 105): with true price 100 for both wood and stone (the four resource files all say 100), at index 0, 100 wood gives round(90 / 110 x 100) = 82 stone. The wood index drops to -2 and the stone index rises to +2. The next 100 wood gives round(88 / 112 x 100) = 79 stone. Four restore ticks (-2 to -1.5 to -1 to -0.5 to 0) return the wood index to zero, which is 20 seconds if the timer is in milliseconds.

## 2. Key functions

- `Barter.prototype.GetPrices` (50-61): the buy and sell prices for one player. The result is sent to the client as `barterPrices` (GuiInterface.js 135), so the client shows the current numbers. The index can move before a trade lands, so a displayed price is not a promise.
- `Barter.prototype.ExchangeResources` (63-128): the whole trade, with the order above.
- `Barter.prototype.ProgressTimeout` (130-147): the restore step and the timer stop.
- `Barter.prototype.Init` (43-48): every index starts at zero.
- `Player.CanBarter`, `GetBarterMultiplier` (Player.js 187-194) and the multiplier modification hook (Player.js 639-644).
- Caller: `Commands.js` "barter" (696-700). The client posts it from BarterButton.js 37-41.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| One trade is one lot, or a batch of five lots | Lot 100 (Barter.js 13); batch 5 (Barter.js 19); other amounts refused (83-84) |
| Spread around true price | Plus or minus 10 points (Barter.js 26) |
| Index moves per lot | 2 points per 100 traded, so 2 per lot and 10 per batch (Barter.js 31, 116) |
| Index cap | 99% of the lot minus the spread: plus or minus 89 (Barter.js 118, 122-124) |
| Restore step | 0.5 points per timer call toward zero (Barter.js 36, 136) |
| Restore interval | 5000 (Barter.js 41, 127) |
| Per-player multipliers | Default 1.0 for each resource and each side (template_player.xml 68-78, the lines read) |
| True price | 100 for food, wood, stone and metal (resources JSON, `truePrice`; metal.json line 11; the other three files checked by grep) |

## 4. TypeScript sketch

simplified: the sketch keeps the lot rule, the spread, the price read before the index moves, the fixed move per lot, the clamp, and the timed restore to zero. It checks the balance up front, so it refuses before any write. The donor checks the balance inside `TrySubtractResources` (Barter.js 93). The sketch also reorders nothing else. It omits the statistics counters, the barter notification, the multiplier modification hook, the timer handle (the sketch's `restoring` flag stands in for it), and the network command that delivers a trade.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Resource = "food" | "wood" | "stone" | "metal";
const RESOURCES: Resource[] = ["food", "wood", "stone", "metal"];

interface Market {
  index: Record<Resource, number>;  // price difference in points; one index per market, not per player
  restoring: boolean;               // true while any index is away from zero
}

interface Catalogue {
  truePrice: Record<Resource, number>;
}

interface Wallet {
  canTrade: boolean;
  balance: Record<Resource, number>;
  mult: { buy: Record<Resource, number>; sell: Record<Resource, number> };
}

const LOT = 100;            // a trade is one lot or a batch of five
const BATCH = 5;
const SPREAD = 10;          // buy price sits 10 points above true price, sell 10 below
const PER_LOT = 2;          // each lot moves the sold index down 2 and the bought index up 2
const RESTORE_STEP = 0.5;   // each restore tick moves an index 0.5 toward zero
const CAP = 99 - SPREAD;    // indexes are held within +-89

const clamp = (x: number): number => Math.min(CAP, Math.max(-CAP, x));

function buyPrice(m: Market, c: Catalogue, w: Wallet, r: Resource): number {
  return c.truePrice[r] * (LOT + SPREAD + m.index[r]) * w.mult.buy[r] / LOT;
}

function sellPrice(m: Market, c: Catalogue, w: Wallet, r: Resource): number {
  return c.truePrice[r] * (LOT - SPREAD + m.index[r]) * w.mult.sell[r] / LOT;
}

// Checks first, then the payment, then the payout from prices read before the index moves.
export function trade(m: Market, c: Catalogue, w: Wallet, from: Resource, to: Resource, amount: number): number | "refused" {
  if (amount !== LOT && amount !== BATCH * LOT) return "refused";
  if (!w.canTrade) return "refused";
  if (w.balance[from] < amount) return "refused";

  const payout = Math.round(sellPrice(m, c, w, from) / buyPrice(m, c, w, to) * amount);

  w.balance[from] -= amount;
  w.balance[to] += payout;

  const move = (PER_LOT * amount) / LOT;
  m.index[from] = clamp(m.index[from] - move);
  m.index[to] = clamp(m.index[to] + move);
  m.restoring = true;
  return payout;
}

// Runs on a timer while restoring. Each index moves back toward zero by at most RESTORE_STEP.
export function restoreTick(m: Market): void {
  let pending = false;
  for (const r of RESOURCES) {
    m.index[r] -= Math.min(RESTORE_STEP, Math.max(-RESTORE_STEP, m.index[r]));
    if (m.index[r] !== 0) pending = true;
  }
  m.restoring = pending;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/economy/barter.ts` (new; the Frankendom repo was not read, so this path is a proposal). Economy is not in src/fight, so no fight module applies.
- Parity-checklist row 21 (catalogue fields). The true price of each resource is a catalogue field, and the lot size, spread, step and restore interval are data for a zone market. Row 21 is the closest of rows 1-23. Row 18 (loot roll and XP award) does not cover prices, so it is not used.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger and server-verified (Frankendom rulings); licence rule 7 (copyleft: clean-room, shape only)

## 6. Gaps and risks

- One index for the whole market: `priceDifferences` lives on the system entity (Barter.js 45, 47), not on a player, so every player's trade moves the same prices. Frankendom must choose a scope. Zones as data suggests one index per zone market, not one per match.
- Two ledger writes, not one transaction: the payment is `TrySubtractResources` (93) and the payout is `AddResource` (98) in two calls. The donor has no rollback path after the payment. Frankendom makes the trade one server transaction that either moves both or neither.
- Rounding mints or burns a unit: the payout is `Math.round` (97). Frankendom must pick the direction (round down is safer against minting) and write it as a rule, not an accident.
- Client duplicates a constant: BarterButton.js 116 keeps `BarterResourceSellQuantity = 100`, and the comment at 114 asks it to "match with the simulation". Frankendom sends the lot size from the server or the catalogue, not a second copy.
- Multipliers are per player and modifiable: `barterMultiplier` is rebuilt from value modifications (Player.js 639-644). A faction or tech bonus here changes buy and sell prices for one player only. Frankendom must decide whether such bonuses live in zone data or the engine.
- The trade is only as trusted as the command path. `playerID` arrives from the command dispatcher (Commands.js 696-699, the `player` argument), and how the dispatcher authenticates it was not read. The validation order (lot, ability to trade, balance, then payment) is what carries over; the trust model does not, because this is a simulation command, not a server-side check in Frankendom's sense.
- Timing unit not read: the 5000 interval and whether it is simulation time (Timer.js not read). Frankendom needs one clock; the restore must not depend on a client frame rate.
- Two markets are not compared: Market.js and Trader.js (trade routes) were not read, so the trade-route income mechanism is not part of this note.
- Not read: Timer.js, the network or lockstep layer, the rest of test_Barter.js from line 140, the AI's use of `barterPrices` beyond grep.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger and server-verified (Frankendom rulings); licence rule 7 (copyleft: clean-room, shape only)
