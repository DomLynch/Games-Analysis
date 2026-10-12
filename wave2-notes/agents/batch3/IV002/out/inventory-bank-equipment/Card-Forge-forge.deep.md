# Card-Forge-forge (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/player/AdventurePlayer.java` (with `data/ItemData.java`, `data/ItemListData.java`, `util/Current.java`, `scene/InventoryScene.java`, `stage/GameStage.java`) | Licence: GPL-3.0 (`LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007"; `AdventurePlayer.java` has no licence header, lines 1-3 checked) | Java | symbol `AdventurePlayer.equip`

Checked: read: `AdventurePlayer.java` 210-249 (`setSelectedDeckSlot`), 276-302 (`getItems`, `getItemFromInventory`, `getEquippedItem`), 1189-1205 (`getRandomEquippedItem`), 1331-1351 (`removeItem`, `equip`), 1398-1409 (`addItem`), 513-532 (load of the doll), 836-846 (save of the doll), 896-901 (save of loadouts, first lines only); `ItemData.java` 14-40 and 86-100; `ItemListData.java` 18-26; `Current.java` 30-50 (`generateDefeatMessage`: the crack is lines 39-42; the rest of the method after line 49 was not read); `InventoryScene.java` 222-254 (`delete`, `equip`), 352-370 (button state), 450-462 (overlay). Callers of `equip`: `InventoryScene.java:252` (read), `Current.java:42` (read), `ConsoleCommandInterpreter.java:539` (a debug "crack" command, read). Callers of `generateDefeatMessage`: `GameStage.java` 719 and 743 (grep only; surrounding code not read). Not read: `ensureDeckLoadoutsSize`, the repair flow behind `InventoryScene.java` 370, the `CardPool`/`ItemPool` classes behind `cards.add(card, amount)` (line 966), and libGDX `Array.random()` (assumed uniform). Confidence: high on equip, loadouts, removal and the crack pool; medium on how much the displaced-item flag matters (readers checked, none found in code read). Camera: not applicable. Receipts: 35, `verify_receipts.py` passed.

Best transferable idea: Store worn gear as a map from slot name to one item-instance id, make equip a toggle, and save and restore that map per deck by id, so a loadout is a few ids and not copies of items.
Decision (proposed): adapt — the slot map and the by-id loadouts fit gear dressing (row 15) and the one-ledger ruling; we keep the toggle and the per-deck loadouts, but a missing id becomes a logged refusal, the displaced item's flag is cleared, and the random defeat crack is not ported as a default.
Acceptance: A player taps a worn Body item, which comes off; taps a second Body item, and the first returns to the bag; a server test asserts that after a deck switch with bound loadouts each slot holds the id saved for that deck, and a saved id that no longer exists is reported in the log, not skipped silently.

## 1. Mechanism

- **Instances, not stacks.** The catalogue hands out a clone of the stored item (`ItemListData.getItem`, line 23). `ItemData.clone` gives each clone a fresh random id (line 96). `addItem` appends that clone to the bag list (1405). Copies are separate entries; the code read has no stacking and no capacity limit on the list.
- **The doll.** `equippedItems` maps a slot name (`ItemData.equipmentSlot`) to the id of one item (74). Each item also has an `isEquipped` flag (27) and an `isCracked` flag (26).
- **Equip (toggle).** `equip(item)` (1341-1351) reads the id now in the item's slot (1342). If it is this item's id, the item comes off: flag false and the slot entry removed (1343-1345). Otherwise the item's flag is set true (1347) and `put(slot, id)` replaces whatever id was there (1348). Nothing in `equip` clears the displaced item's flag, so it stays true. `onEquipmentChange` is emitted (1350).
- **Reads.** `getEquippedItem(id)` (292-302) returns an item only if its id is in the bag and its flag is true. Callers pass ids taken from the slot map (for example `getRandomEquippedItem`, 1191-1192). The overlay in `InventoryScene` (457) needs both the flag and map membership. The button text (361-362) reads the slot map and the flag.
- **Remove.** `removeItem(item)` (1331-1339) takes the item out of the bag (1334). If its id is in the equipped map and the bag no longer holds the item (`getEquippedItems().contains(item.longID) && !inventoryItems.contains(item)`, 1335), it clears `item.isEquipped` itself (1336) and removes the map entry (1337). `InventoryScene.delete` also clears the flag before calling it (238), but that is redundant.
- **Bound loadouts on deck switch** (`setSelectedDeckSlot`, 214-249). Only if the setting `bindEquipmentLoadoutsToDecks` is on (216) and the slot changed. (1) Save the current map as the old deck's loadout (220). (2) Clear every item's flag (223-227) and the map (228). (3) For the new deck's saved map, look each id up in the bag (234). If found, set the flag and put the id back in the slot (236-237). If not found, nothing happens: the `if (item != null)` at 235 skips it silently. (4) Emit `onEquipmentChange` (242).
- **Save and load.** The doll is saved as two parallel arrays, slot names and ids (839-844). On load, each saved id is looked up in the bag (521); if it is missing the entry is not restored (522).
- **Defeat crack.** `Current.generateDefeatMessage` (35-42) runs on both defeat calls (`GameStage` 719 and 743). (1) Pick one random worn item (`getRandomEquippedItem`, 1189-1204). On hard or insane every worn slot is a candidate (1195-1196). On easy and normal only `Boots`, `Body` and `Neck` are (1200). (2) If the setting `disableCrackedItems` is off (40), mark it cracked (41). (3) Take it off by calling `equip` (42). That is a toggle-off, because the item is in its own slot. A cracked item's equip button is disabled in the UI (`InventoryScene` 355-356). The repair flow was not read.
- **Tick.** None. Everything is an event handler: equip, remove, deck switch, defeat.

