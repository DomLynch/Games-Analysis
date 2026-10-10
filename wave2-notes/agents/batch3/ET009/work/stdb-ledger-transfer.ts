// Licence of donor: Business Source License 1.1 (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Cents = bigint;
const MAX_U64 = (1n << 64n) - 1n;

interface Account { id: string; balanceCents: Cents; }
interface ChangeRow { requestId: string; accountId: string; counterparty: string; direction: "Debit" | "Credit"; amountCents: Cents; at: number; }

class Ledger {
  private accounts = new Map<string, Account>();
  private seenRequests = new Set<string>();
  private changes: ChangeRow[] = [];

  constructor(private readonly startingCents: Cents) {}

  // Faucet: the first connection of an identity creates its account with the starting balance.
  connect(id: string): void {
    if (!this.accounts.has(id)) this.accounts.set(id, { id, balanceCents: this.startingCents });
  }

  balanceOf(id: string): Cents | undefined {
    return this.accounts.get(id)?.balanceCents;
  }

  history(id: string): ChangeRow[] {
    return this.changes.filter(c => c.accountId === id);
  }

  // Zero-sum transfer. Every check runs before any write, so a refused call changes nothing.
  // requestId makes a retried call a no-op (idempotency), a gap in the donor's module.
  transfer(requestId: string, fromId: string, toId: string, amount: Cents, at: number): "done" | "duplicate" {
    if (this.seenRequests.has(requestId)) return "duplicate";
    if (fromId === toId) throw new Error("You cannot send money to yourself");
    if (amount <= 0n) throw new Error("Amount must be greater than zero");
    const from = this.accounts.get(fromId);
    const to = this.accounts.get(toId);
    if (!from || !to) throw new Error("Account does not exist");
    if (from.balanceCents < amount) throw new Error("Insufficient funds");
    if (to.balanceCents > MAX_U64 - amount) throw new Error("Recipient balance is too large");

    // All checks passed: write both sides and both audit rows.
    from.balanceCents -= amount;
    to.balanceCents += amount;
    this.changes.push({ requestId, accountId: fromId, counterparty: toId, direction: "Debit", amountCents: amount, at });
    this.changes.push({ requestId, accountId: toId, counterparty: fromId, direction: "Credit", amountCents: amount, at });
    this.seenRequests.add(requestId);
    return "done";
  }
}

export {};
