# daggerfall-unity (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` | Licence: MIT (read: `/mnt/frankendom-donors/daggerfall-unity/LICENSE` line 1 "MIT License", line 3 "Copyright (c) 2009-2023 Daggerfall Workshop") | C# | symbol `ItemEquipTable.EquipItem`

Checked: The cell hint was INFERRED. The real mechanism was found by grep for `EquipItem`, `Transfer`, `SplitStack` and `IsStackable` under `Assets/Scripts`, not in the hint area. Files opened: `ItemEquipTable.cs` (23-46, 80-214, 246-310, 353-372, 406-470, 599-654; the whole EquipItem path), `ItemCollection.cs` (26-92, 217-327, 473-487, 693-722), `DaggerfallUnityItem.cs` (255-265, 681-704), `DaggerfallInventoryWindow.cs` (1322-1400, 1540-1585), `ItemEnums.cs` (105-135), and the grep of all `.EquipItem(` and `.Transfer(` callers. Not read: `GetJewellerySlot` and the clothing slot selectors (ring/amulet/clothing choice), `FormulaHelper.IsItemStackable` (FormulaHelper.cs 2096 onward), `StartEquippedItem` / `StopEquippedItem` (enchantment hooks), `SerializeEquipTable`, the window's paper-doll refresh, and `UpdateEquippedArmorValues`. Confidence high on the hand exclusivity, the order of steps and the displaced-list return; medium on the jewellery slot rule (not read). Depth full for the equip mechanism. Camera: n/a. Confidence on the defects: high (read in code; the dormant one is confirmed by a grep of every caller).

## 1. Mechanism

- One call, `EquipItem(item, alwaysEquip = true, playEquipSounds = true)` (ItemEquipTable.cs 94), decides the target slot, clears whatever must go, writes the item in, and returns the list of items it took off. The caller uses that list to take their stat value away before the new item's value is added.
- Order of steps, as the code runs:
  (a) Null item returns null (96-97).
  (b) Resolve the target slot before anything changes: `GetEquipSlot` (100). It uses the item's own slot if a custom item sets one; otherwise by item group: armour through `GetArmorSlot` (406-433; cuirass to chest armour at 411), weapons through `GetWeaponSlot` (435-456). If the slot is None, return null (101-102).
  (c) If the item is a stack, split one off with `PlayerEntity.Items.SplitStack(item, 1)` (105-106). This is the player's bag, not necessarily where the item is (see defect D2).
  (d) Weapons: arrows are refused and return null (114-115). A two-handed weapon (hands = Both) clears the left hand (120) and the right hand (121), each item going into the returned list.
  (e) A shield (hands = LeftOnly) clears a two-handed weapon in the right hand, if one is held (130-131).
  (f) If the target slot is taken and `alwaysEquip` is false, return null (135-136). This check happens AFTER step (d) and (e) have already changed the hands (defect D1). With the current callers it never fires (all pass true or use the default).
  (g) Otherwise clear the target slot and add its item to the list (138).
  (h) Set `item.EquipSlot = slot` (141) and `equipTable[slot] = item` (142). Play the equip sound if asked (145-146). Start the item's enchantments (149, not read in detail).
  (i) Return the list (153).
- Who uses the list (`DaggerfallInventoryWindow.EquipItem`, 1383-1390): for each displaced item, remove its armour value (1388); then add the new item's armour value (1390). Removal first, then addition.
- Hand rules (`GetItemHands`, 599-626): the daggers through the mace are Either-hand (612-622, Dagger at 612); the two-handers are Claymore, Dai_Katana, War_Axe, Staff, Flail and Warhammer (625, Claymore at 625); the bows are Both or LeftOnly depending on the setting `BowLeftHandWithSwitching`; the four shields (Buckler, Round, Kite, Tower) are LeftOnly. Anything else uses the custom item's own value or None.
- Weapon slot (`GetWeaponSlot`, 435-456): if a two-hander is in the right hand and the new item is not LeftOnly, the new item goes to the right hand (439) and so displaces the two-hander. Otherwise: RightOnly or Both to the right hand; LeftOnly to the left hand; Either goes to `GetFirstSlot(right, left)` (297-305), which takes the first open hand, else the right hand (299).
- Equipped state: an item is equipped when its `equipSlot` is not None (DaggerfallUnityItem.cs 260). Equipped items stay in the item collection: `EquipItem` makes no `RemoveItem` call (the file has none), and `DeserializeEquipTable` finds equipped items by UID in the collection (363). Equipped items never stack (DaggerfallUnityItem.cs 691).
- Tick: none. This is a synchronous action from one click on the inventory window.

## 2. Key functions

