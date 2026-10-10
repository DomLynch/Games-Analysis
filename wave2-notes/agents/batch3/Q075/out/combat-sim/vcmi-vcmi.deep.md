# vcmi-vcmi (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/scripts/damage/damageCalculator.lua` (entry point `Script:calculate`, C++ dispatch in `lib/battle/CBattleInfoCallback.cpp` 1113-1141, roll in `lib/battle/BattleInfo.cpp` 633-649) | Licence: GNU GPL v2.0 or later, as stated in the C++ file headers (e.g. `lib/battle/CBattleInfoCallback.cpp` lines 6-7); `license.txt` is the GPL v2 text; the Lua file itself has no licence header | Lua with C++ host | symbol `Script:calculate`

Checked: `Script:calculate` is at lines 395-432 (verified, read in full; I read the whole 454-line Lua file). The C++ entry `CBattleInfoCallback::calculateDmgRange` (1113-1141) and the roll `BattleInfo::getActualDamage` (633-649) were read in full. Callers read: `server/battles/BattleActionProcessor.cpp` 1435-1462 (the attack), `server/battles/BattleFlowProcessor.cpp` 907 (tower value), and `lib/battle/CBattleInfoCallback.cpp` 1236-1290 (multi-target estimate, battle estimate, retaliation estimate). Not read: `CStack::prepareAttacked` (the real casualty count, called at BattleActionProcessor 1447), the Lua patch loader, the unit getters (`getAttack`, `getMinDamage`, `getFirstHPleft`), and `test/server/battles/DamageCalculatorTest.cpp` beyond its header comment. Confidence: high on the order of operations and the formula; medium on the exact casualty count, which the donor takes from code I did not read. camera_scope: not applicable (combat cell).

## 1. Mechanism

- One pipeline turns an attack into a damage range and a kill range. It is a list of named factors, each returning a number. The engine sums the positive ones and multiplies the negative ones together. The base range is then multiplied by that combined factor. The result is a min and a max, not a single number.
- Order of steps (as the code runs):
  (a) C++ fills a payload with attacker, defender, hexes, the strike flags (lucky, unlucky, death blow, double damage, charge distance, shooting) and four tuning numbers read from `config/gameConfig.json` (1122-1141). It calls the Lua `calculate` (C++ at `luascript/LuaDamageCalculatorScript.cpp` 89-105). Only the bonus types the script declared are copied to each side (95-96; `carriedBonuses` 68-87).
  (b) Base: the per-creature min and max, with bless/curse collapsing or shifting the range (`getBaseDamageBlessCurse` 149-170), then both ends multiplied by the stack count (`getBaseDamage` 173-178).
  (c) Factors run in list order (401-413). A factor above 0 adds to `raising`, which starts at 1.0. A factor below 0 multiplies `lowering`, which starts at 1.0, by `1 + max(-1, factor)`, so no single factor can remove more than everything. A factor of exactly 0 does nothing.
  (d) `mult = raising * lowering`. Each end is `floor(base * mult)`, never below 1, and never above the cap (`math.huge` by default) (417-422).
  (e) Kills: `getCasualties` takes the front creature's health left and the full creature health. A hit below the front creature's health kills none. Otherwise kills = 1 + floor((damage - front) / creature health), capped at the stack count (381-393). Both ends are answered from the same rule.
  (f) Returns `damage`, `kills` and `damageBeforeDefense`. The last one is the same product with the negative factors left out (426-431).
- The factor list (445-452) is: attack vs defence, offence/archery, bless, luck, jousting, death blow, double damage, hate, armorer, magic shield, range penalty, wall penalty, blind/paralysis, unlucky, forgetfulness, petrification. Only some of these shape the formula; the rest are Heroes-specific (frenzy, slayer, jousting, hate, petrification, shields).
- Attack vs defence (243-255): advantage = attack - defence. A positive advantage gives `min(0.05 * advantage, 3.0)` (surplus raises). A negative one gives `-min(0.025 * shortfall, 0.7)` (shortfall lowers). The per-point rates and caps come from `config/gameConfig.json` 616-622.
- Attack and defence used in that comparison: attack = base attack + frenzy + slayer (225-229); defence = 0 if the defender is frenzied (233), else base defence minus the attacker's `ENEMY_DEFENCE_REDUCTION` share (231-237, 183-189).
- The roll is separate and happens on the server. `BattleActionProcessor.cpp` 1444 gets the range from `calculateDmgRange`. 1446 calls `getActualDamage(range.damage, count, game RNG)`. In `BattleInfo.cpp` 633-649: if min equals max, return min with no draw (635, 647-648). Otherwise draw `min(10, attacker count)` times uniformly from the whole damage range (639-642), and return the integer average (644).
- After the roll, `target.damageBeforeDefense` is the roll scaled by `damageBeforeDefense.max / damage.max` (BattleActionProcessor 1458-1460). The comment says reflected strikes use this rather than a second roll (1456-1457).
- Tick: not a loop. It runs once per attack resolution, synchronously on the server. The estimate calls (`calculateDmgRange` at 1244, 1259, 1284) call the same function but never reach `getActualDamage` (the only caller of that is BattleActionProcessor 1446).

