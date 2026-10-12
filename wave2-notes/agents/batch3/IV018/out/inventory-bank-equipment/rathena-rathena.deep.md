# rathena-rathena (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/rathena-rathena/src/map (pc.cpp, pc.hpp, storage.cpp, unit.cpp) | Licence: GNU GPL v3 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; storage.cpp header: "Licensed under GNU GPL") — clean-room, shape only | C++ | symbol pc_equipswitch

Checked: read pc.cpp 693-712 (equip_bitmask, partial), 1850-1880 (pc_isequip, start), 2129-2150 (canequip_tick init), 5721-5785 (pc_checkadditem, pc_inventoryblank), 5991-6080 (pc_additem), 12015-12215 (pc_equipitem), 12398-12470 (pc_unequipitem, start), 12500-12600 (pc_equipswitch, pc_equipswitch_remove); pc.hpp 73-96 (equip_index enum); unit.cpp 2518-2528 (cast-time equip lock); storage.cpp 1-5, 185-420 (canAddItem, canGetItem, storage_additem, storage_delitem, storage_storageadd, storage_storageget, storage_storageaddfromcart). Callers of pc_equipitem read: pc.cpp 6073 (auto-equip), 12512 and 12553 (switch). Not read: pc_isequip past 1880, pc_unequipitem past 12470, the packet functions (clif_*), the ammo rule, guild and premium storage, item DB flags (grep names only), the client. The equip, switch and stacking math is high confidence; the defect in section 6 is medium (reachability depends on pc_isequip refusing a parked item, not tested). Loot presentation (drop ceremony, rarity display) not in these files.

Best transferable idea: Keep a second, reversible loadout: exchanging a parked item displaces whatever it covers, and the displaced items become the parked set, so one action swaps a whole kit.
Decision (proposed): adapt — take the loadout exchange as a server-side action with a plan-first check; keep the bitmask slot model; do not copy the donor's order (it removes the parked item before its equip can fail, and ignores results). Why: Frankendom can swap a Pit kit and a world kit in one step, but the exchange must be one server-verified change under the one-ledger ruling.
Acceptance: a server test gives a hero a worn two-hand weapon and a parked bow: exchanging the bow puts it on and parks the weapon; if the parked item fails the class check, the exchange is refused and both the worn and parked lists are unchanged.

## 1. Mechanism

Equip (pc_equipitem, src/map/pc.cpp:12015-12171). Order of operations:
1. Index and cooldown checks (12015-12039): an out-of-range index is refused (12023-12031); a cooldown tick refuses (12032-12039).
2. The item's position comes from its equip point (12043). pc_isequip gates it (12048-12057), with a permission bypass (pc.cpp:1858).
3. The requested position must cover the item's position and the item must not already be worn (12064-12071). A status that blocks equipping refuses it (12072-12079).
4. Placement. Accessories take the free ear or ring when both are offered (12088-12091); a card on the accessory can force its slot (12093-12107). A dual-wield weapon takes the free hand (12108-12115).
5. Switch branch (12135-12150): if equipswitch, the item is parked; each covered slot's previous parked item is removed from the switch set (12137-12144) and the item's switch mask is written (12148).
6. Worn branch (12152-12170): for each covered slot, an occupant is unequipped first (12154-12155, with flags 1|2|4), then the slot is set to the item (12157), the item's worn mask is written (12170). The item leaves the switch set (12161).

Unequip (pc_unequipitem, pc.cpp:12398-): refuses an empty item (12407-12410) and a status that blocks unequip unless flag bit 2 is set (12412-12417). It clears every slot the item covers (12422-12425), then updates weapon, shield and shoe looks.

Equip switch (pc_equipswitch, pc.cpp:12500-12578). Input: a parked item. Its target mask is its switch mask (12502).
- If nothing worn sits on the target, the parked item is removed from the switch set and equipped at its position (12508-12514).
- Otherwise: collect every worn item that intersects the target, remember its worn mask, unequip it (12519-12535); OR the combined mask (12537); for every parked item that intersects it, remove it from the switch set and equip it (12540-12555); finally park each displaced worn item in the switch set at its old mask, rebuilding the slot cache (12557-12574). One call swaps whole kits, and calling it again swaps back.

Stack identity and add (pc_additem, pc.cpp:5991-6080). Checks in order: amount and stack limit (6004-6009), weight (6011-6013), then the stack search: same nameid, bound flag, unique id and card array (6019-6025); a stack above the usable slot count is refused (6029-6031); the amount is added in place (6032). If no stack takes it, the first free slot below the usable slot count is used (6041-6047). Weight is added after placement (6069), then auto-equip (6072-6073).

