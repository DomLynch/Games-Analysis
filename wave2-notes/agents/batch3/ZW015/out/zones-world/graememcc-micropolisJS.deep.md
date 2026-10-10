# graememcc-micropolisJS (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/graememcc-micropolisJS/src/residential.js` (symbol `residentialFound`, with `src/valves.js` `Valves.prototype.setValves` and the frame loop in `src/simulation.js`) | Licence: GNU GPL v3 with additional terms (LICENSE: "ADDITIONAL TERMS per GNU GPL Section 7"; no trademark or publicity rights granted) | JavaScript (ES modules, some TypeScript) | symbol `residentialFound`

Checked: `src/residential.js` 47-55 (`getZonePopulation`), 117-149 (`growZone`), 150-186 (`degradeZone`), 211-289 (`residentialFound`, read in full); `src/valves.js` 28-36 (constants) and 54-142 (`setValves`, read in full); `src/simulation.js` 36-70 (constructor), 177-246 (`simTick`, `_simFrame`, `_constructSimData`), 247-300 (`init`, first full scan), 302-403 (`simulate`, all 16 phases, read in full); `src/game.js` 660-676 (`tick`); `src/mapScanner.js` 1-75 (read in full); `src/random.ts` 1-50; `src/budget.js` 160-200 (awaiting flag). Also opened and rejected as the mechanism: `src/blockMap.ts` (the hint file: a generic block-grid container, 122 lines, no zone logic). Callers: `residentialFound` is registered once with the scanner (residential.js 315); `setValves` is called once (simulation.js 324); `simTick` is called once (game.js 670). Not read: `census.js` history shifting (`take10Census`), `placeResidential`, `buildHouse`, `evalResidential`, `ZoneUtils.incRateOfGrowth`, `Traffic.makeTraffic`; so the claims below about rank tiles and road checks are as far as I read. Depth: thin on the valve inputs (the census history arrays that feed the ratios were not read), full on the frame loop, the zone decision and the valve arithmetic. Confidence: high for the frame loop and the valve arithmetic; medium for the zone rank mapping. camera_scope: n/a (not a camera topic).

## 1. Mechanism

- Time is wall-clock gated and advanced one phase at a time. `tick()` (game.js 660-676) runs on `setTimeout(0)` and calls `simTick()` when not paused. `_simFrame` (simulation.js 184-219) returns at once while `budget.awaitingValues` is set (185-186; set by budget.js 171 and 193), and otherwise runs only when at least `threshold` ms have passed since the last run: 100 ms slow, 50 ms medium, 10 ms fast (189, 200, 204, 212). A run calls `_simulate` once (216), which executes exactly one phase.
- A city cycle is 16 phases (`_phaseCycle &= 15`, 313). Phase 0 (321-326): `cityTime` advances by one; on even `simCycle` the valves are updated from the census (323-324); then the census is cleared (326). So the valves read the census filled by the previous cycle. Phases 1-8 (337-338): each phase scans one vertical strip of `width/8` columns over every row, and `MapScanner.mapScan` (mapScanner.js 37-38) calls the first matching action per tile (63, 66). Phase 9: 10-year and 120-year censuses and the tax (341-), not read in full. Phases 10-15: power, pollution, crime and fire scans at speed-dependent divisors (speedPowerScan etc., 302-306).
- The zone decision (`residentialFound`, residential.js 211-289). For each residential tile the handler adds its population to the census (222). If population is above a random number from 0 to 35 (231), it runs a traffic search to a commercial zone (the search itself is not read); with no route the zone is degraded at once and the handler returns (233-237). Otherwise it samples the zone only if the tile is empty or `Random.getChance(7)` passes (245). `getChance(7)` is `(rng() & 7) === 0`, which is one in eight (random.ts 23-25). The zone score is `valves.resValve + locationScore` (249), or -500 if the zone is unpowered (253).
- Growth and decay are two signed-16-bit rolls, tested in order. Grow if `zoneScore > -350 && (zoneScore - 26380) > signed16()` (264). Decay if `zoneScore < 350 && (zoneScore + 26380) < signed16()` (282). Each roll is only drawn when its score test passes (short-circuit). Growth then calls `growZone`, which does nothing above pollution 128 (121) and otherwise grows a free zone or raises population while it is below 40 (127-142). Decay calls `degradeZone`: population above 16 drops one rank (157); at 16 it becomes free zone with houses (162-); population 0 does nothing (`degradeZone` returns early at 152-153, not shown in quotes).
- The valve (valves.js 54-142, runs at most once per two cycles). It turns the census into three ratios. Residential: employment = (commercial + industrial history[1]) / (residents / 8); migration = residents x (employment - 1); births = residents x 0.02; projected residents = residents + migration + births. Commercial and industrial are projected from an internal-market term and a labour base clamped to 0..1.3 (91). Each ratio is capped at 2 (constants at valves.js 61-63) and converted to a step: `(ratio - 1) * 600 + taxTable[z]` (125), where `z = min(cityTax + gameLevel, 20)` (124) and `taxTable` runs from 200 at index 0 to -600 at index 20 (33-35). The valve accumulates the rounded step and clamps to +-2000 for residential and +-1500 for commercial and industrial (129 and its siblings). A player cap flag stops a positive valve at 0 (133).

