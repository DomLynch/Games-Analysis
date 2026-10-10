# hedgewars-hw (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Multiplayer/Construction_Mode.lua` | Licence: GPL-2.0 (the repository `COPYING` is GPL version 2, June 1991; the script itself has no licence header, so the repository licence is the one that applies) | Lua (engine in Pascal, not read) | symbols `PlaceObject`, `onNewTurn`, `HandleStructures`, `updateCost`

Checked: The task's hint file `ShoppaMap.lua` is the WRONG file: it is a rope-padding map script (lines 1-25 read) with no economy. `SpeedShoppa.lua` (1-16 read) is a training-mission framework (crate collection, no currency). `WxW.lua` and `HedgeEditor.lua` were grepped only. The real mechanism is `Construction_Mode.lua`, the "energy" economy of a builder mode (1911 lines). Read in full: the header and config (1-150), the cost table and placement categories (150-280), `HandleStructures` generator block (906-960), `PlaceObject` (1024-1120), `HandleConstructionMode` and `updateCost` (1349-1372, 1416-1471), `onGameStart` start energy (1723-1790), `onNewTurn` (1828-1850). Not read: structure link and removal (560-600), the proximity and crate-spawn helpers, the engine (Pascal) that runs the script and any network layer. Whether every client runs the same script is inferred from `IsHogLocal` checks (1460), not read in the engine. Confidence: high on the energy order of operations and the numbers in the script; medium on whether the cost used at placement can ever be stale (see section 6). Camera: not applicable.

Best transferable idea: one per-team energy number that is the only currency, fed by a per-round income and by owned producers (generators) that tick up a point, capped at a maximum, and spent only when an item is actually placed.

Decision (proposed): adapt. Frankendom's one-ledger rule suits a single energy/supply number per team or per player, but the donor's cost is a cached client-side global and the producers are structures built by the same clan; Frankendom should keep the faucet, cap and per-turn quota shapes and move the spend and the cap check onto the server, with zone producers as data.

Acceptance: a server test: a clan at 990 energy with income 50 starts its next turn at 1000 (the cap); a generator's tick at the cap is lost (the energy stays at 1000); a sixth crate in one turn is refused with no change to energy; a placement that fails for a missing spot spends nothing.

## 1. Mechanism

- One number per clan, `clanPower`, is the only currency (initial and cap in config, 133-135). The script's header and the in-game strings call it "energy" (the header's script-parameter text; loc strings at 1736, 1758, 1764).
- Starting energy: `min(conf_initialEnergy, conf_maxEnergy)` (1774). Defaults: 550 starting, cap 1000 (133, 135).
- Faucet 1, per-round income (`onNewTurn`, 1835-1840): the first turn of each clan adds nothing (1835-1836). Every later turn adds `conf_energyPerRound` (50, 134) and clamps to the cap (1838-1840). The crate counter is reset to 0 at the start of each turn (1844).
- Faucet 2, generators (`HandleStructures`, 926-946): on every game tick gate (`GameTime % 100 == 0`, 926, which the script's own comment at 1367 calls every 100ms), each generator's counter increases by 1 (940). At 10 counts the counter is reset to 0 (941-942), and the energy point is added only if the cap allows (945-946). The reset happens before the cap check, so at the cap the point is lost, not banked. One energy per 1000 ticks per generator (10 counts x 100 ticks).
- Sink: placing an item costs `placedExpense`. Costs are set by `updateCost` (1416-1455): a fallback of 1 (1421), crate costs from the crate table (`costFactor` = 20, 144, times a multiple per item; for example Rope is 7 x 20 = 140, from the table at 209); health crate 5 (1445), mine 15 (1447), sticky mine 20 (1449), barrel 10 (1451), girder 1 (1453), rubber 3 (1455); structures 30 (teleport) to 300 (respawner 1429, generator 1437).
- Placement gate (`PlaceObject`, 1024-1037): the cursor must be inside the clan's area; a crate in a turn beyond `conf_cratesPerRound` (5, 136) is refused (1031-1033); one Extra Time crate per turn (1024-1027, the flag reset at 1843); and energy must be at least the cost (1037).
- Payment (1088-1090): energy is subtracted only when `placed` is true (the placement branch set it when the gear or structure was created). When `placed` is false the script shows "Invalid Placement" and plays a denied sound, charging nothing (the `else` of that test, not quoted).
- Visibility: the cost caption is drawn only to the local player (1458-1461), and the script says this is because the cost "could be used to infer e.g. crate contents".
- Config is a script parameter (1670-1673) that overrides the defaults; `inf` is allowed for the cap and the crate limit.
- The structure cost list `strucCost` is written (505) and removed (575) but never read in the script: dead data.

## 2. Key functions

- `PlaceObject`: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Multiplayer/Construction_Mode.lua` 1024-1110. Gates (crate-per-turn, Extra Time, area, funds), placement by category, pay on success.
- `HandleStructures` generator block: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Multiplayer/Construction_Mode.lua` 926-946. Tick gate, counter to one energy, cap check.
- `onNewTurn`: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Multiplayer/Construction_Mode.lua` 1828-1846. First-turn skip, per-round income, clamp, crate reset.
- `updateCost`: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Multiplayer/Construction_Mode.lua` 1416-1466. The cost table as code, and the cost caption.
- `onGameStart` start energy: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Multiplayer/Construction_Mode.lua` 1771-1778.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One energy number per team; start at min(initial, cap) | initial 550, cap 1000 (133, 135, 1774) |
| Per-round income, skipped on the first turn, clamped to the cap | 50 per round (134); first-turn skip (1835-1836) |
| Producer: counter per tick gate, one point per N counts, cap wastes the point | 100-tick gate (926); 10 counts per point (941); cap check after reset (942, 945) |
| Per-turn quota on one class of item | 5 crates per turn (136, 1031); 1 Extra Time crate per turn (1024-1027) |
| Cost = catalogue value; charge only on success | costFactor 20 (144); fallback costs 1 to 300 (1421-1455) |
| Hide the price from spectators so it cannot reveal contents | Local-player caption only (1458-1461) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: start at min(initial, cap); turn start skips income on the first turn, adds income, clamps to the cap, resets the crate counter; a generator tick counts to the threshold, resets, and adds a point only under the cap (the point is lost at the cap, as in the donor); a placement checks the crate quota and funds, then places, then charges (crates count only on success). It omits the area check, the Extra Time flag, the per-generator position and clan lookup, the captions and particles, the cost table (costs are passed in as numbers), and the script parameter parsing. It differs from the donor in one place: the cost is an argument to the placement call, computed at placement time, whereas the donor charges the global `placedExpense` last set by `updateCost` (see section 6).

```ts
// Licence: donor repository is GPL-2.0 (COPYING); the script has no header licence. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface EnergyRules {
  initial: number;          // starting energy, capped at max
  perRound: number;         // income at the start of each turn after the first
  max: number;              // cap for energy at all times
  cratesPerRound: number;   // crate placements per turn
  generatorTicks: number;   // generator ticks per one energy point
}

