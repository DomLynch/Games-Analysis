# flareteam-flare-engine (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | Licence: GPL-3 | C++ | symbol MenuInventory::add / applyEquipment / applyItemSetBonuses

Licence note: GPL-3. CLEAN-ROOM sketch only.

Symbol check: `MenuInventory::add` (881) is correct. `applyEquipment` (1180) and `applyItemSetBonuses` (1386) are correct. `applyEquipment` is 1180-1333; the inner loop that sums stats and set counts is its `while(checkRequired)` block (1190-1264), not `applyItemSetBonuses` (1386-1401), which only applies bonuses for sets already counted and takes the active set lists as arguments.

## 1. Mechanism

- The player has two inventory areas: CARRIED (a stack list with a fixed size) and EQUIPMENT (fixed slots, one item per slot, each slot typed).
- `add(stack, area, slot, sound, autoEquip)` (881-989; empty stack returns true, invalid item id returns false, 882-886):
  - If auto-equip is on (argument and `settings->auto_equip`, 893), it finds an empty equipment slot for the item (`getEquipSlotFromItem(..., ONLY_EMPTY_SLOTS)`, not read) and uses it if that slot is `enabled` and none of the item's `disable_slots` types is currently filled (895-909).
  - Into CARRIED (913-949): the stack is added at the slot; any leftover goes to `drop_stack`, unless the item is a quest item, in which case non-quest carried items are pushed to `drop_stack` from the last slot backwards to make room (916-941); if the pack is all quest items the leftover is dropped (935-938). A full pack logs a message and returns false (946-947).
  - Into EQUIPMENT (950-979): if the slot holds a different item, the new stack goes to CARRIED. If the same item would exceed `max_quantity`, it merges up to the max (recursive `add`) and the leftover goes to CARRIED. Otherwise the item goes into the slot (`updateEquipment`). Then `applyEquipment` is called (978).
  - A successful add of an item with a power and an `auto_actionbar` type puts the power on the action bar (982-984).
- `applyEquipment` (1180-1333) recalculates everything from the equipped set. The first part is a loop (1190-1264) that repeats until stable:
  1. Zeroes `primary_additional` (1195-1197).
  2. For each equipment slot that is active in the current equipment set (`isEquipSlotActive`, 1533-1539, which concerns swappable equipment sets, not the `enabled` flag), adds that item's PRIMARY_STAT bonuses only (1199-1216).
  3. Counts equipped items per set (1220-1233). For each active set, adds the set's PRIMARY_STAT bonuses whose requirement equals the count exactly (1236-1250).
  4. Checks each equipped item (1253-1263): if its slot is active and `requirementsMet` fails against the stats so far, or the slot type differs from the item type, the stack is added to CARRIED (`ADD_PLAY_SOUND`, no auto-equip), the slot is cleared, and the loop runs again.