## 2. Key functions

- `residentialFound`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/residential.js` 211-289. Census, sampling gate, score, grow and decay rolls.
- `growZone` and `degradeZone`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/residential.js` 117-149 and 150-186. Rank changes and their pollution and population limits.
- `Valves.prototype.setValves`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/valves.js` 54-142. The demand accumulator (three valves).
- `Simulation.prototype.simulate` and `_simFrame`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/simulation.js` 177-219 and 302-403. Frame gate, 16-phase cycle, strip scan, valve timing.
- `MapScanner.prototype.mapScan`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/mapScanner.js` 37-70. The strip scanner and action dispatch.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-type demand accumulator, clamped, stepped from a ratio | Valve ranges +-2000 (residential) and +-1500 (commercial, industrial) (theirs, valves.js 28-30); step `(ratio-1)*600 + taxTable[z]` (theirs, valves.js 125) |
| Tax-indexed table as an offset | 21-row table, 200 down to -600 (theirs, valves.js 33-35); index = min(tax + level, 20) (theirs, valves.js 124) |
| Cap flag clamps the positive side | Player cap (theirs, valves.js 133) |
| Sample a fraction of entities per cycle | One in eight for non-empty zones (theirs, residential.js 245 with random.ts 25); empty zones always sampled (theirs, residential.js 245) |
| Score offset with two rolls | Grow gate -350, offset 26380 (theirs, residential.js 264); degrade gate 350, offset 26380 (theirs, residential.js 282) |
| Growth blocked by a local hazard | Pollution above 128 (theirs, residential.js 121) |
| Population bands | Population below 40 may grow (theirs, residential.js 140); ranks 24-48 from the tile formula (theirs, residential.js 54-55) |
| Spread a whole-map pass across frames | 16 phases; 8 strips for the zone pass (theirs, simulation.js 313, 337); frame gate 100 / 50 / 10 ms (theirs, simulation.js 189, 200, 204) |

Derived by me from the code (not stated in the donor): with a 16-bit signed roll uniform over 65536 values, the grow roll succeeds with probability (score + 6388) / 65536 when score > -350; at score -350 that is about 9.2%, at score 0 about 9.7%, at score 2000 about 12.8%. The decay roll succeeds with probability (6387 - score) / 65536 when score < 350. A valve step of +180 happens when the ratio is 1.3 and the tax index is 7 (taxTable[7] = 0). These are arithmetic on the donor's constants, not measured in a run.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order per frame: one phase per call; phase 0 updates the valve on every second cycle from the census of the previous cycle, then clears it; phases 1-8 each scan one eighth of the columns, add population to the census, sample each zone, and apply the outcome. The sampling gates, the -500 score for unpowered zones, the short-circuit signed-16 rolls, the one-in-eight sample, the pollution block and the frame gate are kept. It omits the road-connection check (population roll and traffic search), the tile variants and placement (`placeResidential`, `buildHouse`), the hospital branch, the free-zone-with-houses degrade (the sketch just empties the zone), the census histories and the tax and income phase, the power, pollution, crime and fire scans at phases 9-15, and the speed-dependent scan divisors. Population steps are plus or minus 8 rather than the donor's rank mapping. The valve ratio is a parameter to `updateValve`, not computed from census histories.

```ts
// Licence: GPL v3 with additional terms (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng16 = () => number; // uniform integer 0..65535

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Signed 16-bit roll: -32768..32767.
function signed16(r: Rng16): number {
  const v = r();
  return v < 32768 ? v : v - 65536;
}

// Bitmask chance: true when (r & mask) === 0, so mask 7 means one in eight.
function oneIn(r: Rng16, mask: number): boolean {
  return (r() & mask) === 0;
}

// Demand valve: a clamped accumulator for one zone type.
export interface Valve { value: number; range: number; capped: boolean; }

export function stepValve(v: Valve, ratio: number, taxRow: number, taxTable: readonly number[]): void {
  const row = Math.min(taxRow, taxTable.length - 1);
  const step = Math.round((ratio - 1) * 600 + taxTable[row]);
  v.value = clamp(v.value + step, -v.range, v.range);
  if (v.capped && v.value > 0) v.value = 0; // a player cap stops positive growth
}

export interface Zone {
  empty: boolean;         // an empty zone is always assessed
  population: number;     // 0 when empty; grows in steps of 8 (simplified)
  powered: boolean;
  polluted: boolean;      // pollution above the limit blocks growth
  locationScore: number;  // about -3000..3000
}

export type Outcome = "none" | "grow" | "degrade";

// One sampled zone. Non-empty zones are assessed one time in eight.
export function sampleZone(z: Zone, valve: number, r: Rng16): Outcome {
  if (!z.empty && !oneIn(r, 7)) return "none";
  const score = z.powered ? valve + z.locationScore : -500;
  if (score > -350 && (score - 26380) > signed16(r)) return "grow";
  if (score < 350 && (score + 26380) < signed16(r)) return "degrade";
  return "none";
}

