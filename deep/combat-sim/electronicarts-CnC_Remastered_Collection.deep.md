# electronicarts-CnC_Remastered_Collection (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/COMBAT.CPP` | Licence: GPL-3 | C++ | symbol `Modify_Damage`

Checked: Symbol `Modify_Damage` opens at 69 and closes at 126 (verified, read in full). Its caller `ObjectClass::Take_Damage` (OBJECT.CPP 1690-1760) was also read.

## 1. Mechanism

- One pure function turns a raw damage number into the damage a target takes. Inputs: raw damage (signed; negative means heal), the warhead type (the attack's damage family), the armour class of the target, and the distance from the impact point in the game's sub-tile units. Output: an integer damage value, clamped.
- Order of steps: (a) zero in, zero out; (b) inert or no-warhead attacks return zero; (c) a negative value (heal) returns its full value only when `distance < 8` and the armour and warhead types match, otherwise zero (83-93); (d) multiply by the warhead-vs-armour modifier from a table (98; the modifier is a fixed-point value). Step (c) has two forms: under the `FIXIT_CSII` macro the match is warhead not mechanical with no armour, or mechanical with armour; without the macro, any warhead with no armour. Where `FIXIT_CSII` is defined was not found by grep, so which form is live is not known; the sketch models the first.
- Distance fall-off (only if damage is still non-zero, 103-122): the distance is divided by `PIXEL_LEPTON_W/4` when the warhead has no spread factor, otherwise by `spread x (PIXEL_LEPTON_W/2)`, then bounded to 0-16. If that is non-zero, the damage is divided by it. If the bounded distance is under 4, the damage is raised to at least `Rule.MinDamage`. The total is then capped at `Rule.MaxDamage`.
- Early outs (71-77): zero damage returns zero; the inert special flag, or a no-warhead attack, returns zero.
- Runs once per hit. The one caller found is `ObjectClass::Take_Damage` (OBJECT.CPP 1707 in Red Alert, 1397 in Tiberian Dawn); it skips `Modify_Damage` for forced damage, applies a dog special case (full strength to the intended victim, zero to others), and for a negative result adds strength only for infantry (or units and aircraft under `FIXIT_CSII`) before returning no damage (1706-1740). Callers of `Take_Damage` were not read.
- Inputs and outputs are plain integers (the table factor is fixed-point); the function reads only the warhead table, the special-flags block and the rules block, so the same call gives the same answer on any machine.

## 2. Key functions

- `Modify_Damage`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/COMBAT.CPP` 69-126. The whole mechanism: warhead-armour table, distance fall-off, floor and cap.
- `Modify_Damage`, warhead modifier line (block inside it): `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/COMBAT.CPP` 96-98 (`damage * whead->Modifier[armor]`). The table itself lives in the warhead class (`WarheadTypeClass`), not read here.
- `Modify_Damage`, distance divisor (block inside it): `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/COMBAT.CPP` 101-122 (spread factor, bound 0-16, divide, minimum-damage floor below distance 4).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage = raw x (warhead vs armour factor) | Warhead x armour table (theirs, data) |
| Distance fall-off: divide by bounded distance, floor at a minimum for close hits | Distance bound 0-16 (theirs, 109); close band below 4 (theirs, 119); `Rule.MinDamage` default 1 (theirs, RULES.CPP 222, ini-overridable 485) |
| Cap at a maximum | `Rule.MaxDamage` default 1000 (theirs, RULES.CPP 223, ini-overridable 484) |
| Heal: full value only at close range with a type match, otherwise zero | Heal close distance 8 leptons (theirs, 85, 90) |
| Spread divisor per warhead, base divisor when none | `PIXEL_LEPTON_W` scaling (theirs, 105, 107) |

## 4. TypeScript sketch

simplified: omits the inert special flag and no-warhead early return, the fixed-point arithmetic (plain floats here, with floor), the non-FIXIT_CSII heal form, and the caller's forced-damage and dog cases. Order matches the donor: zero check, heal branch, table multiply, distance divide, floor, cap.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Warhead {
  // factor by armour class index (table lives in data, not in this function)
  modifier: number[];
  spread: number;          // 0 means use the base divisor
  mechanical: boolean;     // the repair warhead; pairs with armoured targets for heals
}

const ARMOUR_NONE = 0;     // index of the unarmoured class (theirs)

interface DamageRules { minDamage: number; maxDamage: number; }

// One hit: raw damage, warhead, armour class and distance in sub-tile units.
function modifyDamage(
  raw: number, wh: Warhead, armour: number, distance: number,
  rules: DamageRules, baseDivisor: number,
): number {
  if (raw === 0) return 0;
  if (raw < 0) {
    // heal: only at very close range, and only for a matching warhead and armour pair
    // (non-mechanical warhead on unarmoured, or mechanical warhead on armoured); otherwise nothing
    if (distance < 8) {
      if (!wh.mechanical && armour === ARMOUR_NONE) return raw;
      if (wh.mechanical && armour !== ARMOUR_NONE) return raw;
    }
    return 0;
  }
  let dmg = raw * wh.modifier[armour];
  if (dmg) {
    const div = wh.spread === 0 ? baseDivisor : wh.spread * baseDivisor * 2;
    let d = Math.floor(distance / div);
    d = Math.min(Math.max(d, 0), 16);
    if (d) dmg = Math.floor(dmg / d);
    if (d < 4) dmg = Math.max(dmg, rules.minDamage);
  }
  return Math.min(dmg, rules.maxDamage);
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the warhead-by-armour factor, the distance fall-off and the min and max clamp. Parity-checklist row 1 (duel step / sim); the factor table is a catalogue field, row 21. Melee has no distance term; only a ranged or blast hit would use it.
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; no damage module exists yet.
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- The donor is a real-time strategy game with a damage table per warhead and armour pair. Frankendom's duel uses its own hit, guard and parry rules (checklist rows 1 and 3); the factor table is only useful if the catalogue (row 21) gains a weapon-by-armour grid. That is a design call, not a donor fact.
- Distance is in sub-tile units from the impact point. A duel is a close fight with no grid; the distance fall-off has no direct use there.
- Heal sign handling is a donor convention (negative damage). Frankendom should not encode heals this way without a separate rule.
- The warhead table (`WARHEAD.CPP`, `Modifier` at 78, 179) and `PIXEL_LEPTON_W` were not read in full. This sketch gives the mechanism only.
- Clamping the result to at least `MinDamage` for close hits means a hit never does zero; Frankendom's one ledger must decide whether a blocked hit can still do chip damage.