## 2. Key functions

- `equip`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/player/AdventurePlayer.java` 1341-1351. The toggle and slot replacement.
- `setSelectedDeckSlot`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/player/AdventurePlayer.java` 214-249. Save, clear, restore by id.
- `getRandomEquippedItem`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/player/AdventurePlayer.java` 1189-1205. Difficulty-gated candidate list, then a random pick.
- `removeItem`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/player/AdventurePlayer.java` 1331-1339.
- `generateDefeatMessage`, crack block: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/util/Current.java` 35-42.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Slot map: one item id per slot; equip toggles off if the same item is in its slot (AdventurePlayer 1342-1348) | Slot names as strings: "Boots", "Body", "Neck" (1200); "Ability1"/"Ability2" also used (read in grep only) |
| Per-deck loadout = a saved copy of the map; restore by id, skip ids that are gone (220, 231-237) | Setting `bindEquipmentLoadoutsToDecks` (216) |
| Instance id = random 64-bit value (ItemData 96) | None |
| Defeat: pick one random worn piece, mark it cracked, take it off (Current 39-42) | One piece per defeat (the `random()` pick, 1204); easy/normal candidate slots "Boots", "Body", "Neck" (1200); hard/insane every worn slot (1195-1196); setting `disableCrackedItems` (40) |

## 4. TypeScript sketch

simplified: keeps the donor order for equip (toggle off if the same item is in its slot, else replace the slot and set the flag), for a deck switch (save the old doll, clear the flags and the doll, restore by id), and for the defeat pick (candidates by difficulty, one uniform pick, mark cracked, take it off). It changes three donor behaviours on purpose: it clears the displaced item's flag (the donor leaves it true); it refuses to equip a cracked item in the engine (the donor only disables the UI button); and `switchLoadout` returns the missing ids for logging (the donor skips them). It omits: save and load file format, the `onEquipmentChange` signal, the setting checks (the bind setting is assumed on and `disableCrackedItems` is a parameter), the catalogue clone (ids are assigned in `add`), `ensureDeckLoadoutsSize`, the repair flow, the debug "crack" command, the abilities slots, and the rest of `generateDefeatMessage`.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
type Slot = string; // e.g. "Body", "Boots", "Neck", "Ability1"

// One entry per item instance. Each copy gets its own id; nothing stacks.
interface Item { id: number; name: string; slot: Slot | null; equipped: boolean; cracked: boolean; }

const EASY_SLOTS = new Set<Slot>(["Boots", "Body", "Neck"]);

class Gear {
  readonly items: Item[] = [];
  readonly worn = new Map<Slot, number>();          // the paper doll: slot -> item id
  private readonly loadouts = new Map<number, Map<Slot, number>>(); // deck index -> doll
  private nextId = 1;

  add(name: string, slot: Slot | null): Item {
    const it: Item = { id: this.nextId++, name, slot, equipped: false, cracked: false };
    this.items.push(it);
    return it;
  }

  byId(id: number): Item | undefined { return this.items.find(i => i.id === id); }

  // Toggle: the item already in its slot comes off; otherwise it goes on and replaces what was there.
  // Cracked items cannot be worn (the donor's UI disables the button; this sketch checks in the engine).
  equip(item: Item): void {
    if (item.slot === null || item.cracked) return;
    const current = this.worn.get(item.slot);
    if (current === item.id) {
      this.unwear(item);
    } else {
      const displaced = current === undefined ? undefined : this.byId(current);
      if (displaced) displaced.equipped = false; // the donor leaves this flag set
      item.equipped = true;
      this.worn.set(item.slot, item.id);
    }
  }

  private unwear(item: Item): void {
    item.equipped = false;
    for (const [slot, id] of this.worn) if (id === item.id) this.worn.delete(slot);
  }

  // Removing an instance also takes it off the doll.
  remove(item: Item): void {
    const at = this.items.indexOf(item);
    if (at >= 0) this.items.splice(at, 1);
    this.unwear(item);
  }

  // Deck switch with bound loadouts: save the doll for the old deck, clear, restore by id.
  // Returns the saved ids that are no longer in the bag, so the caller can log them.
  switchLoadout(from: number, to: number): number[] {
    this.loadouts.set(from, new Map(this.worn));
    for (const it of this.items) it.equipped = false;
    this.worn.clear();
    const missing: number[] = [];
    const saved = this.loadouts.get(to);
    if (!saved) return missing;
    for (const [slot, id] of saved) {
      const it = this.byId(id);
      if (it) { it.equipped = true; this.worn.set(slot, id); } else { missing.push(id); }
    }
    return missing;
  }
}

// Defeat: one random worn piece is cracked and taken off. Easy and normal roll only Boots, Body and Neck.
function crackOnDefeat(g: Gear, hardOrInsane: boolean, disabled: boolean, rand: () => number): Item | null {
  if (disabled) return null;
  const candidates: Item[] = [];
  for (const [slot, id] of g.worn) {
    const it = g.byId(id);
    if (it && (hardOrInsane || EASY_SLOTS.has(slot))) candidates.push(it);
  }
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rand() * candidates.length)];
  pick.cracked = true;
  g.equip(pick); // item is in its own slot, so this toggles it off
  return pick;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/IV002-Card-Forge-forge-gear.ts`: exit 0.

