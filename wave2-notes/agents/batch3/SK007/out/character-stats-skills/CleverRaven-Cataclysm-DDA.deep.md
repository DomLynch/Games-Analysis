# CleverRaven-Cataclysm-DDA (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_health.cpp` (with character.cpp, melee.cpp, character_modifier.cpp, cata_utility.cpp, skill.cpp; numbers in data/core/external_options.json, data/json/effects.json, data/json/body_parts.json) | Licence: CC-BY-SA 3.0 (top-level `LICENSE.txt`: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License"; GPL/Apache/OFL only for named fonts) | C++ | symbol `Character::update_stamina`, with `mod_stamina`, `get_stamina_max`, `get_stamina_dodge_modifier`, `get_dodge`, `get_total_melee_stamina_cost`, `logarithmic_range`

Checked: Read end to end: character_health.cpp 2175-2360 (get_stamina, get_stamina_max, mod_stamina, burn_move_stamina, update_stamina), 2361-2395 (get_cardiofit), 2420-2430 (cough), 455-475 (get_standard_stamina_cost); character.cpp 1140-1180 (consume_dodge_attempts, can_try_dodge, dodge modifier), 1826-1838 (on_try_dodge), 1880-1890 (counterattack), 1905-1955 (uncanny dodge costs), 2045-2056 (can_run), 4440-4475 (burn_energy_*), 6284-6300 (run cost), 525-540 (cardio base); melee.cpp 925-1010 (swing cost), 1213-1262 (get_dodge), 2200-2225 (block cost); character_modifier.cpp 300-310; cata_utility.cpp 160-200 (logistic and logarithmic_range); skill.cpp 350-520 (train, rust, readBook). Read in part: character.cpp 3260-3300 (stat getters and caps), data files (external_options.json, effects.json 740-750, body_parts.json 32). Not read: stance helpers (is_on_ground, is_crouching), proficiency bonus JSON values (`bonus_for`), weight_capacity and the overburden figure, get_arms_stam_mult and get_legs_stam_mult, get_lifestyle, stimulant effects, bionic power, the cardio accumulator update (character_body.cpp ~300-380), the NPC branch beyond one line, skill level from XP. Confidence: high on the stamina pool, the swing, block and dodge costs, the dodge gate and the run multiplier (read in full); medium on the regen unit (the caller that sets `turns` was not read). Camera: not applicable.

## 1. Mechanism

One stamina pool per character. Everything that tires the body spends from it, and the pool gates what the fighter may do.

- Pool size: `max = 3500 + 5 * cardiofit` (options PLAYER_MAX_STAMINA_BASE 3500 and PLAYER_CARDIOFIT_STAMINA_SCALING 5; character_health.cpp:2201-2202). Cardiofit = the cardio accumulator (base 1000, character.cpp:529-535) times a modifier: mutation multiplier (base 1.0), plus swimming skill / 100 (the code reads swimming; the comment says athletics, see section 6), plus lifestyle / 1000 with a double penalty when negative (character_health.cpp:2378-2392). At the defaults this gives max = 8500 (computed).
- Spending, all in one signed number that goes negative:
  1. Melee swing (melee.cpp:945): arm cost = `min(-50, total)`. `total` = proficiency multiplier x (weight term + melee skill - stance malus), with weight term = `-(grams/16 + 50)` times the limb Lift modifier `melee_stamina_cost_mod` (1.0 at default; character_health.cpp:473, character_modifiers.json:53; melee.cpp:966-991). Stance malus: 50 when on the ground, 20 when crouching and not using natural stance or unarmed (melee.cpp:971-973). A miss by a DEFT character adds 50 before the -50 floor (melee.cpp:933, 945).
  2. Block (melee.cpp:2216-2220): leg cost = `15 * 6 * (20 - melee) / 20`, using the base burn option of 15.
  3. Walking (character_health.cpp:2246-2284): leg cost = moves x burn ratio / 100, where the ratio starts at 15 and is scaled by move mode and by overburden percent.
  4. Uncanny dodge (a trait or effect; character.cpp:1911-1952): needs 300 stamina and costs 300 on legs, or 150 on legs with a bionic that also needs power.
