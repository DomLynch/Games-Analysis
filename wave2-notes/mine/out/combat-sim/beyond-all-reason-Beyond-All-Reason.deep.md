# beyond-all-reason-Beyond-All-Reason (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_timeslow.lua` | Licence: GPL-2.0-or-later (gadget header: "GNU GPL, v2 or later"; repo README says BAR game code is GPL v2) | Lua | symbol `gadget:UnitPreDamaged`, `updateSlow`, with the stacking in `luarules/gadgets/include/unit_attributes_control.lua` `composeValue`

Checked: `unit_timeslow.lua` read in full (139 lines). `unit_attributes_control.lua` read at 1-30 and 806-930 (header, `record`, `resolveSet`, `applyMult`, `composeValue`); the other 1600 lines (weapon attributes, dirty-pool, setters) were not read. The base damage calculation lives in the Recoil engine, not in this repo (not read).

## 1. Mechanism

- Two layers. (a) A "second health bar": weapons marked as paralyzers add to a per-unit `paralyzeDamage` number instead of hurting health. The engine keeps that number and lets it fade (the decay is engine code, not read). (b) This gadget turns that number into a slow.
- On each paralyzer hit, `UnitPreDamaged` (99) marks the unit as slowed (111) and recomputes at once. Every 0.5 s of game time (24, 117) it recomputes every slowed unit and drops units whose paralyze damage has fallen under 5 (81).
- Formula (`updateSlow`, 81-96): `maxSlow = health x 0.9` (87, constant at 23); paralyze damage is capped at that; `percentSlow = paralyzeDamage / maxHealth`; it is rounded to steps of 1/64 (93, constant at 37) so an unchanged slow writes identical numbers. A unit with more health left is therefore slowed less by the same hit, and a nearly dead unit can be slowed up to 90%.
- Effects (`applySlow`, 50-72): `moveFactor = 1 - min(percent, 0.9)` multiplies speed, turn rate, acceleration and build speed (64-67); max deceleration is set high (1000) so the unit brakes into its new top speed instead of coasting (68); reload time becomes `1 / max(1 - 2 x percent, 0.01)` (71), so weapon fire slows twice as fast as movement and stops at about 50% slow.
- All these values are written as modifiers tagged with the source name "timeslow". The modifier layer (`unit_attributes_control.lua`) keeps one factor per source: writing the same source again replaces it (record, 812-841), writing `nil` removes it (813-816). To compute a stat it takes the newest "set" in the narrowest scope (unit, then unit-type-on-team, then unit-type; `resolveSet` 844, `composeValue` 879-885), falls back to the base stat, then multiplies by every "multiply" factor from all three scopes (856-892). So slow, buffs, terrain and other effects stack without overwriting each other, and each effect can be removed by name.

## 2. Key functions

- `updateSlow`: `luarules/gadgets/unit_timeslow.lua` 75-96. Paralyze damage to slow percent.
- `applySlow`: `luarules/gadgets/unit_timeslow.lua` 50-72. Writes or clears the named modifiers.
- `gadget:UnitPreDamaged`: `luarules/gadgets/unit_timeslow.lua` 99-113. Hit hook.
- `record`, `resolveSet`, `applyMult`, `composeValue`: `luarules/gadgets/include/unit_attributes_control.lua` 812, 844, 856, 867. Named-source modifier stack.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Status effect as a side meter that fills from hits and fades; strength = meter / max health, capped by remaining health | Cap 0.9 (theirs, line 23), step 1/64 (37), "off" threshold 5 (81) |
| One effect drives several stats at different rates (move linear, fire rate double) | Reload `1/(1-2p)`, floor 0.01 (71, constant at 39) |
| Named-source modifier stack: set resolved by narrowest scope, then all multiplies; same source overwrites, nil removes | Scopes: unit, unit-type-on-team, unit-type (composeValue 871-892) |
| Recompute on hit plus a slow timer (0.5 s) for the fade | `UPDATE_FRAMES` = 0.5 x game speed (24) |

## 4. TypeScript sketch

simplified: the meter's own decay is passed in (the donor's engine does it); only speed and reload are modelled; no scopes (only a per-unit stack); `set` factors are omitted.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export class Modifiers {
  private mult = new Map<string, number>();
  set(source: string, value: number | null): void {
    if (value === null) this.mult.delete(source);
    else this.mult.set(source, value);
  }
  apply(base: number): number {
    let v = base;
    for (const m of this.mult.values()) v *= m;
    return v;
  }
}

export function slowPercent(meter: number, health: number, maxHealth: number): number {
  if (meter < 5) return 0;
  const capped = Math.min(meter, health * 0.9);
  return Math.round((capped / maxHealth) * 64) / 64;
}

export function applySlow(mods: Modifiers, reload: Modifiers, percent: number): void {
  if (percent <= 0) { mods.set("slow", null); reload.set("slow", null); return; }
  mods.set("slow", 1 - Math.min(percent, 0.9));
  reload.set("slow", 1 / Math.max(1 - percent * 2, 0.01));
}
```

## 5. Lands in

- TARGET `src/fight/modifiers.ts` (new module: named-source stat modifiers, so guard, stagger, finisher and gear effects stack and clear by name) and `src/fight/status.ts` (side-meter status effects): checklist row 1 (duel step / sim) and row 3 (guard/parry/stamina). today: none read.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core), one-ledger rule (one place owns each stat; effects write by source name)

## 6. Gaps and risks

- GPL: clean-room only. The sketch is written from the described mechanism.
- The meter's rise from a hit and its decay run in the Recoil engine (not read), so the real "paralyze damage" rules (how much a hit adds, how fast it fades) are unknown here.
- RTS scale: thousands of units on a 0.5 s timer. A duel game with a few fighters can recompute every step, so the 0.5 s timer and the 1/64 rounding exist for a problem Frankendom does not have; do not copy them.
- Percent-of-max-health scaling slows weak units more; whether Frankendom wants that for a boss versus many small attackers is a design choice.
- The wider file (weapon attribute composition, unit-def-and-team scope, dirty pool) was not read; the stack described is the part that was.
