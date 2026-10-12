# FPtje-DarkRP (trading-barter-vendors, cell 36)

Donor: `/mnt/frankendom-donors/FPtje-DarkRP/entities/entities/lab_base/init.lua` (`ENT:Use` 66-126, `ENT:SalePrice` 51-63, `Initialize` 6-24) | Licence: MIT (`/mnt/frankendom-donors/FPtje-DarkRP/LICENSE.txt`, "The MIT License (MIT)", Copyright (c) 2014 Falco Peijnenburg; code may be adapted) | Lua | symbol `ENT:Use`

Checked: Read in full: `lab_base/init.lua` (Use, SalePrice, Initialize), `lab_base/shared.lua` (1-27), `drug_lab/init.lua` 1-40 (drug lab SalePrice override), `modules/base/sv_purchasing.lua` 1-474 (BuyPistol, BuyShipment, BuyVehicle, BuyAmmo, SetPrice), `modules/money/sv_money.lua` 17-20, 70-120, 150-186 (GiveMoney body from 70; the argument-parsing lines 56-69 were not read), `modules/doorsystem/sv_doors.lua` 130-240, 340-412 (door sale), `config/config.lua` (price, shipment and tax keys). Callers: `ENT:Use` is the engine's use hook; I did not trace the engine call site (not read). `self.Once` is read at 71, set at 101, cleared at 123 and defaulted at 65 (`lab_base/init.lua`); I did not grep the rest of the donor for other writers. Confidence: high on the vendor order of operations and the numbers; medium on /give (argument parsing not read). `camera_scope` not applicable (trading). Not read: `DarkRP.notify`, `canDarkRPUse` callers, `gunlab` and `microwave` `createItem` bodies, the rest of `drug_lab/init.lua`.

## 1. Mechanism

- A player-run vendor (a "lab" entity). The owner sets its list price with `/price` (sv_purchasing.lua 444-469). A buyer uses the entity and pays the list price; the owner keeps the margin; the item appears one second later.
- Order of steps in `ENT:Use` (lab_base/init.lua 66-126):
  (a) only players may use it (69); a sale is locked while `self.Once` is set and a second use returns with no message (71).
  (b) if the owner is no longer valid, notify and return (75-78).
  (c) `cost = SalePrice(activator)` (80). For the owner: `ceil(price x 0.8)` if the owner's team is in `self.allowed`, else `ceil(price x 0.9)` (55-59). For anyone else: the list price (61).
  (d) the buyer must afford `cost` (82-85). `diff = cost - SalePrice(owner)` (87) is the owner's margin.
  (e) the owner-poor branch (88-91) needs `diff < 0`. With this SalePrice that cannot happen for a non-owner buyer: `diff = price - ceil(price x 0.9)` is never negative. It is dead on the base path. (Derived from the lines above; not run.)
  (f) hooks `canUse` (93) and `canDarkRPUse` (95-99) may veto.
  (g) the lock is set and the sparks start (101-102), then the buyer is debited `cost` (104) and, if the buyer is not the owner and the lab is not `noIncome`, the owner is credited `diff` (107-116).
  (h) a one-second timer (118-125) creates the item for the buyer only if the buyer is still valid, then clears the lock.
- Two-leg transfer, not one ledger row pair: the debit and the owner credit are two separate `addMoney` calls. If the buyer disconnects inside the one second, the money is already gone and no item is made (120-121).
- Price bounds: `/price` clamps to `pricemin` 50 and `pricecap` 500 (config 262-264; sv_purchasing 455). The entity's own init clamp uses `initialPrice` as the upper bound when `pricecap` is 0 (init 23), a different rule.
- Owner rule: the owner pays 90 percent of list (80 percent when their team is allowed), so the owner's margin on other buyers is 10 percent (20 percent for an allowed team). Owners get a discount on their own purchases and a bigger cut from others when they are in an allowed team.

## 2. Key functions