- Gates:
  - Dodge is refused when winded, asleep, or driving (character.cpp:1148-1152), or when the dodge modifier is 0.11 or less (character.cpp:1157). Each dodge try uses one dodge attempt (character.cpp:1834); the attempt itself spends no stamina in the code read.
  - The dodge modifier is `1 - logistic_range(10% of max, 90% of max, stamina)` (character.cpp:1172-1178). It is 0 at 10% of max, 0.5 at 50%, 1 at 90% (the logistic is clamped at both ends). `get_dodge` multiplies the dodge value by it (melee.cpp:1244-1245) and returns 0 when a dodge cannot be tried (melee.cpp:1215).
  - Counterattack after a dodge is refused below one third of max (character.cpp:1886).
  - Running needs stamina above zero and not winded (character.cpp:2052).
- Move-cost multiplier (all move modes, not only running): `character.cpp` 6293 divides the move cost by the stamina modifier, and `burn_move_stamina` (character_health.cpp 2280-2282) multiplies its stamina burn by it too. Move cost is multiplied by `1 / ((stamina/max + 1) / 2)`, so 1 at full and 2 at empty (character_modifier.cpp:304-308; character.cpp:6293).
- Winded: any change that takes stamina below zero adds the body parts' windage effect (character_health.cpp:2236-2238). The "winded" effect lasts up to 30 s (the windage effect is applied for 10 turns, character_health.cpp 2239), gives speed -10, a pain chance and a reaction limb-score penalty of 0.5 (effects.json:740-749), cuts regen to 10% (character_health.cpp:2308-2310), and blocks dodge and run (character.cpp:1151, 2052).
- Regen per turn: `max(1, 20 * cardiofit / cardio_acc_base * breathing_mod)` (cardio_acc_base is 1000 at default; `stamina_recovery_breathing_mod`, character_health.cpp 2316-2317) x regen multiplier, where the multiplier is `mod_regen + (winded ? 0.1 : 1.0)` floored at 0.1 (character_health.cpp:2299-2310), plus stim (up to 5 per turn when positive; a negative stim subtracts a share of current stamina; 2328-2335), rounded up over the turns (2353). Bionic gills add more (not read).
- Clamp: stamina stays in [0, max] (character_health.cpp:2243). A harmful cough costs 5% of max (2425-2426).

## 2. Key functions

- `Character::mod_stamina` (the one place stamina changes; sets winded below zero, clamps): `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_health.cpp` 2213-2244.
- `Character::update_stamina` (regen per turn): `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_health.cpp` 2296-2358.
- `Character::burn_move_stamina` (walking cost): `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_health.cpp` 2246-2294.
- `Character::get_cardiofit` and `get_stamina_max` (pool size): `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_health.cpp` 2187-2206, 2361-2395.
- `Character::get_stamina_dodge_modifier` and `can_try_dodge`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character.cpp` 1148-1180.
- `Character::get_dodge`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/melee.cpp` 1213-1262.
- `Character::get_total_melee_stamina_cost` and the swing burn: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/melee.cpp` 925-991 and 945.
- Block cost: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/melee.cpp` 2216-2220.
- `logarithmic_range` (the dodge curve): `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/cata_utility.cpp` 163-196.

## 3. Numbers vs mechanism

Reusable algorithm vs game-specific constants:

