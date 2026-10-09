# gemrb-gemrb (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/CombatInfo.cpp` | Licence: GPL-2.0-or-later per SPDX tag in CombatInfo.cpp | C++ (Python GUI scripts) | symbol `ArmorClass / ToHitStats RefreshTotal`

Checked: At 87 (verified: `ArmorClass::RefreshTotal` 87-94; `ToHitStats::RefreshTotal` 207-213; `SetBonusInternal` 21-62; `GetTotalForAttackNum` 301-310; the whole file 15-325 was read). This file is stat bookkeeping. The hit roll itself is not in this file (see section 6).

## 1. Mechanism

- Two stat holders. `ArmorClass` keeps a natural base plus named slots (deflection, armour, shield, dexterity, wisdom, generic). `ToHitStats` keeps a base plus named slots (proficiency, armour, shield, ability, weapon, generic, FX).
- Each slot setter goes through `SetBonusInternal` (21-62). Its mode decides the arithmetic: 0 = cumulative add, 1 = flat set, 2 = percent of current. With the third-edition rules flag set (a file-level static set in the constructors from the `RULES_3ED` feature, 16, 72, 192), same-slot cumulative bonuses do not stack: if the new bonus and the current value have opposite signs they are summed, and the sum is kept only if it is greater than the current value; with the same sign the larger magnitude wins (33-48). The AC generic slot is passed as cumulative and always stacks (144-146).
- After each setter, `RefreshTotal` sums the slots (AC: natural plus deflection, armour, shield, dexterity, wisdom, generic at 87-94; to-hit: base plus proficiency, armour, shield, ability, weapon, generic, fx at 207-213) and writes the result into the owner's `Modified[IE_ARMORCLASS]` or `Modified[IE_TOHIT]`, so the owner's stat is always current. Setting the natural AC or the to-hit base also writes the owner's base stat (108-115, 228-235). `HandleFxBonus` (154-170, 278-294) adds a permanent effect to the base or natural value, and a temporary one to the generic or fx slot, with the sign flipped when the game uses reverse to-hit.
- `ToHitStats::GetTotalForAttackNum` (301-310) returns the to-hit for the Nth attack in a round: the total minus the base-attack decrement times (N - 1); attack 1 or none returns the total (set by `SetBABDecrement`, 296-299).
- Inputs: bonus value, mode, cumulative flag, owner. Outputs: integer totals on the owner. Tick: event-driven, whenever equipment or an effect changes, not per frame.

## 2. Key functions

- `SetBonusInternal`: `CombatInfo.cpp` 21-62. Mode arithmetic and third-edition stacking.
- `ArmorClass::RefreshTotal`: `CombatInfo.cpp` 87-94. AC total from slots, written to owner.
- `ToHitStats::RefreshTotal`: `CombatInfo.cpp` 207-213. To-hit total from slots, written to owner.
- `ToHitStats::GetTotalForAttackNum`: `CombatInfo.cpp` 301-310. Per-attack to-hit with base-attack decrement.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Named bonus slots summed into one total, written back on every change | Slot list: deflection, armour, shield, dexterity, wisdom, generic; and proficiency, ability, weapon, FX (theirs) |
| Three stacking modes: cumulative, flat, percent | Mode codes 0, 1, 2 (theirs) |
| Same-slot rule: opposite signs sum (kept only if greater), same sign larger magnitude wins (3rd-edition only) | Enabled by the `RULES_3ED` feature flag (theirs, 16, 72, 192) |
| Multiple attacks per round lose a fixed amount each | Base-attack decrement per attack (theirs, per class) |

## 4. TypeScript sketch

simplified: `stackSlot` is only the larger-magnitude half of the third-edition rule; the opposite-sign summing rule and the cumulative-generic exception are omitted. The sketch has no owner write-back, no base-stat setters and no permanent-versus-temporary effect handling.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Mode = 'cumulative' | 'flat' | 'percent';
interface Bonus { value: number; mode: Mode; }

// Apply one bonus to a running value; the mode decides the arithmetic.
function applyBonus(current: number, b: Bonus): number {
  if (b.mode === 'flat') return b.value;
  if (b.mode === 'percent') return Math.trunc((current * b.value) / 100);
  return current + b.value;
}

// Same-slot rule for the stricter ruleset: the larger magnitude wins instead of stacking.
function stackSlot(current: number, incoming: number): number {
  return Math.abs(incoming) > Math.abs(current) ? incoming : current;
}

// Total is the natural base plus every named slot.
function total(natural: number, slots: Record<string, number>): number {
  let t = natural;
  for (const k of Object.keys(slots)) t += slots[k];
  return t;
}

// The Nth attack in a round loses a fixed amount per extra attack.
function perAttackTotal(t: number, attackNumber: number, decrement: number): number {
  if (attackNumber <= 1) return t;
  return t - (attackNumber - 1) * decrement;
}
```

## 5. Lands in

- TARGET `src/gear-stats.ts` (gear stat aggregation, not moving in the checklist), parity-checklist row 21 (catalogue fields: gear tiers) with row 1 as the consumer. Equipment bonuses summed by named slot into one total is the same shape. Compare with what `gear-stats.ts` already does before adopting.
- TARGET `src/fight/stats.ts` (the engine's stats-by-level entry, `statsAt`) for where resolved totals are read (checked in worktree `frankendom-backend`, commit 46e670530).
- today: `src/gear-stats.ts` and `src/fight/stats.ts`.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only.
- This file is not the hit or AC roll. Only the aggregation shape is here. The roll and damage path are not in this file and must not be taken from memory.
- The stacking modes and the per-attack decrement are D&D-style. Frankendom's stats are stance, stamina and posture in `src/fight/duel.ts (today: src/duel.ts, moving)` (stance per-mille deltas, `src/fight/stance.ts (today: src/stance.ts, moving)`); this does not map unless the catalogue (checklist row 21) gets a slot model for gear.
- Any gear slot model must stay out of the record and the sim unless the record version changes (`src/fight/speeds.ts` notes the same rule for speeds).
