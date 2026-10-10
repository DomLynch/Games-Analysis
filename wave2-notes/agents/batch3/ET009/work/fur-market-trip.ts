// Licence of donor: The Unlicense (public domain dedication, repo LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Good = "mink" | "beaver" | "ermine" | "fox";
const GOODS: Good[] = ["mink", "beaver", "ermine", "fox"];

type RouteEvent =
  | { kind: "safe" }
  | { kind: "lose"; goods: Good[] }   // stock of these goods is left behind or stolen
  | { kind: "lose-all" }
  | { kind: "halve"; goods: Good[] }  // price of these goods is halved for this sale
  | { kind: "dead" };                 // the trip ends the game

interface Market {
  costCents: number;                           // supplies plus travel, paid up front
  bandCents: Record<Good, [number, number]>;   // price per pelt in cents, inclusive band, rolled on arrival
  route: Array<{ upTo: number; event: RouteEvent }>; // one d10 roll (1..10), first entry whose upTo covers it
}

interface Trip { savingsCents: number; stock: Record<Good, number>; }

// One trip to one market. Costs are paid first; every price is rolled on arrival (no stale prices);
// the route roll may remove stock or halve prices; the sale is exact integer cents.
function trip(t: Trip, market: Market, rng: () => number): { revenueCents: number; dead: boolean } {
  if (t.savingsCents < market.costCents) throw new Error("cannot pay supplies and travel");
  t.savingsCents -= market.costCents;

  const price = {} as Record<Good, number>;
  for (const g of GOODS) {
    const [lo, hi] = market.bandCents[g];
    price[g] = lo + Math.floor(rng() * (hi - lo + 1));
  }

  const roll = Math.floor(rng() * 10) + 1;
  const event = market.route.find(e => roll <= e.upTo)!.event;
  if (event.kind === "dead") return { revenueCents: 0, dead: true };
  if (event.kind === "lose") for (const g of event.goods) t.stock[g] = 0;
  if (event.kind === "lose-all") for (const g of GOODS) t.stock[g] = 0;
  if (event.kind === "halve") for (const g of event.goods) price[g] = Math.floor(price[g] / 2 + 0.5);

  let revenueCents = 0;
  for (const g of GOODS) revenueCents += t.stock[g] * price[g];
  t.savingsCents += revenueCents;
  return { revenueCents, dead: false };
}

export {};
