// Licence of donor: MIT (FPtje-DarkRP, LICENSE.txt). Clean-room sketch of the mechanism, not a line-by-line port.
export {};

// One ledger. Every money move is a row. Only write/redeem/tearUp/void exist; each one conserves total value,
// so every path that used to make money vanish now refunds or pays.
interface Row { kind: "debit" | "credit" | "refund"; who: number; amount: number; ref: string; }

interface Cheque {
  id: string;
  writer: number;
  recipient: number;
  amount: number;
  state: "open" | "redeemed" | "torn" | "voided";
}

// Data: minimum amount and per-player cap (donor: amount must be > 1; maxCheques = 5).
const MIN_CHEQUE = 2;
const MAX_OPEN_PER_WRITER = 5;

export class Ledger {
  private wallet = new Map<number, number>();
  private cheques = new Map<string, Cheque>();
  readonly rows: Row[] = [];
  private nextId = 1;

  constructor(initial: Array<[number, number]>) {
    for (const [who, amount] of initial) this.wallet.set(who, amount);
  }

  private move(who: number, delta: number, kind: Row["kind"], ref: string): void {
    const cur = this.wallet.get(who) ?? 0;
    this.wallet.set(who, cur + delta);
    this.rows.push({ kind, who, amount: delta, ref });
  }

  private openCount(writer: number): number {
    let n = 0;
    for (const c of this.cheques.values()) if (c.writer === writer && c.state === "open") n++;
    return n;
  }

  // Write: debit and open the instrument in one step, refused if the writer cannot pay or the recipient is offline.
  write(writer: number, recipient: number, amount: number, recipientOnline: boolean): string | null {
    if (amount < MIN_CHEQUE || !recipientOnline) return null;
    if ((this.wallet.get(writer) ?? 0) < amount) return null;
    if (this.openCount(writer) >= MAX_OPEN_PER_WRITER) return null;
    const id = "C" + String(this.nextId++);
    this.move(writer, -amount, "debit", id);
    this.cheques.set(id, { id, writer, recipient, amount, state: "open" });
    return id;
  }

  // Redeem: only the bound recipient is credited.
  redeem(id: string, who: number): boolean {
    const c = this.cheques.get(id);
    if (!c || c.state !== "open" || who !== c.recipient) return false;
    c.state = "redeemed";
    this.move(who, c.amount, "credit", id);
    return true;
  }

  // Tear up: only the writer gets the amount back.
  tearUp(id: string, who: number): boolean {
    const c = this.cheques.get(id);
    if (!c || c.state !== "open" || who !== c.writer) return false;
    c.state = "torn";
    this.move(c.writer, c.amount, "refund", id);
    return true;
  }

  // Void (damage, orphan, disconnect): every removal path settles to the writer. Nothing vanishes.
  void(id: string): boolean {
    const c = this.cheques.get(id);
    if (!c || c.state !== "open") return false;
    c.state = "voided";
    this.move(c.writer, c.amount, "refund", id);
    return true;
  }

  // Conservation check: wallets plus open instruments. Must not change across any call above.
  totalValue(): number {
    let sum = 0;
    for (const v of this.wallet.values()) sum += v;
    for (const c of this.cheques.values()) if (c.state === "open") sum += c.amount;
    return sum;
  }
}
