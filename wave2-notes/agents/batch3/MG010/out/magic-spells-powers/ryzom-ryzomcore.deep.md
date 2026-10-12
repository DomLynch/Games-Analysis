# ryzom-ryzomcore (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/sabrina/magic_phrase.cpp` (build 100-145, cast gate 262-285, apply 400-470), with `combat_phrase.cpp` 240 and 1445-1448, `phrase_utilities_functions.cpp` 312-350, and the acquisition path in `ryzom/server/src/entities_game_service/phrase_manager/available_phrases.cpp` 36-205 and `ryzom/server/src/entities_game_service/player_manager/character.cpp` 9674-9785 and 13649-13670 | Licence: AGPL-3.0 (`/mnt/frankendom-donors/ryzom-ryzomcore/LICENSE` line 1 "GNU AFFERO GENERAL PUBLIC LICENSE", version 3; the source headers say "Copyright (C) 2010 Winch Gate Property Limited" and AGPL "version 3 or later") | C++ | symbol `CMagicPhrase::build` / `CCharacter::buyRolemasterPhrase`

Checked: read: `sabrina/magic_phrase.cpp` 100-145 (build), 228-233 (evaluate), 262-285 (validate gates), 400-470 (apply: sap, skill average, armour malus, level delta, roll), `sabrina/combat_phrase.cpp` 236-245, 1436-1452, `sabrina/phrase_utilities_functions.cpp` 296-350 (success chance and success factor), `sabrina/phrase_manager.cpp` 810-893 (checkPhraseValidity, whose body is inside a comment), `entities_game_service/phrase_manager/available_phrases.cpp` 36-205 (the live learnability check), `entities_game_service/player_manager/character.cpp` 9440-9470 (trainer list), 9674-9785 (buy), 13649-13670 (memorize), 14086-14130 (learn), 20410-20460 (spend and read skill points), `known_and_memorized_phrases.cpp` 134-160, `egs_sheets/egs_static_brick.cpp` 379 and 385, `egs_sheets/egs_static_brick.h` 45-76, `ryzom/common/src/game_share/constants.h` 26-29. Confidence: high on the phrase cost and cast code and on the learn/memorize gates (read in full). High on the finding that the credit/cost validity check is commented out (read the whole block). Medium on the success curve shape (formula read in full; the table values are sheet data and were NOT read). Not read: the success-chance sheet values (`egs_success_chance_tables`), the brick sheet files, the `_RolemasterType` enum mapping beyond the lines at 9440-9447, the animated cast path and the CSPhrase apply damage, the armour-malus clamp lines after 441 (read, not line-numbered). Two trees were checked: `ryzom/server/src` for the phrase code and `ryzom/common` for the constants. The `reagent` word has no hits in `ryzom/server/src`.

Note on two copies: `sabrina/available_phrases.cpp` has a 3-argument `isPlayerAllowedToGetAllBricksFromPhrase` (61) and a test command `testRolemaster` (141). Only that command calls it (131). The live gate is the 7-argument version in `entities_game_service/phrase_manager/available_phrases.cpp` (127), which `character.cpp` calls at 9466 and 9731. Do not port the stale copy.

## 1. Mechanism

A spell (phrase) is an ordered list of bricks. Each brick is a sheet with a signed Sabrina value (`Basics.SabrinaCost`), a skill-point learn price (`Basics.SPCost`), skill requirements, and prerequisite bricks. Spells are built from bricks the player already knows; the server checks that. Costs and success are both derived from the brick list.

