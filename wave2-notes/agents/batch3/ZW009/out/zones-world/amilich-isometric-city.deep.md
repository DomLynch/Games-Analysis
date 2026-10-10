# amilich-isometric-city (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` | Licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2025 amilich") | TypeScript | symbol `evolveBuilding` (driver `simulateTick`, line 2152)

Checked: The list hint `src/games/isocity/types/zones.ts` is the wrong file: it is 5 lines and only declares `ZoneType`. The real zone logic is in `src/lib/simulation.ts`. Read in full: `evolveBuilding` (1518-1752, the abandon, clear, spawn-independent growth and level parts; the consolidation footprint helpers `findFootprintIncludingTile` and `applyBuildingFootprint` were not read), the grass spawn block (2252-2300), `simulateTick` loop head (2152-2186). Read in part: demand formula (1833-1900; the `calculateStats` population and jobs totals were not read, and I did not read where `state.stats.demand` is written, so "one tick lagged" is an inference). Tick driver read: `src/context/GameContext.tsx` 798-825. Only caller of `evolveBuilding` is 2299 (grep over `src`). Confidence: high on the spawn, abandon and clear numbers and order; medium on the demand inputs. This is a city builder: "zone" here is a land-use tag, not a world zone. Nothing streams, bounds or transitions a world. Only the zone population director transfers.

Best transferable idea: a per-slot population director where spawn, abandonment and recovery each run off one lagged demand signal, with two thresholds that leave a dead band, an age grace before anything can be removed, and per-tick chances that are capped.
Decision (proposed): adapt - the shape (dead band between spawn/despawn thresholds, grace age, capped per-tick chance) is what row 23 needs; the economy inputs and city-growth rules are rejected. For Frankendom the demand signal must come from server-side counts in the zone (players and creatures), not jobs and taxes.
Acceptance: a server test that holds zone demand at -40 for 300 ticks and asserts no built spawn is removed before 30 ticks of age, and that removal never exceeds the 2% per-tick cap in the zone data.

## 1. Mechanism

- Scope: a city-builder economy, one tick at a time. The zone population part is the grass spawn block in `simulateTick` (2256-2286) plus the abandoned and built branches of `evolveBuilding` (1553-1650).
- Driver: a wall-clock `setInterval` in `GameContext.tsx` (798-825). The interval is 500, 300 or 200 ms on desktop for speeds 1-3 (line 812), and each interval calls `simulateTick` once on the whole grid (819). No delta time and no accumulator: one call is one discrete step. No timer is started when speed is 0 (`if (state.speed > 0)`, read at 798-800; the cleanup was not read).
- Demand: each zone has a value in -100..100 (`residentialDemand` clamped at 1892). Residential is `(jobs - population * 0.7) / 18` (1881). Commercial and industrial use the same shape with other weights (1882-1883, not quoted). The tax rate multiplies the base (`taxMultiplier`, 1842, 1 at 9 percent tax, 0 at 100 percent) and adds `(9 - tax) * 2`.
- Spawn (empty zoned grass, 2256-2286): the candidate is the zone's first building type. Spawn needs road access and either utilities or a starter building (2283). Chance per tick = 0.05 x clamp((demand + 30) / 80, 0, 1) (2272-2274). So spawn is 0 at demand -30 or below, reaches the full 5 percent at demand 50, and the ramp is linear in between. The footprint check (`canSpawnMultiTileBuilding`) runs before the building is placed.
- Built slot (`evolveBuilding`, not abandoned): it first checks abandonment. If demand < -20 and age > 30, chance = min(0.02, |demand + 20| / 4000) + utility penalty + level penalty (1626-1634). Penalties: +0.005 with no power, +0.005 with no water, both skipped for starter buildings; +0.003 at level 2 or below. One roll. On abandon the slot is marked and produces zero population and jobs, and the function returns (1635-1637). If it survives, age increases by 1 (1642), then the growth part runs (level target at 1668, consolidation at 1697-1725).
- Abandoned slot: if demand > 10, chance = min(0.12, (demand - 10) / 600) (1581-1585). A roll that succeeds reverts the slot to grass (the whole footprint for multi-tile buildings). Otherwise the slot produces nothing and its age rises by 0.1 per tick (1616). Abandoned slots never reach the abandon check, because the abandoned branch returns first (1579-1619).
- Order per tick: the loop visits every tile (2179-2180). A grass zoned tile may spawn. A built zoned tile calls `evolveBuilding` (2299) with the incoming `state.stats.demand`. Inside `evolveBuilding` the order is: abandoned branch (clear or idle), then built branch (abandon roll, then age, then growth).
- Hysteresis: abandonment needs demand below -20 and clearing needs demand above 10. Between them neither happens. Spawn is possible whenever demand is above -30.
- Level: the target level is `min(5, max(1, floor(landValue/24 + serviceCoverage/28 + age/60 + demandBoost)))` (1668-1669). The incremental step is +1 per tick (1740). The consolidation path can set the level directly (1725 area), so "+1 per tick" is not absolute.

