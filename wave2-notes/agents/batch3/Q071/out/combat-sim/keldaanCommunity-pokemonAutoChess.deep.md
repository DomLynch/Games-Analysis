# keldaanCommunity-pokemonAutoChess (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; source file headers not read) | TypeScript | symbol `PokemonState.attack` and `PokemonState.handleDamage`

Checked: `attack()` (pokemon-state.ts 32-265) and `handleDamage()` (388-786) read end to end; the `handleDamage` wrapper and `handleSpecialDamage` (pokemon-entity.ts 336-345 and 348-460) read; `app/config/game/battle.ts` (the hint file) read in full and holds only constants, not the logic. Calls read: the hit calls made by `attack()` (pokemon-state.ts 204, 217, 231) and the `handleDamage` call sites at pokemon-entity.ts 388, 436, 457, 1132. Not read: the other callers of `handleDamage` (items, synergies, abilities), `triggerDeath`, `onAttack`, `onHit`, `onDamageReceived`, the item and synergy bodies behind the call sites. Confidence: high on the order of steps in `attack()` and `handleDamage()`; medium on the complete set of multipliers, because the effect and item hooks are (not read). camera_scope: not applicable.

Best transferable idea: Resolve each hit once in a fixed order (alive gate, protect gate, defence as a divisor 1/(1+k*def), flat blocks, floor of 1, shield first with overflow into HP), and split a crit into a true part that ignores the defender's crit reduction.
Decision (proposed): adapt — take the hit order and the defence divisor as data, but drop the cover-band redirect and the reflect/retaliation recursion from the damage step; one ledger and server-verified kills need each hit resolved exactly once, and a redirect into another fighter is hard to audit with MAX_ATTACKERS = 3.
Acceptance: a server test asserts that a 30-point physical hit against def 20 with no shield removes exactly 15 HP, a 1-point hit against def 100 removes 1 HP, and a hit on a protected fighter removes 0 HP and spends no shield.

## 1. Mechanism

- One basic attack goes through `attack()` (pokemon-state.ts 32-265). It is called per attack by the attacker's cadence (the caller is (not read)). Order of steps:
  (a) Crit roll: `chance(critChance, pokemon)` (line 62), where `critChance` is the attacker's critChance / 100 (line 48). A fairy with LONG_WAND at range above 1 adds 0.01 per tile of distance first (lines 49-60, read). `chance()` is luck-skewed: it returns `Math.random() <` the probability raised to (1 - luck/100), capped at 1 (utils/random.ts 3-11).
  (b) If crit, the defender's crit reduction factor starts at 1.0. ROCKY_HELMET sets it to 0 (line 70). Otherwise the first matching defensive effect takes off 0.3 (BATTLE_ARMOR, line 74), 0.5 (MOUTAIN_RESISTANCE, line 76) or 0.7 (DIAMOND_STORM, line 78). Each BLACK_AUGURITE on the defender's player takes off 0.1 more (line 80). The factor is floored at 0 (line 81).
  (c) Dodge: `chance(dodgeChance, target, 0.9)` (line 104). Dodge value is capped at 0.9 (pokemon-entity.ts line 619). Blind adds 0.5 to dodge. XRAY_VISION, LOCK_ON, or a target that is paralysed, asleep, frozen or locked skips the dodge. A dodged attack zeroes damage. A protected or skydiving target also zeroes the attack (read, not receipted).
  (d) True part: a fraction set by effects and items. Read: STEEL_SURGE 0.33 (line 146), STEEL_SPIKE 0.66 (line 148), CORKSCREW_CRASH 1.0 (line 150), MAX_MELTDOWN 1.25 (line 152), RED_ORB adds 0.25 (line 155). `trueDamage = damage * trueDamagePart * (crit ? critPower : 1)` (line 168). The physical part becomes `min(0)(damage * (1 - trueDamagePart))` (line 169), so it cannot go below 0.
  (e) Crit reduction applies to the remaining part AFTER the true split: `damage *= 1 + (critPower - 1) * critReductionFactor` (line 174).
  (f) Extras: STONE_EDGE adds def times a stars multiplier (plus ap/100) to the physical part. PUNCHING_GLOVE adds 0.08 times the target's max HP to the physical part (read, not receipted). All three parts are rounded.
  (g) Dispatch: physical goes to `target.handleDamage` as PHYSICAL (line 204); special goes to `target.handleSpecialDamage(..., crit=false, apBoost=false)` (line 217); true goes to `target.handleDamage` as TRUE (line 231). `onAttack` always runs for a live target; `onHit` runs only if the attack was not dodged or protected.
