import { DEFAULTS, fraction, bunchValue, buyFromStock, sellToStock } from "./depreciation-sketch";
const g = DEFAULTS;
for (const a of [0, 7, 8, 30, 100, 365, 1006, 1007, 2000]) console.log("age", a, "fraction", fraction(a, g).toFixed(5));
// Round trip: stock holds one item bought 100 days ago; player buys it at cost 1000 and sells it back the same day.
const today = 5000;
const stock = new Map<number, number>([[today - 100, 1]]);
const fleet = new Map<number, number>();
const paid = buyFromStock(stock, fleet, today, 1000, g);
const got = sellToStock(fleet, stock, today, 1000, g);
console.log("round trip: paid", paid, "got back", got, "stock bins after", JSON.stringify([...stock]));
// Stock with no record: full price; fleet with no record: floor.
console.log("no record stock", bunchValue(new Map(), today, 1, true, 1000, g), "no record fleet", bunchValue(new Map(), today, 1, false, 1000, g));
// Two items in fleet of different ages: fleet sells newest first.
const f2 = new Map<number, number>([[today - 400, 1], [today - 10, 1]]);
console.log("fleet two items value (newest first)", bunchValue(f2, today, 1, false, 1000, g), "two items total", bunchValue(f2, today, 2, false, 1000, g));
const s2 = new Map<number, number>([[today - 400, 1], [today - 10, 1]]);
console.log("stock two items value (oldest first)", bunchValue(s2, today, 1, true, 1000, g), "two items total", bunchValue(s2, today, 2, true, 1000, g));
