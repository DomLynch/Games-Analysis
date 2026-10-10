# vcmi-vcmi (loot-drops, cell 2)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/lib/rewardable/Info.cpp` (with `lib/mapObjects/CRewardableObject.cpp`, `lib/rewardable/Interface.cpp`, `lib/rewardable/Limiter.cpp`, `config/objects/creatureBanks.json`) | Licence: GNU General Public License v2.0 or later (Info.cpp header line 6: "License: GNU General Public License v2.0 or later"; `license.txt` is the GPL Version 2, June 1991 text) | C++ and JSON | symbol `Rewardable::Info::configureRewards` (roll and band test), with `CRewardableObject::battleFinished` (win-gated grant)

Checked: `configureRewards` Info.cpp 395-457 read in full; `configureObject` 459-470 read to 470. `CRewardableObject::onHeroVisit` 47-64 read (the guarded refusal dialog from line 63 on was not read). `doStartBattle` 112-116 and `battleFinished` 83-95 read. `newTurn` 361-381 read. `Interface::getAvailableRewards` 31-43 and `doHeroVisit` 415-470 read (the SELECT_ALL body and 470-495 not read). `Limiter::heroAllowed` 80-98 read in part (the creature and sublimiter gates after 98 were not read). `CRandomGenerator::nextInt(lower, upper)` 65-73 read; the `TIntDist` alias was not read, so inclusive bounds are the usual meaning, not confirmed here. The map preset at `MapFormatH3M.cpp` 1735 was read as one line; its load order against `initObj` was not read. `wasVisitedBefore` and `markAsVisited` were not read, so the effect of `visitMode: once` is not confirmed. The hint file `creatureBanks.json` was read at its start and at the lines matched by grep for `appearChance`, `mapDice`, `visitMode` and `selectMode`; the first bank (cyclopsStockpile) is the only one checked, and the file is data, not the mechanism. `camera_scope` does not apply. Callers of `battleFinished` (reached through the game-event callback) and of `configureObject` were not checked, so the win-only rule is stated for this code path only. Confidence: high on the roll, the band test, the attacker-only grant and the reset re-roll; medium on how the once-only rule behaves across several heroes.

Best transferable idea: Roll one loot tier per chest instance from a fixed 0-99 band table, store the roll on the chest, and grant the tier's loot only when the guard fight is won by the attacker, with leftover guards removed.
Decision (proposed): adapt - keep the stored band roll and the win-only grant as a zone-data table in `src/fight/loot.ts`, rolled once per chest on the server at zone generation and re-rolled only by a zone reset; do not port the H3M map-file dice preset (MapFormatH3M.cpp 1735), which is specific to imported maps.
Acceptance: In a server test with a seeded RNG over 1000 zone instances, a chest's tier matches the band table (within a stated tolerance), the tier is the same on every visit within one instance, and a chest credits loot only after the server records a hero win over its guard stacks; a hero loss credits nothing.

## 1. Mechanism

