# afritz1-OpenTESArena (inventory-bank-equipment, cell 3)

Donor: /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src | Licence: MIT License (MIT) (LICENSE.txt, "Copyright (c) 2016-2026 The OpenTESArena Developers"); permissive, code may be adapted | C++ | symbol ItemInventory::insert, CharacterEquipmentUiState (equip toggle), ArenaPlayerUtils::getBaseSpeed

Checked: cell 3 = row 4 of cells-IV008.tsv. The hint file UI/UiLibrary.cpp is the wrong file (UI widgets); the inventory logic is Items/ItemInventory.cpp (read in full), Items/ItemInstance.cpp (init and clear), Items/ItemDefinition.cpp (IsItemTypeStackable, getWeight), Interface/CharacterEquipmentUiState.cpp (equip toggle, lines 100-200 read; the similar-item check above line 100 was only partly read), Interface/GameWorldUiState.cpp (loot take, 1120-1160), Player/Player.cpp (encumbrance, 676-690), Player/ArenaPlayerUtils.cpp (lines 1-40, 78-81). A grep for bank, storage, chest and stash found no matches, so there is no bank mechanic in this donor. Confidence high for the inventory, equip and loot-take code; medium for the encumbrance chain (the caller of getBaseSpeed beyond Player.cpp not read). No camera content.

## 1. Mechanism

Three linked mechanisms, in order of how they touch a bag:

A. Slot inventory with stacking (ItemInventory.cpp:183-212). insert(defID, amount):
1. If the definition is stackable (consumable, gold, misc only; ItemDefinition.cpp:11-30), find the first slot holding the same defID and add the amount to it. There is no maximum stack (197).
2. If no stack was found, use the first empty slot (findFirstEmptySlot); if none, grow the vector by one slot (206). The inventory has no slot cap.
3. Re-initialise the slot (init sets isEquipped = false, ItemInstance.cpp:17) and write the merged stack amount (211-212).
compact() (215-229) moves every valid slot into the first earlier empty slot and copies defID, stackAmount and isEquipped (228).

B. Loot take as a move (GameWorldUiState.cpp:1137-1146). Gold goes straight to player.gold (1138), with no slot. Anything else: insert into the player inventory (1143), then clear the source slot (defID = -1, 1146), then refresh the list box. Insert cannot fail (no cap), so the two steps are atomic by construction within one callback.

C. Equip as an exclusive-group toggle (CharacterEquipmentUiState.cpp:100-188). Equipping an item first calls unequipItemsIf(predicate), which clears isEquipped on every other item the predicate matches (123). Then the switch by kind:
- Armour (140): unequips any other armour with the same armor.typeID.
- Shield (142-151): unequips every shield and every two-handed weapon.
- Weapon (161-167): unequips every weapon; unequips shields only if the new weapon is two-handed (167).
- Then the flag flips: isEquipped = !prevIsItemEquipped (188). Equipping an equipped item unequips it.
Accessory and trinket cases do nothing (no exclusivity).

D. Encumbrance to speed (Player.cpp:682-688; ArenaPlayerUtils.cpp:15-18, 78-80). Carried weight = sum of one definition weight per occupied slot (ItemInventory.cpp:57). Weight is non-zero only for armour, shield and weapon (ItemDefinition.cpp:301-310; consumable, gold, misc and trinket return 0). Max carry = strength x 2 (ArenaPlayerUtils.cpp:80). The modifier is clamped to 0-256 of the ratio (686), then base speed = ((speed x 20 / 256) x (256 - mod) / 256) + 20 (ArenaPlayerUtils.cpp:17). Integer division throughout.

## 2. Key functions

- ItemInventory::insert, Items/ItemInventory.cpp:183. Stack merge or first empty slot, else grow.
- ItemInventory::compact, Items/ItemInventory.cpp:215. Defragment, copies the equipped flag.
- ItemInventory::getWeight, Items/ItemInventory.cpp:43. Sum of definition weights per slot.
- ItemInstance init, Items/ItemInstance.cpp:12-18. Resets isEquipped.
- CharacterEquipmentUiState equip handler, Interface/CharacterEquipmentUiState.cpp:100-188 (lambda unequipItemsIf at about 116-130; the kind switch starts at line 135 and runs to about 180).
- Loot take callback, Interface/GameWorldUiState.cpp:1137-1150.
- Encumbrance and speed, Player/Player.cpp:682-688 and Player/ArenaPlayerUtils.cpp:15-18.

## 3. Numbers vs mechanism

- Max carry = strength x 2 (ArenaPlayerUtils.cpp:80). Example used in the sketch only: strength 20 gives 40 kg.
- Encumbrance scale 256 (Player.cpp:686). Speed floor +20 (ArenaPlayerUtils.cpp:17). At full load (mod 256) the base speed is 20, not 0: the donor never stops the player by weight.
- Speed attribute scaled x 20 / 256 (ArenaPlayerUtils.cpp:17); the speed input is the 256-scaled attribute (Player.cpp:680, not read beyond the name).
- Stack cap: none (197). Slot cap: none (206).
- Weight: armour and weapon weights are per definition (ItemDefinition.cpp:308 and weapon equivalent, not quoted); non-gear weight 0.
- No timers, no tick. Everything resolves on the click or on the stat read.

## 4. TypeScript sketch