| Reusable algorithm | Game-specific constants |
|---|---|
| One stamina pool; every action spends a signed amount; the pool clamps to 0..max | max 3500 + 5 x fitness (external_options.json:28, 63) |
| Per-swing cost from the weapon weight, minus skill, plus stance; a floor per swing | weight/16 g + 50; floor -50; stance +50 prone, +20 crouch (character_health.cpp:471-473; melee.cpp:963, 971) |
| Blocks cost legs, falling with skill | base 15 x 6, zero at skill 20 (melee.cpp:2216-2217) |
| Dodge value follows a logistic of the pool, zero at the bottom, refused at a floor | band 10%-90% of max; refuse at 0.11 (character.cpp:1157, 1175-1176) |
| Moving gets dearer as the pool empties (every move mode) | x2 at empty (character_modifier.cpp:308) |
| Going below zero is a state (winded) with a regen penalty | winded 30 s, speed -10, regen x0.1 (effects.json:746-747; character_health.cpp:2308) |
| Regen per turn from a base, scaled by fitness | base 20 per turn, fitness base 1000 (external_options.json:70; character.cpp:535) |

Stamina table (SK-FOCUS format: name | what it does | formula | number ranges | caps | file:line). "computed" means worked out by hand from the code, not run.

| Name | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Stamina pool (max) | Total stamina | `3500 + 5 * cardiofit` | computed: 8500 at defaults (cardio 1000) | clamp to max | character_health.cpp:2187-2206 |
| Cardiofit | Fitness term for pool and regen | `base_cardio * (mut_mod + swim/100 + lifestyle/1000 [x2 if negative])` | base 1000; swimming skill adds 1% per point (code, comment says athletics) | none in function | character_health.cpp:2361-2395; character.cpp:529-535 |
| Stamina regen | Recovery per turn | `max(1, 20 * cardiofit/1000) * max(0.1, mult)`; winded mult 0.1; plus stim up to 5 | computed: 20 per turn at defaults | floor 0.1 on mult; clamp to max | character_health.cpp:2299-2358 |
| Walking cost | Leg cost per walking move | `moves * (15 + overburden%) * move-mode factor / 100` (move-mode and overburden not computed) | base 15 per 100 moves | none seen | character_health.cpp:2260-2284 |
| Swing cost (arms) | Cost of one melee swing | `min(-50, prof * (-(grams/16 + 50) + round(melee) - stance))` | computed: 1,600 g weapon = 150 at melee 0 standing; crouch 170; prone 200; unarmed 50 | floor -50 per swing | melee.cpp:933-991; character_health.cpp:461-473 |
| Stance malus | Extra swing cost from posture | prone 50, crouch 20 | 0, 20, 50 | none | melee.cpp:971-973 |
| Melee skill in swing | Skill reduces swing cost | `round(melee)` added to the negative cost | 1 point per level | none | melee.cpp:969 |
| Block cost (legs) | Cost of one block | `15 * 6 * (20 - melee) / 20` | computed: 90 at melee 0, 45 at 10, 0 at 20, negative above 20 | none in code (defect, section 6) | melee.cpp:2216-2220 |
| Dodge gate | Dodge refused below this | refused if winded or modifier <= 0.11 | computed: refused below about 30.4% of max | hard threshold 0.11 | character.cpp:1148-1168 |
| Dodge modifier | Scales dodge value by stamina | `1 - logistic_range(0.1 max, 0.9 max, s)` | computed: 0.00 at 10%, 0.06 at 25%, 0.50 at 50%, 0.94 at 75%, 1.00 at 90% | 0 floor, 1 ceiling | character.cpp:1172-1178; melee.cpp:1244-1245; cata_utility.cpp:166-196 |
| Counterattack gate | No counter after a dodge when tired | refused below max/3 | 1/3 of max | hard | character.cpp:1886 |
| Run gate | Can run only with stamina and not winded | `s > 0 && !winded && legs` | s > 0 | hard | character.cpp:2052 |
| Move-cost multiplier | Move cost in every move mode (also scales walking burn) | `1 / ((s/max + 1)/2)` | 1 at full to 2 at empty (computed) | 0.5 floor on the modifier | character_modifier.cpp:304-308; character.cpp:6293 |
| Winded state | Entered when stamina would go below zero | windage effect on body parts; effect winded 30 s, speed -10, regen x0.1 | 30 s | none in code | character_health.cpp:2236-2238; effects.json:740-747; body_parts.json:32 |
| Uncanny dodge cost | Special dodge | needs 300 stamina, costs 300 legs; 150 legs with a bionic | 300 / 150 | needs 300 or 150 | character.cpp:1911, 1948, 1952 |
| Cough cost | Harmful cough | 5% of max | 5% | none | character_health.cpp:2425-2426 |
| Strength cap (and Dex, Per, Int) | Caps the four attributes | `min(cap, max(0, base + bonus))`; base also capped | cap 20 for each (external_options.json:35, 42, 49, 56) | cap 20 | character.cpp:3260-3279; options.cpp:4172-4173 |
| Skill XP: practical and knowledge | Two tracks per skill; practice catches up to knowledge | catch-up scaled by level gap when knowledge is ahead; knowledge gain capped at 0.9 x catch-up | ratio of knowledge to practice level | none | skill.cpp:350-389 |
| Skill rust | Unused skill loses XP | after 24 h; amount `level_mult * rust_mult * 16 / slowdown`, with level_mult `(L+1)^2` and level_exp `10000 * level_mult` | level 0 to cap | no rust at cap | skill.cpp:444-483 |
| Book knowledge | Reading adds knowledge | `(knowledge + 1) * rng(min, max) * 100` | per book | stops at max level | skill.cpp:495-498 |
| Skill training speed | Global multiplier on training | option SKILL_TRAINING_SPEED default 1.0 | 1.0 | 0 disables | external_options.json:462; skill.cpp:384, 424 |
| Magic and mental stats | Not read in this pass | n/a | n/a | n/a | not read |
| Luck, hit location, armour per slot | Not read in this pass | n/a | n/a | n/a | not read |