Comment versus code: the comment at 2269 says "At demand 0: 2.5% chance (reduced)". The code gives 0.05 x 30 / 80 = 0.01875, which is 1.875 percent. The code is the value used here; the comment is out of date.

## 2. Key functions

- `evolveBuilding`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 1518-1752 (abandoned branch 1579-1619, abandon roll 1623-1637, growth 1642-1752).
- Grass spawn block inside `simulateTick`: same file 2256-2286. Evolve call: 2299.
- `simulateTick`: same file 2152; loop head 2179-2180.
- Demand clamp and tax terms: same file 1842-1846, 1881, 1892.
- Tick driver: `/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx` 798-825 (interval at 812, `setInterval` at 814, `simulateTick` call at 819).
- Licence: `/mnt/frankendom-donors/amilich-isometric-city/LICENSE` line 1 and 3.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Spawn chance ramps linearly with demand, zero below a floor, capped at full | base 0.05; floor -30; full at 50 (2272-2274) |
| Despawn only below a threshold, and only after an age grace | threshold -20; grace age 30 (1623) |
| Despawn chance grows with distance below the threshold and is capped | min(0.02, abs(d + 20) / 4000) (1626) |
| Penalties that make fragile units more likely to be removed | +0.005 no power, +0.005 no water, +0.003 level <= 2 (1629-1632) |
| Recovery only above a second threshold, with a capped chance | threshold 10; min(0.12, (d - 10) / 600) (1581-1584) |
| Removed units age slowly and keep counting | abandoned age +0.1 per tick (1616) |
| Demand input clamped to a fixed range | -100..100 (1892) |
| Dead band between thresholds (no change) | derived: between -20 and +10 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (empty spawn check, then abandoned branch with clear or idle, then built branch with abandon roll and age). It omits the growth and level part (targetLevel, consolidation, footprint merging), the utility and low-level penalties on abandonment, the construction gate, the road-access and utility gate on spawning, the multi-tile footprint reset on clear, and the pollution update. It takes `rand` as a parameter instead of `Math.random`, and it takes demand as an argument, so it does not read `state.stats`. Numbers are the donor's; the tuning names are ours.