- `ENT:Use` at `/mnt/frankendom-donors/FPtje-DarkRP/entities/entities/lab_base/init.lua` 66-126: the whole sale, lock, debit, owner credit and delivery timer.
- `ENT:SalePrice` at `/mnt/frankendom-donors/FPtje-DarkRP/entities/entities/lab_base/init.lua` 51-63: the owner-versus-buyer price split.
- `DarkRP.hooks:canBuyPistol`, `BuyPistol` at `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/base/sv_purchasing.lua` 1-105: charges after the entity is spawned (100).
- `BuyShipment` at the same file 155-223: anti-spam window (115), spawn (184), charge after spawn (216).
- `BuyVehicle` at the same file 264-349: charge (304) before the class check (313-314).
- `BuyAmmo` at the same file 380-436: charge (420) before the spawn with no validity check (430).
- `SetPrice` at the same file 444-469: owner-only price with a clamp (455, 466-467).
- `GiveMoney` at `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/money/sv_money.lua` 56-116: target from the eye trace at command time (69-72), 1.2 s wait (90), then a second eye trace (101-102) and payment (106). `DarkRP.payPlayer` (17-20) debits then credits.
- `DropMoney` at the same file 119-186: debit at command time (161), bag after 1 s (164-174), return with no bag if the player is gone (165).
- Door resale, `GiveMoneyBack = floor(cost x 0.666 + 0.5)` at `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/doorsystem/sv_doors.lua` 373 (also 459).
- Wallet tax at the same file 195-233 (off by default: config 167).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Owner's own price = list x rate, rounded up | rate 0.9 (lab_base/init.lua:58); rate 0.8 for an allowed team (:56) |
| Owner margin on another buyer's sale = list - owner price | derived from :87; 10 percent (20 percent for an allowed team) |
| Buyer pays list, owner gets margin, one sale at a time | :61, :111, :71, :101 |
| Item delivered after a fixed wait | 1 s (:118) |
| Owner price bounds on `/price` | min 50, max 500 (config.lua:264, :262; sv_purchasing.lua:455) |
| Shipment anti-spam per player | 3 s (config.lua:280; sv_purchasing.lua:115) |
| `/give` wait before paying | 1.2 s (sv_money.lua:90); range 150 units, squared as 22500 (:72) |
| `/dropmoney` wait before the bag appears | 1 s (sv_money.lua:164) |
| Door resale refund | 0.666 of cost, rounded (sv_doors.lua:373) |
| Wallet tax percent | min 1, max 5 (config.lua:296, :294); start 500 (:286); interval 600 s (:298); off by default (:167) |
| Wallet tax fraction | `(money - 2 x start) / (198 x start)`, then clamped between min and max (sv_doors.lua:216-217); the guard `canTax` returns false below 2 x start (sv_doors.lua:237) |
| Street price of a drug lab | random between price/8 and price/4 (drug_lab/init.lua:16); `noIncome` set (drug_lab/shared.lua:9) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (lock first, then price, afford check, margin, owner-poor guard, lock, debit, owner credit, one-second delivery, unlock) and settles both legs as one ledger call. It omits the `canUse` and `canDarkRPUse` hooks, the notifications, the `noIncome` flag for drug labs, the spark effect, the no-owner notice, and the item-creation failure path. It adds the refund branch for a vanished buyer, which the donor does not have; that branch reverses both legs.

