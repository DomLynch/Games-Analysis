# tmewett-BrogueCE (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Items.c | Licence: GNU AGPL v3 or later (Items.c header: "GNU Affero General Public License as published by the Free Software Foundation, either version 3"; LICENSE.txt is the AGPLv3 text) | C | symbol pickUpItemAt, addItemToPack, numberOfItemsInPack, equipItem, unequipItem

Checked: Items.c read at 800-1045 (pack gate, stacking, letters), 3255-3300 (equip command and swap memory), 6452-6476 (swap back), 7660-7680 (drop one from a stack), 7700-7850 (equipItem, unequipItem); header 1-25; Rogue.h:986 (grep). Callers of pickUpItemAt and addItemToPack were found by grep only (Items.c:4805, 7674, 7686; Movement.c:1203; Monsters.c:3708; RogueMain.c:421-529; Wizard.c:502); I read only the drop-one caller (7665-7676). Not read: the strengthCheck penalty, the STATUS_DONNING countdown decrement, the item generator's quantity rules for food, potions and scrolls, and the category sort beyond line 1012. Confidence high for the pack gate, stacking and equip rules; medium on quantity behaviour, because the generator was not read. Brogue has no bank and no bag: the only storage is the 26-unit pack plus the equip slots. Camera: not a camera cell.

## 1. Mechanism

The pack is one linked list. Its capacity is a unit budget, not a slot count. numberOfItemsInPack adds 1 for each weapon or gem and the full quantity for everything else (Items.c:1020-1027). Gold is not in the pack. The cap is MAX_PACK_ITEMS = 26 (Rogue.h:986).

Pickup (pickUpItemAt, Items.c:836-924), in order:
1. Mark the player as disturbed (842), find the item on the floor (845), identify its kind if it auto-identifies (852-857), and identify a wand whose charge range is already known (859-864).
2. Gate (866): take the item if the pack count is below 26, or the item is gold, or it would stack for free (itemWillStackWithPack, 806-821: only quiver weapons and gems, never potions or scrolls, per the comment at 805).
3. If taken: clear the detected flag and remove the item from the floor chain (867-872). Gold goes straight to rogue.gold and returns (874-882). A second Amulet is refused (884-888). Otherwise addItemToPack (890) places or stacks it, the message "you now have ... (letter)" is shown (892-895), and the floor entry is removed (897). The amulet-warden spawn runs last (899-917, not read further).
4. If refused (918-923): set ITEM_PLAYER_AVOIDS on the floor item (919) so auto-explore does not try again, and show "Your pack is too full to pick up ...". The item stays on the floor.

Stacking (addItemToPack, 971-1018). Food, potions, scrolls and gems stack when category and kind match (976-988). Quiver weapons (WEAPON with quiverNumber > 0) stack when category, kind and quiverNumber match (989-999). A stack adds quantity to the item already in the pack and deletes the incoming item (stackItems, 945-954). Merging keeps the higher enchant and the lower strength requirement (conflateItemCharacteristics, 926-943). Note that stackItems' parameter names are the reverse of the call site: the call is stackItems(tempItem, theItem), so the pack item is the "newItem" parameter. The behaviour is correct; the naming is confusing.

Letters (1002-1008, 1029-1045). Each item keeps its inventory letter if it is free. Otherwise the first free letter from a to z is used. The pack list is kept sorted by category bit value (1010-1015).

Equip (equipItem, 7724-7810; equip command, 3255-3300). Two ring slots (ringLeft, ringRight), one weapon, one armour. Equipping a weapon or armour first unequips the current one (7742). A ring with both slots full returns false unless the command passes which ring to replace (7755-7762; the prompt is at 3262-3263). An armour equip sets a donning counter to armor / 10 (7750), which lowers the armour enchant while it runs (7713). Equipping costs a turn (3297).

Cursed items (unequipItem, 7813-7827): a cursed item cannot be unequipped unless forced, and the refusal names the item.

Swap memory (3283-3295, 6452-6472). When the equip command replaces an item, the replaced item is remembered as swappedOut and the new one as swappedIn. A later swap key re-equips swappedOut with swappedIn as the hint and swaps the two remembered items, so one key toggles back.

Drop one from a stack (7667-7677). Dropping from a stack of more than one non-weapon, non-gem item peels one unit off and drops only that unit.

## 2. Key functions

- pickUpItemAt, Items.c:836-924 (gate, refuse flag, floor removal, message)
- itemWillStackWithPack, Items.c:806-821 (free stack only for quiver weapons and gems)
- addItemToPack, Items.c:971-1018 (stack or append, letter, sorted insert)
- stackItems and conflateItemCharacteristics, Items.c:926-954 (quantity sum, keep best enchant and lowest strength need)
- numberOfItemsInPack, Items.c:1020-1027 (unit count rule)
- equipItem and unequipItem, Items.c:7724-7850 (slot rules, cursed lock, donning)
- equip command and swap memory, Items.c:3255-3300 and 6452-6476