- Object: a guarded reward object (the creature bank). Its reward list (`rewards`) holds one entry per tier. Each entry lists guard stacks (creature, amount, optional `upgradeChance`) and resources. The `cyclopsStockpile` bank uses `visitMode: once` (creatureBanks.json 26) and `selectMode: selectFirst` (27).
- Order of steps as the code runs:
  (a) Configure (at object creation, and again on reset). `Info::configureRewards` walks the rewards list once (Info.cpp 403-456). If the object has a preset map dice (`presetVariable("dice","map")`, read at 407), an entry is kept when it has no `mapDice` or its `mapDice` equals the preset (409-413). If there is no preset, an entry with `appearChance` is kept only when the object's dice roll is in its band (414-441). In the code read, the preset is written only by the H3M map loader; other writers were not all checked. The roll is made once per object and stored: `initVariable("dice", diceID, nextInt(0,99))` runs only when no value is stored yet (420-426). The band test is `min > roll` drops the entry (432-433) and `max <= roll` drops it (438-439), so the band is min-inclusive, max-exclusive. An entry with no `appearChance` is always kept.
  (b) Visit. `onHeroVisit`: if the object has no guard stacks, the visit happens at once (55-58). If it is guarded and `forceCombat` is set, a battle starts (59-61, `doStartBattle` 112-116, which calls `gameEvents.startBattle` at 115). The guarded branch without `forceCombat` is a refusal dialog (63-80; not read in full).
  (c) Battle result. `battleFinished` (83-95): only an attacker win does anything. Any guard stack still on the object is erased with a warning (85-91), then `doHeroVisit` runs (93). A defender win has no branch, so nothing is granted.
  (d) Grant. `doHeroVisit` (Interface.cpp 415-): if the object has not been visited by this hero (417), the first-visit rewards are those whose event type matches and whose limiter allows the hero (419; filter at 39-40). Zero entries: the not-available message (430-436). One entry: granted, or offered for refusal when `canRefuse` is set (441-445). Several: the select mode decides (449). `SELECT_FIRST` takes the first (453-457; a refusal dialog when `canRefuse`), `SELECT_RANDOM` takes a uniform pick from the list (459-461), `SELECT_ALL` grants all (468-).
  (e) Eligibility. `Limiter::heroAllowed` (Limiter.cpp 80-98) checks day of week (82-86), days passed, and whether the commander is alive (94-98), then creature and other gates that were not read.
  (f) Reset. `newTurn` (361-381): when the reset day comes (366), the configuration is regenerated if the reset flag for rewards is set (368-373), which runs `configureObject` again and so re-rolls the dice (the roll is not preset). Visitors can also be cleared (374-379).
- Tick: none. This is an event path, one call per visit or battle result. The reset check runs once per new turn.
- Numbers, cyclopsStockpile: four tiers with bands [0,30), [30,60), [60,90), [90,100) (creatureBanks.json 33, 56, 77, 98). Tier 0 guards are five stacks of 4 cyclopes (35-39; stack 37 also has `upgradeChance` 50). Tier 1 guards are six per stack (58-62). Each tier is selected by its band against the same 0-99 roll (100 values).

## 2. Key functions