interface ClanEnergy {
  energy: number;
  firstTurn: boolean;       // the first turn of a clan gets no income
  cratesThisTurn: number;
}

function startClan(rules: EnergyRules): ClanEnergy {
  return { energy: Math.min(rules.initial, rules.max), firstTurn: true, cratesThisTurn: 0 };
}

// Start of a turn: income (not on the first turn), clamp to the cap, reset the crate counter.
function beginTurn(c: ClanEnergy, rules: EnergyRules): void {
  if (c.firstTurn) {
    c.firstTurn = false;
  } else {
    c.energy = Math.min(c.energy + rules.perRound, rules.max);
  }
  c.cratesThisTurn = 0;
}

// One generator tick gate. The counter resets even when the cap blocks the energy point.
interface Generator { counts: number; }

function generatorTick(g: Generator, c: ClanEnergy, rules: EnergyRules): void {
  g.counts += 1;
  if (g.counts < rules.generatorTicks) return;
  g.counts = 0;
  if (c.energy + 1 <= rules.max) c.energy += 1;   // at the cap the point is lost
}

// Placement: crate limit and funds are checked first; energy is spent only if the placement succeeded.
function tryPlace(c: ClanEnergy, cost: number, isCrate: boolean, rules: EnergyRules,
                  place: () => boolean): boolean {
  if (isCrate && c.cratesThisTurn >= rules.cratesPerRound) return false;
  if (c.energy < cost) return false;
  if (!place()) return false;
  c.energy -= cost;
  if (isCrate) c.cratesThisTurn += 1;
  return true;
}
```

Typecheck: the block plus `export {};` was copied to the VPS `/tmp/ET014-hedge-check.ts` and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0.

## 5. Lands in

- TARGET `origins/economy/energy-budget.ts` (new, proposed; the Frankendom tree was not read, so the path is a proposal). Holds the one energy number per team or player, the faucets (per-round income, zone producers), the cap, the per-turn quota and the pay-on-success placement. Server-side only; the client shows the number and the quote.
- Parity-checklist row 21 (catalogue fields): the item costs and the producer rates are catalogue or zone fields. Row 18 (loot roll and XP award) does not fit a spend budget, so row 21 is the closest of rows 1-23.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (one energy number, changed only by the server); zones as data (income, cap, quota and producer rates are per-zone data, not constants).

## 6. Gaps and risks

- The donor charges `placedExpense`, a global set by `updateCost` on selection changes (1468-1471, 1196-1216), not a cost recomputed at placement (`PlaceObject` reads it at 1037 and 1090). Correctness depends on every selection change calling the cost update. Not checked exhaustively. Frankendom's server must recompute the cost from the item at purchase time and never trust a cached quote.
- The energy is a number the whole clan shares, so in a multiplayer zone it must be server state. The donor's lockstep model (every client runs the script, inferred from `IsHogLocal`) is not Frankendom's model: the server must be the only writer.
- At the cap, a generator tick is lost (942 before 945). That is a choice: Frankendom should decide whether a producer banks up to the cap or drops points, and state it in the data.
- The first turn skips income (1835-1836). That is a designed grace; Frankendom should make it an explicit zone field, not an accident of the first call.
- Per-turn limits (crates 5, one Extra Time) are the donor's only sink throttle. Frankendom's equivalent should be a per-encounter quota, not a per-turn one, unless a turn exists in its design.
- Costs and producer rates are hardcoded in the script (the 100-tick gate at 926, 10 counts at 941). Frankendom must lift them into zone data, or a designer cannot tune them.
- The cost is hidden from spectators to avoid inference of crate contents (1458-1461). That is a hidden-information rule that Frankendom should keep only if its loot or stock is hidden on purpose.
- The Pit is a client: no energy spend happens in the Pit. Do not let the Pit call the placement function.
- GPL-2.0: clean-room only. The sketch is written from the mechanism, not translated.
