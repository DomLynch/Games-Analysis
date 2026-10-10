# CleverRaven-Cataclysm-DDA (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character.cpp` (with `creature.cpp`, `character_inventory.cpp`, `suffer.cpp`, and `data/json/effects.json`) | Licence: CC-BY-SA 3.0 (`LICENSE.txt` line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License."; the same file notes unifont under OFL and GPL-2+ for the font only) | C++ | symbol `Character::weight_capacity`

Checked: read: `creature.cpp` 3310-3330 (`Creature::weight_capacity`, size switch); `character.cpp` 2856-2884 (`Character::weight_capacity`, `max_pickup_capacity`), 2255-2298 (`process_turn`: the `suffer` call and `recalc_speed_bonus`), 7687-7700 (`recalc_speed_bonus`: the weight term), 7992-8009 (glide check, inside `Character::can_fly`), 2188-2200 (head of `move_mode_switch_cost` only); `character_inventory.cpp` 1211-1218 (`weight_carried` and cache), 1235-1267 (`weight_carried_with_tweaks`); `suffer.cpp` 458-476 (`suffer::while_awake` weight block), 1700-1736 (`Character::suffer`, only the call to `while_awake`); `data/json/effects.json` 687-711 (`downed`, `overburdened`). Callers of `while_awake`: `Character::suffer` (read). Callers of `recalc_speed_bonus`: `process_turn` (read), `reset` (line 3130, call only). Callers of `Character::weight_capacity` read: `suffer.cpp` 461-467, `character.cpp` 7692, 8004 and the move-mode head; other callers not read. `invalidate_weight_carried_cache`: grep finds 30 matching lines (declaration, definition, call sites); call sites not read one by one. Not read: the enchantment modifier (`enchantment_cache->modify_value`), `get_str_base` and `get_str_bonus`, `best_nearby_lifting_assist()`, the outfit's `weight_carried_with_tweaks`, `get_selected_stack_weight`, the effect engine that applies `effects.json` limb mods, the rest of `move_mode_switch_cost`, and what `add_effect` does when the effect is already active (add or max). Confidence: high on capacity, tiers, speed formula, cache and lifting exclusion; medium on effect durations (see last sentence). Camera: not applicable. Receipts: 34, `verify_receipts.py` passed.

Best transferable idea: Derive a carry capacity from size and strength, judge the load against it in two tiers (over capacity, and over four times capacity), and take speed off linearly with the excess; the checks run each turn after the effects step.
Decision (proposed): adapt — the capacity formula and the tiers become data (size factors and per-strength carry as catalogue fields) computed on the server each tick; the speed penalty applies in the world only, because a second rule in the fight would break the one-engine ruling.
Acceptance: A player with a heavy load sees "Overburdened" in the bag panel once carried weight passes capacity, and sees a movement speed drop in the world; a server test asserts that the same load in a duel applies no movement penalty, and that capacity equals 13 kg times the size factor plus 4 kg per strength point.

## 1. Mechanism

