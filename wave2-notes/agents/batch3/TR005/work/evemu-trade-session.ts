// Licence: LGPL (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemId = number;
type CharId = number;

interface StockItem { id: ItemId; owner: CharId; typeId: number; qty: number; }
interface Offer { items: Map<ItemId, number>; money: number; } // item id -> qty offered
interface Side { charId: CharId; offer: Offer; confirmed: boolean; }
interface ItemRow { kind: "item"; from: CharId; to: CharId; itemId: ItemId; qty: number; }
interface MoneyRow { kind: "money"; from: CharId; to: CharId; amount: number; }
type LedgerRow = ItemRow | MoneyRow;

interface Ledger {
  balance(charId: CharId): number;
  stock(itemId: ItemId): StockItem | undefined;
  settle(rows: LedgerRow[]): void; // one call: all rows apply, or none do
}

interface Session { a: Side; b: Side; state: "open" | "settled" | "cancelled"; }

function sideOf(s: Session, charId: CharId): Side {
  if (s.a.charId === charId) return s.a;
  if (s.b.charId === charId) return s.b;
  throw new Error("not a party to this trade");
}

function otherSide(s: Session, side: Side): Side {
  return side === s.a ? s.b : s.a;
}

// Any change by either party clears BOTH confirms (lock on change).
function editOffer(s: Session, charId: CharId, change: (o: Offer) => void): void {
  if (s.state !== "open") throw new Error("trade closed");
  change(sideOf(s, charId).offer);
  s.a.confirmed = false;
  s.b.confirmed = false;
}

function addItem(s: Session, charId: CharId, itemId: ItemId, qty: number, ledger: Ledger): void {
  const item = ledger.stock(itemId);
  // ownership and quantity are checked on the server, against the stock, not the client's claim
  if (!item || item.owner !== charId) throw new Error("not your item");
  if (!Number.isInteger(qty) || qty < 1 || qty > item.qty) throw new Error("bad quantity");
  editOffer(s, charId, o => { o.items.set(itemId, qty); });
}

function removeItem(s: Session, charId: CharId, itemId: ItemId): void {
  editOffer(s, charId, o => { o.items.delete(itemId); });
}

function setMoney(s: Session, charId: CharId, amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("bad amount");
  editOffer(s, charId, o => { o.money = amount; });
}

// A party confirms. The other party's confirm can only be set by that party's own call.
function confirm(s: Session, charId: CharId, ledger: Ledger): "waiting" | "settled" {
  if (s.state !== "open") throw new Error("trade closed");
  sideOf(s, charId).confirmed = true;
  if (!(s.a.confirmed && s.b.confirmed)) return "waiting";
  settle(s, ledger);
  return "settled";
}

function settle(s: Session, ledger: Ledger): void {
  const rows: LedgerRow[] = [];
  for (const side of [s.a, s.b]) {
    const to = otherSide(s, side).charId;
    // re-validate every offered item and the money before anything moves
    for (const [itemId, qty] of side.offer.items) {
      const item = ledger.stock(itemId);
      if (!item || item.owner !== side.charId || qty > item.qty) throw new Error("offer no longer valid");
      rows.push({ kind: "item", from: side.charId, to, itemId, qty });
    }
    if (side.offer.money > 0) {
      if (ledger.balance(side.charId) < side.offer.money) throw new Error("insufficient funds");
      rows.push({ kind: "money", from: side.charId, to, amount: side.offer.money });
    }
  }
  ledger.settle(rows); // single atomic call; no separate money step that can fail halfway
  s.state = "settled";
}

export {}