## 4. TypeScript sketch

simplified: the sketch keeps the one pool, the swing cost (weight term, melee skill, stance, -50 floor), the block cost, the dodge gate and modifier with its 0.11 floor, the run multiplier, winded below zero, and regen. It omits the limb Lift modifier on swing cost and the breathing and regen-enchantment terms on regen (all three are optional arguments with default 1.0 / 0), arms and legs split (bionic limbs), bionic power, the proficiency multiplier and DEFT miss bonus, overburden burn and weight capacity, the cardio accumulator dynamics (fitness is an input), stimulants, the 30 s winded timer, the quarter-stamina health counter, cough, counterattack, uncanny dodge, and the NPC branch. It also fixes one donor defect: the block cost goes negative above melee skill 20 (a block would give stamina back), so the sketch clamps it at zero.

```ts
// Licence: CC-BY-SA 3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const BASE_MAX_STAMINA = 3500;     // PLAYER_MAX_STAMINA_BASE (external option)
const CARDIO_SCALE = 5;            // PLAYER_CARDIOFIT_STAMINA_SCALING (external option)
const REGEN_BASE = 20;             // PLAYER_BASE_STAMINA_REGEN_RATE, per turn
const BURN_BASE = 15;              // PLAYER_BASE_STAMINA_BURN_RATE, per 100 moves walking
const DODGE_FLOOR = 0.11;          // dodge refused at or below this modifier

type Stance = 'stand' | 'crouch' | 'prone';

interface Fighter {
  stamina: number;
  cardio: number;                  // fitness term; 1000 is the donor's base cardio value
  melee: number;                   // melee skill level
  winded: boolean;
}

function maxStamina(f: Fighter): number {
  return BASE_MAX_STAMINA + CARDIO_SCALE * f.cardio;
}

// Logistic in [0,1]: 1 at or below min, 0 at or above max, 0.5 at the midpoint.
function logRange(min: number, max: number, pos: number): number {
  const L = (t: number) => 1 / (1 + Math.exp(-t));
  const lo = L(-4);
  const hi = L(4);
  if (pos <= min) return 1;
  if (pos >= max) return 0;
  const u = (pos - min) / (max - min);
  return (L(4 - 8 * u) - lo) / (hi - lo);
}

// Dodge value multiplier: 0 at 10% stamina, 1 at 90% stamina.
function dodgeModifier(f: Fighter): number {
  const m = maxStamina(f);
  return 1 - logRange(m * 0.1, m * 0.9, f.stamina);
}

function canDodge(f: Fighter): boolean {
  return !f.winded && dodgeModifier(f) > DODGE_FLOOR;
}

// Changes stamina. Going below zero makes the fighter winded (the donor's 30 s timer is not modelled).
// Clamps to [0, max].
function spend(f: Fighter, delta: number): void {
  f.stamina += delta;
  if (f.stamina < 0) f.winded = true;
  f.stamina = Math.min(Math.max(f.stamina, 0), maxStamina(f));
}

// One melee swing, arm cost as a negative number: weight term, minus melee skill, minus stance; never less than -50.
function swingCost(weaponGrams: number, f: Fighter, stance: Stance, liftMod: number = 1.0): number {
  // donor multiplies the weight term by the limb Lift modifier (1.0 at default)
  const base = -(Math.floor(weaponGrams / 16) + 50) * liftMod;
  const stanceMalus = stance === 'prone' ? 50 : stance === 'crouch' ? 20 : 0;
  return Math.min(-50, base + Math.round(f.melee) - stanceMalus);
}

// Block cost on legs: falls with melee skill. The donor goes negative above skill 20; clamped here.
function blockCost(melee: number): number {
  return BURN_BASE * 6 * Math.max(0, (20 - melee) / 20);
}

// Run move-cost multiplier: 1 at full stamina, 2 at empty.
function runCostMultiplier(f: Fighter): number {
  return 1 / ((f.stamina / maxStamina(f) + 1) / 2);
}

// Regeneration per turn: fitness-scaled base, at least 1, and 10% of that while winded.
// modRegen is the additive regen enchantment (added to, then floored with, the winded multiplier); breathingMod is the breathing limb score (1.0 at default).
function regenPerTurn(f: Fighter, modRegen: number = 0, breathingMod: number = 1.0): number {
  const mult = modRegen + (f.winded ? 0.1 : 1.0);
  return Math.max(0.1, mult) * Math.max(1, REGEN_BASE * (f.cardio / 1000) * breathingMod);
}

function regen(f: Fighter, turns: number): void {
  spend(f, Math.ceil(regenPerTurn(f) * turns));
}

// Example use (not part of the mechanism): a 1,600 g weapon swing at melee 0 standing.
const duelist: Fighter = { stamina: maxStamina({ stamina: 0, cardio: 1000, melee: 0, winded: false }), cardio: 1000, melee: 0, winded: false };
spend(duelist, swingCost(1600, duelist, 'stand'));
regen(duelist, 1);
void canDodge(duelist);
void blockCost(duelist.melee);
void runCostMultiplier(duelist);
```