- Build (cost and credit, `magic_phrase.cpp` 128-133): for each brick, a negative sabrina value adds to `_SabrinaCredit` (as a positive number); a positive value adds to `_SabrinaCost`. Parameter costs are summed separately: HP from `CSBrickParamHp` (80), sap (the caster's magic pool) from `CSBrickParamSap` (84).
- Learn price (`buyRolemasterPhrase`, 9689-9697, with the balance check at 9700): the price is the sum of `SkillPointPrice` over bricks the player does not yet know. It is paid in the skill-point pool of `_RolemasterType` (a type set from the phrase's brick family; trainers map harvest and forage bricks to the Harvest pool at 9440-9447). There is no coin charge in the lines read (9674-9760, and the tail 9760-9785 only sends a message).
- Learn order (9739-9742): `learnPrebuiltPhrase` runs first, then `spendSP`. The points are spent only if the phrase was learned.
- Learnability (live `available_phrases.cpp`):
  (a) a phrase with no unknown brick is skipped (`hasNewBrick`, 201); `learnPrebuiltPhrase` separately refuses a phrase the player already knows (`character.cpp` 14086-14115, read). The whole requirement check at 9731 runs only when `testRestrictions` is true (9711) and after the skill-point balance check (9700), so a caller can skip it;
  (b) for each unknown brick with skill requirements: at least one requirement must be at or below the cap (`skillRequiredAreBelowSkillValueLimit`, 42-55; the caller passes 250, 9466 and 9731); at least one requirement must be met by the player's `MaxLvlReached` for that skill code (`skillMatchesOneOfList`, 64-66; the test is `>=`, so a skill that later drops does not remove access);
  (c) the brick's faction fame must be at least `MinFameValue` (180);
  (d) unless bypassed, each prerequisite brick must be known or be in the same phrase (183-199).
  The civilisation check for bricks is commented out inside this function. The trainer list adds a race filter per brick at 9445-9461 (`CivRestriction`), applied only when the bot's flags `getFilterExplicitActionTradeByBotRace` or `getFilterExplicitActionTradeByPlayerRace` are set, so race gating exists only on the trainer path and only for bots that opt in.
- Memorize (`CCharacter::memorize`, 13649-13670): every brick must be known (13655); `checkPhraseValidity` is then called (13664), but its body is inside a comment (see section 6), so it always returns true. The memorization set then calls `evaluate()` (147), which only sets a state flag and returns true (`magic_phrase.cpp` 231-232).
- Cast gate (`magic_phrase.cpp` 258-275): HP must be above zero and the mode not DEATH (258-262; dead casters are refused), HP must be at least the HP cost (263); sap must be at least the sap cost (270). The message names the missing resource.
- Success (`magic_phrase.cpp` 441-467, and the same rule for combat at `combat_phrase.cpp` 1445-1448):
  (a) skill: the average of the current skill values of the bricks' skills (428, 436), minus a debuff (439), minus an armour malus (441 onward: `getArmorCastingMalus() * skill`, less `_ArmorCompensation`, clamped at 0);
  (b) relative level = `(skill + credit - 2 * cost) / 10` (464), integer division; the points per level are 10;
  (c) the success chance is a lookup at `MIDDLE_DELTA_LVL - level` after clipping the level to +-50 (`phrase_utilities_functions.cpp` 315-318; constants 26-29);
  (d) the roll is `rand(99)`, compared in the success-factor function (333-350): a critical success if `crit * chance / (crit + succ) > roll` (factor 1.1); a success if `chance > roll` (factor 1.0); a partial band with factor `(pS - roll + chance) / pS`; a failure (0); a critical failure (-1).
- Cost (sap, HP): applied when the spell resolves. Sap is clamped at zero after the subtraction (`magic_phrase.cpp` 406-411).
- Apply defect (410-419, 432-433, 436): sap and HP are spent first, then the skill lookup runs; if a brick's skill is missing the function returns with the cost paid and no effect, and `skillValue /= _Skills.size()` has no zero guard. Fix for Frankendom: resolve the skill and check the divisor before spending anything.

## 2. Key functions

- `CMagicPhrase::build`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/sabrina/magic_phrase.cpp` 103-145 (credit and cost split at 128-133; parameter costs at 80 and 84).
- `CMagicPhrase::validate` (cast gate): same file 258-285 (dead/hp<=0 258, HP cost 263, sap 270).
- `CMagicPhrase::evaluate`: same file 228-233 (state only).
- Apply (level and roll): same file 400-470, key lines 410 (sap), 436 (average), 441 (armour), 464-467 (level, chance, factor). The method header for 400-470 was not recorded.
- `CCombatPhrase` level and roll: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/sabrina/combat_phrase.cpp` 236-245 (split), 1445-1448.
- `getSuccessChance` and `getSucessFactor`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/sabrina/phrase_utilities_functions.cpp` 312-350.
- Live learnability: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/phrase_manager/available_phrases.cpp` 36-205.
- Buy and learn: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character.cpp` 9674-9785 (buy), 14086-14130 (learn), 20410-20460 (spend and get points).
- Memorize: same file 13649-13670; `known_and_memorized_phrases.cpp` 134-160.
- Brick sheet fields: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/egs_sheets/egs_static_brick.cpp` 379 (SabrinaCost), 385 (SPCost).

## 3. Numbers vs mechanism

| Rule | Donor number (where) | For a fast mobile fight |
|---|---|---|
| Relative level | `(skill + credit - 2*cost) / 10` (magic_phrase.cpp 464; combat 1445) | Each 10 points is one level. Skill and credit count 1 each; cost counts 2, so a point of cost weighs twice a point of credit. |
| Level clip | +-50 (constants.h 26-27) | A spell can swing the chance across the full table range, so no spell is hopeless or certain on paper. |
| Table index | `50 - level` (constants.h 29; phrase_utilities_functions.cpp 318) | The table is sheet data (not read); the index is the only rule. |
| Roll | `rand(99)` (magic_phrase.cpp 466, read) | Roll is drawn from rand(99); the range (assumed 0 to 98) is still NOT checked in the RNG source. Bands are the ones in section 1. |
| Critical success factor | 1.1 (phrase_utilities_functions.cpp 333) | A fixed bonus, not a number per spell. |
| Learn cap | 250 (character.cpp 9466, 9731) | A brick is unavailable when every one of its skill requirements is above 250 (`isSkillValueLowerThan`, egs_static_brick.h 71). |
| Learn price | sum of `SPCost` of unknown bricks (9695) | Price in skill points, not coin. |
| Cast costs | sap and HP per brick parameter (magic_phrase.cpp 80, 84) | Two pools at once; the donor gates each one separately (263, 270). |
| Armour malus | `getArmorCastingMalus() * skill` minus `_ArmorCompensation`, clamped at 0 (441 onward) | Armour lowers the skill used for casting, so heavy gear costs chance, not cast time. |

## 4. TypeScript sketch

simplified: keeps the donor order: brick split into credit and cost, relative level with C-style truncation and the +-50 clip, a success-table lookup at `50 - level`, the three-band roll, the sap and HP gate, the known-brick check, the live learn gate (cap, skill, prerequisites), and the skill-point price of unknown bricks. Changes: (1) the table values are inputs (the donor loads them from sheets); (2) the donor's uint8 casts become plain numbers; (3) the donor's dead-state and madness checks are reduced to a `dead` flag; (4) the armour malus and debuff are not modelled (the caller passes an effective skill); (5) the fame check and the trainer race filter are not modelled; (6) fix: the over-cost hard reject that the donor has commented out is NOT re-enabled, since over-cost already lowers the chance through the level; the sketch keeps the donor's live behaviour; (7) fix: the learn gate uses the same `MaxLvlReached` rule as the donor; (8) `Math.trunc` is used where the donor uses integer division. The sketch was typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: AGPL-3.0 (donor, LICENSE line 1). CLEAN-ROOM: written from the described mechanism only; no donor lines copied.
interface Brick {
  id: string;
  sabrinaValue: number;                              // + cost, - credit (donor: Basics.SabrinaCost)
  sapCost: number;                                   // pool cost per brick parameter (donor: CSBrickParamSap)
  hpCost: number;                                    // health cost per brick parameter (donor: CSBrickParamHp)
  skill: string;                                     // skill code the brick's power uses
  spPrice: number;                                   // skill-point price to learn (donor: Basics.SPCost)
  learnSkills: { code: string; value: number }[];    // any one must be reached (donor: LearnRequiresOneOfSkills)
  learnNeeds: string[];                              // bricks that must be known or be in the same phrase
}

interface Phrase { bricks: Brick[]; }

interface SuccessTable {
  chanceByIndex: number[];                           // index = 50 - relativeLevel, 101 entries (donor: _SuccessXpTable)
  crit: number; succ: number; partial: number; fail: number; critFail: number;
}

const MAX_DELTA = 50;                                // donor: MAX_DELTA_LVL, MIN_DELTA_LVL = -50, MIDDLE = 50

function phraseTotals(p: Phrase): { credit: number; cost: number; sap: number; hp: number } {
  let credit = 0, cost = 0, sap = 0, hp = 0;
  for (const b of p.bricks) {
    if (b.sabrinaValue < 0) credit -= b.sabrinaValue; else cost += b.sabrinaValue;
    sap += b.sapCost;
    hp += b.hpCost;
  }
  return { credit, cost, sap, hp };
}

// Donor: deltaLvl = (skill + credit - 2 * cost) / 10 with C integer division (truncates toward zero), then clipped to +-50.
export function relativeLevel(skill: number, p: Phrase): number {
  const t = phraseTotals(p);
  const raw = Math.trunc((skill + t.credit - 2 * t.cost) / 10);
  return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, raw));
}

