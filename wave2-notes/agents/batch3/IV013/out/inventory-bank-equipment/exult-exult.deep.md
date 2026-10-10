# exult-exult (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/exult-exult/objs/contain.cc` (with `objs/objs.cc`, `actors.cc`, `drag.cc`, `gumps/Gump.cc`) | Licence: GPL-2.0-or-later (contain.cc header: "either version 2 of the License, or (at your option) any later version"; COPYING is GPL v2) | C++ | symbol `Container_game_object::add` and `add_quantity`

Checked: Read in full: `Container_game_object::add` (contain.cc 102-175), `add_quantity` (214-272), `create_quantity` (281-333), `get_weight` (541-553), `drop` (561-567), `get_max_volume` (70-72), `Game_object::get_volume` and `modify_quantity` (objs.cc 425-511), `get_weight` and `get_max_weight` (objs.cc 1097-1149), `Actor::get_max_weight` (actors.cc 3516-3518), `Actor::fits_in_spot`, `find_best_spot`, `Actor::add` and `add_readied` (actors.cc 1597-1760, 3626-3794), `Check_weight`, `start` (lift), `drop_on_gump` and `put_back` (drag.cc 224-240, 517-616), `Gump::add` head (gumps/Gump.cc 359-371), and the paperdoll weight text (Paperdoll_gump.cc 534-546). Data read as text: paperdol_info.txt, gump_info.txt; binary data files (equip.dat, container.dat, wgtvol.dat, ready.dat, armor.dat, weapons.dat) were not decoded. The hint file equip.dat is binary data, not the implementation. Callers read: Actor::add (3637-3671), add_readied (3749), Container::drop (566), drop_on_gump (603). I did not grep every `add(` caller in the tree. Searched objs/, gumps/, actors.cc, drag.cc, contain.cc for "bank": no hits; no bank container found. Not read: keyring.cc, `remove_quantity` (contain.cc 342+), the rest of `Dragging_info::start`, container paint code. Confidence: high on the add and fit path (read end to end); medium on the paperdoll spot table (field meanings in paperdol_info.txt not decoded). The defect examples are arithmetic: the exact values were run on the VPS, the donor values computed by hand; nothing was run in the game. camera_scope: n/a (not a camera cell).

Best transferable idea: Make every carry and drop check exact and enforced in the one ledger add, return the part that fitted (clamp-and-report), and lift an item out only as a transaction that puts it back on refusal.
Decision (proposed): adapt - take the clamp-and-report weight fit, the volume-as-own-size rule and the lift-then-put-back transaction; fix the integer fit, the drag tolerance, and the single-add path that skips the weight check; enforce every cap in the ledger add, not in the drag UI.
Acceptance: Drag 7 coins onto a bag with 1 tenth free: exactly the units that fit by exact weight move (3 in the constructed case), the rest stay in the source, and a server test asserts the ledger weight never exceeds the cap after any add, drop or put-back.

## 1. Mechanism

Order of operations for a container add (`Container_game_object::add`, contain.cc 102-175):
1. Refuse the main actor being put inside a container (112-113). Unless the check is skipped, refuse a container put inside itself and a locked container (116-122), and anything on fire (127-129). Always refuse a shape the container does not accept (123-125), and a loop where the object is its own ancestor (132-137).
2. If `combine` is set, try the stacks already inside first: `add_quantity(..., dontcreate=true)` merges into existing stacks (143-144). If everything merged, the source object is removed and the add returns true (145-151). If part merged, the source's quantity is reduced by the merged part (152-154). The header comment says exactly this (contain.cc 98).
3. Volume: `maxvol = get_max_volume()` (158). It is the container's own shape volume, or 0 (no limit) for extradimensional storage (70-72). Refuse when `objvol + volume_used > maxvol` (160-161). This is skipped when the check is skipped or in the hack mover.
4. Commit only after all checks: `volume_used += objvol` (164), set owner, append to the object list (165-166), inherit the "okay to take" flag (168-170).

Stack add (`add_quantity`, contain.cc 214-272), used for quantity items:
1. Gate: nothing to add, or the shape cannot go inside (222-224).
2. Weight clamp (226-242): the container's weight cap, in stones, times 10 (227-229), gives `avail` = cap minus the outermost carrier's total weight (230). If the stack's total weight is more than `avail` (232), the per-unit weight is estimated as `(10 * objweight) / delta` (235) and the units refused are `delta - (10 * avail) / weight1` (236). The clamp is not applied when the cap is 0 (no limit).
3. Merge into existing stacks of the same shape up to the stack limit (251-261; each merge through `modify_quantity`, which caps at 100).
4. Recurse into sub-containers with dontcreate (262-265).
5. Create new objects only for what is left (267-270). `create_quantity` (281-333) creates one object at a time through `add()` (302), so each new object is volume-checked. It stops at the first refusal (302-304).

