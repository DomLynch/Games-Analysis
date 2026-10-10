# ax-grymyr-l2dn-server (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/InstanceManagers/WorldExchangeManager.cs` | Licence: MIT (LICENSE.txt: "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project") | C# | symbol `WorldExchangeManager` (`registerItemBid`, `checkBidStatus`, `buyItem`, `takeBidMoney`, `cancelBid`)

Checked: read `WorldExchangeManager.cs` at 36-82 (constructor and timer), 118-198 (status tick), 256-376 (fee and register), 382-384 (date helper), 433-494 (cancel), 495-569 (claim), 636-736 (buy). Read `L2Dn.GameServer/Config/WorldExchange.ini` in full (55 lines), `Config.WorldExchange.cs` in full, the register packet `ExWorldExchangeRegisterItemPacket.cs` (lines 15-31), and the two id constants in `Inventory.cs` (33, 39). Not read: `returnItem` (570-639), `getItemStatusAndMakeAction` (392-432), `loadItemBids` (199-255), `createItem` (737-765), `insert` (1049-1095), the `Map` class used for `_itemBids`, and the caller in `DailyTaskManager.cs` (only found by grep). Confidence high on fee order and state machine; medium on the tick's behaviour under concurrent edits (Map semantics not read). camera_scope: n/a.

## 1. Mechanism

- A player market. A seller registers a stack of one item with a price. Buyers pay in the premium currency LCoin (id 91663, Inventory.cs:39). The listing fee is paid in adena (id 57, Inventory.cs:33). The seller claims the sale price minus a tax later.
- Register (`registerItemBid`, 281-376), in order:
  (a) feature flag (283-286 region, read); (b) at most 10 open bids per seller (289-292); (c) the item must be in the inventory (read); (d) amount >= 1, price >= 1, amount x price >= 1 (301-305); (e) fee from `calculateFeeForRegister` (256-272): for adena the fee is `priceForEach * 100` flat (267), otherwise `priceForEach * amount * AdenaFee` (270); (f) cap at MaxAdenaFee when it is not -1 (309-311); (g) the seller must hold that much adena (313-317), and a fee below 1 is refused; (h) the stack is detached from the inventory (347); (i) the item's category is looked up (355); if it is missing the function returns FAIL, and by then the stack is already detached (read; I did not trace `detachItem` so I cannot say where the stack ends up); (j) the fee is removed from adena (363); (k) the bid's end time is now + ItemSellPeriod days (364); (l) the bid is stored with `priceForEach` as its price (365-366) and written to the database unless DBLazy is set.
- Status tick (`checkBidStatus`, 118-198), on a ThreadPool fixed-rate timer every BidItemsIntervalStatusCheck ms (46-47; default 30000 ms per the ini at line 18). Only bids whose end time has passed are changed (130). REGISTERED becomes OUT_TIME with a new end time of now + ItemBackPeriod days (144-145). SOLD or OUT_TIME becomes NONE and the item is set VOID (156), which removes it. NONE is removed from the map (139).
- Buy (`buyItem`, 640-689): the bid must be REGISTERED (read, before 669); the buyer's LCoin count must be at least the price (669-672); the price is destroyed from the buyer's LCoin (676); the bid is replaced with a SOLD record for the seller whose end time is now + PaymentTakePeriod days (678-680); the original stack is added to the buyer (686). If that add returns null, the function sends FAIL, and the code's own TODO says the transfer is not transactional (689).
- Claim (`takeBidMoney`, 495-569): the bid must be SOLD and the claim must be inside its end time (541). The tax is price x LCoinFee, capped at MaxLCoinFee (550-551). The seller is credited price minus tax in LCoin (552). The sold item is set VOID (555). The tax is never credited to anyone, so it is a sink.
- Cancel (`cancelBid`, 433-494): allowed when the bid is not NONE and not SOLD (read). The stack is returned (480) and the bid goes to NONE. The registration fee is not refunded: the function has no adena credit (read the whole body).

## 2. Key functions

- `registerItemBid`: `WorldExchangeManager.cs` 280-376 (attribute `Synchronized` at 280). Validation, fee, detach, fee charge, bid creation.
- `calculateFeeForRegister`: `WorldExchangeManager.cs` 256-272. Adena flat rule; otherwise price x amount x rate.
- `checkBidStatus`: `WorldExchangeManager.cs` 118-198. Expiry state machine, run by the timer set at 46-47.
- `buyItem`: `WorldExchangeManager.cs` 640-689. No `Synchronized` attribute (none above line 640 in the block; read).
- `takeBidMoney`: `WorldExchangeManager.cs` 495-569. Tax and credit.
- `cancelBid`: `WorldExchangeManager.cs` 433-494. Return of stack, no fee refund.
- Config: `L2Dn.GameServer/Config/WorldExchange.ini` (values and comments); `L2Dn.GameServer.StaticData/Configuration/Config.WorldExchange.cs` 28-30 (parsing with defaults).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing fee charged up front, proportional to value listed, optionally capped, not refunded on cancel | AdenaFee 100.0 (ini 33; code 270); MaxAdenaFee -1 (ini 38). See the unit warning below. |
| Adena listing flat fee for adena itself | priceForEach x 100 (theirs, 267), not a config key |
| Sale tax taken out of the proceeds, capped | LCoinFee 0.05 (ini 23; config 28), MaxLCoinFee 20000 (ini 28; code 551) |
| Open listings per seller | 10 (theirs, 289) |
| Three timers on a listing: sell period, back-out period, pay window | ItemSellPeriod 14 days (ini 47), ItemBackPeriod 120 days (ini 55), PaymentTakePeriod 120 days (ini 51) |
| Status check interval | BidItemsIntervalStatusCheck 30000 ms (ini 18; config 46-47 region) |
| Currency ids | LCoin 91663 (Inventory.cs 39); adena 57 (Inventory.cs 33) |

Unit warning (as read): the ini comment at line 31 says "Default: 100% (100.0)", but the code multiplies by the value directly (270). So with the default, the listing fee is 100 times price x amount, not 100%. The ini also says "Carefully - hard coded value (in client)", which suggests the client expects this number. I did not read the client, so I cannot say whether this is a real bug or a unit the client also uses. Do not copy 100.0 as a rate without checking.

Price semantics (as read): the register packet reads the price first (ExWorldExchangeRegisterItemPacket.cs:17) and passes it as `priceForEach` (31). The fee multiplies it by the amount (270), but the bid stores it unchanged (366) and the buyer is charged it once (676). The name says per unit; the payment says per lot. Which one the client sends is not read.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for list (open-count cap, validity, fee with cap, affordability, fee charged, listing opened), buy (status, affordability, premium destroyed, sold record), claim (status and window, tax with cap, credit) and the tick (registered to outOfTime, expired sold or outOfTime to none). It treats `price` as the donor does, as the amount charged once for the lot. It omits the item detach and re-add, the item category lookup, the sold clone, the database writes, the online seller alarm, the packets, the `Synchronized` attributes and the lazy-update flag. Times are plain numbers in milliseconds.

```ts