```ts
// Licence: MIT (amilich-isometric-city, Copyright (c) 2025 amilich). Adapted shape, rewritten here.
// Zone population director: one slot per zoned tile; demand is a lagged -100..100 signal per zone.

type SlotState = 'empty' | 'built' | 'abandoned';

interface Slot {
  state: SlotState;
  age: number; // ticks since built; abandoned slots age at one tenth the rate
}

interface ZoneTuning {
  spawnBase: number;      // 0.05 chance per tick at full demand
  spawnZeroAt: number;    // -30: no spawns at or below this demand
  spawnFullAt: number;    // 50: full base chance at or above this demand
  abandonBelow: number;   // -20: abandonment only when demand is below this
  abandonGrace: number;   // 30: built slot must be older than this (ticks)
  abandonCap: number;     // 0.02: per-tick abandonment cap
  abandonDivisor: number; // 4000: how fast the chance grows below the threshold
  recoverAbove: number;   // 10: abandoned slots can clear only above this demand
  clearCap: number;       // 0.12: per-tick clearing cap
  clearDivisor: number;   // 600: how fast the clearing chance grows above the threshold
}

type TickEvent = 'none' | 'spawned' | 'abandoned' | 'cleared';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function spawnChance(demand: number, t: ZoneTuning): number {
  const factor = clamp01((demand - t.spawnZeroAt) / (t.spawnFullAt - t.spawnZeroAt));
  return t.spawnBase * factor;
}

export function abandonChance(demand: number, t: ZoneTuning): number {
  return Math.min(t.abandonCap, Math.abs(demand - t.abandonBelow) / t.abandonDivisor);
}

export function clearChance(demand: number, t: ZoneTuning): number {
  return Math.min(t.clearCap, (demand - t.recoverAbove) / t.clearDivisor);
}

// One tick for one slot. `demand` is the previous tick's value; `rand` returns a number in [0, 1).
export function tickSlot(slot: Slot, demand: number, t: ZoneTuning, rand: () => number): TickEvent {
  if (slot.state === 'empty') {
    if (rand() < spawnChance(demand, t)) {
      slot.state = 'built';
      slot.age = 0;
      return 'spawned';
    }
    return 'none';
  }
  if (slot.state === 'abandoned') {
    if (demand > t.recoverAbove && rand() < clearChance(demand, t)) {
      slot.state = 'empty';
      slot.age = 0;
      return 'cleared';
    }
    slot.age += 0.1;
    return 'none';
  }
  // built: abandonment check first, then age on the survivor
  if (demand < t.abandonBelow && slot.age > t.abandonGrace && rand() < abandonChance(demand, t)) {
    slot.state = 'abandoned';
    return 'abandoned';
  }
  slot.age += 1;
  return 'none';
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor has no respawn timer and no "empty" trigger; its trigger is negative demand. Only the grace-and-threshold shape lands in row 23. The tick is the server tick (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"); the donor's wall-clock interval is not that.
- Numbers as zone data fields: spawn base, spawn zero and full points, despawn threshold, grace, despawn cap, recover threshold, clear cap (see JSON sidecar).
- Reuse tag: adapt-shape (MIT: code may be adapted; the sketch is rewritten from the mechanism, not copied).
- Brief rule served: zones as data (per-zone numbers) and zone population under row 23; server-verified (the director runs on the server, not in the client).

## 6. Gaps and risks

- The donor's demand is economic (jobs, population, tax). Frankendom has no economy here. The signal has to be defined as server-side counts (players and creatures per zone against the zone cap). That definition is ours, not the donor's, and is not tested.
- The donor abandons on negative demand, not on an empty zone. Row 23 asks for despawn on empty with a grace timer. The age grace and the cap transfer; the trigger does not, so the rule has to be changed, not copied.
- `Math.random()` makes the donor non-deterministic. Frankendom needs a seeded RNG per zone so server tests and the fight record (row 19) can replay a run.
- The donor is single-player and client-side, with no authority. Its numbers are not verified in play. Our server tests should assert the caps and grace, not the donor's look.
- The clear path resets whole footprints. Frankendom has no footprints; a creature slot is a single entity, so the multi-tile part is dropped.
- The donor does not persist the director state. Frankendom's ledger rule (one ledger) means the slot state must be in the same store as kills and loot.
- Not read: the `calculateStats` totals that feed demand, and the consolidation helpers. Any claim about how demand is computed for all cases is limited to the lines quoted here.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: none significant