## 3. Numbers vs mechanism

- Pack cap 26 units (Rogue.h:986; the count loop is Items.c:1024). Count rule per item: weapons and gems 1, other items their quantity.
- Letters: 26 (a to z; the letter loop at 1034 and the test at 1039).
- Equip slots: 1 weapon (7746), 1 armour (7752), 2 rings (7755, 3262).
- Donning counter: armor / 10 (7750). It lowers armour enchant by the counter times FP_FACTOR while it runs (7713). Units of the counter are turns in the donor's status system (not verified: the decrement was not read).
- Stacks: no per-stack cap read. Merge keeps max enchant (933-935) and min strength need (936-938).
- Refused pickups: ITEM_PLAYER_AVOIDS set once (919). No retry count.

The numbers are counts (26, 1, 1, 2, 26 letters), one divisor (armour / 10) and one gate comparison. They are not balanced against anything in this file.

## 4. TypeScript sketch

simplified: keeps the donor's order (room check, then stack-or-append, then flag refused floor items), the unit-count capacity, the one-weapon / one-armour / two-ring equip rules, the cursed lock and the swap-back memory. fixes: the donor gate (line 866) checks count < MAX before adding the incoming quantity; this gate checks that the incoming units fit (count + units needed <= MAX), so a stack can never push the pack past 26. Omits: gold (not in pack), inventory letters, the category-sorted order, the armour donning countdown, strength checks, gem origin-depth match, drop-one-from-stack, prompts and messages, and the equip turn cost.

```ts
// simplified: keeps the donor's order (room check, then stack-or-append, then flag refused floor items),
// the unit-count capacity, the one-weapon / one-armour / two-ring equip rules, the cursed lock and the swap-back memory.
// fixes: the donor gate checks count < MAX before adding the incoming quantity (donor line 866); this gate checks
// that the incoming units fit (count + units needed <= MAX), so a stack can never push the pack past 26.
// Omits: gold (not in pack), inventory letters, category-sorted pack order, armour donning countdown, strength checks,
// gem origin-depth match, drop-one-from-stack, prompts and messages, and the equip turn cost.
type Cat = "weapon" | "armor" | "ring" | "potion" | "scroll" | "food" | "gem";
interface It {
  id: number; cat: Cat; kind: number; quantity: number;
  enchant: number; strReq: number; cursed: boolean; quiverNo: number; avoidAuto: boolean;
}
type Slot = "weapon" | "armor" | "ringL" | "ringR";
interface Pack {
  items: It[];
  weapon: It | null; armor: It | null; ringL: It | null; ringR: It | null;
  swappedIn: It | null; swappedOut: It | null;
}
const MAX_PACK_ITEMS = 26;
const STACKS: Cat[] = ["food", "potion", "scroll", "gem"];

// donor: weapons and gems count 1 each; everything else counts by quantity
function countPack(p: Pack): number {
  return p.items.reduce((n, it) => n + (it.cat === "weapon" || it.cat === "gem" ? 1 : it.quantity), 0);
}

// donor: a stack with no extra slot cost (quiver weapon or gem with a sibling); false for potions and scrolls
function willStackWithPack(p: Pack, it: It): boolean {
  if (it.cat === "gem") return p.items.some((o) => o.cat === "gem");
  if (it.cat === "weapon" && it.quiverNo > 0) return p.items.some((o) => o.quiverNo === it.quiverNo);
  return false;
}

type Pickup = "taken" | "stacked" | "refused";
// units the incoming item adds to the pack count (weapons and gems: 1 or 0 if it stacks for free)
function unitsNeeded(p: Pack, it: It): number {
  if (it.cat === "weapon" || it.cat === "gem") return willStackWithPack(p, it) ? 0 : 1;
  return it.quantity;
}

function pickUp(p: Pack, it: It): Pickup {
  if (countPack(p) + unitsNeeded(p, it) <= MAX_PACK_ITEMS) {
    const same = findStack(p, it);
    if (same) {
      same.quantity += it.quantity;
      same.enchant = Math.max(same.enchant, it.enchant); // keep the higher enchant
      same.strReq = Math.min(same.strReq, it.strReq); // keep the lower strength need
      return "stacked";
    }
    p.items.push(it);
    return "taken";
  }
  it.avoidAuto = true; // refused: auto-collect must not retry it
  return "refused";
}

function findStack(p: Pack, it: It): It | undefined {
  const stackable = STACKS.includes(it.cat) || (it.cat === "weapon" && it.quiverNo > 0);
  if (!stackable) return undefined;
  return p.items.find((o) => o.cat === it.cat && o.kind === it.kind &&
    (it.cat !== "weapon" || o.quiverNo === it.quiverNo));
}

function unequip(p: Pack, slot: Slot, force: boolean): boolean {
  const cur = p[slot];
  if (cur === null) return true;
  if (cur.cursed && !force) return false; // cursed: refused, nothing changes
  p[slot] = null;
  return true;
}

// hint names the ring to replace when both ring slots are full
function equip(p: Pack, it: It, hint: It | null): boolean {
  if (it.cat === "weapon") {
    if (!unequip(p, "weapon", false)) return false;
    p.weapon = it;
  } else if (it.cat === "armor") {
    if (!unequip(p, "armor", false)) return false;
    p.armor = it;
  } else if (it.cat === "ring") {
    if (p.ringL && p.ringR) {
      const slot: Slot | null = hint === p.ringL ? "ringL" : hint === p.ringR ? "ringR" : null;
      if (slot === null || !unequip(p, slot, false)) return false;
    }
    if (p.ringL === null) p.ringL = it; else p.ringR = it;
  } else {
    return false;
  }
  return true;
}

// remembers what was replaced so one key can swap back (donor: swappedIn / swappedOut)
function equipAndRemember(p: Pack, it: It, replaced: It | null): boolean {
  if (!equip(p, it, replaced)) return false;
  p.swappedOut = replaced;
  p.swappedIn = replaced ? it : null;
  return true;
}

function swapBack(p: Pack): boolean {
  if (p.swappedIn === null || p.swappedOut === null) return false;
  if (!equip(p, p.swappedOut, p.swappedIn)) return false;
  const t = p.swappedIn;
  p.swappedIn = p.swappedOut;
  p.swappedOut = t;
  return true;
}

export {};
```

