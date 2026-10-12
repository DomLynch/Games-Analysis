# FPtje-DarkRP (housing-player-built-spaces, cell 33)

Donor: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/doorsystem/sv_doors.lua` (`pmeta:doPropertyTax` 140-193, `pmeta:initiateTax` 195-233, `keysOwn` 43-85, `keysUnOwn` 87-106, `keysUnOwnAll` 108-128, `taxesUnOwnAll` 130-138, `OwnDoor` 333-424, `AddDoorOwner` 552-586) | Licence: MIT (`/mnt/frankendom-donors/FPtje-DarkRP/LICENSE.txt`, Copyright (c) 2014 Falco Peijnenburg; code may be adapted) | Lua | symbol `pmeta:doPropertyTax`

Checked: Read in full: `sv_doors.lua` 1-240 (ownership, keysOwn, keysUnOwn, keysUnOwnAll, taxesUnOwnAll, doPropertyTax, wallet tax) and 340-424 (OwnDoor buy and sell branches), 552-586 (AddDoorOwner). Partly read: `sv_doors.lua` 440-590 (other owner commands, `UnOwnAll`, `RemoveDoorOwner`). `sh_doors.lua` 1-100 (ownable classes, ownership predicates). `sv_doorvars.lua` 55-115 (allowed-to-own and extra-owner writers). `sv_gamemode_functions.lua` 21-22, 945-1030 (door cost fallback, removal delay, `PlayerDisconnected`). `config/config.lua` keys: propertytax, doorcost, maxdoors, maxvehicles, entremovedelay, removeondisconnect. Callers: `doPropertyTax` is called only by the 270 s timer (sv_doors.lua:79), found by grep. `keysUnOwnAll` is called from `GM:PlayerDisconnected` (sv_gamemode_functions.lua:1025) and from the admin path at `sv_dooradministration.lua:29` (found by grep). Not read: `door_ram` and `lockpick` weapons; `sv_dooradministration.lua` beyond its first lines; the whole `sv_interface.lua` hook list (I read only the names). Donor-wide grep for furniture, storage, decor, instancing, upkeep, decay and inactivity: no hits in gamemode or entities except one config comment about demotion. Confidence: high on the upkeep and eviction order and the numbers; high on the co-owner and invite paths; medium on the vehicle-removal path (read at sv_gamemode_functions.lua:983-987, not run). `camera_scope` not applicable (housing).

## 1. Mechanism

- A plot is an ownable door or vehicle. Its record holds a master owner (`doorData.owner`), co-owners (`extraOwners`), players allowed to join (`allowedToOwn`), a title, and group or team locks. Ownership checks are in `sh_doors.lua` 52-68 and writes in `sv_doorvars.lua` 59-96.
- Buying (`OwnDoor`, 333-424): a plot owned by someone else is refused unless the buyer is on its allowed-to-own list (382). Then: the buyer's cost is `GM:getDoorCost` (default 30), checked with `canAfford` and the `playerBuyDoor` hook; a vehicle limit and a plot cap of 20 apply (409); the cost is debited (414); then `keysOwn` runs (419). Inside `keysOwn` (43-85) a player on the allowed-to-own list is only added as a co-owner and returns (44-46). A master owner is recorded (71-74), the plot is added to the buyer's list (84), and the first plot starts the upkeep timer when upkeep is enabled (78-79).
- Upkeep (only when `propertytax` is on; the default is off, config 135): every 270 s, `doPropertyTax` runs for the player (79, 140). It counts the player's plots and the plots of others on which the player is a co-owner (146-166). If there are none, it stops (170). Otherwise due = 10 x plots + a random integer from -5 to 5 (172-173). If the due is 0, it stops (180). If the player can pay, the due is debited (182-185). If not, every counted plot is released (188).
- Release (`taxesUnOwnAll` 130-138, `keysUnOwn` 87-106): for a plot the player masters, all co-owners are removed and the owner is cleared (94-98), and the lock is released. For a plot the player only co-owns, just that player is removed.
- Logout (`GM:PlayerDisconnected`, sv_gamemode_functions.lua 1000-1025): the tax timer is removed (1003). `keysUnOwnAll` (108-128) releases every plot in the player's own list (111-115), and removes the player's invitations from other players' plots (117-124). The owned-vehicle clean-up (983-987) runs under `removeondisconnect` (config 143, on by default).
- Invite (`AddDoorOwner` 552-586): the owner must be near the plot (110 units squared, 556) and must already own it (573); the invited player is added to the allowed-to-own list (586). Acceptance is the buy path above, which charges the full door cost (see Gaps).

## 2. Key functions

- `keysOwn`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/doorsystem/sv_doors.lua` 43-85 (co-owner early return 44-46; timer 78-79; list add 84).
- `keysUnOwn`: same file 87-106 (master path wipes co-owners 96 and clears owner 98).
- `keysUnOwnAll`: same file 108-128 (own plots 109-115; invitations 117-124; count reset 127).
- `taxesUnOwnAll`: same file 130-138.
- `pmeta:doPropertyTax`: same file 140-193 (the whole upkeep cycle).
- `OwnDoor`: same file 333-424 (buy and sell; the cap 409; the charge 414; keysOwn 419).
- `AddDoorOwner`: same file 552-586 (range 556; invite 586).
- `GM:getDoorCost`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/base/sv_gamemode_functions.lua` 21-22 (fallback to 30 when the config is 0).
- Ownership predicates: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/doorsystem/sh_doors.lua` 52-68.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Upkeep per holding, plus a small random jitter | 10 per plot (sv_doors.lua:172); random -5 to 5 (:173) |
| Upkeep cycle length | 270 s, repeating (:79) |
| No upkeep when no holdings; no action when the due is 0 | :170, :180 |
| Shortfall releases all held plots at once | :188 |
| Plot price | 30 (config.lua:206; fallback 30 when 0, sv_gamemode_functions.lua:22) |
| Plots per player | 20 (config.lua:224; check at sv_doors.lua:409) |
| Vehicles per player | 5 (config.lua:238) |
| Sale refund | 0.666 of cost, rounded (sv_doors.lua:373) |
| Interaction range for buying, inviting | 110 units, as 12100 squared (sv_doors.lua:556) |
| Door removal delay after logout | 0 (config.lua:210); used for entities, not for doors (sv_gamemode_functions.lua:949-960) |
| Vehicles removed on logout | on (config.lua:143), filter at sv_gamemode_functions.lua:985 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (no holdings, due = fee x holdings + jitter, zero check, pay if able, otherwise release each held plot with the master-versus-co-owner rule). It omits the wallet tax, the `canTaxEntity` and `canPropertyTax` hooks, the vehicle versus door split, the notification texts, the random draw itself (the caller passes the jitter), and the disconnect path. The grace counter `graceMisses` is new: 0 gives the donor behaviour, and any value above 0 gives the arrears grace this note recommends.

