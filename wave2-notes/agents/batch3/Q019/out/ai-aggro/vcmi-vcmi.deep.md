# vcmi-vcmi (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp` (with `CGCreature.h`, `CGHeroInstance.cpp`, `army/CCreatureSet.cpp`, `include/vstd/RNG.h`) | Licence: GPL-2.0-or-later (file header: "License: GNU General Public License v2.0 or later"; `license.txt` is the GPL v2 text) | C++ | symbol `CGCreature::takenAction`

Checked: `takenAction` (CGCreature.cpp 350-418) read in full; its three callers read (94 hover popup with joins allowed, 173 `onHeroVisit`, 436 refused-offer re-check with joins off); `initObj` 281-300 read; `fleeDecision` 420-429, `flee` 514-523 and `blockingDialogAnswered` 586-598 read; `fight` 473-512 read; `onHeroVisit` 161-183 read, its join branch (184-212) only in outline, not read in full; `CGHeroInstance::getValueForDiplomacy` 787-796 and `getArmyStrengthPerceivedByOthers` 799-807 read; `CCreatureSet::getArmyStrength` 313-318 read; `RNG::nextInt` inclusive per `include/vstd/RNG.h` 21-22. Not read: `getPower`, `valOfBonuses`, `getRecruitCost`, the dialog texts, `battleFinished` (524-585), the settings defaults, `MapFormatH3M.cpp` 1279 beyond the one line. Confidence: high on the decision table; medium on the join-for-gold path, which I read only through `takenAction` and `joinDecision`. camera_scope: not applicable (not a camera cell).

Best transferable idea: Decide what a wandering group does on contact (engage, back off, or join) from one banded power ratio plus a per-group aggression threshold, so each outcome is one testable state change.
Decision (proposed): adapt - the contact decision and the flee-without-pursue outcome fit "engage is a state change" in `src/fight`; the adventure-map visit dialogs and the gold recruit offer do not fit a real-time zone, so take the shape, not the join path.
Acceptance: A server test asserts the decision table (band factor, sympathy, diplomacy cap 3, FIGHT / FLEE / JOIN cases) for fixed inputs, and in play a group the hero far outmatches (hero value 7x or more the group's) never fights, since its charisma is at least 11 and aggression is at most 10 in the H3 range, while a group the hero is outmatched by (hero value below a third of the group's) fights when its aggression is 4 or more.

## 1. Mechanism

- One function, `takenAction(hero, allowJoin)`, returns the outcome of a group meeting a hero: FIGHT (-2), FLEE (-1), JOIN_FOR_FREE (0) or a positive gold price (enum at `CGCreature.h` 21). It is a pure decision; the caller then acts on it.
- Order of steps (as the code runs):
  (a) Power ratio: `relStrength = hero value for diplomacy / group army strength` (353). The hero value is `sqrt((1 + 0.05 x attack) x (1 + 0.05 x defence))` times the hero army strength, after diplomacy-army artifact multipliers (`CGHeroInstance.cpp` 791-796, 799-807).
  (b) Power factor from the ratio (356-368): ratio >= 7 gives 11; ratio >= 1 gives `trunc(2 x (ratio - 1))`; ratio >= 0.5 gives -1; ratio >= 0.333 gives -2; otherwise -3.
  (c) Sympathy (384-388): +1 if the hero has any unit of the same kind or an adjacent upgrade or downgrade tier; +1 more if those units are over half the hero's units.
  (d) Diplomacy: the `WANDERING_CREATURES_JOIN_BONUS` value, capped at 3 (392-393).
  (e) `charisma = powerFactor + diplomacy + sympathy` (394).
  (f) If `charisma < aggression`: FIGHT (396-397). This returns before any join test.
  (g) Only if `allowJoin` and the group's joining percentage is above 0 (399): free join if (setting `CREATURES_ALLOW_JOINING_FOR_FREE` or the group is COMPLIANT) and `diplomacy + sympathy + 1 >= aggression` and not gold-only (401). Otherwise gold join if `diplomacy x 2 + sympathy + 1 >= aggression` (404-408), priced at the creature's recruit cost times the first stack's count.
  (h) Otherwise, FLEE if `charisma > aggression` and the group is not `neverFlees` (414-415); else FIGHT (417).
