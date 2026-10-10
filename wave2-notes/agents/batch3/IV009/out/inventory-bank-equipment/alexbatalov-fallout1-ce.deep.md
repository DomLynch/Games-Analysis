# alexbatalov-fallout1-ce (inventory-bank-equipment, cell 1)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` (with `inventry.cc`, `actions.cc`, `scripts.cc`, `protinst.cc`) | Licence: Sustainable Use License 1.0 (`LICENSE.md` line 1; internal-business and non-commercial use only; restricted, clean-room shape only) | C++ | symbols `item_add_mult`, `item_move_func`, `item_identical`, `loot_container`, `move_inventory`, `adjust_ac`

Checked: Symbol `item_add_mult` is at item.cc 171 and the add/remove/move/identity block runs 171-558 (read in full). `loot_container` is at inventry.cc 3607 and was read in full, 3607-4084. `move_inventory` (4085-4235), `do_move_timer` (5108-5212), `drop_into_container` (4956-4992), `inven_wield` (2815-2933), `adjust_ac` (2193-2230) and `switch_hand` (2139-2191) were read in full. The hint file `int/support/intextra.cc` is the script-opcode file (`op_pickup_obj`, `op_wield_obj_critter`, etc.), so it is the wrong file; I grepped it only. Barter: `barter_compute_value` (inventry.cc 4236-4257) and `barter_attempt_transaction` (4260-4277) were read in full. Not read: `skill_check_stealing` (skill.cc, the steal chance), `item_weight` (item.cc 608), `setup_inventory` and the `display_*` layout code, `inven_pickup` (inventry.cc 1946), `barter_move_inventory` (4280-4366, the per-item barter drag), the set-timer window layout, and the stat value of STAT_CARRY_WEIGHT. Confidence: high on stacking, checked moves, take-all, the picker and steal XP; medium on the full loot-screen control flow, where I read every key branch but not the pixel layout.

Best transferable idea: a loot or trade transfer should be a checked move: validate both sides first, then apply, and gate a "take all" as one all-or-nothing weight check that refuses with a reason instead of moving items one by one.
Decision (proposed): adapt - keep the checked move and the all-or-nothing take-all gate, but commit each move as one validate-then-apply step in the engine ledger rather than the donor's remove-then-compensate, because the donor's compensation path can lose an item (`drop_into_container`) or spin forever (`item_move_all`).
Acceptance: On a phone, Take All on a corpse heavier than the free carry shows "cannot carry that much" and moves nothing; a server test asserts that a refused move leaves both inventories and the total carried weight unchanged.

## 1. Mechanism