```ts
// Licence: MIT (donor FPtje-DarkRP). Shape adapted; written from the mechanism, not copied line by line.

interface Ledger {
  balance(accountId: string): number;
  // The one money door: every change of balance is a signed row.
  settle(rows: ReadonlyArray<{ accountId: string; delta: number; reason: string }>): void;
}

interface Plot {
  id: string;
  masterOwnerId: string | null;   // donor: doorData.owner
  coOwnerIds: Set<string>;        // donor: extraOwners (co-owners share the plot)
}

interface UpkeepRules {
  feePerPlot: number;   // donor: price = 10 per taxable plot (sv_doors.lua:172)
  jitterMax: number;    // donor: math.random(-5, 5) (sv_doors.lua:173); caller supplies the draw
  graceMisses: number;  // NEW, not in donor: 0 = donor behaviour (evict on the first shortfall)
}

interface PayerState { misses: number; }

// Donor: unowning for a shortfall. The master wipes all co-owners; a co-owner only leaves.
export function releaseFor(plot: Plot, payerId: string): void {
  if (plot.masterOwnerId === payerId) {
    plot.coOwnerIds.clear();    // donor: removeAllKeysExtraOwners (sv_doors.lua:96)
    plot.masterOwnerId = null;  // donor: doorData.owner = nil (sv_doors.lua:98)
  } else {
    plot.coOwnerIds.delete(payerId); // donor: removeKeysDoorOwner
  }
}

// One upkeep cycle for one player (donor: pmeta:doPropertyTax, run every 270 s).
export function upkeepCycle(
  payerId: string,
  plots: Plot[],          // plots the payer owns OR co-owns (donor counts both: sv_doors.lua:146-166)
  rules: UpkeepRules,
  state: PayerState,
  ledger: Ledger,
  jitter: number,         // integer in [-jitterMax, jitterMax]
): "none" | "paid" | "missed" | "evicted" {
  if (plots.length === 0) return "none";                        // donor :170
  const due = rules.feePerPlot * plots.length + jitter;         // donor :173
  if (due === 0) return "none";                                 // donor :180
  if (ledger.balance(payerId) >= due) {                         // donor :182
    ledger.settle([{ accountId: payerId, delta: -due, reason: "upkeep" }]); // donor :185
    state.misses = 0;
    return "paid";
  }
  state.misses += 1;                                            // NEW: grace counter
  if (state.misses <= rules.graceMisses) return "missed";
  for (const plot of plots) releaseFor(plot, payerId);          // donor :188 taxesUnOwnAll
  state.misses = 0;
  return "evicted";
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file with `export {}` appended: exit 0.

## 5. Lands in

- TARGET `origins/server/housing.ts` (new, proposed): a plot is a zone row with a master owner and co-owners; upkeep and release settle through the one ledger on a server timer. Parity-checklist row 23 (zone population, from the list hint). Honest note: row 23 is about spawns; the plot is a zone row, but the upkeep logic does not spawn anything, so the row is the nearest hint, not a fit.
- today: (not read; this lane did not open the Frankendom repo).
- Reuse tag: adapt-idea (MIT; code may be adapted; this sketch is written clean from the mechanism)
- Brief rule served: one ledger (upkeep is a row); zones as data (plot rows, fees and limits as zone fields); server-verified ownership.

## 6. Gaps and risks

- Upkeep is off by default (config.lua:135). The shipped housing has no recurring cost at all. Dom needs to decide whether plots carry upkeep, and at what rate.
- All-or-nothing eviction: one shortfall releases every held plot at once (sv_doors.lua:188). A player with 20 plots loses all of them for a missing 5 units. Fix: the `graceMisses` counter in the sketch, or release the newest plot first until the bill is covered.
- Co-owned plots are billed in full to every holder (155-166): a plot shared by two players costs each of them 10 plus a share of the jitter. Decide whether a shared plot is one bill or two.
- Logout releases every plot at once (sv_gamemode_functions.lua:1025; keysUnOwnAll 108-115). The donor's removal delay (`entremovedelay`, 950) is for entities and is 0 by default; doors get no delay. Fix: keep the plot for a grace period after logout, using the timer shape at sv_gamemode_functions.lua:949-960.
- Owned vehicles are removed on logout (sv_gamemode_functions.lua:985-987), while doors are released. Two rules for one kind of holding. Pick one.
- Invited co-owners pay the full door price again. The buy branch checks the allowed-to-own list only to allow the purchase (sv_doors.lua:382); the charge (414) has no discount for it. Fix: an invite should be free, or priced once.
- A door cost of 0 is replaced by 30 (sv_gamemode_functions.lua:22), so a free plot cannot be set. Fix: an explicit zero check.
- A co-owner who logs out keeps their share as far as the read code shows: `keysUnOwnAll` walks only the player's own list (sv_doors.lua:109-115), and `keysOwn` returns early for co-owners before adding them to that list (44-46). Not tested.
- DarkRP has no furniture, storage, decor, instancing, build permission, placement or size rules, and no decay for inactivity (donor-wide grep, no hits). The housing model above is ownership, co-owners, upkeep and eviction only.
- Frankendom rulings: the plot is a zone row; ownership and upkeep must be server-verified and settle through one ledger; a shortfall must not wipe a whole holding without a grace step.
- MIT: code may be adapted. The sketch is clean.

Reuse tag: adapt-idea (MIT)
Brief rule served: one ledger, zones as data, server-verified ownership (upkeep and release are rows, not client timers)

Best transferable idea: a holding costs a fixed fee per plot plus a small random jitter every fixed interval, is paid from the ledger when the player can afford it, and is otherwise released plot by plot, with the master and co-owners treated differently, so housing needs one timer and one check.

Decision (proposed): adapt - the per-plot upkeep with a jitter and a fixed interval is a simple, server-checkable housing sink; reject the all-or-nothing release and the instant logout release, and add a grace step before any plot is lost.

Acceptance: a server test gives a player 3 plots and a 40-unit balance at the 270 s upkeep tick (due 30 plus or minus 5): the balance drops by the due and all 3 plots stay; with a 10-unit balance the first tick marks a miss and keeps the plots, and the second miss releases every plot that player holds: a plot the player masters loses its co-owners, and a plot the player only co-owns loses just that player.
