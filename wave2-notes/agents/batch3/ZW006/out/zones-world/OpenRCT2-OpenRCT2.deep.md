# OpenRCT2-OpenRCT2 (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` | Licence: GPL-3.0 (`licence.txt`: "GNU GENERAL PUBLIC LICENSE Version 3"; header of `Park.cpp`, line 7: "OpenRCT2 is licensed under the GNU General Public License version 3.") | C++ | symbol `calculateGuestGenerationProbability`

Checked: The hint file `src/openrct2/world/SurfaceData.cpp` is the wrong file. Its 657 lines are slope-raising and lowering tables for terrain editing (lines 649-654 seen), with no zone, spawn or population logic. I opened the real mechanism in `Park.cpp`: lines 1-12 (header), 45-65 (`GetRandomPeepSpawn`), 66-101 (value for money), 103-161 (suggested guest maximum), 163-213 (generation probability), 215-238 (`generateGuests`), 240-248 (campaign guest), 260-354 (`Initialise` and `Update`), 356-374 (`CalculateParkSize`), 538-558 (`GenerateGuest`). Also `src/openrct2/world/MapOwnership.cpp` 18-40 (land and construction rights, a zone boundary rule), `src/openrct2/management/Marketing.cpp` 48-62 (campaign probability lookup), `src/openrct2/scenario/Scenario.h` 61-62 (RNG declarations). Not read: the body of `CalculateParkRating` (376 onward), `GetEntranceFee`, `RideCustomersInLast5Minutes`, the full campaign probability table, the body of `ScenarioRand`, the caller of `Park::Update`, the script hook body in `calculateSuggestedMaxGuests` (145-159, only its shape), and the `Map.cpp` spawn removal at 1481-1486 (grep only). Callers: I did not grep all callers of `generateGuests` or `GenerateGuest` (one call site each, seen in this file). Confidence: high on the cadence, the threshold formula and the roll order; medium on the rating input (not read). Camera: not a camera cell.

## 1. Mechanism

A park-wide guest generator. Each `Park::Update` call makes one random roll against a 16-bit threshold (the caller of `Update` and how often it runs were not read). The threshold is recomputed on a slow cadence from park rating, population, a soft cap, a hard ceiling, entrance fee against ride value, and park awards. Spawns go to a random park entrance.

Order of steps:
- (a) Cadence. `Park::Update` (320) runs the slow block when `currentTicks % 512 == 0` (334). The comment says "every ~13 seconds" (333). In this order: rating (336), valuations (337), value for money (338), suggested maximum (339), then the threshold (340). So the threshold uses this block's rating, cap and value.
- (b) Every `Update` call, after the slow block: `generateGuests` (353).
- (c) Main roll (218): `ScenarioRand() & 0xFFFF` is compared with the stored threshold. On a hit, the guest is made unless the park is in difficult mode and population is over `suggestedGuestMaximum + 150` (220-223).
- (d) Campaign rolls (227-237): each active marketing campaign has its own probability from a table (`Marketing.cpp` 48, 61). It is rolled against 65535 (232-233). A hit makes a guest tagged with the campaign (235, 240-247). The difficult-mode gate in (c) does not apply to these rolls.
- (e) `GenerateGuest` (538-558): pick a random entrance with `ScenarioRand() % peepSpawns.size()` (58). Make the guest there (545), reverse the spawn's direction, aim the guest at the tile centre, and set state `enteringPark` (554).

The threshold (`calculateGuestGenerationProbability`, 163-213):
- Base: `50 + clamp(rating - 200, 0, 650)` (166). So rating 200 gives 50, and rating 850 or more gives 700.
- Population `numGuests = numGuestsInPark + numGuestsHeadingForPark` (169). If it is over the suggested maximum, divide by 4 (170-172), and divide by 4 again in difficult mode (174-176).
- If it is over 52000, divide by 4 (181-183).
- Entrance fee above the park's total ride value for money: divide by 4 (188-190). If the fee is over twice that value, divide by 4 again (192-194).
- Each park award: positive adds a quarter (204), negative removes a quarter (208). The comment at 201 says "+/- 0.25%", but the code moves the value by 25%. I trust the code.