Carry cap: `Actor::get_max_weight` is 2 times strength (actors.cc 3516-3517). An object's cap is its owner's cap, unless the owner is extradimensional; with no owner the cap is 0, meaning no limit (objs.cc 1137-1149). Weights are in tenths of a stone (objs.cc 1097 comment). An object's weight is quantity times shape weight (1105). Lightweight shapes (reagents, coins) are divided by 10 with a minimum of 1 (1106-1112). A container's weight is its own weight plus every contained object, recursively (541-553).

Stacks and volume: volume is the shape's volume, and the donor says quantity is ignored for volume (objs.cc 425-427; contain.cc 246-247). So one stack takes one object's volume, whatever its count. A stack holds at most 100 (objs.cc 321; `modify_quantity` caps at 478-479).

Actor slots and bags (paperdoll): `find_best_spot` (actors.cc 1717-1760) tries the preferred spot, then the alternates, then belt, backpack, back two-hander, back shield, left hand, right hand. `fits_in_spot` (1597-1676) checks occupancy and conflicts (two-handers, gloves, scabbard, neck, cloak) and ends with the paperdoll table (1675). `Actor::add` (3626-3671): when no spot is free, it tries the backpack, belt, left-hand and right-hand bags in order, each with the volume check (3636-3648). If all refuse and the check is not skipped, it refuses (3649-3651). If the check is skipped, it retries each bag without the volume check (3653-3665), then adds to the actor's own container (3671). `add_readied` (3720-3794) calls the base add with the volume check skipped (3749).

Lift and drop (drag.cc): `start` lifts the object out of its source before the drop (233). `drop_on_gump` refuses dropping a container into itself (581-586), checks range, runs `Check_weight` for party members (596), then calls add with combine on (603). On failure, the unmerged remainder goes back into the lifted object (607-610) and the cursor flashes "wontfit" (612). `put_back` returns the object to its source (546-562): for a gump source it re-adds with the volume check (552), then with the check skipped (553); a world object moves back to its old position (559).

Refusal feedback: each refusal has its own cursor shape and a sound: too heavy (drag.cc 534-537), out of range (588-590), red X (581-584), won't fit (612).

## 2. Key functions

- `Container_game_object::add`: `/mnt/frankendom-donors/exult-exult/objs/contain.cc` 102-175 (checks, combine, volume, commit).
- `Container_game_object::add_quantity`: same file, 214-272 (weight clamp, merge, recurse, create).
- `Container_game_object::create_quantity`: same file, 281-333 (one object at a time through add).
- `Container_game_object::get_max_volume` and `get_weight`: same file, 70-72 and 541-553.
- `Game_object::get_max_weight`, `get_volume`, `modify_quantity`: `/mnt/frankendom-donors/exult-exult/objs/objs.cc` 1137-1149, 425-428, 453-511.
- `Actor::get_max_weight`: `/mnt/frankendom-donors/exult-exult/actors.cc` 3516-3517.
- `Actor::find_best_spot`, `fits_in_spot`, `Actor::add`, `add_readied`: `/mnt/frankendom-donors/exult-exult/actors.cc` 1717-1760, 1597-1676, 3626-3671, 3720-3794.
- `Check_weight`, `Dragging_info::drop_on_gump`, `put_back`: `/mnt/frankendom-donors/exult-exult/drag.cc` 517-540, 571-616, 546-562.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bag capacity = the bag's own volume number; 0 = no limit | Volume is one byte per shape from wgtvol.dat (shapeinf.h 167, `unsigned char`) |
| Volume counted once per stack, whatever the quantity | Stack limit 100 (objs.cc 321) |
| Carry cap = stones per point of strength | 2 per point of strength (actors.cc 3517) |
| Weights in tenths; cap times 10 | 10 tenths per stone (contain.cc 229) |
| Lightweight stacks: floor(quantity times weight / 10), minimum 1 | Divisor 10 (objs.cc 1105-1112) |
| Clamp-and-report: admit what fits, return the rest | Per-unit estimate (contain.cc 235-236) is the flaw; see section 6 |
| Drag weight check | `wt / 10 > cap` in whole stones (drag.cc 534) |