- After the loop: removes passive item powers' effects (1267-1274), clears equip flags (1277), clears item effects (1280) and power bonus levels (1283), then calls `applyItemStats` (1285; defined 1335-1384: base damage, absorb, equip flags, `applyBonus` for every item bonus, item powers) and `applyItemSetBonuses` (1286; defined 1386-1401), which applies via `applyBonus` every set bonus whose requirement is at most the count.
- Slot disabling runs after that, not inside the loop: all slots are set `enabled` (1290-1292), then each equipped item's `disable_slots` (1294-1302) and each passive power's `disable_equip_slots` (1304-1322) call `disableEquipmentSlot` (defined 1677-1689: moves the item to CARRIED, clears it, calls `applyEquipment` again, sets `enabled = false`).
- The stat result: `primary_additional` set in the loop is overwritten later by `effects.bonus_primary` (StatBlock.cpp:1043; the enclosing function's name was not read), and the effects come from `applyBonus` (1424-1426 maps PRIMARY_STAT to an effect id; EffectManager.cpp:494 sums primary effects into `bonus_primary`). So the loop's values are a provisional set used for the requirement checks.
- Output: the equipped and carried lists, and the derived primary stats and effects. Runs on each equip change.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| MenuInventory::add | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 881-992 | Places a stack into CARRIED or EQUIPMENT; auto-equip; quest-item overflow; merge |
| MenuInventory::applyEquipment | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1180-1333 | Recalculates provisional primary stats, set counts, requirement and slot checks (loop 1190-1264); then item stats, effects, slot disabling |
| MenuInventory::applyItemSetBonuses | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1386-1401 | Applies set bonuses where the count meets the requirement |
| MenuInventory::applyBonus | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1403-1444 | Applies one bonus record as an effect (or power level bonus) |
| MenuInventory::isEquipSlotActive | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1533-1539 | Tells whether a slot belongs to the active equipment set (0 means always active) |
| MenuInventory::applyItemStats | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1335-1384 | Sums base damage and absorb, equip flags, applies each item bonus and registers item powers |
| MenuInventory::disableEquipmentSlot | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1677-1689 | Unequips to CARRIED and disables a slot type |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Equipment recalculated from the equipped set, not patched; repeat until no item fails its requirement | Repeat until stable (theirs, 1190-1264) |
| Set bonus: count equipped members of a set; apply bonus tiers at a requirement count | Requirement tiers are data (theirs; exact match at 1242, at-most at 1395) |
| Auto-equip only into an empty slot and only if no disabled slot is filled | Rule as written (theirs) |
| Overflow to carried; quest items clear room by dropping non-quest items | Quest item rule (theirs, 916-941) |
| Stack merge up to a per-item max quantity; leftover to carried | Max quantity per item (theirs, `max_quantity`, 918 and 959) |

## 4. TypeScript sketch

Licence: GPL-3. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: only the provisional loop (1190-1264) is sketched; omits `applyItemStats`, `applyItemSetBonuses` (at-most-count tiers) and effect creation, the item's non-primary bonuses, equipment-set activity (`isEquipSlotActive`), disabled slots (`disableEquipmentSlot`, which re-runs the whole pass), and the stack/auto-equip logic of `add`; the loop here reads `requirements` as a callback on the provisional stats, as the donor does.

```ts
// clean-room sketch of a recalculate-until-stable equipment pass with set-count bonuses.
// Licence line: GPL-3 donor; this sketch is clean-room, written from mechanism only.
interface Equipped { slot: string; item: { id: string; setId?: string; requirements: (stats: Stats) => boolean; slotType: string; primary: Record<string, number>; }; }
interface Stats { primary: Record<string, number>; }
interface SetBonus { requirement: number; primary: Record<string, number>; }
function recalc(slots: (Equipped | null)[], slotTypes: string[], sets: Map<string, SetBonus[]>, baseStats: Stats): { stats: Stats; carried: Equipped[] } {
  const carried: Equipped[] = [];
  let again = true;
  let stats: Stats = baseStats;
  while (again) {
    again = false;
    stats = { primary: { ...baseStats.primary } };
    const counts = new Map<string, number>();
    for (const e of slots) {
      if (!e) continue;
      for (const [k, v] of Object.entries(e.item.primary)) stats.primary[k] = (stats.primary[k] ?? 0) + v;
      if (e.item.setId) counts.set(e.item.setId, (counts.get(e.item.setId) ?? 0) + 1);
    }
    for (const [setId, n] of counts) {
      for (const b of sets.get(setId) ?? []) {
        if (b.requirement !== n) continue;
        for (const [k, v] of Object.entries(b.primary)) stats.primary[k] = (stats.primary[k] ?? 0) + v;
      }
    }
    for (let i = 0; i < slots.length; i++) {
      const e = slots[i];
      if (!e) continue;
      if (!e.item.requirements(stats) || e.item.slotType !== slotTypes[i]) {
        carried.push(e);
        slots[i] = null;
        again = true;
      }
    }
  }
  return { stats, carried };
}
```

Note: the sketch applies an exact-count set bonus in the provisional pass and does not reproduce the later at-least-count application. Section 6 explains.

## 5. Lands in

- Frankendom: src/gear-stats.ts (primary stat sums, set counts and the bonus tiers) and src/fight/gear-room.ts (today: src/gear-room.ts, moving) (equip slots, carried list, auto-equip into an empty slot). The recalculate-until-stable pass is a gear-dressing rule.
- Parity checklist row 15 (gear dressing; target src/fight/gear-room.ts, today: src/gear-room.ts, moving) for the equip and set recalc. Row 20 (catalogue as runtime source) and row 21 (catalogue fields) for set id, requirement tiers and slot type.
- Beyond checklist: none.

Reuse tag: adapt
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- Set bonuses are applied in two places, and they are not double counted for primary stats. The loop adds PRIMARY_STAT set bonuses to `primary_additional` only when the requirement equals the count exactly (1242). `applyItemSetBonuses` then calls `applyBonus` for every bonus with requirement at most the count (1395), and `applyBonus` turns a PRIMARY_STAT bonus into an effect (1424-1426, 1435-1443). `StatBlock.cpp:1043` then overwrites `primary_additional` with `effects.bonus_primary`, so the loop's value is only the provisional figure for requirement checks. Consequence: an item can pass its requirement using an exact-tier set bonus but a tier bonus at a lower count still applies to the final stats. Frankendom must pick one rule (at-most-count) and use it for both the check and the final stat.
- The donor moves a failing item to carried inside the recalc. Frankendom must decide whether a gear change during a fight is allowed at all; this donor allows it.
- Quest-item overflow drops other items to make room. Frankendom has no quest items in the duel; this rule is inert.
- Max-quantity merge is a stack rule for consumables. Frankendom's gear is single items; only the carried overflow rule applies.
- Conflict check: the recalc must run on the server, between fights, and write the result to the server record. A client-side recalc would split the one-engine rule.
