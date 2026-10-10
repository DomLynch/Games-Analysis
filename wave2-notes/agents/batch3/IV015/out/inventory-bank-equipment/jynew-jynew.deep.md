# jynew-jynew (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` | Licence: restricted (root LICENSE, lines 1-8: "金庸群侠传3D重制版 License"; line 8: "The use of any resources or code of this project is not permitted unless authorized by the public statement of this project."; not an OSI licence; clean-room, shape only) | C# (Unity) | symbol `RoleInstance.UseItem`, `RoleInstance.UnequipItem`, `RoleInstance.LimitAttr`, `RoleInstance.CanUseItem`, `GameRuntimeData.AddItem`, `MainUIPanel.OnUseItem`

Checked: Hint was INFERRED (no file given). Found by grep for bag, inventory and equip in jyx2/Assets/Scripts. Read in full: GameSave/RoleInstance.cs 361-381 (LimitAttr), 512-532 (role AddItem), 547-639 (CanUseItem), 645-658 (testAttr), 715-830 (UseItem, UnequipItem), 1163-1171 (equipment property getters); UI/MainUIPanel.cs 115-250 (OnUseItem: equip, technique, potion flows); GameSave/GameRuntimeData.cs 545-600 (team bag AddItem, GetItemCount). Partly read: RoleInstance.cs 296-345 (except 313-317; the LimitAllAttrs body is the lines printed) and 666-700 (LianZhiItem, crafting; not used here); GameRuntimeData.SetItemUser (line 600 on) only at its call sites. Confidence: high for equip, unequip, the cap and the two defects (Anqi, Poison, Hurt, LimitAttr branches, the team-bag negative); medium for LimitAllAttrs ordering (read as a call, body not checked). Not read: the rest of CanUseItem beyond 639, the item config fields (their values are not read), GameConst.MAX_* values.