Storage (storage.cpp). Add to storage (storage_storageadd, 334-358): validate the source row (340, canAddItem 189-206), then storage_additem (241-296): per-item stack limit (251), stack onto the first matching row across all rows, and refuse, not partial-fill, on overflow (264-277), refuse when every slot is used (279-280), else the first free slot (283-295). Only on success is the inventory amount removed (344-346). On failure the client gets the source slot again (356-357). Get from storage (storage_storageget, 367-384): pc_additem first (378), storage_delitem only on success (379); failure sends the reason code (382).

## 2. Key functions

- pc_equipitem, src/map/pc.cpp:12015-12171: placement, occupant unequip, switch branch.
- pc_unequipitem, src/map/pc.cpp:12398: clear the slots, flags, status block.
- pc_equipswitch and pc_equipswitch_remove, src/map/pc.cpp:12500-12599: the loadout exchange.
- pc_additem, src/map/pc.cpp:5991-6080: stack identity, weight, usable slots.
- pc_checkadditem, src/map/pc.cpp:5729-5764: a pre-check for the same add.
- storage_additem and storage_storageadd / storage_storageget, src/map/storage.cpp:241-384.
- equip_bitmask and equip_index, src/map/pc.cpp:693 and src/map/pc.hpp:73-96.

## 3. Numbers vs mechanism

- Worn slots: 21 indices (equip_index from ACC_L to SHADOW_ACC_L, src/map/pc.hpp:75-95; EQI_MAX at 96). Each slot is a bit in a mask (equip_bitmask, pc.cpp:693).
- Cooldown: canequip_tick is set at login (pc.cpp:2146) and by one cast lock, CG_ARROWVULCAN, set to tick plus cast time (src/map/unit.cpp:2525). The check is at pc.cpp:12032.
- Stack identity: nameid, bound, unique id, cards (pc.cpp:6021-6025). Usable slots: status.inventory_slots (6029, 6045; pc_inventoryblank counts only these, 5779).
- Stack limit: per item (data->stack.inventory at 6006; data->stack.storage at storage.cpp:251).
- Worked check (run on the VPS against the sketch): worn two-hand weapon on slots 3 and 4 (mask 24), parked bow with mask 24. Exchange: bow worn on slots 3 and 4, weapon parked on 3 and 4. With a class check that refuses the bow: exchange returns null and nothing moves. Two cards that differ give two different stacks.

## 4. TypeScript sketch

simplified: slots are bit indices 0..7 instead of the donor's 21 EQI entries; no job or level rules (pc_isequip), bound-on-equip, card-forced accessory slot, ammo rule, cooldown tick, or client packets. Models pc_equipitem's occupant unequip (pc.cpp:12152-12159), pc_equipswitch's exchange (pc.cpp:12500-12578) and pc_additem's stack identity (pc.cpp:6019-6025). Reorders the donor: it unequips the interfering worn items first, removes the parked item before its equip, and ignores each later pc_equipitem result; the sketch checks every incoming item before any change and applies the whole exchange or nothing.

