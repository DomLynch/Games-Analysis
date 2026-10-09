# endless-sky-endless-sky (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/endless-sky-endless-sky/source/Shop.h | Licence: GPL-3.0-or-later per Shop.h header | C++ | symbol Shop<Item>::CanStock
Ranges opened and confirmed: Shop.h Load 82-140, CanStock 161-171; Planet.cpp Shipyards 587-594, Outfitters 620-627; ConditionSet.cpp Test 378-381, Evaluate 385-415 (AND case).

## 1. Mechanism
- Donor: Endless Sky shop data, a template class Shop<Item> used for shipyards (Shop<Ship>) and outfitters (Shop<Outfit>). A shop is a named stock list (Sale) plus two optional gates: a condition set (toSell) and a location filter.
- Load (Shop.h, 82-140): the name is token 1. Each child line may be prefixed "add" or "remove". "to sell" loads the condition set; "location" loads the location filter; for both, "add" onto an existing one is refused with a trace, and "remove" resets the whole thing (no partial removal). A "stock" node without "add" on a shop that already had stock clears the old stock first (lines 86-88 and 127-131); any other line is loaded as a single stock entry (138).
- CanStock (161-171): a shop whose condition set and location filter are both empty is planet-only and returns false. Otherwise it returns toSell.Test() AND (location empty, or location matches the planet). Note the condition test always runs, even when only a location filter is defined; an empty condition set is the default AND with no children, and `ConditionSet::Evaluate` returns true for it (ConditionSet.cpp 400-402), so a location-only shop passes the condition half. A set with an invalid operator counts as empty in `IsEmpty`; its `Test` result was not read.
- Planet.cpp: Planet::Shipyards (587) and Planet::Outfitters (620) return the planet's fixed shops plus every global shop whose CanStock is true for that planet, evaluated at the moment of the call.
- Planet::Shipyards/Outfitters are pure queries computed at call time, so availability tracks the player's current conditions. Who calls them, and when (UI open), was not read.
- Output: a set of shops, and from each shop a stock list (Sale) for the UI.

## 2. Key functions
- Shop<Item>::CanStock | /mnt/frankendom-donors/endless-sky-endless-sky/source/Shop.h | 161-171 | the availability gate: condition set and location filter, both required when both exist.
- Shop<Item>::Load | /mnt/frankendom-donors/endless-sky-endless-sky/source/Shop.h | 82-140 | reads the name, the sell conditions, the location filter and the stock, with add and remove modifiers.
- Planet::Shipyards | /mnt/frankendom-donors/endless-sky-endless-sky/source/Planet.cpp | 587-594 | fixed shipyards plus each global shipyard that passes CanStock here.
- Planet::Outfitters | /mnt/frankendom-donors/endless-sky-endless-sky/source/Planet.cpp | 620-627 | the same for outfitters.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Shop available where a condition passes AND a location matches; fixed shops always present (Planet.cpp:589, 622) | Condition sets and location filters from data (theirs; not read) |
| Planet-only shops are referenced explicitly, never offered by a gate | n/a (rule) |
| Stock as a list of items with add and remove modifiers (Shop.h:125-138) | Sale and Set types (theirs; not read) |
| Availability evaluated when the player asks, not stored | n/a |

## 4. TypeScript sketch
Licence: GPL-3.0-or-later (endless-sky-endless-sky). Clean-room: written from the mechanism, no donor lines.
simplified: Load's add/remove/overwrite semantics are not modelled; the condition test is made to run even when only a location exists, as in the donor, with a null condition treated as passing (the donor's empty set evaluates true, ConditionSet.cpp 400-402).
```ts
// Conditional shops: a shop is offered at a place when its condition passes and its location filter matches.
// A shop with neither gate is only referenced by place and never offers itself.
interface Shop {
  name: string;
  condition: (() => boolean) | null;           // null means no condition set
  location: ((place: string) => boolean) | null;
  stock: string[];
}

function canStock(shop: Shop, place: string): boolean {
  if (shop.condition === null && shop.location === null) return false;   // place-only shop
  const condOk = shop.condition === null ? true : shop.condition(); // an empty set evaluates true in the donor
  const locOk = shop.location === null ? true : shop.location(place);
  return condOk && locOk;                       // both gates pass when both exist
}

function shopsAt(place: string, fixed: Shop[], all: Shop[]): Shop[] {
  return [...fixed, ...all.filter(s => canStock(s, place))];
}
```

## 5. Lands in
- Frankendom file: origins/shops/shop.ts (shop definition and gates), origins/region1/shops.ts (region shop data). Zone loading (origins/zones/loader.ts) is the place a gate would be read; not read in this pass.
- Parity-checklist row: row 20 (catalogue / zone data as the runtime source: shop gates and stock lists are data) and row 21 (stock list and gate fields are catalogue fields). Not a fight row; no src/fight file.
- Rule served: 4 (zones are data on one runtime: a shop's availability is a data gate, not code per zone). Also usable: zone-schema rule (every gate and stock list is a data field with a default).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- The donor evaluates condition sets against the player's conditions at call time. Frankendom must evaluate the gate on the server, not in the client UI.
- The donor's Stock() returns a Sale<Item> (type not read), with no price or debit logic in Shop.h. Frankendom's shop must debit the server ledger (one ledger, origins/server/shop-buy.ts).
- The place-only rule (no gates means never offered) is a useful default that Frankendom's schema can copy.
- Shop.h has no refresh timer: stock changes only when Load runs again (an event or second definition). Whether the game triggers that on a clock was not read. Frankendom's rotation rules, if any, are new work.
- GPL-3.0-or-later: mechanism only.
