# amilich-isometric-city (progression, cell 10)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` | Licence: MIT (LICENSE file: "MIT License", Copyright (c) 2025 amilich) | TypeScript | symbol `upgradeServiceBuilding` (paid level-up); growth symbol `evolveBuilding`

Checked: Read `upgradeServiceBuilding` (1351-1391) and `evolveBuilding` (1518-1742) end to end for the level rules; `simulateTick` loop (2152-2300). Callers checked: `upgradeServiceBuilding` is called only from the GameContext handler (`GameContext.tsx` 980) and the TileInfoPanel button goes through that handler; `evolveBuilding` has one call site (`simulation.ts` 2299); `simulateTick` has one call site (`GameContext.tsx` 819). Not read: the body of `findFootprintIncludingTile` and `applyBuildingFootprint` (consolidation helpers), the population/jobs tail of `evolveBuilding` after 1742, and the `SERVICE_BUILDING_TYPES` members beyond the lines shown (1244-1246). Camera: not applicable. Confidence: high on the upgrade rules and the target formula; medium on "one level step per tick" as a whole-city rule, because footprint consolidation can set the level directly (1726). Depth: full for the progression rules.

## 1. Mechanism

Two linked rules in a city builder. Both run in the browser inside the game state; there is no server.

(a) Paid level-up of a service building (player action). Order in `upgradeServiceBuilding`: (1) the building type must be in the service set (1359); (2) level must be below the cap of 5 (1362); (3) construction must be complete (1365); (4) not abandoned (1370); (5) base price from the catalogue (1373); (6) price = base x 2^current level (1377); (7) refuse if money is short (1380); (8) otherwise a new grid is built with level + 1 (1384), money is reduced by the price (1389), and service coverage is recalculated with the new level (same function). The upgraded range is `base x (1 + 0.2 x (level - 1))` (1292, read via `calculateServiceCoverage`).

(b) Automatic growth of zoned buildings, once per tick (`evolveBuilding`). Order: zone and empty/grass/road guards (1523-1526); power and water snapshot; a non-starter building without power or water returns with no growth; a building under construction returns (1553); an abandoned building returns (1577). Then abandonment: if demand is below -20 and age is over 30, an abandonment chance `min(0.02, |demand + 20| / 4000)` may flip it to abandoned and return (1623-1634). Otherwise age goes up by 1 (1642). Then the target level: average of four service coverages (police, fire, health, education; 1650-1655); demand boost `max(0, (demand - 30) / 70) x 0.7` (1666); target = clamp(floor(landValue / 24 + coverage / 28 + age / 60 + demand boost), 1, 5) (1668-1669). Then a consolidation branch (1718-1731): needs power and water and age over 12 and a random chance; it may merge a footprint and set the level straight to target (1726), or if no footprint fits, gain one level (1731). Last, the level is set by `max(level, min(target, level + 1))` (1740): it rises at most one step per tick toward the target and never drops in this line.

Tick: `simulateTick` (2152) visits every tile in nested loops (2179-2180). The zoned branch calls `evolveBuilding` (2296-2299). The timer is a browser `setInterval` (`GameContext.tsx` 814) with a period of 500, 300 or 200 ms at desktop speeds 1, 2, 3 (812), and 750, 450 or 300 ms on mobile (811). Land value is set to 50 at tile creation (758) and to 60 where lake tiles are placed (285). Two more writes of 60 exist at 372 and 4189 (not read in context). Writes found in `src/lib/` only (components not searched); no write in the growth path, so it reads as a per-tile value that does not change during play here (inference from the grep, not a full read).

## 2. Key functions

- `upgradeServiceBuilding`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 1351-1391. The guard order and price formula are at 1359-1380; the level change and debit at 1384-1389.
- `evolveBuilding`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 1518-1742. Abandonment at 1623-1634; age at 1642; target at 1650-1669; consolidation at 1718-1731; final one-step update at 1740.
- `simulateTick`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 2152; the zoned call at 2296-2299.
- Tick timer: `/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx` 811-814 (interval) and 819 (call).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Level cap | Cap 5 (1250) |
| Price doubles with each level | Base x 2^level, base 2 (1252, 1377). Base is the catalogue price (`TOOL_INFO`, 1373). From level 1 to 5 the upgrades cost 2B, 4B, 8B, 16B (30B total, arithmetic) |
| Effect grows linearly per level | +20% per level above 1 (1251, 1292): range 100, 120, 140, 160, 180 percent for levels 1 to 5 |
| Refusal order: cap, build state, funds | Checks at 1362, 1365, 1370, 1380 |
| Level moves one step toward a target | `max(level, min(target, level + 1))` (1740) |
| Target = clamp of a weighted sum | Divisors 24 (land value), 28 (coverage, 0-100 scale), 60 ticks (age) (1669) |
| Demand boost above a threshold | Threshold 30, scale 70, max 0.7 (1666); demand is clamped to -100..100 elsewhere, so the boost tops out at 0.7 |
| Abandonment chance | Demand below -20, age over 30, chance capped at 0.02 (1623-1626) |
| Consolidation age gate | Age over 12 (1718) |