```ts
export {};

interface Item {
  id: number;
  bound: boolean;
  uniqueId: number;
  cards: number[];
  equipMask: number;   // slots it occupies while worn (0 = not worn)
  switchMask: number;  // slots it is parked for in the spare set (0 = not parked)
}

interface Loadout {
  items: Map<number, Item>;
  worn: number[];   // per slot bit: item id or -1
  spare: number[];  // per slot bit: spare-set item id or -1
}

const bitsOf = (mask: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) if (mask & (1 << i)) out.push(i);
  return out;
};

// Stack identity: same id, bound flag, unique id and cards (pc.cpp:6019-6025)
export function sameStack(a: Item, b: Item): boolean {
  return a.id === b.id && a.bound === b.bound && a.uniqueId === b.uniqueId &&
    a.cards.length === b.cards.length && a.cards.every((c, i) => c === b.cards[i]);
}

function unwear(l: Loadout, id: number): void {
  const it = l.items.get(id);
  if (it === undefined) return;
  for (const i of bitsOf(it.equipMask)) if (l.worn[i] === id) l.worn[i] = -1;
  it.equipMask = 0;
}

function wear(l: Loadout, it: Item, mask: number): void {
  for (const i of bitsOf(mask)) {
    const occupant = l.worn[i];
    if (occupant !== -1) unwear(l, occupant); // slot taken: the occupant comes off first
  }
  for (const i of bitsOf(mask)) l.worn[i] = it.id;
  it.equipMask = mask;
}

// Exchange the worn set with the spare set for one parked item. Returns the changed ids, or null when
// any incoming item cannot be worn (then nothing changes).
export function exchange(l: Loadout, id: number, canWear: (it: Item) => boolean): number[] | null {
  const target = l.items.get(id);
  if (target === undefined || target.switchMask === 0) return null;

  const displaced = new Set<number>();
  for (const i of bitsOf(target.switchMask)) if (l.worn[i] !== -1) displaced.add(l.worn[i]);
  let combined = target.switchMask;
  for (const d of displaced) combined |= l.items.get(d)?.equipMask ?? 0;

  const incoming = new Set<number>();
  for (const i of bitsOf(combined)) if (l.spare[i] !== -1) incoming.add(l.spare[i]);
  for (const sid of incoming) {
    const it = l.items.get(sid);
    if (it === undefined || !canWear(it)) return null; // plan first: nothing has changed yet
  }

  // apply: displaced worn items come off, parked items go on, displaced items are parked in their place
  const changed: number[] = [];
  const oldMask = new Map<number, number>();
  for (const d of displaced) {
    oldMask.set(d, l.items.get(d)?.equipMask ?? 0);
    unwear(l, d);
  }
  for (const sid of incoming) {
    const it = l.items.get(sid);
    if (it === undefined) continue;
    for (const i of bitsOf(it.switchMask)) if (l.spare[i] === sid) l.spare[i] = -1;
    const m = it.switchMask;
    it.switchMask = 0;
    wear(l, it, m);
    changed.push(sid);
  }
  for (const [d, m] of oldMask) {
    const it = l.items.get(d);
    if (it === undefined) continue;
    it.switchMask = m;
    for (const i of bitsOf(m)) l.spare[i] = d;
    changed.push(d);
  }
  return changed;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/iv018/rathena-rathena-equipswitch.ts): exit 0. Worked example (compiled copy on the VPS): exchange of bow (2) with greatsword (1) returns [2, 1], worn slots 3 and 4 = 2, spare slots 3 and 4 = 1. With the refusal: null, worn and spare unchanged. sameStack with different cards: false.

## 5. Lands in

Target: origins/inventory/equip-switch.ts (proposed; the Frankendom repo was not opened for this note) for the loadout exchange and the mask model; the stack identity function belongs next to it in origins/inventory/stack.ts. Parity row 15 (gear dressing: what a slot change does to the dressed hero).

## 6. Gaps and risks

- Frankendom rulings: one ledger (the exchange is one server-side change), server-verified (the class check runs before any change), zones as data (not zone-specific). Client presentation is client-only.
- Defects (idea kept, fix in the sketch):
  1. The switch exchange removes the parked item before its equip can fail (pc.cpp:12550 removes, 12553 equips) and ignores the result of pc_equipitem (12553) and of pc_unequipitem (12533). If an incoming item is refused, it ends up neither worn nor parked, while the displaced worn items are still parked (12557-12574). Fix: check every incoming item first and change nothing unless all pass, as the sketch does. Reachability depends on pc_isequip refusing a parked item (not tested).
  2. The check-add pre-check ignores cards. pc_checkadditem compares only nameid (pc.cpp:5752), and its own FIXME says so (5751), while pc_additem compares cards (6025). The pre-check can report a stack the add does not use. Fix: one identity function for both, as sameStack in the sketch.
  3. storage_storageadd ignores the result of pc_delitem (storage.cpp:346) after storage_additem has already added the item. The amount was checked in the same call (196), so this is a guard risk, not a demonstrated bug. Fix: check the result and undo the storage add on failure.
- Design choices to decide, not bugs: the occupant unequip uses flag 2, which bypasses the status block that stops unequipping (pc.cpp:12155 with 12412), so equipping over a slot can override a no-unequip status; the cast lock covers only CG_ARROWVULCAN (unit.cpp:2525); storage stacks refuse on overflow rather than fill partially (storage.cpp:267-268).
- Not modelled: job and level rules, bound-on-equip, card-forced accessory slot, ammo unequip, guild and premium storage, the packet layer, the item DB flags beyond names.

Reuse tag: shape-reuse candidate (GPL-3.0, clean room; no code copied).
Brief rule served: judge the idea, not the genre; keep the idea and fix the defects (addendum rule of 2026-10-10); one ledger and server-verified exchange per the ruling.