Suggested maximum (`calculateSuggestedMaxGuests`, 103-161):
- Sum of the ride type `BonusValue` over open rides that are not broken down or crashed (112-116).
- Difficult mode: cap the sum at 1000 (139). Add 2 times `BonusValue` for each "good" ride: tested, has track, has data logging, station segment length at least 600<<16 (127), excitement at least 6.00 (129, 133). The sum is capped at 65535 (143). A script hook can change the value (145-159, not read in detail).

Value for money (`calculateTotalRideValueForMoney`, 75-101): per open, unbroken ride, `value - price[0]` (92, when prices are unlocked and the no-money flag is off), and the positive part is doubled (94-96).

Initialise (`Initialise`, 260-312): the threshold is reset to 0 (272), and the entrance list is cleared (287).

Also read: `MapOwnership.cpp` 18-40 is a zone boundary rule, separate from population. A tile is land-owned by default (20). Construction rights are granted when a path or a park entrance is on the tile (26-30). They are withdrawn when the tile is too high or too low relative to the surface (31-35). This is a rule for which tiles the player can build on, not a population mechanism. Transfer to Frankendom: the shape "zone rights from a sparse seed, with a height clearance" could be data for zone boundaries, but it is not a spawn mechanism.

## 2. Key functions

- `calculateGuestGenerationProbability`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` 163-213. Threshold formula, in order.
- `generateGuests`: same file, 215-238. Main roll (218-225) and campaign rolls (227-237).
- `calculateSuggestedMaxGuests`: same file, 103-161. Soft cap input, difficult bonus.
- `calculateTotalRideValueForMoney`: same file, 75-101. Value input to the fee penalty.
- `Park::Update`: same file, 320-354. Cadence (334-340) and the roll on every update (353).
- `GetRandomPeepSpawn` and `GenerateGuest`: same file, 53-58 and 538-558. Spawn point pick and guest placement.
- `CheckMaxAllowableLandRightsForTile`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/MapOwnership.cpp` 18-40 (zone rights, read, not sketched).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Roll against a 16-bit threshold on each update | Scale 0 to 65535 (Park.cpp 218, theirs) |
| Base chance from attractiveness | Base 50, rating offset 200, span 650 (Park.cpp 166, theirs). The rating itself is not read. |
| Soft cap: chance divided by 4 above the suggested maximum | Divisor 4 (172, theirs). Difficult mode divides again (176). |
| Hard ceiling: divide again above a fixed population | 52000 and divisor 4 (181-183, theirs) |
| Price check: divide by 4, or by 16 when the fee is over twice the value | Divisors 4 and 4 (190, 194, theirs) |
| Awards move the chance by a quarter | 25 percent (204, 208, theirs). The comment at 201 says 0.25 percent. |
| Difficult gate: no spawn while over the suggested maximum plus slack | Slack 150 (221, theirs); difficult cap 1000 (139, theirs); bonus factor 2 (133, theirs); segment 600<<16 (127, theirs); excitement 6.00 (129, theirs) |
| Slow recompute of the threshold, roll on every update | Period 512 ticks (334, theirs) |
| Campaign extra rolls | Own table (`Marketing.cpp` 48); roll against 65535 (232, theirs) |

## 4. TypeScript sketch

simplified: keeps the threshold formula in donor order (base, soft cap with the difficult extra divide, hard ceiling, fee penalty, awards) and the roll with the difficult gate. Takes the threshold as an input, so the 512-tick cadence and the recompute of rating, cap and value are omitted. Omits the suggested-maximum sum over rides, the value-for-money sum, the marketing campaign rolls, the script hook, the broken-or-crashed filter, the spawn-point pick and guest placement (passed in as a callback), and the guest state. Reorders: nothing.