- Aggression is set once at init (`initObj`, 281-300) from the character tier: COMPLIANT -4; FRIENDLY a random int in [1, 7]; AGGRESSIVE [1, 10]; HOSTILE [4, 10]; SAVAGE 10 (the RNG range is inclusive, `RNG.h` 21-22). The switch has no CUSTOM case, so a custom group keeps the value read from the map (`MapFormatH3M.cpp` 1279, one line read).
- What the outcome does: FIGHT calls `fight` (177), which splits the stacks and starts the battle (`gameEvents.startBattle`, 510). FLEE calls `flee` (514-521): a yes/no dialog (text id `core.advevent.91`, text not read) whose answer goes to `fleeDecision` (597) as the `pursue` flag. A yes means fight (424); a no means the group is removed (428).
- Tick: none. This runs once when a hero visits the group (`onHeroVisit`, 161). It does not chase, track threat over time, or re-decide per frame. The other two callers are the hover popup (94), which asks the same question for display only, and the refused-offer re-check (436), which runs with joins off.

## 2. Key functions

- `CGCreature::takenAction`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp` 350-418. The whole decision: ratio band, sympathy, diplomacy cap, FIGHT test, join tests, FLEE test.
- `CGCreature::initObj`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp` 281-300. Aggression per character tier.
- `CGCreature::onHeroVisit`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp` 161-183 (the FIGHT and FLEE branches read; the join branch 184-212 in outline).
- `CGCreature::flee` and `fleeDecision` (yes or no to pursue): `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp` 514-521 and 420-429.
- `CGCreature::blockingDialogAnswered` (routes the answer to flee or join): `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp` 586-598.
- `CGHeroInstance::getValueForDiplomacy`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGHeroInstance.cpp` 791-796 (hero value for the ratio).
- `CCreatureSet::getArmyStrength`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/army/CCreatureSet.cpp` 313-318 (sum of stack powers; the monster side of the ratio).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Banded power ratio mapped to a small signed score (over-matched hero gets a big bonus, outmatched gets a penalty) | Bands at 7, 1, 0.5, 0.333 with factors 11, trunc(2(r-1)), -1, -2, -3 (theirs, 356-368). The factor jumps from -1 to 0 as the ratio crosses 1 (ratio 0.99 gives -1; 1.0 gives 0). |
| Score plus a disposition cap, compared to a per-group threshold | Diplomacy cap 3 (theirs, 392) |
| Sympathy: 0, 1 or 2 from similar units | Thresholds: one similar unit; more than half (theirs, 386-388) |
| Below threshold: fight. Above: flee (unless fixed to fight). Between: optional join | Aggression thresholds per tier: -4 / 1-7 / 1-10 / 4-10 / 10 (theirs, 287-299) |
| Join offer test is a second, looser threshold | Free join: diplomacy + sympathy + 1 >= aggression. Gold: diplomacy x 2 + sympathy + 1 >= aggression (theirs, 401, 404) |
| Hero value: square root of two skill factors times army | 0.05 per attack and defence point (theirs, 792-793) |

Worked ranges: charisma runs from -3 (ratio below 0.333 and no bonus) to 16 (ratio 7 or more, diplomacy 3, both sympathy points). A COMPLIANT group (aggression -4) can never FIGHT, because charisma is at least -3. Those are computed from the code, not from a run.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (ratio, band factor, sympathy, diplomacy cap, FIGHT test, join tests, FLEE test). It omits the visit and dialog plumbing, the yes or no pursue choice (the flee outcome here is just the decision; the caller decides what removal means), the hover popup, the HotA CUSTOM character path, the settings lookups (passed in as booleans), the stack-split and battle start, and the zero-army case, which the donor does not guard and I did not check. It takes the first stack's count as `groupCount` instead of reading slot 0 from the group. It reorders nothing.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Decision =
  | { kind: 'fight' }
  | { kind: 'flee' }
  | { kind: 'joinFree' }
  | { kind: 'joinGold'; price: number };

export interface EncounterInput {
  heroValue: number;        // hero strength for this check (attack and defence scaled)
  groupValue: number;       // monster group strength (sum of stack powers)
  diplomacy: number;        // hero disposition bonus, uncapped
  similarUnits: number;     // hero units of the same kind or an adjacent upgrade tier
  heroUnits: number;        // all hero units
  aggression: number;       // per-group threshold, -4 .. 10
  neverFlees: boolean;
  joinAllowed: boolean;     // joining switched on for this group and the call allows it
  freeJoinAllowed: boolean; // setting or compliant group, and not gold-only
  groupCount: number;       // size of the first stack, used for the gold price
  recruitCostPerUnit: number;
}

const DIPLOMACY_CAP = 3;

export function powerFactor(ratio: number): number {
  if (ratio >= 7) return 11;
  if (ratio >= 1) return Math.trunc(2 * (ratio - 1));
  if (ratio >= 0.5) return -1;
  if (ratio >= 0.333) return -2;
  return -3;
}

export function decideEncounter(e: EncounterInput): Decision {
  const ratio = e.heroValue / e.groupValue;
  let sympathy = 0;
  if (e.similarUnits > 0) sympathy++;
  if (e.similarUnits * 2 > e.heroUnits) sympathy++;
  const diplomacy = Math.min(e.diplomacy, DIPLOMACY_CAP);
  const charisma = powerFactor(ratio) + diplomacy + sympathy;

  if (charisma < e.aggression) return { kind: 'fight' };

  if (e.joinAllowed) {
    if (e.freeJoinAllowed && diplomacy + sympathy + 1 >= e.aggression) return { kind: 'joinFree' };
    if (diplomacy * 2 + sympathy + 1 >= e.aggression) {
      return { kind: 'joinGold', price: e.recruitCostPerUnit * e.groupCount };
    }
  }

  if (charisma > e.aggression && !e.neverFlees) return { kind: 'flee' };
  return { kind: 'fight' };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the contact decision for a group meeting the player; engine-side, server-verified). Parity-checklist row 2 (AI brain). The power ratio and aggression belong on the server; the client only shows the result.
- today: not checked. I did not read the Frankendom repo for an existing contact decision.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the decision lives in `src/fight`, and the numbers are zone data); rule 2 AI brain

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and typechecks; it is not a translation.
- The donor decides once, on a visit. Frankendom's zones need per-tick chase and leash (row 4), which this does not cover. Only the contact outcome transfers.
- The flee outcome in the donor removes the group when the player does not pursue (428). In Frankendom that removal must go through the zone population path (row 23, despawn with a grace timer) so that there is one ledger, not a second despawn.
- The join-for-gold path is an adventure-map trade. Frankendom would need the gold price as a server-verified transaction. Reject for now; the free-join shape only matters if Frankendom adds recruits.
- MAX_ATTACKERS = 3: the donor compares one hero to one group. For a many-on-one fight the ratio must use the attackers that are actually engaged (at most 3), not every nearby monster. The donor does not say how, and I did not read a multi-group path.
- Division by `groupValue` has no guard in the donor (`getArmyStrength` sums stacks; zero is not checked). Frankendom must guard it.
- Aggression is rolled once at init (`initObj`). The server must roll it once per group and store it, not roll it per visit.
- The power band jumps at ratio 1 (factor -1 to 0). If Frankendom keeps the bands, it should keep the jump on purpose, or smooth it, and test both sides of the boundary.
- The hero value uses only attack and defence skill (0.05 per point) and army strength. Frankendom's power input must come from the server-side character and gear ledger, not the client.