- `handleDamage()` (pokemon-state.ts 388-786) is the single hit resolver. Order of steps:
  1. Guards: NaN damage returns nothing; a target at hp <= 0 or resurrecting returns nothing (read, before line 423).
  2. Enraged attacker: damage x2 (lines 423-424).
  3. Protect or skydiving (line 427): the hit does nothing. No armour, no shield, no mana.
  4. Otherwise, field and weather multipliers of x1.2 or x1.3 are applied (read, lines 430-470, not receipted).
  5. Defence: def and speDef are halved (rounded) when `armorReduction` is set (lines 477-478). WONDER_ROOM swaps them.
  6. Reflect (physical only): a fraction of the hit goes back to the attacker and this hit returns zero (read; reflect factor by stars at line 499; not receipted).
  7. Armour divisor: physical `reducedDamage = damage / (1 + 0.05 * def)` (line 529); special uses speDef (line 531); TRUE skips it (line 533).
  8. Non-TRUE only: POKE_DOLL x0.7 (lines 538-539). Then one flat block from the first present effect: COACHING 12, DEFIANT 9, STURDY 6, GUTS 3 (lines 546-554; the ternary picks one, it does not sum). WONDER_GUARD subtracts 20 (lines 559-560).
  9. Floor: `reducedDamage = min(1)(Math.ceil(reducedDamage))` (line 565). This applies to every type, including TRUE.
  10. Shield (line 588): with flinch, half of the hit goes to the shield and half to residual HP (lines 590-591). Without flinch, the whole hit goes to the shield (line 594). If the attacker holds PROTECTIVE_PADS and is not the target itself, shield damage doubles (line 602). If shield damage reaches the shield, the overflow is added to residual (line 605). Shield is reduced by the shield damage (line 614).
  11. HP: `takenDamage += Math.min(residualDamage, pokemon.hp)` (line 617). Cover band (lines 671-683): if the residual would kill, and an adjacent same-team ally with COVER_BAND is alive, the ally receives `incomingDamage` (the unreduced hit) through its own `handleDamage` (line 683). SHINY_CHARM and the FOSSIL synergy can cancel or refill HP (read, not sketched).
  12. `pokemon.hp = Math.max(0, pokemon.hp - residualDamage)` (line 694). Mana: `addPP(Math.ceil(residualDamage / 10))` (line 699). Shield damage gives no mana.
  13. Death: at hp <= 0 (line 761), a resurrection branch runs first; otherwise `death = true` (line 775) and `triggerDeath` runs (line 780). `takenDamage` is rounded and returned (lines 784-785).
- Special path: `handleSpecialDamage` (pokemon-entity.ts 348) applies ap scaling, DOUBLE_DAMAGE, STRANGE_STEAM x1.2, and for a crit (only when `crit` is passed as true, which `attack()` does not do) a reduction from ROCKY_HELMET and BLACK_AUGURITE (lines 413-433). Then it calls `handleDamage`. A POWER_LENS reflects the blocked part back at the attacker (line 455).

## 2. Key functions

