# ryzom-ryzomcore (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character.cpp` | Licence: GNU Affero General Public License v3 (COPYING and LICENSE in the repo root; file headers say "version 3 of the License, or (at your option) any later version") | C++ | symbol `CCharacter::applyRegenAndClipCurrentValue`

Checked: Read in the ACTIVE build (entities_game_service is added in `server/src/CMakeLists.txt:22`): `computeMaxValue` (character.cpp 2272; score switch 2321-2345), `applyRegenAndClipCurrentValue` (2375-2510), the coma branch of `deathOccurs` (1807-1827 and the second regen loop 1837-1862), `respawn`/`applyRespawnEffects`/`revive` (1870-1996), `changeCharacteristic` clip (9953-9995), `getWeightMalus` (20704-20713), god-mode floor (1103-1111); `tickUpdate` calls regen at 1144. Phrase costs and drains in `phrase_manager/combat_phrase.cpp`: brick parse `addBrick` (433; params 490-495), `validate` (908; costs 1278-1292), `launch` spend (1704; 1755-1760), `applyAction` drain (2940; 3051-3066), dodge/parry test `testOpponentDefense` (3440; roll and table 3600-3649), `checkPhraseCost` (4034; gate 4041-4046), `applyLocalisationSpecialEffect` (4194; effects 4212-4261), `applyArmorProtections` (4276). Tuning values from `egs_variables.cpp`, `weapon_damage_table.cpp`, `egs_static_success_table.h`, `egs_static_game_sheet.cpp`, `tick_event_handler.cpp`. Data half: this donor has no sheet data for the topic (no .georges or packed sheet files for brick, item or success tables; checked with find), so the brick stamina values, weapon sabrina factors and success-table rows are not available. Halves read: server code and the common game_share headers; the client sheet loaders were not read. Confidence: high for the pool, regen, weight, cost and drain formulas (I read each path, and the donor's own constants). Not read: the success-table and XP-stage values (sheet data; no sheet or .georges file exists in this donor copy, checked by find), the NeL typedef of `TGameTime` (NeL is not in the donor), the death-penalty and catalyser code, the thorn-wall and lightning-wall reflect effects (they reuse the hit constants at applyAction 3186-3230, not read in full). A second copy of the stamina code exists in `server/src/sabrina/`, but `server/src/CMakeLists.txt:49-50` comments the sabrina subtree out, so I did not use it. camera: not a camera topic.

Best transferable idea: Derive each pool from two characteristics (max = (c+10) x 10, regen = c/16 + 1.6, half in action) and make every costed action drain stamina from the engine, with a hit drain the target pays (base weapon drain on every non-lethal hit; the chest bonus and the other hit-location effects only on a critical hit) and a lethal hit draining nothing.
Decision (proposed): adapt — keep the characteristic-to-pool chain and cost-then-drain pattern, but split regen by combat state (not sit only), gate every actor, write drains to the one ledger, fix the weight-malus rounding, apply hit-location effects only on critical hits, and move numbers into zone and item data.
Acceptance: A player sees stamina fall by the phrase cost on each swing and refill at the action rate while not sitting; a normal (non-critical) chest hit of 40 damage with factor 0.2 removes 8 stamina and a critical chest hit of 40 damage removes 28; a server test asserts a player below cost is refused, a creature is charged but not refused, and a lethal hit drains nothing.

## 1. Mechanism

One pool per resource, built from two of the eight characteristics, then regenerated, charged and drained by the engine. Order of steps in the donor:

(a) Attributes to pools. Eight characteristics: constitution, metabolism, intelligence, wisdom, strength, well_balanced, dexterity, will. Pairs: HP = constitution (max) + metabolism (regen); sap = intelligence + wisdom; stamina = strength + well_balanced; focus = dexterity + will. Pool max = (characteristic Current + 10) x 10 + permanent modifiers (character.cpp 2321-2337). A characteristic is clipped to 250 (`MaxCharacteristicValue`, 9961-9963). Max is recomputed in `computeMaxValue` (2272).

(b) Regen rates. Repos rate = characteristic / 16 + 1.6. Action rate = (characteristic / 16) / 2 + 1.6 (2322-2323, 2344-2345). Each tick, `applyRegenAndClipCurrentValue` uses the repos rate only when the mode is SIT (2384-2390); otherwise the action rate. So the split is sit versus not-sit, not in-combat versus out-of-combat. The accumulator adds rate x (game cycles since last update) / 10 into a decimal carry; the whole part goes to Current; Current is clipped to [0, Max] (2429-2446). Game time advances by 0.1 per tick and one tick is one cycle (`tick_event_handler.cpp:41, 165-166`), so the /10 reads as a per-second rate if `TGameTime` is fractional (its NeL typedef is not in the donor; see section 6). The rate written to the client is rate x 10 (2402).

(c) Carry weight and speed. Carry cap = 100000 g + 1000 g per point of strength Current (20706). Malus = weight difference in grams divided by 1000 (truncated toward zero), then decremented by 1 on any nonzero remainder, then capped at 0 (20707-20712). So an overweight load rounds away from zero (-1500 g gives -2, -500 g gives -1); see the defect in section 6. Speed = base speed x (1 + modifier / 100), modifier floored at -100 (2464-2467). Sitting or unable to move gives speed 0 (2472 and after).

(d) Action cost (phrase). Fixed part from the brick plus a per-kg weapon part: StaConst + StaFactor x weapon kg (490-495, 1278). For players the total is multiplied by (1 + 0.5 x wear malus), where wear malus is the sum of `WearEquipmentMalus` over equipped items (1291-1292; `player_inv_equip.cpp:39-50`). Gate in `validate`/`checkPhraseCost`: only players are refused, when stamina Current < cost (4041-4046). Spend in `launch`: if Current is not 0, subtract the cost and floor at 0 (1755-1760). Creatures are charged but never refused.

(e) Drain on a hit that does not kill (applyAction). A lethal hit (defender HP <= damage, 3051) drains nothing. Otherwise: stamina loss = trunc(damage x weapon-linked factor), applied only when the factor is set (3063-3066). A chest hit adds trunc(damage x 0.5) (4221) ONLY when the hit is a critical hit: `applyLocalisationSpecialEffect` starts with `if (!_CriticalHit) return;` (4198-4199, comment "for the moment, only apply such effects on critical success"). Sap has the same shape (3067 and after). Floor at 0.

(f) Hit location, same hit, critical hits only (applyLocalisationSpecialEffect, called at 3059; the critical gate is 4199, and the effects need a stun and a timed-debuff system, not only pool arithmetic): head = stun 2.5 s (4212); chest = the stamina drain above; arms = attack latency +50% for 5 s (4229-4233); legs = move speed -20% for 5 s (4249-4253); hands = combat skills -20 for 5 s (4240-4243); feet = dodge -20 for 5 s (4260-4261). Tuning values at egs_variables.cpp 312-321.

(g) Death, respawn, god mode. HP reaching zero enters the coma branch in `deathOccurs` (1807-1827): HP Current = -Max / 2 and HP regen = -Max / (CommaDelayBeforeDeath x 0.2) (1817-1819). Other pools regen = -Current / (CommaDelayBeforeDeath x 0.1) (1823). The second loop (1837-1862) clips non-HP pools at 0 and HP at -Max. `CommaDelayBeforeDeath` = 3000, described as server ticks (egs_variables.cpp:59). `respawn` calls `applyRespawnEffects`, which sets HP, stamina, sap and focus to Base / 10 (1930, 1951-1954). `revive` sets them to Base (1995). In god mode, a pool below Base / 3 is refilled to Base (1103-1111).

Tired body: there is no separate tired state. Stamina at 0 has no special mode: a costed player phrase is refused (0 < cost), and a creature at 0 still attacks because its spend is skipped at exactly 0. Regen runs in every state; the drain on hit is the only extra fatigue.

## 2. Key functions

- `CCharacter::computeMaxValue` (character.cpp 2272; pool-max score switch 2321-2345): characteristic to pool max and regen rates.
- `CCharacter::applyRegenAndClipCurrentValue` (2375-2510): sit switch, regen decimal, clip, skill current, weight to speed.
- `CCharacter::getWeightMalus` (20704-20713): carry cap and speed malus.
- `CCharacter::deathOccurs` (1762-1827) and regen loop (1834-1862): coma pools.
- `CCharacter::respawn` (1870) and `applyRespawnEffects` (1945-1954); `CCharacter::revive` (1986-1996): respawn fills.
- `CCombatPhrase::addBrick` (433; reads STA and STA weight params at 490-495).
- `CCombatPhrase::validate` (908; total cost with weapon weight and wear at 1278-1292).
- `CCombatPhrase::launch` (1704; spend at 1755-1760).
- `CCombatPhrase::applyAction` (2940; kill test, drain and localisation call at 3051-3066).
- `CCombatPhrase::applyLocalisationSpecialEffect` (4194; hit-location effects and chest drain at 4212-4261).
- `CCombatPhrase::checkPhraseCost` (4034; gate, players only, at 4041-4046).

## 3. Numbers vs mechanism

Stat table (name | what it does | formula | number ranges | caps | file:line). Values marked "data" are sheet values not present in this donor.

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| constitution | input to HP max | (c + 10) x 10 | c 0-250 gives HP max 100-2600 | c <= 250 (hard) | character.cpp:2321; egs_variables.cpp:304, 669-670 |
| metabolism | HP regen | repos = c/16 + 1.6; action = (c/16)/2 + 1.6 | c 0-250: repos 1.6-17.2, action 1.6-9.4 per second | c <= 250 | character.cpp:2322-2323, 2344-2345; egs_variables.cpp:299-301 |
| intelligence | input to sap max | (c + 10) x 10 | 100-2600 | c <= 250 | character.cpp:2326 |
| wisdom | sap regen | as metabolism | as metabolism | c <= 250 | character.cpp:2327 |
| strength | input to stamina max; carry +1000 g per point | (c + 10) x 10; cap 100000 + 1000 x c grams | stamina 100-2600; carry cap 100 kg (c=0) to 350 kg (c=250) | c <= 250 | character.cpp:2331, 20706; egs_variables.cpp:495 |
| well_balanced | stamina regen | as metabolism | as metabolism | c <= 250 | character.cpp:2332 |
| dexterity | input to focus max | (c + 10) x 10 | 100-2600 | c <= 250 | character.cpp:2336 |
| will | focus regen | as metabolism | as metabolism | c <= 250 | character.cpp:2337 |
| speed malus (weight) | slows walk and run | 1 point per whole kg over cap, floor 0 above; speed = 1 + mod/100 | 0 to -100 (%) | floor -100 (speed 0) | character.cpp:20706-20712, 2464-2467 |
| sit regen | repos rate used while sitting | rate = repos | as metabolism row | none | character.cpp:2384-2386 |
| action regen | rate used when not sitting, in or out of combat | rate = action | half the repos part, plus 1.6 | none | character.cpp:2390 |
| regen clip | decimal carry and clip | +rate x cycles / 10 to decimal, whole part to Current, clip [0, Max] | per tick | Max | character.cpp:2431-2446 |
| phrase stamina cost | cost to start a phrase | STA + StaFactor x weapon kg, x (1 + 0.5 x wear) for players | brick values (data) | refused if stamina < cost (players only) | combat_phrase.cpp:490-495, 1278-1292, 4041-4046 |
| wear malus | equipment wear raises costs | sum of item WearEquipmentMalus; cost x (1 + 0.5 x malus) | item values (data); cost scale 1.0 to 1 + 0.5 x malus | none | game_item_manager/player_inv_equip.cpp:39-50; combat_phrase.cpp:1291 |
| stamina drain on hit | defender loses stamina per hit | trunc(damage x weapon factor), only if factor set | factor from weapon curve (data) | floor 0; none if the hit kills | combat_phrase.cpp:3051-3066 |
| chest stamina drain | extra drain on CRITICAL chest hits only | trunc(damage x 0.5), critical hit required | 0.5 | floor 0 | egs_variables.cpp:312; combat_phrase.cpp:4199, 4221 |
| head stun | critical hit to head | stun for 2.5 s | 2.5 s | none | egs_variables.cpp:313; combat_phrase.cpp:4212 |
| arm slow | critical hit to arms | attack latency +50% for 5 s | +50% (sign: +20 = +20% latency); 5 s | none | egs_variables.cpp:314-315; combat_phrase.cpp:4229-4233 |
| leg slow | critical hit to legs | move speed -20% for 5 s | -20%; 5 s | none | egs_variables.cpp:316-317; combat_phrase.cpp:4249-4253 |
| hand debuff | critical hit to hands | combat skills -20 for 5 s | -20; 5 s | none | egs_variables.cpp:318-319; combat_phrase.cpp:4240-4243 |
| feet debuff | critical hit to feet | dodge -20 for 5 s | -20; 5 s | none | egs_variables.cpp:320-321; combat_phrase.cpp:4260-4261 |
| respawn pools | respawn at a point | each pool = Base / 10 (Base, not the modified Max) | 10% | none | character.cpp:1951-1954, 1930 |
| revive pools | revive | each pool = Base | 100% | none | character.cpp:1995 |
| god-mode floor | invulnerable characters | pool < Base / 3 refilled to Base | 1/3 threshold | none | character.cpp:1103-1111 |
| coma (HP) | HP at zero | HP = -Max / 2; HP regen = -Max / (delay x 0.2) | delay 3000 (unit: "server tick", see section 6) | HP floor -Max | character.cpp:1817-1819, 1843; egs_variables.cpp:59 |
| coma (other pools) | drain after death | regen = -Current / (delay x 0.1) | as above | clipped at 0 | character.cpp:1823, 1851 |
| skill value | current skill used in combat | Current = Modifier + Base, floor 0 | Base 0-250 | Base <= 250 (fight and magic limiters, data var 250) | character.cpp:2414; egs_variables.cpp:61 |
| skill progress | XP to skill point | Xp += gain; at stage threshold Base += 1 and Xp = 0 | stage values (data, not in donor) | Base < MaxSkillValue; category limiter | character.cpp:7242, 7222, 7330, 7359, 7368 |
| skill point grant | SP for a point | addSP(stage multiplier, type) at threshold | multiplier (data) | none read | character.cpp:7351 |
| XP stage lookup | which XP row applies | first row with SkillLevel >= level, else last row | rows (data) | none | egs_static_game_sheet.cpp:359-366 |
| dodge / parry chance | defence roll | delta = defenderLevel - attackerLevel; clamp to +/-50; chance band and partial band from table; roll 0-98 | delta -50 to +50; chance 0-99 (data) | full dodge at factor >= 1 | constants.h:26-27; egs_static_success_table.h:110-111, 258-282; combat_phrase.cpp:3600-3619, 3649 |
| damage after dodge | partial dodge scales damage | damage x (1 - dodge factor) | factor 0-1 | none | combat_phrase.cpp:2661 |
| many-on-one defence malus | more melee attackers | 0 for the first attacker; (n - 1) x -5 for n > 1 | -5 per extra attacker (with the MAX_ATTACKERS = 3 ruling: 0, -5, -10) | none | egs_variables.cpp:323-324; combat_phrase.cpp:3569-3580 |
| protected slot | defence bonus on a chosen slot | +20 if hit slot = protected slot, -10 otherwise, 0 if none | +20 / -10 | none | phrase_utilities_functions.cpp:416-426 |
| weapon damage curve | damage vs skill for a weapon of quality q | below q: curve from MinDamage 25 to q level; above q: extrapolated, step damped by 0.8 | MinDamage 25, step 1, exponent 2, smoothing 0.8; table 251 x 251 | skill and reference <= 250 | egs_variables.cpp:87-90; weapon_damage_table.cpp:56-79; weapon_damage_table.h:27, 29, 51; combat_phrase.cpp:4822; game_item.cpp:2462 |
| armour and shield factor | protection vs skill | ref(q, skill) / ref(q, q), skill capped at q | 0 to 1 | defender skill capped at item quality | combat_phrase.cpp:4342-4343, 4352-4353 |
| magic resist | resistance roll | MagicResistDirect table on caster skill minus resist | table (data) | table range | magic_action_attack.cpp:236 |
| level / rank | no character level | skill base is the level; creature defence uses XP level | skill 0-250; creature XP level (data) | 250 | combat_phrase.cpp:3415 |
| luck | none | no luck stat (only "luck" in a test-report statistic) | n/a | n/a | testing_tool_service.cpp:823-838 (report only) |
| target bars (coach view) | HP, sap, stamina, focus readouts | 127 x Current / Max, floor 0 | 0-127 | Max = 0 gives 0 | character.cpp:3474-3518 |

Units: regen rates read as per second if one cycle is 0.1 s and `TGameTime` is fractional (not confirmed; section 6). Ranges come from the formulas and the clamps; the donor's sheet values are not in this copy.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for one pool at a time (regen tick, weight malus, phrase cost, gate and spend, drain on hit, respawn). It fixes the donor's weight-malus rounding (section 6). It omits the coma timer, the head, arm, leg, hand and foot critical-hit effects (they need a stun and debuff system), the sap and focus drains beyond the pool model, `RegenerateModifier`, the mount speed copy, the speed-zero branch, god-mode refills, the thorn and lightning reflect effects, the armour and shield absorption, the target-bar readouts and the decimal reset on max. The gate and spend are merged into one function (the donor checks in `validate` and spends in `launch`).

```ts
// Licence: GNU AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Pool = 'hp' | 'sap' | 'stamina' | 'focus';

const CHAR_MAX = 250;          // MaxCharacteristicValue (egs_variables.cpp:304)
const BASE_VALUE = 10;         // PhysicalCharacteristicsBaseValue (egs_variables.cpp:669)
const POOL_FACTOR = 10;        // PhysicalCharacteristicsFactor (egs_variables.cpp:670)
const REGEN_DIVISOR = 16;      // RegenDivisor (egs_variables.cpp:299)
const REGEN_ACTION_DIV = 2;    // RegenReposFactor (egs_variables.cpp:300)
const REGEN_OFFSET = 1.6;      // RegenOffset (egs_variables.cpp:301)
const BASE_CARRY_G = 100000;   // BaseMaxCarriedWeight (egs_variables.cpp:495)
const CHEST_STA_FACTOR = 0.5;  // HitChestStaLossFactor (egs_variables.cpp:312)

interface PoolState {
  max: number;
  cur: number;
  regenRest: number;  // per second while sitting
  regenAct: number;   // per second otherwise
  decimal: number;    // fractional carry between ticks
}

// One pool from its two characteristics: max from the first, regen from the second.
function newPool(c: number, regenC: number): PoolState {
  const cc = Math.min(c, CHAR_MAX);
  const rc = Math.min(regenC, CHAR_MAX);
  const max = (cc + BASE_VALUE) * POOL_FACTOR;
  const repos = rc / REGEN_DIVISOR + REGEN_OFFSET;
  const act = rc / REGEN_DIVISOR / REGEN_ACTION_DIV + REGEN_OFFSET;
  return { max, cur: max, regenRest: repos, regenAct: act, decimal: 0 };
}

// Regen tick. cycles = game cycles since the last update; one cycle is 0.1 s (tick_event_handler.cpp:41).
function regenTick(p: PoolState, sitting: boolean, cycles: number): void {
  if (p.cur >= p.max) return;
  const rate = sitting ? p.regenRest : p.regenAct;
  p.decimal += rate * cycles / 10;
  const whole = Math.trunc(p.decimal);
  p.cur = Math.min(p.max, Math.max(0, p.cur + whole));
  p.decimal -= whole;
}

// Speed malus from carried weight: one point per whole kg over the cap, never positive, floor -100.
// The donor's floor correction also runs on positive remainders (see the note, section 6); this version does not.
function weightSpeedMalus(carriedG: number, strength: number): number {
  const diffG = BASE_CARRY_G + 1000 * strength - carriedG;
  return Math.max(-100, Math.min(0, Math.floor(diffG / 1000)));
}

// Phrase stamina cost: fixed part plus a per-kg weapon part; players scale by equipment wear.
function phraseStaminaCost(staConst: number, staPerKg: number, weaponG: number, isPlayer: boolean, wearMalus: number): number {
  let cost = staConst + Math.trunc(staPerKg * weaponG / 1000);
  if (isPlayer) cost = Math.trunc(cost * (1 + 0.5 * wearMalus));
  return cost;
}

// Gate and spend merged for the sketch (the donor checks in validate() and spends in launch()).
// Only players are refused; everyone is charged, and the spend is skipped at exactly 0.
function trySpendStamina(p: PoolState, cost: number, isPlayer: boolean): boolean {
  if (isPlayer && p.cur < cost) return false;
  if (p.cur !== 0) p.cur = Math.max(0, p.cur - cost);
  return true;
}

// Drain on a hit that does not kill. A lethal hit drains nothing. Chest hits add a share of the damage,
// but only when the hit is critical (donor: applyLocalisationSpecialEffect returns early otherwise).
function hitStaminaDrain(p: PoolState, damage: number, dynFactor: number, chest: boolean, critical: boolean, killed: boolean): number {
  if (killed) return 0;
  let lost = Math.trunc(damage * dynFactor); // weapon-linked factor; 0 when the weapon has none
  if (chest && critical) lost += Math.trunc(damage * CHEST_STA_FACTOR);
  p.cur = Math.max(0, p.cur - lost);
  return lost;
}

// Respawn at a point leaves 10% of each pool; revive() refills them.
// Donor uses Base (before modifiers); this sketch has no modifiers, so max equals Base.
function respawnPools(pools: Record<Pool, PoolState>, full: boolean): void {
  for (const k of Object.keys(pools) as Pool[]) {
    const p = pools[k];
    p.cur = full ? p.max : Math.trunc(p.max / 10);
  }
}

// Eight characteristics feed four pools: hp (con, meta), sap (int, wis), stamina (str, wb), focus (dex, will).
function makeAllPools(ch: Record<'con' | 'meta' | 'int' | 'wis' | 'str' | 'wb' | 'dex' | 'will', number>): Record<Pool, PoolState> {
  return {
    hp: newPool(ch.con, ch.meta),
    sap: newPool(ch.int, ch.wis),
    stamina: newPool(ch.str, ch.wb),
    focus: newPool(ch.dex, ch.will),
  };
}
```

Typecheck: `tsc --noEmit --strict --target es2020` run on the VPS (`/tmp/SK010-ryzom-pools.ts`, the block plus `export {};`): exit 0.

Worked check (for the acceptance line): a critical chest hit of 40 damage with a weapon factor of 0.2 removes trunc(40 x 0.2) + trunc(40 x 0.5) = 8 + 20 = 28 stamina; a non-critical chest hit removes 8.

## 5. Lands in

TARGET `src/fight/pools.ts` (new module: characteristic-to-pool, regen tick, weight malus, phrase cost, hit drain, respawn fill). It is the one place stamina and the other pools change, so the duel step can call it and the ledger is written once. Parity-checklist row 21 (catalogue fields): the characteristic, pool and cost numbers become catalogue fields with a data source, not constants in the function.

## 6. Gaps and risks

- Licence AGPL-3.0: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- Sabrina is out of the build: `server/src/CMakeLists.txt:49-50` comments the subtree out. Its stamina code is a stale copy; do not port it.
- Regen split is sit versus not-sit (2384-2390). There is no in-combat versus out-of-combat regen. If Frankendom wants a combat slowdown, it must be a new rule, not a copy.
- The gate is players only (4041-4046). Creatures are charged but never refused. Frankendom's rule is server-verified actions for every actor, so the gate must apply to every actor.
- Order matters: the donor drains only when the hit does not kill (3051-3053). Keep that order and test it. The localisation effect (chest drain) runs before the weapon drain inside the same block (3059, 3063-3066).
- Defect, weight malus rounding: `if ( weightDiff % 1000 )` then `weightMalus--` (20709-20710) runs on positive remainders too. A character under the cap by 1 to 999 g gets -1% speed (for example 99,500 g with strength 0: diff 500, quotient 0, remainder nonzero, malus -1). Keep the idea (1% per kg over), fix the defect: floor the quotient and clamp at 0 (the sketch does this). Decision stays adapt.
- Defect, unused argument: `testOpponentDefense` takes `deltaLevel` (3440) and the caller passes `deltaLevel+(sint16)fightSkillBonus` (2526), but a grep of the body (3440-3650) finds no use of `deltaLevel`. The melee or range success bonus from consumables does not reach the dodge roll. Frankendom must test that a bonus changes the roll.
- Defect, coma timer units: the variable is described as server ticks (egs_variables.cpp:59), but the death timer adds it to `CTickEventHandler::getGameTime()` (1796). `getGameTime` advances by 0.1 per tick (tick_event_handler.cpp:165). The unit is therefore not settled from this donor; the numbers 3000 and 0.2 / 0.1 divisors need one unit before use. Fix: store the coma window in seconds in the zone data.
- Unresolved type: `TGameTime` is a NeL typedef, not in this donor (not read). If it is an integer type, the 0.1 step truncates to 0 and game time never moves. Check the NeL headers before reusing the timing.
- Skill XP on the plain path is reset to 0 at a point (7368), which discards any excess XP. The branch mode computes a remainder (not line-cited). Frankendom should keep the excess.
- Stamina values per phrase, per weapon and per item are sheet data that this donor does not include. Frankendom must author them as zone or item data.
- Death penalty, catalysers and the XP curve are not read in full (the XP stage table is data, not in the donor).

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine: pools, costs and drains live in the engine, not in the client); the parity row is 21, and the stat table above is the catalogue input (SK-FOCUS items 1, 2, 5 and 6).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG
Errors: MAIN CLAIM FALSE: hit-location effects including the chest stamina drain only fire on CRITICAL hits. applyLocalisationSpecialEffect (combat_phrase.cpp 4194-4199) begins 'for the moment, only apply such effects on critical success: if (!_CriticalHit) return;'. The note (section 1(e)/(f), table rows 'chest stamina drain', 'head stun', 'arm slow', 'leg slow', 'hand debuff', 'feet debuff', Best idea 'hit drain the target pays') states them as applying on every non-lethal hit. ACCEPTANCE WOULD FAIL A CORRECT BUILD: 'a chest hit of 40 damage with factor 0.2 removes 28 stamina' is only true for a critical chest hit; on a normal hit the donor removes trunc(40*0.2)=8. The worked check and the TS hitStaminaDrain(chest=true) have no crit parameter. Also: (2) weight malus prose 'whole kg over the cap, rounded down' is wrong: getWeightMalus 20704-20713 does weightDiff/1000 (trunc toward 0) then decrements on any nonzero remainder, so overweight rounds AWAY from zero (-1500 g gives -2, -500 g gives -1); the sketch's floor() reproduces the overweight case but the description is misleading. Defect itself (positive remainder gives -1) is real. (3) respawnPools in the sketch uses p.max/10 but donor 1951-1954 uses Base/10 (Base, not Max incl. modifiers). Verified correct: computeMaxValue score switch 2321-2345 incl. offset added after (2344-2345), repos=c/16+1.6, action=(c/16)/2+1.6 (RegenDivisor 16, RegenReposFactor 2, RegenOffset 1.6 float vars at egs_variables 299-301), sit switch 2384-2390, decimal carry /10 at 2431-2434, clip 2441-2445, coma branch 1817-1823, second loop 1837-1862, CommaDelayBeforeDeath 3000 'server tick', respawn Base/10 and revive Base (1951-1954, 1994-1997), checkPhraseCost players-only gate 4041-4046, spend skip at Current==0 1755-1761, total cost with wear malus 1278-1292, lethal-hit no drain 3051-3053, drain 3063-3066, constants at egs_variables 312-321, AGPL.
Missed: Missed the critical-hit gate at combat_phrase.cpp:4199 (the single most important rule for the hit-location table). Also the hit-location effects need an effect system (stun, slow) not just pool arithmetic.

Fixed 2026-10-12 (Sonnet fixer): main claim corrected (verified combat_phrase.cpp 4198-4199: all hit-location effects including the chest drain fire on critical hits only); acceptance rewritten (normal chest hit removes 8, critical removes 28); sketch hitStaminaDrain gains a critical argument and typechecked; weight-malus prose corrected (rounds away from zero, verified 20707-20712); respawn uses Base noted (1951-1954). Also found: hit-location effects need a stun and debuff system.
