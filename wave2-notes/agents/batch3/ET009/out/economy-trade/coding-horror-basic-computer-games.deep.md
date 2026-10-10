# coding-horror-basic-computer-games (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/coding-horror-basic-computer-games/38_Fur_Trader/furtrader.bas` (the 1970s BASIC source, read in full) with its Java port `38_Fur_Trader/java/src/FurTrader.java` (read in full) | Licence: The Unlicense, public domain dedication (repo `LICENSE` line 1) | BASIC source with a Java port | symbols: BASIC lines 15-16 (defaults), 84-125 (fort prices and route rolls), 1160-1422 (costs, sale); Java `play` (66-206), `tradeAtFortStadaconaQuebec` (274-315), `tradeAtFortNewYork` (317-353)

Checked: read the BASIC source in full (170 lines) and the Java port in full (472 lines), plus `Pelt.java` (lostPelts) and the Java entry point. Checked the C port's Quebec price block (c/furtrader.c 335-351) only. Not read: the JS, Python, C#, Perl and VB ports. Candidates opened for this topic: the hint file was `75_Roulette/java/oop/Roulette.java` (read in full, 234 lines) with `Bet.java` (read in full). Roulette is a house-banked wager, not a market; Fur Trader is the stronger economy mechanism, so this note is on Fur Trader, and the Roulette findings are in section 6. Confidence: high on the BASIC order of steps and numbers (all quoted). High on the Java divergences (receipts verified). The Java YES-path fall-through (section 6) is read from the control flow only: I could not run it, because there is no JVM on this Mac or on the VPS, and I did not install one. camera_scope: n/a (economy topic).

## 1. Mechanism

- A yearly trade run. Each year the player holds savings and a stock of 190 pelts in four kinds (mink, beaver, ermine, fox), picks one of three markets (forts), pays the market's supplies and travel cost up front, and sells the whole stock at that market's price. The savings after the sale carry into the next year.
- Order of steps per year (BASIC): (a) the ermine and beaver default bands are rolled (261-262); Hochelaga and Stadacona reprice both, and New York does not, so these defaults are New York's ermine and beaver prices; (b) the four pelt counts are entered, and a total over 190 restarts the whole game from the intro with savings reset to 600 (342-344, 500-504, 16); (c) the player picks a fort (1100-1116); (d) if the player answers NO to "trade at another fort", the trade happens there (1129-1130, 1144-1145, 1155-1156); (e) at the fort: the cost is taken from savings first (1160 or 1198 or 1250), then each price for that fort is rolled (1174-1177, 1205-1207, 1260-1263); (f) the route roll, a d10 (1209, 1270), may remove stock or halve prices (see the table); (g) the sale is price x count for each kind, summed onto savings (1418); (h) the next-year question (511-513).
- Prices are dollars per pelt, rolled once per visit, each as a band `lo + k x rnd`. The sale is at that fixed price, and nothing the player sells moves any price afterwards: the Java writes prices only in the year defaults and in the trip functions (135-136, 267-270, 277-279, 322-323, 341-342), never after the sale.
- Costs are paid before the sale and are not checked against savings. Savings can go negative, and the game goes on (the Java writes savings at 72, 190, 263, 275, 320 and never reads it in a condition).
- Tick: none. The game is turn-based, one step per answer. Randomness is `RND` (BASIC) or `Math.random()` (Java), one call per roll.

Table (BASIC source; the dollar bands are the BASIC's, not the Java's, see section 6):

| Market | Cost (supplies + travel) | Mink | Beaver | Ermine | Fox | Route roll (d10, one roll) |
|---|---|---|---|---|---|---|
| Hochelaga (1) | 160 (150 + 10) | .70-.90 | .75-.95 | .65-.85 | .80-1.00 | none (no roll) |
| Stadacona (2) | 140 (125 + 15) | .85-1.15 | .90-1.10 | .80-.95 | not priced (stale, see 6) | 1-2 lose beaver; 3-6 safe; 7-8 lose all furs; 9-10 lose fox |
| New York (3) | 105 (80 + 25) | 1.05-1.20 | from the year default, 1.00-1.25 | from the year default, .95-1.10 | 1.10-1.35 | 1-2 the group is killed and the game ends; 3-6 safe; 7-8 lose all furs; 9-10 halve mink and beaver prices |