Worked arithmetic from the formulas (not a run): on default land (50 / 24 = 2.08), no services, no demand boost, the target is floor(2.08) = 2 with the age term at 0. After 60 eligible ticks the age term is 1.0, so the target is floor(3.08) = 3. At the desktop speed settings that is 30 s, 18 s or 12 s for 60 ticks at 500, 300 or 200 ms.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the upgrade (cap, construction, abandoned, price = base x 2^level, funds, then +1 level and the debit together) and the one-step growth toward a target. It omits the service-type set check, the coverage recalculation, the power and water gates and the starter exception, the abandonment branch and its chance, the footprint consolidation (which can jump the level straight to the target), the age gate on consolidation, the population and jobs updates, and the UI's duplicate price line. The constants are the donor's; the catalogue base cost and the coverage average are inputs.

```ts
// Licence: MIT (donor, Copyright (c) 2025 amilich). Shape adapted from the donor's rules; the constants are the donor's values.
const MAX_LEVEL = 5;
const RANGE_PER_LEVEL = 0.2;   // +20% range for each level above 1
const COST_BASE = 2;           // each upgrade costs twice the one before

interface Station {
  level: number;
  baseCost: number;            // catalogue price of this building type
  baseRange: number;
  underConstruction: boolean;
  abandoned: boolean;
}
interface Ledger { money: number; }

// Donor order: max level, construction, abandoned, price, funds; then +1 level and the debit together.
function tryUpgrade(s: Station, ledger: Ledger): number | null {
  if (s.level >= MAX_LEVEL) return null;
  if (s.underConstruction || s.abandoned) return null;
  const price = s.baseCost * Math.pow(COST_BASE, s.level);
  if (ledger.money < price) return null;
  ledger.money -= price;
  s.level += 1;
  return price;
}

function effectiveRange(s: Station): number {
  return s.baseRange * (1 + (s.level - 1) * RANGE_PER_LEVEL);
}

interface Zoned { level: number; age: number; }

// One eligible tick: age goes up by 1, then the level moves at most one step toward the target.
function growOneTick(b: Zoned, landValue: number, coverage: number, demand: number): void {
  b.age += 1;
  const demandBoost = Math.max(0, (demand - 30) / 70) * 0.7;
  const target = Math.min(MAX_LEVEL, Math.max(1, Math.floor(landValue / 24 + coverage / 28 + b.age / 60 + demandBoost)));
  b.level = Math.max(b.level, Math.min(target, b.level + 1));
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new): the cap, doubling price and linear per-level multiplier as catalogue data for a player-paid upgrade. Parity-checklist row 18 (loot roll and XP award): a paid level must debit the same ledger as the XP and loot award, in one step.
- today: (not read; no Frankendom file opened from this session)
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is written from the donor's rules and keeps its constants)
- Brief rule served: one ledger (price debit and level change are one step); zones as data (base price and range per item type); server-verified (the refusal order must run on the server, not in the client)

Best transferable idea: a paid level-up with a hard cap, price that doubles per level, and a linear per-level multiplier, all as catalogue data with the refusal order fixed (cap, build state, funds) and the debit and level change in one step.
Decision (proposed): adapt - keep the cap, the doubling price and the linear per-level multiplier as catalogue data for a paid upgrade; reject the city growth formula (land value, age and demand have no fight counterpart).
Acceptance: A server test buys level 2 of an upgradeable item for base x 2, refuses a buy at level 5, refuses a buy when money is short, and asserts the debit and the level change land in one ledger step.

## 6. Gaps and risks

- The growth formula (landValue, coverage, age, demand) belongs to a city economy. A fight has no land value or demand; reject it for the fight and keep only the one-step idea if a building-style progression is ever needed.
- The one-step rule is not universal in the donor: footprint consolidation sets the level straight to target (1726). Frankendom must pick one rule and test it.
- The upgrade and growth run in the browser, in React state (`GameContext.tsx` 980). The donor does not verify anything on a server. Frankendom must run the cap, funds and debit checks on the server.
- The UI's success flag is set inside a React state updater (`GameContext.tsx` 977-990), so it may not reflect the actual outcome when the updater runs late. Do not copy that pattern.
- Doubling prices reach 16x base at the last upgrade. This is a money sink, not a balance check; any Frankendom curve needs its own balance numbers as data.
- Abandonment can remove a building from play (1577-1634). Frankendom has no equivalent and should not copy it without a ruling.
- Read: `upgradeServiceBuilding`, `evolveBuilding` (growth and upgrade rules), the tick loop and timer. Not read: consolidation helpers and the population/jobs tail after 1742.