export function successChance(rel: number, table: SuccessTable): number {
  // Donor: _SuccessXpTable[MIDDLE_DELTA_LVL - relativeLevel]; the clip is applied first.
  return table.chanceByIndex[MAX_DELTA - rel];
}

// Donor getSucessFactor: returns >1 critical success, 1 success, (0,1) partial, 0 fail, <0 critical failure.
export function successFactor(chance: number, roll: number, t: SuccessTable): number {
  if ((t.crit * chance) / (t.crit + t.succ) > roll) return 1.1;
  if (chance > roll) return 1.0;
  const pSChance = Math.trunc((t.partial / (t.partial + t.fail + t.critFail)) * (100 - chance));
  if (pSChance > roll - chance) return (pSChance - roll + chance) / pSChance;
  const failBand = ((t.partial + t.fail) / (t.partial + t.fail + t.critFail)) * (100 - chance);
  if (failBand > roll - chance) return 0;
  return -1;
}

// Donor validate: dead casters are refused; HP and sap must cover the phrase's costs.
export function canCast(p: Phrase, hp: number, sap: number, dead: boolean): boolean {
  const t = phraseTotals(p);
  return !dead && hp > 0 && hp >= t.hp && sap >= t.sap;
}

// Donor memorize: every brick in the phrase must already be known by the player.
export function bricksKnown(p: Phrase, known: Set<string>): boolean {
  return p.bricks.every((b) => known.has(b.id));
}