- **Capacity (creature base, then character).** `Creature::weight_capacity` starts at 13 kg (3312). It is scaled by size: tiny divided by 4 (3315), small by 2 (3318), medium unchanged (the `default` label), large doubled (3324), huge quadrupled (3327). `Character::weight_capacity` (2856-2879) starts from that base (2860), adds (strength base plus strength bonus) times 4 kg (2864), applies the enchantment modifier (2866; modifier not read), and clamps at zero (2868-2870). If the character is mounted (2871), the capacity is replaced by (mech strength addition plus 10) times 4 kg (2876); if the addition is 0, the value is kept.
- **Carried weight.** `weight_carried` (1211-1218) returns a cached value; on a miss it runs `weight_carried_with_tweaks` (1216). That sums the worn items (1242) and the wielded weapon with its contents (1244-1257). The weapon is left out when the total would exceed capacity and the best nearby lifting assist can carry it: the condition at 1260-1261 includes it unless the total is over capacity and the assist's capacity is at least the weapon's weight, in which case `using_lifting_assist` is set (1265). A `new_game` bypass is also in that condition (1260).
- **Each turn (`Character::process_turn`, 2255).** The order is: (1) `suffer()` (called at 2296; not receipted, the line is too short), which when the character is awake calls `suffer::while_awake` (1736; body 458). Inside it: if carried weight is above 4 times capacity (`max_pickup_capacity`, 2881-2883), `downed` is added for 2 turns, or 1 turn if it is already active (461-465). Otherwise, if carried weight is above capacity, `overburdened` is added the same way (467-471). (2) `recalc_speed_bonus()` (2297; body 7687-7700): if carried weight is above capacity, the penalty is `25 * (carried - cap) / cap`, truncated to an int (7692-7697), applied as a negative speed bonus (7699).
- **Effect data.** `downed` (effects.json 687-699) has a balance limb-score modifier of 0.1 (696), with reaction and block at 0.5 (not receipted). `overburdened` (703-710) has no limb mods shown and disables flight (710).
- **Glide.** A character with two wing flags cannot glide if 100 times carried weight over capacity is above 50 (8004, inside `Character::can_fly`, 7992).
- Tick: the checks run once per `process_turn`, after the effects step. Nothing runs in a separate loop.

## 2. Key functions

- `Creature::weight_capacity`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/creature.cpp` 3310-3330. Base 13 kg, size factors.
- `Character::weight_capacity`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character.cpp` 2856-2879. Creature base, strength, enchantment, clamp, mount override. `max_pickup_capacity` at 2881-2884.
- `Character::weight_carried` and `weight_carried_with_tweaks`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_inventory.cpp` 1211-1267. Cache, worn sum, weapon with lifting-assist exclusion.
- `suffer::while_awake`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/suffer.cpp` 458-476. The two burden tiers.
- `Character::recalc_speed_bonus`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character.cpp` 7687-7700. The speed penalty.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Capacity = size base x size factor + per-point strength, clamped at zero | 13 kg base (creature.cpp 3312); size factors 1/4, 1/2, 1, 2, 4 (3315-3327); 4 kg per strength point (character.cpp 2864) |
| Two burden tiers: over capacity, and over four times capacity | 1x and 4x (suffer.cpp 461, 467; character.cpp 2883) |
| Speed penalty linear in excess over capacity | 25 x excess / capacity, truncated (character.cpp 7697) |
| Lifting assist carries the wielded weapon past the cap | Condition: total over capacity and assist at least the weapon's weight (character_inventory.cpp 1260-1261) |
| Glide lost above half capacity | 50 percent (character.cpp 8004) |
| Burden effect durations | 2 turns when new, 1 turn when already active (suffer.cpp 465, 471) |

## 4. TypeScript sketch

simplified: keeps the donor order: capacity (size base, strength, enchantment as plain kg, clamp, mount override); carried weight with the lifting exclusion; burden tiers; speed penalty; and burden checks before the speed penalty, as in `process_turn`. It omits: the enchantment modifier cache (plain additive kg here); the weight cache and its invalidation; the `new_game` exception and the `using_lifting_assist` flag; the effect durations and the effect data (limb mods, flight flag); the other speed penalties (pain, thirst, underweight); the glide rule; the move-mode switch cost. The 1 mg floor on the divisor is kept.

```ts
// Licence: CC-BY-SA 3.0 (donor, LICENSE.txt). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
type Size = "tiny" | "small" | "medium" | "large" | "huge";

const SIZE_FACTOR: Record<Size, number> = { tiny: 0.25, small: 0.5, medium: 1, large: 2, huge: 4 };
const BASE_KG = 13;          // base carry before size and strength
const KG_PER_STRENGTH = 4;   // each point of strength adds 4 kg