- **Storage.** An owner holds a flat list of `(item, quantity)` entries. A stack is one entry. The object stored in that entry is the representative and carries per-object state such as ammo rounds.
- **Stacking identity** (`item_identical`, item.cc 507-558). Two items stack only if they have the same pid and sid, neither is equipped or in use, neither is a container, both are empty, and 32 bytes of object data match. For ammo and money the quantity field is set equal before the byte compare, so different counts still merge.
- **Add** (`item_add_force`, item.cc 232-307). If an identical entry exists, the quantity is added to it and the incoming object becomes the representative (the old one is erased). If none exists, a new entry is appended.
- **Ammo pooling** (item.cc 280-296). Rounds on the representative and the incoming object are summed. If the total passes the magazine size, one full magazine is counted as one stack unit and the remainder stays on the incoming object (line 290). Otherwise the total stays on the incoming object.
- **Checked add** (`item_add_mult`, item.cc 171-230; the donor's container-held weight check is at 198-199). Before the force add it runs three checks. (a) A container refuses when used size plus incoming size reaches its max (`>=`, line 187). (b) A container held by a creature is weighed against that creature's carry cap (`STAT_CARRY_WEIGHT`, cap read at line 198, check at 199). (c) A creature only accepts items if its body type is biped (line 214). For a creature, the weight check is strict: total plus incoming above the cap is refused (line 223).
- **Remove** (`item_remove_mult`, item.cc 309-372). The search goes through the list and recurses into nested containers. A whole-stack removal compacts the list entry away (lines 338-340). A partial removal copies the object into the entry (line 343, with the donor's own `TODO: Not sure about this line.` at 342) and subtracts the quantity. For ammo the remaining representative is reset to a full magazine (line 353). The removed object's owner is cleared and its equipped flag is dropped.
- **Move** (`item_move_func`, item.cc 384-418). Step 1: remove from the source and abort on failure (386). Step 2: add to the target, with the checked `item_add_mult` for `item_move`, or the force add for `item_move_force` and `item_move_all` (the bool at 384). Step 3, on failure: force-add back to the source (398). If that also fails, the item is connected to the owner's map tile (406). The whole move returns -1 on failure.
- **Take-all** (inventry.cc 3817-3830). Not available while stealing (3818). The whole container's weight is compared with the carrier's free carry (`maxCarryWeight - currentWeight`, 3819-3822). If it fits, `item_move_all` moves every entry, unchecked. If not, message 31 ("Sorry, you cannot carry that much.", 3827) is shown and nothing moves.
- **Barter commit** (`barter_attempt_transaction`, inventry.cc 4260-4277). This is already a two-sided transaction: refuse if the offer is empty (4262-4264) or queued (4266), or if the buyer's value (`barter_compute_value`, 4236-4257: the item part is divided by a skill-based modifier clamped to 10..300 percent, with caps added back unscaled) is above the offer's total cost (4270). Only then does it move both sides, `item_move_all(a4, a1)` then `item_move_all(a2, a3)` (4274-4275). Both moves are unchecked. There is no carry-weight check in this function (the buyer's carry cap is not tested here; the per-item barter drag, which was not read, may test it). Fallout 2 CE adds a weight check to the same step (see that cell).
- **Drag transfer** (`move_inventory`, inventry.cc 4085-4235). The item follows the mouse while the left button is held. On release over the other pane, a quantity picker runs if the stack is larger than 1. While stealing, the skill check runs first: a failed check returns 1, which ends the session and moves nothing. Otherwise `item_move` runs and a successful move returns 2. Failures show message 26 for a full container on drop-in (4184), or message 25 for the carry cap on take (4220).
- **Quantity picker** (`do_move_timer`, inventry.cc 5108-5212). For item moves: minimum 1, maximum `min(max, 999)` (5116), plus or minus 1 with the arrow codes, a code that sets the value to the maximum, and typed digits (value = `(10 * value) % 1000 + digit`, line 5183, the first digit replacing the old value). Backspace divides by 10. Enter is accepted only inside min..max (5138). Escape returns -1 (cancel). The same function also serves the timer setter (min 10, step 10, Enter only on multiples of 10). That is not sketched.
- **Equipment slots** (inventry.cc 2402-2466, 2815-2933). A slot is a flag on the item, not a separate table: `OBJECT_IN_RIGHT_HAND`, `OBJECT_IN_LEFT_HAND`, `OBJECT_WORN`. A lookup scans the owner's list for the flag. For the player, cached pointers (`i_rhand`, `i_lhand`, `i_worn`) short-circuit the scan. Wielding armour clears the old worn flag (2823) and sets the new one (2826). The AC swap is `adjust_ac` (2193-2230): it subtracts the old armour's AC, DR and DT bonuses and adds the new ones (2199 and the loops below it), then removes and adds the perk. Inside `adjust_ac` the whole body runs only `if (critter == obj_dude)` (2195). So for a non-player critter it does nothing. For the player the swap happens from the inventory UI through `switch_hand` (2148).
- **Loot screen** (`loot_container`, inventry.cc 3607-4084). The looter must be the player. The player's pane is on the left and the target's pane is on the right. When not stealing (3695), a corpse target gathers every critter on the same tile (3697). Only dead or knocked-out critters stay in the list (3701). If there is more than one, page up and page down move between corpses with wrap-around. Rows scroll with the arrow keys or the mouse wheel. With the hand cursor, pressing on a row picks the item up through `move_inventory` and releasing it over the other pane's scroller moves it. The right button toggles between hand and arrow cursor, and arrow mode opens the row's action (`inven_action_cursor`) instead. Escape exits.
- **Stealing mode.** `gIsSteal` is set only when the looter is a critter and the target is active (4071). While stealing, the target's equipped hand and armour items are removed from its list for the session (3674-3686) and put back at exit. A placeholder object `a1a` is created at 3665, and at exit `item_move_all(a1a, a2)` runs (4017). I saw no code that adds items to `a1a`, and I did not trace why it exists.
- **Steal XP.** Each successful move adds the current bonus (`stealingXp += stealingXpBonus`, 3914 and 3938). The bonus starts at 10 (3795) and rises by 10 after each success (3915). At exit, if the thief was not caught and the target is not a party member, the XP is capped at `300 - skill_level(SKILL_STEAL)` (4024) and paid. A caught thief gets nothing.
- **Loot entry** (`action_loot_container`, actions.cc 1190-1220). The critter walks to the container if it is within 5 (1209), otherwise it runs. The loot itself is a callback that sets a request flag (scripts.cc 1044). The main loop later runs `loot_container` (scripts.cc 895).
- **Ground pickup** (protinst.cc 502). Each ground item is added with `item_add_mult(critter, item, 1)`, one unit at a time, so it goes through the same checks. Money (caps) is special-cased.

## 2. Key functions

- `item_add_mult`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 171-230 (checked add: container size, container-held weight, body type, then force add).
- `item_add_force`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 232-307 (identity merge; ammo pooling at 280-296; non-ammo merge at 298).
- `item_remove_mult`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 309-372 (search with nested recursion; whole-stack compact at 338-340; partial copy at 343; ammo reset at 353).
- `item_move_func` (with `item_move`, `item_move_force`, `item_move_all`): `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 384-441 (remove, add, rollback at 398 and 406; the loop in `item_move_all` is at 434).
- `item_identical`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 507-558.
- Take-all block in `loot_container`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 3817-3830.
- Steal XP: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 3795, 3914-3915, 3938-3939, 4024.
- `move_inventory`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 4085-4235.
- `do_move_timer`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 5108-5212.
- `drop_into_container`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 4956-4992.
- `adjust_ac` and `inven_wield`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 2193-2230 and 2815-2933.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Container refuses when used + incoming reaches max (strict `>=`) | Max size per container proto (item.cc 2082); size per unit per proto (item.cc 604). Values not read. |
| Carrier refuses when total + incoming is above the carry cap (strict `>`) | `STAT_CARRY_WEIGHT` (item.cc 223; the stat value is (not read)) |
| Ammo pooling: overflow counts one magazine as one stack unit | Magazine size from `item_w_max_ammo` (item.cc 286; value not read) |
| Take-all: all-or-nothing against free carry | None (inventry.cc 3822) |
| Quantity picker range 1..min(max, 999) | 999 (inventry.cc 5116); min 1 |
| Timer setter (set-timer variant) | min 10, step 10, multiples of 10 (5108-5212; not sketched) |
| Steal XP: 10, then +10 per success, cap 300 minus Steal | 10 (inventry.cc 3795), +10 (3915), 300 (4024) |
| Loot reach: walk if distance < 5, else run | 5 (actions.cc 1209; the unit is the engine's `obj_dist` (not read)) |
| Equipment swap: remove old bonuses, add new ones (AC, DR per type, DT per type) | Per-item values (not read) |
| Death/knocked-out gate on the loot list | `DAM_DEAD` and `DAM_KNOCKED_OUT` flags (inventry.cc 3701) |

## 4. TypeScript sketch

simplified: the sketch models one holder shape for containers and carriers and keeps only the pid, size, weight, container, ammo and equipped fields (the donor also compares sid, the "in use" flag, empty contents and 32 bytes of object data). It follows the donor's ammo pooling and partial-remove representative rules. It differs from the donor in three places: a failed take-all returns instead of looping (the donor's `item_move_all` loop has no exit), the rollback on a failed add is a plain force add (the donor's tile-drop fallback is omitted), and the weight check for a container-held item is done on the carrier as the donor does. It omits the misc-cell rule, the biped check, the armour perk and stat effects, the drag and paging UI, the steal skill check and its XP cap timing, the timer setter and money-as-charges. The code block is the file that was typechecked with `tsc --strict --target es2020`, with `export {}` at the end.

```ts
// clean-room sketch of the donor's stack / checked-move / equip / loot rules. Written from the described mechanism, not a translation.
type Item = {
  kind: number;          // proto id
  size: number;          // container units per unit
  weight: number;        // weight per unit
  isContainer: boolean;
  isAmmo: boolean;
  rounds: number;        // ammo only: rounds on this object (partial magazine)
  magazine: number;      // ammo only: full magazine size
  equipped: boolean;
};

type Entry = { item: Item; qty: number };

type Holder = {
  entries: Entry[];
  maxWeight: number;     // carry cap; Infinity when the holder is not weighed
  maxSize: number;       // container cap; Infinity for a carrier
};

const OK = 0;
const ERR_BAD = -1;
const ERR_FULL = -6;

function totalWeight(h: Holder): number {
  let w = 0;
  for (const e of h.entries) w += e.item.weight * e.qty;
  return w;
}

function usedSize(h: Holder): number {
  let s = 0;
  for (const e of h.entries) s += e.item.size * e.qty;
  return s;
}

// Equipped, container and non-empty items never stack.
function sameStack(a: Item, b: Item): boolean {
  return a.kind === b.kind && !a.equipped && !b.equipped && !a.isContainer && !b.isContainer;
}

// Force add: merge into an identical stack, else append. No limit checks.
function addForce(h: Holder, item: Item, qty: number): number {
  if (qty < 1) return ERR_BAD;
  const idx = h.entries.findIndex((e) => sameStack(e.item, item));
  if (idx < 0) {
    h.entries.push({ item, qty });
    return OK;
  }
  const e = h.entries[idx];
  if (item.isAmmo) {
    // Pool rounds. An overflowing magazine counts as one stack unit; the remainder stays on the incoming object.
    const pooled = e.item.rounds + item.rounds;
    if (pooled > item.magazine) {
      item.rounds = pooled - item.magazine;
      e.qty += 1;
    } else {
      item.rounds = pooled;
    }
    e.qty += qty - 1;
  } else {
    e.qty += qty;
  }
  e.item = item; // the incoming object becomes the stack representative
  return OK;
}

// Checked add: container refuses at size >= max; the weighed holder (the carrier, or the container itself) refuses above its cap.
function add(h: Holder, item: Item, qty: number, carrier?: Holder): number {
  if (qty < 1) return ERR_BAD;
  if (usedSize(h) + item.size * qty >= h.maxSize) return ERR_FULL;
  const weighed = carrier ?? h;
  if (totalWeight(weighed) + item.weight * qty > weighed.maxWeight) return ERR_FULL;
  return addForce(h, item, qty);
}

// Remove: whole-stack removal drops the entry; partial removal leaves a copy as the representative, with ammo reset to a full magazine.
function remove(h: Holder, item: Item, qty: number): number {
  const idx = h.entries.findIndex((e) => e.item === item);
  if (idx < 0) return ERR_BAD;
  const e = h.entries[idx];
  if (e.qty < qty) return ERR_BAD;
  if (e.qty === qty) {
    h.entries.splice(idx, 1);
  } else {
    e.qty -= qty;
    e.item = { ...item, rounds: item.isAmmo ? item.magazine : item.rounds };
  }
  item.equipped = false;
  return OK;
}

// Move = remove from source, add to target; if the add is refused, put the item back on the source (compensation).
function move(from: Holder, to: Holder, item: Item, qty: number, force: boolean, carrier?: Holder): number {
  if (remove(from, item, qty) !== OK) return ERR_BAD;
  const rc = force ? addForce(to, item, qty) : add(to, item, qty, carrier);
  if (rc !== OK) {
    addForce(from, item, qty);
    return rc;
  }
  return OK;
}

// Take-all: one weight gate for the whole container, then every entry moves unchecked.
function takeAll(from: Holder, to: Holder, carrierMaxWeight: number): number {
  if (totalWeight(from) > carrierMaxWeight - totalWeight(to)) return ERR_FULL;
  while (from.entries.length > 0) {
    const e = from.entries[0];
    // The donor loops here with no exit; the sketch returns instead.
    if (move(from, to, e.item, e.qty, true) !== OK) return ERR_BAD;
  }
  return OK;
}

// Quantity picker: range 1..min(max, 999). Typed digits shift in as (10 * value) mod 1000 + digit.
function pickerMax(max: number): number {
  return Math.min(max, 999);
}

function typeDigit(value: number, digit: number, fresh: boolean): number {
  const base = fresh ? 0 : value;
  return ((10 * base) % 1000) + digit;
}

function pickerConfirm(value: number, max: number): boolean {
  return value >= 1 && value <= max;
}

// Armour swap: take the old bonuses off, put the new ones on (either side may be null).
type Armour = { ac: number; dr: number[]; dt: number[] };
type Bonus = { ac: number; dr: number[]; dt: number[] };

function swapArmour(b: Bonus, oldA: Armour | null, newA: Armour | null): Bonus {
  return {
    ac: b.ac - (oldA?.ac ?? 0) + (newA?.ac ?? 0),
    dr: b.dr.map((v, i) => v - (oldA?.dr[i] ?? 0) + (newA?.dr[i] ?? 0)),
    dt: b.dt.map((v, i) => v - (oldA?.dt[i] ?? 0) + (newA?.dt[i] ?? 0)),
  };
}

// Steal XP: each successful move pays 10, then 20, 30 ...; paid only if the thief was not caught, capped at 300 minus Steal.
function stealXp(successes: number, stealSkill: number, caught: boolean): number {
  if (caught) return 0;
  let xp = 0;
  let bonus = 10;
  for (let i = 0; i < successes; i++) {
    xp += bonus;
    bonus += 10;
  }
  return Math.min(xp, 300 - stealSkill);
}

// Loot list: only dead or knocked-out bodies are lootable.
type Body = { dead: boolean; knockedOut: boolean };
function lootable(b: Body): boolean {
  return b.dead || b.knockedOut;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed new module, not checked against the Frankendom repo): the checked move (one validate-then-apply transaction per move), the take-all weight gate, and the lootable filter for corpses. Parity-checklist row 18 (loot roll and XP award).
- Equipment slots and the armour bonus swap are row 15 (gear dressing) and would sit with the gear module, not in this note's target.
- today: none located (not checked).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room shape only, no copied text or code)
- Brief rule served: one ledger (each move is one engine transaction); the numbered rule for this in my copy of the brief is not confirmed.

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 allows internal-business and non-commercial use only and forbids altering or removing notices. Do not copy code or text. The sketch is written from the mechanism.
- One ledger: the donor's move is remove, then add, then compensate. That is not one ledger transaction. Two donor paths show the risk. `drop_into_container` ignores the result of its rollback (inventry.cc 4978), so an item can be lost if the rollback add is refused. `item_move_all` has no exit when a move fails: the failed item is re-appended to the source list and the loop takes index 0 again (item.cc 434). In practice the force add only fails on an allocation failure (`item_add_force`, item.cc 232-307), so this is a rare path, but it never ends. Fix: validate both sides first, then apply in one step, returning an error with no change. The loss is real: the Fallout 2 CE donor carries its own comment on the same function (`inventory.cc` 5451, "SFALL: Fix for items disappearing from inventory when you try to drag them to bag/backpack in the inventory list and are overloaded") and changes the rollback to a force add (5454). That is evidence from the donor's own history, not something I ran.
- Donor defect: `item_drop_all` returns -1 on its success path (item.cc 503). Fix: return 0 on success. Callers were not read.
- Donor defect: a partial remove copies the object into the list (item.cc 343) and the donor marks that line `TODO: Not sure about this line.` (342). Fix: an explicit split that creates the remainder as a new object, with the ammo rule written out.
- Quirk to decide, not copy: in stealing mode a drop-in also counts toward steal XP (inventry.cc 3914, via `move_inventory` returning 2). Frankendom has no steal, so this is noted only.
- Server-verified: the donor loot screen is local. Frankendom must check on the server that the corpse is dead or knocked out (row 17 death/respawn and row 18), that the taker is in reach, and that the carry cap holds before any move. A client cannot be trusted with the take-all gate.
- Zones as data: container size, carry cap, and the picker maximum are data fields. The donor's 999 picker cap is an engine rule here. The Fallout 2 CE donor (`src/inventory.cc` line 5594, read in the Fallout 2 cell) raises the same cap to 99999, so the number is a build choice rather than a fixed rule.
- Phone: the donor's drag-hold and mouse-wheel scrolling do not transfer. A tap to select, then a quantity sheet with +/-, digits and Enter, is the phone shape (my suggestion, not in the donor).
- The rule "container refuses at exactly max" (strict `>=`) means a container can never be filled to its cap. Decide whether that is wanted in Frankendom before copying it.
- Steal branch (skill check before move, escalating XP): no Frankendom ruling covers stealing. Not adopted for now.
- Client-only: the loot panel, picker and drag are client UI. The Pit has no loot screen (row 22).