Each face of the d10 is 10%, so the 1-2 and 9-10 bands are 20% each, and the safe 3-6 band is 40%.

## 2. Key functions

- BASIC main flow: `/mnt/frankendom-donors/coding-horror-basic-computer-games/38_Fur_Trader/furtrader.bas` 15-16 (year defaults), 29 (pelt cap, 342-344), 1100-1156 (fort menu and the YES loop), 1160-1190 (Hochelaga), 1198-1248 (Stadacona: route roll 1209-1215, outcomes 1216-1246), 1250-1322 (New York: route roll 1270-1274, outcomes 1281-1322), 1410-1425 (sale and savings), 1430-1436 (pelt reset), 508-513 (next-year question).
- Java: `FurTrader.play` (`.../java/src/FurTrader.java` 66-206) is the state machine. The per-fort functions are `tradeAtFortHochelagaMontreal` (262-271), `tradeAtFortStadaconaQuebec` (274-315), `tradeAtFortNewYork` (317-353).
- Java route roll: `int tripResult = (int) (Math.random() * 10) + 1;` (282, 326), the same d10 as the BASIC.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pay the cost first, then trade (BASIC 1160, 1198, 1250, then 1418) | Costs 160, 140, 105 (furtrader.bas 1160, 1198, 1250) |
| Roll one price per good per visit inside a band; the sale is count x price | Bands listed above (furtrader.bas 1174-1177, 1205-1207, 1260-1263); a band is `lo + k x rnd` |
| One d10 route roll; each market maps the ten faces to outcomes | Face ranges in the table (furtrader.bas 1209-1215, 1270-1274) |
| A halved price after the roll (1306-1307) | Halving factor 0.5 (furtrader.bas 1306-1307) |
| An inventory cap on the input (342-344) | 190 pelts (furtrader.bas 29, 342-344) |
| A fixed start (16) | 600 savings (furtrader.bas 16; Java 16 `START_SAVINGS_AMOUNT = 600.0;`) |
| Round prices to cents, round half up (`INT(x*10^2+.5)/10^2`) | BASIC does it on every price (furtrader.bas 84-125). Java does not (see 6) |

## 4. TypeScript sketch