- `Rewardable::Info::configureRewards`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rewardable/Info.cpp` 395-457. The roll, the preset path and the band test.
- `Rewardable::Info::configureObject`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rewardable/Info.cpp` 459-470. Clears the info list, then calls `configureRewards` for the first-visit list (466) and the other lists.
- `CRewardableObject::onHeroVisit`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CRewardableObject.cpp` 47-64.
- `CRewardableObject::battleFinished`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CRewardableObject.cpp` 83-95. The win-only grant.
- `CRewardableObject::newTurn`: `/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CRewardableObject.cpp` 361-381. The reset and re-roll.
- `Rewardable::Interface::doHeroVisit`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rewardable/Interface.cpp` 415-470. Picks among the eligible rewards by select mode.
- `Rewardable::Limiter::heroAllowed`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rewardable/Limiter.cpp` 80-98 (part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One stored roll per object, reused until a reset | Roll range 0-99, 100 values, `nextInt(0,99)` (theirs, Info.cpp 424) |
| Band test, min-inclusive and max-exclusive | Bands 0-30, 30-60, 60-90, 90-100 (theirs, creatureBanks.json 33, 56, 98; 77 not receipted). The four bands cover 0-99 for this bank, so the chance of each tier is 30%, 30%, 30%, 10%. |
| Win-only grant, leftover guards erased on a win | No constant. The code has no branch for a defender win (theirs, CRewardableObject.cpp 85-94). |
| Reset gate on a period | `(currentDay-1) % resetDuration == 0` with `currentDay > 1` (theirs, CRewardableObject.cpp 366) |
| Guard size scales with the tier | Tier 0 = 4 per stack, tier 1 = 6 per stack (theirs, creatureBanks.json 35, 58) |
| Select mode for several eligible rewards | `selectFirst` on this bank (theirs, creatureBanks.json 27); `SELECT_RANDOM` uses a uniform pick (theirs, Interface.cpp 461) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the roll (roll once and store), the band test (min-inclusive, max-exclusive), the reset gate, and the fight result (attacker win grants and erases leftover guards; defender win grants nothing). It omits: the H3M map-file preset path and the `mapDice` match, the refusal dialog for guarded objects, the select modes other than the single-grant case, the limiter gates (day of week, days passed, commander, creature and sublimiter tests), the `visitMode` and visited-by-hero bookkeeping, the SELECT_ALL path, the "not available" message, and the reset path that clears visitors. It does not reorder the steps. It assumes the bands partition the roll range; it does not check that for other banks.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Variant {
  min: number;              // band floor, inclusive
  max: number;              // band ceiling, exclusive
  guardStacks: number;      // number of guard stacks
  guardPerStack: number;    // creatures per stack
  loot: { gold: number; ore: number };
}

interface ChestConfig { variants: Variant[]; resetDays: number; }   // resetDays 0 = never reset
interface ChestState { roll: number | null; }                       // one stored roll per chest instance

// Roll once per chest instance; the stored value is reused until a reset clears it.
function ensureRoll(state: ChestState, rand: (lo: number, hi: number) => number): number {
  if (state.roll === null) state.roll = rand(0, 99);                // 100 values, both ends inclusive
  return state.roll;
}

// The band that holds the roll. In the donor's cyclops bank the bands partition 0..99 (other banks not checked).
function pickVariant(cfg: ChestConfig, roll: number): Variant | null {
  for (const v of cfg.variants) {
    if (roll >= v.min && roll < v.max) return v;
  }
  return null;
}

function resetDue(day: number, resetDays: number): boolean {
  return resetDays !== 0 && day > 1 && (day - 1) % resetDays === 0;
}

// Guard fight result. Only an attacker win grants loot; leftover guards are removed on a win.
function onGuardFight(
  variant: Variant,
  winner: "attacker" | "defender",
  survivingGuards: number,
): { granted: Variant["loot"] | null; erasedGuards: number } {
  if (winner !== "attacker") return { granted: null, erasedGuards: 0 };
  return { granted: variant.loot, erasedGuards: survivingGuards };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, proposed): the per-chest band roll, stored once, and the win-only grant. Server-side, run at zone generation for the roll and at the guard fight result for the grant.
- Parity-checklist row 18 (loot roll and XP award). The win result is the server-verified kill/fight outcome that row 18 consumes.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: server-verified kills (grant only on a recorded attacker win); one ledger (the roll and the grant are one record per chest instance); zones as data (bands and guard stacks are zone data)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no line of the donor is translated.
- The donor re-rolls on reset (CRewardableObject.cpp 366-372). Frankendom must decide whether a zone reset re-rolls chests; if yes, the ledger must record the old roll and the new roll, not overwrite silently.
- The donor grants on the attacker result alone; it does not record which guard stacks died. Frankendom needs the server to verify each guard death before it credits the chest.
- Visited-by-hero rules (`wasVisitedBefore`, `visitMode: once`) were not read. Frankendom's one-grant rule per chest per zone instance must be stated; the donor's behaviour for several heroes is not confirmed.
- The donor's map-file dice preset (MapFormatH3M.cpp 1735) has no Frankendom equivalent. The tier must be explicit zone data.
- The select modes (player choice, random, all) belong to a UI in the donor. Frankendom should keep one grant per chest and drop the choice modes until a ruling asks for them.
- Limiter gates (day of week, commander alive, creature checks) are not Frankendom rules. Only the shape (a per-hero filter on the reward list) transfers; the specific gates do not.
- Not read: the guarded refusal dialog (CRewardableObject.cpp 63-80), the SELECT_ALL body (Interface.cpp 470-495), the creature and sublimiter tail of `heroAllowed`, and the other banks in `creatureBanks.json`.
- Pit as client: the roll and the grant run on the server; the Pit may show the chest result only.