export function applyOutcome(z: Zone, o: Outcome): void {
  if (o === "grow") {
    if (z.polluted) return;               // grow is attempted, then nothing happens
    if (z.population < 40) { z.population += 8; z.empty = false; }
  } else if (o === "degrade") {
    if (z.population > 16) z.population -= 8;
    else if (z.population === 16) { z.population = 0; z.empty = true; }
  }
}

// Frame gate: one simulation phase at most every threshold ms; nothing while a budget dialog is open.
export function frameDue(nowMs: number, lastMs: number, thresholdMs: 10 | 50 | 100, awaiting: boolean): boolean {
  return !awaiting && nowMs - lastMs >= thresholdMs;
}

export interface Census { resPop: number; }

// 16-phase city cycle. Each call to step() runs one phase.
export class PhasedCity {
  private phase = 0;
  private simCycle = 0;
  cityTime = 0;
  census: Census = { resPop: 0 };

  constructor(
    private readonly width: number,
    private readonly zones: (Zone | null)[][],   // [y][x]
    private readonly valve: Valve,
    private readonly rng: Rng16,
    private readonly updateValve: (c: Census) => void,
  ) {}

  step(): void {
    const p = this.phase & 15;
    if (p === 0) {
      this.simCycle = (this.simCycle + 1) % 1024;
      this.cityTime += 1;
      if ((this.simCycle & 1) === 0) this.updateValve(this.census); // uses last cycle's census
      this.census = { resPop: 0 };
    } else if (p <= 8) {
      const from = Math.floor(((p - 1) * this.width) / 8);
      const to = Math.floor((p * this.width) / 8);
      for (const row of this.zones) {
        for (let x = from; x < to; x++) {
          const z = row[x];
          if (!z) continue;
          this.census.resPop += z.population;
          applyOutcome(z, sampleZone(z, this.valve.value, this.rng));
        }
      }
    }
    this.phase = (this.phase + 1) & 15;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: a per-zone spawn valve and the sampled spawn and despawn roll). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The donor's "degrade" is its despawn; the donor has no grace timer, so the grace-timer part of row 23 is not covered by this donor.
- Also relevant to the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3): the 16-phase sweep is a per-tick budget. I did not name it as the row because the cell is zones.
- today: not checked in the Frankendom repo (not read).
- Reuse tag: rewrite-from-idea (GPL v3 with additional terms; clean-room only)
- Brief rule served: zones as data on one runtime (valve range, cap flag and population bands are zone data); server-verified outcomes (the valve and the roll run on the server, not the client)

## 6. Gaps and risks

- GPL v3 with additional terms: clean-room only. The sketch is written from the mechanism, not translated. The donor has no trademark grant, so no donor names or art should be carried over.
- The valve is an economy model (residents, jobs, tax table, external market). Frankendom's rulings give no such model. Only the shape transfers: a clamped accumulator per zone type, a cap flag, and a sampled roll. The economy numbers (600, 0.02, 1.3, 3.7, the tax table) must not be copied as spawn rules.
- Authority: the donor rolls with `Math.random`-backed helpers in one process. Frankendom must roll on the server and log the chosen spawn or despawn in its one ledger.
- Lag: the valve reads the census of the previous cycle (simulation.js 323-326). A server spawn valve that reads last cycle's counts is stale by up to one cycle; that is acceptable only if the test says so.
- Donor quirk, read and not run: in `degradeZone`'s lowest-density branch (residential.js 162-171), the inner loop calls `map.setTile(x, y, ...)` on the centre tile for every neighbour, not on `(xx, yy)`. As written, the neighbours are not changed by that loop. The sketch does not copy this.
- The frame gate is wall-clock and the donor's `tick()` is a `setTimeout(0)` loop (game.js 660-676). A server tick must be fixed-step, not wall-clock gated (row 18). The 16-phase sweep is the part to keep, driven by the fixed step.
- Despawn: the donor's zone decay is a probability roll, not a timer. Row 23 asks for a grace timer on empty; a timer must be added in Frankendom.

Best transferable idea: Keep a clamped demand accumulator per zone type, updated on a fixed schedule from last cycle's counts, and sample each zone with a bounded roll while spreading the zone pass over the ticks of a cycle.
Decision (proposed): adapt - take the clamped valve, the cap flag, the one-in-N sample and the 8-slice sweep; drop the city economy (tax table, employment, internal market). The server must run the valve and the roll and log each spawn.
Acceptance: a server test: with a zone capped the valve never goes above 0; each zone is sampled exactly once per 16-tick cycle; no tick samples more than one eighth of the zone columns; a zone with no players for the grace period has its population reduced in steps and never goes above its band.

Reuse tag: rewrite-from-idea (GPL v3 with additional terms; clean-room only)
Brief rule served: zones as data on one runtime; server-verified outcomes
