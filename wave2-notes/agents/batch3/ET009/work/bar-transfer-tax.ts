// Licence of donor: GNU GPL v2 or later (copyleft). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Wallet {
  balance: number;        // stock held by the team or player
  capacity: number;       // maximum stock (storage in the donor)
  receiveCeiling: number; // ratio: transfers may fill the wallet only up to capacity * receiveCeiling
}

interface TransferResult { sent: number; received: number; burned: number; }

// Player-to-player transfer with a sink tax.
// The sender is debited the gross amount, the receiver is credited the net amount,
// and the difference (the tax) leaves the economy. Nothing is created here.
function transfer(from: Wallet, to: Wallet, requested: number, taxRate: number): TransferResult {
  if (taxRate < 0 || taxRate > 0.99) throw new Error("taxRate must be in [0, 0.99]");
  const none = { sent: 0, received: 0, burned: 0 };
  if (requested <= 0) return none;

  const headroom = to.capacity * to.receiveCeiling - to.balance;   // what the receiver may still take
  if (headroom <= 0) return none;

  // Cap the NET credit by the receiver's headroom and by what the sender can gross-up to.
  const net = Math.min((1 - taxRate) * requested, headroom, from.balance * (1 - taxRate));
  const gross = net / (1 - taxRate);                               // what the sender pays

  from.balance -= gross;
  to.balance += net;
  return { sent: gross, received: net, burned: gross - net };
}

export {};