## 2. Key functions

- `Script:calculate`: `/mnt/frankendom-donors/vcmi-vcmi/scripts/damage/damageCalculator.lua` 395-432. The whole pipeline: factor sum and product, range, kills, damage-before-defence.
- `Script:getBaseDamage` and bless/curse: `/mnt/frankendom-donors/vcmi-vcmi/scripts/damage/damageCalculator.lua` 149-178 (stack-count multiply after bless/curse).
- `Script:getAttackDefenseFactor`: `/mnt/frankendom-donors/vcmi-vcmi/scripts/damage/damageCalculator.lua` 243-255 (two-sided, two caps).
- `Script:getCasualties`: `/mnt/frankendom-donors/vcmi-vcmi/scripts/damage/damageCalculator.lua` 381-393 (kills from the damage range).
- `CBattleInfoCallback::calculateDmgRange`: `/mnt/frankendom-donors/vcmi-vcmi/lib/battle/CBattleInfoCallback.cpp` 1113-1141 (payload build, four settings, call into the script).
- `BattleInfo::getActualDamage`: `/mnt/frankendom-donors/vcmi-vcmi/lib/battle/BattleInfo.cpp` 633-649 (the one roll per hit, averaged over up to 10 draws).
- Server caller: `/mnt/frankendom-donors/vcmi-vcmi/server/battles/BattleActionProcessor.cpp` 1444-1460 (range, server roll, damage-before-defence scaling).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Positive modifiers add into one number; negative ones multiply into another; each negative is clamped to at most -100% | Start values 1.0 (`raising`, `lowering`), clamp -1.0 (Lua 401-411) |
| Two-sided advantage: surplus raises with its own per-point rate and cap, shortfall lowers with a separate rate and cap | Per point 0.05 up, cap 3.0 up; per point 0.025 down, cap 0.7 down (theirs: `config/gameConfig.json` 616-622) |
| Flat modifiers for a lucky strike, an unlucky one, a death blow, a range or wall penalty | +1.0 luck (Lua 269), -0.5 unlucky (343), +1.0 death blow (281), -0.5 range (320, 325), -0.5 wall (332) |
| Stack multiplies the per-creature range by its count | Count multiply (Lua 177) |
| Floor of 1 damage per end | 1 (Lua 418) |
| No cap by default | `math.huge` (Lua 376) |
| Kills from the damage range: none below the front creature's health, then one per full creature health, capped at the count | Derived (Lua 387-389) |
| Roll: average of min(10, count) uniform draws, integer division | Sample cap 10 (BattleInfo.cpp 639); no draw when min equals max (635) |
| Reflected damage uses the same roll scaled back, not a second roll | Scaling by the ratio of max values (BattleActionProcessor 1458-1459) |

## 4. TypeScript sketch

simplified: the sketch keeps the factor sum and product, the two-sided advantage, the stack multiply, the floor of 1, the kill estimate and the roll average. It omits: the bonus lookup (the donor reads per-side bonus types), frenzy, slayer, jousting, hate, the armorer and shield factors, petrification, forgetfulness, double damage, the blind/paralysis factor, the bless/curse collapse, the distance and wall checks (the caller passes `rangePenalty` as one boolean), the donor's cap hook, the `damageBeforeDefense` output and the casualty count that the server takes from `CStack::prepareAttacked`. It does not reorder the donor's steps: it sums the positive factors, multiplies the negative ones, then applies the result to both ends. Within each pass the order of factors does not change the result, because both sum and product are commutative.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack {
  count: number;          // creatures in the stack
  minPerUnit: number;     // base damage range of one creature
  maxPerUnit: number;
  attack: number;
  defense: number;
  firstHpLeft: number;    // health left on the front creature
  maxHp: number;          // health of one creature
}

interface Strike {
  attacker: Stack;
  defender: Stack;
  shooting: boolean;
  luckyStrike: boolean;
  unluckyStrike: boolean;
  deathBlow: boolean;
  rangePenalty: boolean;  // caller decides: distance penalty for a shot, or a shooter in melee
  attackPerPoint: number; // 0.05 in the donor config
  attackCap: number;      // 3.0
  defensePerPoint: number;// 0.025
  defenseCap: number;     // 0.7
}

// Surplus attack raises damage up to a cap, a shortfall of attack lowers it up to a cap.
function attackDefenseFactor(s: Strike): number {
  const advantage = s.attacker.attack - s.defender.defense;
  if (advantage > 0) return Math.min(s.attackPerPoint * advantage, s.attackCap);
  if (advantage < 0) return -Math.min(s.defensePerPoint * -advantage, s.defenseCap);
  return 0;
}