```ts
// Licence: MIT (donor FPtje-DarkRP). Shape adapted; written from the mechanism, not copied line by line.

interface Ledger {
  balance(accountId: string): number;
  // The one money door: every change of balance is a signed row, applied together.
  settle(rows: ReadonlyArray<{ accountId: string; delta: number; reason: string }>): void;
}

interface Vendor {
  id: string;
  ownerId: string;
  ownerTeamAllowed: boolean; // donor: owner's team is in self.allowed
  listPrice: number;         // set by the owner; donor clamps to 50..500 (config)
  busy: boolean;             // donor: self.Once (one sale at a time per vendor)
}

const OWNER_RATE = 0.9;          // owner pays 90% of list (donor lab_base/init.lua:58)
const OWNER_RATE_ALLOWED = 0.8;  // owner pays 80% when their team is allowed (donor :56)
const DELIVER_DELAY_MS = 1000;   // item appears after 1 s (donor :118)

function rateFor(v: Vendor): number {
  return v.ownerTeamAllowed ? OWNER_RATE_ALLOWED : OWNER_RATE;
}

// Owner's own price, and the floor the owner's margin is measured from.
function ownerFloor(v: Vendor): number {
  return Math.ceil(v.listPrice * rateFor(v));
}

function costFor(v: Vendor, buyerId: string): number {
  return buyerId === v.ownerId ? ownerFloor(v) : v.listPrice;
}

export type BuyResult = "ok" | "busy" | "cannot_afford" | "owner_poor";

export function buyFromVendor(
  v: Vendor,
  buyerId: string,
  buyerOnline: () => boolean,
  ledger: Ledger,
  deliver: (buyerId: string, vendorId: string) => void,
  schedule: (ms: number, job: () => void) => void,
): BuyResult {
  if (v.busy) return "busy";                                          // donor :71
  const cost = costFor(v, buyerId);
  if (ledger.balance(buyerId) < cost) return "cannot_afford";         // donor :82
  const margin = cost - ownerFloor(v);                                // donor :87 (0 for the owner)
  if (margin < 0 && ledger.balance(v.ownerId) < -margin) return "owner_poor"; // donor :88
  v.busy = true;                                                      // donor :101
  const rows = [{ accountId: buyerId, delta: -cost, reason: "buy " + v.id }];
  if (buyerId !== v.ownerId && margin > 0) {
    rows.push({ accountId: v.ownerId, delta: margin, reason: "margin " + v.id });
  }
  ledger.settle(rows);                                                // donor :104, :111
  schedule(DELIVER_DELAY_MS, () => {                                  // donor :118
    if (buyerOnline()) {
      deliver(buyerId, v.id);
    } else {
      // Fix, not in the donor: undo both legs so a vanished buyer cannot leave money behind.
      const undo = [{ accountId: buyerId, delta: cost, reason: "refund " + v.id }];
      if (buyerId !== v.ownerId && margin > 0) {
        undo.push({ accountId: v.ownerId, delta: -margin, reason: "reverse margin " + v.id });
      }
      ledger.settle(undo);
    }
    v.busy = false;                                                   // donor :123
  });
  return "ok";
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file with `export {}` appended: exit 0.

## 5. Lands in

- TARGET `origins/server/trade.ts` (new, proposed): a player-vendor sale that settles through the one money door. The buyer and owner legs go in one `settle()` call, so the server, not a client timer, decides delivery. Parity-checklist row 18 (loot roll and XP award; the list hint names row 18 for trading, and the vendor is a consumer of the same ledger path). Server tick is not involved.
- today: (not read; this lane did not open the Frankendom repo).
- Reuse tag: adapt-idea (MIT; code may be adapted; this sketch is written clean from the mechanism)
- Brief rule served: one ledger (settle is the only door); zones as data (price and cut are row fields, not constants); server-verified money.

## 6. Gaps and risks

- Two-leg money, not one ledger: `ENT:Use` debits the buyer (104) and credits the owner (111) as separate calls. Frankendom must do both legs in one `settle()` call.
- Lost money on disconnect: the buyer is debited at 104; if the buyer is gone when the one-second timer fires (118-121), nothing is delivered and nothing is refunded. `DropMoney` has the same defect: debit at 161, and the bag is skipped if the player is gone (165). Fix: reverse both legs in the same settle (the sketch does this for the vendor).
- `/give` pays whoever the giver is looking at after 1.2 s, not the player chosen at command time: the target is taken at 69-72 and then re-traced at 101-102 and paid at 106 with no comparison. Fix: store the target id at command time and settle only if the same id is still in range; cancel otherwise. This is the same stale-state defect a trade window needs to avoid.
- `BuyVehicle` charges (304) before the class check (314). If the class is invalid, the money is already gone and the function errors. `BuyAmmo` charges (420) before spawning (430) with no validity check. Fix: validate, spawn, then settle in one step, as `BuyPistol` (100) and `BuyShipment` (216) already do.
- Clamp mismatch: the entity's init clamp uses `initialPrice` as the upper bound when `pricecap` is 0 (init 23), while `/price` uses 500 (sv_purchasing 455). Fix: one clamp function for both.
- The owner-poor branch (88-91) is unreachable on the base path (derived above). Keep it as a guard, not a rule.
- Frankendom has no secure two-step trade window to copy: DarkRP has no trade window at all (a search of `gamemode/` for trade and barter found only a map name, `fadmin/changelevel/sv_init.lua:223`). `/give` is one-shot with no confirm. The trade window with both-confirm and a lock on change must be designed fresh, not ported from this donor.
- The owner's margin is not a fee on the buyer; with an allowed team the owner keeps 20 percent of list from other buyers. Balance that in zone data.
- Economy sinks in the donor (door resale at 66.6 percent, wallet tax 1 to 5 percent, property tax) are off or partial; the wallet tax is off by default (config 167). Not sketched here.
- MIT: code may be adapted. The sketch is written from the mechanism and copies no line.

Reuse tag: adapt-idea (MIT)
Brief rule served: one ledger, zones as data, server-verified money (rows 18 and the ledger ruling)

Best transferable idea: a player-run vendor keeps a fixed margin (10 percent, or 20 percent for an allowed team) between its list price and the owner's own cost, delivers after a short fixed wait, and allows one sale at a time, which a server can settle as one pair of ledger rows.

Decision (proposed): adapt - the list-price-plus-owner-margin split and the one-sale lock fit player vendors and bazaar stalls in one ledger; reject the client timer delivery and the stale `/give` re-trace, and reverse both legs when the buyer is gone.

Acceptance: a server test sells a 100-unit item from a vendor owned by someone else: the buyer's ledger row is -100, the owner's is +10 (or +20 for an allowed team), and a second buy while the first is pending returns busy; disconnecting the buyer inside the delivery window leaves both accounts unchanged.