Constructed defect examples (arithmetic inputs, not data read from the game's shapes). The donor values were computed by hand from the formula at contain.cc 235-236; the exact values were run on the VPS with the sketch:
- 7 units, recorded total weight 2 tenths, 1 tenth free: donor admits 5 units (hand), exact fit 3 (run).
- 30 units, recorded total 40 tenths, 13 tenths free: donor admits 10 units (hand), exact fit 9 (run).

## 4. TypeScript sketch

simplified: the sketch keeps the exact weight fit, the volume check, and the lift-then-put-back transaction. It omits the merge into existing stacks, sub-container recursion, the paperdoll spots and their conflicts, the party-only drag check, the usecode and gump hooks, the stack split at 100 and the remove path. It replaces the donor's integer estimate (235-236) with an exact integer fit; the donor's estimate is not reproduced here, and its defect is described in section 6. The file exports these names; the block below is the same code without the export line. Typechecked on the VPS (tsc strict, es2020). The exact-fit values in section 3 were run on the VPS; the donor values were computed by hand from the formula.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MAX_STACK = 100;   // units per stack; a stack is one object

// Carry cap in stones = 2 x strength.
function carryCapStones(strength: number): number {
  return 2 * strength;
}

// Units of a stack that fit by weight, in tenths of a stone.
// Exact integer fit: floor(avail * qty / totalWt). The stack is taken whole when it fits.
function unitsFitByWeight(qty: number, totalWt: number, availTenths: number): number {
  if (totalWt <= 0 || totalWt <= availTenths) return qty;
  if (availTenths <= 0) return 0;
  return Math.min(qty, Math.floor((availTenths * qty) / totalWt));
}

// A bag's capacity is its own volume number; 0 means no limit.
// Volume counts each stack once, whatever its quantity.
interface Bag {
  capVol: number;
  usedVol: number;
}

function fitsInBag(bag: Bag, vol: number): boolean {
  return bag.capVol <= 0 || bag.usedVol + vol <= bag.capVol;
}

// Lift an item out of its source, try to place it, and put it back at the same index on failure.
function transfer<T>(src: T[], index: number, place: (item: T) => boolean): boolean {
  const [item] = src.splice(index, 1);
  if (place(item)) return true;
  src.splice(index, 0, item);
  return false;
}
```

## 5. Lands in

- TARGET `origins/inventory/containers.ts` (proposed path; not checked against the Frankendom repo): the bag and carry ledger, where every cap is checked in the one add. Parity-checklist row 18 (loot roll and XP award), the hint row; the transfer and drop rules belong to the same ledger.
- today: none checked.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (every cap checked in one add, one write); zones as data (volumes and caps as data fields, not constants in the function).

## 6. Gaps and risks

- Weight is not enforced by the single-object add. `Container_game_object::add` (contain.cc 102-175) checks shape and volume only; weight is checked in `add_quantity` (226-242) and in the party drag check (drag.cc 517-540, called at 596). `add_readied` says "No room, or too heavy." (actors.cc 3748) but calls the base add with the volume check skipped (3749), and `fits_in_spot` has no weight check (1597-1676). So a non-stacking item can go past the cap through a path other than the drag. Fix: put the cap in the one ledger add for every item.
- The drag check tolerates up to 0.9 stone over. `wt / 10 > cap` (drag.cc 534) compares whole stones, while the stack clamp compares tenths (contain.cc 229-232). Fix: compare tenths everywhere.
- The integer fit admits extra units. The per-unit weight is truncated (contain.cc 235) and the fit divides by that truncated value (236). The two constructed cases in section 3 show it. Fix: exact integer fit, floor(avail x qty / total), as in the sketch.
- Lightweight rounding. `get_weight` divides by 10 with floor and a minimum of 1 (objs.cc 1105-1112). A small stack's recorded weight is therefore inexact, and the fit inherits the error. Fix: keep ledger weights in finer units (for example hundredths), so small stacks are exact.
- Put-back can exceed capacity. If the source refuses, the second try skips the volume check (drag.cc 552-553). Fix: put the item back into the same ledger slot index, never through a capacity-skipping add.
- Overflow is silent. `Actor::add` with the check skipped adds past capacity (actors.cc 3653-3671) and only prints a console warning (3667-3670), and only when `party_id` is set or `npc_num` is 0. For Frankendom loot: overflow to the ground with a visible message, as the Evennia shop does (`/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py` 310-313), and log it as a ledger event.
- Volume ignores quantity (objs.cc 427, contain.cc 246-247). The donor's own comment doubts it ("I think U7 ignores quantity!"). A 100-stack and a single item take the same volume. Decide for Frankendom explicitly; adapt as a data field per item class, not a constant.
- Presentation: the donor gives each refusal its own cursor shape and sound (drag.cc 534-537, 588-590, 581-584, 612). Phone equivalent: a distinct toast or icon per refusal reason, shown at the drop point. Not checked on a phone.
- Paperdoll readout: weight is shown as tenths divided by ten (Paperdoll_gump.cc 536, 542), so the displayed total can be up to 0.9 stone below the real total, and it is not the same rounding as the drag check. Fix: one rounding rule for the check and the readout.
- Data: the data tables are binary (equip.dat, container.dat, wgtvol.dat, ready.dat, armor.dat, weapons.dat), so they were not decoded, and the volume byte per shape was taken from the header struct (shapeinf.h 167). paperdol_info.txt (sections "characters" and "items") and gump_info.txt (container_area 84/52/22/60/40) were read as text, but the meaning of each field was not decoded. textmsg.txt has 1431 lines in three sections (shapes, msgs, miscnames; counted by section line ranges, entries not decoded).
- Frankendom gap: the donor's caps are client-side and the donor has no server verification. In Frankendom the same caps must run on the server, and the Pit must not own the carried items.
