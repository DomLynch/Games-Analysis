// Licence: public domain (donor LICENSE, Unlicense wording). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Fur = "mink" | "beaver" | "ermine" | "fox";
const FURS: Fur[] = ["mink", "beaver", "ermine", "fox"];
type Inventory = Record<Fur, number>;
type Prices = Record<Fur, number>;

const MAX_CARRY = 190;

type Effect =
  | { kind: "none" }
  | { kind: "lose-type"; type: Fur }
  | { kind: "lose-all" }
  | { kind: "halve"; types: Fur[] }
  | { kind: "end-run" };

interface Band { upTo: number; effect: Effect; }

interface Route {
  name: string;
  trip: number;   // supplies + travel as one number; the message is built from it
  bands: Band[];  // ordered by upTo; an empty list means no roll
}

// Total across all types, checked once before the trip (the donor adds the four counts).
function carryOk(inv: Inventory): boolean {
  return FURS.reduce((sum, f) => sum + inv[f], 0) <= MAX_CARRY;
}

// Price rounded to the cent: base + range * r, then the rounding step (floor of x*100 + 0.5).
function priceFor(base: number, range: number, r: number): number {
  return Math.floor((base + range * r) * 100 + 0.5) / 100;
}

// One roll per trip. r is in [0, 1), so the 1..10 table is always hit.
function effectFor(route: Route, r: number): Effect {
  const n = Math.floor(10 * r) + 1;
  for (const b of route.bands) {
    if (n <= b.upTo) return b.effect;
  }
  return { kind: "none" };
}

// The roll is applied to what is carried, before the cost and the sale (the donor's order).
function applyEffect(inv: Inventory, e: Effect): { inv: Inventory; ended: boolean; halved: Fur[] } {
  const out: Inventory = { ...inv };
  if (e.kind === "lose-type") {
    out[e.type] = 0;
  } else if (e.kind === "lose-all") {
    for (const f of FURS) out[f] = 0;
  } else if (e.kind === "end-run") {
    return { inv: out, ended: true, halved: [] };
  }
  const halved = e.kind === "halve" ? e.types : [];
  return { inv: out, ended: false, halved };
}

// Sale: each type is priced, halved types take half price, and the values are summed.
function sale(inv: Inventory, prices: Prices, halved: Fur[]): number {
  let total = 0;
  for (const f of FURS) {
    const unit = halved.includes(f) ? prices[f] / 2 : prices[f];
    total += unit * inv[f];
  }
  return total;
}

// One trip: roll, then cost, then sale. An end-run leaves the funds unchanged and ends the game.
function runTrip(funds: number, inv: Inventory, route: Route, prices: Prices, r: number): { funds: number; ended: boolean } {
  const after = applyEffect(inv, effectFor(route, r));
  if (after.ended) return { funds, ended: true };
  return { funds: funds - route.trip + sale(after.inv, prices, after.halved), ended: false };
}

// Demo: a route with one band that does nothing; a roll of 0.25 gives n = 3.
const demoRoute: Route = { name: "demo", trip: 140, bands: [{ upTo: 10, effect: { kind: "none" } }] };
const demoPrices: Prices = { mink: 1, beaver: 1, ermine: 1, fox: 1 };
const demo = runTrip(600, { mink: 1, beaver: 1, ermine: 1, fox: 1 }, demoRoute, demoPrices, 0.25);
const ok = carryOk({ mink: 50, beaver: 50, ermine: 50, fox: 40 });
export { carryOk, priceFor, effectFor, applyEffect, sale, runTrip, demo, ok };
