// Licence: GPL (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Wallet { balance: number; }
interface Inventory {
  canAdd(itemId: string, qty: number): boolean;
  add(itemId: string, qty: number): void;
  remove(itemId: string): boolean;
}
interface ShopItem { id: string; price: number; packSize: number; }
type BuyResult =
  | { ok: true; paid: number; granted: number }
  | { ok: false; reason: "bad-count" | "out-of-range" | "no-funds" | "no-space" };

// Buy: the price comes from the shop's own list; the client only names an item and a count.
// Checks first, then debit and grant as one step (the donor grants first, then debits).
function buy(wallet: Wallet, inv: Inventory, item: ShopItem, packs: number, inRange: boolean): BuyResult {
  if (packs <= 0) return { ok: false, reason: "bad-count" };
  if (!inRange) return { ok: false, reason: "out-of-range" };
  const total = packs * item.price;
  const qty = item.packSize > 0 ? packs * item.packSize : packs;
  if (wallet.balance < total) return { ok: false, reason: "no-funds" };
  if (!inv.canAdd(item.id, qty)) return { ok: false, reason: "no-space" };
  wallet.balance -= total;
  inv.add(item.id, qty);
  return { ok: true, paid: total, granted: qty };
}

interface OwnedItem { id: string; price: number; count: number; packSize: number; droppable: boolean; }

// Sell-back value in the donor's integer order: floor(price*count/pack), then *ratio/100 with floor.
// A price-1 item that rounds to 0 pays its own count/pack value. Non-droppable items pay 0.
function appraise(item: OwnedItem, sellRatioPct: number): number {
  if (!item.droppable) return 0;
  const count = Math.max(1, item.count);
  const pack = Math.max(1, item.packSize);
  const base = Math.floor((item.price * count) / pack);
  let val = Math.floor((base * sellRatioPct) / 100);
  if (item.price === 1 && val === 0) val = base;
  return val;
}

type SellResult = { ok: true; paid: number } | { ok: false; reason: "out-of-range" | "not-interested" | "cant-remove" };

// Sell: remove the item first, then credit the wallet (the donor order). No credit if the removal fails.
function sell(wallet: Wallet, inv: Inventory, item: OwnedItem, sellRatioPct: number, inRange: boolean): SellResult {
  if (!inRange) return { ok: false, reason: "out-of-range" };
  const value = appraise(item, sellRatioPct);
  if (value === 0) return { ok: false, reason: "not-interested" };
  if (!inv.remove(item.id)) return { ok: false, reason: "cant-remove" };
  wallet.balance += value;
  return { ok: true, paid: value };
}
export {};
