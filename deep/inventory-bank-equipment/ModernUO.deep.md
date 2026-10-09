# ModernUO (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | Licence: GPL-3.0 per LICENSE file | C# | symbol BaseArmor
Licence note: GPL-3. CLEAN-ROOM sketch only.

Symbol check: the input said `BaseArmor` at line 16. That is the class declaration and serialization header. The logic is in the methods listed below (ArmorRating 289, OnHit 727, ComputeStatReq and ComputeStatBonus 800-820, GetDurabilityBonus 874, ValidateMobile 900, ScaleArmorByDurability 986, CanEquip 1055, OnEquip 1140). The symbol is correct as a class; the mechanism lives in those methods.

## 1. Mechanism

- A piece of armour has an armour rating (`ArmorRating`, L289: base rating, plus 5 per protection level when a protection level is set (plus an extra 10 on top when the UOR flag is on; line 299, too short to receipt), plus a per-resource bonus (UOR only), plus 8 per quality step above 1, then scaled by condition), a hit-point pool with a max, a durability tier and quality, and stat requirements and bonuses (str, dex, int).
- Equip (`CanEquip`, line 1055): players below game-master level only; others go straight to the base check. The equipper must pass the ethic check, race check and gender check. Then DEX, STR and INT are each checked: the stat plus the item's bonus must be at least 1, and the stat must be at least the scaled requirement. Requirements are scaled down by a lower-requirement percent (`GetLowerStatReq`, L947: zero unless the AOS flag is on, capped at 100 [those two lines, 949-951 and 965-967, are too short to receipt]; the scaling helper AOS.Scale is not read). Failure sends a message and blocks equip.
- Equip (`OnEquip`, line 1140) refreshes stat timers, then adds a stat modifier for each non-zero stat bonus (bonus plus attribute bonus), tagged with the item's serial so it can be removed cleanly.
- On a hit (`OnHit`, line 727): absorbed = half the rating plus a random share of the other half. Damage is reduced by absorbed, floored at zero.
- Then a 1-in-4 wear roll. Bashing weapons wear `max(1, absorbed / 2)` points; other weapons wear a random 0 or 1. Wear comes off current hit points first, then max hit points. If the max would fall to zero or below, the item is deleted. In AOS, a self-repair stat may restore 2 hit points instead.
- The armour value is scaled by condition: `scale = 50 + 50 * hp / maxHp` in integer arithmetic when damaged, else 100. `ScaleArmorByDurability` (line 986), applied as the last step of `ArmorRating`.
- `ValidateMobile` (static, line 900) moves any worn armour that fails race or gender (gender not for game masters) to the backpack. Its callers (found by grep) are spell effects (Incognito.cs L108 and L159, Polymorph.cs L167 and L216) and the duel context (Engines/ConPVP/DuelContext.cs L1876, not read), not a load path.
- Output: the reduced damage, updated hit points, and possibly a deleted item. These are plain item methods; the weapon-side call to OnHit is not read.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| BaseArmor.OnHit | /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | 727-780 | Absorbs damage by rating; 1-in-4 wear roll; deletes at zero max |
| BaseArmor.ScaleArmorByDurability | /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | 986-996 | Armour value scaled 50 to 100 percent by hit points |
| BaseArmor.ComputeStatReq / ComputeStatBonus | /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | 800-820 | Scaled requirement and bonus per stat |
| BaseArmor.CanEquip | /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | 1055-1123 | Ethic, race, gender, then stat gates |
| BaseArmor.OnEquip | /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | 1140-1169 | Adds serial-tagged stat modifiers |
| BaseArmor.ValidateMobile | /mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs | 900-945 | Moves worn armour a wearer may no longer use to the backpack |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Absorb a random share of a rating from each hit (rating/2 plus up to rating/2) | Rating formula in ArmorRating, L289-328: +5 per protection level (+10 more when UOR), resource table 2-16 (UOR only), +8 per quality step (theirs) |
| Wear roll 1 in 4; wear comes off the current pool first, then the max pool; delete at zero | 1 in 4 (theirs); wear 0 or 1, or max(1, absorbed/2) for bashing (theirs) |
| Condition scaling of the displayed value, 50 to 100 percent | 50 plus 50 times hp fraction (theirs) |
| Stat gate: stat plus bonus at least 1, and at least the requirement scaled by a capped percent | Requirement cap 100 (theirs) |
| Durability tiers as additive bonuses (GetDurabilityBonus, L874, UOR branch; it scales max and current hit points, ScaleDurability L717) | Tiers 20, 50, 70, 100, 120; exceptional quality +20 (theirs) |
| Protection level adds a fixed offset to the rating | GetProtOffset L862 returns 1, 2, 3, 4 for the top four levels; ArmorRating itself uses 5 per level plus 10 under UOR (theirs; GetProtOffset callers not read) |

