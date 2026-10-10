# coding-horror-basic-computer-games (inventory-bank-equipment, cell 3)

Donor: `/mnt/frankendom-donors/coding-horror-basic-computer-games/00_Alternate_Languages/38_Fur_Trader/c/furtrader.c` | Licence: public domain dedication, Unlicense wording (repo `LICENSE` line 1) | C (C99 port of a BASIC game) | symbol `main` (the travel block, STATE_TRAVELLING)

Checked: The hint is the right file. Read in full: `furtrader.c` (474 lines, all of it). Not read: `furtrader.bas` (the original BASIC; the C port is the donor here), `38_Fur_Trader/README.md`, and the other language ports in the same folder. Topic fit is loose and stated plainly: the game has no bag slots, no stacking, no equipment and no bank. Its inventory mechanics are one total carry cap (190 across four types), one roll per trip that can zero or halve parts of what is carried, and a per-type sale. I kept STRONG because the loss roll is a complete, self-contained rule that a loot or death-penalty system could use. Confidence: high on the order of operations and the numbers; medium on whether it counts as "inventory". Several defects are listed in section 6; each has a fix.

Best transferable idea: Apply one banded roll per trip to what the player carries (nothing, lose one type, lose all, or halve a type's price), in the order roll, then cost, then payout, and write it once on the server.
Decision (proposed): adapt - A cumulative band roll on carried stock is a clear, testable loss rule that can sit in zone data and serve a death or zone-exit penalty on the bag; adapt because the donor is a trade game with a run-ending band that does not fit a fight game, and it carries five defects (a cost mismatch, a halved-type message mismatch, missing cent floor, a stale New York price, and a closed random range) that the port must fix.
Acceptance: On a zone exit with a loss table of 20 percent lose-one-type, 20 percent lose-all and 60 percent nothing: a player carrying 40 mink, 30 beaver, 20 ermine and 10 fox sees a results card with one line per type and the lost type named; a server test asserts the purse change equals the surviving stock times price minus the zone cost, the carried total never exceeds 190, and the roll never reaches an out-of-table value.

## 1. Mechanism

- Carry cap: the player enters four counts (mink, beaver, ermine, fox). `sumInventory` adds them (214-224), and the check is `sumInventory(...) > MAX_FURS` with `MAX_FURS` 190 (21, 305). Over the cap, the player is told to start again and the purchase restarts (307-312). The cap is a total across types, not per type. There is no pickup during a trip.
- Purse: 600 at the start (288).
- Per route, in the order the code runs (STATE_TRAVELLING, 330-470):
  1. Prices: each type's price is `base + range x r`, where r is a random value from `randFloat` in [0, 1] (the price lines are 335-338 Montreal, 347-350 Quebec, 390-392 New York). Montreal has no roll on the furs themselves.
  2. Band roll (Quebec 351, New York 400): `event_picker = int(10 x r + 1)`, so 1 to 10. Montreal has no roll (its block is 333-343).
     - Quebec: 1-2 beaver zeroed ("too heavy", 353-358); 3-6 safe (360-363); 7-8 everything zeroed (364-369); 9-10 fox zeroed (370-375).
     - New York: 1-2 the game ends (402-408); 3-6 safe (409-413); 7-8 everything zeroed (414-419); 9-10 mink and fox prices halved (420-426; the message on 424 names mink and beaver, see section 6).
  3. Trip cost (deducted after the roll, before the sale): Montreal 160 (342), Quebec 140 (385), New York 105 (436).
  4. Sale: each type's value is its price times the count left after the roll (446-449); halved prices apply first (422-423). The four values are added to the purse (457) and shown per type (452-455).
  5. Then the player may trade again next year (463-468), or stop.
- So a single trip is: prices, roll, cost, sale. The roll is applied to the inventory before the value is computed, so a zeroed type sells for 0.

## 2. Key functions

- `sumInventory`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/00_Alternate_Languages/38_Fur_Trader/c/furtrader.c` 214-224. Total of four counts.
- `zeroInventory`: same file, 201-208. Sets all four counts to 0 (used by the Quebec and New York all-lost bands, lines 368 and 418).
- `randFloat` / `randomAB`: same file, 231-239. Uniform float from rand() divided by RAND_MAX (a closed range, see section 6).
- `main`, travel block: same file, 330-470. Prices, roll, cost, sale, in that order.
- Callers: the travel block is reached from the choosing-fort state (327). `zeroInventory` callers: 289 (start), 368, 418 (both inside the travel block), checked by reading the file.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Carry cap is a total across types, checked once before the trip | 190 (21) |
| One roll per trip picks one band from a table of ranges 1-2, 3-6, 7-8, 9-10 | Bands: Quebec beaver / safe / all / fox; New York end / safe / all / halve |
| Band effect is applied to the carried stock before the cost and the sale | Halving factor 0.5 (422-423); all-lost is 0 |
| Cost is a fixed number per route, deducted before the sale | 160 / 140 / 105 (342, 385, 436) |
| Sale is price times count, per type, summed | Price bands: Montreal mink 0.70 + 0.20r, ermine 0.65 + 0.20r, beaver 0.75 + 0.20r, fox 0.80 + 0.20r (335-338); Quebec mink 0.85 + 0.30r, ermine 0.80 + 0.15r, beaver 0.90 + 0.20r, fox 1.10 + 0.25r (347-350); New York mink 1.05 + 0.15r, ermine 0.95 + 0.15r, beaver 1.00 + 0.25r, fox 1.05 + 0.25r only when unset (390-398) |
| Start purse | 600 (288) |

## 4. TypeScript sketch

simplified: keeps the total carry check, one banded roll per trip (Montreal is modelled as one "none" band, which consumes a roll the donor does not take), the order roll, then cost, then sale, and the halved-price rule. It fixes the donor defects in section 6: cent rounding is a floor of x times 100 plus 0.5; the trip cost is one number and the message would be built from it; the halved types come from the band data; each route prices every type fresh; and the roll is taken from [0, 1). It omits the message text, the flavour lines, the input loop, the year loop, and the stolen or uncured wording.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp), exit 0.

## 5. Lands in

- TARGET `src/fight/carry-risk.ts` (proposed module name; the repo layout was not checked here). A banded loss roll on what the player carries, applied by the server as one ledger step before a payout or a respawn.
- Parity-checklist row 17 (death and respawn). The donor's loss is a travel loss, not a death; the same banded shape would drop part of the pack on a death. Not row 18: this is a loss, not a loot roll.
- Reuse tag: adapt (public domain, Unlicense wording; the sketch is clean-room anyway)
- Brief rule served: one ledger (the server rolls the band, changes the pack and the purse in one write); rules 7-9 n/a

## 6. Gaps and risks

- The donor is a trade game: no combat, no death, no zone. Only the loss-roll shape transfers. The game-ending band (New York 1-2, line 406-407) does not fit Frankendom: a death ends a fight, not the run. Keep it out.
- Defect 1, trip cost mismatch (New York): the messages say supplies $85.00 (434) and travel $25.00 (435), a total of 110, but the code charges 105 (436). Fix: one number per route (`trip`), and build the message from it.
- Defect 2, halved types mismatch: the message says mink and beaver were damaged (424), but the code halves mink and fox (422-423). Fix: the band data names the halved types, and the message is generated from that list.
- Defect 3, cent rounding: the rounding is written `( x * 100 + 0.5 ) / 100` (335 and every other price line). That adds half a cent but never truncates, so prices keep sub-cent digits; the printed `%6.2f` hides them, the purse sum does not. Fix: take the floor of x x 100 + 0.5, then divide by 100 (the sketch's `priceFor`).
- Defect 4, New York fox price carry-over: the fox price is made only if it is still unset (393), so on a later New York trip it reuses the fox price of the last fort visited (the donor's own comment says so, 395-397). Fix: price every type fresh for each route visit.
- Defect 5, random range: `randomAB` divides by RAND_MAX (233), so the value can reach 1.0. Then `int(10 x 1.0 + 1)` is 11, and the code reaches "Internal Error" and exits (Quebec branch 376-380; New York branch 427-431). Rare (about one in 2^31 per roll) but real. Fix: draw from [0, 1) (Math.random in JS, or divide by RAND_MAX + 1).
- Defect 6 (cosmetic): the New York internal-error line (429) prints the literal `%d`, because `print` does not format. Fix: pass the value through a formatter.
- Money can go negative: nothing stops the purse from falling below zero after the trip cost (for example after the 600 start and a 160 trip, repeated). The donor has no bankruptcy rule; Frankendom must choose one.
- Fold-in for phone presentation: the donor shows one line per type (452-455) and then the total (460). A phone results card can use the same per-type breakdown, with the loss named on its own line.

Reuse tag: adapt (public domain; clean-room shape)
Brief rule served: one ledger for a carried-stock loss roll (row 17); the server rolls and writes once