// Donor available_phrases (live): a brick is learnable when its skill requirement is at or below the cap,
// the player's MaxLvlReached meets one of its skill requirements, and its prerequisites are known or in the phrase.
export function brickLearnable(b: Brick, maxLvlReached: Record<string, number>, known: Set<string>, inPhrase: Set<string>, skillCap: number): boolean {
  if (b.learnSkills.length > 0) {
    if (!b.learnSkills.some((s) => s.value <= skillCap)) return false;
    if (!b.learnSkills.some((s) => (maxLvlReached[s.code] ?? 0) >= s.value)) return false;
  }
  return b.learnNeeds.every((n) => known.has(n) || inPhrase.has(n));
}

// Donor buyRolemasterPhrase: price is the sum of skill-point prices of bricks not yet known.
export function phraseSpPrice(p: Phrase, known: Set<string>): number {
  return p.bricks.reduce((sum, b) => (known.has(b.id) ? sum : sum + b.spPrice), 0);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/specials.ts` (proposed name; the Frankendom repo was not read in this pass). A pure spell-resolution function run by the server: cost check, relative level, success roll. Spell rows are catalogue data.
- Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only; no donor code may be copied)
- Brief rule served: 1 (one engine: the success roll runs on the server); 7 (licence read: AGPL-3.0, clean-room only)

Best transferable idea: Make a spell a list of brick parts with signed cost and credit values, so the level `(skill + credit - 2 * cost) / 10` picks a success chance from a table and a roll decides critical, success, partial or fail, so a badly built spell is weaker or fails instead of being forbidden.
Decision (proposed): adapt - take the credit-and-cost level and the roll bands, and drop the hard over-cost reject; Frankendom's spells are catalogue rows, and the server rolls once per cast, so a cost-heavy spell should lose chance, not be blocked.
Acceptance: A caster with skill 100 casts a spell with credit 20 and cost 30: the level is (100 + 20 - 60) / 10 = 6, the table index is 44, and the server log shows one of critical, success, partial or fail; a unit test asserts `relativeLevel` and `successFactor` at the band edges for four fixture spells and checks that a caster with zero mana is refused before the roll.

## 6. Gaps and risks

- The donor's credit-versus-cost validity check is DEAD. `CPhraseManager::checkPhraseValidity` (`sabrina/phrase_manager.cpp` 810-893) has its whole body inside a comment (`/*` at 812, `*/` at 890), and `return true;` follows (892). So the family rules (mandatory, forbidden, allowed) and the rule "total cost must not be above zero" (848) are never enforced. Both the memorize path (`character.cpp` 13664) and the phrase build call it. Fix: keep the live behaviour (cost lowers chance) and make the family rule a separate, tested server check if Frankendom wants one; do not re-enable the commented block as it stands.
- The donor's `CMagicPhrase::evaluate` only sets state (`magic_phrase.cpp` 231-232), and the memorize path calls `evaluate()` where the `validate()` call is commented out (`known_and_memorized_phrases.cpp` 147). Fix: Frankendom's memorize must run the server's own check and return a reason.
- Two copies of the learnability check: `sabrina/available_phrases.cpp` (stale, test-only, 3 arguments, hard-coded skill) and the live one in `entities_game_service/phrase_manager/available_phrases.cpp`. Only the live one is a reference. Do not port the stale copy.
- The learn gate checks `MaxLvlReached` (a high-water mark), so a skill that later drops keeps the spell. Decide per Frankendom ruling whether learning is permanent.
- No coin price on phrases: the donor charges skill points per unknown brick (`egs_static_brick.cpp` 385, `character.cpp` 9695). Frankendom has one ledger for coin; if it wants a coin price, it must be a separate catalogue field.
- No reagents: `ryzom/server/src` has no reagent code (grep found no hits). Sap and HP are the costs.
- No stat gate on schools in the sense of a character stat (strength, wit). The gate is a skill level per brick (`LearnRequiresOneOfSkills`), plus race on trainers (9445-9461, only when the bot's race-filter flags are on), plus fame (`fameRequiredMatchPlayerFaction`, 180). The civilisation check inside the learn function is commented out.
- Spending: `spendSP` adds `(uint32)sp` to the spent counter (character.cpp 20410-20420, read), which truncates fractional points on spend. Fix: keep a double and round only for display.
- The success table values (sheet `egs_success_chance_tables`, `egs_sheets.cpp` 237) were not read. The shape and the bands are read; the numbers are not. Do not claim which numbers suit a fast fight until the table is read.
- The sap and HP check is per cast. Whether recast or channel rules exist is not read in this cell (`CSPhrase` apply and cast timing not read).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Learn gate (character.cpp 9731) runs only when testRestrictions is true (9711), after the SP balance check (9700); note presented it as unconditional. Confirmed in code.
- Trainer race filter (9445-9461) is conditional on bot flags getFilterExplicitActionTradeByBotRace/PlayerRace. Confirmed.
- Cast gate: dead/hp<=0 check is at 258, HP cost at 263; note cited 263 for both. Confirmed.
- rand(99) range still unverified; left flagged as unchecked.
- Missed: apply path divides by _Skills.size() with no zero guard and a failed skill lookup returns after sap/HP were spent (410-419, 432-433, 436): cost paid, no effect. Added to section 1 as a defect with a fix.

Fixed 2026-10-12: learn gate and trainer race filter conditions and line ranges, cast gate line split, apply-path defect line added. No sketch change (no TypeScript touched).