- `EquipItem`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` 94-153. Resolve slot, split stack, hand exclusivity, refusal check, replace, return displaced list.
- `GetEquipSlot`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` 246-280 (read in full).
- `GetWeaponSlot`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` 435-456.
- `GetFirstSlot` / `IsSlotOpen`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` 282-305.
- `GetItemHands`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` 599-626 (the list continues to 654).
- `UnequipItem(slot)`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/ItemEquipTable.cs` 193-214 (clears the entry and the item's slot; returns the item).
- Window caller: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallInventoryWindow.cs` 1322-1391.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Resolve the target slot first, from the item's kind and the hands it needs | Slot names by item group (theirs, 406-456) |
| A two-hander clears both hands, a shield clears a two-hander in the right hand | Two-hander list (theirs, 625); shield list (theirs, GetItemHands shield cases; the line numbers are not receipted) |
| Taken slot: clear it and return the item, or refuse when told not to replace | Refusal flag `alwaysEquip` (theirs, 94); the check at 135 |
| Return the displaced list; caller removes its stat value before adding the new one | Armour value calls (theirs, 1388, 1390) |
| Equip table size | 27 entries (theirs, ItemEquipTable.cs 27) |
| Right hand and left hand slot indices | RightHand 19 and LeftHand 21 (theirs, ItemEnums.cs 127 and 129; the enum values are the table indices) |
| Open slot test | Table entry is null (theirs, 287) |
| Bow left-hand switching | Setting `BowLeftHandWithSwitching` (theirs, GetItemHands) |

## 4. TypeScript sketch

simplified: keeps the donor order of decisions (resolve the slot, then hand exclusivity, then replace the target slot, then return the displaced list) and fixes defect D1 by checking the refusal before any hand is changed. It omits: the custom item slot override; the stack split (defect D2; the sketch takes a single item); the jewellery and clothing slots (not read) and the two-slot pairs; the arrow and bow setting beyond a flag; the enchantment start and stop; equip sounds; and the armour-value calls the caller makes (the sketch returns the list for that).

```ts
// Licence: MIT (donor, Daggerfall Unity). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Equip: resolve the target slot first, apply hand exclusivity, refuse before any change if the slot is taken and not replaceable, and return the displaced items.

export {};

type Hands = "none" | "either" | "both" | "leftOnly" | "rightOnly";
type Slot = "RightHand" | "LeftHand" | "Head" | "ChestArmor" | "Feet" | "Other";

interface Item {
  name: string;
  slot: Slot | "none";      // fixed slot for armour; "none" for weapons and shields (resolved from hands)
  hands: Hands;             // weapons and shields
  isArrow?: boolean;        // arrows cannot be equipped
  equippedSlot?: Slot;      // set while equipped
}

type Table = Partial<Record<Slot, Item>>;

interface EquipResult { ok: boolean; displaced: Item[]; }

// Donor GetEquipSlot / GetWeaponSlot / GetFirstSlot, simplified.
// A two-handed weapon in the right hand is replaced by any non-shield weapon.
// An either-hand weapon takes an open hand, else the right hand.
function resolveSlot(table: Table, item: Item): Slot | undefined {
  if (item.hands === "none") return item.slot === "none" ? undefined : item.slot;
  const right = table.RightHand;
  if (right !== undefined && right.hands === "both" && item.hands !== "leftOnly") return "RightHand";
  switch (item.hands) {
    case "both":
    case "rightOnly":
      return "RightHand";
    case "leftOnly":
      return "LeftHand";
    case "either":
      if (table.RightHand === undefined) return "RightHand";
      if (table.LeftHand === undefined) return "LeftHand";
      return "RightHand";
    default:
      return undefined;
  }
}

// Fix of donor defect D1: the refusal check runs before any hand is changed.
function equip(table: Table, item: Item, alwaysEquip: boolean = true): EquipResult {
  if (item.isArrow) return { ok: false, displaced: [] };

  const slot = resolveSlot(table, item);
  if (slot === undefined) return { ok: false, displaced: [] };

  if (table[slot] !== undefined && !alwaysEquip) return { ok: false, displaced: [] };

  const displaced: Item[] = [];
  const takeOff = (s: Slot): void => {
    const old = table[s];
    if (old !== undefined) {
      old.equippedSlot = undefined;
      delete table[s];
      displaced.push(old);
    }
  };

  // Hand exclusivity: a two-hander takes both hands; a shield or left-only item removes a two-hander in the right hand.
  if (item.hands === "both") {
    takeOff("LeftHand");
    takeOff("RightHand");
  }
  if (item.hands === "leftOnly" && table.RightHand !== undefined && table.RightHand.hands === "both") {
    takeOff("RightHand");
  }

  takeOff(slot);
  table[slot] = item;
  item.equippedSlot = slot;
  return { ok: true, displaced };
}

// Smoke check (not a test): a kite shield is replaced by a two-handed war axe, and the shield comes back as displaced.
const t: Table = {};
const shield: Item = { name: "kite shield", slot: "none", hands: "leftOnly" };
const axe: Item = { name: "war axe", slot: "none", hands: "both" };
equip(t, shield);
const r = equip(t, axe);
const ok: boolean = r.ok && r.displaced.length === 1 && r.displaced[0] === shield
  && t.LeftHand === undefined && t.RightHand === axe;
void ok;
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/daggerfall-equip-hands.ts` on the VPS, exit 0 (run in this session). A negative control (a deliberate string-to-number error) on the same VPS tsc exited 1, so the check is real.

## 5. Lands in

- TARGET `src/fight/equipment.ts` (proposed new module; the current Frankendom equipment code was not read, so this is a proposal). The equip step: resolve, exclusivity, refuse-before-change, displaced list.
- Parity-checklist row 15 (gear dressing). The cell's hint said row 18, but this rule decides what is dressed on the hero (the two-hander leaves the hero's left hand empty), so row 15 is the honest fit; row 18 is the loot pickup side (see the crawl-crawl note).
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is clean-room)
- Brief rule served: one ledger (the displaced items and the stat change happen in one step); rules 7-9 n/a

Best transferable idea: equipping resolves the target slot first, clears the hands a two-hander or shield needs, refuses before changing anything if the slot is taken and replacement is not allowed, and returns the displaced items so the caller can take their stat value off before adding the new one.
Decision (proposed): adapt — keep the hand exclusivity rules, the refuse-before-change check and the displaced-list return, and the remove-before-add order for stats; drop the 27-slot table, because Frankendom's equipment slots are its own and the donor's bow setting is a client option.
Acceptance: the hero holds a kite shield and the player equips a two-handed war axe: the shield leaves the left hand on the paper doll in the same frame, the armour line drops by the shield's value and nothing is added for the axe, and the shield appears in the bag. A server test asserts that equipping the axe returns exactly the shield in the displaced list, leaves the left hand empty and the right hand holding the axe, and that a refused equip (slot taken, replacement not allowed) changes no slot at all.

## 6. Gaps and risks

- MIT: adaptation is allowed. This note's sketch is still written from the described order, and the donor lines are cited for rules and numbers only.
- Defect D1 (refusal after change, dormant). `EquipItem` clears a two-hander or a shield (118-131) before the `alwaysEquip` refusal (135-136). A refused equip returns null but has already removed the hand items, and the caller ignores the list. No caller passes `alwaysEquip = false` (grep of every `.EquipItem(` call: all pass true or use the default). fix: compute the full set of cleared slots first; return null before any `UnequipItem` call when the target is taken and replacement is not allowed. The sketch does this.
- Defect D2 (dormant). `EquipItem` splits a stack from `PlayerEntity.Items` (106) whatever collection holds the item. `SplitStack` returns null if the stack is not in that collection (ItemCollection.cs 263), and the next line that reads `item.ItemGroup` (111) then dereferences null. fix: split from the collection that holds the item (pass it in) and return null if the split fails. Current callers equip single items, so this does not fire in the donor.
- Defect D3 (transfer, relevant to moves). `ItemCollection.Transfer` removes the item from the source (478) before `AddItem` (479). `AddItem` refuses an item whose UID is already in the destination with only a log line (235). The item is then gone from the source and not added. fix: check the destination first (UID not present), then add, then remove from the source; or make `Transfer` return a bool and leave the source alone on failure. The donor's window calls `Transfer` at 1579 without checking the result.
- Defect D4 (stacks). `AddItem` merges stacks with no maximum; the author's TODO says so (ItemCollection.cs 223). Frankendom needs a stack cap as data.
- Equipped items stay in the bag collection with a slot flag (`EquipSlot`) and a table reference. That is two places for one item. Frankendom's one-ledger rule needs one truth: pick the bag with a slot field, or a separate equip table, not both, and test that a move cannot leave the item in both.
- Two-slot pairs (rings, amulets, bracelets, bracers, marks, gems: slots 0 and 1 of each) are chosen by `GetFirstSlot`, but the jewellery selector was not read, so the exact rule is unverified.
- The bow setting (`BowLeftHandWithSwitching`) changes which hand a bow uses; Frankendom should treat that as a data flag, not a constant.
- Not verified: the enchantment start and stop on equip (149), the armour-value function bodies, and the paper-doll refresh.