Best transferable idea: one signed stamina pool that every action spends from, with dodge value scaled by a logistic of the pool and refused below a floor, so tiredness shows up as lost dodges and dearer runs before it shows up as a stop.
Decision (proposed): adapt — keep the single pool, the weight-plus-skill-minus-stance swing cost with a per-swing floor, the logistic dodge scale and refusal floor, and the winded state; fix the block-cost sign; drop the cardio accumulator and stimulants for the first cut.
Acceptance: a duel test with a pool of 8,500 (the donor default) shows a 1,600 g sword swing at melee 0 costing 150; a dodge attempt at 25% stamina is refused (modifier 0.06 is under the 0.11 floor), and at 50% it is allowed at half value; a swing that takes the pool below zero marks the fighter winded and refuses the next dodge.

## 5. Lands in

- TARGET `src/fight/stamina.ts` (new module, proposed): the one stamina ledger and its spend and regen. The guard, parry and dodge steps in the duel call it; the client only displays it.
- Parity-checklist row 3 (guard/parry/stamina): the swing cost, block cost, dodge gate and winded state are the guard and stamina economy. The numbers (base pool, floors, bands) are catalogue fields under row 21.
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only)
- Brief rule served: 1 (one engine, one ledger; numbers as data fields); rules 7-9 n/a

