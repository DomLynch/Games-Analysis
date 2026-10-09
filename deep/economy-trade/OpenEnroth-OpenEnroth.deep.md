# OpenEnroth-OpenEnroth (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp | Licence: LGPL | C++ | symbol GUIWindow_Shop.sellDialogue/generateShopItems
Symbol check: the input's sellDialogue is at 277, not 627. Line 627 is GUIWindow_WeaponShop::generateShopItems (there is no generateShopItems on GUIWindow_Shop; each shop type has its own). sellDialogue (277-302) draws text only. All four ranges below were opened and land on the named functions.

## 1. Mechanism
- UI-driven. The shop window draws each frame it is open and reacts to player option picks. Stock generation itself is triggered lazily, not on a tick.
- Stock: generateShopItems(isSpecial) is per shop type. Weapon shop (627-638): picks the standard or special item array and variation, then for i in 0..itemAmountInShop[building] picks one of four item classes from the variation with the global random source (grng->random(4)), asks the item table to generate an item at the variation's treasure level, and marks it identified. It then resets the house's InTheShopFlags to 0. The arrays are std::array of 12; the loop count is per building: weapon 6, armour 8, magic 12, alchemy 12 (UIHouses.cpp:257-260, outside Shops.cpp).
- Armour shop (640-661): same loop, but two variations: slots 0-3 use the top-row variation, slots 4 and up use the bottom-row variation (treasure level and class table each). Magic shop (663-673): no class pick, one treasure level, class fixed to the miscellaneous class. Alchemy shop (675-695): slots 0-5 are fixed (bottles in standard, a random recipe scroll in special), slots 6 and up are generated potions (special) or reagents (standard).
- Restock: houseDialogueOptionSelected (773-803). When the player opens standard or special buy and the house's shopNextRefreshTime is earlier than the party's playing time, it regenerates standard then special stock and sets the next refresh time to now plus the house table's generation_interval_days (lines 775-781). So restock is a game-clock timer checked at the moment of browsing, not a player menu action. It then loads item icons; for the weapon shop it also rolls a random vertical position per item with grng (lines 791-796) so recorded clicks replay.
- sellDialogue (277-302) only draws the "select the item to sell" status text and, for the inventory cell under the mouse, a sell phrase chosen from the NPC phrase table. It does not move items or money; the sell transaction is not in this function and was not read.
- Inputs: house id, building type, the global random source, party time. Outputs: the stock arrays, refresh time, UI text.

## 2. Key functions
- GUIWindow_Shop::sellDialogue | /mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp | 277-302 | draws the sell phrase for the item under the cursor; no transaction.
- GUIWindow_WeaponShop::generateShopItems | /mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp | 627-638 | fills the stock array with random class picks at the treasure level.
- GUIWindow_ArmorShop::generateShopItems | /mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp | 640-661 | the same shape for armour with a top and bottom variation.
- GUIWindow_Shop::houseDialogueOptionSelected | /mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp | 773-803 | timer-gated restock that calls generateShopItems twice.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-capacity stock array, one random class pick per slot (Shops.cpp:631-634) | Array capacity 12; filled slots per building 6 / 8 / 12 (UIHouses.cpp:257-260, theirs) |
| Generate at a treasure level, mark identified (633-634) | Four classes per variation (the grng->random(4) bound, line 632, theirs) |
| Restock when the clock passes a per-house refresh time (775-781) | generation_interval_days per house (theirs, data in the house table, not read) |
| Top and bottom row variations (645-657 in armour) | Split at slot 4 (theirs) |

## 4. TypeScript sketch
Licence: LGPL (OpenEnroth-OpenEnroth). Clean-room: written from the mechanism, no donor lines.
simplified: only the weapon and armour shapes are shown (single class pick per slot, top/bottom split); magic and alchemy fixed slots, icon loading and the replay-position roll are omitted. The refresh check is lifted out of the dialogue handler into a function taking the clock.
```ts
interface Item { cls: number; level: number; identified: boolean; }
type Rng = (n: number) => number; // integer in [0, n)
interface Variation { classes: number[]; level: number; }

// Fill a stock array: one class pick per slot, generated at the slot's variation level.
// bottom is optional: slots from splitAt on use it (armour shape).
function generateStock(
  stock: (Item | null)[],
  top: Variation,
  bottom: Variation | null,
  splitAt: number,
  amount: number,
  rand: Rng,
  makeItem: (cls: number, level: number) => Item,
): void {
  for (let i = 0; i < amount; i++) {
    const v = bottom !== null && i >= splitAt ? bottom : top;
    const cls = v.classes[rand(v.classes.length)];
    const it = makeItem(cls, v.level);
    it.identified = true; // shop stock is shown identified
    stock[i] = it;
  }
}

// Restock only when the player opens the shop and the clock has passed the refresh time.
function maybeRestock(now: number, nextRefresh: number, intervalDays: number, regen: () => void): number {
  if (nextRefresh >= now) return nextRefresh;
  regen();
  return now + intervalDays * 86400;
}
```

## 5. Lands in
- Frankendom file(s): origins/shops/shop.ts (stock tables per vendor), origins/server/shop-buy.ts (server clock for restock, server-side roll), origins/contracts/economy.ts (stock and price types).
- Parity-checklist row: row 18 (loot roll: the stock roll is the same seeded class-pick-at-level shape as the loot roll, and must be server-side) and row 21 (stock tables per vendor and treasure levels are catalogue fields).
- Reuse tag: rewrite-from-idea (LGPL; clean-room mechanism only).
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- Stock is generated, not priced. Price rules live in the item table, which was not read.
- The donor restocks lazily when a player opens the shop after the refresh time. Frankendom restock must run on the server clock and be the same for every player of a zone, not per-browser.
- The random source is the global grng (also used for replay-stable UI rolls). Server-verified rolls need their own seeded source, recorded with the ledger entry.
- sellDialogue is display only. The sell transaction was not read, so the donor's sell rules are not described.
- Slot count and top/bottom split are data per vendor (zones as data), not constants in code.