## 5. Lands in

- TARGET `origins/gear/equipment-slots.ts` (proposed new module: the doll as a slot map of instance ids, the toggle, and per-deck loadouts; not checked against the current tree). Gear dressing belongs with the hero actor's dressing, not in the fight step.
- Parity-checklist row: **15** (gear dressing). It fits: the donor's doll is a slot-to-item map that the hero's look reads. Row 21 (catalogue fields) is the other option, for `equipmentSlot` as a catalogue field; row 15 is chosen because the mechanism is the worn state, not the catalogue.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only)
- Brief rule served: one ledger (each item instance has one id; a loadout stores ids, not copies); server-verified state (the toggle and the deck switch become server actions that refuse a cracked item); zones as data (the crackable slots become data, not a constant)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; do not copy the Java lines.
- Stale flag. `equip` leaves the displaced item's `isEquipped` true (1347-1348 with no clear). The readers checked (`getEquippedItem` 298 uses ids from the map; the overlay 457 needs map membership) hide the effect, so no visible bug was found in the code read. Frankendom must clear the flag in the same action as the slot change, and test it.
- Silent skip. A loadout id that is no longer in the bag is skipped without a record (235, 522). Our ruling needs a logged refusal: the sketch returns the missing ids for that reason.
- Random defeat crack. A random worn piece is cracked and taken off on every defeat, including a loss (both calls in `GameStage`, 719 and 743). This is a player-facing penalty that Frankendom has not decided on. Reject as a default. If the designer wants a death cost, it becomes a zone-data field (the candidate slots and the count) and is tested through the death step (row 17), not through inventory.
- Difficulty list is hard-coded in the donor (1195-1200). Frankendom should express the candidate slots as data.
- No weight, no slot count, no bag limit. The donor's bag is an unbounded list (1405). Frankendom's "weight and capacity" would need its own rule, which this donor does not supply.
- Card counts are a separate pool (`cards.add(card, amount)`, 966) with stacking by card. Not read further; it is a different shape from gear and not part of this note.
- The save path writes the current doll into the deck's loadout (896-900) with no setting check in the lines read, so a save taken while the bind setting is off still writes a loadout. Whether restore ignores it when the setting is off was not checked beyond line 216.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- removeItem condition and flag clear were misdescribed: real condition is `getEquippedItems().contains(id) && !inventoryItems.contains(item)` (1335) and removeItem sets `item.isEquipped = false` itself (1336); InventoryScene.delete (238) flag clear is redundant. Confirmed in donor. Fixed.
- Missed: the load path (513-533) clones an item and gives it a new id when `longID` is null (legacy-save id migration); not covered by the note. Worth a migration step in any Frankendom save loader.
- Missed: `deckLoadouts` is also maintained on deck delete, add, copy and reorder (`deleteDeck`, `addDeck`, `copyDeck`, `ensureDeckLoadoutsSize`, about 1561-1604); not mentioned.
- Everything else verified (equip toggle 1341-1351, setSelectedDeckSlot silent skip, getEquippedItem, getRandomEquippedItem, Current.java, callers, ItemData.clone, GPL-3.0).

Fixed 2026-10-12: Remove paragraph (removeItem condition, who clears the flag).
