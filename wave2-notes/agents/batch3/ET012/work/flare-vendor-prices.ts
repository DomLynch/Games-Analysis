// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Ratios = { buy: number; sell: number; sellOld: number }; // data: engine defaults 1.0, 0.25, 0
type Item = { base: number; priceSell: number; quest: boolean }; // base 0 = not for sale; priceSell 0 = use ratios
type Slot = { item: string; qty: number; canBuyback: boolean };
type Vendor = {
  buyRatio: number; sellRatio: number; sellOldRatio: number; // NPC overrides; 0 = use the global value
  stock: string[];
  buyback: (Slot | null)[];
  resetPending: boolean;
};
type Wallet = { coins: number };
type Bag = { hasRoom(item: string, qty: number): boolean; add(item: string, qty: number): void };

// An NPC value above 0 replaces the global one; 0 means "use the global".
const pick = (globalValue: number, npcValue: number): number => (npcValue > 0 ? npcValue : globalValue);

// Buy tab: base x buy ratio, applied once; never below 1; base 0 = not for sale.
function buyPrice(it: Item, g: Ratios, v: Vendor): number {
  if (it.base === 0) return 0;
  return Math.max(1, Math.floor(it.base * pick(g.buy, v.buyRatio)));
}

// What the player is paid for a sale, and the default buyback price: priceSell if set, else base x global buy x sell ratio.
function sellPrice(it: Item, g: Ratios, v: Vendor): number {
  if (it.priceSell > 0) return Math.max(1, Math.floor(it.priceSell));
  if (it.base === 0) return 0;
  return Math.max(1, Math.floor(it.base * g.buy * pick(g.sell, v.sellRatio)));
}

// A fresh sale keeps the sale price. After a reload (canBuyback false) the old ratio applies, when it is set.
function buybackPrice(it: Item, canBuyback: boolean, g: Ratios, v: Vendor): number {
  const old = pick(g.sellOld, v.sellOldRatio);
  if (canBuyback || old === 0) return sellPrice(it, g, v);
  return Math.max(1, Math.floor(it.base * g.buy * old));
}

// Sale to the vendor: refuse quest items and items with no base price; pay, then list the stack as a fresh buyback.
// When the buyback is full, the first slot is dropped to make room.
function sellToVendor(w: Wallet, v: Vendor, items: Record<string, Item>, g: Ratios, itemId: string, qty: number): boolean {
  const it = items[itemId];
  if (!it || it.quest || it.base === 0) return false;
  w.coins += sellPrice(it, g, v) * qty;
  let idx = v.buyback.indexOf(null);
  if (idx === -1) {
    v.buyback.shift();
    idx = v.buyback.length;
    v.buyback.push(null);
  }
  v.buyback[idx] = { item: itemId, qty, canBuyback: true };
  return true;
}

// One settlement for every buy: refuse before any change if the coins or the bag room are short; otherwise debit and add.
function settle(w: Wallet, bag: Bag, itemId: string, qty: number, unit: number): boolean {
  const cost = unit * qty;
  if (w.coins < cost || !bag.hasRoom(itemId, qty)) return false;
  w.coins -= cost;
  bag.add(itemId, qty);
  return true;
}

function buyStock(w: Wallet, bag: Bag, v: Vendor, g: Ratios, items: Record<string, Item>, itemId: string, qty: number): boolean {
  const it = items[itemId];
  if (!it || it.base === 0) return false;
  return settle(w, bag, itemId, qty, buyPrice(it, g, v));
}

// Buy back a whole buyback slot; the slot empties only after the settlement succeeds.
function buyBack(w: Wallet, bag: Bag, v: Vendor, g: Ratios, items: Record<string, Item>, idx: number): boolean {
  const s = v.buyback[idx];
  if (!s) return false;
  const it = items[s.item];
  if (!it || !settle(w, bag, s.item, s.qty, buybackPrice(it, s.canBuyback, g, v))) return false;
  v.buyback[idx] = null;
  return true;
}

// First vendor open after the NPC is built: keep the buyback stock but mark it as no longer a fresh sale, or clear it.
function onFirstOpen(v: Vendor, keepOnLoad: boolean): void {
  if (!v.resetPending) return;
  v.resetPending = false;
  v.buyback = v.buyback.map((s) => (s === null || !keepOnLoad ? null : { ...s, canBuyback: false }));
}

export {};