interface Body {
  size: Size;
  strength: number;          // base strength plus bonuses
  enchantCarryKg: number;    // additive stand-in for the donor's enchantment modifier
  mountedStrength: number;   // 0 when not mounted
}

// Carry capacity: size-scaled base, plus strength, plus enchantment, clamped at zero; a mount replaces it.
function weightCapacityKg(b: Body): number {
  let cap = Math.max(0, BASE_KG * SIZE_FACTOR[b.size] + KG_PER_STRENGTH * b.strength + b.enchantCarryKg);
  if (b.mountedStrength !== 0) cap = (b.mountedStrength + 10) * KG_PER_STRENGTH;
  return cap;
}

interface Load { wornKg: number; weaponKg: number; liftAssistKg: number; }

// Carried weight: worn items plus the wielded weapon. The weapon is left out when it would push the total
// past capacity and a nearby lifting assist can carry it.
function carriedKg(l: Load, cap: number): number {
  const total = l.wornKg + l.weaponKg;
  const assisted = total > cap && l.liftAssistKg >= l.weaponKg;
  return assisted ? l.wornKg : total;
}

type Burden = "ok" | "overburdened" | "downed";

// Over capacity: overburdened. Over four times capacity: downed. Both are re-applied on every awake turn.
function burden(carried: number, cap: number): Burden {
  if (carried > cap * 4) return "downed";
  if (carried > cap) return "overburdened";
  return "ok";
}

// Speed points lost: 25 times the excess over capacity, divided by capacity, truncated. Capacity below 1 mg counts as 1 mg.
function speedPenalty(carried: number, cap: number): number {
  const c = Math.max(cap, 1e-6);
  if (carried <= c) return 0;
  return Math.trunc((25 * (carried - c)) / c);
}

// One awake turn, in donor order: burden effects first, then the speed penalty.
function awakeTurn(b: Body, l: Load): { burden: Burden; speedPenalty: number } {
  const cap = weightCapacityKg(b);
  const carried = carriedKg(l, cap);
  return { burden: burden(carried, cap), speedPenalty: speedPenalty(carried, cap) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/IV002-CDDA-weight.ts`: exit 0.

## 5. Lands in

- TARGET `origins/inventory/weight.ts` (proposed new module: capacity, carried weight and burden tiers, run on the server tick; not checked against the current tree). The speed penalty is applied by the world step only, never by `src/fight/`.
- Parity-checklist row: **21** (catalogue fields). Plainly: no row covers carry weight or burden. Row 21 is the nearest because the 13 kg base, the size factors and the 4 kg per strength point are catalogue-style numbers. Row 6 (hero actor) is where a world speed would be read, but it is not the mechanism itself. The server tick sub-line for per-turn checks is row 18 / post-K item 3.
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0: clean-room, shape only)
- Brief rule served: zones as data (size and strength numbers as catalogue fields); server-verified state (capacity and tiers computed on the server each tick); one ledger (one weight total from worn items and the weapon)

## 6. Gaps and risks

- CC-BY-SA 3.0: clean-room, shape only. The donor's data files are under the same licence; do not copy effect strings or data values.
- A speed penalty in a duel would be a second rule in the fight. The decision keeps it in the world step only.
- `downed` at four times capacity sets limb-score multipliers through effect data. If Frankendom adopts a downed state, it must be a stance state in the duel step (not a timer), and that is not decided here.
- The weight cache matches 30 lines, so a stale cache is a real risk. Frankendom should recompute on the server each tick or on each change event, and test it.
- The lifting-assist exclusion depends on a nearby assist that Frankendom does not have. Reject that part.
- Capacity counts weight only. Volume and pocket limits (`can_pickVolume` and related) are a separate system that was not read, so this note does not cover bag volume.
- The per-turn checks cost one pass per character per tick. Frankendom's server tick must keep them inside the per-tick compute budget (row 18 sub-line).
- Integer truncation and the 1 mg floor are donor details; Frankendom should store grams or kilograms as explicit data fields.
