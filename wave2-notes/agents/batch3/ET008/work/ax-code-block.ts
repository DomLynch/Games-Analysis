// Licence: MIT (donor LICENSE.txt, Grymyr / L2Dn Server Project). Adapted shape, written from the read code, not a line-by-line port.
type Status = 'registered' | 'outOfTime' | 'sold' | 'none';

interface Wallet { adena: number; premium: number; } // one ledger: every change goes through the functions below

interface Listing {
  id: number;
  seller: string;
  count: number;
  price: number;      // the listed price (the donor stores the value it is given and charges it once)
  status: Status;
  endsAt: number;     // ms timestamp of the next status change
}

interface MarketTerms {
  adenaFeeRate: number;   // listing fee as a multiple of price x count (donor default 100.0)
  maxAdenaFee: number;    // -1 = no cap
  taxRate: number;        // share of the sale kept by the market (0.05)
  maxTax: number;         // -1 = no cap
  sellDays: number;       // how long a listing stays open
  backDays: number;       // how long an expired listing can be taken back
  payDays: number;        // how long a seller can claim proceeds
  maxOpen: number;        // open listings per seller (donor: 10)
}

const DAY = 86400000;

function listingFee(t: MarketTerms, price: number, count: number): number {
  let fee = Math.floor(price * count * t.adenaFeeRate);
  if (t.maxAdenaFee !== -1 && fee > t.maxAdenaFee) fee = t.maxAdenaFee;
  return fee;
}

// List: checks, charges the fee up front (not refunded on cancel), then opens the listing.
function list(t: MarketTerms, seller: Wallet, open: number, id: number, who: string, count: number, price: number, now: number): Listing | null {
  if (open >= t.maxOpen) return null;
  if (count < 1 || price < 1) return null;
  const fee = listingFee(t, price, count);
  if (fee > seller.adena || fee < 1) return null;
  seller.adena -= fee;
  return { id, seller: who, count, price, status: 'registered', endsAt: now + t.sellDays * DAY };
}

// Buy: the buyer pays the listed price in premium currency first, then the sale is recorded.
function buy(buyer: Wallet, l: Listing, now: number, t: MarketTerms): boolean {
  if (l.status !== 'registered') return false;
  if (buyer.premium < l.price) return false;
  buyer.premium -= l.price;
  l.status = 'sold';
  l.endsAt = now + t.payDays * DAY;
  return true;
}

// Claim: the seller receives price minus the tax, capped; the claim is refused after the pay window.
function claim(t: MarketTerms, seller: Wallet, l: Listing, now: number): number {
  if (l.status !== 'sold' || now > l.endsAt) return 0;
  let tax = Math.floor(l.price * t.taxRate);
  if (t.maxTax !== -1 && tax > t.maxTax) tax = t.maxTax;
  const net = l.price - tax;
  seller.premium += net;
  l.status = 'none';
  return net;
}

// Status tick: run on a fixed timer. Expired listings go to outOfTime; expired sold or outOfTime rows are removed and their proceeds or item are lost.
function tick(t: MarketTerms, listings: Listing[], now: number): void {
  for (const l of listings) {
    if (l.endsAt > now) continue;
    if (l.status === 'registered') {
      l.status = 'outOfTime';
      l.endsAt = now + t.backDays * DAY;
    } else if (l.status === 'sold' || l.status === 'outOfTime') {
      l.status = 'none';
    }
  }
}