## 5. Lands in

Target: origins/server/inventory-ledger.ts (proposed new file; not in src/fight). Parity row 18 (loot roll and XP award): the pickup gate and the refused-drop flag are the ownership step for a rolled drop, and the equip slots are the character's ledger of worn gear.

## 6. Gaps and risks

Defects in the donor (idea kept, each fixed in the sketch or noted):
1. Gate ignores the incoming quantity. The check at line 866 compares the count with 26 before the item is added; a non-weapon, non-gem item with quantity above 1 can push the pack over 26. The generator's quantity rules were not read, so this is only reachable if such items exist. fix: require count + units needed <= 26 (sketch pickUp).
2. Refused pickups have no memory beyond one flag on the floor item (919). Nothing stops the same item being offered again after the pack changes. fix: the Frankendom server records "refused for character X at slot Y" and offers it again only after a slot frees.
3. Parameter names in stackItems are the reverse of the call site (947-954 vs 983 and 994). Behaviour is correct. fix: rename in any port, so the pack item is always the one kept.

Gaps against Frankendom's rulings:
- Unit budget vs slot budget: Brogue charges one unit per potion or scroll, which is a roguelike scarcity rule. Frankendom's bag is a slot grid (see the inventory-bank-equipment note on the other donor). Adopt the refusal and flag behaviour, not the per-unit count, unless Lead wants scarcity.
- One ledger, server-verified: the pickup gate, the stack, the equip and the swap-back all run in the client. Frankendom: each move is an intent {itemId, from, to} and the server commits or refuses. The swap memory lives on the server with the character, so a reconnect keeps the undo.
- Cursed items: a forced unequip and a locked slot. Frankendom has no curse ruling. Reject unless Lead adds one.
- Donning delay: swapping armour starts a countdown that lowers armour. In a fight this is a real choice. Frankendom: if adopted, it must be server-timed and must not conflict with MAX_ATTACKERS = 3 or the hit rules.
- Phone: the pack is a list (letters), not a grid. A 26-unit list is readable at 375 px as rows with a name, a count and a letter. The swap undo key needs a visible Undo for a few seconds, not a hidden key.

Best transferable idea: a pickup or equip that does not fit is refused as a whole and marked once, and the last equip can be undone with one key, so a phone player never loses or duplicates gear.
Decision (proposed): adapt — the refuse-and-flag rule, the stack-keeps-best rule and the one-key swap undo fit server-verified loot and phone play; the per-unit capacity and curses do not match Frankendom's rulings, so they are not taken. The gate defect (1) is fixed in the sketch, and the refused-pickup memory is moved to the server (defect 2).
Acceptance: on a 375-wide phone with a full 26-unit bag, a potion pickup is refused, the potion stays on the floor, a "pack full" line shows once, and a server test asserts the pile is not offered again until a unit frees; after equipping a new helm, Undo puts the old helm back and a server test asserts each item has one owner before and after.

Reuse tag: adapt (shape only; AGPL v3, clean-room, no line-by-line translation).
Brief rule served: addendum rule 2 (judge the mechanism, not the genre) and the 2026-10-10 rule (keep the idea, fix the defect).