## 4. TypeScript sketch

Licence: GPL-3. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: omits the AOS self-repair branch (restores 2 hit points instead of wearing), the "severely damaged" message, the rating build-up (protection, resource, quality), integer truncation of the condition scale, the AOS.Scale rounding of requirements (Math.round stands in) and the lower-requirement lookup; canWearStat checks one stat only and is given the lower-requirement percent; the ethic, race and gender checks of CanEquip, OnEquip's stat modifiers and ValidateMobile are not sketched. The wear is applied through a helper rather than inline, same result.
```ts
// clean-room sketch of armour absorption with a wear roll and a condition-scaled value.
// Licence line: GPL-3 donor; this sketch is clean-room, written from mechanism only.
interface Armour { rating: number; hp: number; maxHp: number; deleted: boolean; }
type WeaponKind = 'bashing' | 'other';
// Wear eats current hit points first; any remainder cuts the max pool; a max that cannot cover it destroys the item.
function applyWear(a: Armour, wear: number): void {
  if (wear <= 0 || a.maxHp <= 0) return;
  const fromHp = Math.min(a.hp, wear);
  a.hp -= fromHp;
  const rest = wear - fromHp;
  if (rest <= 0) return;
  if (rest >= a.maxHp) a.deleted = true;
  else a.maxHp -= rest;
}
function absorbOnHit(a: Armour, damage: number, weapon: WeaponKind, rnd: () => number): number {
  const half = a.rating / 2;
  const absorbed = Math.floor(half + half * rnd());
  if (Math.floor(rnd() * 4) === 0) {          // 1 in 4 wear roll
    applyWear(a, weapon === 'bashing' ? Math.max(1, Math.floor(absorbed / 2)) : Math.floor(rnd() * 2));
  }
  return Math.max(0, damage - absorbed);
}
// Displayed value scaled by condition: 50 to 100 percent.
function displayedRating(a: Armour): number {
  if (a.maxHp <= 0 || a.hp >= a.maxHp) return a.rating;
  const scale = 50 + (50 * a.hp) / a.maxHp;
  return (a.rating * scale) / 100;
}
// Stat gate: stat must reach the scaled requirement, and stat plus bonus must be at least 1.
function canWearStat(stat: number, bonus: number, requirement: number, lowerReqPct: number): boolean {
  const req = Math.round((requirement * (100 - Math.min(100, lowerReqPct))) / 100);
  return stat >= req && stat + bonus >= 1;
}
```

## 5. Lands in

- Frankendom: src/gear-stats.ts (stat gate, bonuses, condition scaling) and src/fight/duel.ts (today: src/duel.ts, moving) (the absorb on a hit and the wear roll, if durability exists). The hit absorb is a duel-step rule, so it is one engine: src/fight/duel.ts (today: src/duel.ts, moving) only.
- Parity checklist row 1 (duel step/sim) for the absorb and the wear roll; row 15 (gear dressing; the brief names src/fight, absent in the shadow tree, so src/fight/gear-room.ts (today: src/gear-room.ts, moving)) for the stat gate and the equip path; row 21 (catalogue gear tiers) for rating and durability as data.
- Beyond checklist: none.

Reuse tag: adapt
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor's wear roll deletes an item when its max hit points run out. Frankendom's gear is catalogue data; deleting gear mid-fight is a permanent loss, which needs a design ruling (Lead and Strategy) before any port.
- The absorb draws from the engine's random source. Frankendom's duel step must be deterministic from the seed so the server can verify the outcome.
- The stat gate and bonus are per-item, read at equip time. Frankendom must check the gate at fight start, not only at equip, or a change mid-fight is missed.
- Serialized item state is a save format for an open-world server. Frankendom has no save-per-item; its catalogue fields (rows 20 and 21) must carry the stats as data.
- Conflict check: the absorb must run in the server duel step, not in a client gear view (server-verified kills). OnHit is a plain method on the item; where the donor calls it (weapon code) is not read.
