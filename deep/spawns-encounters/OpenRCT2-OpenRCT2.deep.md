# OpenRCT2-OpenRCT2 (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp | Licence: GPL-3.0 | C++ | symbol Park::generateGuests / GetRandomPeepSpawn (opened: GetRandomPeepSpawn 53-62, calculateSuggestedMaxGuests 103-161, calculateGuestGenerationProbability 163-213, generateGuests 215-238, generateGuestFromCampaign 240-248, Update 320-354)

## 1. Mechanism

- `Park::Update` (320-354) runs each game update. On a week boundary it updates the histories. Every 512 ticks (about 13 s, per the source comment) it recalculates the park rating, valuations, total ride value for money, the suggested guest maximum and the guest probability (in that order, 336-340). Every 4096 ticks it updates the park size. Then it calls `generateGuests` on every update.
- `calculateSuggestedMaxGuests` (103-161) sums the ride type's `BonusValue` for every ride that is open and neither broken down nor crashed (110-116). In difficult mode, a ride that is also tested, has track and data logging, a station segment length of at least `600 << 16` and excitement of at least 6.00 adds a further `2 * BonusValue` to a separate bonus (118-134). In difficult mode the plain sum is capped at 1000 and the bonus added after the cap (137-141). The result is clamped to 65535 (143), and a scripting hook (compiled only with `ENABLE_SCRIPTING`) may change it (145-159).
- `calculateGuestGenerationProbability` (163-213) starts at 50 plus `clamp(rating - 200, 0, 650)`. When guests in the park plus guests heading for it exceed the suggested maximum, the probability is divided by 4 (and by 4 again in difficult mode, 170-178). Above 52000 guests it is divided by 4 once more (181-184). An entrance fee above the total ride value for money divides it by 4, and by 4 again when half the fee (integer division) is still above the ride value (187-196). Each current award then adds (positive award) or subtracts (negative award) a quarter of the running probability, one step per award (199-210).
- `generateGuests` (215-238) rolls `ScenarioRand() & 0xFFFF` against the stored probability (218). A success calls `GenerateGuest()` unless difficult mode is on and the suggested maximum plus 150 is below the guests in the park (221). Each active marketing campaign then gets its own roll (`ScenarioRandMax(65535)` against the campaign's probability, 231-233) and calls `generateGuestFromCampaign` (240-248), which generates a guest and tags it with the campaign. The campaign rolls are outside the difficult-mode gate and the cap damping entirely: each uses the campaign type's own probability (`MarketingGetCampaignGuestGenerationProbability`, 231) and never reads or changes the stored base probability. `GenerateGuest` itself (what it builds, and where it calls `GetRandomPeepSpawn`) was not read.
- `GetRandomPeepSpawn` (53-62) picks one entry of the game state's spawn list uniformly with `ScenarioRand`, or returns null if the list is empty.
- Inputs: park state, rides, awards, campaigns. Outputs: new guests at a spawn point.
- Tick: every park update for the roll; the cap and probability are re-derived every 512 ticks.

## 2. Key functions

- `generateGuests`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` lines 215-238. The per-update roll: base arrival, difficult gate, campaign rolls.
- `calculateGuestGenerationProbability`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` lines 163-213. Base from rating; damped when the crowd exceeds the cap.
- `calculateSuggestedMaxGuests`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` lines 103-161. Soft cap from ride bonuses; difficult-mode bonus; clamp.
- `Park::Update`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` lines 320-354. The caller: week histories, 512-tick recalculation of rating, cap and probability, 4096-tick size update, then the guest roll.
- `GetRandomPeepSpawn`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/world/Park.cpp` lines 53-62. Uniform choice of an entrance.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Arrival is a per-update roll against a probability | 16-bit roll range (theirs) |
| Soft cap: probability drops sharply when the crowd exceeds the cap | divide by 4 (theirs), and by 4 again in difficult mode (theirs), 170-178; 52000 guests divide by 4 again (181-184) |
| Cap is a sum of per-source bonuses (per ride type), clamped | ride `BonusValue` table (theirs); 1000 pre-bonus cap (line 139, theirs); 65535 clamp (line 143, theirs) |
| Hard gate on top of the roll, with slack | +150 slack (line 221, theirs) |
| Separate roll per source (campaign) with its own tag | campaign probability (theirs) |
| Base probability from a reputation value, clamped to a band | base 50, rating band 200-850 (line 166, theirs) |

## 4. TypeScript sketch

Licence: GPL-3.0. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the 52000-guest cut, the entrance-fee penalties and the award adjustments of `calculateGuestGenerationProbability`, the scripting hook, the 512-tick re-derivation (the caller passes the current numbers), the null spawn / null guest case and the campaign tag are omitted; `eligible` and `extraBonus` stand for the donor's open / working test and the difficult-mode ride tests; the campaign roll reuses `rand16` where the donor uses a different random call.

```ts
// Licence: GPL-3.0 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface ParkState { rating: number; inPark: number; heading: number; suggestedMax: number; difficult: boolean; }

// Soft cap: the arrival chance is damped when the crowd is over the suggested maximum.
function arrivalChance(p: ParkState): number {
  let chance = 50 + Math.min(Math.max(p.rating - 200, 0), 650);
  if (p.inPark + p.heading > p.suggestedMax) {
    chance = Math.floor(chance / 4);
    if (p.difficult) chance = Math.floor(chance / 4);
  }
  return chance;
}

// Suggested cap: sum of per-source bonuses; difficult mode caps the base and adds a bonus.
function suggestedMax(sources: { bonus: number; eligible: boolean; extraBonus: number }[], difficult: boolean): number {
  let base = 0, extra = 0;
  for (const s of sources) {
    if (!s.eligible) continue;
    base += s.bonus;
    extra += s.extraBonus;
  }
  if (difficult) base = Math.min(base, 1000);
  return Math.min(base + (difficult ? extra : 0), 65535);
}

// Per update: one roll for the base arrival, one per active campaign.
function guestRolls(p: ParkState, rand16: () => number, campaigns: number[]): number {
  let spawned = 0;
  const gateOpen = !p.difficult || p.suggestedMax + 150 >= p.inPark;
  if (rand16() < arrivalChance(p) && gateOpen) spawned++;
  for (const c of campaigns) {
    if (rand16() < c) spawned++;
  }
  return spawned;
}
```

## 5. Lands in

- TARGET origins/server/world-spawns.ts (the server's per-spawn alive / respawn state, seeded) for a soft arrival cap, with the zone's `density.creatures` budget from origins/mobs/populate.ts as the cap input; a new `origins/mobs/arrival.ts` only if a zone needs a timed arrival roll that populate.ts and world-spawns.ts do not already give. Today populate.ts is a one-shot hard budget and world-spawns.ts is a per-spawn respawn clock, so the donor's genuinely new part is the soft cap: arrival chance damped (not stopped) when live creatures exceed the budget, plus a separate roll per source. Feature map: zones as data. Checklist row 4 (fight loop: what is alive near the player).
- Parity-checklist row: 4.
- Reuse tag: rewrite-from-idea
- Brief rule served: 10 (zone copies with soft cap and seeding); rules 7-9 n/a

## 6. Gaps and risks

- Zones as data: the donor's cap is a sum of ride-type bonuses computed in code; Frankendom's cap is the zone's `density.creatures` times footprint (origins/mobs/populate.ts). The damping factor (4, 4) and the 150 slack must be zone / catalogue fields, not literals (no hidden numbers).
- Server-verified kills: the donor rolls on a shared scenario RNG (`ScenarioRand`). An arrival roll must come from the seeded stream the server can replay (origins/server/world-spawns.ts), or the server cannot know what exists to be killed.
- One ledger: arrival must not create paid kills; creature existence is the server's spawn state and payment is the per-account respawn window in origins/server/mob-rewards.ts.
- MAX_ATTACKERS = 3: a crowd over the soft cap says nothing about how many engage one player; the ring cap (src/fight/world.ts) is separate from the zone's population cap.
- The donor spawns guests, not enemies, and its probability depends on park rating, entrance fee and awards, none of which has a Frankendom counterpart; only the soft-cap shape transfers.
- The damping is a step (divide by 4), not a curve. The step is a choice for Lead; the donor does not argue for it.