## 6. Gaps and risks

- CC-BY-SA 3.0: clean-room only. The sketch is written from the mechanism, not a translation.
- Defect: block cost goes negative above melee 20 (melee.cpp:2217-2220), so a block at high skill restores stamina. Keep the idea, fix: clamp at zero (sketch does).
- Defect (naming): the cardio comment says athletics, the code reads the swimming skill (character_health.cpp:2377-2378). Fix: name the skill in the data, not in a comment. Not needed for Frankendom.
- Units: the donor regen is a float per turn and the walking burn is per 100 moves. Frankendom's server runs a fixed step with integer state (parity row 18, post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"). Convert to integer per-tick amounts and test the rounding; the donor's ceil on regen favours the fighter by up to one point per call.
- Many-on-one: MAX_ATTACKERS = 3 means three attackers can each force a block, and the donor's block cost has no cap per turn. Three blocks a turn can drain legs quickly; the test must show a cap or a stop rule.
- The dodge gate is a hard threshold at 0.11 on a smooth curve, so a dodge flips off at about 30% stamina (computed). Decide whether that cliff is wanted for the Pit (Pit-only row 22) and the duel.
- Winded is any stamina change below zero, including coughs and other spends, not only melee. Frankendom should limit winded to the duel spends it means to punish.
- Stamina is owned by the character here. The donor gives NPCs a fixed full pool (`get_stamina` returns max for NPCs, character_health.cpp:2178-2183). Frankendom's creatures need an explicit rule: a stamina or a fixed attack rate, not an accident of the NPC branch.
- Server-verified: the pool and every spend must live on the server; the client shows the number. Kills are server-verified, so a dodge refused by the server must be the same refusal the client shows.
- NPCs: `get_stamina_max` returns a fixed 10000 for NPCs (character_health.cpp 2189-2192) and `get_cardiofit` is 2x the base (2363-2366). `can_try_dodge` also refuses on narcosis, fearparalyze and CANNOT_MOVE (character.cpp 1150-1152). Bionic gills regen bonus was not read.
- Magic and mental stats, luck and hit location were not read in this cell, so this note makes no claim about them.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error: "Running cost" framing. The stamina move-cost modifier is applied for every move mode (character.cpp:6293) and in burn_move_stamina (character_health.cpp 2280-2282), not only running. Numbers 1 to 2 are right. Confirmed.
- Error: swing weight term omitted the multiplier `melee_stamina_cost_mod` (limb Lift score, character_health.cpp:473); correct at default 1.0. Confirmed.
- Error: regen formula omitted the breathing multiplier (character_health.cpp 2316-2317) and that mod_regen is added to the winded multiplier before the 0.1 floor (2306-2310); regen is base*cardiofit/get_cardio_acc_base, not literally /1000. Confirmed.
- Error: winded also gives pain and a reaction limb-score penalty (effects.json 747-748); the windage effect is applied for 10 turns (2239). Confirmed.
- Missed: NPC stamina max fixed 10000 (2189-2192) and NPC cardiofit 2x base (2363-2366); can_try_dodge also refuses on narcosis, fearparalyze, CANNOT_MOVE (character.cpp 1150-1152). Bionic gills regen bonus unread (declared).
- Verified OK: pool, cardiofit, logarithmic_range, dodge gate 0.11 and 30.4 percent threshold, swing floor, stance, block cost, counterattack, can_run, uncanny, cough, NPC rule, skill train/rust/readBook, licence.

Fixed 2026-10-12: section 1 now says the modifier applies to every move mode, adds the Lift multiplier, breathing and regen-enchantment terms, winded extras and the NPC/dodge-gate lines; sketch `swingCost` and `regenPerTurn` gained optional args (default behaviour unchanged); work/cdda-stamina.ts updated to match. Typecheck below.