Best transferable idea: gear is a bonus snapshot applied on equip and reversed exactly on unequip, one wearer per piece, and caps clamp the base stat only so gear stays on top of the cap.
Decision (proposed): adapt — adopt one wearer per gear, exact reversal of the stored snapshot, caps on the base only with gear on top, and requirement tests against base stats (gear never blocks its own swap); reject the equip-time heal and wound change (a defect, not a feature), and the martial-art stat names (rename to Frankendom's stats).
Acceptance: equipping a +5 Attack sword on a hero at the Attack cap shows cap plus 5, and the base still reads the cap; unequipping shows the cap again; moving the sword from hero A to hero B drops A's Attack by exactly 5 in one step; a server test asserts that for every stat key, equip then unequip restores the stat exactly, and that equipping never changes HP or wounds.

## 1. Mechanism

- Two stores. The team bag (`GameRuntimeData.Items`, id to (count, time stamp)) stacks counts with no slot limit. A change writes the new count and re-stamps the time (GameRuntimeData.cs 559, 563). A count of 0 removes the entry (564-565). A missing item with a negative count is refused with an error (552-558). A stack that goes negative after a change is logged and deleted (567-571, defect). Equipped items are not in a slot array. They are tracked by an owner id per item (`SetItemUser`) and by the role's `Weapon` and `Armor` item ids.
- Equip (`MainUIPanel.OnUseItem`, Callback 137-180). (a) If the chosen role already wears the item, return (141). (b) `CanUseItem` must pass (143). (c) If another party member wears the item, that member unequips it and clears the slot (151-155, 167-171). (d) The chosen role unequips its current piece (158, 174), sets the slot to the item id (159, 175), then applies the item's deltas with `UseItem` (160, 176). (e) The owner is recorded (161, 177).
- `UseItem` (RoleInstance.cs 722-779) applies the item's fields as deltas on the totals, in this order: Tili (727); HP through the potion formula (730-736): `add = AddHp - Hurt/2 + Random(0..9)`, and if add <= 0 then `add = 5 + Random(0..4)`; wounds drop by `AddHp/4` (735); MaxHp (737); Mp and MaxMp (738-739); Poison by `ChangePoisonLevel/2` (740); Heal, DePoison, AntiPoison, UsePoison (741-744); Attack, Defence, Qinggong (746-748); Quanzhang to Anqi (750-754); Pinde and AttackPoison (756-757); the one-way flags MpType 2 and Zuoyouhubo (759-767); learned technique if `CanFinishedItem` (769-774); then `LimitAllAttrs` (779).
- `UnequipItem` (786-830) clears the slot (792-803), sets the owner to -1 (805), then subtracts the same fields: Tili (806); HP by exactly `AddHp` (807); MaxHp (808); Mp, MaxMp (809-810); Poison by the full `ChangePoisonLevel` (811); Heal to UsePoison (812-815); Attack, Defence, Qinggong (817-819); Quanzhang to Qimen (821-824); Pinde (826); AttackPoison (827); then `LimitAllAttrs` (829). Anqi is not subtracted (grep of RoleInstance.cs finds Anqi at lines 45, 140, 179, 302, 345, 626 and 754 only). Wounds are not restored.
- Caps and equipment (`LimitAttr`, 361-381; called from `LimitAllAttrs` at 332-334): equipment value = weapon property + armour property (1163-1171, read by reflection from the item config). Base = total minus equipment (363). If base > max, the result is max + equipment (365-367). If base < min and equipment > 0, the result is min + equipment (370-372). If base < min and equipment < 0, the result is min (375-377). Otherwise the total is returned as is (380). So gear is outside the cap.
- Requirements (`CanUseItem`, 547-629): for equipment (type 1, and the technique branch for type 2), Attack and Qinggong are tested as `this.Attack - weapon - armour` (617-618), i.e. against the base stat without the current gear. The other tests read the raw stat (619-628). `testAttr` (645-658): a positive need requires v >= need; a negative need requires v <= -need.
- Potions (type 3) are used, then one is removed from the team bag (MainUIPanel 231-232).
- Tick: none. Everything runs on the click or the callback.

## 2. Key functions

- `RoleInstance.UseItem`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` 722-779. Adds the deltas (equip and potion share it).
- `RoleInstance.UnequipItem`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` 786-830. Subtracts the deltas, with the asymmetries listed in section 6.
- `RoleInstance.LimitAttr`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` 361-381. Base-only cap.
- `RoleInstance.CanUseItem`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` 547-629. Requirement tests against base stats.
- `MainUIPanel.OnUseItem`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/UI/MainUIPanel.cs` 115-250. The equip, technique and potion flows, with one owner per item.
- `GameRuntimeData.AddItem` (string): `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs` 550-573. Team stack bag.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gear bonus applied as a snapshot and reverted exactly | Field list (Attack, Defence, Qinggong, Anqi, Pinde, AttackPoison, Quanzhang, Yujian, Shuadao, Qimen, MaxHp, Mp, MaxMp, Tili, Heal, DePoison, AntiPoison, UsePoison, Poison) read from the item config; the names are the donor's martial-art stats |
| Cap the base, keep gear on top | GameConst.MAX_ROLE_ATTACK, MAX_ROLE_DEFENCE, MAX_ROLE_QINGGONG (values not read) |
| Requirement against base stat (current gear removed) | Attack and Qinggong only (617-618) |
| One owner per item, moved in one handler | Owner id per item (SetItemUser) |
| Heal on use: base minus half the wound, random 0..9, floor 5 + random 0..4 | 2 (divisor, 730), 9 (rand upper, 730), 5 and 4 (floor, 733) |
| Wounds drop by a quarter of the heal | 4 (735) |
| Poison on use: half on use, full on unequip | 2 (740), 1 (811) |
| Stack with no slot limit, removed at zero | No cap (GameRuntimeData 550-573) |

## 4. TypeScript sketch

simplified: keeps one wearer per gear, the snapshot-based equip and unequip, the base-only cap (including the negative-equipment and zero-equipment branches fixed), the requirement test against base stats, and the refused negative stack. Fixes are in the sketch: unequip reverts the exact stored snapshot (so Anqi and poison cannot drift), gear never touches wounds or HP (the stat keys have no HP-change or wound key), and a negative stack is refused before it is written. It omits the potion heal formula, the technique and flag branches (MpType, Zuoyouhubo), CanFinishedItem, the crafting (LianZhiItem), the donor's type-3 and type-4 rules, the owner-id persistence, the HUD refresh, and the donor's testAttr negative-need branch (requirements here are minimums only).

```ts
// Licence: restricted (donor: custom '金庸群侠传3D重制版 License' forbids use of code or resources without authorization). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Slot = "weapon" | "armor";
export type StatKey = "attack" | "defence" | "qinggong" | "anqi" | "maxHp" | "poison";
export type Bonus = Partial<Record<StatKey, number>>;

export interface Gear {
  id: string;
  bonus: Bonus;                          // catalogue fields, applied on equip
  requires: Partial<Record<StatKey, number>>; // minimum base stat (without the current gear)
}

export interface Wearer {
  id: number;
  stats: Record<StatKey, number>;        // totals: base plus the equipment bonus
  worn: Partial<Record<Slot, { gearId: string; applied: Bonus }>>;
}

export type Caps = Partial<Record<StatKey, { min: number; max: number }>>;
export type Owners = Map<string, Wearer>; // one wearer per gear

export function equipBonus(w: Wearer, key: StatKey): number {
  let sum = 0;
  for (const slot of Object.values(w.worn)) {
    if (slot) sum += slot.applied[key] ?? 0;
  }
  return sum;
}

// Caps the base only; equipment stays on top. Base below min is always clamped (the donor skips this when equipment is 0).
export function capTotal(total: number, equip: number, min: number, max: number): number {
  const base = total - equip;
  if (base > max) return max + equip;
  if (base < min) return min + equip;
  return total;
}

function recap(w: Wearer, caps: Caps): void {
  for (const key of Object.keys(caps) as StatKey[]) {
    const c = caps[key];
    if (!c) continue;
    w.stats[key] = capTotal(w.stats[key], equipBonus(w, key), c.min, c.max);
  }
}

// Requirements are checked against the base stat, so gear does not block its own swap.
export function canWear(w: Wearer, gear: Gear): boolean {
  for (const key of Object.keys(gear.requires) as StatKey[]) {
    const need = gear.requires[key] ?? 0;
    if (w.stats[key] - equipBonus(w, key) < need) return false;
  }
  return true;
}

// Reverts exactly what was applied (the stored snapshot), never a recomputed amount.
export function unequip(w: Wearer, slot: Slot, caps: Caps, owners: Owners): void {
  const cur = w.worn[slot];
  if (!cur) return;
  for (const key of Object.keys(cur.applied) as StatKey[]) {
    w.stats[key] -= cur.applied[key] ?? 0;
  }
  owners.delete(cur.gearId);
  delete w.worn[slot];
  recap(w, caps);
}

// One wearer per gear: if another wearer has it, that wearer takes it off first.
export function equip(to: Wearer, slot: Slot, gear: Gear, caps: Caps, owners: Owners): boolean {
  if (!canWear(to, gear)) return false;
  const prev = owners.get(gear.id);
  if (prev === to) return false; // already worn by this wearer (donor returns early here too)
  if (prev) {
    const prevSlot = (Object.keys(prev.worn) as Slot[]).find((s) => prev.worn[s]?.gearId === gear.id);
    if (prevSlot) unequip(prev, prevSlot, caps, owners);
  }
  unequip(to, slot, caps, owners);
  const applied: Bonus = { ...gear.bonus };
  for (const key of Object.keys(applied) as StatKey[]) {
    to.stats[key] += applied[key] ?? 0;
  }
  to.worn[slot] = { gearId: gear.id, applied };
  owners.set(gear.id, to);
  recap(to, caps);
  return true;
}

// Shared bag: counts per item id. A negative result is refused, and a zero count removes the entry.
export function addStack(bag: Map<string, number>, id: string, n: number): boolean {
  const have = bag.get(id) ?? 0;
  if (have + n < 0) return false;
  if (have + n === 0) bag.delete(id);
  else bag.set(id, have + n);
  return true;
}
```

## 5. Lands in

- TARGET `src/fight/gear.ts` (new module: gear bonuses on the wearer, one owner per piece, base-only caps). The stats it touches are the duel stats (attack, defence, qinggong) and the cap values.
- Parity-checklist row 21 (catalogue fields): the gear bonus fields and their names come from the catalogue; the engine applies them. Not row 18 (the loot roll is elsewhere).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only, shape only)
- Brief rule served: 1 (one engine, one ledger: the team stack bag is one ledger, and gear is applied by the engine, not the UI); rule 8 (no HP or wound change on equip)

## 6. Gaps and risks

- Restricted licence: no code or resources may be used without authorization. This note is shape only and the sketch is written from the mechanism.
- Defect 1, Anqi is added on use and never subtracted (RoleInstance.cs 754 against no matching line in UnequipItem 786-830). Each equip of an item with an Anqi bonus raises Anqi permanently, up to the cap (345). Fix: unequip reverts the stored snapshot (the sketch's `unequip`).
- Defect 2, equipping heals and cuts wounds. `UseItem` runs the potion heal formula (730-736) and the wound reduction (735) for equipment too (MainUIPanel 160 and 176 call it). Unequip removes exactly `AddHp` (807) and does not restore wounds. So each equip/unequip cycle changes HP by a random amount and cuts wounds for free. Fix: gear applies stat deltas only. The sketch's stat keys have no HP or wound key.
- Defect 3, poison is asymmetric: +`ChangePoisonLevel/2` on use (740), -`ChangePoisonLevel` on unequip (811). A cycle drains half the poison value, clamped at 0 by `LimitAllAttrs`. Fix: the snapshot reverts exactly (the sketch does).
- Defect 4, `LimitAttr` branches: with base below min and equipment exactly 0, no branch fires and the unclamped value is returned (370 and 375 both need a non-zero equipment; the return at 380). With negative equipment and base below min, the result is `min` (377), which drops the penalty and raises the base by the penalty size. Fix: clamp base always and return `min + equipment` (the sketch's `capTotal`).
- Defect 5, the role-level `AddItem` adds a negative entry for a missing item (RoleInstance.cs 524-531: the else branch runs for any count). Fix: refuse negative when missing, as `GameRuntimeData.AddItem` does (552-558).
- Defect 6, the team bag deletes a stack that goes negative (GameRuntimeData.cs 567-571) instead of refusing the change. An over-spend therefore wipes the stack. Callers must check the count first. Fix: refuse before writing (the sketch's `addStack`).
- No capacity. Both bags are unlimited. This donor shows no carry limit to copy; Frankendom must set its own.
- Equipment and wounds: the donor applies wounds (Hurt) and poison as "equipment" effects. Frankendom wounds belong to the fight record, not to gear; keep them out of the gear model.
- The one-owner flow is sequential code in a UI callback. A failure between "unequip old" and "apply new" leaves partial state. Frankendom should do the move in one engine call that either completes or changes nothing.
- Not read: `GetWeaponProperty` reads by reflection from the item config (1165); the field values and the MAX constants are not read.