// Positive factors add into one number, negative factors multiply into another.
// Each negative factor may take at most everything (its multiplier is never below 0).
function estimate(s: Strike): { damage: [number, number]; kills: [number, number] } {
  const baseMin = s.attacker.minPerUnit * s.attacker.count;
  const baseMax = s.attacker.maxPerUnit * s.attacker.count;

  const factors: number[] = [
    attackDefenseFactor(s),
    s.luckyStrike ? 1.0 : 0,
    s.unluckyStrike ? -0.5 : 0,
    s.deathBlow ? 1.0 : 0,
    s.rangePenalty ? -0.5 : 0,
  ];

  let raising = 1.0;
  let lowering = 1.0;
  for (const f of factors) {
    if (f > 0) raising += f;
    else if (f < 0) lowering *= 1 + Math.max(-1.0, f);
  }

  const mult = raising * lowering;
  const apply = (base: number): number => Math.max(1, Math.floor(base * mult));
  const dmgMin = apply(baseMin);
  const dmgMax = apply(baseMax);

  const killedBy = (dmg: number): number => {
    if (dmg < s.defender.firstHpLeft) return 0;
    return Math.min(1 + Math.floor((dmg - s.defender.firstHpLeft) / s.defender.maxHp), s.defender.count);
  };

  return { damage: [dmgMin, dmgMax], kills: [killedBy(dmgMin), killedBy(dmgMax)] };
}

// Server side: one hit is an average of min(10, attacker count) draws over the whole damage range.
// A fixed range (min == max) draws nothing and returns the minimum.
function rollDamage(range: [number, number], attackerCount: number, draw: (lo: number, hi: number) => number): number {
  const [lo, hi] = range;
  if (lo === hi) return lo;
  const n = Math.min(10, attackerCount);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += draw(lo, hi);
  return Math.trunc(sum / n);
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step, with the server roll alongside it). One factor stack per hit, one server roll, one range that the client estimate and the server attack both read. Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape only)
- Brief rule served: 1 (one combat core, two clients: the estimate and the attack call the same function, as the donor does at CBattleInfoCallback.cpp 1244, 1259 and BattleActionProcessor.cpp 1444); the server rolls the hit (BattleActionProcessor.cpp 1446), which is the donor's form of server-verified damage

## 6. Gaps and risks

- Licence: GPL-2.0-or-later, so clean-room only. The sketch is written from the mechanism. The Lua file has no header of its own; the licence statement comes from the C++ headers and `license.txt`.
- The attack-vs-defence factor needs attack and defence numbers that the Frankendom duel does not have. Its rulings are guard, parry and stamina (parity rows 1 and 3). Until someone defines a mapping from duel stats to a per-point advantage, the factor has no input. This is the largest gap.
- The donor keeps the tuning numbers as engine settings (`config/gameConfig.json` 616-622) and the flat factors as literals in the Lua. Frankendom should keep them as engine constants, not zone data, unless a zone overrides one. Zones as data is about content; these are rules.
- The donor's factor list is a plugin point: a mod adds factors at runtime with `addDamageFactor` (Lua 38-50). Frankendom has one engine and no runtime script hook for damage. The shape should be one fixed list in TypeScript.
- Averaging draws (roll) is a stack behaviour: it smooths the damage of a stack that attacks as a unit. The Frankendom ruling caps simultaneous attackers at MAX_ATTACKERS = 3. If the averaging is ported, the sample count must be bounded by the attacker count, not by 10, and a one-attacker duel rolls once. Do not average a three-attacker hit silently; decide and test it.
- Server-verified kills: the donor computes kills from the range in the script (Lua 381-393) and then sets the actual casualties in `CStack::prepareAttacked` (BattleActionProcessor 1447, body not read). Frankendom should treat the range-based kill count as a client hint only, and the server's result as the one kill count.
- One ledger: the reflected-damage rule (BattleActionProcessor 1456-1460) rescales the one roll instead of rolling again. That matches the one-ledger ruling, and the sketch does not include it.
- The donor has no per-hit damage cap by default (Lua 376). If Frankendom wants a cap, it is a data field, not a constant in the function.
- Pit as client: the Pit can show the estimate range from the same function, but must not roll it.
- Rounding: the donor floors each end and never goes below 1; the roll divides as integers. The sketch follows that. If the client estimate and the server roll use different rounding, the range the player sees can differ from the server's hit, so both sides must share one function.

Best transferable idea: Combine every hit modifier as one stack, where positive factors add into one number and negative factors multiply into another with each clamped at -100%, and the server rolls the resulting damage range once.
Decision (proposed): adapt — the factor-stack shape fits a fast duel and server-verified kills, but the donor's attack-vs-defence input has no counterpart in the Frankendom duel stats yet, and its stack averaging does not match MAX_ATTACKERS = 3 without a rule, so take the shape, not the Heroes model.
Acceptance: Server unit test: base 10-20 with +10 advantage at 0.05 per point (+0.5), a lucky strike (+1.0) and a -0.5 range penalty gives exactly 12-25, and the hit the player sees is one integer drawn on the server from that range, with the client showing the same range.
