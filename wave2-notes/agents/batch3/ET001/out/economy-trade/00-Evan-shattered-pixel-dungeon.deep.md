# 00-Evan-shattered-pixel-dungeon (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/npcs/Shopkeeper.java` | Licence: GPL-3.0-or-later (per the file header: "either version 3 of the License, or (at your option) any later version"; the repo LICENSE.txt is GPL v3) | Java | symbol `Shopkeeper.sellPrice`

Checked: Read in full: Shopkeeper.java (1-349) and WndTradeItem.java (1-305). Read in part: Hero.java 1058-1070 and 1972-1985; Heap.java 133-200 and 363-380; Level.java 1004-1048; ShopRoom.java 20-260 (the tail of generateItems and the rest of the painter not read); MasterThievesArmband.java 100-340; Gold.java 39-75; Item.java 550-552; MeleeWeapon.java 396-414; Armor.java 706-723; Torch.java 92-94; Rankings.java 183 and 212 (method names not read). A grep of every `Dungeon.gold` write found five writers (read). Not read: the Hero Buy action handler, Char/NPC destroy (whether a fled shopkeeper leaves the level's mob list), Messages strings. Candidates opened: Shopkeeper.java, WndTradeItem.java, MasterThievesArmband.java, ShopRoom.java, Heap.java, Gold.java, Hero.java. Confidence: high on the sell, buy, buy-back and steal-chance formulas; medium on the flee and stock-destruction path. Not a camera cell.

Best transferable idea: Price a shop's sale at base value times a depth band, sell back at base value, and keep a three-item buy-back list, so a sell and buy-back round trip never makes gold and the only margin is the depth band.

Decision (proposed): adapt — the spread shape and the zero-margin buy-back fit a server-verified economy with one ledger, but the donor checks funds only in the client and spends without a check, so Frankendom takes the price shape and moves the funds check to the server.

Acceptance: a server test asserts that a buy above the balance is refused with the balance unchanged, that a sell followed by a buy-back returns the balance to its start, and that the buy-back list never holds more than three items. Player view (hypothetical): a tier-2 melee weapon (base value 40) costs 200 gold at depth 4 and 400 at depth 6; selling it returns 40.

## 1. Mechanism

Three paths move gold between the hero and a shop, and a fourth path lets the hero steal.

- Sell (WndTradeItem.sell, 238-262): the hero receives `item.value()` gold (254). This is the item's base value, not scaled by depth. The sell first unequips the item if needed (242-244) and detaches it from the pack (245), then pays (254), then appends it to the shop's buy-back list and trims the list to three from the front (256-260).
- Buy (WndTradeItem constructor for a heap, 134-156; buy(Heap), 292-304): the price is `Shopkeeper.sellPrice(item)` (145, and again at 297), which is `item.value() * 5 * (Dungeon.depth / 5 + 1)` (Shopkeeper 202). With integer division, depths 1-4 cost 5x base value, 5-9 cost 10x, 10-14 cost 15x, and so on. The buy button is enabled only if `price <= Dungeon.gold` (156). buy() then runs `Dungeon.gold -= price` (298) with no re-check, takes the item (294), and gives it to the pack (301), or drops it on the shop cell if the pack refuses it (302-303).
- Buy-back (Shopkeeper.interact, 237-309): the shop menu lists its buy-back items after Sell and Talk (245-254). `enabled()` allows an entry only if `Dungeon.gold >= value()` (279-281). Choosing one (264-275) removes it, subtracts `returned.value()` from gold (267) and from `Statistics.goldCollected` (268), then gives the item back (272). The check is in `enabled()` (the UI); onSelect does not re-check.
- Hero route (Hero 1975-1978): when the hero is sent to a sale heap, the action is Buy only if the heap holds exactly one item and that item's value is above 0; otherwise the action is a plain PickUp (1976-1978). Hero 1063-1069 opens the trade window when the hero reaches a cell holding a single sale item. The Buy action handler was not read.
- Shop harm and flee (Shopkeeper 93-193): `damage()` and any negative buff call `processHarm()` (93-95, 98-101). processHarm does nothing if the shopkeeper is outside the hero's view (107-110). The first harm yells and starts an actor that clears gas blobs (those BlobImmunity lists) within 4 steps of the shopkeeper (112-155), and sets the harm counter to 0 (113). A harm that arrives once the counter is at least 1 makes the shopkeeper flee (157-161). act() advances the counter each turn once it is 0 or more (83-85), so the flee happens on the first harm after at least one shopkeeper turn. flee() calls destroy() (164-165). destroy() handles each sale heap: a one-item heap is destroyed (185-186); a larger heap loses its last item (188) and becomes an ordinary heap (189). Nothing is refunded.
- Theft with the Master Thieves' Armband (WndTradeItem 161-163, 196-203; MasterThievesArmband 299-336): the steal option appears only if the armband buff is active, not cursed, and `chargesToUse(item) > 0`. The chance is `min(1, chargesUsed * (10 + level/2) / value)` (321-325). `chargesToUse` adds `10 + level/2` of value per charge until the item's value is covered or the charges run out (327-334). A successful steal spends the charges (305). A failed steal spends nothing (302-303), but the shopkeeper yells and flees (196-199), which removes the stock as above.
- Gold drain: a cursed armband, on each act() call, takes 1 gold with chance 1 in 5 (265-266).

Order for a buy: funds check (156, UI only), then spend (298), then pick-up (294, 301). Order for a buy-back: check (281, UI only), then spend (267-268), then give (272). Neither spend re-checks the balance.

## 2. Key functions

- `Shopkeeper.sellPrice` (201-203): the buy price. The buy window uses it (WndTradeItem 145), the buy path uses it (297), and the sale heap label uses it (Heap.java 376).
- `WndTradeItem.sell` (238-262), `sellOne` (268-289), `buy(Heap)` (292-304): the three money-moving paths on the client.
- `Shopkeeper.interact` buy-back menu (237-309; `enabled` 279-285, onSelect 264-275).
- `Shopkeeper.processHarm`, `flee`, `destroy` (105-193): the shopkeeper's response to harm and its stock on leaving.
- `MasterThievesArmband.Thievery.steal`, `stealChance`, `chargesToUse` (299-336); `Thievery.act` (263-272): the steal chance and the cursed drain.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Sell pays base value | Multiplier 1, no depth term (WndTradeItem 254) |
| Buy at base value times a band multiplier | 5 per band; band = depth / 5 + 1 with integer division (Shopkeeper 202) |
| Buy-back history, newest kept | 3 (Shopkeeper 70; trim at WndTradeItem 258-260) |
| Buy-back price | 1x base value (Shopkeeper 267, 281) |
| Steal: value covered per charge | 10 + level/2 per charge (MasterThievesArmband 323, 332) |
| Steal chance cap | 1 (MasterThievesArmband 324) |
| Cursed armband drain | 1 gold, chance 1 in 5 per act() (MasterThievesArmband 265-266) |
| Flee after repeated harm | Counter must be at least 1, so one shopkeeper turn of grace (Shopkeeper 157-161) |
| Base value examples | Melee weapon: 20 x tier, halved when the curse is known, times (level + 1) when the level is known and above 0, minimum 1 (MeleeWeapon 397, 404-412). Torch: 8 per unit (Torch 93) |

Derived figures (from the formulas above, not measured): base value 40 (tier-2 melee at level 0) costs 40 x 5 = 200 at depth 4 and 40 x 10 = 400 at depth 6. Selling returns 40. Buying back costs 40.

## 4. TypeScript sketch

simplified: the sketch keeps the depth-band price, the buy-back cap of three, the buy-back at base value, and a funds check before any spend. The donor checks funds only in the UI (WndTradeItem 156, Shopkeeper 281) and spends without a check (WndTradeItem 298, Shopkeeper 267). The sketch moves the check ahead of the spend, which the donor does not do. It keeps spendable gold and lifetime earned as two fields, as the donor does. It omits item identity and stock placement, the FOV gate and gas cleanse, the flee and stock destruction, the steal chance and charges, the cursed drain, and the knowledge-gated value.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Item = { id: string; baseValue: number };

interface Shop {
  stock: Map<string, Item>;   // items for sale, keyed by id
  buyback: Item[];            // newest last; capped at BUYBACK_HISTORY
}

interface Wallet {
  gold: number;               // the one spendable balance
  earned: number;             // lifetime gold earned, used for score; moves with sales and buybacks
}

const BUYBACK_HISTORY = 3;
const BAND_DEPTHS = 5;        // price multiplier steps every 5 depths
const BAND_MULTIPLIER = 5;

// What the shop asks: base value times 5, times one more for each full 5-depth band.
export function buyPrice(item: Item, depth: number): number {
  return item.baseValue * BAND_MULTIPLIER * (Math.floor(depth / BAND_DEPTHS) + 1);
}

// Buying is checked and spent in one step. The refusal is decided here, not by the client.
export function buy(w: Wallet, shop: Shop, itemId: string, depth: number): Item | "refused" {
  const item = shop.stock.get(itemId);
  if (!item) return "refused";
  const price = buyPrice(item, depth);
  if (w.gold < price) return "refused";
  w.gold -= price;
  shop.stock.delete(itemId);
  return item;
}

// Selling pays the base value, with no depth band. The item joins the buyback list.
export function sell(w: Wallet, shop: Shop, item: Item): void {
  w.gold += item.baseValue;
  w.earned += item.baseValue;
  shop.buyback.push(item);
  while (shop.buyback.length > BUYBACK_HISTORY) shop.buyback.shift();
}

// Buying back costs the same base value the seller received, so a sell and buy-back round trip nets zero.
export function buyBack(w: Wallet, shop: Shop, index: number): Item | "refused" {
  const item = shop.buyback[index];
  if (!item) return "refused";
  if (w.gold < item.baseValue) return "refused";
  w.gold -= item.baseValue;
  w.earned -= item.baseValue;
  shop.buyback.splice(index, 1);
  return item;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/economy/shop.ts` (new; the Frankendom repo was not read, so this path is a proposal). Economy is not in src/fight, so no fight module applies.
- Parity-checklist row 21 (catalogue fields). The base value of each item is a catalogue field, and the band multiplier and buy-back cap are zone data. Row 21 is the closest of rows 1-23. Row 18 (loot roll and XP award) does not cover prices, so it is not used here.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger and server-verified (Frankendom rulings); licence rule 7 (copyleft: clean-room, shape only)

## 6. Gaps and risks

- Server check: funds are checked only in the client (WndTradeItem 156, Shopkeeper 281). buy (WndTradeItem 298) and buy-back (Shopkeeper 267) spend with no check. The Frankendom server must refuse any buy or buy-back the balance cannot cover, and a test must prove the refusal.
- One ledger: gold is written in five places: Gold.doPickUp (Gold.java 65), buy (WndTradeItem 298), buy-back (Shopkeeper 267), the armband drain (MasterThievesArmband 266), and the quest reset (items/quest/EscapeCrystal.java 316). A pick-up also adds to `Statistics.goldCollected` (Gold.java 66), and buy-back takes it back by hand (Shopkeeper 268). Frankendom needs one add function and one spend function, with lifetime earned derived from them.
- Score coupling: `Statistics.treasureScore` is set from `goldCollected` (Rankings.java 212), and `goldCollected` also feeds a returned score (Rankings.java 183; method not read). Selling to a shop raises that counter, and buying does not lower it. Frankendom must decide which balance a score reads.
- Heap-size gate: the buy route keys on heap size and value (Hero 1976), not on each item's price. A sale heap with two or more items is taken with PickUp (1978), with no payment. The shop generator's fallback pass checks for an existing heap before placing (ShopRoom 207), but its first pass walks a cell pattern (148-190) and places with no such check (198). Whether that pass can reach a cell that already holds an item was not proven. Frankendom should price each item, not each heap.
- Stock destruction on flee: a flee deletes the shop's stock with no refund (Shopkeeper 185-186). A multi-item heap also loses one item silently (188). Frankendom needs a written rule (keep or refund), set as zone data.
- Value depends on knowledge flags: `value()` reads `levelKnown` and `cursedKnown` (MeleeWeapon 404, 407), so the price changes with what the hero has identified. Frankendom must decide whether the server prices from true state or from known state.
- Theft is asymmetric: a failed steal costs no charges (302-303) but costs the shop and its stock (196-199). Any Frankendom theft needs a server-side roll and a rule for failure.
- The cursed drain runs inside a buff's act() (265-266). In Frankendom it must go through the same ledger write, not a separate counter.
- Not read: Char/NPC destroy (whether a fled shopkeeper leaves the mob list), the Buy action handler, the Messages strings, the rest of ShopRoom.generateItems after line 260, and the gold piles on the floor.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: one ledger and server-verified (Frankendom rulings); licence rule 7 (copyleft: clean-room, shape only)