simplified: the sketch models one trip to one market, with integer cents: costs first, one roll per good on arrival, one d10 route roll, the route outcome, and the exact sale. It omits the year cycle, the pelt-entry cap, the fort-choice confirmation and the re-choose path (BASIC 1129-1130), the Java fall-through (section 6), and the Java's x1.005 price scaling. It adds a refusal when savings cannot cover the cost, which the donor does not have. Every good's price is rolled on every arrival, so no stale price is possible (the donor's Stadacona fox is stale). Halving rounds half up, as the rounding rule in section 3 says.

```ts
// Licence of donor: The Unlicense (public domain). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed. Run on the VPS with rng fixed (in cents, savings 600.00 and stock 50 mink, 50 beaver, 50 ermine, 40 fox): Hochelaga at rng 0.5 gives revenue 15600 (prices 80, 85, 75, 90), savings 59600. Stadacona at rng 0.05 (roll 1, beaver lost) gives revenue 12390 with beaver stock 0, savings 58390. New York at rng 0.95 (roll 10, mink and beaver halved) gives revenue 16860, savings 66360. A trip with savings 10.00 to Hochelaga is refused with no change. The hand arithmetic matches each output.

## 5. Lands in

- TARGET `origins/zones/market.ts` (proposed new module; I did not check the Frankendom tree, so the file name is a proposal). Each zone's market is zone data: cost, price bands per good, route table. The trip function runs on the server. The money moves through the one ledger (`origins/server/ledger.ts`, proposed; see the cell-2 note).
- Parity-checklist row: none. The closest row is 18 (loot roll and XP award). The price roll and the route roll have the same shape as a loot roll, but a trade price is not loot and the route roll is not an XP rule, so I did not file it under 18. No row 1-23 covers a market. Flagged for Lead.
- Reuse tag: rewrite-from-idea (The Unlicense: public domain; the sketch is clean-room anyway)
- Brief rule served: zones as data (every market parameter is data on the zone, nothing is a constant in the trip function); one ledger (costs and sales are ledger entries, not edits to one number, see section 6)

## 6. Gaps and risks

- The donor keeps money as one number (`savings`, Java line 47). Frankendom's rule is one ledger. Every cost and sale must be a ledger entry with a reason, and the savings figure must be derived from the entries.
- No refusal when savings cannot cover the cost (BASIC 1160, 1198, 1250; Java 263, 275, 320). Savings can go negative and the game goes on (Java never reads savings in a condition: 72, 190, 263, 275, 320). Frankendom must refuse a trip the player cannot pay for.
- Java only, the YES path falls through into the sale: `confirmFort` returns true for YES (Java 253), and then the `if (!confirmFort(answer)) { ... break; }` block (151-173) is skipped, with no `break` after it, so the case falls into `case TRADE_SUMMARY:` (175). The sale then runs at the prices the state holds (beaver and ermine from this year's defaults, mink and fox stale or 0 in the first year), with no fort cost and no route roll. The BASIC sends a YES back to the fort choice (furtrader.bas 1129: `IF B$="YES" THEN 1110`). The sketch does not have this. Read from control flow; not executed.
- Java only, prices are not rounded to cents. Each Java price is `((a x rnd + b) x (10^2 + .5)) / 10^2` (Java 135-136, 267-270, 277-279, 322-323), which is the band times 1.005, with no rounding. The BASIC rounds each price with `INT(x x 10^2 + .5) / 10^2` (furtrader.bas 84-125). Frankendom integer coins need one rounding rule; the donor has two.
- Java only, the Stadacona bands differ from the BASIC: mink `.2` where the BASIC has `.3` (Java 277 vs furtrader.bas 93), and ermine `.2` where the BASIC has `.15` (Java 278 vs furtrader.bas 94). Beaver matches (Java 279 vs furtrader.bas 95).
- Java only, the New York bands differ: mink `.2` where the BASIC has `.15` (Java 322 vs furtrader.bas 124), and fox `.2` where the BASIC has `.25` (Java 323 vs furtrader.bas 125).
- Both, Stadacona never prices fox. The BASIC never sets D1 at Stadacona (furtrader.bas 1205-1207); the Java keeps the bug and says so in a comment (Java 304). The fox price is then whatever it was last year, or 0 in the first year. Frankendom must reject a market that lacks a price for a good it buys or sells. A missing price must be an error, never a carried-over value. The C port prices fox at Quebec with the New York fox band (c/furtrader.c 350). That is a design choice in the C port, not the BASIC. Not checked further.
- Both, no price response: a sale does not move that market's price for later sales, and nothing moves a price between visits except the roll. A fixed roll per visit is simple but has no supply feedback. Frankendom would need an explicit rule for that, or accept it as is.
- Both, the costs and the route roll happen before the sale. A route roll that kills the group (New York 1-2) ends the game at once, after the cost is taken (Java 320, then 326-331). Frankendom must decide whether a refused or lost trip still costs money.
- Roulette (the hint file, read in full, `75_Roulette/java/oop/Roulette.java`): a house-banked wager, house 100000 and player 1000 (lines 21-29), stakes 5 to 500 (`Bet.java` 17), payouts paid in full with no check that the house can cover them (201-204), and no check that the player can cover a stake (bets are read at 159-182, and the loss is taken at 197-198). The house can go below zero within one round, and the check is only after the round (211-217). The bust reset `player = 101000` (217) sets the player to the whole pool instead of deriving it. Decision for Roulette: reject as a wager feature for Frankendom (house-banked gambling is not in our rulings). The two lessons (check the stake before accepting it, and derive a bust from the ledger) go to the ledger work.
- The donor's Stadacona and New York route tables are the only hazards. Frankendom's zone data would need to name the hazard per route, not per fort name.

Best transferable idea: a market is data on the zone (cost, one price band per good, one d10 route table), and one trip function pays the cost first, rolls each price on arrival, rolls the route once, and settles the sale as exact count times price.

Decision (proposed): adapt. The market-as-data shape (per-zone price bands, a cost paid up front, one route roll with a table) fits zones as data; the year cycle, the BASIC rounding idiom and the Java's fall-through and missing savings check must not be copied.
Acceptance: a server test: a merchant zone with a band of 85-115 cents for a unit rolls one price on arrival in that band; selling 20 units pays exactly 20 times that price; a route roll of 1-2 takes the stock named in the zone data; a trip whose cost exceeds savings is refused and changes nothing.