- `attack()`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` 32-265. Crit roll, dodge, true split, crit reduction, dispatch.
- `handleDamage()`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` 388-786. Armour divisor, flat blocks, floor of 1, shield, HP, mana, death.
- `handleSpecialDamage()`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-entity.ts` 348 onward. Special path with the crit reduction at 413-433 and the power-lens reflect at 455.
- `handleDamage` wrapper: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-entity.ts` 336-345.
- Constants: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/battle.ts` lines 5 (ARMOR_FACTOR), 8 (DEFAULT_CRIT_CHANCE), 9 (DEFAULT_CRIT_POWER).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Defence divides the hit: `dmg / (1 + k * def)`, separate defence for physical and special | k = 0.05 (theirs, battle.ts 5; pokemon-state.ts 529, 531) |
| Defence debuff halves the stat, rounded | Halved and rounded (theirs, pokemon-state.ts 477-478) |
| Crit: base chance 10 percent, power x2 | Base chance 10 (theirs, battle.ts 8), power 2 (theirs, battle.ts 9) |
| Crit reduction stack, floored at 0 | 0.3 / 0.5 / 0.7 per named effect and 0.1 per item (theirs, pokemon-state.ts 74-81); ROCKY_HELMET sets 0 (line 70) |
| Part of the hit ignores the crit reduction (true split first) | True fractions 0.33 / 0.66 / 1.0 / 1.25 (theirs, pokemon-state.ts 146-152) |
| Flat block, one value from the first present effect | 12 / 9 / 6 / 3 (theirs, pokemon-state.ts 548-554); WONDER_GUARD 20 (line 560) |
| Floor of 1 damage after reduction | min 1 (theirs, pokemon-state.ts 565) |
| Shield first, half-share when flinched, overflow into HP | Flinch half share (line 591); attacker PROTECTIVE_PADS doubles shield damage (line 602) |
| Mana from HP damage only | ceil(residual / 10) (theirs, pokemon-state.ts 699) |
| Death at hp <= 0 | Threshold 0 (line 761) |

## 4. TypeScript sketch

simplified: keeps the donor order that matters for the design: the alive and protect gates first (no armour or shield spent), the crit split before the crit reduction, the armour divisor, then the floor of 1, then the shield (with the flinch half-share and overflow), then HP, then mana from HP damage only. It omits the field and weather multipliers, enraged doubling, reflect and retaliation, the cover-band redirect, the POKE_DOLL and flat blocks (the caller passes one `flatBlock` number), the attacker PROTECTIVE_PADS doubling, the SHINY_CHARM and FOSSIL branches, the WONDER_ROOM swap, STONE_EDGE and PUNCHING_GLOVE extras, the dodge and blind rolls, the death handler, and the callbacks. The crit reduction factor and true fraction are supplied by the caller; the donor computes them from items and effects.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type AttackType = "physical" | "special" | "true";

interface Defender {
  hp: number;
  def: number;
  speDef: number;
  armorReduced: boolean;  // defence halved (rounded) by a status, as in the donor
  shield: number;
  flinched: boolean;
  protected: boolean;     // protect or skydiving: the hit does nothing
  flatBlock: number;      // summed flat reduction from named defensive effects, 0 if none
  mana: number;
}

const ARMOR_FACTOR = 0.05;

// Attacker side: split one basic attack. The true part takes full crit power and is split off
// before the defender's crit reduction, which only scales the remaining physical part.
function splitAttack(
  atk: number,
  trueFrac: number,
  crit: boolean,
  critPower: number,
  critFactor: number // 1 = no reduction, 0 = crit extra negated, floored at 0 by the caller
): { phys: number; trueDmg: number } {
  const trueDmg = atk * trueFrac * (crit ? critPower : 1);
  let phys = Math.max(0, atk * (1 - trueFrac));
  if (crit) phys *= 1 + (critPower - 1) * critFactor;
  return { phys: Math.round(phys), trueDmg: Math.round(trueDmg) };
}

// Defender side: one hit. Order: alive gate, protect gate, armour divisor, flat block,
// floor of 1, shield layer, overflow into HP, mana from HP damage only.
function applyHit(
  d: Defender,
  incoming: number,
  type: AttackType
): { taken: number; dead: boolean } {
  if (d.hp <= 0) return { taken: 0, dead: false };
  if (d.protected) return { taken: 0, dead: false };

  const def = d.armorReduced ? Math.round(d.def / 2) : d.def;
  const speDef = d.armorReduced ? Math.round(d.speDef / 2) : d.speDef;

  let reduced = incoming;
  if (type === "physical") reduced = incoming / (1 + ARMOR_FACTOR * def);
  else if (type === "special") reduced = incoming / (1 + ARMOR_FACTOR * speDef);
  if (type !== "true") reduced -= d.flatBlock;
  reduced = Math.max(1, Math.ceil(reduced));

  let residual = reduced;
  let taken = 0;
  if (d.shield > 0) {
    let onShield: number;
    if (d.flinched) {
      onShield = Math.ceil(reduced * 0.5);
      residual = Math.ceil(reduced * 0.5);
    } else {
      onShield = reduced;
      residual = 0;
    }
    if (onShield >= d.shield) {
      residual += onShield - d.shield;
      onShield = d.shield;
    }
    d.shield = Math.max(0, d.shield - onShield);
    taken += onShield;
  }

  taken += Math.min(residual, d.hp);
  d.hp = Math.max(0, d.hp - residual);
  d.mana += Math.ceil(residual / 10);
  return { taken: Math.round(taken), dead: d.hp <= 0 };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp copy) exited 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module: the one hit resolver for the duel, and the crit and true split on the attack side). Parity-checklist row 1 (duel step / sim). The fight-camera, HUD and sound are not involved.
- Frankendom's current file for this logic: (not read).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rule 7 (copyleft: clean-room, shape only)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated from the donor lines.
- The donor's scale (attack and defence in tens, percentages, 0.05 armour factor) is an auto-battler balance. Frankendom must pick its own scale; k = 0.05 and the flat-block values are data fields, not constants.
- Order matters for one ledger. The donor applies the protect gate first, so a protected target spends nothing, but applies the enraged doubling before it. Frankendom must pick one order and test it on the server.
- Cover band and reflect call `handleDamage` from inside a hit, so one hit creates a second hit. A single ledger and server-verified kills need each hit recorded on its own. Do not port this into the damage step; if needed later, it is a separate, logged event.
- Mana from HP damage has no Frankendom counterpart yet. If the duel gains a resource, the same ceil(residual / 10) curve can be a data field; it is not in the first pass.
- The floor of 1 means a fully armoured target still takes a point of damage. That is a feel choice for Frankendom to make on purpose; the sketch keeps it.
- Dodge is capped at 0.9 (pokemon-entity.ts 619), so the donor never allows a certain dodge. Frankendom's guard and parry (checklist row 3) are separate; this note does not cover them.
- Not read: `triggerDeath`, `onAttack`, `onHit`, `onDamageReceived`, the item and synergy bodies, and the attack cadence that calls `attack()`.