```ts
// Licence: GPL-3.0 (donor, OpenRCT2). Clean-room sketch written from the described mechanism, not a translation.
interface ZonePopulation {
  rating: number;             // zone score input; donor uses (rating - 200) clamped to 0..650
  present: number;            // guests inside the zone
  headingIn: number;          // guests on their way in
  suggestedMax: number;       // soft cap, recomputed on a slow cadence
  hardCeiling: number;        // above this the chance is cut again
  feeOverValue: boolean;      // entrance fee above the value of the attractions
  feeOverTwiceValue: boolean; // fee more than twice that value
  awardsPositive: number;
  awardsNegative: number;
  difficult: boolean;         // hard gate mode
}

// Chance of a spawn roll, on a 16-bit scale (0..65535). Same order as the donor: base, soft cap, hard ceiling, fee, awards.
function spawnThreshold(z: ZonePopulation): number {
  let p = 50 + Math.min(Math.max(z.rating - 200, 0), 650);
  const n = z.present + z.headingIn;
  if (n > z.suggestedMax) {
    p = Math.floor(p / 4);
    if (z.difficult) p = Math.floor(p / 4);
  }
  if (n > z.hardCeiling) p = Math.floor(p / 4);
  if (z.feeOverValue) {
    p = Math.floor(p / 4);
    if (z.feeOverTwiceValue) p = Math.floor(p / 4);
  }
  for (let i = 0; i < z.awardsPositive; i++) p += Math.floor(p / 4);
  for (let i = 0; i < z.awardsNegative; i++) p -= Math.floor(p / 4);
  return p;
}

// One roll per update against the stored threshold. In difficult mode no spawn while the zone is above suggestedMax + 150.
function tickRoll(
  z: ZonePopulation,
  threshold: number,
  rand16: () => number,         // returns 0..65535
  spawnAtRandomPoint: () => void,
): void {
  if (rand16() < threshold) {
    if (!z.difficult || z.suggestedMax + 150 >= z.present) spawnAtRandomPoint();
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/zw006_rct_population.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity-checklist row 23 (zone population: spawn caps, respawn). The donor sets a soft population target and a chance per roll, not a fixed count. It has no despawn: guests leave by their own state machine, which was not read.
- today: not checked. This pass had no access to the Frankendom repo, so I do not know what exists at the target path.
- Reuse tag: adaptable (GPL-3.0: clean-room, shape only; the sketch was written fresh from the mechanism)
- Brief rule served: zones as data (base, divisors, ceiling, slack and the zone score are zone fields); one engine (the threshold and the roll live in the engine); server-verified (the roll must use the server's seeded RNG and be logged with its threshold)

## 6. Gaps and risks

- GPL-3.0: clean-room and shape only. The sketch was written from the mechanism.
- A soft cap, not a hard one. Above the suggested maximum the donor still spawns, only less often; only difficult mode gates hard, and only for the main roll. Zone population can use this. Fight participants cannot: MAX_ATTACKERS = 3 must stay a hard limit in `src/fight`, not a probability.
- The inputs are park economics: rating, ticket price against ride value, and park awards. Frankendom has no economy of that kind. Its zone score would have to be data, and the price rule would need a real equivalent or be dropped.
- Determinism is good: the donor rolls its scenario RNG. Frankendom's server must roll its own seeded RNG, and each roll should be logged with its threshold, so a replay can rebuild the population.
- Stale threshold. The threshold is recomputed every 512 ticks, so the roll may use a value up to 511 ticks old. That is fine for population. Frankendom should state the period as zone data.
- Donor comment error. The comment at 201 says "+/- 0.25%", but the code moves the chance by 25%. Do not copy the comment's number into Frankendom's data.
- Numbers are park-scale: 52000 guests, 1000 as the difficult cap, 65535 as the overall cap. Frankendom zone data must set its own scale.
- The shape is fine for zone population. Only the economic inputs are park-specific: they will not carry over without a Frankendom equivalent.

Best transferable idea: Drive a zone's spawn chance from its attractiveness, with a soft cap that divides the chance above a population target, a hard ceiling, and a difficult gate, all rolled once per update on the server's seeded RNG.
Decision (proposed): adapt. Take the roll with a computed threshold, the soft cap divisor and the hard ceiling as zone data for `origins/server/world-spawns.ts`, but use a zone score from zone data instead of park economics, and keep the hard limits for fights (MAX_ATTACKERS = 3) out of this rule.
Acceptance: A server test with a fixed seed shows a zone 1.5 times over its suggested maximum spawns at one quarter of the roll rate of a zone at its cap; a difficult zone spawns nothing while it is more than 150 above its suggested maximum; and every roll is logged with its threshold so that a replay rebuilds the same population.

Reuse tag: adaptable (GPL-3.0: clean-room, shape only)
Brief rule served: zones as data (base, divisors, ceiling, slack and zone score are zone fields); one engine (the threshold and roll live in the engine)
