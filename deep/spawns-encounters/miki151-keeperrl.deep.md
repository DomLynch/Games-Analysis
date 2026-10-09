# miki151-keeperrl (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | Licence: GPL-2.0 | C++ | symbol Immigration::update / Available::generate (opened: update 652-681, getImmigrantChance 295-301, getRequirementMultiplier 238-246, addAllCreatures 447-485, accept 487-(start only), generate 545-584, initializePersistent 606-614, resetImmigrantTime 616-623, considerRespawningHorses 625-650)
Licence note: the code is GPL-2.0. The data files are under separate terms and are not read here. Clean-room sketch only.

## 1. Mechanism

- The colony's immigration is a scheduler, not a per-tile spawn. `Immigration::update()` (652-681) runs once per call; who calls it, and how often, was not read (the file is only immigration.cpp).
- On first run it creates the persistent immigrants (`initializePersistent`, 606-614: one `Available` per persistent kind, accepted `getInitialRecruitment()` times) and sets the next arrival time.
- Each call it drops offers that are unavailable (no creatures, or an end time before the global time, 590-592). It auto-accepts any offer whose kind is set to auto-accept. On `Random.roll(30)` (taken here as about one call in 30; the Random class was not read) it runs `considerRespawningHorses` (625-650), which replaces creatures of kinds tagged `INCREASE_POPULATION` that are no longer in the colony by fresh clones placed directly at spawn positions, without going through accept.
- When the next arrival time has passed (or is unset), it builds one `Group` per immigrant kind with a random size `Random.get(groupSize)` and a weight from `getImmigrantChance` (295-301): zero for a persistent kind, or when `isAvailable(generated + candidates + count - 1)` is false (the kind's limit); otherwise `frequency * getRequirementMultiplier`. The multiplier (238-246) is the product of `candidateProb` over each requirement that is currently missing.
- Only if the weights sum above zero does it continue: it draws one group (`Random.choose`) and, if fewer than 10 offers exist or the colony's immigrant interval is above 10, creates the offer with `Available::generate` (545-584). That builds the group's creatures, rolls each special trait of the kind per creature with its own chance, sets combat experience from the model's difficulty when the colony is not the main model, and sets an end time (global time plus the candidate timeout) for non-persistent kinds. Then `createdTime` is stamped and the next arrival is reset (the stamp line indexes the offer by id even when the cap skipped the insert; the container type was not read). When all weights are zero the arrival time is not reset, so the roll repeats on the next call.
- `resetImmigrantTime` (616-623): next = max(now, interval * (random + 1 + floor(previous / interval))), so arrivals align to interval slots and never lie in the past.
- Accepting an offer (`accept`, 487-) returns early if the offer is gone, a requirement is missing or there are fewer spawn positions than creatures (the rest of `accept` was not read); it ends in `addAllCreatures` (447-485), which recruits an existing recruit where the kind has a recruitment requirement and one is available, otherwise places the generated creatures at the spawn positions, and applies the special traits.
- Output: a list of offers the player can accept, and creatures placed on accept. Creatures also arrive without a player accept from auto-accepted kinds, the initial recruitment of persistent kinds and horse re-cloning.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| Immigration::update | /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | 652-681 | Prunes offers, auto-accepts, rolls the next arrival with weights |
| Immigration::getImmigrantChance | /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | 295-301 | Zero if persistent or at its limit; else frequency times requirement multiplier |
| Immigration::getRequirementMultiplier | /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | 238-246 | Product of candidate probabilities over unmet requirements |
| Immigration::Available::generate | /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | 545-584 | Builds the offer's creatures, rolls special traits, sets the timeout |
| Immigration::Available::addAllCreatures | /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | 447-485 | On accept: recruits or places the creatures |
| Immigration::resetImmigrantTime | /mnt/frankendom-donors/miki151-keeperrl/immigration.cpp | 616-623 | Sets the next arrival time from the interval and a random factor |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted draw of one arrival group; weight = base frequency times the product of unmet-requirement probabilities | Frequency per group (theirs, data); candidate probability per requirement (theirs, data) |
| Offer cap: arrivals stop queueing past a count, unless the interval is long | Offer cap 10 (theirs, line 675); interval threshold 10 (line 675) |
| Next arrival = interval times (random + 1 + last index), never in the past | Interval from colony config (theirs) |
| Timeout on uncommitted offers | Candidate timeout from config (theirs) |
| Rare periodic repair roll | `Random.roll(30)` (theirs, line 665) |

## 4. TypeScript sketch

Licence: GPL-2.0 (code). CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the group size draw, creature generation, special-trait rolls, accept and spawn positions, auto-accept, persistent initial recruitment and the horse re-clone are omitted; `capped` stands for the kind's limit test; the `pick` is made only when a weight is positive, as in the donor; the offer cap and interval threshold are as in the donor; the end time is set for non-persistent kinds only.

```ts
// clean-room sketch of a weighted arrival scheduler with unmet-requirement penalties.
// Licence line: GPL-2.0 donor (code); this sketch is clean-room, written from mechanism only.
interface Group { id: string; frequency: number; requirements: { met: boolean; candidateProb: number }[]; capped: boolean; persistent: boolean; }
interface Offer { groupId: string; expiresAt: number | undefined; }
const OFFER_CAP = 10;     // theirs
const LONG_INTERVAL = 10; // theirs: above this the cap is ignored
function requirementMultiplier(g: Group): number {
  let m = 1;
  for (const r of g.requirements) if (!r.met) m *= r.candidateProb;
  return m;
}
function arrivalWeight(g: Group): number {
  if (g.persistent || g.capped) return 0;
  return g.frequency * requirementMultiplier(g);
}
function pickWeighted<T>(items: T[], weights: number[], rnd: () => number): T | undefined {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return undefined;
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}
// Next arrival: slot-aligned to the interval, never in the past.
function nextArrivalAfter(prev: number, now: number, interval: number, rnd: () => number): number {
  const lastIndex = Math.floor(prev / interval);
  return Math.max(now, Math.trunc(interval * (rnd() + 1 + lastIndex)));
}
function tickImmigration(
  state: { offers: Offer[]; nextArrival: number },
  groups: Group[],
  now: number,
  interval: number,
  timeoutSeconds: number,
  rnd: () => number,
): void {
  state.offers = state.offers.filter((o) => o.expiresAt === undefined || o.expiresAt >= now);
  if (state.nextArrival >= now) return;
  const pick = pickWeighted(groups, groups.map(arrivalWeight), rnd);
  if (!pick) return; // all weights zero: the arrival time is not reset
  if (state.offers.length < OFFER_CAP || interval > LONG_INTERVAL) {
    state.offers.push({ groupId: pick.id, expiresAt: pick.persistent ? undefined : now + timeoutSeconds });
  }
  state.nextArrival = nextArrivalAfter(state.nextArrival, now, interval, rnd);
}
```

## 5. Lands in

- TARGET origins/mobs/row.ts `rungWeights` (and `pickRow` in origins/mobs/populate.ts) for the one idea that is useful as is: weight = base frequency times a soft penalty per unmet requirement, instead of Frankendom's hard exclusion (a row outside the zone's level window is weight 0, `level-miss`). A timed arrival of new groups does not exist in populate.ts (one-shot camps) or origins/server/world-spawns.ts (per-spawn respawn); if roaming arrivals are wanted they are a new `origins/server/arrivals.ts` (new), seeded and server-side. Checklist row 21 (catalogue fields: frequency, requirement data) and row 4 (fight loop, for what arrives near the player); feature map: zones as data.
- Parity-checklist row: 21.
Reuse tag: rewrite-from-idea
Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- Arrivals are colony-economy state (resources, housing, attraction, tech). Frankendom has no colony; the requirement multiplier has no meaning until a zone or city requirement exists as data. Do not import the requirement kinds.
- Server-verified kills: the donor rolls on a shared unseeded `Random`. An arrival roll must come from the seeded stream the server replays, and an arrival must be recorded on the server (origins/server/world-spawns.ts) before a creature can be engaged and killed for reward.
- One ledger: an offer the player accepts is a free grant in the donor; in Frankendom a creature's existence and its kill payout (CP + loot in one transaction, origins/server/mob-rewards.ts) must not be separated by an accept step.
- MAX_ATTACKERS = 3: group size per arrival (a random draw) says nothing about engagement; at most 3 engaged on one player, the rest hold at the ring (src/fight/world.ts).
- `update()` mixes the scheduler with a horse re-clone roll and auto-accept; Frankendom must split these (one engine: no colony side effects in the fight loop).
- Zones as data fits: frequency, candidate probability and the offer cap would be catalogue / zone fields, not the literals 10 and 30.