simplified: keeps the exclusive-group rules (armour by type; shield vs two-handed; one weapon, two-handed also clears shields) and the encumbrance chain (carried over max x 256, clamp, integer speed math). It omits the UI (list boxes, colours, messages), the similar-item check above line 100 (partly read), the weapon animation reset, and the stack and inventory code. It changes one donor point: a zero-capacity character (strength 0) would divide by zero in the donor (no guard read), so the sketch returns the full-load value. The equip toggle excludes the target from the unequip pass and then flips it; the donor clears the target too and flips it, with the same end state. Typechecked on the VPS: npx tsc --noEmit --strict --target es2020, exit 0.

```ts
// Clean-room shape of exclusive equip groups (one armour per type, shield vs two-hand, one weapon) and weight-to-speed encumbrance.
type Kind = "armor" | "shield" | "weapon" | "trinket" | "accessory" | "consumable";
interface Def { kind: Kind; armorType?: number; handCount?: number; weightKg?: number; }
interface Inst { id: string; def: Def; equipped: boolean; }

// donor CharacterEquipmentUiState.cpp: armour unequips same armor typeID; a shield unequips shields and two-handed weapons;
// a weapon unequips all weapons, and shields only when the new weapon is two-handed; then the toggle flips.
function toggleEquip(items: Inst[], target: Inst): void {
  if (target.def.kind === "consumable" || target.def.kind === "accessory" || target.def.kind === "trinket") {
    target.equipped = !target.equipped; // donor: no exclusivity for these kinds
    return;
  }
  const unequip = (pred: (d: Def) => boolean): void => {
    for (const it of items) if (it !== target && it.equipped && pred(it.def)) it.equipped = false;
  };
  const prev = target.equipped;
  switch (target.def.kind) {
    case "armor":
      unequip((d) => d.kind === "armor" && d.armorType === target.def.armorType);
      break;
    case "shield":
      unequip((d) => d.kind === "shield" || (d.kind === "weapon" && d.handCount === 2));
      break;
    case "weapon": {
      const twoHanded = target.def.handCount === 2;
      unequip((d) => d.kind === "weapon" || (twoHanded && d.kind === "shield"));
      break;
    }
    default:
      break;
  }
  target.equipped = !prev;
}

// donor Player.cpp:684-688 and ArenaPlayerUtils.cpp:15-18, 78-81: maxKg = strength*2; load 0..256; integer speed math
const UNITS = 256;
function encumberedSpeed(speedAttr: number, strength: number, carriedKg: number): number {
  const maxKg = strength * 2;
  // fix: donor divides by maxKg with no guard; guard the zero-capacity case
  const mod = maxKg <= 0 ? UNITS : Math.min(UNITS, Math.max(0, Math.round((carriedKg / maxKg) * UNITS)));
  return Math.floor((Math.floor((speedAttr * 20) / UNITS) * (UNITS - mod)) / UNITS) + 20;
}

export {};
```

## 5. Lands in

Target: origins/server/equipment-rules.ts (proposed new file; not checked against the Frankendom repo). Parity row 18 (loot take and equip state; the hint row). Row 15 (gear dressing) also reads these equipped flags and should be checked against the same state.

## 6. Gaps and risks

- Frankendom rule (server-verified, one ledger): the exclusive-group rule must run on the server, and the client only shows the flags the server returns. Today the donor runs the rule in the UI callback (CharacterEquipmentUiState.cpp:100-188); moving it is the main work.
- Donor defects and design gaps, with fixes:
  (a) Inventory has no slot cap (ItemInventory.cpp:206). Fix: a bag cap as data, refuse and report.
  (b) Stacks have no maximum (197). Fix: a per-definition max stack as data.
  (c) insert() re-initialises a merged slot and clears isEquipped (211, ItemInstance.cpp:17). Latent only: consumable and gold are not equippable (IsItemTypeEquippable, read); misc equippable status was not read. Fix: keep the flag when merging.
  (d) Weight is zero for every non-gear kind (ItemDefinition.cpp:301-310), so a stack of 99 potions weighs nothing. Fix: weight per unit as data for stackables if Frankendom wants bulk to matter.
  (e) Encumbrance never stops movement: base speed floors at 20 (ArenaPlayerUtils.cpp:17). Fix: a designer floor value as data, and a test for the slow-down curve.
  (f) Zero-capacity divide (Player.cpp:684-686, no guard read). Fix: guard (the sketch does).
- Loot take relies on insert never failing (1143 then 1146). With a cap, the take must check space before clearing the source. Fix: check, then move.
- Not read: the rest of the similar-item check (CharacterEquipmentUiState.cpp, above line 100), the weapon animation reset, the caller chain beyond Player.cpp:688, IsItemTypeEquippable for misc, and the list-box UI code.

Reuse tag: adapt (MIT; code may be adapted; sketch re-expressed, no lines copied).
Brief rule served: anti-strictness rules 1-4 (wrong hint file found and passed over, real inventory, equip and encumbrance code opened, candidates listed, idea judged); 2026-10-10 keep-the-idea rule (defects listed with fixes, decision adapt).

Best transferable idea: Equip is one toggle that clears a per-kind exclusive group, so a two-handed weapon blocks a shield and one armour per armour type is worn.
Decision (proposed): adapt — the kind-based exclusive groups become a predicate table in data for the Armour lane, but the server runs the rule, and the weight-to-speed curve needs a floor and a zero-capacity guard.
Acceptance: Server test: with a shield equipped, equipping a two-handed sword clears the shield flag in the ledger and the response lists one weapon and no shield; equipping a second armour of the same type clears the first.
